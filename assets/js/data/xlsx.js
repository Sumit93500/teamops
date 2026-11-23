// data/xlsx.js (I1, 2026-11-23): reading the first sheet of an Excel (.xlsx) file and writing a one-sheet file, on fflate (MIT, pinned 0.8.3:
// app/package.json, tests/package.json). The app loads this file only when an .xlsx is read or written (a lazy chunk).
//   readXlsx(bytes, limits)  the zip's central directory is read by hand; only four parts are inflated (the workbook, its relations, the shared
//                            strings, the first sheet), each through a streaming inflate that stops at the size limit, so a zip bomb is refused
//                            before it can fill memory: more than 200 entries, a part over 8 MB, 20 MB in all, or a part that inflates more than
//                            100 times its packed size is refused. Cells come back as text; a formula cell (<f>) is reported, never worked out
//                            (its cached value is not trusted); a number stays the number's text (a date cell is Excel's day number).
//   writeXlsx(rows, notes)   a minimal workbook: the rows as inline text cells (never formulas, every cell protected like CSV's), and an
//                            optional second sheet "Notes"
import { Inflate, zipSync, strToU8 } from "fflate";
import { protectCell } from "./csv.js";

export const XLSX_LIMITS = Object.freeze({ entries: 200, part: 8 * 1024 * 1024, total: 20 * 1024 * 1024, ratio: 100, cols: 60 });
const fail = (error, code = "bad-xlsx") => ({ ok: false, error, code });
const BAD = "This Excel file can't be read. Open it in Excel and save it again as .xlsx, or save it as \"CSV UTF-8\".";
const BOMB = "This Excel file unpacks to far more than it should, so it isn't read. Save the sheet again, or as \"CSV UTF-8\".";

const u16 = (b, i) => b[i] | (b[i + 1] << 8);
const u32 = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
const dec = (b) => new TextDecoder("utf-8").decode(b);

// The central directory: { name, method, packed, size, offset } per entry, or a failure.
function directory(b, limits) {
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i -= 1) if (u32(b, i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) return fail(BAD);
  const count = u16(b, eocd + 10), at = u32(b, eocd + 16);
  if (count > limits.entries) return fail(BOMB, "zip-bomb");
  const out = [];
  let p = at;
  for (let k = 0; k < count; k += 1) {
    if (p + 46 > b.length || u32(b, p) !== 0x02014b50) return fail(BAD);
    const method = u16(b, p + 10), packed = u32(b, p + 20), size = u32(b, p + 24), nl = u16(b, p + 28), xl = u16(b, p + 30), cl = u16(b, p + 32), offset = u32(b, p + 42);
    out.push({ name: dec(b.subarray(p + 46, p + 46 + nl)), method, packed, size, offset });
    p += 46 + nl + xl + cl;
  }
  return { ok: true, entries: out };
}

