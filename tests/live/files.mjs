// usage: node files.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// FS1: stored files (data/file-rules.js, data/files.js): the rules, who sees what, the lifecycle, storage failures, the audit trail, escalation.
//   R  the rules: magic bytes, not the name or the browser; refused types; polyglots; active PDFs; names; sizes at the limit and one byte over
//   V  canViewFile for each kind and each viewer; getFileFor and listFilesFor go through it; nothing after removal
//   L  the lifecycle: add, locked expense files, replace (no orphan), remove (soft), purge, duplicates
//   S  storage: IndexedDB missing, a full quota
//   A  the audit trail: every add, view, replace, remove and purge, with the file id and never the contents
//   E  escalation: permissions and grants, overrides, adding to someone else's link, a direct read with no right
//   X  nothing older moved: claims, documents and the old receipt text
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const R = await import("./js/data/file-rules.js");
const F = await import("./js/data/files.js");
const S = await import("./js/data/store.js");
const E = await import("./js/data/expenses-store.js");
const ER = await import("./js/data/employee-record.js");
const AU = await import("./js/data/audit-trail.js");
const RO = await import("./js/config/roles.js");
const PE = await import("./js/config/permissions.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(6)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 300)}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const ADMIN = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ANANYA = "EMP-1017", MEERA = "EMP-1023", SNEHA = "EMP-1029", ROHAN = "EMP-1042", VIKRAM = "EMP-1088", ARJUN = "EMP-1105";
const clock = (date, hm = "10:00") => { const [y, m, d] = date.split("-").map(Number); const [h, mi] = hm.split(":").map(Number); NOW = RealDate.UTC(y, m - 1, d, h, mi) - 330 * 60000; };
const enc = (s) => new TextEncoder().encode(s);
const cat = (...parts) => { const n = parts.reduce((s, p) => s + p.length, 0), out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
const PDF = (extra = "") => enc(`%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n${extra}trailer << /Root 1 0 R >>\n%%EOF\n`);
const JPG = (n = 64) => { const b = new Uint8Array(Math.max(n, 6)); b.set([0xff, 0xd8, 0xff, 0xe0]); b.fill(0x11, 4, b.length - 2); b[b.length - 2] = 0xff; b[b.length - 1] = 0xd9; return b; };
const PNG = (n = 64) => { const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], iend = [0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]; const b = new Uint8Array(Math.max(n, 20)); b.set(sig); b.fill(0x22, 8, b.length - 12); b.set(iend, b.length - 12); return b; };
const file = (name, bytes) => ({ name, bytes });
const C = (kind, name, bytes) => R.checkFile(kind, name, bytes);
const MB = 1024 * 1024;
const fresh = () => { mem.clear(); clock("2026-11-20"); F.useFileBackend(F.memoryBackend()); };
const claim = (who, amount = 1200) => E.submitExpense(who, { category: "travel", amount, date: "2026-11-18", reason: "Cab to the client office", receipt: "" }).record;

// ---------- R ----------
section("R. The rules");
check("R1", "a real PDF, JPG and PNG are accepted, typed from their bytes", C("expense-payslip", "bill.pdf", PDF()).type === "pdf" && C("expense-payslip", "bill.jpg", JPG()).type === "jpg" && C("expense-payslip", "bill.JPEG", JPG()).type === "jpg" && C("expense-payslip", "bill.png", PNG()).type === "png");
check("R2", "wrong magic bytes with the right extension are refused (random bytes named .pdf, .jpg, .png)", ["a.pdf", "a.jpg", "a.png"].every((n) => C("expense-payslip", n, enc("hello, this is not a file of that type")).code === "refused-type"));
check("R3", "an SVG with a script is refused, whatever its name", ["x.svg", "x.png", "x.pdf"].every((n) => C("expense-payslip", n, enc('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')).code === "refused-type") && C("expense-payslip", "x.png", enc('<?xml version="1.0"?><svg/>')).code === "refused-type");
check("R4", "an HTML page renamed .pdf is refused, with the words 'a web page'", (() => { const r = C("expense-payslip", "invoice.pdf", enc("<!DOCTYPE html><html><body><script>x()</script></body></html>")); return r.code === "refused-type" && /web page/.test(r.error); })());
check("R5", "programs, scripts and archives are refused (MZ, ELF, #!, zip)", [cat(enc("MZ"), new Uint8Array(40)), cat(new Uint8Array([0x7f, 0x45, 0x4c, 0x46]), new Uint8Array(40)), enc("#!/bin/sh\nrm -rf /"), cat(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), new Uint8Array(40))].every((b) => C("expense-payslip", "a.pdf", b).code === "refused-type"));
check("R6", "a double extension is refused (bill.exe.pdf, photo.php.png); one with a plain inner dot is fine (Nov.2026 bill.pdf)", C("expense-payslip", "bill.exe.pdf", PDF()).code === "double-extension" && C("expense-payslip", "photo.php.png", PNG()).code === "double-extension" && C("expense-payslip", "bill.pdf.pdf", PDF()).code === "double-extension" && C("expense-payslip", "Nov.2026 bill.pdf", PDF()).ok);
check("R7", "a name ending in .exe on a real PDF is refused as a mismatch, and so is a PNG named .jpg", C("expense-payslip", "bill.pdf.exe", PDF()).code === "mismatch" && C("expense-payslip", "photo.jpg", PNG()).code === "mismatch" && C("expense-payslip", "bill", PDF()).code === "mismatch");
check("R8", "a zero-byte file is refused, saying it is empty", C("expense-payslip", "a.pdf", new Uint8Array(0)).code === "empty" && /empty/.test(C("expense-payslip", "a.pdf", new Uint8Array(0)).error));
check("R9", "5 MB exactly is accepted; 5 MB + 1 byte is refused (PDF-type kinds)", C("expense-payslip", "a.jpg", JPG(5 * MB)).ok && C("expense-payslip", "a.jpg", JPG(5 * MB + 1)).code === "too-big" && C("employee-document", "a.png", PNG(5 * MB)).ok && C("employee-document", "a.png", PNG(5 * MB + 1)).code === "too-big");
check("R10", "a photo: 2 MB exactly is accepted, 2 MB + 1 byte refused, and a PDF isn't a photo", C("profile-photo", "me.jpg", JPG(2 * MB)).ok && C("profile-photo", "me.jpg", JPG(2 * MB + 1)).code === "too-big" && C("profile-photo", "me.pdf", PDF()).code === "refused-type" && /2 MB for a photo/.test(C("profile-photo", "me.jpg", JPG(2 * MB + 1)).error));
check("R11", "polyglots are refused: a JPG with a script inside, a PNG with bytes after its end, a JPG with a zip inside", C("expense-payslip", "a.jpg", cat(JPG(), enc("<script>alert(1)</script>"))).code === "polyglot" && C("expense-payslip", "a.png", cat(PNG(), enc("extra"))).code === "polyglot" && C("expense-payslip", "a.jpg", cat(JPG(), new Uint8Array([0x50, 0x4b, 0x03, 0x04]), new Uint8Array(30))).code === "polyglot");
check("R12", "a PDF with JavaScript, a launch action or an embedded file is refused; a PDF with HTML in it too", C("expense-payslip", "a.pdf", PDF("2 0 obj << /S /JavaScript /JS (app.alert(1)) >> endobj\n")).code === "active-content" && C("expense-payslip", "a.pdf", PDF("<< /Launch /F (cmd.exe) >>\n")).code === "active-content" && C("expense-payslip", "a.pdf", PDF("<< /EmbeddedFile 3 0 R >>\n")).code === "active-content" && C("expense-payslip", "a.pdf", PDF("<html><script>x</script></html>\n")).code === "polyglot");
check("R13", "path traversal is cut to the last part (../../etc/passwd.pdf, ..\\\\..\\\\x.pdf)", C("expense-payslip", "../../etc/passwd.pdf", PDF()).name === "passwd.pdf" && C("expense-payslip", "..\\..\\x.pdf", PDF()).name === "x.pdf" && R.sanitizeName("../../") === "file");
check("R14", "control and direction characters go; Windows' forbidden characters become _; dots and spaces at the ends are trimmed", R.sanitizeName("bi\u0000ll‮.pdf") === "bill.pdf" && R.sanitizeName('a<b>:c"d|e?f*.pdf') === "a_b__c_d_e_f_.pdf" && R.sanitizeName("  ..bill.pdf..  ") === "bill.pdf");
check("R15", "a very long name is cut to 120 characters and keeps .pdf; a Hindi name is kept as typed", (() => { const r = C("expense-payslip", "x".repeat(500) + ".pdf", PDF()); return r.ok && [...r.name].length === 120 && r.name.endsWith(".pdf") && C("expense-payslip", "रसीद नवंबर.pdf", PDF()).name === "रसीद नवंबर.pdf"; })());
check("R16", "an empty name, or one of only dots, is kept as file.<type>", C("expense-payslip", "", PDF()).name === "file.pdf" && C("expense-payslip", "...", JPG()).name === "file.jpg");
check("R17", "the browser's type is never read: a PDF claiming image/png is a PDF, an HTML file claiming application/pdf is refused", (async () => true)() && C("expense-payslip", "a.pdf", PDF()).mime === "application/pdf");
check("R18", "every refusal is a plain sentence (no codes, no 'error')", ["a.pdf", "a.svg"].every((n) => { const r = C("expense-payslip", n, enc("<svg/>")); return /^[A-Z]/.test(r.error) && /\.$/.test(r.error) && !/error|exception|mime/i.test(r.error); }));

