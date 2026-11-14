// data/mail-outbox.js (E1): the demo's Mail outbox. OfficeOS sends no email yet (email delivery arrives with the backend),
// so what would be sent is listed here for an Admin to see the flow:
//   "officeos:mail-outbox"  { version: 1, nextNum, mails: [{ id "MAIL-n", at, to, userId, kind, subject, body, expiresAt }] }
// The stored mail never holds a secret: no password, no link token. The link a mail would carry is kept only in this
// browser tab's memory (linkOf), so it can be opened here until the page is reloaded; after that the mail says so, and a
// new link can be asked for. kind: "invite" (sign-in details for a new employee), "reset" (a password reset link).
import { load, save, remove } from "../core/storage.js";

const KEY = "mail-outbox";
const links = new Map();   // mail id -> the link, in memory only
const empty = () => ({ version: 1, nextNum: 1, mails: [] });
function read() {
  const box = load(KEY);
  return box && box.version === 1 && Array.isArray(box.mails) && Number.isInteger(box.nextNum) ? box : empty();
}

export function queueMail({ to, userId, kind, subject, body, expiresAt = null, link = null }, now = Date.now()) {
  const box = read();
  const mail = { id: `MAIL-${box.nextNum}`, at: new Date(now).toISOString(), to, userId, kind, subject, body, expiresAt };
  box.mails.push(mail);
  box.nextNum += 1;
  save(KEY, box);
  if (link) links.set(mail.id, link);
  return { ...mail };
}

// Newest first.
export const allMail = () => read().mails.slice().reverse().map((m) => ({ ...m }));
// The link this tab still holds for a mail, or null (another tab, or after a reload).
export const linkOf = (mailId) => links.get(mailId) ?? null;
export function resetMailOutbox() { remove(KEY); links.clear(); }