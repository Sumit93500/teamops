// data/depreciation.js (AS1, 2026-11-22): a fixed asset's depreciation, as pure functions. Nothing here reads storage, people or the clock.
// Amounts go in and come out as rupees with 2 decimals (numbers); inside, every figure is whole paise in BigInt, so nothing drifts however
// large the price (up to ₹10,000 crore) or however long the life.
//
// THE DAY-COUNT RULE. An asset depreciates from its purchase date, the purchase day included. Its life years run from the purchase date to
// the day before each anniversary: year 1 is purchaseDate .. the day before purchaseDate + 1 year (a 29 Feb purchase's anniversary in a
// year with no 29 Feb is 1 Mar). Within a life year its charge is spread evenly over that year's days, counted (365 or 366, never assumed):
// on day d of a D-day year, d/D of the year's charge has been taken. On the purchase day one day's charge is taken; before it, nothing
// (book value = cost). A disposal stops it after the disposal day (the disposal day counts).
//   slm (straight line):        every life year's charge is (cost - salvage) / usefulLifeYears; after the last life year, nothing.
//   wdv (written-down value):   the value at the start of life year k is cost x (1 - rate)^(k-1); that year's charge is that value x rate,
//                               spread over its days; never below salvage. Rate 0 charges nothing; rate 100 takes it all in year 1.
//                               usefulLifeYears is not used by wdv.
// THE ROUNDING RULE. The accumulated depreciation up to a day is worked out exactly and rounded once, to the nearest paisa (half a paisa
// rounds up). Every charge (a life year's, a financial year's, a month's) is the difference of two rounded accumulated figures, so charges
// always add up to the accumulated figure, and over the whole life the yearly charges add up to cost - salvage exactly.
//
//   depreciation(params, asOf, { schedule })   { ok, accumulated, bookValue, annualCharge, fullyDepreciated, fullyDepreciatedOn, endsOn, schedule? }
//   disposalFigures(params, disposalDate, saleValue)   { ok, bookValue, saleValue, gainOrLoss }
//   paramsProblem(params)   null or a sentence      toPaise(value)   null or BigInt      rupees(paise)   a number
// params: { cost, salvage, purchaseDate "YYYY-MM-DD", method "slm" | "wdv", usefulLifeYears (whole, 1-100), wdvRatePercent (0-100,
// 2 decimals; wdv only), disposalDate (optional) }.

export const METHODS = { slm: { label: "Straight line" }, wdv: { label: "Written-down value" } };
export const MAX_RUPEES = 100000000000;   // ₹10,000 crore: the largest price, sale value or cost taken
export const MAX_LIFE = 100;
export const WDV_HORIZON = 100;           // life years a wdv schedule is followed for when it never reaches salvage (rate 0, salvage 0)
export const MIN_DATE = "1990-01-01", MAX_DATE = "2199-12-31";
const DAY = 86400000;

// ---------- numbers ----------
// A money value (a number, or a string like "1234.50") -> whole paise as BigInt, or null: not a number, negative, more than 2 decimals,
// over MAX_RUPEES.
// Read from the number's own shortest decimal text, so a third decimal is never hidden by floating point.
export function toPaise(value) {
  const n = typeof value === "number" ? value : typeof value === "string" && /^\s*\d+(\.\d+)?\s*$/.test(value) ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > MAX_RUPEES) return null;
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(n));
  return m ? BigInt(m[1]) * 100n + BigInt((m[2] ?? "").padEnd(2, "0")) : null;
}
export const rupees = (paise) => Number(paise) / 100;
// The nearest paisa to num/den (both >= 0), half up.
const roundDiv = (num, den) => (2n * num + den) / (2n * den);

// ---------- days ----------
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
export function dayNo(iso) {
  const m = DATE.exec(String(iso ?? ""));
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return new Date(t).toISOString().slice(0, 10) === iso ? t / DAY : null;
}
export const isoOf = (n) => new Date(n * DAY).toISOString().slice(0, 10);
const inBounds = (iso) => dayNo(iso) !== null && iso >= MIN_DATE && iso <= MAX_DATE;
// The day number of the k-th anniversary of the purchase date (k = 0 is the purchase date). Date.UTC rolls 29 Feb into 1 Mar.
const anniversary = (p, k) => Date.UTC(p.y + k, p.m - 1, p.d) / DAY;

