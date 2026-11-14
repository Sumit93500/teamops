// usage: node binding.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// P5: the pay and leave rules become binding. ./js is the build.
//   A  payroll runs store the new figures: a snapshot from the start month, frozen on approval; nothing later changes an
//      approved month (rules, templates, declarations, verify, the PF switch, the start month); a month before the start
//      has no snapshot; the old run's rows are the old engine's, as before
//   B  the leave policy binds from its start date: the day before / on / after; days beyond the balance only with the
//      confirm flag (loss-of-pay refusal otherwise, nothing stored); the flat allowance before the start only; approval
//   C  the policy's loss of pay in payroll: which days (the last working days, half days, across a month end), the
//      daily rate, the later of the two start months, a mid-month joiner, the cap
//   D  self-service declarations: draft / submitted / locked, who may do what (four roles + a manager), the cutoff,
//      the audit (who, when, from, to), what applies to pay
//   E  migration: boxes saved before P5 load as before
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } static UTC(...a) { return RealDate.UTC(...a); } };
const setNow = (y, mo, d, h = 11, mi = 0) => { NOW = new RealDate(y, mo - 1, d, h, mi, 0).getTime(); };
setNow(2026, 10, 30, 19);
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };

const S = await import("./js/data/store.js");
const PS = await import("./js/data/payroll-store.js");
const PAY = await import("./js/data/payroll.js");
const L = await import("./js/data/leave-store.js");
const LP = await import("./js/data/leave-policy.js");
const R = await import("./js/data/pay-rules.js");
const ST = await import("./js/data/pay-structure.js");
const E = await import("./js/data/pay-engine.js");
const RUNS = await import("./js/data/pay-runs.js");
const SN = await import("./js/data/pay-snapshots.js");
const SET = await import("./js/data/pay-settings.js");
const P = await import("./js/config/permissions.js");
const RO = await import("./js/config/roles.js");
const HOL = await import("./js/data/holidays.js");
console.log(`TZ=${process.env.TZ ?? "(system)"}`);
let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const AARAV = "EMP-1001", PRIYA = "EMP-1003", KABIR = "EMP-1008", ARJUN = "EMP-1105", SNEHA = "EMP-1029", VIKRAM = "EMP-1088", ROHAN = "EMP-1042";
const PEOPLE = { admin: AARAV, hr: PRIYA, fin: KABIR, emp: ARJUN, manager: SNEHA };
const rawEdit = (key, pick, change) => { const box = JSON.parse(mem.get(`officeos:${key}`)); box.records.filter(pick).forEach(change); mem.set(`officeos:${key}`, j(box)); };

// the seed made at the end of October (records from 1 Oct), its pending items settled, Vikram given a joining date
PS.payrollRun(2026, 10);
rawEdit("leave-requests", (r) => r.status === "pending" && r.type !== "wfh", (r) => { r.status = "cancelled"; });
rawEdit("regularizations", (r) => r.status === "pending", (r) => { r.status = "rejected"; });
S.updateUser(AARAV, VIKRAM, { dateOfJoining: "8 Jan 2024" });

