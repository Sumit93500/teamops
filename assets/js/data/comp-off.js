// data/comp-off.js (SH1, 2026-11-15): comp-off days earned from approved overtime. Storage only, so the leave policy
// (data/leave-policy.js) can read it without a cycle. data/overtime-store.js writes it when comp-off is on
// (data/shift-settings.js compOffRule) and a manager approves overtime.
//
// Saved under "officeos:comp-off" as { version, credits: [{ id, userId, days, minutes, earnedOn, expiresOn, from }],
// bank: { <userId>: minutes approved but not yet a whole day }, seq }. A credit is 1 day for every minutesPerDay
// approved; what is left waits in the bank for the next approval. A credit counts in earned leave from earnedOn up to,
// not including, expiresOn; after that it has expired (but still covers earned leave already taken with it).
//
//   compOffFor(userId, date)  -> { active, expired, bank, credits }   creditOvertime(userId, minutes, rule, today, fromId)
//   compOffShield(userId, date, taken, ownDays)  allCompOff()  resetCompOff()

import { remove } from "../core/storage.js";
import { pureBox } from "./places.js";

const KEY = "comp-off";
const store = pureBox(KEY, 1, () => ({ credits: [], bank: {}, seq: 1 }), (b) => Array.isArray(b.credits) && b.bank && typeof b.bank === "object");
const copy = (v) => JSON.parse(JSON.stringify(v));
const plusDays = (iso, k) => new Date(Date.parse(`${iso}T00:00:00Z`) + k * 86400000).toISOString().slice(0, 10);

export function compOffFor(userId, date) {
  const box = store.read();
  const mine = box.credits.filter((c) => c.userId === userId && c.earnedOn <= date);
  const active = mine.filter((c) => date < c.expiresOn).reduce((s, c) => s + c.days, 0);
  const expired = mine.filter((c) => date >= c.expiresOn).reduce((s, c) => s + c.days, 0);
  return { active, expired, bank: box.bank[userId] ?? 0, credits: copy(mine) };
}
// The comp-off days earned leave counts on a date: the active ones, plus expired ones only as far as earned leave
// already taken needed them (an expired day never makes leave already taken unpaid).
export function compOffShield(userId, date, taken, ownDays) {
  const c = compOffFor(userId, date);
  return c.active + Math.min(c.expired, Math.max(0, taken - (ownDays + c.active)));
}
// Approved overtime into the bank, and whole days out of it: [new credits]. rule: { minutesPerDay, expiryDays }.
export function creditOvertime(userId, minutes, rule, today, fromId) {
  const box = store.read();
  let bank = (box.bank[userId] ?? 0) + minutes;
  const made = [];
  while (bank >= rule.minutesPerDay) {
    bank -= rule.minutesPerDay;
    const c = { id: `CO-${box.seq}`, userId, days: 1, minutes: rule.minutesPerDay, earnedOn: today, expiresOn: plusDays(today, rule.expiryDays), from: fromId };
    box.seq += 1;
    box.credits.push(c);
    made.push(c);
  }
  box.bank[userId] = bank;
  return store.write(box) ? { ok: true, credits: made, bank } : { ok: false, error: "Couldn't save. Browser storage may be full or disabled." };
}
export const allCompOff = () => copy(store.read());
export function resetCompOff() {
  remove(KEY);
}