// One part, inflated with a hard cap on what comes out.
function inflatePart(b, e, budget, limits) {
  if (e.size > limits.part || e.size > budget.left || (e.packed > 0 && e.size / e.packed > limits.ratio && e.size > 1024 * 1024)) throw new Error("bomb");
  const h = e.offset;
  if (u32(b, h) !== 0x04034b50) throw new Error("bad");
  const start = h + 30 + u16(b, h + 26) + u16(b, h + 28);
  const packed = b.subarray(start, start + e.packed);
  if (e.method === 0) { if (packed.length > limits.part) throw new Error("bomb"); budget.left -= packed.length; return packed; }
  if (e.method !== 8) throw new Error("bad");
  const chunks = [];
  let got = 0;
  const inf = new Inflate((chunk) => {
    got += chunk.length;
    if (got > limits.part || got > budget.left || got > Math.max(e.packed * limits.ratio, 1024 * 1024)) throw new Error("bomb");
    chunks.push(chunk);
  });
  for (let i = 0; i < packed.length; i += 65536) inf.push(packed.subarray(i, Math.min(packed.length, i + 65536)), i + 65536 >= packed.length);
  budget.left -= got;
  const all = new Uint8Array(got);
  let o = 0;
  for (const c of chunks) { all.set(c, o); o += c.length; }
  return all;
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" };
const unxml = (s) => s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, k) => (k[0] === "#" ? String.fromCodePoint(k[1] === "x" ? parseInt(k.slice(2), 16) : Number(k.slice(1))) : ENT[k]));
const texts = (xml) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g)].map((m) => unxml(m[1] ?? "")).join("");
const colOf = (ref) => { let n = 0; for (const ch of String(ref).replace(/\d+$/, "")) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
const attr = (tag, name) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null;

// -> { ok, records: [{ row, cells }], formulas: [{ row, col }] } or a failure
export function readXlsx(bytes, { rows: maxRows = 1000, ...over } = {}) {
  const limits = { ...XLSX_LIMITS, ...over };
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const dir = directory(b, limits);
  if (!dir.ok) return dir;
  const byName = new Map(dir.entries.map((e) => [e.name, e]));
  const budget = { left: limits.total };
  const part = (name) => { const e = byName.get(name); return e ? dec(inflatePart(b, e, budget, limits)) : null; };
  try {
    const wb = part("xl/workbook.xml");
    if (!wb) return fail(BAD);
    const first = /<sheet\b[^>]*>/.exec(wb)?.[0];
    const rid = first ? attr(first, "r:id") : null;
    const rels = part("xl/_rels/workbook.xml.rels") ?? "";
    const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((t) => attr(t, "Id") === rid);
    let target = rel ? attr(rel, "Target") : "worksheets/sheet1.xml";
    target = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
    const sheet = part(target);
    if (sheet == null) return fail(BAD);
    const ss = part("xl/sharedStrings.xml");
    const shared = ss ? [...ss.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1])) : [];
    const records = [], formulas = [];
    for (const rm of sheet.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>|<row\b([^>]*)\/>/g)) {
      const rowNo = Number(attr(rm[1] ?? rm[3], "r")) || records.length + 1;
      const cells = [];
      for (const cm of (rm[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const at = cm[1], body = cm[2] ?? "";
        const col = attr(at, "r") ? colOf(attr(at, "r")) : cells.length;
        if (col >= limits.cols) return fail(`The sheet has more than ${limits.cols} columns: only the template's columns are read. Remove the extra columns.`, "too-many-cols");
        const t = attr(at, "t");
        if (/<f[\s>/]/.test(body)) { formulas.push({ row: rowNo, col }); cells[col] = ""; continue; }
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
        cells[col] = t === "s" ? shared[Number(v)] ?? "" : t === "inlineStr" ? texts(body) : t === "b" ? (v === "1" ? "TRUE" : "FALSE") : unxml(v ?? "");
      }
      for (let i = 0; i < cells.length; i += 1) if (cells[i] == null) cells[i] = "";
      if (cells.some((c) => c !== "")) records.push({ row: rowNo, cells });
      if (records.length > maxRows + 1) return fail(`The sheet has more than ${maxRows.toLocaleString("en-IN")} rows. Import at most ${maxRows.toLocaleString("en-IN")} at a time: split it into smaller files.`, "too-many-rows");
    }
    return { ok: true, records, formulas };
  } catch (e) {
    return String(e?.message) === "bomb" ? fail(BOMB, "zip-bomb") : fail(BAD);
  }
}

// ---------- writing ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const colName = (i) => { let s = ""; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const sheetXml = (rows) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${
  rows.map((r, i) => `<row r="${i + 1}">${r.map((c, j) => `<c r="${colName(j)}${i + 1}" t="inlineStr"><is><t xml:space="preserve">${esc(protectCell(c))}</t></is></c>`).join("")}</row>`).join("")}</sheetData></worksheet>`;

// rows: arrays of cells (the first is the header); notes: optional rows for a second sheet "Notes". -> the file's bytes
export function writeXlsx(rows, notes = null) {
  const sheets = notes ? ["Data", "Notes"] : ["Data"];
  const files = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/styles.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf/></cellXfs></styleSheet>`),
    "xl/worksheets/sheet1.xml": strToU8(sheetXml(rows)),
  };
  if (notes) files["xl/worksheets/sheet2.xml"] = strToU8(sheetXml(notes));
  return zipSync(files, { level: 6, mtime: new Date("2026-01-01T00:00:00Z") });
}