section("A. Payroll runs store the new figures");
setNow(2026, 12, 9);
const oct = RUNS.prepareRunWithSnapshot(KABIR, 2026, 10);
check("A1", "October (before the start month 2026-11) is prepared as it always was: no snapshot", oct.ok && oct.snapshot === null && SN.snapshotMonth("2026-10") === null, oct.error);
const octA = RUNS.approveRunWithSnapshot(AARAV, 2026, 10);
check("A2", "and approved as before: the old run, no snapshot", octA.ok && octA.snapshot === null && PS.storedRun(2026, 10).status === "approved", octA.error);
const nov = RUNS.prepareRunWithSnapshot(KABIR, 2026, 11);
const snap = nov.snapshot;
const arjunLive = E.payFor(ARJUN, 2026, 11);
check("A3", "November (the start month) stores a snapshot: one row per person in the run, each payFor()'s whole month", nov.ok && snap?.status === "prepared" && Object.keys(snap.rows).length === PS.storedRun(2026, 11).rows.length && j(snap.rows[ARJUN]) === j(arjunLive), nov.error);
const row = snap.rows[ARJUN];
check("A4", "a snapshot row holds the components, deductions, employer cost, regime, rulesAsOf, the rule rows and the unverified flag", Array.isArray(row.components) && row.deductions.pf === 3000 && row.employer.total > 0 && row.regime === "new" && row.rulesAsOf === "2026-11-01" && row.rules.includes("pf@all@2026-09-17") && row.unverified === true, j(Object.keys(row)));
check("A5", "the old run's rows are still the old engine's (basic 40%, PF 12% of basic): the old site reads them", PS.storedRun(2026, 11).rows.find((r) => r.userId === ARJUN).deductionLines.pf === Math.round(PS.storedRun(2026, 11).rows.find((r) => r.userId === ARJUN).earnings.basic * 0.12));
check("A6", "while prepared it is not final: payForFinal says prepared", RUNS.payForFinal(ARJUN, 2026, 11).status === "prepared" && RUNS.payForFinal(ARJUN, 2026, 11).final === false);
R.verifyRule(AARAV, "pt@Haryana@2000-01-01");
check("A7", "a rule verified after preparing changes the live figures (the unverified flag): approving is refused, prepare again", RUNS.approveSnapshotProblem(AARAV, 2026, 11) === "The figures have changed since this run was prepared: prepare it again." && !RUNS.approveRunWithSnapshot(AARAV, 2026, 11).ok);
const keep = mem.get("officeos:pay-snapshots"); mem.delete("officeos:pay-snapshots");
check("A7b", "a run prepared without a snapshot (before P5) can't be approved for a new-rules month: prepare it again", RUNS.approveSnapshotProblem(AARAV, 2026, 11) === "This run was prepared before the new rules applied to it: prepare it again.");
mem.set("officeos:pay-snapshots", keep);
const nov2 = RUNS.prepareRunWithSnapshot(KABIR, 2026, 11);
const novA = RUNS.approveRunWithSnapshot(AARAV, 2026, 11);
check("A8", "prepared again and approved: the snapshot is frozen (approved, by whom, when)", nov2.ok && novA.ok && novA.snapshot.status === "approved" && novA.snapshot.approvedBy === AARAV && RUNS.payForFinal(ARJUN, 2026, 11).final === true, novA.error);
const frozen = j(RUNS.payForFinal(ARJUN, 2026, 11).pay), frozenAll = j(SN.snapshotMonth("2026-11"));
// change everything that could move it
R.addRule(AARAV, { key: "pf", effectiveFrom: "2026-11-01", employeeRate: 0.12, employerRate: 0.12, value: { wageCeiling: 40000, epsRate: 0.0833 }, source: "https://example.org/pf" });
R.addRule(AARAV, { key: "tax.cess", effectiveFrom: "2025-04-01", value: { rate: 0.1 }, source: "https://example.org/cess" });
ST.updateTemplateComponent(AARAV, "standard", "basic", 0.4);
ST.declareOldRegime(KABIR, ARJUN, "2026-27", { rentMonthly: 30000, metro: false, investments: 150000, other: 0 });
R.verifyRule(AARAV, "tax.cess@all@2025-04-01");
R.setPfOnFullWages(AARAV, true);
check("A9", "after a new PF row, a new cess row, a template change, a declaration, a verify and the full-wages switch: November is unchanged, to the byte", j(RUNS.payForFinal(ARJUN, 2026, 11).pay) === frozen && j(SN.snapshotMonth("2026-11")) === frozenAll && j(E.payFor(ARJUN, 2026, 11)) === frozen);
check("A10", "...while a live month does change (December, the same person, now on the old regime with basic 40%)", E.payFor(ARJUN, 2026, 12).regime === "old" && E.payFor(ARJUN, 2026, 12).components[0].amount !== JSON.parse(frozen).components[0].amount);
check("A11", "an approved snapshot can't be written again, nor approved twice", SN.writeSnapshot("2026-11", { preparedBy: KABIR, preparedAt: "x", rows: {} }).ok === false && SN.freezeSnapshot("2026-11", AARAV, "x").ok === false && j(SN.snapshotMonth("2026-11")) === frozenAll);
check("A12", "the start month can't move on or before an approved month (2026-11 and 2026-10 refused)", /already approved/.test(SET.setStatutoryFrom(AARAV, "2026-11").error ?? "") && !SET.setStatutoryFrom(AARAV, "2026-10").ok);
const later = SET.setStatutoryFrom(AARAV, "2027-01");
check("A13", "moved later (2027-01): November keeps its frozen new figures (an approved snapshot stays a new-rules month); December is old rules again", later.ok && SET.usesNewRules("2026-11") && !SET.usesNewRules("2026-12") && j(RUNS.payForFinal(ARJUN, 2026, 11).pay) === frozen);
SET.resetPaySettings();
check("A14", "December's year so far starts from November's frozen figures: its projection counts November's frozen gross", (() => { const d = E.payFor(ARJUN, 2026, 12); return d && d.tax.projected >= JSON.parse(frozen).gross; })());
check("A15", "December, not prepared: a draft, not final", RUNS.payForFinal(ARJUN, 2026, 12).status === "draft" && RUNS.payForFinal(ARJUN, 2026, 12).final === false);
check("A16", "a month with no row: null", RUNS.payForFinal("EMP-9999", 2026, 11) === null);
// put the template and switch back for the rest
ST.updateTemplateComponent(AARAV, "standard", "basic", 0.5); R.setPfOnFullWages(AARAV, false); ST.chooseNewRegime(KABIR, ARJUN, "2026-27");

