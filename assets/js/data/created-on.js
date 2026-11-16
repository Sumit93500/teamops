// data/created-on.js (F2b, 2026-11-16): the day each person was CREATED in the app, kept apart from the user record.
//   "officeos:created-on"  { version: 1, days: { "<userId>": "YYYY-MM-DD" } }   (office time, IST)
// Written by the user store's add-employee write (store.js) after the record is saved, whatever path made the person (the form, a future import, account creation);
// nothing else writes it. It is a separate key on purpose: the user record's shape is unchanged, so a record read back is
// byte-for-byte what was saved. Seeded people have no entry and never read one (data/employment-period.js joinedOn()).
// A person created before this key existed has none; joinedOn() then asks the audit trail for their "account-created" day.
// Reads never write.
import { load, save } from "../core/storage.js";

const KEY = "created-on";
const OFFSET_MS = 330 * 60000;   // IST, UTC+05:30
const read = () => {
  const box = load(KEY);
  return box && box.version === 1 && box.days && typeof box.days === "object" ? box : { version: 1, days: {} };
};

export const officeDayOf = (ms = Date.now()) => new Date(ms + OFFSET_MS).toISOString().slice(0, 10);

// Remembers the day `userId` was created; the first write wins (an id is never handed out twice).
export function recordCreated(userId, now = Date.now()) {
  if (!userId) return null;
  const box = read();
  if (!box.days[userId]) {
    box.days[userId] = officeDayOf(now);
    save(KEY, box);
  }
  return box.days[userId];
}

export const createdOnOf = (userId) => (userId && read().days[userId]) || null;