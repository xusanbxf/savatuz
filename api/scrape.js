// Scrapes a Taobao / Tmall / Pinduoduo / 1688 product page via ScraperAPI and
// extracts name, price and images for the admin "Import qilish" feature.
//
// Restored after the Vite-migration revert accidentally dropped this file
// (see admin.html's doImport(), which calls GET /api/scrape?url=...).

const SCRAPER_KEY = "49ca405dd29931f0e1faa9763c90363b";

async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { url } = req.query;
  if (!url) { res.status(400).json({ error: "url kerak" }); return; }

  // Plain fetch first (fast); if name or images are still missing, also try
  // the JS-rendered fetch (slower) and fill in whatever the first pass
  // missed — some sites (e.g. 1688.com) only populate their image gallery
  // JSON after client-side rendering, even though the name/title is already
  // present in the raw HTML.
  const attempts = [
    `https://api.scraperapi.com/?api_key=${SCRAPER_KEY}&url=${encodeURIComponent(url)}&country_code=cn`,
    `https://api.scraperapi.com/?api_key=${SCRAPER_KEY}&url=${encodeURIComponent(url)}&render=true&country_code=cn`,
  ];

  let lastError = "";
  let best = { name: "", price: "", images: [] };

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

      if (!best.name && info.name) best.name = info.name;
      if (!best.price && info.price) best.price = info.price;
      if (best.images.length === 0 && info.images.length > 0) best.images = info.images;

      // Good enough already — no need to pay for the render=true attempt.
      if (best.name && best.images.length > 0) break;
    } catch (e) {
      lastError = e.message;
    }
  }

  if (!best.name && best.images.length === 0) {
    res.status(500).json({ error: lastError || "Ishlamadi" });
    return;
  }

  // Translate name via Google Translate (free endpoint)
  if (best.name) {
    try {
      const [uz, ru] = await Promise.all([
        translate(best.name, "uz"),
        translate(best.name, "ru"),
      ]);
      best.name_uz = uz || best.name;
      best.name_ru = ru || best.name;
    } catch (e) {
      best.name_uz = best.name;
      best.name_ru = best.name;
    }
  }

  res.status(200).json(best);
}

async function translate(text, to) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  const r = await fetch(url);
  const d = await r.json();
  return d?.[0]?.map((x) => x?.[0]).filter(Boolean).join("") || "";
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
        info.name = t;
        break;
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
      info.price = m[1];
      break;
    }
  }

  // Images - strict filtering
  const seen = new Set();

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
          seen.add(u);
          info.images.push(u);
          if (info.images.length >= 8) break;
        }
      }
      if (info.images.length > 0) break;
    }
  }

  if (info.images.length === 0) {
    const imgPatterns = [
      /https?:\/\/img\.kwcdn\.com\/product\/[^"'\s,}{>\]\\]{10,}/g,
      /https?:\/\/img\.pddpic\.com\/[^"'\s,}{>\]\\]{20,}/g,
      /https?:\/\/img\.alicdn\.com\/imgextra\/[^"'\s,}{>\]\\]{20,}/g,
      /https?:\/\/gw\.alicdn\.com\/bao\/[^"'\s,}{>\]\\]{20,}/g,
      /https?:\/\/cbu01\.alicdn\.com\/img\/ibank\/[^"'\s,}{>\]\\]{10,}/g,
    ];
    for (const pat of imgPatterns) {
      for (let u of (html.match(pat) || [])) {
        u = u.replace(/\\/g, "").replace(/['">\s\]]+.*$/, "");
        if (isProductImage(u) && !seen.has(u)) {
          seen.add(u);
          info.images.push(u);
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
  if (url.match(/icon|logo|avatar|badge|star|rating|favicon|app_|banner_ad|category|tab_|nav_|btn_|arrow|loading|placeholder|splash|launch|default|empty|noimg|watermark/i)) return false;
  if (url.match(/(\.|\/)(16|24|32|48|64|96)x\1/)) return false;
  if (url.includes("img.kwcdn.com")) {
    return url.includes("/product/") || url.includes("/goods/") || url.includes("/creative/");
  }
  if (url.includes("img.pddpic.com")) {
    return !url.match(/\/icon\/|\/logo\/|\/app\/|\/ui\//i);
  }
  if (url.includes("img.alicdn.com/imgextra/")) return true;
  if (url.includes("gw.alicdn.com/bao/")) return true;
  if (!url.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)) return false;
  return true;
}

module.exports = handler;