section("B. The leave policy binds");
// the policy starts 2026-12-01 (the default); today is 25 Nov 2026
setNow(2026, 11, 25);
const ask = (who, f, opts) => LP.applyLeaveUnderPolicy(who, { reason: "Trip", duration: "full", ...f }, opts);
const before = ask(ARJUN, { type: "casual", from: "2026-11-30", to: "2026-12-14" });
check("B1", "a request starting the day before the start (30 Nov) is under the flat allowance (12 casual): 11 days with 10 left is refused as before", !before.ok && /^Not enough casual leave/.test(before.error ?? "") && before.code === undefined, before.error);
const onDay = ask(ARJUN, { type: "casual", from: "2026-12-01", to: "2026-12-15" });
check("B2", "starting on the start day (1 Dec) the band's policy applies: 11 days with 10 left needs the confirm: refused with code loss-of-pay, 1 day beyond, nothing stored",
  !onDay.ok && onDay.code === "loss-of-pay" && onDay.lopDays === 1 && onDay.paidDays === 10 && !L.allRequests().some((r) => r.userId === ARJUN && r.from === "2026-12-01"), j([onDay.error, onDay.lopDays]));
const yes = ask(ARJUN, { type: "casual", from: "2026-12-01", to: "2026-12-15" }, { acceptLossOfPay: true });
check("B3", "with the confirm it goes through: under the policy, Over 1 year band, 1 day of loss of pay recorded", yes.ok && yes.record.underPolicy === true && yes.record.lopDays === 1 && yes.record.policyBand === "over1", yes.error);
const truthy = ask(ROHAN, { type: "casual", from: "2026-12-01", to: "2026-12-31" }, { acceptLossOfPay: "yes" });
check("B4", "the confirm must be exactly true (\"yes\" isn't)", !truthy.ok && truthy.code === "loss-of-pay");
const after = ask(ROHAN, { type: "sick", from: "2026-12-02", to: "2026-12-02" });
check("B5", "the day after: within the balance no question, no loss of pay", after.ok && after.record.lopDays === 0 && after.record.underPolicy === true, after.error);
const wfh = ask(ROHAN, { type: "wfh", from: "2026-12-03", to: "2026-12-09" });
check("B6", "work from home is never loss of pay (it keeps its old advisory over 4)", wfh.ok && wfh.record.lopDays === 0 && wfh.advisories.some((a) => a.code === "wfh-limit"), wfh.error);
const unpaid = ask(ROHAN, { type: "unpaid", from: "2026-12-10", to: "2026-12-10" });
check("B7", "unpaid leave goes through as unpaid, no question", unpaid.ok && unpaid.record.lopDays === 0);
// the flat cap is lifted under the policy: Arjun's earned leave (over 10 by then)
const acc = LP.leaveAccount(ARJUN, "2026-12-16").types.earned;
const earned = ask(ARJUN, { type: "earned", from: "2026-12-16", to: "2026-12-31" }, { acceptLossOfPay: true });
check("B8", "the old flat 10 earned days don't apply under the policy: 12 earned days go through, with loss of pay only beyond the policy's usable balance", earned.ok && earned.record.days > 10 && earned.record.lopDays === Math.max(0, earned.record.days - acc.usable), j([earned.error, earned.record?.days, earned.record?.lopDays, acc.usable]));
// approval: the final stage doesn't re-check the flat cap for a policy request
const decide = (id) => { L.decideLeave(id, SNEHA, "emp", "approve"); return L.decideLeave(id, PRIYA, "hr", "approve"); };
const d1 = decide(yes.record.id), d2 = decide(earned.record.id);
check("B9", "approved through the chain; the flat allowance isn't checked again at approval (12 earned days approved)", d1.ok && d2.ok && L.getRequest(earned.record.id).status === "approved", j([d1.error, d2.error]));
check("B10", "the old flat balance still reads as before (approved earned 12 against 10: left -2 on the old pages)", L.balanceFor(ARJUN, 2026, 12).earned.approved === earned.record.days);

