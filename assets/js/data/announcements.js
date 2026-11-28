// data/announcements.js (SD1, 2026-11-28): company announcements, restored. The old page held only static samples
// (pages/announcements/announcements.html), so this is a small new store; its seed is three short sample posts (marked sample).
//   "officeos:announcements" { version: 1, next: { post, notice }, posts: [post], notices: [notice] }, read through places.js pureBox:
//   a read never writes, so until the first write the sample is what everyone reads.
//   post    { id "AN-n", title (3-120), body (3-2000), audience "everyone" | a department's code, pinned, expiresOn ("YYYY-MM-DD" | null:
//             shown through that day), postedBy, postedAt (ISO), editedBy, editedAt, endedBy, endedAt (ISO: taken down), sample? }
//   notice  { id "ANN-n", userId, postId, at, read }: one per person and post, made lazily (syncAnnouncementNotices), never twice; it holds
//             no words: the bell draws the post's title at read time, and only while the person may still read the post
// Who (config/permissions.js, no new permission): announcements:view (everyone) reads the posts meant for them: everyone's, and their
// department's, while live (not ended, not past expiresOn on the office day); announcements:create (HR, the Admin; overridable) posts,
// edits, pins and takes down any post, and reads every post, ended ones included. Every write goes to the audit trail with ids, never
// the words. Sample posts make no bell notice (only posts made in the app do), and nobody is told of their own post.
//   reads   announcementsFor(viewerId, now)  allAnnouncements(viewerId, now)  getAnnouncement(viewerId, id, now)
//           announcementNoticesFor(viewerId, { unreadOnly })  mayPost(viewerId)
//   writes  postAnnouncement(actorId, fields, now)  editAnnouncement(actorId, id, changes, now)  setAnnouncementPinned(actorId, id, pinned, now)
//           endAnnouncement(actorId, id, now)  syncAnnouncementNotices(viewerId, now)  markAnnouncementRead(viewerId, postId, now)
//   resetAnnouncements()
import { getUser, getAllUsers, getAllDepartments } from "./store.js";
import { hasPermission } from "../config/roles.js";
import { logEvent } from "./audit-trail.js";
import { pureBox } from "./places.js";
import { remove } from "../core/storage.js";
import { officeNow } from "./shift-engine.js";

const KEY = "announcements";
export const ANNOUNCEMENT_LIMITS = Object.freeze({ title: 120, body: 2000 });
const PRIYA = "EMP-1003", AARAV = "EMP-1001";
const sample = (n, title, body, audience, pinned, postedBy, postedAt) => ({ id: `AN-${n}`, title, body, audience, pinned, expiresOn: null, postedBy, postedAt,
  editedBy: null, editedAt: null, endedBy: null, endedAt: null, sample: true });
const SEED = () => ({
  next: { post: 4, notice: 1 },
  posts: [
    sample(1, "Year-end team day on 18 December", "The whole company meets at the head office from 10:00 to 16:00 for short talks, lunch and the year's thanks. Tell your manager by 10 December if you can't come.", "everyone", true, PRIYA, "2026-11-16T05:00:00.000Z"),
    sample(2, "New shift rules from 1 December", "From 1 December each person's day is read by their own shift. Your shift is on My attendance; ask HR if it looks wrong.", "everyone", false, PRIYA, "2026-11-20T06:30:00.000Z"),
    sample(3, "Laptop updates this Saturday", "IT will update every company laptop on Saturday between 10:00 and 13:00. Leave yours switched on and plugged in at your desk.", "ENG", false, AARAV, "2026-11-24T09:15:00.000Z"),
  ],
  notices: [],
});
const store = pureBox(KEY, 1, SEED, (b) => Array.isArray(b.posts) && Array.isArray(b.notices) && b.next && Number.isInteger(b.next.post));
const copy = (v) => JSON.parse(JSON.stringify(v));
const fail = (error, field) => ({ ok: false, error, ...(field ? { field } : {}) });
const active = (id) => { const u = id ? getUser(String(id)) : null; return u && u.status !== "inactive" ? u : null; };
const can = (u, p) => Boolean(u) && hasPermission(u, p);
const SAVE_FAILED = "Couldn't save. Browser storage may be full or disabled.";
const day = (now) => officeNow(now).date;
const isDay = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? "")); if (!m) return false; const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return t.getUTCDate() === +m[3] && t.getUTCMonth() === +m[2] - 1; };
const plusDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

