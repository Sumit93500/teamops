// usage: node importexport.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// I1: the import / export framework and its first form and modules (data/csv.js, data/xlsx.js, data/import-engine.js, data/import-employees.js,
// data/import-history.js, data/export.js; the new permissions and audit kinds)
//   P  permissions: who holds import:* / export:* and the pinned counts
//   C  CSV: BOM, CRLF / LF / CR, quotes, commas and line breaks inside quotes, empty rows, unicode, encodings, 1,000 / 1,001 rows
//   F  the file: 2 MB and one byte more, an empty file, an old .xls, a PDF, a zip that isn't .xlsx
//   X  xlsx: a written file reads back, formulas are reported (never worked out), zip bombs (honest and lying sizes), too many columns, garbage
//   H  headers: a column twice, an unknown one, a required one missing, any case and spacing; the template's EXAMPLE and # rows skipped
//   V  every column's check, and its edges
//   D  duplicates in the file and against people on record; the summary's words
//   A  applying: what a created person holds; ONE IT new-account request each; no sign-in made in bulk (not even by an Admin); the check writes no record
//   T  the confirm token: twice, at once, expired, someone else's, another file's, garbage
//   R  checked again at confirm: the permission, and the data (a duplicate made since)
//   B  all or nothing: a failure part-way puts every stored key back
//   S  sensitive columns: the template, an upload and the export for someone without pii:view
//   E  export: scope, fields, masking, full values only with pii:view and the choice, formula injection, BOM, dates, file name, 5,000 rows, xlsx
//   L  the log: the audit trail and the Import history for every import, export and failed attempt; who may read it; no personal data in it
import { zipSync, strToU8 } from "fflate";
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const clock = (date, hm = "10:00") => { const [y, m, d] = date.split("-").map(Number); const [h, mi] = hm.split(":").map(Number); NOW = RealDate.UTC(y, m - 1, d, h, mi) - 330 * 60000; };
clock("2026-11-23");

const S = await import("./js/data/store.js");
const RO = await import("./js/config/roles.js");
const PM = await import("./js/config/permissions.js");
const CSV = await import("./js/data/csv.js");
const XL = await import("./js/data/xlsx.js");
const E = await import("./js/data/import-engine.js");
const IE = await import("./js/data/import-employees.js");
const IH = await import("./js/data/import-history.js");
const X = await import("./js/data/export.js");
const AU = await import("./js/data/audit-trail.js");
const D = await import("./js/data/it-desk.js");
const C = await import("./js/data/credentials.js");
const ER = await import("./js/data/employee-record.js");
const O = await import("./js/data/offices-store.js");
const SA = await import("./js/data/shift-assignments.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(6)} ${label}${detail !== "" ? `  -> ${String(detail).slice(0, 300)}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const ADMIN = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", SNEHA = "EMP-1029", ROHAN = "EMP-1042", ARJUN = "EMP-1105";
const FORM = IE.EMPLOYEES_FORM;
const enc = (s) => new TextEncoder().encode(s);
const up = (text, name = "people.csv") => ({ bytes: typeof text === "string" ? enc(text) : text, name });
const BASE = ["Full name", "Work email", "Mobile", "Department", "Designation", "Manager's work email", "Office", "Employment type", "Joining date"];
const row = (o = {}) => ({ "Full name": "Asha Verma", "Work email": "asha.verma@northwind.com", Mobile: "+91 98765 43210", Department: "Engineering", Designation: "Software Engineer",
  "Manager's work email": "priya.nair@northwind.com", Office: "Head office", "Employment type": "Full-time", "Joining date": "2026-12-01", ...o });
const file = (rows, headers = BASE, eol = "\r\n") => [headers.join(","), ...rows.map((r) => headers.map((h) => CSV.toCsv([[r[h] ?? ""]], { bom: false }).replace(/\r\n$/, "")).join(","))].join(eol);
const person = (k) => row({ "Full name": `Person ${k}`, "Work email": `person${k}@northwind.com` });
const check1 = (text, who = PRIYA, name) => E.checkImport(FORM, up(text, name), who, NOW);
const problems = (r) => (r.problems ?? []).map(E.problemText);
const usersNow = () => S.getAllUsers().length;
const events = (kind) => AU.auditEvents ? AU.auditEvents().filter((e) => e.kind === kind) : JSON.parse(mem.get("officeos:audit-trail") ?? "{\"events\":[]}").events.filter((e) => e.kind === kind);
const historyBox = () => mem.get("officeos:import-history") ?? "";
let IT1;
const fresh = () => {
  mem.clear(); clock("2026-11-23");
  IT1 = S.addUser(ADMIN, { name: "Isha Kulkarni", email: "isha.kulkarni@northwind.com", department: "IT", designation: "IT Engineer", role: "it", dateOfJoining: "2 Nov 2026" }).record.id;
};
const without = async (role, perm, fn) => { const list = RO.ROLES[role].permissions; const i = list.indexOf(perm); list.splice(i, 1); try { return await fn(); } finally { list.splice(i, 0, perm); } };
const okImport = async (text, who = PRIYA, name = "people.csv") => { const c = await check1(text, who, name); return c.ok ? E.applyImport(FORM, up(text, name), who, c.token, NOW) : c; };

// ---------- P ----------
section("P. Permissions");
fresh();
check("P1", "126 permissions in 49 modules; import: employees, history-view; export: employees, employees-pay", PM.ALL_PERMISSIONS.length === 126 && Object.keys(PM.PERMISSIONS).length === 49 && j(PM.PERMISSIONS.import) === j(["employees", "history-view"]) && j(PM.PERMISSIONS.export) === j(["employees", "employees-pay"]));
check("P2", "role sizes: Admin 123, HR 66, Finance 57, Employee 31, IT 42", RO.ROLES.admin.permissions.length === 123 && RO.ROLES.hr.permissions.length === 66 && RO.ROLES.fin.permissions.length === 57 && RO.ROLES.emp.permissions.length === 31 && RO.ROLES.it.permissions.length === 42, j(Object.fromEntries(Object.entries(RO.ROLES).map(([k, r]) => [k, r.permissions.length]))));
const IMPEX = ["import:employees", "import:history-view", "export:employees", "export:employees-pay"];
const holds = (role) => IMPEX.filter((p) => RO.ROLES[role].permissions.includes(p));
check("P3", "HR: import:employees, import:history-view, export:employees (not the pay export); Finance: export:employees-pay only; the Admin all four", j(holds("hr")) === j(["import:employees", "import:history-view", "export:employees"]) && j(holds("fin")) === j(["export:employees-pay"]) && holds("admin").length === 4);
check("P4", "IT, employees and managers (an employee who manages people) hold none; none of them is overridable", holds("it").length === 0 && holds("emp").length === 0 && IMPEX.every((p) => !RO.OVERRIDABLE.includes(p)) && !RO.hasPermission(S.getUser(SNEHA), "import:employees"));

// ---------- C ----------
section("C. CSV");
const p = (t) => CSV.parseCsv(t);
check("C1", "LF, CRLF and CR line ends read the same; a missing last line end too", ["a,b\nc,d", "a,b\r\nc,d\r\n", "a,b\rc,d\r"].every((t) => j(p(t).records.map((r) => r.cells)) === j([["a", "b"], ["c", "d"]])));
check("C2", "quotes: a comma, a doubled quote and a line break inside quotes stay in the cell; the row numbers count records, not lines", (() => { const r = p("h1,h2\n\"a, b\",\"say \"\"hi\"\"\"\n\"line1\nline2\",x\nlast,y"); return r.ok && r.records[1].cells[0] === "a, b" && r.records[1].cells[1] === "say \"hi\"" && r.records[2].cells[0] === "line1\nline2" && r.records[3].row === 4; })());
check("C3", "rows whose cells are all empty are left out (blank lines, ',,,'), the row numbers still count them", (() => { const r = p("h\n\n,,,\nx\n"); return r.ok && r.records.length === 2 && r.records[1].row === 4; })());
check("C4", "an unterminated quote is refused, naming the line it opens on", (() => { const r = p("h\nok\n\"open\nmore"); return !r.ok && /line 3/.test(r.error); })());
check("C5", "UTF-8 with a BOM: the BOM is dropped (the first header reads clean); unicode is kept", (() => { const d = CSV.decodeText(enc("\uFEFFFull name\nअनन्या Śarmā")); return d.ok && d.text.startsWith("Full name") && d.text.includes("अनन्या Śarmā"); })());
check("C6", "UTF-16 (either BOM), UTF-32, Windows-1252 bytes and binary (NUL) are refused with what to do", [[0xff, 0xfe, 0x41, 0], [0xfe, 0xff, 0, 0x41], [0, 0, 0xfe, 0xff], [0x41, 0xe9, 0x2c, 0x42], [0x41, 0, 0x42]].every((b) => { const d = CSV.decodeText(new Uint8Array(b)); return !d.ok && /CSV UTF-8|text file/.test(d.error); }));
const big = (n) => file(Array.from({ length: n }, (_, k) => person(k)));
const r1001 = await check1(big(1001));
check("C7", "1,001 data rows are refused whole (too many rows, saying 1,000), with no summary; the history says refused", !r1001.ok && r1001.code === "too-many-rows" && /1,000/.test(r1001.error) && !r1001.summary && IH.historyFor(PRIYA).some((h) => h.status === "refused" && h.reason === r1001.error));
const r1000 = await check1(big(1000));
check("C8", "1,000 rows are read and checked (all ready)", r1000.ok && r1000.summary.read === 1000 && r1000.summary.ready === 1000, j(r1000.summary ?? r1000.error));
check("C9", "toCsv: BOM, CRLF, quotes when needed, every cell protected (= + - @ tab CR get an apostrophe); a header round-trips", (() => { const t = CSV.toCsv([["a,b", "x\"y", "=1+1", "+91", "-5", "@me", "\tx", "\rx", "plain"]]); return t.startsWith("\uFEFF") && t.endsWith("\r\n") && t.includes("\"a,b\"") && t.includes("\"x\"\"y\"") && t.includes("'=1+1") && t.includes("'+91") && t.includes("'-5") && t.includes("'@me") && t.includes("\"'\rx\"") && t.includes(",plain"); })());
check("C10", "protectCell leaves ordinary text alone and protects the six starts", CSV.protectCell("Asha") === "Asha" && ["=", "+", "-", "@", "\t", "\r"].every((c) => CSV.protectCell(`${c}x`) === `'${c}x`) && CSV.protectCell(null) === "");

// ---------- F ----------
section("F. The file");
fresh();
const pad = (size) => { const head = file([row()]); return head + " ".repeat(size - enc(head).length); };
const over = await check1(pad(2 * 1024 * 1024 + 1));
const at2 = await check1(pad(2 * 1024 * 1024));
check("F1", "2 MB and one byte is refused as too big, saying the size; exactly 2 MB is read", !over.ok && over.code === "too-big" && /just over 2 MB; at most 2 MB/.test(over.error) && at2.ok, j([over.error, at2.error]));
check("F2", "an empty file is refused (empty)", (await check1("")).code === "empty");
check("F3b", "...judged by its bytes: an old Excel file named data.csv is refused the same way (not read as text)", /Old Excel files \(\.xls\) can't be read/.test((await check1(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]), PRIYA, "data.csv")).error ?? ""));
check("F3", "an old .xls (OLE) is refused, saying to save as .xlsx or CSV UTF-8; a PDF and a PNG are refused as not spreadsheets", (await check1(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 1, 2]), PRIYA, "a.xls")).code === "wrong-type" && /\.xls/.test((await check1(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 1, 2]), PRIYA, "a.xls")).error) && (await check1(enc("%PDF-1.4 x"), PRIYA, "a.pdf")).code === "wrong-type" && (await check1(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1]), PRIYA, "x.csv")).code === "wrong-type");
check("F4", "a zip named .docx is refused; a CSV-looking file named .doc too; the type is judged by the bytes, a .txt CSV is read", (await check1(XL.writeXlsx([["a"]]), PRIYA, "a.docx")).code === "wrong-type" && (await check1(file([row()]), PRIYA, "a.doc")).code === "wrong-type" && (await check1(file([row()]), PRIYA, "a.txt")).ok);
check("F5", "fileKind: PK is xlsx whatever the CSV name says (an .xlsx renamed .csv is still refused as a zip named .csv)", E.fileKind(XL.writeXlsx([["a"]]), "x.xlsx").kind === "xlsx" && !E.fileKind(XL.writeXlsx([["a"]]), "x.csv").ok);