section("C. The policy's loss of pay in payroll");
check("C1", "loss-of-pay days are the request's last working days: the casual request's 1 day falls on 15 Dec", LP.lossOfPayDaysIn(ARJUN, 2026, 12) === 1 + earned.record.lopDays && LP.lossOfPayDaysIn(ARJUN, 2026, 11) === 0);
// a half-day request beyond the balance, and one across the month end
const half = ask(PRIYA, { type: "sick", from: "2027-01-04", to: "2027-01-04", duration: "first-half" }, { acceptLossOfPay: true });
check("C2", "a half day within the balance: 0 loss of pay", half.ok && half.record.lopDays === 0, half.error);
setNow(2026, 12, 20);
const ana = "EMP-1017";
const cross = ask(ana, { type: "sick", from: "2026-12-29", to: "2027-01-05" }, { acceptLossOfPay: true });
check("C3", "an intern's sick leave (none for interns) across the month end: the loss-of-pay days are the last ones, in January", cross.ok && cross.record.lopDays > 0, cross.error);
L.decideLeave(cross.record.id, PRIYA, "hr", "approve");
const janDays = LP.lossOfPayDaysIn(ana, 2027, 1), decDays = LP.lossOfPayDaysIn(ana, 2026, 12);
check("C4", "split by month: January carries the last working days; together they are the request's lopDays", janDays + decDays === cross.record.lopDays && janDays > 0, j([decDays, janDays, cross.record.lopDays]));
// the money: Arjun's December
const old = PS.payrollRunFor(ARJUN, 2026, 12), pay = E.payFor(ARJUN, 2026, 12);
const days = LP.lossOfPayDaysIn(ARJUN, 2026, 12);
const amount = PAY.lossOfPayAmount(old.monthlyGross, days, old.workingDays);
check("C5", "December deducts the policy's loss-of-pay days at the engine's rate (monthly gross / working days, rounded): gross = the old row's gross - that", pay.lop.policyDays === days && pay.lop.policyAmount === amount && pay.gross === old.gross - amount && amount === Math.round(88000 * days / old.workingDays), j([days, amount, pay.gross, old.gross, old.workingDays]));
check("C6", "the existing loss of pay is kept beside it (days and amount add up)", pay.lop.days === old.lop.days + days && pay.lop.amount === old.lop.amount + amount);
check("C7", "the old engine's own row is untouched (no policy loss of pay on the old pages)", old.lop.policyDays === undefined && old.gross === 88000 - old.lop.amount);
SET.setStatutoryFrom(AARAV, "2027-01");
check("C8", "the later of the two start months: with the new rules from 2027-01, December deducts no policy loss of pay", E.payFor(ARJUN, 2026, 12).lop.policyDays === undefined && E.policyLossOfPayFrom() === "2027-01");
SET.resetPaySettings();
check("C9", "the defaults: from 2026-12 (the leave policy's month, later than the pay start 2026-11)", E.policyLossOfPayFrom() === "2026-12");
// a mid-month joiner: joins 16 Dec, no casual (the 15th rule), one day of casual is all loss of pay
const hire = S.addUser(AARAV, { name: "Nisha Verma", email: "nisha.verma@northwind.com", department: "ENG", designation: "Software Engineer", role: "emp", dateOfJoining: "16 Dec 2026" });
const nisha = hire.record.id;
PS.setSalary(AARAV, nisha, { gross: 62000, effectiveFrom: "2026-12-01" });
setNow(2026, 12, 17);
const nreq = ask(nisha, { type: "casual", from: "2026-12-18", to: "2026-12-18" }, { acceptLossOfPay: true });
L.decideLeave(nreq.record?.id, PRIYA, "hr", "approve");
const nOld = PS.payrollRunFor(nisha, 2026, 12), nPay = E.payFor(nisha, 2026, 12);
check("C10", "a mid-month joiner: the not-joined days come off as before, and the one policy day on top at the same rate", nreq.ok && nreq.record.lopDays === 1 && nPay.lop.policyDays === 1 && nPay.gross === nOld.gross - Math.round(62000 / nOld.workingDays) && nOld.lop.notJoinedDays > 0, j([nreq.error, nOld.lop, nPay.lop]));
check("C11", "the cap: policy days never take the month past its working days", nPay.lop.days <= nOld.workingDays);