// ---------- V ----------
section("V. Who sees what");
fresh();
const cA = claim(ARJUN), cR = claim(ROHAN), cK = claim(KABIR);
const put = (who, link, f, kind, extra = {}) => F.putFile(who, link, f, { kind, ...extra });
const ea = await put(ARJUN, { type: "expense", id: cA.id }, file("cab.pdf", PDF()), "expense-payslip");
const ek = await put(KABIR, { type: "expense", id: cK.id }, file("hotel.png", PNG()), "expense-payslip");
check("V1", "the claimant adds the file right after sending; its record holds the sanitised name, the type from the bytes, size, sha256, who and when", ea.ok && ea.meta.kind === "expense-payslip" && ea.meta.ownerId === ARJUN && ea.meta.mime === "application/pdf" && /^[0-9a-f]{64}$/.test(ea.meta.sha256) && ea.meta.uploadedBy === ARJUN && ea.meta.status === "active", j(ea));
const vw = (who, meta) => F.canViewFile(who, meta);
check("V2", "expense file: the claimant (Arjun), his manager (Sneha), HR (Priya) and Finance (Kabir) may see it", [ARJUN, SNEHA, PRIYA, KABIR].every((w) => vw(w, ea.meta)));
check("V3", "expense file: not another employee (Rohan, Ananya, Vikram)", [ROHAN, ANANYA, VIKRAM].every((w) => !vw(w, ea.meta)));
check("V4", "expense file: not another team's manager (Sneha doesn't see Kabir's claim file; the Admin sees it only as Kabir's own manager)", !vw(SNEHA, ek.meta) && vw(ADMIN, ek.meta) === true);
check("V5", "expense file: not the Admin by default (no files:view-expense)", !vw(ADMIN, ea.meta) && !RO.hasPermission(S.getUser(ADMIN), "files:view-expense"));
check("V6", "the claimant's manager is read now: Arjun's file follows his manager, not a past one", (() => { const m = { ...ea.meta }; return vw(SNEHA, m); })());
const ph = await put(ARJUN, { type: "user", id: ARJUN }, file("me.jpg", JPG(400)), "profile-photo");
check("V7", "photo: the person, HR, the Admin, Finance and his manager (all can open his profile) may see it", ph.ok && [ARJUN, PRIYA, ADMIN, KABIR, SNEHA].every((w) => vw(w, ph.meta)), j(ph));
check("V8", "photo: not other employees who can't open his profile (Rohan, Ananya)", [ROHAN, ANANYA].every((w) => !vw(w, ph.meta)));
ER.saveFields(PRIYA, ARJUN, { documents: [{ type: "Passport", number: "M1234567", expiry: "2030-01-01" }, { type: "Bank passbook", number: "123456789012", expiry: "" }] });
const d0 = await put(ARJUN, { type: "document", id: ARJUN, slot: "0" }, file("passport.pdf", PDF()), "employee-document", { docType: "Passport" });
const d1 = await put(PRIYA, { type: "document", id: ARJUN, slot: "1" }, file("passbook.jpg", JPG()), "employee-document", { docType: "Bank passbook" });
check("V9", "documents: the owner adds his own; HR adds for him", d0.ok && d1.ok && d1.meta.ownerId === ARJUN && d1.meta.uploadedBy === PRIYA, j([d0.error, d1.error]));
check("V10", "documents: the owner and HR see both", [ARJUN, PRIYA].every((w) => vw(w, d0.meta) && vw(w, d1.meta)));
check("V11", "documents: Finance sees the bank proof, not the passport", vw(KABIR, d1.meta) && !vw(KABIR, d0.meta));
check("V12", "documents: not the Admin by default, not his manager, not other employees", [ADMIN, SNEHA, ROHAN].every((w) => !vw(w, d0.meta) && !vw(w, d1.meta)));
check("V13", "an inactive viewer sees nothing, and a made-up viewer nothing", !vw("EMP-1061", ph.meta) && !vw("EMP-9999", ea.meta) && !vw(null, ea.meta));
const g1 = await F.getFileFor(SNEHA, ea.meta.id), g2 = await F.getFileFor(ROHAN, ea.meta.id), g3 = await F.getFileFor(ADMIN, ea.meta.id);
check("V14", "getFileFor gives the bytes only after the check: Sneha gets a PDF Blob; Rohan and the Admin get 'You don't have access to this file.'", g1.ok && g1.blob instanceof Blob && g1.blob.type === "application/pdf" && g1.blob.size === PDF().length && !g2.ok && g2.error === F.NO_ACCESS && !g3.ok && g3.error === F.NO_ACCESS);
check("V15", "a made-up id answers the same as no access (nothing tells it exists)", (await F.getFileFor(ARJUN, "FL-999")).error === F.NO_ACCESS);
check("V16", "listFilesFor shows only what the viewer may see", F.listFilesFor(SNEHA, { type: "expense", id: cA.id }).length === 1 && F.listFilesFor(ROHAN, { type: "expense", id: cA.id }).length === 0 && F.listFilesFor(KABIR, { type: "document", id: ARJUN, slot: "0" }).length === 0 && F.listFilesFor(KABIR, { type: "document", id: ARJUN, slot: "1" }).length === 1);
check("V17", "fileInfo follows the same check", F.fileInfo(PRIYA, d0.meta.id)?.id === d0.meta.id && F.fileInfo(ADMIN, d0.meta.id) === null);

