export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { url } = req.query;
  if (!url) { res.status(400).json({ error: "url kerak" }); return; }

  const SCRAPER_KEY = "49ca405dd29931f0e1faa9763c90363b";

  const attempts = [
    `https://api.scraperapi.com/?api_key=${SCRAPER_KEY}&url=${encodeURIComponent(url)}&country_code=cn`,
    `https://api.scraperapi.com/?api_key=${SCRAPER_KEY}&url=${encodeURIComponent(url)}&render=true&country_code=cn`,
  ];

  let lastError = "";
  for (const scraperUrl of attempts) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      const r = await fetch(scraperUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (!r.ok) { lastError = "ScraperAPI: " + r.status; continue; }
      const html = await r.text();
      if (!html || html.length < 200) { lastError = "Bosh sahifa"; continue; }
      const info = parseProduct(html, url);
      if (!info.name && info.images.length === 0) { lastError = "Malumot topilmadi"; continue; }

      // Translate name via Google Translate (free endpoint)
      if (info.name) {
        try {
          const [uz, ru] = await Promise.all([
            translate(info.name, "uz"),
            translate(info.name, "ru"),
          ]);
          info.name_uz = uz || info.name;
          info.name_ru = ru || info.name;
        } catch(e) {
          info.name_uz = info.name;
          info.name_ru = info.name;
        }
      }

      return res.status(200).json(info);
    } catch (e) {
      lastError = e.message;
    }
  }

  res.status(500).json({ error: lastError || "Ishlamadi" });
}

async function translate(text, to) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  const r = await fetch(url);
  const d = await r.json();
  return d?.[0]?.map(x => x?.[0]).filter(Boolean).join("") || "";
}

function parseProduct(html, sourceUrl) {
  const info = { name: "", price: "", images: [] };

  const decode = (s) => s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();

  // Name
  const namePatterns = [
    /"goodsName"\s*:\s*"([^"]{5,}?)"/,
    /"goods_name"\s*:\s*"([^"]{5,}?)"/,
    /"title"\s*:\s*"([^"]{5,200}?)"/,
    /"subject"\s*:\s*"([^"]{5,200}?)"/,
    /property="og:title"[^>]*content="([^"]{5,}?)"/i,
    /<title[^>]*>([^<]{5,}?)<\/title>/i,
  ];
  for (const pat of namePatterns) {
    const m = html.match(pat);
    if (m?.[1]) {
      const t = decode(m[1]).replace(/[-–|]\s*(淘宝|天猫|拼多多|Taobao|Tmall|1688).*/i, "").trim();
      if (t.length > 4 && !t.includes("404") && !t.match(/^[\s\d]+$/)) {
        info.name = t; break;
      }
    }
  }

  // Price
  const pricePatterns = [
    /"minGroupPrice"\s*:\s*"?([\d.]+)"?/,
    /"minNormalPrice"\s*:\s*"?([\d.]+)"?/,
    /"defaultPrice"\s*:\s*"?([\d.]+)"?/,
    /"price"\s*:\s*"([\d.]+)"/,
    /"min_price"\s*:\s*"?([\d.]+)"?/,
    /[¥￥]\s*([\d]+(?:\.[\d]{1,2})?)/,
  ];
  for (const pat of pricePatterns) {
    const m = html.match(pat);
    if (m?.[1] && parseFloat(m[1]) > 0.1 && parseFloat(m[1]) < 999999) {
      info.price = m[1]; break;
    }
  }

  // Images - strict filtering
  const seen = new Set();

  // First try to find product image arrays in JSON
  const jsonImgPatterns = [
    /"image_list"\s*:\s*\[([^\]]+)\]/,
    /"imageList"\s*:\s*\[([^\]]+)\]/,
    /"imgs"\s*:\s*\[([^\]]+)\]/,
    /"slideImages"\s*:\s*\[([^\]]+)\]/,
    /"topGallery"\s*:\s*\[([^\]]+)\]/,
    /"item_imgs"\s*:\s*\[([^\]]+)\]/,
  ];

  for (const pat of jsonImgPatterns) {
    const m = html.match(pat);
    if (m?.[1]) {
      const urls = m[1].match(/https?:\/\/[^"'\s,}{>\]\\]{20,}/g) || [];
      for (let u of urls) {
        u = u.replace(/\\/g, "").replace(/['">\s\]]+.*$/, "");
        if (isProductImage(u) && !seen.has(u)) {
          seen.add(u); info.images.push(u);
          if (info.images.length >= 8) break;
        }
      }
      if (info.images.length > 0) break;
    }
  }

  // Fallback: scan all image URLs
  if (info.images.length === 0) {
    const imgPatterns = [
      /https?:\/\/img\.kwcdn\.com\/product\/[^"'\s,}{>\]\\]{10,}/g,
      /https?:\/\/img\.pddpic\.com\/[^"'\s,}{>\]\\]{20,}/g,
      /https?:\/\/img\.alicdn\.com\/imgextra\/[^"'\s,}{>\]\\]{20,}/g,
      /https?:\/\/gw\.alicdn\.com\/bao\/[^"'\s,}{>\]\\]{20,}/g,
    ];
    for (const pat of imgPatterns) {
      for (let u of (html.match(pat) || [])) {
        u = u.replace(/\\/g, "").replace(/['">\s\]]+.*$/, "");
        if (isProductImage(u) && !seen.has(u)) {
          seen.add(u); info.images.push(u);
          if (info.images.length >= 8) break;
        }
      }
      if (info.images.length >= 3) break;
    }
  }

  return info;
}

function isProductImage(url) {
  if (url.length < 40) return false;
  // Block app icons, logos, ui elements
  if (url.match(/icon|logo|avatar|badge|star|rating|favicon|app_|banner_ad|category|tab_|nav_|btn_|arrow|loading|placeholder|splash|launch|default|empty|noimg|watermark/i)) return false;
  // Block tiny images (thumbnail params suggest small size)
  if (url.match(/(\.|\/)(16|24|32|48|64|96)x\1/)) return false;
  // PDD product images - must contain /product/ or /goods/ path
  if (url.includes("img.kwcdn.com")) {
    return url.includes("/product/") || url.includes("/goods/") || url.includes("/creative/");
  }
  if (url.includes("img.pddpic.com")) {
    return !url.match(/\/icon\/|\/logo\/|\/app\/|\/ui\//i);
  }
  // Taobao product images
  if (url.includes("img.alicdn.com/imgextra/")) return true;
  if (url.includes("gw.alicdn.com/bao/")) return true;
  // Must end with image extension
  if (!url.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)) return false;
  return true;
}
