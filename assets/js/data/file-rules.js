// data/file-rules.js (FS1, 2026-11-22): what a file must be before OfficeOS keeps it. Pure (no storage, no permission): the same rules a server
// would apply, so the backend stage can run them again on its side.
//
//   Types: PDF, JPG and PNG only (a profile photo: JPG or PNG). The type is read from the file's first bytes (its magic number), never from the
//   name or the browser's type; the name's extension must then agree with it. Refused: zero bytes; over the kind's limit (5 MB, a photo 2 MB;
//   exactly the limit is fine); SVG, HTML, XML, scripts, executables, archives; a file that is two things at once (markup, a script or an archive
//   inside a PDF, JPG or PNG, or bytes after a PNG's end); a PDF with active content (JavaScript, launch actions, embedded files); a name with
//   two extensions ("bill.pdf.exe", "photo.php.png").
//   Names: only the last path part is kept; control and direction characters and the characters Windows forbids are replaced; dots and spaces
//   at the ends are trimmed; at most 120 characters (the extension kept); an empty result becomes "file.<ext>". The name is for display only:
//   nothing is stored under it.
//
//   KINDS  LIMITS  sniffType(bytes)  sanitizeName(name)  extensionOf(name)  checkFile(kind, name, bytes) -> { ok, type, mime, name } | { ok: false, code, error }
//   sha256Hex(bytes) (async)  readBytes(file) (async: a Blob / File, an ArrayBuffer or a Uint8Array)  formatSize(bytes)

export const KINDS = ["expense-payslip", "profile-photo", "employee-document"];
export const MB = 1024 * 1024;
export const LIMITS = { "expense-payslip": 5 * MB, "profile-photo": 2 * MB, "employee-document": 5 * MB };
export const TYPES_FOR = { "expense-payslip": ["pdf", "jpg", "png"], "profile-photo": ["jpg", "png"], "employee-document": ["pdf", "jpg", "png"] };
export const MIME = { pdf: "application/pdf", jpg: "image/jpeg", png: "image/png" };
export const TYPE_WORD = { pdf: "PDF", jpg: "JPG", png: "PNG" };
const EXT_TYPE = { pdf: "pdf", jpg: "jpg", jpeg: "jpg", png: "png" };
// extensions that make a "second extension" inside a name suspicious
const RISKY = new Set(["pdf", "jpg", "jpeg", "png", "gif", "svg", "html", "htm", "xhtml", "xml", "js", "mjs", "php", "asp", "aspx", "jsp", "exe", "dll", "bat", "cmd", "com", "scr", "msi", "ps1", "vbs", "sh", "jar", "py", "zip", "rar", "7z", "doc", "docx", "xls", "xlsx", "hta", "lnk"]);
const MAX_NAME = 120;

const fail = (code, error) => ({ ok: false, code, error });
const starts = (b, sig) => sig.every((x, i) => b[i] === x);
const latin1 = new TextDecoder("latin1");
const ascii = (b, from, to) => latin1.decode(b.subarray(Math.max(0, from), Math.min(b.length, to)));