// which days: crafted approved requests for Kabir (an Admin decides nothing here; the records are written as the store keeps them)
const off = HOL.dayOffChecker();
const craft = (id, from, to, lopDays, status = "approved") => rawEdit("leave-requests", () => false, () => {}) || (() => { const box = JSON.parse(mem.get("officeos:leave-requests")); box.records.push({ id, userId: KABIR, type: "casual", from, to, duration: "full", days: 1, reason: "x", status, stage: "done", history: [], underPolicy: true, lopDays }); mem.set("officeos:leave-requests", JSON.stringify(box)); })();
craft("LV-9001", "2026-12-30", "2027-01-03", 2);
const lastDays = ["2027-01-03", "2027-01-02", "2027-01-01", "2026-12-31", "2026-12-30"].filter((d) => !off(d)).slice(0, 2);
check("C12", "the loss-of-pay days are the last WORKING days (weekends and closed holidays skipped): " + lastDays.join(", "), LP.lossOfPayDaysIn(KABIR, 2027, 1) === lastDays.filter((d) => d.startsWith("2027")).length && LP.lossOfPayDaysIn(KABIR, 2026, 12) === lastDays.filter((d) => d.startsWith("2026")).length, j([LP.lossOfPayDaysIn(KABIR, 2026, 12), LP.lossOfPayDaysIn(KABIR, 2027, 1), lastDays]));
craft("LV-9002", "2026-12-07", "2026-12-07", 1, "pending");
check("C13", "a pending request's loss of pay isn't deducted (only approved ones)", LP.lossOfPayDaysIn(KABIR, 2026, 12) === lastDays.filter((d) => d.startsWith("2026")).length);
craft("LV-9003", "2026-12-01", "2026-12-31", 30);
const kOld = PS.payrollRunFor(KABIR, 2026, 12), kPay = E.payFor(KABIR, 2026, 12);
check("C14", "the cap: more policy days than the month has left come off as the days left, no more", kPay.lop.policyDays === kOld.workingDays - kOld.lop.days && kPay.gross >= 0, j([kPay.lop, kOld.workingDays, kOld.lop.days]));

