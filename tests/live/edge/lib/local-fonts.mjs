// The X control fix (Tooling speedup round, 2026-11-11): serve the Google Fonts css and Inter files to a browser context from a local cache.
//
// Cause: every shot opens a fresh context, so Inter is fetched from fonts.gstatic.com each time. It arrives about 65 ms into the page,
// racing the page's first text layout. When it lands mid-layout, Edge measures some text one layout unit (1/64 px) wider or narrower
// and places glyphs a fraction of a pixel apart. Two pristine loads then differ: 20 of 192 pairs in one pass of all 48 pages (more at 412).
// Served from this cache, the bytes are the same but they arrive after the first layout on every load, and the layout and pixels repeat.
// It also ends the Google Fonts load timeouts (no network).
//
// The cache is filled once from the network (route.fetch), stored as <sha of url>.bin + .json (status, headers, sha256 of the body), and
// re-checked by sha256 on every use. Delete the folder to refetch (Google may serve new font versions; refetch both sides of a comparison).
// usage:  import { useLocalFonts } from "<Target>/tools/edge/lib/local-fonts.mjs";  await useLocalFonts(ctx);   // before ctx.newPage()
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const CACHE = process.env.FONT_CACHE ?? path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "fonts-cache");
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const mem = new Map();
export const fontStats = { served: 0, fetched: 0 };
async function get(route) {
  const url = route.request().url();
  if (mem.has(url)) return mem.get(url);
  const key = sha(url).slice(0, 24), bin = path.join(CACHE, key + ".bin"), meta = path.join(CACHE, key + ".json");
  let e;
  if (fs.existsSync(bin) && fs.existsSync(meta)) {
    const m = JSON.parse(fs.readFileSync(meta, "utf8")), body = fs.readFileSync(bin);
    if (sha(body) !== m.sha256) throw new Error(`local-fonts: ${bin} doesn't match its recorded sha256`);
    e = { status: m.status, headers: m.headers, body };
  } else {
    let r;
    for (let k = 1; ; k++) { try { r = await route.fetch({ timeout: 30000 }); break; } catch (err) { if (k === 3) throw err; } }
    const body = await r.body(), headers = Object.fromEntries(Object.entries(r.headers()).filter(([k]) => !/^(content-encoding|content-length|transfer-encoding)$/i.test(k)));   // the body is already decoded
    if (r.status() !== 200) throw new Error(`local-fonts: ${url} gave ${r.status()}`);
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(bin, body);
    fs.writeFileSync(meta, JSON.stringify({ url, status: 200, headers, sha256: sha(body), fetched: new Date().toISOString() }, null, 1));
    e = { status: 200, headers, body }; fontStats.fetched++;
  }
  mem.set(url, e); return e;
}
export async function useLocalFonts(ctx) {
  await ctx.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, async (route) => {
    const e = await get(route); fontStats.served++;
    await route.fulfill({ status: e.status, headers: e.headers, body: e.body });
  });
}