// ---------- X ----------
section("X. Excel files");
const xs = await check1(XL.writeXlsx([BASE, BASE.map((h) => row()[h])]), PRIYA, "people.xlsx");
check("X1", "a written .xlsx reads back: one row, ready", xs.ok && xs.kind === "xlsx" && xs.summary.ready === 1, j(xs.error ?? xs.summary));
const sheetZip = (sheetXml, extra = {}) => zipSync({
  "xl/workbook.xml": strToU8("<workbook xmlns:r=\"r\"><sheets><sheet name=\"A\" sheetId=\"1\" r:id=\"rId1\"/><sheet name=\"B\" sheetId=\"2\" r:id=\"rId2\"/></sheets></workbook>"),
  "xl/_rels/workbook.xml.rels": strToU8("<Relationships><Relationship Id=\"rId1\" Target=\"worksheets/sheet1.xml\"/><Relationship Id=\"rId2\" Target=\"worksheets/sheet2.xml\"/></Relationships>"),
  "xl/worksheets/sheet1.xml": strToU8(sheetXml), ...extra,
});
const cellsRow = (r, vals) => `<row r="${r}">${vals.map((v, i) => `<c r="${String.fromCharCode(65 + i)}${r}" t="inlineStr"><is><t>${v}</t></is></c>`).join("")}</row>`;
const formulaSheet = `<worksheet><sheetData>${cellsRow(1, BASE)}<row r="2">${BASE.map((h, i) => (i === 0 ? `<c r="A2" t="str"><f>HYPERLINK("http://x","click")</f><v>click</v></c>` : `<c r="${String.fromCharCode(65 + i)}2" t="inlineStr"><is><t>${row()[h]}</t></is></c>`)).join("")}</row></sheetData></worksheet>`;
const fx = await check1(sheetZip(formulaSheet, { "xl/worksheets/sheet2.xml": strToU8(`<worksheet><sheetData>${cellsRow(1, ["ignored"])}</sheetData></worksheet>`) }), PRIYA, "f.xlsx");
check("X2", "a formula cell is never worked out nor its cached value trusted: the row has an error naming the column (a formula)", fx.ok && fx.summary.errors === 1 && problems(fx).includes("Row 2, Full name: a formula: type the value itself"), j(problems(fx)));
check("X3", "only the first sheet is read (the second sheet's lone 'ignored' header isn't a problem)", fx.ok && !j(fx.problems).includes("ignored"));
const shared = zipSync({
  "xl/workbook.xml": strToU8("<workbook><sheets><sheet name=\"A\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>"),
  "xl/_rels/workbook.xml.rels": strToU8("<Relationships><Relationship Id=\"rId1\" Target=\"worksheets/sheet1.xml\"/></Relationships>"),
  "xl/sharedStrings.xml": strToU8(`<sst>${BASE.map((h) => `<si><t>${h.replace("'", "&apos;")}</t></si>`).join("")}<si><r><t>Asha </t></r><r><t>Verma</t></r></si></sst>`),
  "xl/worksheets/sheet1.xml": strToU8(`<worksheet><sheetData><row r="1">${BASE.map((_, i) => `<c r="${String.fromCharCode(65 + i)}1" t="s"><v>${i}</v></c>`).join("")}</row><row r="2"><c r="A2" t="s"><v>${BASE.length}</v></c>${BASE.slice(1).map((h, i) => `<c r="${String.fromCharCode(66 + i)}2" t="inlineStr"><is><t>${row()[h]}</t></is></c>`).join("")}</row></sheetData></worksheet>`),
});
const sh = await check1(shared, PRIYA, "s.xlsx");
check("X4", "shared strings (rich text runs joined) and inline strings both read; no styles needed", sh.ok && sh.summary.ready === 1 && sh.rows[0].values.name === "Asha Verma", j(sh.error ?? problems(sh)));
const bombXml = `<worksheet><sheetData>${cellsRow(1, BASE)}${" ".repeat(30 * 1024 * 1024)}</sheetData></worksheet>`;
const bomb = sheetZip(bombXml);
const b1 = await check1(bomb, PRIYA, "bomb.xlsx");
check("X5", "a zip bomb (30 MB of sheet packed into a few KB) is refused as one, before it is unpacked", bomb.length < 2 * 1024 * 1024 && !b1.ok && b1.code === "zip-bomb", j([bomb.length, b1.code]));
const lying = bomb.slice();
for (let i = lying.length - 22; i >= 0; i -= 1) if (lying[i] === 0x50 && lying[i + 1] === 0x4b && lying[i + 2] === 1 && lying[i + 3] === 2) { const name = new TextDecoder().decode(lying.subarray(i + 46, i + 46 + (lying[i + 28] | (lying[i + 29] << 8)))); if (name.endsWith("sheet1.xml")) { lying[i + 24] = 0x10; lying[i + 25] = 0x27; lying[i + 26] = 0; lying[i + 27] = 0; } }
const b2 = await check1(lying, PRIYA, "liar.xlsx");
check("X6", "...and one whose directory lies about the unpacked size (10,000 bytes) is stopped while unpacking", !b2.ok && b2.code === "zip-bomb", j(b2));
const many = sheetZip(`<worksheet><sheetData><row r="1"><c r="BZ1" t="inlineStr"><is><t>x</t></is></c></row></sheetData></worksheet>`);
check("X7", "a cell past column 60 is refused (too many columns)", (await check1(many, PRIYA, "w.xlsx")).code === "too-many-cols");
check("X8", "garbage after PK, and a zip with no workbook, are refused plainly (bad-xlsx)", (await check1(new Uint8Array([0x50, 0x4b, 3, 4, 9, 9, 9]), PRIYA, "g.xlsx")).code === "bad-xlsx" && (await check1(zipSync({ "a.txt": strToU8("x") }), PRIYA, "n.xlsx")).code === "bad-xlsx");
const manyRows = sheetZip(`<worksheet><sheetData>${cellsRow(1, BASE)}${Array.from({ length: 1001 }, (_, k) => cellsRow(k + 2, BASE.map((h) => person(k)[h]))).join("")}</sheetData></worksheet>`);
check("X9", "1,001 rows in a sheet are refused too", (await check1(manyRows, PRIYA, "m.xlsx")).code === "too-many-rows");
const entries = Object.fromEntries(Array.from({ length: 201 }, (_, k) => [`x/${k}.xml`, strToU8("x")]));
check("X10", "more than 200 entries in the zip is refused as a bomb", (await check1(sheetZip(formulaSheet, entries), PRIYA, "e.xlsx")).code === "zip-bomb");

