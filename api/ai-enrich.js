// AI agent step for the admin "Import qilish" flow.
// Input  (POST JSON): { name: "<Chinese title>", price: "<yuan>", cat_hint?: "tech|shoes|fashion|home" }
// Output (JSON): { name_uz, name_ru, sub_uz, sub_ru, cat, weight, china, market }
//   china  = factory price in som (yuan * CNY_RATE), market = estimated Uzbekistan retail price in som
// The admin reviews every field before pressing "Saqlash" — nothing is saved here.
//
// Vercel env vars needed:
//   ANTHROPIC_API_KEY   (required)
//   ADMIN_EMAILS        (recommended, comma-separated; only these logins may call this)
//   ANTHROPIC_MODEL     (optional, default claude-haiku-5-5)
//   CNY_RATE            (optional, som per yuan, default 1300 — same as admin.html import)

const SUPABASE_URL = "https://gjsaelqqubmlwnmfyuso.supabase.co";
const SB_PUBLISHABLE = "sb_publishable_ckKVB9tWH-dXgHh_dtgapQ_Htl3IACg";
const CATS = ["tech", "shoes", "fashion", "home"];

const SYSTEM = `You prepare product cards for Savat.uz, an online store selling Chinese goods to customers in Uzbekistan.
You get a Chinese product title and the price in yuan. Reply with ONE JSON object and nothing else (no markdown, no backticks):
{
  "name_uz": short natural product name in Uzbek, LATIN script, max 60 chars, no spam keywords,
  "name_ru": short natural product name in Russian, max 60 chars,
  "sub_uz": one line (max 90 chars) in Uzbek Latin: key features,
  "sub_ru": same line in Russian,
  "cat": one of "tech" | "shoes" | "fashion" | "home",
  "weight": realistic shipping weight of ONE unit in kg incl. packaging (number, e.g. 0.45),
  "bulky": true if the item is large, heavy or awkward to ship (furniture, big appliances, mattresses, large boxes, long items, anything over about 2 kg), otherwise false,
  "market_multiplier": number between 2.5 and 8: how many times higher the typical retail price of this kind of item is in Uzbekistan (bazaar / Uzum Market) than the Chinese factory price. No-name cheap items about 3-5, branded items or electronics about 2.5-3.5
}
Rules: never invent specs (battery size, memory, material) that are not in the title. If unsure about weight, give a cautious estimate rounded up.`;

async function isAllowed(req) {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace(/^Bearer\s+/i, "");
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
  const name = String((body && body.name) || "").slice(0, 400).trim();
  const price = String((body && body.price) || "").slice(0, 20);
  if (!name) { res.status(400).json({ error: "name kerak" }); return; }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
        max_tokens: 700,
        system: SYSTEM,
        messages: [{ role: "user", content: "Title: " + name + "\nPrice (yuan): " + (price || "unknown") }],
      }),
    });
    clearTimeout(timer);
    if (!r.ok) { res.status(502).json({ error: "AI xato: " + r.status }); return; }
    const data = await r.json();
    const text = (data.content || []).map((c) => (c.type === "text" ? c.text : "")).join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const j = JSON.parse(clean);

    const w = parseFloat(j.weight);
    const yuan = parseFloat(price);
    const rate = parseFloat(process.env.CNY_RATE) || 1300;
    let china = null, market = null;
    if (yuan > 0) {
      china = Math.round((yuan * rate) / 100) * 100;
      const m = Math.min(8, Math.max(2.5, parseFloat(j.market_multiplier) || 4.5));
      market = Math.round((china * m) / 1000) * 1000;
    }
    res.status(200).json({
      name_uz: String(j.name_uz || "").slice(0, 120),
      name_ru: String(j.name_ru || "").slice(0, 120),
      sub_uz: String(j.sub_uz || "").slice(0, 200),
      sub_ru: String(j.sub_ru || "").slice(0, 200),
      cat: CATS.includes(j.cat) ? j.cat : "home",
      weight: w > 0 && w < 100 ? w : null,
      china,
      market,
      bulky: j.bulky === true,
    });
  } catch (e) {
    res.status(500).json({ error: "AI ishlamadi: " + (e.message || "") });
  }
}

module.exports = handler;
