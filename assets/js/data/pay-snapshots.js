// data/pay-snapshots.js
// P5: the stored figures of payroll months worked out by the new engine. Storage only (no pay rule is worked out here):
// data/pay-runs.js writes a snapshot when a month from the statutory rules start month is prepared and freezes it when
// the month is approved; data/pay-engine.js and the pages read it.
//
// Saved under "officeos:pay-snapshots" as { version, months: { "<YYYY-MM>": { status "prepared" | "approved",
// preparedBy, preparedAt, approvedBy, approvedAt, rows: { "<employee id>": <payFor()'s whole month> } } } }.
// An approved month is never written again by anything (writeSnapshot refuses), so a later rule, template, declaration,
// verify action or start-month change can't alter it. Reads never write.
//
//   snapshotMonth(month)            the month's snapshot, or null
//   approvedSnapshot(month)         the month's snapshot if it is approved, else null
//   approvedRow(userId, month)      one person's approved figures, or null
//   writeSnapshot(month, fields)    store a prepared snapshot (refused once the month is approved)
//   freezeSnapshot(month, by, at)   mark it approved
//   resetPaySnapshots()

import { remove } from "../core/storage.js";
import { pureBox } from "./places.js";

const KEY = "pay-snapshots";
const store = pureBox(KEY, 1, () => ({ months: {} }), (b) => Boolean(b.months) && typeof b.months === "object" && !Array.isArray(b.months));
const copy = (v) => JSON.parse(JSON.stringify(v));

export function snapshotMonth(month) {
  const s = store.read().months[month];
  return s ? copy(s) : null;
}
export function approvedSnapshot(month) {
  const s = snapshotMonth(month);
  return s?.status === "approved" ? s : null;
}
export function approvedRow(userId, month) {
  return approvedSnapshot(month)?.rows?.[userId] ?? null;
}
export function writeSnapshot(month, fields) {
  const box = store.read();
  if (box.months[month]?.status === "approved") return { ok: false, error: `${month} is approved: its figures can't change.` };
  box.months[month] = { status: "prepared", preparedBy: fields.preparedBy, preparedAt: fields.preparedAt, approvedBy: null, approvedAt: null, rows: copy(fields.rows) };
  return store.write(box) ? { ok: true, record: copy(box.months[month]) } : { ok: false, error: "Couldn't save. Browser storage may be full or disabled." };
}
export function freezeSnapshot(month, approvedBy, approvedAt) {
  const box = store.read();
  const s = box.months[month];
  if (!s) return { ok: false, error: `${month} has no prepared figures.` };
  if (s.status === "approved") return { ok: false, error: `${month} is already approved.` };
  Object.assign(s, { status: "approved", approvedBy, approvedAt });
  return store.write(box) ? { ok: true, record: copy(s) } : { ok: false, error: "Couldn't save. Browser storage may be full or disabled." };
}
export function resetPaySnapshots() {
  remove(KEY);
}