// ---------- H ----------
section("H. Headers and the template's own rows");
fresh();
const hd = async (headers, rows = [row()]) => check1(file(rows, headers));
const dupH = await hd([...BASE, "Work email"]);
check("H1", "a column twice is refused, naming it and both columns", !dupH.ok && dupH.code === "headers" && /"Work email" appears twice \(columns B and J\)/.test(dupH.error), dupH.error);
const unk = await hd([...BASE, "Salary"]);
check("H2", "an unknown column is refused, naming it and its letter", !unk.ok && /Column J is "Salary", which this import doesn't have/.test(unk.error), unk.error);
const miss = await hd(BASE.filter((h) => h !== "Department"));
check("H3", "a required column missing is refused, naming it", !miss.ok && /The required column "Department" is missing/.test(miss.error) && /These required columns are missing: "Work email", "Mobile"/.test((await hd(["Full name", "Department"])).error), miss.error);
const loose = await check1(file([row()], BASE).replace("Full name,Work email", "  FULL   NAME ,work EMAIL"));
check("H4", "headers match in any case and spacing; optional columns may be left out (no Employee code, Shift)", loose.ok && loose.summary.ready === 1, j(loose.error ?? loose.summary));
const tpl = E.templateRows(FORM, S.getUser(PRIYA), NOW);
const tplText = CSV.toCsv([tpl.headers, tpl.example, ...tpl.notes.map((n) => [`# ${n}`])]);
const tplOnly = await check1(tplText);
check("H5", "the template as downloaded (headers, EXAMPLE row, # notes) has no rows to import: its own rows are never data", !tplOnly.ok && tplOnly.code === "no-rows", j(tplOnly));
const tplFilled = await check1(tplText + file([row()], tpl.headers).split("\r\n").slice(1).join("\r\n"));
check("H6", "...filled in below its notes, the EXAMPLE and notes rows are skipped and the real row is read", tplFilled.ok && tplFilled.summary.read === 1 && tplFilled.summary.templateRows === 1 + tpl.notes.length, j(tplFilled.summary ?? tplFilled.error));
check("H7", "a file of headers only says so (no rows); a file with no header at all too", (await check1(BASE.join(","))).code === "no-rows" && (await check1("\n\n,,\n")).code === "no-header");
const tx = await E.templateFor(FORM, PRIYA, "xlsx", NOW);
const txRead = XL.readXlsx(tx.bytes);
check("H8", "the .xlsx template: headers and the EXAMPLE row on the first sheet (notes on a second), named employees-template.xlsx; it reads back with no rows to import", tx.ok && tx.name === "employees-template.xlsx" && txRead.ok && j(txRead.records[0].cells) === j(tpl.headers) && txRead.records[1].cells[0] === "EXAMPLE" && txRead.records.length === 2 && (await check1(tx.bytes, PRIYA, "t.xlsx")).code === "no-rows");
const tc = await E.templateFor(FORM, PRIYA, "csv", NOW);
check("H9", "the CSV template: BOM, the headers, EXAMPLE, the notes naming the live lists (departments, designations, offices, shifts, types)", tc.ok && tc.name === "employees-template.csv" && tc.text.startsWith("\uFEFFEmployee code,Full name") && /Engineering/.test(tc.text) && /Head office/.test(tc.text) && /Early/.test(tc.text) && /Full-time, Contract, Intern/.test(tc.text) && /sign-in request goes to IT/.test(tc.text));
check("H10", "the template is refused to someone without import:employees (Finance, an employee, IT)", !(await E.templateFor(FORM, KABIR, "csv", NOW)).ok && !(await E.templateFor(FORM, ROHAN, "csv", NOW)).ok && !(await E.templateFor(FORM, IT1, "csv", NOW)).ok);

// ---------- V ----------
section("V. Each column's check");
fresh();
const one = async (o, who = PRIYA, headers = [...BASE, "Employee code", "Shift"]) => { const r = await check1(file([row(o)], headers), who); return r.ok ? problems(r) : [r.error]; };
check("V1", "Full name: 1 character, 81 characters, < or >, a leading = are row errors; 80 and unicode pass", (await one({ "Full name": "A" }))[0] === "Row 2, Full name: use 2 to 80 characters" && (await one({ "Full name": "x".repeat(81) })).length === 1 && (await one({ "Full name": "<b>Asha</b>" }))[0] === "Row 2, Full name: can't contain < or >" && (await one({ "Full name": "=1+1" }))[0] === "Row 2, Full name: can't start with = + - or @" && (await one({ "Full name": "x".repeat(80) })).length === 0 && (await one({ "Full name": "अनन्या Śarmā" })).length === 0);
check("V2", "Work email: not an email -> 'not a valid email address'; upper case is kept lower", (await one({ "Work email": "asha@" }))[0] === "Row 2, Work email: not a valid email address" && (await check1(file([row({ "Work email": "ASHA.V@Northwind.com" })]))).rows[0].values.email === "asha.v@northwind.com");
check("V3", "Mobile: fewer than 10 digits or letters are refused; +91 98765 43210 and 9876543210 pass", (await one({ Mobile: "12345" })).length === 1 && (await one({ Mobile: "call me" })).length === 1 && (await one({ Mobile: "9876543210" })).length === 0);
check("V4", "Department: by name or code in any case; an unknown one names it; IT is offered (it joins with its first person)", (await one({ Department: "eng" })).length === 0 && (await one({ Department: "human resources" })).length === 0 && (await one({ Department: "Marketing" }))[0] === "Row 2, Department: no department called \"Marketing\"" && (await one({ Department: "IT", Designation: "IT Engineer" })).length === 0);
check("V5", "Designation: unknown named; Administrator refused for HR (carries Admin) but fine for an Admin", (await one({ Designation: "Wizard" }))[0] === "Row 2, Designation: no designation called \"Wizard\"" && /only an Admin can import/.test((await one({ Designation: "Administrator" }))[0]) && (await one({ Designation: "Administrator" }, ADMIN)).length === 0);
check("V6", "Manager's work email: nobody, and someone who has left (Divya), are refused; an active person's passes", (await one({ "Manager's work email": "nobody@northwind.com" }))[0] === "Row 2, Manager's work email: no active employee has this work email" && (await one({ "Manager's work email": "divya.menon@northwind.com" })).length === 1 && (await one({ "Manager's work email": "SNEHA.RAO@northwind.com" })).length === 0);
O.createOffice(ADMIN, { name: "Pune office", address: "Baner, Pune", state: "Maharashtra", lat: 18.56, lng: 73.78 });
const pune = O.getOffices().find((o) => o.name === "Pune office");
O.createOffice(ADMIN, { name: "Old office", address: "Somewhere", state: "Maharashtra", lat: 18.5, lng: 73.7 });
O.deactivateOffice(ADMIN, O.getOffices().find((o) => o.name === "Old office").id);
check("V7", "Office: every ACTIVE office (head and branch) by name; an inactive one and an unknown one are refused", (await one({ Office: "pune office" })).length === 0 && (await one({ Office: "Head office" })).length === 0 && (await one({ Office: "Old office" }))[0] === "Row 2, Office: no active office called \"Old office\"" && (await one({ Office: "Mars" })).length === 1, pune?.id);
check("V8", "Employment type: Full-time / Contract / Intern in any case; anything else lists them", (await one({ "Employment type": "intern" })).length === 0 && (await one({ "Employment type": "Temp" }))[0] === "Row 2, Employment type: use one of Full-time, Contract, Intern");
check("V9", "Joining date: 2026-12-01, 01-12-2026, 1/12/2026, 1 Dec 2026 and Excel's 46357 all read 2026-12-01", await (async () => { for (const d of ["2026-12-01", "01-12-2026", "1/12/2026", "1 Dec 2026", "46357"]) { const r = await check1(file([row({ "Joining date": d })])); if (!r.ok || r.rows[0].values.joining !== "2026-12-01") return false; } return true; })());
check("V10", "...30 Feb, 13th month and words are 'not a date'; a year and a day ahead is 'more than a year ahead'; exactly a year ahead passes", (await one({ "Joining date": "2027-02-30" }))[0] === "Row 2, Joining date: not a date: write it like 2026-12-01" && (await one({ "Joining date": "01-13-2026" })).length === 1 && (await one({ "Joining date": "soon" })).length === 1 && (await one({ "Joining date": "2027-11-24" }))[0] === "Row 2, Joining date: more than a year ahead" && (await one({ "Joining date": "2027-11-23" })).length === 0);
mem.set("officeos:payroll-runs", j({ version: 1, nextNum: 2, records: [{ id: "PR-1", month: "2026-10", status: "approved", rows: [] }] }));
check("V11", "...a joining date on or before the newest approved payroll month (October) is refused; 1 Nov passes", (await one({ "Joining date": "2026-10-31" }))[0] === "Row 2, Joining date: on or before a payroll month that is already approved: use a later date" && (await one({ "Joining date": "2026-11-01" })).length === 0);
mem.delete("officeos:payroll-runs");
check("V12", "Shift: optional; an active shift by name; an unknown one is refused", (await one({ Shift: "" })).length === 0 && (await one({ Shift: "night" })).length === 0 && (await one({ Shift: "Siesta" }))[0] === "Row 2, Shift: no active shift called \"Siesta\"");
check("V13", "Employee code: 2-20 letters, digits or dashes (kept upper case); 'A', a space or 21 characters refused", (await one({ "Employee code": "nw-0042" })).length === 0 && (await one({ "Employee code": "A" })).length === 1 && (await one({ "Employee code": "NW 42" })).length === 1 && (await one({ "Employee code": "X".repeat(21) })).length === 1);
check("V14", "every required column empty is 'required', each named", (await one({ "Full name": "", Mobile: "", Office: "" })).join("|") === "Row 2, Full name: required|Row 2, Mobile: required|Row 2, Office: required");
check("V15", "a cell over 1,000 characters is refused as too long (its check isn't even tried)", (await one({ "Full name": "y".repeat(1001) }))[0] === "Row 2, Full name: longer than 1,000 characters");
const SENS = [...BASE, "Bank account", "IFSC", "Bank name", "PAN", "Aadhaar"];
const s1 = async (o, who = PRIYA) => { const r = await check1(file([row(o)], SENS), who); return r.ok ? problems(r) : [r.error]; };
check("V16", "Bank account: 9-18 digits (spaces dropped); 8 digits and letters refused", (await s1({ "Bank account": "1234 5678 9012", IFSC: "HDFC0001234" })).length === 0 && (await s1({ "Bank account": "12345678", IFSC: "HDFC0001234" }))[0] === "Row 2, Bank account: A bank account number has 9 to 18 digits." && (await s1({ "Bank account": "12345678901X", IFSC: "HDFC0001234" })).length === 1);
check("V17", "IFSC: the F2 shape (4 letters, 0, 6); lower case is read upper; a bank account without an IFSC is a row error at IFSC", (await s1({ IFSC: "hdfc0001234" })).length === 0 && (await s1({ IFSC: "HDFC1001234" })).length === 1 && (await s1({ "Bank account": "123456789012" }))[0] === "Row 2, IFSC: needed when a bank account or bank name is given");
check("V18", "PAN: a person's (4th letter P) only; a company's (C) is refused with the F2 words", (await s1({ PAN: "abcpe1234f" })).length === 0 && /4th letter/.test((await s1({ PAN: "ABCCE1234F" }))[0]));
check("V19", "Aadhaar: 12 digits, not starting 0/1, Verhoeff check digit; a slip in the last digit is refused", (await s1({ Aadhaar: "2345 6789 0124" })).length === 0 && (await s1({ Aadhaar: "234567890125" })).length === 1 && (await s1({ Aadhaar: "123456789012" })).length === 1);
check("V20", "our own exports' apostrophe before + = - @ is taken off on the way in ('+91 98765 43210 is a good mobile)", (await one({ Mobile: "'+91 98765 43210" })).length === 0);

// ---------- D ----------
section("D. Duplicates and the summary");
fresh();
const dupFile = file([person(1), person(2), row({ "Full name": "Again", "Work email": "PERSON1@northwind.com" }), row({ "Full name": "Taken", "Work email": "rohan.gupta@northwind.com" }), row({ "Full name": "Bad", Mobile: "1" }), row({ "Full name": "Code A", "Work email": "codea@northwind.com", "Employee code": "NW-1" }), row({ "Full name": "Code B", "Work email": "codeb@northwind.com", "Employee code": "nw-1" }), row({ "Full name": "Code Id", "Work email": "codec@northwind.com", "Employee code": "emp-1042" })], [...BASE, "Employee code"]);
const dc = await check1(dupFile);
check("D1", "the same email twice in the file: the second is a duplicate naming the first row (any case)", dc.ok && problems(dc).includes("Row 4, Work email: also in row 2"), j(problems(dc)));
check("D2", "an email already on record is a duplicate naming its owner", problems(dc).includes("Row 5, Work email: already belongs to Rohan Gupta"));
check("D3", "the employee code twice in the file, and one equal to an existing employee ID, are duplicates", problems(dc).includes("Row 8, Employee code: also in row 7") && problems(dc).includes("Row 9, Employee code: already belongs to Rohan Gupta"));
check("D4", "counts: 3 will be imported, 1 has errors, 4 duplicates; the words say so (and singular words for one)", dc.summary.ready === 3 && dc.summary.errors === 1 && dc.summary.duplicates === 4 && E.summaryText(dc.summary, FORM) === "3 will be imported, 1 has errors, 4 duplicates" && E.summaryText({ ready: 1, errors: 2, duplicates: 1 }) === "1 will be imported, 2 have errors, 1 duplicate", E.summaryText(dc.summary, FORM));
check("D5", "the error report: Row, Column, Problem, one line each, BOM, protected", (() => { const t = E.errorReport(dc.problems); return t.startsWith("\uFEFFRow,Column,Problem\r\n") && t.split("\r\n").length === dc.problems.length + 2 && t.includes("4,Work email,also in row 2"); })());
const dupAgain = await okImport(file([row({ "Full name": "Code Z", "Work email": "z@northwind.com", "Employee code": "NW-9" })], [...BASE, "Employee code"]));
const codeTaken = await check1(file([row({ "Full name": "Code Y", "Work email": "y@northwind.com", "Employee code": "nw-9" })], [...BASE, "Employee code"]));
check("D6", "an imported employee code is kept on the record and later files can't reuse it", dupAgain.ok && S.getUser(dupAgain.created[0].id).employeeCode === "NW-9" && problems(codeTaken)[0] === "Row 2, Employee code: already belongs to Code Z");

// ---------- A ----------
section("A. Applying");
fresh();
const before = usersNow();
const reqsBefore = D.requestsFor(ADMIN, { type: "new-account" }).length;
const A_FILE = file([row({ Shift: "Early", Office: "Head office" }), person(2), person(3), row({ "Full name": "Broken", "Work email": "broken@northwind.com", Department: "Nope" })], [...BASE, "Shift"]);
const ac = await check1(A_FILE);
const keysAfterCheck = [...mem.keys()].sort();
check("A1", "the check writes no record: no new person, no IT request; only the history and the audit trail changed", ac.ok && usersNow() === before && D.requestsFor(ADMIN, { type: "new-account" }).length === reqsBefore && keysAfterCheck.includes("officeos:import-history"));
const ap = await E.applyImport(FORM, up(A_FILE), PRIYA, ac.token, NOW);
check("A2", "confirm imports the 3 ready rows and skips the 1 with errors", ap.ok && ap.created.length === 3 && ap.skipped.length === 1 && usersNow() === before + 3, j(ap.error ?? ap.created));
const asha = S.getUser(ap.created[0].id);
check("A3", "the person as the employee form makes them: name, lower-case email, department code, designation, default role, joining shown '1 Dec 2026', type, Work location = the office, manager by id", asha.name === "Asha Verma" && asha.email === "asha.verma@northwind.com" && asha.department === "ENG" && asha.designation === "Software Engineer" && asha.role === "emp" && asha.dateOfJoining === "1 Dec 2026" && asha.employmentType === "Full-time" && asha.location === "Head office" && asha.reportingManagerId === PRIYA && asha.status === "active", j(asha));
check("A4", "the shift is assigned from the joining day (Early from 2026-12-01); a past joining date starts the shift today", SA.shiftIdOn(asha.id, "2026-12-01") === "SH-2" && SA.assignmentsFor(asha.id)[0].from === "2026-12-01");
const reqs = D.requestsFor(ADMIN, { type: "new-account" });
check("A5", "ONE new-account request per imported person, opened by the importer (count == imported)", reqs.length === reqsBefore + 3 && ap.created.every((c) => reqs.filter((r) => r.subjectPersonId === c.id).length === 1 && c.requestId) && reqs.every((r) => r.requesterId === PRIYA));
check("A6", "no sign-in was made for anyone imported: every account is 'none', nothing in the credentials store for them", ap.created.every((c) => C.accountOf(c.id, NOW).status === "none"));
const adminRun = await okImport(file([person(7), person(8)]), ADMIN);
check("A7", "an Admin's import makes no sign-in either (no direct flow in bulk): requests to IT only", adminRun.ok && adminRun.created.every((c) => C.accountOf(c.id, NOW).status === "none" && D.requestsFor(ADMIN, { type: "new-account" }).some((r) => r.subjectPersonId === c.id)));
const branch = await okImport(file([row({ "Full name": "Branch Admin", "Work email": "ba@northwind.com", Office: "Pune office" })]), ADMIN);
O.createOffice(ADMIN, { name: "Pune office", address: "Baner, Pune", state: "Maharashtra", lat: 18.56, lng: 73.78 });
const branch2 = await okImport(file([row({ "Full name": "Branch Admin", "Work email": "ba@northwind.com", Office: "Pune office" })]), ADMIN);
const branch3 = await okImport(file([row({ "Full name": "Branch Hr", "Work email": "bh@northwind.com", Office: "Pune office" })]), PRIYA);
const puneId = O.getOffices().find((o) => o.name === "Pune office").id;
check("A8", "a branch office: an Admin's import assigns it (offices:manage); HR's sets the Work location only, as the employee form does", !branch.ok && branch2.ok && O.officeIdOf(branch2.created[0].id) === puneId && branch3.ok && S.getUser(branch3.created[0].id).location === "Pune office" && O.officeIdOf(branch3.created[0].id) !== puneId);
check("A9", "the result links: each created row names its id and request id; the history entry lists created ids and requests", ap.created.every((c) => /^EMP-\d+$/.test(c.id) && /^ITR-\d+$/.test(c.requestId)) && j(IH.historyFor(PRIYA).find((h) => h.id === ap.historyId).created) === j(ap.created.map((c) => c.id)));
const intern = await okImport(file([row({ "Full name": "In Tern", "Work email": "intern@northwind.com", "Employment type": "Intern", "Joining date": "2026-11-10" })]));
check("A10", "a past joining date (10 Nov) is kept as the joining day; the intern type is kept", intern.ok && S.getUser(intern.created[0].id).dateOfJoining === "10 Nov 2026" && S.getUser(intern.created[0].id).employmentType === "Intern");

// ---------- T ----------
section("T. The confirm token");
fresh();
const tf = file([person(31)]);
const tc1 = await check1(tf);
const first = await E.applyImport(FORM, up(tf), PRIYA, tc1.token, NOW);
const second = await E.applyImport(FORM, up(tf), PRIYA, tc1.token, NOW);
check("T1", "confirming twice imports once: the second is refused (already imported, naming the entry) and adds nobody", first.ok && !second.ok && second.code === "already-imported" && second.historyId === first.historyId && S.getAllUsers().filter((u) => u.email === "person31@northwind.com").length === 1);
const tf2 = file([person(32)]);
const tc2 = await check1(tf2);
const [x1, x2] = await Promise.all([E.applyImport(FORM, up(tf2), PRIYA, tc2.token, NOW), E.applyImport(FORM, up(tf2), PRIYA, tc2.token, NOW)]);
check("T2", "two confirms at the same moment (a double click): the first imports, the second is refused at once as in progress; one person", x1.ok && !x2.ok && x2.code === "in-progress" && S.getAllUsers().filter((u) => u.email === "person32@northwind.com").length === 1);
const tf3 = file([person(33)]);
const tc3 = await check1(tf3);
const late = await E.applyImport(FORM, up(tf3), PRIYA, tc3.token, NOW + 31 * 60000);
const inTime = await E.applyImport(FORM, up(tf3), PRIYA, tc3.token, NOW + 29 * 60000);
check("T3", "a check over 30 minutes old is refused (upload again); within 30 minutes it imports", !late.ok && late.code === "token" && /more than 30 minutes old/.test(late.error) && inTime.ok);
const tf4 = file([person(34)]);
const tc4 = await check1(tf4);
const foreign = await E.applyImport(FORM, up(tf4), ADMIN, tc4.token, NOW);
check("T4", "someone else's check (HR's token, the Admin confirming) is refused", !foreign.ok && foreign.code === "token" && /someone else, or for another file/.test(foreign.error));
const other = await E.applyImport(FORM, up(file([person(35)])), PRIYA, tc4.token, NOW);
check("T5", "a token for another file (the bytes changed after the check) is refused", !other.ok && other.code === "token");
check("T6", "garbage, an empty token, and a token from the future are refused", (await Promise.all(["", "x", "zz.notahash", `${(NOW + 3600000).toString(36)}.abc`].map((t) => E.applyImport(FORM, up(tf4), PRIYA, t, NOW)))).every((r) => !r.ok && r.code === "token"));
check("T7", "nobody was added by T4-T6", !S.getAllUsers().some((u) => ["person34@northwind.com", "person35@northwind.com"].includes(u.email)));

// ---------- R ----------
section("R. Checked again at confirm");
fresh();
const rf = file([person(41)]);
const rc = await check1(rf);
const lost = await without("hr", "import:employees", () => E.applyImport(FORM, up(rf), PRIYA, rc.token, NOW));
check("R1", "HR checks, then loses import:employees: the confirm is refused (not-allowed), nobody added, the attempt in the audit trail", !lost.ok && lost.code === "not-allowed" && !S.getAllUsers().some((u) => u.email === "person41@northwind.com") && events("import-refused").some((e) => e.actorId === PRIYA && /no permission/.test(e.detail)));
const rf2 = file([person(42), person(43)]);
const rc2 = await check1(rf2);
S.addUser(ADMIN, { name: "Got There First", email: "person42@northwind.com", department: "ENG", designation: "Software Engineer", dateOfJoining: "1 Dec 2026" });
const raced = await E.applyImport(FORM, up(rf2), PRIYA, rc2.token, NOW);
check("R2", "an email taken between check and confirm: that row is skipped as a duplicate at confirm, the other imported", raced.ok && raced.created.length === 1 && raced.skipped.length === 1 && raced.skipped[0].status === "duplicate");
const LEAVER = S.addUser(ADMIN, { name: "Leaving Lead", email: "leaving.lead@northwind.com", department: "ENG", designation: "Team Lead", dateOfJoining: "2 Nov 2026" }).record.id;
const rf3 = file([row({ "Full name": "Manager Gone", "Work email": "mg@northwind.com", "Manager's work email": "leaving.lead@northwind.com" })]);
const rc3 = await check1(rf3);
const left = S.deactivateUser(ADMIN, LEAVER, "2026-11-22");
const gone = await E.applyImport(FORM, up(rf3), PRIYA, rc3.token, NOW);
check("R3", "a manager who left between check and confirm: nothing ready, refused, nobody added", rc3.ok && rc3.summary.ready === 1 && left.ok && !gone.ok && gone.code === "nothing" && !S.getAllUsers().some((u) => u.email === "mg@northwind.com"), j([left, gone]));
const exHr = S.addUser(ADMIN, { name: "Former Hr", email: "former.hr@northwind.com", department: "HR", designation: "HR Manager", role: "hr", dateOfJoining: "2 Nov 2026" }).record.id;
const exCheck = await check1(rf, exHr);
S.deactivateUser(ADMIN, exHr, "2026-11-22");
check("R4", "an HR person who left can't confirm their own check, nor check again", exCheck.ok && (await E.applyImport(FORM, up(rf), exHr, exCheck.token, NOW)).code === "not-allowed" && (await check1(rf, exHr)).code === "not-allowed");
check("R5", "Finance, an employee, a manager and IT can't check (not-allowed)", (await Promise.all([KABIR, ROHAN, SNEHA, IT1].map((w) => check1(rf, w)))).every((r) => !r.ok && r.code === "not-allowed"));

// ---------- B ----------
section("B. All or nothing");
fresh();
const snapBefore = new Map(mem);
const bf = file([person(51), person(52), person(53)]);
const bc = await check1(bf);
const afterCheck = new Map(mem);
const breaking = { ...FORM, applyRow: (actor, v, ctx, now) => (v.email === "person53@northwind.com" ? { ok: false, error: "disk full" } : FORM.applyRow(actor, v, ctx, now)) };
const broke = await E.applyImport(breaking, up(bf), PRIYA, bc.token, NOW);
const changed = [...new Set([...mem.keys(), ...afterCheck.keys()])].filter((k) => mem.get(k) !== afterCheck.get(k));
check("B1", "a write failing on row 4 rolls everything back: nobody added, no IT request, no sign-in; refused saying nothing was imported", !broke.ok && broke.code === "rolled-back" && /Row 4 couldn't be saved \(disk full\), so nothing was imported/.test(broke.error) && !S.getAllUsers().some((u) => /person5[123]/.test(u.email)) && D.requestsFor(ADMIN, { type: "new-account" }).length === 0);
check("B2", "every stored key is as it was after the check, except the history and the audit trail (which record the failure)", j(changed.sort()) === j(["officeos:audit-trail", "officeos:import-history"]), j(changed));
check("B3", "the failure is in the history (failed, no value from the row) and the audit trail (import-failed)", IH.historyFor(PRIYA).some((h) => h.status === "failed" && h.reason === "Row 4 couldn't be saved: everything was rolled back." && !j(h).includes("disk full")) && events("import-failed").length === 1);
const thrower = { ...FORM, applyRow: (actor, v, ctx, now) => { const r = FORM.applyRow(actor, v, ctx, now); if (v.email === "person52@northwind.com") throw new Error("boom"); return r; } };
const bc2 = await check1(bf);
const threw = await E.applyImport(thrower, up(bf), PRIYA, bc2.token, NOW);
check("B4", "an exception thrown part-way rolls back too", !threw.ok && threw.code === "rolled-back" && !S.getAllUsers().some((u) => /person5[123]/.test(u.email)));
const bc3 = await check1(bf);
const good = await E.applyImport(FORM, up(bf), PRIYA, bc3.token, NOW);
check("B5", "after the rollbacks the same file imports cleanly (3 people, 3 requests)", good.ok && good.created.length === 3 && D.requestsFor(ADMIN, { type: "new-account" }).length === 3 && snapBefore.size >= 0);
const allOrNothing = { ...FORM, mode: "all-or-nothing" };
const an = file([person(61), row({ "Full name": "X", "Work email": "x61@northwind.com" })]);
const anc = await check1(an);
const anr = await E.applyImport(allOrNothing, up(an), PRIYA, anc.token, NOW);
check("B6", "a form in all-or-nothing mode imports nothing while any row has a problem, and says so", !anr.ok && anr.code === "not-all" && !S.getAllUsers().some((u) => u.email === "person61@northwind.com") && /fix them first/.test(E.summaryText(anc.summary, allOrNothing)));

// ---------- S ----------
section("S. Sensitive columns");
fresh();
check("S1", "HR and the Admin (pii:view + users:edit) get the bank, PAN and Aadhaar columns in the template", ["Bank account", "IFSC", "Bank name", "PAN", "Aadhaar"].every((h) => E.templateRows(FORM, S.getUser(PRIYA), NOW).headers.includes(h) && E.templateRows(FORM, S.getUser(ADMIN), NOW).headers.includes(h)));
const noPii = await without("hr", "pii:view", async () => {
  const t = E.templateRows(FORM, S.getUser(PRIYA), NOW);
  const r = await check1(file([row({ "Bank account": "123456789012", IFSC: "HDFC0001234" })], SENS));
  const tf = await E.templateFor(FORM, PRIYA, "csv", NOW);
  return { t, r, tf };
});
check("S2", "without pii:view the template has none of them (CSV and its notes too)", !["Bank account", "IFSC", "Bank name", "PAN", "Aadhaar"].some((h) => noPii.t.headers.includes(h)) && !/Bank account|Aadhaar/.test(noPii.tf.text));
check("S3", "...and an upload with them is refused whole, plainly, naming the column", !noPii.r.ok && noPii.r.code === "headers" && /The column "Bank account" can't be imported by you/.test(noPii.r.error), noPii.r.error);
const SV = { "Bank account": "1234 5678 9012", IFSC: "hdfc0001234", PAN: "abcpe1234f", Aadhaar: "2345 6789 0124" };
const sv = await okImport(file([row(SV)], SENS), ADMIN);
const svId = sv.created?.[0]?.id;
const svUser = S.getUser(svId);
const svView = ER.profileView(PRIYA, svId);
const payField = (k) => svView.sections.flatMap((s) => s.fields).find((f) => f.key === k);
check("S4", "imported: the account (no spaces) and PAN (upper) on the record, IFSC (upper) + the bank name filled from it, Aadhaar on the record; masked in the profile", sv.ok && svUser.bankAccount === "123456789012" && svUser.bankAccountLast4 === "9012" && svUser.pan === "ABCPE1234F" && payField("ifsc").value === "HDFC0001234" && payField("bankName").value === "HDFC Bank" && payField("bankAccount").value === "•••• •••• 9012" && payField("aadhaar").value === "•••• •••• 0124", j(sv.error ?? svView));
const stored = historyBox() + (mem.get("officeos:audit-trail") ?? "");
check("S5", "neither the history nor the audit trail holds the account, PAN, Aadhaar, the email or the name", !["123456789012", "ABCPE1234F", "234567890124", "2345 6789 0124", "asha.verma@northwind.com"].some((v) => stored.includes(v)) && !historyBox().includes("Asha Verma"));
const noPii2 = await without("hr", "pii:view", () => X.exportFile(PRIYA, "employees", { includeSensitive: true, filters: "All" }));
check("S6", "export: someone without pii:view asking for full values is refused (sensitive) and the attempt logged", !noPii2.ok && noPii2.code === "sensitive" && events("export-refused").length === 1);

// ---------- E ----------
section("E. Export");
fresh();
const ex = await X.exportFile(PRIYA, "employees", { filters: "All" });
const lines = ex.text.split("\r\n");
const cells = (line) => CSV.parseCsv(line).records[0].cells;
const hdr = cells(lines[0].replace(/^\uFEFF/, ""));
const col = (name) => hdr.indexOf(name);
const rohanLine = cells(lines.find((l) => l.startsWith("EMP-1042,")));
check("E1", "HR's file: every person they can see (11 with the IT engineer), named employees-2026-11-23.csv, BOM, CRLF", ex.ok && ex.rows === S.getAllUsers().length && ex.name === "employees-2026-11-23.csv" && ex.text.startsWith("\uFEFFEmployee ID,") && lines.length === ex.rows + 2);
const arjunLine = cells(lines.find((l) => l.startsWith("EMP-1105,")));
check("E2", "dates as YYYY-MM-DD, stated in the column name: Arjun's '12 Jan 2023' is written 2023-01-12; no date is written empty", col("Date of joining (YYYY-MM-DD)") > 0 && arjunLine[col("Date of joining (YYYY-MM-DD)")] === "2023-01-12" && rohanLine[col("Date of joining (YYYY-MM-DD)")] === "");
check("E3", "sensitive values masked exactly as the profile shows them (bank account, PAN)", rohanLine[col("Bank account")] === ER.profileView(PRIYA, ROHAN).sections.flatMap((s) => s.fields).find((f) => f.key === "bankAccount").value && rohanLine[col("PAN")].startsWith("••••••") && !ex.text.includes(S.getUser(ROHAN).bankAccount));
const PARITY = { "Full name": "name", "Work email": "email", Phone: "phone", "Reporting manager": "manager", Designation: "designation", Department: "department", "Employment type": "employmentType", "Work location": "location", "Default role": "role", Aadhaar: "aadhaar", "Bank account": "bankAccount", IFSC: "ifsc", "Bank name": "bankName", PAN: "pan", "UAN (PF)": "uan" };
const parityBad = lines.slice(1, -1).map(cells).filter((r) => {
  const v = ER.profileView(PRIYA, r[0]);
  const f = Object.fromEntries(v.sections.flatMap((s) => s.fields).map((x) => [x.key, x.value]));
  return Object.entries(PARITY).some(([h, k]) => r[col(h)].replace(/^'/, "") !== String(f[k] ?? ""));
});
check("E3b", "every row, field by field, is what that person's profile shows HR (masked values included): the export reads nothing the profile doesn't", parityBad.length === 0, j(parityBad[0]));
const full = await X.exportFile(PRIYA, "employees", { includeSensitive: true, filters: "All" });
check("E4", "with pii:view AND the choice: the full values, and the audit says IN FULL", full.ok && full.text.includes(S.getUser(ROHAN).bankAccount) && events("export-done").some((e) => /IN FULL/.test(e.detail)) && IH.historyFor(PRIYA).some((h) => h.kind === "export" && h.sensitive === true));
const fin = await X.exportFile(KABIR, "employees", {});
const finPay = await X.exportFile(KABIR, "employees-pay", { filters: "All" });
const finHdr = cells(finPay.text.split("\r\n")[0].replace(/^\uFEFF/, ""));
check("E5", "Finance can't export the people list; its pay file has only the pay and bank columns it already sees (no email, phone, address, DOB, Aadhaar), masked", !fin.ok && fin.code === "not-allowed" && finPay.ok && finPay.name === "employees-pay-2026-11-23.csv" && j(finHdr) === j(["Employee ID", "Status", "Full name", "Department", "Bank account", "IFSC", "Bank name", "Branch", "Account holder's name", "PAN", "UAN (PF)", "ESI number"]) && !finPay.text.includes(S.getUser(ROHAN).bankAccount), j(finHdr));
check("E6", "Finance asking for full values is refused (no pii:view): they stay masked", (await X.exportFile(KABIR, "employees-pay", { includeSensitive: true })).code === "sensitive");
check("E7", "an employee, a manager and IT can export nothing", (await Promise.all([ROHAN, SNEHA, IT1].flatMap((w) => [X.exportFile(w, "employees"), X.exportFile(w, "employees-pay")]))).every((r) => !r.ok && r.code === "not-allowed"));
const match = await X.exportFile(PRIYA, "employees", { ids: [ROHAN, ARJUN, "EMP-9999", "../x"], filters: "Search: r" });
check("E8", "matching rows: only the ids asked for that are in scope (an unknown id adds nothing)", match.ok && match.rows === 2 && match.text.split("\r\n").length === 4);
check("E9", "nothing to export is refused plainly; an unknown module and format too", (await X.exportFile(PRIYA, "employees", { ids: [] })).code === "empty" && (await X.exportFile(PRIYA, "salaries")).code === "unknown" && (await X.exportFile(PRIYA, "employees", { format: "pdf" })).code === "format");
S.addUser(ADMIN, { name: "=HYPERLINK(\"http://evil\",\"x\")", email: "evil@northwind.com", department: "ENG", designation: "Software Engineer", dateOfJoining: "1 Dec 2026", phone: "@SUM(1)", location: "-2+3" });
const inj = await X.exportFile(PRIYA, "employees", {});
const evil = inj.text.split("\r\n").find((l) => l.includes("evil@northwind.com"));
check("E10", "formula injection: a name starting =, a phone starting @, a location starting - are written with a leading apostrophe", evil.includes("\"'=HYPERLINK(\"\"http://evil\"\",\"\"x\"\")\"") && evil.includes(",'@SUM(1),") && evil.includes(",'-2+3,"), evil);
const xe = await X.exportFile(PRIYA, "employees", { format: "xlsx" });
const xr = XL.readXlsx(xe.bytes, { rows: 5000 });
const evilX = xr.records.find((r) => r.cells.includes("evil@northwind.com"));
check("E11", "the .xlsx export: employees-2026-11-23.xlsx, text cells only (no formula), the same protection", xe.ok && xe.name === "employees-2026-11-23.xlsx" && xr.ok && xr.formulas.length === 0 && evilX.cells.some((c) => c.startsWith("'=HYPERLINK")) && xr.records.length === xe.rows + 1);
const box = JSON.parse(mem.get("officeos:users"));
const clone = box.records.find((u) => u.id === ROHAN);
for (let k = 0; k < 5000; k += 1) box.records.push({ ...clone, id: `EMP-${20000 + k}`, email: `c${k}@northwind.com` });
mem.set("officeos:users", j(box));
const tooMany = await X.exportFile(PRIYA, "employees", { ids: box.records.slice(0, 5001).map((u) => u.id), filters: "5,001 of them" });
check("E12", "5,001 rows are refused with the count and what to do (and so is everyone, 5,011); the attempt is logged", !tooMany.ok && tooMany.code === "too-many" && /That's 5,001 rows; at most 5,000/.test(tooMany.error) && (await X.exportFile(PRIYA, "employees", {})).code === "too-many" && IH.historyFor(PRIYA).some((h) => h.kind === "export" && h.status === "refused" && h.rows > 5000));
const exactly = await X.exportFile(PRIYA, "employees", { ids: box.records.slice(0, 5000).map((u) => u.id) });
check("E13", "exactly 5,000 rows export", exactly.ok && exactly.rows === 5000);
fresh();
const selfRow = await X.exportFile(PRIYA, "employees", { ids: [PRIYA] });
check("E14", "the exporter's own row is in their file, masked unless they asked for full values", selfRow.ok && selfRow.rows === 1 && !selfRow.text.includes(S.getUser(PRIYA).bankAccount));

// ---------- L ----------
section("L. The log");
fresh();
const lf = file([person(71), row({ "Full name": "Bad", Mobile: "1", "Work email": "bad71@northwind.com" })]);
const lc = await check1(lf, PRIYA, "C:\\Users\\hr\\joiners.csv");
const la = await E.applyImport(FORM, up(lf, "joiners.csv"), PRIYA, lc.token, NOW);
const hist = IH.historyFor(PRIYA);
const done = hist.find((h) => h.status === "imported");
const checked = hist.find((h) => h.status === "checked");
check("L1", "an import leaves: checked (rows read 2, ready 1, errors 1) and imported (who, form, file name without the folder, size, sha256, imported 1, skipped 1, token)", checked && checked.rowsRead === 2 && checked.ready === 1 && checked.errors === 1 && checked.fileName === "joiners.csv" && done && done.actorId === PRIYA && done.form === "employees" && done.size === enc(lf).length && /^[0-9a-f]{64}$/.test(done.sha256) && done.imported === 1 && done.skipped === 1 && done.token === lc.token, j(hist));
check("L2", "the per-row problems are kept as row, column and reason only: no value from the file", j(done.problems) === j([{ row: 3, column: "Mobile", reason: "not a valid phone" }]) && !historyBox().includes("bad71@northwind.com") && !historyBox().includes("Person 71"));
check("L3", "the audit trail: import-checked and import-done, by HR, naming the file and counts (no personal data)", events("import-checked").length === 1 && events("import-done").some((e) => e.actorId === PRIYA && /joiners\.csv: 1 imported, 1 skipped/.test(e.detail)) && !(mem.get("officeos:audit-trail") ?? "").includes("person71@"));
const abandoned = await check1(file([person(72)]), PRIYA, "never-confirmed.csv");
check("L4", "an abandoned check stays as 'checked' in the history (nothing imported)", abandoned.ok && IH.historyFor(PRIYA).some((h) => h.fileName === "never-confirmed.csv" && h.status === "checked") && !S.getAllUsers().some((u) => u.email === "person72@northwind.com"));
await check1(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]), PRIYA, "old.xls");
check("L5", "a refused file is in the history (refused, with the reason) and the audit trail (import-refused)", IH.historyFor(PRIYA).some((h) => h.fileName === "old.xls" && h.status === "refused" && /\.xls/.test(h.reason)) && events("import-refused").some((e) => /old\.xls/.test(e.detail)));
await check1(file([person(73)]), ROHAN);
check("L6", "an employee's attempt is in the audit trail (no permission) but not in the history", events("import-refused").some((e) => e.actorId === ROHAN) && !IH.historyFor(PRIYA).some((h) => h.actorId === ROHAN));
await X.exportFile(PRIYA, "employees", { filters: "Department: Engineering" });
check("L7", "an export: history (export, module, filters, rows, sensitive no, format, file name) and audit (export-done)", IH.historyFor(PRIYA).some((h) => h.kind === "export" && h.module === "employees" && h.filters === "Department: Engineering" && h.sensitive === false && h.format === "csv" && h.fileName === "employees-2026-11-23.csv") && events("export-done").length === 1);
check("L8", "the history is for HR and the Admin only: Finance, an employee, a manager and IT read nothing", IH.historyFor(ADMIN).length > 0 && [KABIR, ROHAN, SNEHA, IT1].every((w) => IH.historyFor(w).length === 0));
check("L9", "filters: kind, status, and office-time dates (from / to)", IH.historyFor(PRIYA, { kind: "export" }).every((h) => h.kind === "export") && IH.historyFor(PRIYA, { status: "refused" }).every((h) => h.status === "refused") && IH.historyFor(PRIYA, { from: "2026-11-23", to: "2026-11-23" }).length === IH.historyFor(PRIYA).length && IH.historyFor(PRIYA, { from: "2026-11-24" }).length === 0 && IH.historyFor(PRIYA, { to: "2026-11-22" }).length === 0);
check("L10", "newest first; ids IH-n", (() => { const h = IH.historyFor(PRIYA); return h.every((e, i) => i === 0 || Number(e.id.slice(3)) < Number(h[i - 1].id.slice(3))); })());
check("L11", "the new audit kinds have labels", ["import-checked", "import-done", "import-failed", "import-refused", "export-done", "export-refused"].every((k) => AU.AUDIT_KINDS.includes(k) && AU.AUDIT_LABEL[k]));
clock("2026-11-23", "23:50");
const late2 = await check1(file([person(74)]), PRIYA, "late.csv");
check("L12", "an entry at 23:50 office time is on the office day (23 Nov), whatever the zone", late2.ok && IH.historyFor(PRIYA, { from: "2026-11-23", to: "2026-11-23" }).some((h) => h.fileName === "late.csv") && IH.historyFor(PRIYA, { from: "2026-11-24" }).length === 0);
const bigCheck = await check1(file(Array.from({ length: 250 }, (_, k) => row({ "Work email": `w${k}@northwind.com`, Mobile: "1" }))), PRIYA, "many-errors.csv");
const bigEntry = IH.historyFor(PRIYA).find((h) => h.fileName === "many-errors.csv");
check("L13", "250 row errors: 200 problems kept with the entry, problemsCut 50, the counts whole (errors 250)", bigCheck.ok && bigEntry.problems.length === 200 && bigEntry.problemsCut === 50 && bigEntry.errors === 250);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);