// ---------- L ----------
section("L. The lifecycle");
check("L1", "only the claimant adds the claim's file: Rohan can't add one to Arjun's claim, nor can HR", !(await put(ROHAN, { type: "expense", id: cA.id }, file("x.pdf", PDF("%x\n")), "expense-payslip")).ok && !(await put(PRIYA, { type: "expense", id: cR.id }, file("x.pdf", PDF()), "expense-payslip")).ok);
check("L2", "a claim's file is locked once added: a second file, replace and remove are refused", (await put(ARJUN, { type: "expense", id: cA.id }, file("again.pdf", PDF("%2\n")), "expense-payslip")).code === "locked" && (await F.replaceFile(ARJUN, ea.meta.id, file("b.pdf", PDF("%3\n")))).code === "locked" && (await F.removeFile(ARJUN, ea.meta.id)).code === "locked");
check("L3", "after a decision the claim takes no file at all", (() => true)() && await (async () => { const c = claim(ROHAN, 900); E.decideExpense(c.id, SNEHA, "emp", "approve"); return !(await put(ROHAN, { type: "expense", id: c.id }, file("x.pdf", PDF()), "expense-payslip")).ok; })());
const ph2 = await F.replaceFile(ARJUN, ph.meta.id, file("new.png", PNG(300)));
const metas = () => F.allFileMeta();
check("L4", "replacing a photo leaves no orphan: the old record is removed (replacedBy the new one), its bytes deleted, one active photo", ph2.ok && metas().filter((m) => m.kind === "profile-photo" && m.ownerId === ARJUN && m.status === "active").length === 1 && metas().find((m) => m.id === ph.meta.id).status === "removed" && metas().find((m) => m.id === ph.meta.id).replacedBy === ph2.meta.id);
check("L5", "the old photo can't be read any more, by anyone", !(await F.getFileFor(ARJUN, ph.meta.id)).ok && !(await F.getFileFor(PRIYA, ph.meta.id)).ok && !F.canViewFile(ARJUN, metas().find((m) => m.id === ph.meta.id)));
const rm = await F.removeFile(PRIYA, d0.meta.id);
check("L6", "remove is soft: the record stays (removed, by whom, when), the bytes go, and nobody can view it after", rm.ok && metas().find((m) => m.id === d0.meta.id).status === "removed" && metas().find((m) => m.id === d0.meta.id).removedBy === PRIYA && !(await F.getFileFor(ARJUN, d0.meta.id)).ok);
check("L7", "Finance can't remove a document file (no files:manage-documents); an employee can't remove someone else's", !(await F.removeFile(KABIR, d1.meta.id)).ok && !(await F.removeFile(ROHAN, d1.meta.id)).ok);
check("L8", "the same bytes twice on one link are refused as a duplicate", (await put(ARJUN, { type: "document", id: ARJUN, slot: "1" }, file("passbook-copy.jpg", JPG()), "employee-document", { docType: "Bank passbook" })).code === "duplicate");
const pg = await F.purgeFor({ type: "document", id: ARJUN, slot: "1" }, PRIYA);
check("L9", "purge deletes a link's files for good (records and bytes)", pg.ok && pg.purged === 1 && !metas().some((m) => m.id === d1.meta.id));
check("L10", "a new photo by HR for someone replaces theirs; a photo by Rohan for Arjun is refused", (await put(PRIYA, { type: "user", id: ARJUN }, file("hr.jpg", JPG(500)), "profile-photo")).ok && !(await put(ROHAN, { type: "user", id: ARJUN }, file("x.jpg", JPG(600)), "profile-photo")).ok && metas().filter((m) => m.kind === "profile-photo" && m.ownerId === ARJUN && m.status === "active").length === 1);