// ---------- checks ----------
export function paramsProblem(params) {
  const p = params ?? {};
  const cost = toPaise(p.cost), salvage = toPaise(p.salvage ?? 0);
  if (cost === null) return "Enter the cost in rupees, 0 or more, with at most 2 decimals.";
  if (salvage === null) return "Enter the salvage value in rupees, 0 or more, with at most 2 decimals.";
  if (salvage > cost) return "The salvage value can't be more than the cost.";
  if (!inBounds(p.purchaseDate)) return "Pick a valid purchase date.";
  if (p.disposalDate != null && (!inBounds(p.disposalDate) || p.disposalDate < p.purchaseDate)) return "The disposal date can't be before the purchase date.";
  if (!Object.hasOwn(METHODS, p.method ?? "")) return "Choose straight line or written-down value.";
  if (!Number.isInteger(p.usefulLifeYears) || p.usefulLifeYears < 1 || p.usefulLifeYears > MAX_LIFE) return `Enter the useful life in whole years, 1 to ${MAX_LIFE}.`;
  if (p.method === "wdv" && rateBp(p.wdvRatePercent) === null) return "Enter the written-down value rate, 0 to 100 percent, with at most 2 decimals.";
  return null;
}
// A rate in percent with at most 2 decimals -> basis points (0-10000) as BigInt, or null.
function rateBp(rate) {
  const p = toPaise(rate);   // the same "2 decimals" test
  return p === null || p > 10000n ? null : p;
}

// ---------- the engine ----------
function engine(params) {
  const [y, m, d] = params.purchaseDate.split("-").map(Number);
  const P = { y, m, d, no: dayNo(params.purchaseDate) };
  const cost = toPaise(params.cost), salvage = toPaise(params.salvage ?? 0);
  const dep = cost - salvage;
  const slm = params.method === "slm";
  const L = BigInt(params.usefulLifeYears);
  const R = slm ? 0n : rateBp(params.wdvRatePercent);
  const stop = params.disposalDate != null ? dayNo(params.disposalDate) : null;

  // The life year a day falls in: k (1-based), the year's first day and its length in days.
  function lifeYear(day) {
    let k = Math.max(1, Math.floor((day - P.no) / 365.2425) + 1);
    while (k > 1 && anniversary(P, k - 1) > day) k -= 1;
    while (anniversary(P, k) <= day) k += 1;
    const start = anniversary(P, k - 1);
    return { k, start, days: anniversary(P, k) - start };
  }

  // The accumulated depreciation in paise to the end of `day`, rounded (the rounding rule), ignoring any disposal.
  function accRaw(day) {
    if (day < P.no || dep === 0n) return 0n;
    const { k, start, days } = lifeYear(day);
    const full = BigInt(k - 1), into = BigInt(day - start + 1), D = BigInt(days);
    if (slm) {
      if (full >= L) return dep;
      return roundDiv(dep * (full * D + into), L * D);
    }
    // wdv: value = cost x q^full x (10000 D - R into) / (10000^full x 10000 D), with q = 10000 - R
    const q = 10000n - R;
    const den = 10000n ** full * 10000n * D;
    const value = cost * q ** full * (10000n * D - R * into);
    if (value <= salvage * den) return dep;
    return roundDiv(cost * den - value, den);
  }
  const acc = (day) => accRaw(stop !== null && day > stop ? stop : day);

  // The first day the whole of (cost - salvage) has been taken, or null (not within the horizon).
  function fullOn() {
    if (dep === 0n) return P.no;
    const years = slm ? Number(L) : WDV_HORIZON;
    let k = 1;
    while (k <= years && accRaw(anniversary(P, k) - 1) < dep) k += 1;
    if (k > years) return null;
    let lo = anniversary(P, k - 1), hi = anniversary(P, k) - 1;   // accRaw(hi) == dep
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (accRaw(mid) >= dep) hi = mid; else lo = mid + 1;
    }
    return lo;
  }
  return { P, cost, salvage, dep, acc, accRaw, lifeYear, fullOn, stop, slm, L };
}