const isLive = (p, now) => !p.endedAt && (!p.expiresOn || p.expiresOn >= day(now));
const forViewer = (p, v) => p.audience === "everyone" || p.audience === v.department;
const order = (a, b) => (b.pinned - a.pinned) || b.postedAt.localeCompare(a.postedAt) || b.id.localeCompare(a.id, "en", { numeric: true });
const view = (p, now) => ({ ...copy(p), live: isLive(p, now), state: p.endedAt ? "ended" : p.expiresOn && p.expiresOn < day(now) ? "expired" : "live" });

export const mayPost = (viewerId) => can(active(viewerId), "announcements:create");

// The posts meant for the viewer and live now, pinned first, newest first.
export function announcementsFor(viewerId, now = Date.now()) {
  const v = active(viewerId);
  if (!can(v, "announcements:view")) return [];
  return store.read().posts.filter((p) => forViewer(p, v) && isLive(p, now)).sort(order).map((p) => view(p, now));
}
// Every post, ended and expired ones too: for announcements:create.
export function allAnnouncements(viewerId, now = Date.now()) {
  const v = active(viewerId);
  if (!can(v, "announcements:create")) return [];
  return store.read().posts.slice().sort(order).map((p) => view(p, now));
}
export function getAnnouncement(viewerId, id, now = Date.now()) {
  const v = active(viewerId);
  const p = store.read().posts.find((x) => x.id === id);
  if (!p || !v) return null;
  if (can(v, "announcements:create")) return view(p, now);
  return can(v, "announcements:view") && forViewer(p, v) && isLive(p, now) ? view(p, now) : null;
}

// ---------- writes (announcements:create) ----------
function fields(input, now, current = null) {
  const out = {};
  const has = (k) => !current || k in input;
  const text = (v, label, min, max, key) => {
    const s = String(v ?? "").trim().replace(/[ \t]+/g, " ");
    if (s.length < min) return fail(min > 0 ? `${label} needs at least ${min} characters.` : `${label} is required.`, key);
    if (s.length > max) return fail(`${label} can be at most ${max.toLocaleString("en-IN")} characters.`, key);
    if (/[<>]/.test(s)) return fail(`${label} can't contain < or >.`, key);
    return { ok: true, value: s };
  };
  if (has("title")) { const r = text(input.title, "The title", 3, ANNOUNCEMENT_LIMITS.title, "title"); if (!r.ok) return r; out.title = r.value; }
  if (has("body")) { const r = text(input.body, "The message", 3, ANNOUNCEMENT_LIMITS.body, "body"); if (!r.ok) return r; out.body = r.value; }
  if (has("audience")) {
    const a = String(input.audience ?? "everyone").trim();
    if (a !== "everyone" && !getAllDepartments().some((d) => d.code === a)) return fail("Choose everyone or a department.", "audience");
    out.audience = a;
  }
  if (has("pinned")) out.pinned = Boolean(input.pinned);
  if (has("expiresOn")) {
    const e = input.expiresOn ? String(input.expiresOn).trim() : "";
    if (e && !isDay(e)) return fail("Pick a valid date.", "expiresOn");
    if (e && e < day(now)) return fail("The end date can't be in the past.", "expiresOn");
    if (e && e > plusDays(day(now), 366)) return fail("The end date can be at most a year away.", "expiresOn");
    out.expiresOn = e || null;
  }
  return { ok: true, fields: out };
}

export function postAnnouncement(actorId, input = {}, now = Date.now()) {
  const a = active(actorId);
  if (!can(a, "announcements:create")) return fail("You can't post announcements.");
  const f = fields({ audience: "everyone", pinned: false, expiresOn: null, ...input }, now);
  if (!f.ok) return f;
  const b = store.read();
  const record = { id: `AN-${b.next.post}`, ...f.fields, postedBy: a.id, postedAt: new Date(now).toISOString(), editedBy: null, editedAt: null, endedBy: null, endedAt: null };
  b.posts.push(record);
  b.next.post += 1;
  if (!store.write(b)) return fail(SAVE_FAILED);
  logEvent({ actorId: a.id, kind: "announcement-posted", detail: `${record.id} to ${record.audience === "everyone" ? "everyone" : record.audience}${record.pinned ? ", pinned" : ""}` }, now);
  return { ok: true, record: view(record, now) };
}