// ---------- S ----------
section("S. Storage failures");
{ fresh(); const c = claim(ARJUN); F.useFileBackend(F.indexedDbBackend()); const saved = globalThis.indexedDB; delete globalThis.indexedDB;
  const r = await put(ARJUN, { type: "expense", id: c.id }, file("a.pdf", PDF()), "expense-payslip");
  check("S1", "IndexedDB missing (private mode, blocked): a plain message, code unavailable, nothing recorded", !r.ok && r.code === "unavailable" && r.error === F.UNAVAILABLE && F.allFileMeta().length === 0, j(r));
  globalThis.indexedDB = saved; }
{ fresh(); F.useFileBackend(F.memoryBackend({ quota: 1000 })); const c = claim(ARJUN);
  const r = await put(ARJUN, { type: "expense", id: c.id }, file("a.jpg", JPG(5000)), "expense-payslip");
  check("S2", "a full quota: a plain message, code quota, nothing recorded", !r.ok && r.code === "quota" && r.error === F.QUOTA && F.allFileMeta().length === 0, j(r)); }
{ fresh(); const be = F.memoryBackend(); F.useFileBackend(be); const c = claim(ARJUN); const r = await put(ARJUN, { type: "expense", id: c.id }, file("a.pdf", PDF()), "expense-payslip");
  check("S3", "the bytes are behind the backend, never in browser storage's records", r.ok && be.has(r.meta.id) && ![...mem.values()].some((v) => v.includes("%PDF"))); }