// ---------- the answer ----------
export function depreciation(params, asOf, { schedule = false } = {}) {
  const problem = paramsProblem(params);
  if (problem) return { ok: false, error: problem };
  if (!inBounds(asOf)) return { ok: false, error: "Pick a valid date to work it out on." };
  const e = engine(params);
  const day = dayNo(asOf);
  const full = e.fullOn();
  const ends = full !== null && e.stop !== null ? Math.min(full, e.stop) : full ?? e.stop;
  const accumulated = e.acc(day);
  let annual = 0n;
  const over = (full !== null && day > full) || (e.stop !== null && day > e.stop);
  if (day >= e.P.no && !over) {
    const { k } = e.lifeYear(day);
    annual = e.accRaw(anniversary(e.P, k) - 1) - e.accRaw(anniversary(e.P, k - 1) - 1);
  }
  const out = {
    ok: true, asOf, method: params.method,
    cost: rupees(e.cost), salvage: rupees(e.salvage),
    accumulated: rupees(accumulated), bookValue: rupees(e.cost - accumulated), annualCharge: rupees(annual),
    fullyDepreciated: day >= e.P.no && accumulated === e.dep,
    fullyDepreciatedOn: full === null ? null : isoOf(full),
    endsOn: ends === null ? null : isoOf(ends),
  };
  if (schedule) out.schedule = scheduleOf(e, ends);
  return out;
}

// Year by year (life years), financial year by financial year (1 Apr to 31 Mar) and month by month, from the purchase date to the day
// depreciation ends (fully depreciated, or disposed); when it never ends within the horizon (wdv at rate 0, or salvage 0), to the end of the
// last life year followed (usefulLifeYears for slm, WDV_HORIZON for wdv). Every charge is a difference of rounded accumulated figures.
function scheduleOf(e, ends) {
  const last = ends ?? anniversary(e.P, e.slm ? Number(e.L) : WDV_HORIZON) - 1;
  const row = (from, to) => {
    const charge = e.acc(to) - e.acc(from - 1);
    return { from: isoOf(from), to: isoOf(to), opening: rupees(e.cost - e.acc(from - 1)), charge: rupees(charge), closing: rupees(e.cost - e.acc(to)) };
  };
  const years = [];
  for (let k = 1; anniversary(e.P, k - 1) <= last; k += 1) {
    years.push({ year: k, ...row(anniversary(e.P, k - 1), Math.min(anniversary(e.P, k) - 1, last)) });
  }
  const financialYears = [];
  let fy = e.P.m >= 4 ? e.P.y : e.P.y - 1;
  for (; Date.UTC(fy, 3, 1) / DAY <= last; fy += 1) {
    const from = Math.max(Date.UTC(fy, 3, 1) / DAY, e.P.no), to = Math.min(Date.UTC(fy + 1, 2, 31) / DAY, last);
    financialYears.push({ label: `${fy}-${String((fy + 1) % 100).padStart(2, "0")}`, ...row(from, to) });
  }
  const months = [];
  for (let y = e.P.y, m = e.P.m; Date.UTC(y, m - 1, 1) / DAY <= last; m === 12 ? (y += 1, m = 1) : (m += 1)) {
    const from = Math.max(Date.UTC(y, m - 1, 1) / DAY, e.P.no), to = Math.min(Date.UTC(y, m, 0) / DAY, last);
    months.push({ month: `${y}-${String(m).padStart(2, "0")}`, ...row(from, to) });
  }
  return { from: isoOf(e.P.no), to: isoOf(last), years, financialYears, months };
}

// On disposal: the book value at the disposal date (the disposal day's charge taken) and the gain (+) or loss (-) against the sale value
// (none given: 0, a write-off).
export function disposalFigures(params, disposalDate, saleValue = 0) {
  const sale = toPaise(saleValue ?? 0);
  if (sale === null) return { ok: false, error: "Enter the sale value in rupees, 0 or more, with at most 2 decimals." };
  const withDisposal = { ...params, disposalDate };
  const problem = paramsProblem(withDisposal);
  if (problem) return { ok: false, error: problem };
  const e = engine(withDisposal);
  const book = e.cost - e.acc(dayNo(disposalDate));
  return { ok: true, disposalDate, bookValue: rupees(book), saleValue: rupees(sale), gainOrLoss: rupees(sale - book) };
}