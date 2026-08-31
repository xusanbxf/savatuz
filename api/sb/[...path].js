// Server-side proxy for Supabase (REST, Storage, Auth).
//
// Why this exists: browsers on some Uzbekistan networks/ISPs cannot reach
// *.supabase.co at all (net::ERR_BLOCKED_BY_CLIENT on every request, even to
// unrelated Supabase projects — a network-level block, not a Supabase or
// CORS problem). Routing every Supabase call through our own domain
// (savatmarket.uz/api/sb/...) via this Vercel serverless function avoids the
// block, since Vercel's servers reach Supabase directly and are not affected.
//
// Frontend usage: change the SUPABASE_URL/SB base constant from
// "https://<project>.supabase.co" to "/api/sb" — every existing
// fetch(BASE + "/rest/v1/...") call then transparently goes through here.
//
// Also rewrites any embedded "https://<project>.supabase.co" links found in
// JSON responses (e.g. product image URLs saved from Supabase Storage) to
// "/api/sb/..." so images keep working too, for records saved before and
// after this fix, without touching any rendering code.

const SUPABASE_URL = "https://gjsaelqqubmlwnmfyuso.supabase.co";

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const FORWARD_REQUEST_HEADERS = [
  "apikey",
  "authorization",
  "content-type",
  "prefer",
  "range",
  "x-client-info",
  "accept",
];

const FORWARD_RESPONSE_HEADERS = ["content-type", "content-range", "content-disposition"];

async function handler(req, res) {
  try {
    const url = new URL(req.url, "http://placeholder");
    const upstreamPath = url.pathname.replace(/^\/api\/sb\//, "");
    const target = SUPABASE_URL + "/" + upstreamPath + url.search;

    const headers = {};
    for (const h of FORWARD_REQUEST_HEADERS) {
      const v = req.headers[h];
      if (v) headers[h] = v;
    }

    const init = { method: req.method, headers };
    if (!["GET", "HEAD"].includes(req.method)) {
      const raw = await readRawBody(req);
      if (raw.length) init.body = raw;
    }

    const upstream = await fetch(target, init);
    const buf = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get("content-type") || "";

    let outBuf = buf;
    if (contentType.includes("application/json") || contentType.includes("text/")) {
      const text = buf.toString("utf8").split(SUPABASE_URL).join("/api/sb");
      outBuf = Buffer.from(text, "utf8");
    }

    res.status(upstream.status);
    for (const h of FORWARD_RESPONSE_HEADERS) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    res.send(outBuf);
  } catch (e) {
    res.status(502).json({ error: "proxy_failed", message: String(e) });
  }
}

handler.config = { api: { bodyParser: false } };
module.exports = handler;
