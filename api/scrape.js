export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { url } = req.query;
  if (!url) { res.status(400).json({ error: "url kerak" }); return; }

  const SCRAPER_KEY = "49ca405dd29931f0e1faa9763c90363b";

  // Try without render first (faster), then with render
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
      if (!html || html.length < 200) { lastError = "Bo'sh sahifa"; continue; }
      const info = parseProduct(html);
      if (!info.name && !info.price && info.images.length === 0) {
        lastError = "Ma'lumot topilmadi"; continue;
      }
      return res.status(200).json(info);
    } catch (e) {
      lastError = e.message;
    }
  }

  res.status(500).json({ error: lastError || "Ishlamadi" });
}

function parseProduct(html) {
  const info = { name: "", price: "", images: [] };

  // Decode unicode escapes
  const decode = (s) => s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();

  // Name
  const namePatterns = [
    /"goodsName"\s*:\s*"([^"]{5,}?)"/,
    /"goods_name"\s*:\s*"([^"]{5,}?)"/,
    /"name"\s*:\s*"([^"]{5,200}?)"/,
    /"title"\s*:\s*"([^"]{5,200}?)"/,
    /"subject"\s*:\s*"([^"]{5,200}?)"/,
    /property="og:title"[^>]*content="([^"]{5,}?)"/i,
    /name="og:title"[^>]*content="([^"]{5,}?)"/i,
    /<title[^>]*>([^<]{5,}?)<\/title>/i,
    /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]{5,}?)<\/h1>/i,
  ];
  for (const pat of namePatterns) {
    const m = html.match(pat);
    if (m?.[1]) {
      const t = decode(m[1])
        .replace(/[-–|]\s*(淘宝|天猫|拼多多|Taobao|Tmall|1688).*/i, "").trim();
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
    /"originalPrice"\s*:\s*"?([\d.]+)"?/,
    /[¥￥]\s*([\d]+(?:\.[\d]{1,2})?)/,
  ];
  for (const pat of pricePatterns) {
    const m = html.match(pat);
    if (m?.[1] && parseFloat(m[1]) > 0.1 && parseFloat(m[1]) < 999999) {
      info.price = m[1]; break;
    }
  }

  // Images
  const seen = new Set();
  const imgPatterns = [
    /https?:\/\/img\.kwcdn\.com\/[^"'\s,}{>\]\\]{20,}/g,
    /https?:\/\/img\.pddpic\.com\/[^"'\s,}{>\]\\]{20,}/g,
    /https?:\/\/yangkeduo\.com\/[^"'\s,}{>\]\\]{20,}/g,
    /https?:\/\/img\.alicdn\.com\/[^"'\s,}{>\]\\]{20,}/g,
    /https?:\/\/gw\.alicdn\.com\/[^"'\s,}{>\]\\]{20,}/g,
    /https?:\/\/g\.alicdn\.com\/[^"'\s,}{>\]\\]{20,}/g,
  ];
  for (const pat of imgPatterns) {
    for (let u of (html.match(pat) || [])) {
      u = u.replace(/\\/g, "").replace(/['">\s\]]+.*$/, "");
      if (!seen.has(u) && u.length > 30 && !u.match(/icon|logo|avatar|badge|star|rating/i)) {
        seen.add(u);
        info.images.push(u);
        if (info.images.length >= 8) break;
      }
    }
    if (info.images.length >= 8) break;
  }

  return info;
}
