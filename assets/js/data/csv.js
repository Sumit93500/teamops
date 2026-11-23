// data/csv.js (I1, 2026-11-23): reading and writing CSV (RFC 4180), pure: no storage, no clock.
//   decodeText(bytes)          UTF-8 only: a UTF-8 BOM is dropped; UTF-16 / UTF-32 (by their BOM), invalid UTF-8 and binary (a NUL byte) are
//                              refused with a sentence saying what to do
//   parseCsv(text, limits)     records of cells: quoted values with "" for a quote, commas and line breaks inside quotes, CRLF, LF or CR
//                              line ends, a missing last line end; rows whose cells are all empty are left out; more than limits.rows data
//                              rows (after the header) is refused whole
//   toCsv(rows, { bom })       the other way: every cell protected against formula injection (protectCell), quoted when it must be, CRLF
//                              line ends, a UTF-8 BOM so Excel reads the accents
//   protectCell(value)         a cell starting with = + - @, a tab or a carriage return gets a leading apostrophe, so a spreadsheet shows
//                              it as text and never runs it as a formula
// The import engine (data/import-engine.js) reads uploads through here; data/export.js writes through here.

export const CSV_LIMITS = Object.freeze({ rows: 1000 });

const utf8 = (bytes) => new TextDecoder("utf-8", { fatal: true }).decode(bytes);

export function decodeText(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if ((b[0] === 0xff && b[1] === 0xfe) || (b[0] === 0xfe && b[1] === 0xff)) return { ok: false, error: "This file is saved as UTF-16 text. Save it as \"CSV UTF-8\" and upload it again." };
  if (b[0] === 0x00 && b[1] === 0x00 && b[2] === 0xfe && b[3] === 0xff) return { ok: false, error: "This file is saved as UTF-32 text. Save it as \"CSV UTF-8\" and upload it again." };
  const body = b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf ? b.subarray(3) : b;
  if (body.includes(0)) return { ok: false, error: "This doesn't look like a text file. Upload a CSV saved as \"CSV UTF-8\", or an Excel (.xlsx) file." };
  try {
    return { ok: true, text: utf8(body) };
  } catch {
    return { ok: false, error: "This file isn't UTF-8 text (it may be saved in another encoding, like Windows-1252). Save it as \"CSV UTF-8\" and upload it again." };
  }
}

// -> { ok, records: [{ row, cells }] } (row: 1 for the header, counted by records, not by physical lines) or { ok: false, error }
export function parseCsv(text, { rows: maxRows = CSV_LIMITS.rows } = {}) {
  const s = String(text);
  const records = [];
  let cells = [], cell = "", quoted = false, started = false, at = 0, line = 1, openedOn = 0, record = 0;
  const endCell = () => { cells.push(cell); cell = ""; started = false; };
  const endRecord = () => {
    endCell();
    record += 1;
    if (cells.some((c) => c !== "")) records.push({ row: record, cells });
    cells = [];
  };
  while (at < s.length) {
    const ch = s[at];
    if (quoted) {
      if (ch === "\"") {
        if (s[at + 1] === "\"") { cell += "\""; at += 2; continue; }
        quoted = false; at += 1; continue;
      }
      if (ch === "\n") line += 1;
      cell += ch; at += 1; continue;
    }
    if (ch === "\"" && !started && cell === "") { quoted = true; started = true; openedOn = line; at += 1; continue; }
    if (ch === ",") { endCell(); at += 1; continue; }
    if (ch === "\r" || ch === "\n") {
      endRecord();
      at += ch === "\r" && s[at + 1] === "\n" ? 2 : 1;
      line += 1;
      if (records.length > maxRows + 1) return tooMany(maxRows);
      continue;
    }
    cell += ch; started = true; at += 1;
  }
  if (quoted) return { ok: false, error: `The file ends inside a quoted value that opens on line ${openedOn}: a closing quote (") is missing.` };
  if (cell !== "" || cells.length) endRecord();
  if (records.length > maxRows + 1) return tooMany(maxRows);
  return { ok: true, records };
}
const tooMany = (max) => ({ ok: false, error: `The file has more than ${max.toLocaleString("en-IN")} rows. Import at most ${max.toLocaleString("en-IN")} at a time: split it into smaller files.`, code: "too-many-rows" });

export const protectCell = (value) => {
  const s = value == null ? "" : String(value);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};
const quote = (s) => (/[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, "\"\"")}"` : s);

// rows: arrays of cells (the first is usually the header). -> the CSV text, with a BOM unless bom is false
export function toCsv(rows, { bom = true } = {}) {
  const body = rows.map((r) => r.map((c) => quote(protectCell(c))).join(",")).join("\r\n") + "\r\n";
  return (bom ? "﻿" : "") + body;
}