export function editAnnouncement(actorId, id, changes = {}, now = Date.now()) {
  const a = active(actorId);
  if (!can(a, "announcements:create")) return fail("You can't change announcements.");
  const extra = Object.keys(changes ?? {}).filter((k) => !["title", "body", "audience", "pinned", "expiresOn"].includes(k));
  if (extra.length) return fail(`These can't be changed here: ${extra.join(", ")}.`);
  const b = store.read();
  const p = b.posts.find((x) => x.id === id);
  if (!p) return fail("That announcement doesn't exist.");
  if (p.endedAt) return fail("This announcement was taken down: post a new one instead.");
  const f = fields(changes, now, p);
  if (!f.ok) return f;
  const changed = Object.keys(f.fields).filter((k) => p[k] !== f.fields[k]);
  if (!changed.length) return { ok: true, record: view(p, now) };
  Object.assign(p, f.fields, { editedBy: a.id, editedAt: new Date(now).toISOString() });
  if (!store.write(b)) return fail(SAVE_FAILED);
  logEvent({ actorId: a.id, kind: "announcement-changed", detail: `${p.id}: ${changed.join(", ")}` }, now);
  return { ok: true, record: view(p, now) };
}

export const setAnnouncementPinned = (actorId, id, pinned, now = Date.now()) => editAnnouncement(actorId, id, { pinned: Boolean(pinned) }, now);

// Takes a post down at once (it can't come back: post it again).
export function endAnnouncement(actorId, id, now = Date.now()) {
  const a = active(actorId);
  if (!can(a, "announcements:create")) return fail("You can't take announcements down.");
  const b = store.read();
  const p = b.posts.find((x) => x.id === id);
  if (!p) return fail("That announcement doesn't exist.");
  if (p.endedAt) return fail("This announcement is already taken down.");
  Object.assign(p, { endedBy: a.id, endedAt: new Date(now).toISOString(), pinned: false });
  if (!store.write(b)) return fail(SAVE_FAILED);
  logEvent({ actorId: a.id, kind: "announcement-ended", detail: `${p.id} taken down` }, now);
  return { ok: true, record: view(p, now) };
}

// ---------- the bell ----------
// One notice per person and post made in the app (not a sample), live and meant for them, and not their own; never twice.
export function syncAnnouncementNotices(viewerId, now = Date.now()) {
  const v = active(viewerId);
  if (!can(v, "announcements:view")) return 0;
  const b = store.read();
  const have = new Set(b.notices.filter((n) => n.userId === v.id).map((n) => n.postId));
  const fresh = b.posts.filter((p) => !p.sample && p.postedBy !== v.id && forViewer(p, v) && isLive(p, now) && !have.has(p.id));
  if (!fresh.length) return 0;
  for (const p of fresh) { b.notices.push({ id: `ANN-${b.next.notice}`, userId: v.id, postId: p.id, at: new Date(now).toISOString(), read: false }); b.next.notice += 1; }
  return store.write(b) ? fresh.length : 0;
}
// The viewer's notices, newest first, each with its post's title, only while the post is still theirs to read.
export function announcementNoticesFor(viewerId, { unreadOnly = false } = {}, now = Date.now()) {
  const v = active(viewerId);
  if (!can(v, "announcements:view")) return [];
  const b = store.read();
  return b.notices.filter((n) => n.userId === v.id && (!unreadOnly || !n.read)).map((n) => {
    const p = b.posts.find((x) => x.id === n.postId);
    return p && forViewer(p, v) && isLive(p, now) ? { id: n.id, postId: p.id, text: `New announcement: ${p.title}`, at: n.at, read: n.read } : null;
  }).filter(Boolean).reverse();
}
export function markAnnouncementRead(viewerId, postId, now = Date.now()) {
  const v = active(viewerId);
  if (!v) return fail("You can't do that.");
  const b = store.read();
  const mine = b.notices.filter((n) => n.userId === v.id && n.postId === postId && !n.read);
  if (!mine.length) return { ok: true };
  mine.forEach((n) => { n.read = true; });
  return store.write(b) ? { ok: true } : fail(SAVE_FAILED);
}

// The people a post reaches (for the page's "Sent to ..." line): everyone active, or the department's.
export function audienceCount(audience) {
  const people = getAllUsers().filter((u) => u.status !== "inactive");
  return audience === "everyone" ? people.length : people.filter((u) => u.department === audience).length;
}

export function resetAnnouncements() { remove(KEY); }