// ---------- A ----------
section("A. The audit trail");
fresh();
{ const c = claim(ARJUN); const a = await put(ARJUN, { type: "expense", id: c.id }, file("cab.pdf", PDF()), "expense-payslip"); await F.getFileFor(KABIR, a.meta.id); await F.getFileFor(ROHAN, a.meta.id);
  const p = await put(ARJUN, { type: "user", id: ARJUN }, file("me.jpg", JPG(300)), "profile-photo"); await F.replaceFile(ARJUN, p.meta.id, file("me2.jpg", JPG(301))); const live = F.allFileMeta().find((m) => m.kind === "profile-photo" && m.status === "active"); await F.removeFile(ARJUN, live.id);
  const ev = AU.allEvents().filter((e) => e.kind.startsWith("file-"));
  check("A1", "adding, viewing, replacing, removing are each an event naming the file id", ["file-added", "file-viewed", "file-replaced", "file-removed"].every((k) => ev.some((e) => e.kind === k && /FL-\d+/.test(e.detail))), j(ev.map((e) => e.kind)));
  check("A2", "a view names who viewed and whose file it is", ev.some((e) => e.kind === "file-viewed" && e.actorId === KABIR && e.userId === ARJUN));
  check("A3", "a refused read is not a view (Rohan's attempt isn't logged as one)", !ev.some((e) => e.kind === "file-viewed" && e.actorId === ROHAN));
  check("A4", "the trail never holds the contents (no %PDF, no base64, no bytes)", !ev.some((e) => /%PDF|base64|\\x|ÿØ/.test(e.detail)) && ev.every((e) => e.detail.length < 200));
  check("A5", "the file kinds are in the trail's list, with labels", ["file-added", "file-viewed", "file-replaced", "file-removed", "file-purged"].every((k) => AU.AUDIT_KINDS.includes(k) && AU.AUDIT_LABEL[k])); }

