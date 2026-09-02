// Pings Supabase once so the project registers API activity and its
// free-tier auto-pause timer (paused after ~7 days of inactivity) resets.
// Call this endpoint periodically (e.g. once a day) via an external
// scheduler — GET https://savatmarket.uz/api/keepalive

const SUPABASE_URL = "https://gjsaelqqubmlwnmfyuso.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ckKVB9tWH-dXgHh_dtgapQ_Htl3IACg";

async function handler(req, res) {
  try {
    const r = await fetch(SUPABASE_URL + "/rest/v1/products?select=id&limit=1", {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
      },
    });
    res.status(200).json({ ok: true, supabaseStatus: r.status, checkedAt: new Date().toISOString() });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e), checkedAt: new Date().toISOString() });
  }
}

module.exports = handler;
