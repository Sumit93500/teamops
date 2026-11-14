// data/pay-runs.js
// P5: preparing and approving a payroll month from the statutory rules start month (data/pay-settings.js) stores and
// freezes the new engine's figures. The existing run (data/payroll-store.js prepareRun / approveRun: the old engine's rows,
// which the old site reads) is prepared and approved exactly as before; beside it, a snapshot of payFor() for everyone in
// the run (data/pay-snapshots.js): the components, deductions, employer cost, regime, rulesAsOf, the rule rows used and the
// unverified flag. Approving freezes it: nothing later (a rule row, a template, a declaration, a verify action, the start
// month) changes an approved month. Months before the start month are prepared and approved as they always were, with no
// snapshot.
//
//   prepareRunWithSnapshot(actorUserId, year, month)   -> { ok, record, snapshot } | fail
//   approveSnapshotProblem(actorUserId, year, month)   approveProblem(), plus: from the start month, the snapshot must be
//                                                      there and the live figures still the ones it holds
//   approveRunWithSnapshot(actorUserId, year, month)   -> { ok, record, snapshot } | fail
//   payForFinal(userId, year, month)                   -> { pay, status "approved" | "prepared" | "draft", final } | null:
//                                                      the approved snapshot's figures, else the live ones (not final)

import { prepareRun, approveProblem, approveRun, storedRun } from "./payroll-store.js";
import { payFor } from "./pay-engine.js";
import { usesNewRules } from "./pay-settings.js";
import { snapshotMonth, writeSnapshot, freezeSnapshot, approvedRow } from "./pay-snapshots.js";

const key = (y, m) => `${y}-${String(m).padStart(2, "0")}`;
const fail = (error) => ({ ok: false, error });
const liveRows = (run, y, m) => Object.fromEntries(run.rows.map((r) => [r.userId, payFor(r.userId, y, m)]));
const CHANGED = "The figures have changed since this run was prepared: prepare it again.";

export function prepareRunWithSnapshot(actorUserId, year, month) {
  const y = Number(year), m = Number(month);
  const r = prepareRun(actorUserId, y, m);
  if (!r.ok || !usesNewRules(key(y, m))) return { ...r, snapshot: null };
  const s = writeSnapshot(key(y, m), { preparedBy: actorUserId, preparedAt: r.record.preparedAt, rows: liveRows(r.record, y, m) });
  return s.ok ? { ...r, snapshot: s.record } : fail(s.error);
}

export function approveSnapshotProblem(actorUserId, year, month) {
  const y = Number(year), m = Number(month);
  const base = approveProblem(actorUserId, y, m);
  if (base || !usesNewRules(key(y, m))) return base;
  const snap = snapshotMonth(key(y, m));
  if (!snap) return "This run was prepared before the new rules applied to it: prepare it again.";
  if (JSON.stringify(snap.rows) !== JSON.stringify(liveRows(storedRun(y, m), y, m))) return CHANGED;
  return null;
}

export function approveRunWithSnapshot(actorUserId, year, month) {
  const y = Number(year), m = Number(month);
  const problem = approveSnapshotProblem(actorUserId, y, m);
  if (problem) return fail(problem);
  const r = approveRun(actorUserId, y, m);
  if (!r.ok || !usesNewRules(key(y, m))) return { ...r, snapshot: null };
  const s = freezeSnapshot(key(y, m), actorUserId, r.record.approvedAt);
  return s.ok ? { ...r, snapshot: s.record } : fail(s.error);
}

export function payForFinal(userId, year, month) {
  const y = Number(year), m = Number(month);
  const frozen = approvedRow(userId, key(y, m));
  if (frozen) return { pay: frozen, status: "approved", final: true };
  const pay = payFor(userId, y, m);
  if (!pay) return null;
  return { pay, status: snapshotMonth(key(y, m)) ? "prepared" : "draft", final: false };
}