section("D. Self-service declarations");
const TY = "2026-27";
const DECL = { rentMonthly: 25000, metro: true, investments: 100000, other: 0 };
check("D1", "the permissions: declarations:submit-own for everyone, declarations:manage for Finance and the Admin; 91 in all (F1: was 90, attendance:any-office)", j(P.PERMISSIONS.declarations) === j(["submit-own", "manage"]) && P.ALL_PERMISSIONS.length === 91
  && j(Object.values(PEOPLE).map((id) => ["declarations:submit-own", "declarations:manage"].map((p) => RO.hasPermission(S.getUser(id), p)))) === j([[true, true], [true, false], [true, true], [true, false], [true, false]]));
const own = ST.saveOwnDeclaration(VIKRAM, TY, { regime: "old", declaration: DECL });
check("D2", "an employee saves a draft: status draft; it doesn't apply to pay yet (still the new regime)", own.ok && own.record.status === "draft" && ST.regimeOf(VIKRAM, TY) === "new" && own.record.draft.regime === "old", own.error);
const subm = ST.saveOwnDeclaration(VIKRAM, TY, { regime: "old", declaration: DECL }, { submit: true });
check("D3", "submitted: it applies (the old regime, the declaration on file), the draft is gone", subm.ok && subm.record.status === "submitted" && ST.regimeOf(VIKRAM, TY) === "old" && ST.declarationOf(VIKRAM, TY).rentMonthly === 25000 && subm.record.draft === null, subm.error);
check("D4", "the module's checks still apply (a negative rent, a stray field, an unknown regime)", ST.saveOwnDeclaration(VIKRAM, TY, { regime: "old", declaration: { ...DECL, rentMonthly: -1 } }).field === "rentMonthly" && ST.saveOwnDeclaration(VIKRAM, TY, { regime: "old", declaration: { pan: "x" } }).field === "pan" && ST.saveOwnDeclaration(VIKRAM, TY, { regime: "mid" }).field === "regime");
const tries = Object.fromEntries(Object.entries(PEOPLE).map(([k, id]) => [k, ST.verifyDeclaration(id, VIKRAM, TY).ok]));
check("D5", "verify and lock: Finance and the Admin only (HR, the employee, a manager refused); the first to try (Admin) locks it", j(tries) === j({ admin: true, hr: false, fin: false, emp: false, manager: false }) && ST.declarationStatus(VIKRAM, TY).status === "locked", j(tries));
const locked = ST.saveOwnDeclaration(VIKRAM, TY, { regime: "new" }, { submit: true });
check("D6", "locked: the employee can't change it, and is told to ask Finance", !locked.ok && locked.error === "Your declaration is verified and locked. To change it, ask Finance." && ST.regimeOf(VIKRAM, TY) === "old");
check("D7", "Finance can still edit anyone's (salary:edit); it stays locked", ST.chooseNewRegime(KABIR, VIKRAM, TY).ok && ST.regimeOf(VIKRAM, TY) === "new" && ST.declarationStatus(VIKRAM, TY).status === "locked");
check("D8", "unlock (Finance): submitted again; the employee can change it", ST.unlockDeclaration(KABIR, VIKRAM, TY).ok && ST.declarationStatus(VIKRAM, TY).status === "submitted" && ST.saveOwnDeclaration(VIKRAM, TY, { regime: "new" }, { submit: true }).ok);
check("D9", "a manager (Sneha) can't verify or unlock their report's declaration, nor set a cutoff", !ST.verifyDeclaration(SNEHA, ARJUN, TY).ok && !ST.unlockDeclaration(SNEHA, ARJUN, TY).ok && !ST.setDeclarationCutoff(SNEHA, TY, "2027-01-31").ok);
check("D10", "only a submitted declaration can be verified (a draft can't)", ST.saveOwnDeclaration(ROHAN, TY, { regime: "new" }).ok && ST.verifyDeclaration(KABIR, ROHAN, TY).error === "Only a submitted declaration can be verified.");
// the cutoff
const cut = ST.setDeclarationCutoff(KABIR, TY, "2026-12-31");
check("D11", "Finance sets the cutoff: on the day submissions still go, the day after they are closed", cut.ok && ST.declarationCutoff(TY) === "2026-12-31" && ST.saveOwnDeclaration(ROHAN, TY, { regime: "new" }, { submit: true }, "2026-12-31").ok
  && /closed on 2026-12-31/.test(ST.saveOwnDeclaration(ROHAN, TY, { regime: "old", declaration: DECL }, { submit: true }, "2027-01-01").error ?? ""));
