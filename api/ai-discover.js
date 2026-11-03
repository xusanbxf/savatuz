// AI finds product links by itself (no links from the admin needed).
// Input  (POST JSON): { cat?: "tech|shoes|fashion|home", count?: 1-12, hint?: "free text keywords" }
// Output (JSON): { urls: [ "https://detail.1688.com/...", ... ], note?: string }
// The admin UI then runs each URL through /api/scrape + /api/ai-enrich and shows cards for approval.
//
// Uses Claude's web_search tool. Needs maxDuration 60 in vercel.json (see "functions").
// Env: ANTHROPIC_API_KEY (required), ADMIN_EMAILS (recommended), ANTHROPIC_DISCOVER_MODEL (optional)

const SUPABASE_URL = "https://gjsaelqqubmlwnmfyuso.supabase.co";
const SB_PUBLISHABLE = "sb_publishable_ckKVB9tWH-dXgHh_dtgapQ_Htl3IACg";

const ITEM_URL = /^https?:\/\/(item\.taobao\.com|detail\.tmall\.com|detail\.1688\.com|mobile\.pinduoduo\.com|mobile\.yangkeduo\.com|www\.pinduoduo\.com)\//i;

const CAT_HINT = {
  tech: "small consumer electronics and accessories (earbuds, chargers, cables, phone accessories, LED lights, small gadgets)",
  shoes: "shoes and slippers (compact, lightweight)",
  fashion: "clothing and accessories (t-shirts, socks, caps, bags, jewelry — light and foldable)",
  home: "small home and kitchen items (organizers, kitchen tools, small decor, storage — compact, not furniture)",
};

async function isAllowed(req) {
  const token = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  try {
    const r = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: { apikey: SB_PUBLISHABLE, Authorization: "Bearer " + token },
    });
    if (!r.ok) return false;
    const u = await r.json();
    const allow = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (allow.length === 0) return !!u.id;
    return allow.includes((u.email || "").toLowerCase());
  } catch (e) {
    return false;
  }
}

async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "POST kerak" }); return; }
  if (!process.env.ANTHROPIC_API_KEY) { res.status(500).json({ error: "ANTHROPIC_API_KEY o'rnatilmagan" }); return; }
  if (!(await isAllowed(req))) { res.status(401).json({ error: "Ruxsat yo'q" }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const count = Math.max(1, Math.min(12, parseInt(body.count) || 8));
  const cat = CAT_HINT[body.cat] ? body.cat : null;
  const hint = String(body.hint || "").slice(0, 200);

  const what = cat ? CAT_HINT[cat] : "a mix of small, light, popular consumer items across electronics, clothing, shoes and home";
  const prompt =
    "Find " + count + " real product pages on Chinese marketplaces to import into Savat.uz, an online store selling Chinese goods to customers in Uzbekistan.\n" +
    "Category focus: " + what + (hint ? ". Extra keywords from the owner: " + hint : "") + ".\n" +
    "Selection rules:\n" +
    "- Only SMALL, LIGHT, compact items (ideally under 1 kg, easy to ship by cargo). NO furniture, big appliances, mattresses, bulky or fragile glass items, liquids, batteries-only products, weapons, or items needing special licenses.\n" +
    "- Items that look popular (high sales volume / good reviews), factory price roughly 5-150 yuan.\n" +
    "- Prefer different product types, not near-duplicates.\n" +
    "- URLs must be individual product pages on item.taobao.com, detail.tmall.com, detail.1688.com, mobile.pinduoduo.com or yangkeduo.com that actually appeared in your search results. NEVER invent or guess a URL.\n" +
    'Finish with ONLY a JSON object, no other text: {"urls": ["...", "..."]}';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55000);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_DISCOVER_MODEL || "claude-sonnet-5-5",
        max_tokens: 1500,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }],
        messages: [{ role: "user", content: prompt }],
      }),
    });
    clearTimeout(timer);
    if (!r.ok) { res.status(502).json({ error: "AI xato: " + r.status }); return; }
    const data = await r.json();

    // URLs that really appeared in search results
    const seenInSearch = new Set();
    let text = "";
    for (const block of data.content || []) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const it of block.content) if (it && it.url) seenInSearch.add(it.url);
      }
      if (block.type === "text") text += block.text;
    }

    let urls = [];
    try {
      const m = text.replace(/```json|```/g, "").match(/\{[\s\S]*\}/);
      const j = JSON.parse(m ? m[0] : "{}");
      if (Array.isArray(j.urls)) urls = j.urls.map(String);
    } catch (e) {}

    // keep only real product-page URLs that the search actually returned
    urls = urls.filter((u) => ITEM_URL.test(u) && seenInSearch.has(u));
    if (urls.length === 0) {
      urls = [...seenInSearch].filter((u) => ITEM_URL.test(u));
    }
    urls = [...new Set(urls)].slice(0, count);

    if (urls.length === 0) {
      res.status(200).json({ urls: [], note: "AI mos mahsulot sahifasini topa olmadi. Kalit so'z bering yoki boshqa kategoriyani sinang." });
      return;
    }
    res.status(200).json({ urls });
  } catch (e) {
    res.status(500).json({ error: "AI ishlamadi: " + (e.message || "") });
  }
}

module.exports = handler;
