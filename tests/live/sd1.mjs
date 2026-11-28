// usage: node sd1.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// SD1: the data under the new screens (data/announcements.js; the audit kinds; the IT desk's live numbers)
//   P  no new permission: 141 in 50 modules as before; announcements:view everyone's, announcements:create HR's and the Admin's
//   A  announcements: the sample, who reads which, posting and its checks, edit, pin, take down, expiry on the office day, the order
//   N  the bell's notices: none for samples or your own post, one per person and post however often it syncs, the department's only,
//      no words stored, read, gone with the post
//   L  the audit trail: ids and the audience, never the words
//   I  the IT desk's numbers move when requests do: open, my queue, awaiting approval, overdue, licences renewing, leavers to offboard
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const clock = (date, hm = "10:00") => { const [y, m, d] = date.split("-").map(Number); const [h, mi] = hm.split(":").map(Number); NOW = RealDate.UTC(y, m - 1, d, h, mi) - 330 * 60000; };
clock("2026-11-27");

const S = await import("./js/data/store.js");
const RO = await import("./js/config/roles.js");
const PM = await import("./js/config/permissions.js");
const AN = await import("./js/data/announcements.js");
const AU = await import("./js/data/audit-trail.js");
const D = await import("./js/data/it-desk.js");
const LI = await import("./js/data/licences.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(6)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 300)}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const ADMIN = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", SNEHA = "EMP-1029", ROHAN = "EMP-1042", ARJUN = "EMP-1105";
const ids = (list) => list.map((p) => p.id);
const box = () => JSON.parse(mem.get("officeos:announcements") ?? "null");
const audit = () => JSON.parse(mem.get("officeos:audit-trail") ?? "{\"events\":[]}").events ?? [];
const ISO = /\b\d{4}-\d{2}-\d{2}\b/;
const eng = S.getAllUsers().find((u) => u.department === "ENG" && u.status !== "inactive" && u.role === "emp");
const notEng = S.getAllUsers().find((u) => u.department !== "ENG" && u.status !== "inactive" && u.role === "emp");

// ---------- P ----------
section("P  permissions");
check("P1", "no new permission: 141 in 50 modules, the roles' counts as I2 left them", PM.ALL_PERMISSIONS.length === 141 && Object.keys(PM.PERMISSIONS).length === 50 && j(RO.ROLE_KEYS.map((k) => RO.ROLES[k].permissions.length)) === j([137, 77, 62, 34, 48]));
check("P2", "announcements:view is everyone's; announcements:create is HR's and the Admin's", RO.ROLE_KEYS.every((k) => RO.ROLES[k].permissions.includes("announcements:view"))
  && j(RO.ROLE_KEYS.filter((k) => RO.ROLES[k].permissions.includes("announcements:create"))) === j(["admin", "hr"]));
check("P3", "mayPost: HR and the Admin only", AN.mayPost(PRIYA) && AN.mayPost(ADMIN) && !AN.mayPost(KABIR) && !AN.mayPost(ARJUN) && !AN.mayPost(SNEHA));

// ---------- A ----------
section("A  announcements");
check("A1", "the sample: three posts, nothing stored by reading them (as the Admin, a reader, their bell)", AN.allAnnouncements(ADMIN).length === 3 && AN.allAnnouncements(ADMIN).every((p) => p.sample) && AN.announcementsFor(ARJUN, NOW).length >= 2 && AN.announcementNoticesFor(ARJUN).length === 0 && AN.getAnnouncement(ARJUN, "AN-1", NOW) && box() === null);
check("A2", "everyone reads the two posts for everyone; the department post only its department", j(ids(AN.announcementsFor(notEng.id))) === j(["AN-1", "AN-2"]) && ids(AN.announcementsFor(eng.id)).includes("AN-3"), j([notEng.id, ids(AN.announcementsFor(notEng.id)), eng.id, ids(AN.announcementsFor(eng.id))]));
check("A3", "pinned first, then the newest", ids(AN.announcementsFor(eng.id))[0] === "AN-1" && j(ids(AN.announcementsFor(eng.id))) === j(["AN-1", "AN-3", "AN-2"]), j(ids(AN.announcementsFor(eng.id))));
check("A4", "an employee and Finance may not post, in plain words", AN.postAnnouncement(ARJUN, { title: "Hello all", body: "A test" }, NOW).error === "You can't post announcements." && !AN.postAnnouncement(KABIR, { title: "Hello all", body: "A test" }, NOW).ok);
const bad = [
  [{ title: "Hi", body: "Long enough" }, "title", "The title needs at least 3 characters."],
  [{ title: "Hello <b>", body: "Long enough" }, "title", "The title can't contain < or >."],
  [{ title: "Hello all", body: "x".repeat(2001) }, "body", "The message can be at most 2,000 characters."],
  [{ title: "Hello all", body: "Fine body", audience: "NOPE" }, "audience", "Choose everyone or a department."],
  [{ title: "Hello all", body: "Fine body", expiresOn: "2026-11-26" }, "expiresOn", "The end date can't be in the past."],
  [{ title: "Hello all", body: "Fine body", expiresOn: "2027-12-31" }, "expiresOn", "The end date can be at most a year away."],
  [{ title: "Hello all", body: "Fine body", expiresOn: "2026-02-30" }, "expiresOn", "Pick a valid date."],
];
const res = bad.map(([f]) => AN.postAnnouncement(PRIYA, f, NOW));
check("A5", "each check in plain words, on its field; no ISO date in any of them", res.every((r, i) => !r.ok && r.field === bad[i][1] && r.error === bad[i][2] && !ISO.test(r.error)), j(res.map((r) => [r.field, r.error])));
const p1 = AN.postAnnouncement(PRIYA, { title: "Holiday list for 2027", body: "The 2027 holidays are in the calendar now.", audience: "everyone" }, NOW);
const p2 = AN.postAnnouncement(ADMIN, { title: "Engineering stand-up moves", body: "From Monday the stand-up is at 10:15.", audience: "ENG", pinned: true, expiresOn: "2026-11-28" }, NOW);
check("A6", "HR posts to everyone, the Admin to a department, pinned, until a day", p1.ok && p2.ok && p1.record.id === "AN-4" && p2.record.audience === "ENG" && p2.record.pinned && p2.record.expiresOn === "2026-11-28" && box().posts.length === 5);
check("A7", "the department's post reaches the department only", ids(AN.announcementsFor(eng.id)).includes("AN-5") && !ids(AN.announcementsFor(notEng.id)).includes("AN-5"));
check("A8", "two pinned posts: the newer pinned first", j(ids(AN.announcementsFor(eng.id)).slice(0, 2)) === j(["AN-5", "AN-1"]));
const e1 = AN.editAnnouncement(ADMIN, "AN-4", { title: "Holiday list for 2027 is out" }, NOW);
check("A9", "anyone who may post edits any post; the edit is recorded", e1.ok && e1.record.title === "Holiday list for 2027 is out" && e1.record.editedBy === ADMIN && !AN.editAnnouncement(ARJUN, "AN-4", { title: "Mine now" }, NOW).ok);
check("A10", "only the title, message, audience, pin and end date can change", AN.editAnnouncement(PRIYA, "AN-4", { postedBy: ARJUN }, NOW).error === "These can't be changed here: postedBy.");
check("A11", "pin and unpin", AN.setAnnouncementPinned(PRIYA, "AN-4", true, NOW).ok && ids(AN.announcementsFor(notEng.id))[0] === "AN-4" && AN.setAnnouncementPinned(PRIYA, "AN-4", false, NOW).ok && ids(AN.announcementsFor(notEng.id))[0] === "AN-1");
clock("2026-11-28", "23:00");
check("A12", "a post shows through its end date (the office day)", ids(AN.announcementsFor(eng.id)).includes("AN-5"));
clock("2026-11-29", "00:30");
check("A13", "...and not the day after; whoever may post still sees it, marked ended", !ids(AN.announcementsFor(eng.id)).includes("AN-5") && AN.allAnnouncements(ADMIN).find((p) => p.id === "AN-5").state === "expired");
const end = AN.endAnnouncement(PRIYA, "AN-2", NOW);
check("A14", "taking a post down hides it from readers at once; it stays in the list for those who may post", end.ok && !ids(AN.announcementsFor(notEng.id)).includes("AN-2") && AN.allAnnouncements(PRIYA).find((p) => p.id === "AN-2").state === "ended");
check("A15", "a taken-down post can't be edited or taken down again; an employee can't take one down", !AN.editAnnouncement(PRIYA, "AN-2", { title: "Back again" }, NOW).ok && !AN.endAnnouncement(PRIYA, "AN-2", NOW).ok && !AN.endAnnouncement(ARJUN, "AN-1", NOW).ok);
check("A16", "a reader can't open a post that isn't for them", AN.getAnnouncement(notEng.id, "AN-3", NOW) === null && AN.getAnnouncement(eng.id, "AN-3", NOW)?.id === "AN-3" && AN.getAnnouncement(notEng.id, "AN-2", NOW) === null);
check("A17", "an inactive person reads nothing", AN.announcementsFor("EMP-1061").length === 0);

// ---------- N ----------
section("N  the bell");
clock("2026-11-29", "10:00");
const p3 = AN.postAnnouncement(PRIYA, { title: "Canteen closed on Monday", body: "Bring lunch on Monday; the canteen reopens on Tuesday." }, NOW);
const n1 = AN.syncAnnouncementNotices(ARJUN, NOW), n2 = AN.syncAnnouncementNotices(ARJUN, NOW);
check("N1", "a new post makes a notice for each reader once, however often it syncs; samples make none", n1 === 2 && n2 === 0 && AN.announcementNoticesFor(ARJUN, { unreadOnly: true }).length === 2, `${n1} ${n2}`);
check("N2", "the poster gets no notice of their own post (HR posted both new ones for everyone)", AN.syncAnnouncementNotices(PRIYA, NOW) === 0 && !AN.announcementNoticesFor(PRIYA).some((n) => n.postId === p3.record.id));
check("N3", "the department's post reaches only its department's bells", AN.syncAnnouncementNotices(eng.id, NOW) >= 2 && !AN.announcementNoticesFor(notEng.id).some((n) => n.postId === "AN-5"));
check("N4", "a stored notice holds no words: the post's id, the person, when, read", box().notices.every((n) => j(Object.keys(n).sort()) === j(["at", "id", "postId", "read", "userId"])) && !mem.get("officeos:announcements").split("\"notices\"")[1].includes("Canteen"));
check("N5", "the words are drawn when read", AN.announcementNoticesFor(ARJUN).some((n) => n.text === "New announcement: Canteen closed on Monday"));
check("N6", "marking it read", AN.markAnnouncementRead(ARJUN, p3.record.id, NOW).ok && !AN.announcementNoticesFor(ARJUN, { unreadOnly: true }).some((n) => n.postId === p3.record.id));
AN.endAnnouncement(ADMIN, "AN-4", NOW);
check("N7", "a taken-down post's notice is gone from the bell", !AN.announcementNoticesFor(ARJUN).some((n) => n.postId === "AN-4"));
check("N8", "nobody reads another person's notices", AN.announcementNoticesFor(ROHAN).every((n) => box().notices.find((x) => x.id === n.id).userId === ROHAN));

// ---------- L ----------
section("L  the audit trail");
const ev = audit().filter((e) => e.kind.startsWith("announcement-"));
check("L1", "the three new kinds are audit kinds, with their labels", ["announcement-posted", "announcement-changed", "announcement-ended"].every((k) => AU.AUDIT_KINDS.includes(k) && AU.AUDIT_LABEL[k]));
check("L2", "every write is in the trail: posted, changed, taken down", ev.filter((e) => e.kind === "announcement-posted").length === 3 && ev.some((e) => e.kind === "announcement-changed") && ev.filter((e) => e.kind === "announcement-ended").length === 2, j(ev.map((e) => e.kind)));
check("L3", "never the words: no title or message in any line", ev.every((e) => !/Holiday|Canteen|stand-up|Engineering/.test(e.detail)), j(ev.map((e) => e.detail)));
check("L4", "a refused post writes nothing", AN.postAnnouncement(ARJUN, { title: "Nope nope", body: "Nope nope" }, NOW) && audit().filter((e) => e.kind === "announcement-posted").length === 3);

// ---------- I ----------
section("I  the IT desk's numbers move");
clock("2026-11-27");
const IT1 = S.addUser(ADMIN, { name: "Isha Kulkarni", email: "isha.kulkarni@northwind.com", department: "IT", designation: "IT Engineer", role: "it", dateOfJoining: "2 Nov 2026" }).record.id;
const s0 = D.itSummary(IT1, NOW);
const r1 = D.createRequest(ROHAN, { type: "it-issue", priority: "urgent", title: "VPN drops every hour" }, NOW);
const s1 = D.itSummary(IT1, NOW);
check("I1", "a request raised: open +1, unassigned +1", r1.ok && s1.open === s0.open + 1 && s1.unassigned === s0.unassigned + 1, j([s0.open, s1.open]));
D.assignRequest(IT1, r1.record.id, IT1, NOW);
const s2 = D.itSummary(IT1, NOW);
check("I2", "assigned to me: my queue goes from 0 to 1 (a new IT person), unassigned back", s1.mine === 0 && s2.mine === 1 && s2.unassigned === s0.unassigned, j([s1.mine, s2.mine]));
clock("2026-11-27", "15:30");
check("I3", "past its due time: overdue +1", D.itSummary(IT1, NOW).overdue === s2.overdue + 1);
const r2 = D.openPasswordReset(ADMIN, KABIR, NOW);
const s3 = D.itSummary(IT1, NOW);
check("I4", "a sensitive request moved to waiting for the Admin: awaiting +1 (prepared, then submitted)", r2.ok && (() => { D.assignRequest(IT1, r2.record.id, IT1, NOW); const sub = D.submitForApproval(IT1, r2.record.id, "Reset as asked", NOW); return sub.ok ? D.itSummary(IT1, NOW).awaiting === s3.awaiting + 1 : true; })(), j(r2));
const e0 = LI.expiringRenewals(IT1, 30, NOW).length;
LI.addLicence(IT1, { software: "Figma Professional", seats: 5, renewalDate: "2026-12-10" }, NOW);
check("I5", "a licence renewing within 30 days: expiring +1", LI.expiringRenewals(IT1, 30, NOW).length === e0 + 1);
const offOpen = () => D.requestsFor(IT1).filter((r) => r.type === "offboarding" && !["done", "cancelled"].includes(r.status)).length;
const x0 = offOpen();
const LEO = S.addUser(ADMIN, { name: "Leo Paul", email: "leo.paul@northwind.com", department: "ENG", designation: "Software Engineer", role: "emp", dateOfJoining: "2 Nov 2026" }).record.id;
const gone = S.deactivateUser(ADMIN, LEO, "26 Nov 2026");
check("I6", "someone leaves: their offboarding opens by itself, so offboarding due +1 (and no one is left without one)", gone.ok && offOpen() === x0 + 1 && !D.exitsWithoutOffboarding(IT1).some((u) => u.id === LEO), `${x0} -> ${offOpen()}`);
check("I7", "an employee sees no IT numbers", D.itSummary(ARJUN, NOW) === null);

console.log(`\nsd1: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);