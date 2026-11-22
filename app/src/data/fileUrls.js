// FS1: object URLs for stored files, made only after data/files.js getFileFor() has checked the viewer (and written the view to the audit trail).
// One URL per (viewer, file) while something on screen uses it (counted); the last user's release revokes it. Every URL is revoked when the
// signed-in person changes (sign out, sign in as someone else): nothing made for one person is reachable by the next.
//   acquireFileUrl(viewerId, fileId) -> Promise<{ ok, url, meta } | { ok: false, error, code }>   releaseFileUrl(viewerId, fileId)
//   revokeAllFileUrls()   liveFileUrlCount()   useFileUrl(fileId) (the hook: { state: "loading" | "ok" | "error", url, meta, error })
import { useEffect, useState } from "react";
import { getFileFor } from "../../../assets/js/data/files.js";
import { getCurrentUserId } from "../../../assets/js/core/auth.js";
import { subscribe } from "./bus.js";

const live = new Map();   // "viewer|file" -> { url, meta, count, promise }
let owner = null;          // the viewer the URLs were made for

export function revokeAllFileUrls() {
  for (const e of live.values()) if (e.url) URL.revokeObjectURL(e.url);
  live.clear();
  owner = null;
}
export const liveFileUrlCount = () => live.size;

// whoever is signed in now; a change revokes everything made for the one before
function guardViewer() {
  const now = getCurrentUserId() ?? null;
  if (owner !== null && owner !== now) revokeAllFileUrls();
  owner = now;
  return now;
}
subscribe(() => { if (owner !== null && owner !== (getCurrentUserId() ?? null)) revokeAllFileUrls(); });
if (typeof window !== "undefined") window.addEventListener("storage", (e) => { if (e.key === "officeos:session") revokeAllFileUrls(); });

export async function acquireFileUrl(viewerId, fileId) {
  if (guardViewer() !== viewerId) return { ok: false, code: "no-access", error: "You don't have access to this file." };
  const key = `${viewerId}|${fileId}`;
  let e = live.get(key);
  if (!e) {
    e = { url: null, meta: null, count: 0, promise: null };
    live.set(key, e);
    e.promise = getFileFor(viewerId, fileId).then((r) => {
      if (live.get(key) !== e) return r.ok ? { ok: false, code: "gone", error: "This file isn't available any more." } : r;   // revoked meanwhile
      if (!r.ok) { live.delete(key); return r; }
      e.url = URL.createObjectURL(r.blob); e.meta = r.meta;
      return { ok: true, url: e.url, meta: r.meta };
    });
  }
  e.count += 1;
  const r = await e.promise;
  return r.ok && live.get(key) === e ? { ok: true, url: e.url, meta: e.meta } : r.ok ? { ok: false, code: "gone", error: "This file isn't available any more." } : r;
}

export function releaseFileUrl(viewerId, fileId) {
  const key = `${viewerId}|${fileId}`, e = live.get(key);
  if (!e) return;
  e.count -= 1;
  if (e.count <= 0) { if (e.url) URL.revokeObjectURL(e.url); live.delete(key); }
}

// The URL of a stored file for the signed-in person, released when the component goes or the file changes.
export function useFileUrl(viewerId, fileId) {
  const [st, setSt] = useState({ state: fileId ? "loading" : "none", url: null, meta: null, error: null });
  useEffect(() => {
    if (!fileId || !viewerId) { setSt({ state: "none", url: null, meta: null, error: null }); return undefined; }
    let gone = false;
    setSt({ state: "loading", url: null, meta: null, error: null });
    acquireFileUrl(viewerId, fileId).then((r) => { if (!gone) setSt(r.ok ? { state: "ok", url: r.url, meta: r.meta, error: null } : { state: "error", url: null, meta: null, error: r.error }); });
    return () => { gone = true; releaseFileUrl(viewerId, fileId); };
  }, [viewerId, fileId]);
  return st;
}