check("D12", "after the cutoff Finance can still edit (the module's own path); only Finance or the Admin set the cutoff", ST.declareOldRegime(KABIR, ROHAN, TY, DECL, "2027-01-02").ok && !ST.setDeclarationCutoff(PRIYA, TY, "2027-02-01").ok && !ST.setDeclarationCutoff(ARJUN, TY, "2027-02-01").ok && ST.setDeclarationCutoff(KABIR, TY, "x").field === "date");
const au = ST.payStructureAudit().filter((a) => a.action.startsWith("declaration") || a.action === "regime");
check("D13", "every change is in the audit with who, when, from and to", au.length >= 10 && au.every((a) => a.by && a.on && "from" in a && "to" in a) && au.some((a) => a.action === "declaration-verify" && a.from === "submitted, old regime" && a.to === "locked, old regime"), j(au.slice(0, 2)));
check("D14", "an inactive person can't save", (() => { const users = JSON.parse(mem.get("officeos:users")); users.records.find((u) => u.id === ROHAN).status = "inactive"; mem.set("officeos:users", j(users)); const r = ST.saveOwnDeclaration(ROHAN, TY, { regime: "new" }, { submit: true }, "2026-12-01"); users.records.find((u) => u.id === ROHAN).status = "active"; mem.set("officeos:users", j(users)); return !r.ok; })());

section("E. Migration");
const oldBox = { version: 1, templates: {}, people: {}, regimes: { [ROHAN]: { [TY]: "old" } }, declarations: { [ROHAN]: { [TY]: { ...DECL, declaredOn: "2026-10-01", recordedBy: KABIR } } }, audit: [] };
mem.set("officeos:pay-structures", j(oldBox));
const st = ST.declarationStatus(ROHAN, TY);
check("E1", "a pay-structures box saved before P5 (no statuses, drafts or cutoffs) reads as before: the old regime applies; status none", st.status === "none" && st.applied.regime === "old" && ST.declarationCutoff(TY) === null);
check("E2", "and the employee can submit on it (the new fields are added when written)", ST.saveOwnDeclaration(ROHAN, TY, { regime: "new" }, { submit: true }).ok && ST.regimeOf(ROHAN, TY) === "new");
const oldReq = L.allRequests().find((r) => r.id === "LV-2124");
check("E3", "leave saved before P5 has no policy fields and counts no loss of pay", oldReq.underPolicy === undefined && oldReq.lopDays === undefined && LP.lossOfPayDaysIn(ARJUN, 2026, 5) === 0);
SN.resetPaySnapshots();
check("E4", "no snapshot box: every month reads live (draft), nothing breaks", RUNS.payForFinal(ARJUN, 2026, 11).status === "draft" && SN.approvedSnapshot("2026-11") === null);
mem.set("officeos:pay-snapshots", j({ version: 1, months: "x" }));
check("E5", "a snapshot box of another shape is ignored", SN.snapshotMonth("2026-11") === null);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);