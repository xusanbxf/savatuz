export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { url } = req.query;
  if (!url) { res.status(400).json({ error: "url kerak" }); return; }

  const SCRAPER_KEY = "49ca405dd29931f0e1faa9763c90363b";

  try {
    const scraperUrl = `https://api.scraperapi.com/?api_key=${SCRAPER_KEY}&url=${encodeURIComponent(url)}&render=true&country_code=cn`;
    const r = await fetch(scraperUrl);
    if (!r.ok) throw new Error("ScraperAPI: " + r.status);
    const html = await r.text();
    const info = parseProduct(html, url);
    res.status(200).json(info);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

function parseProduct(html, url) {
  const info = { name: "", price: "", images: [] };
  const namePatterns = [
    /"goodsName"\s*:\s*"([^"]{5,}?)"/,
    /"goods_name"\s*:\s*"([^"]{5,}?)"/,
    /"title"\s*:\s*"([^"]{5,}?)"/,
    /"subject"\s*:\s*"([^"]{5,}?)"/,
    /property="og:title"[^>]*content="([^"]{5,}?)"/i,
    /<title[^>]*>([^<]{5,}?)<\/title>/i,
  ];
  for (const pat of namePatterns) {
    const m = html.match(pat);
    if (m?.[1]) {
      let t = m[1]
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
        .replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">")
        .replace(/[-–|]\s*(淘宝|天猫|拼多多|Taobao|Tmall).*/i, "").trim();
      if (t.length > 4 && !t.includes("404")) { info.name = t; break; }
    }
  }
  const pricePatterns = [
    /"minGroupPrice"\s*:\s*"?([\d.]+)"?/,
    /"minNormalPrice"\s*:\s*"?([\d.]+)"?/,
    /"defaultPrice"\s*:\s*"?([\d.]+)"?/,
    /"price"\s*:\s*"([\d.]+)"/,
    /[¥￥]\s*([\d]+(?:\.[\d]{1,2})?)/,
  ];
  for (const pat of pricePatterns) {
    const m = html.match(pat);
    if (m?.[1] && parseFloat(m[1]) > 0.1 && parseFloat(m[1]) < 99999) {
      info.price = m[1]; break;
    }
  }
  const seen = new Set();
  const imgPatterns = [
    /https?:\/\/img\.kwcdn\.com\/[^"'\s,}{>]{20,}/g,
    /https?:\/\/img\.pddpic\.com\/[^"'\s,}{>]{20,}/g,
    /https?:\/\/img\.alicdn\.com\/[^"'\s,}{>]{20,}/g,
    /https?:\/\/gw\.alicdn\.com\/[^"'\s,}{>]{20,}/g,
  ];
  for (const pat of imgPatterns) {
    for (let u of (html.match(pat) || [])) {
      u = u.replace(/\\/g, "").replace(/['">\s]+.*$/, "");
      if (!seen.has(u) && u.length > 30 && !u.match(/icon|logo|avatar/i)) {
        seen.add(u); info.images.push(u);
        if (info.images.length >= 8) break;
      }
    }
    if (info.images.length >= 8) break;
  }
  return info;
}