// The type a file's first bytes say it is: "pdf" | "jpg" | "png" | one of the refused kinds | null
export function sniffType(bytes) {
  const b = bytes;
  if (!b || !b.length) return null;
  if (starts(b, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";                    // %PDF-
  if (starts(b, [0xff, 0xd8, 0xff])) return "jpg";
  if (starts(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (starts(b, [0x4d, 0x5a])) return "executable";                              // MZ
  if (starts(b, [0x7f, 0x45, 0x4c, 0x46])) return "executable";                  // ELF
  if (starts(b, [0x50, 0x4b, 0x03, 0x04])) return "archive";                     // zip, docx, xlsx, jar
  if (starts(b, [0x47, 0x49, 0x46, 0x38])) return "gif";
  const head = ascii(b, 0, 512).replace(/^﻿|^\xEF\xBB\xBF/, "").trimStart().toLowerCase();
  if (head.startsWith("#!")) return "script";
  if (/^<\?xml|^<svg|<svg[\s>]/.test(head)) return "svg";
  if (/^<!doctype html|^<html|^<head|^<body|^<script|^<iframe/.test(head)) return "html";
  return null;
}

// markup, a script or an archive hidden in a file of an allowed type (a polyglot); active content in a PDF
function hiddenContent(type, b) {
  const scan = (s) => /<script|<html|<svg|<iframe|<\?php|<!doctype html|javascript:|onload\s*=|onerror\s*=/i.test(s);
  const head = ascii(b, 0, 4096), tail = ascii(b, b.length - 4096, b.length);
  if (type !== "pdf" && (scan(head.slice(8)) || scan(tail))) return "markup";
  for (let i = 4; i < b.length - 3; i++) if (b[i] === 0x50 && b[i + 1] === 0x4b && b[i + 2] === 0x03 && b[i + 3] === 0x04) return "archive";
  if (type === "png") {
    const end = [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];   // IEND and its CRC
    let at = -1;
    for (let i = b.length - 8; i >= 8; i--) if (end.every((x, k) => b[i + k] === x)) { at = i + 8; break; }
    if (at < 0 || b.length - at > 0) return at < 0 ? "broken" : "trailing";
  }
  if (type === "pdf") {
    const all = ascii(b, 0, b.length);
    if (/\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia|XFA)\b/.test(all)) return "active";
    if (scan(all.replace(/stream[\s\S]*?endstream/g, ""))) return "markup";
  }
  return null;
}

export function extensionOf(name) {
  const m = /\.([A-Za-z0-9]{1,10})$/.exec(String(name ?? ""));
  return m ? m[1].toLowerCase() : "";
}

// The name kept for display. Never used as a storage key.
function cleanName(name) {
  let s = String(name ?? "").normalize("NFC");
  s = s.split(/[\\/]/).pop();                                                   // path parts and traversal ("../../x") gone
  s = s.replace(/[\u0000-\u001f\u007f\u0080-\u009f​-‏‪-‮⁦-⁩﻿]/g, "");   // control and direction characters
  s = s.replace(/[<>:"|?*]/g, "_").replace(/\s+/g, " ").replace(/^[\s.]+|[\s.]+$/g, "");
  const e = extensionOf(s);
  if (!s || s === e || /^\.+$/.test(s)) s = "";
  if ([...s].length > MAX_NAME) {
    const tail = e ? `.${e}` : "";
    s = [...s.slice(0, s.length - tail.length)].slice(0, MAX_NAME - tail.length).join("").replace(/[\s.]+$/, "") + tail;
  }
  return s;
}
export const sanitizeName = (name, ext = "") => cleanName(name) || `file${ext ? `.${ext}` : ""}`;

export const formatSize = (n) => (n >= MB ? `${(n / MB).toFixed(n % MB === 0 ? 0 : 1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} bytes`);

// Is this file acceptable for this kind? -> { ok: true, type, mime, name } | { ok: false, code, error }
export function checkFile(kind, name, bytes) {
  if (!KINDS.includes(kind)) return fail("kind", "That isn't a kind of file OfficeOS keeps.");
  const allowed = TYPES_FOR[kind], words = allowed.map((t) => TYPE_WORD[t]).join(allowed.length === 2 ? " or " : ", ").replace(/, (\w+)$/, " or $1");
  const raw = String(name ?? "");
  const b = bytes instanceof Uint8Array ? bytes : null;
  if (!b) return fail("unreadable", "This file couldn't be read. Try choosing it again.");
  if (b.length === 0) return fail("empty", "This file is empty (0 bytes). Choose the file again, or another one.");
  const limit = LIMITS[kind];
  if (b.length > limit) return fail("too-big", `This file is ${formatSize(b.length)}. The limit is ${formatSize(limit)}${kind === "profile-photo" ? " for a photo" : ""}.`);
  const sniffed = sniffType(b);
  if (["svg", "html", "script", "executable", "archive"].includes(sniffed)) return fail("refused-type", `This file is ${sniffed === "svg" ? "an SVG image" : sniffed === "html" ? "a web page" : sniffed === "script" ? "a script" : sniffed === "executable" ? "a program" : "an archive"}, which can't be added. Only ${words} files can.`);
  if (!sniffed || !allowed.includes(sniffed)) return fail("refused-type", `Only ${words} files can be added${kind === "profile-photo" ? " as a photo" : ""}. This file isn't one, whatever its name says.`);
  const base = cleanName(raw);
  const ext = extensionOf(base);
  if (base && !ext) return fail("mismatch", `This file is a ${TYPE_WORD[sniffed]}, but its name has no extension. Rename it to end in .${sniffed} and try again.`);
  if (base && EXT_TYPE[ext] !== sniffed) return fail("mismatch", `This file is a ${TYPE_WORD[sniffed]}, but its name ends in ${ext ? `.${ext}` : "no extension"}. Rename it to end in .${sniffed === "jpg" ? "jpg" : sniffed} and try again.`);
  const inner = !base ? [] : base.slice(0, -(ext.length + 1)).split(".").slice(1).map((x) => x.toLowerCase());
  if (inner.some((x) => RISKY.has(x))) return fail("double-extension", "This file's name has two extensions (like report.pdf.exe). Rename it to one, ending in .pdf, .jpg or .png.");
  const hidden = hiddenContent(sniffed, b);
  if (hidden === "active") return fail("active-content", "This PDF has scripts or embedded files in it, so it can't be added. Save or print it as a plain PDF and try again.");
  if (hidden) return fail("polyglot", `This file has something else hidden inside the ${TYPE_WORD[sniffed]}, so it can't be added. Save it again as a plain ${TYPE_WORD[sniffed]} and try again.`);
  return { ok: true, type: sniffed, mime: MIME[sniffed], name: sanitizeName(raw, sniffed) };
}

export async function sha256Hex(bytes) {
  const d = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function readBytes(file) {
  if (!file) return null;
  if (file instanceof Uint8Array) return file;
  if (file instanceof ArrayBuffer) return new Uint8Array(file);
  if (file.bytes instanceof Uint8Array) return file.bytes;
  if (typeof file.arrayBuffer === "function") return new Uint8Array(await file.arrayBuffer());
  return null;
}