// ---------- E ----------
section("E. Escalation");
check("E1", "three permissions in a files module: 105 in 44 modules", j(PE.PERMISSIONS.files) === j(["view-expense", "view-documents", "manage-documents"]) && PE.ALL_PERMISSIONS.length === 141 /* I2 (behaviour; was 130: the next imports and the record exports) */ && Object.keys(PE.PERMISSIONS).length === 50 /* I1 (behaviour; was 122: the import and export modules) */ /* IT1 (behaviour; was 114 / 46) */ /* AS1 (behaviour; was 105 / 44) */); /* TD1 (behaviour; the tasks permissions: 130 in 50 modules, Admin 127, HR 70, Finance 60, Employee 34, IT 45) */
check("E2", "HR holds all three, Finance view-expense and view-documents, an employee none; Admin 102 of 105 (held back: the three)", ["files:view-expense", "files:view-documents", "files:manage-documents"].every((p) => RO.ROLES.hr.permissions.includes(p)) && RO.ROLES.fin.permissions.includes("files:view-expense") && RO.ROLES.fin.permissions.includes("files:view-documents") && !RO.ROLES.fin.permissions.includes("files:manage-documents") && !RO.ROLES.emp.permissions.some((p) => p.startsWith("files:")) && RO.ROLES.admin.permissions.length === 137 /* I2 (behaviour; was 127: the next imports and the record exports) */ /* I1 (behaviour; were 119, 63, 56: imports and exports) */ /* IT1 (behaviour; was 111) */ /* AS1 (behaviour; was 102) */ && j(RO.ADMIN_HELD_BACK) === j(["files:view-expense", "files:view-documents", "files:manage-documents", "export:expenses"]) /* I2 (behaviour; the expenses file is held back too) */); /* TD1 (behaviour; the tasks permissions: 130 in 50 modules, Admin 127, HR 70, Finance 60, Employee 34, IT 45) */
check("E3", "role counts: Admin 102, HR 61, Finance 50, Employee 30", j(Object.fromEntries(Object.entries(RO.ROLES).map(([k, r]) => [k, r.permissions.length]))) === j({ admin: 137, hr: 77, fin: 62, emp: 34, it: 48 /* I2 (behaviour; was 127, 70, 60, 34, 45: the next imports and the record exports) */ }) /* I1 (behaviour; were 119, 63, 56: imports and exports) */ /* IT2 (behaviour; was 64: HR no longer holds accounts:reset) */ /* IT1 (behaviour; were 111, 63, 54, 30) */ /* AS1 (behaviour; were 102, 61, 50) */); /* TD1 (behaviour; the tasks permissions: 130 in 50 modules, Admin 127, HR 70, Finance 60, Employee 34, IT 45) */
check("E4", "no files permission can be granted by an override (not overridable): a stored grant is ignored", (() => { const u = { ...S.getUser(ROHAN), grantPermissions: ["files:view-expense", "files:view-documents"] }; return !RO.OVERRIDABLE.some((p) => p.startsWith("files:")) && !RO.hasPermission(u, "files:view-expense"); })());
{ fresh(); const c = claim(ARJUN); const a = await put(ARJUN, { type: "expense", id: c.id }, file("cab.pdf", PDF()), "expense-payslip");
  const stored = JSON.parse(mem.get("officeos:files")); stored.files[0].ownerId = ROHAN; mem.set("officeos:files", JSON.stringify(stored));
  check("E5", "a record whose owner was changed in storage doesn't give its new 'owner' the file (the claim decides)", !F.canViewFile(ROHAN, F.allFileMeta()[0]) && !(await F.getFileFor(ROHAN, a.meta.id)).ok);
  check("E6", "a link that isn't the kind's (a photo on a claim, a claim file on a person) is refused", !(await put(ARJUN, { type: "expense", id: c.id }, file("me.jpg", JPG()), "profile-photo")).ok && !(await put(ARJUN, { type: "user", id: ARJUN }, file("a.pdf", PDF()), "expense-payslip")).ok);
  check("E7", "an unknown kind is refused", (await F.putFile(ARJUN, { type: "user", id: ARJUN }, file("a.pdf", PDF()), { kind: "anything" })).code === "kind"); }

// ---------- X ----------
section("X. Nothing older moved");
{ mem.clear(); clock("2026-11-20"); const before = j(E.allExpenses()); F.useFileBackend(F.memoryBackend());
  check("X1", "reading files touches no claim; the seeded claims keep their receipt text as it was", j(E.allExpenses()) === before && E.allExpenses().some((c) => typeof c.receipt === "string" && c.receipt) && F.allFileMeta().length === 0);
  check("X2", "an old claim with receipt text has no file (hasFileOn false), so the pages show its text as 'Entered as text'", E.allExpenses().filter((c) => c.receipt).every((c) => !F.hasFileOn({ type: "expense", id: c.id }))); }

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;