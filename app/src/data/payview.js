// What the pay screens show for a month (P4a): the existing engine's figures for the months before the "statutory rules
// start month" (data/pay-settings.js), the new engine's (data/pay-engine.js payFor) from it. Nothing is worked out here:
// every figure is the data layer's.
//   slipsFor(userId, today)    payslipsFor() with each month from the start month on carrying the new engine's figures:
//                              engine "new", pay (payFor's whole month), and gross / deductions / net / deductionLines /
//                              regime in the shape the pages already read (deductionLines gains esi and lwf)
//   slipTotals(slips)          gross, pf, esi, pt, lwf, tds, deductions, net over such payslips
//   runRows(year, month)       the month's payroll-run rows, each with its new-engine pay from the start month on
//   showEmployerBox(userId)    who may see the employer contributions: the person themself and anyone with payslips:view
//                              (Finance, Admin), never someone looking at a team member as a manager
import { payslipsFor, payrollRun } from "../../../assets/js/data/payroll-store.js";
import { payFor } from "../../../assets/js/data/pay-engine.js";
import { payForFinal } from "../../../assets/js/data/pay-runs.js";
import { usesNewRules } from "../../../assets/js/data/pay-settings.js";
import { can } from "../../../assets/js/core/rbac.js";
import { getCurrentUserId } from "../../../assets/js/core/auth.js";

const parts = (month) => [Number(month.slice(0, 4)), Number(month.slice(5, 7))];

export function withNewEngine(slip) {
  if (!usesNewRules(slip.month)) return { ...slip, engine: "old" };
  const [y, m] = parts(slip.month);
  // P5: an approved month is its frozen snapshot (final); any other month is live: a draft, not final
  const f = payForFinal(slip.userId, y, m);
  const pay = f?.pay;
  if (!pay) return { ...slip, engine: "old" };
  return {
    ...slip, engine: "new", pay, final: f.final, payStatus: f.status, regime: pay.regime, gross: pay.gross, deductions: pay.deductionsTotal, net: pay.net,
    deductionLines: { pf: pay.deductions.pf, esi: pay.deductions.esi, pt: pay.deductions.pt, lwf: pay.deductions.lwf, tds: pay.deductions.tds },
  };
}
export const slipsFor = (userId, today) => payslipsFor(userId, today).map(withNewEngine);

export const slipTotals = (slips) => slips.reduce((t, s) => ({
  gross: t.gross + s.gross, pf: t.pf + s.deductionLines.pf, esi: t.esi + (s.deductionLines.esi ?? 0), pt: t.pt + s.deductionLines.pt, lwf: t.lwf + (s.deductionLines.lwf ?? 0),
  tds: t.tds + s.deductionLines.tds, deductions: t.deductions + s.deductions, net: t.net + s.net,
}), { gross: 0, pf: 0, esi: 0, pt: 0, lwf: 0, tds: 0, deductions: 0, net: 0 });

export function runRows(year, month) {
  const run = payrollRun(year, month);
  if (!run) return null;
  const key = `${year}-${String(month).padStart(2, "0")}`;
  if (!usesNewRules(key)) return { run, engine: "old", rows: run.rows };
  return { run, engine: "new", rows: run.rows.map((r) => ({ ...r, pay: payFor(r.userId, year, month) })) };
}

export const showEmployerBox = (ownerId) => ownerId === getCurrentUserId() || can("payslips:view");