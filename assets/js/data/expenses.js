// data/expenses.js
// The expense claim rules, as numbers and pure functions: the categories, the
// amounts that change how a claim is handled, and which approval stages a
// claim goes through. Nothing here reads storage, users or the clock;
// data/expenses-store.js keeps the claims and calls these.
//
// All amounts are whole rupees.

// The figures expenses.html's policy card and approval-workflows.html show.
// The last two are targets the page shows; nothing enforces them.
export const EXPENSE_POLICY = {
  adminAbove: 50000,       // a claim above this also needs an Admin's approval (exactly ₹50,000 doesn't)
  receiptAbove: 500,       // a claim above this should have a receipt
  claimWithinDays: 30,     // a claim must be sent within this many calendar days of the spending
  payWithinWorkingDays: 5, // an approved claim is meant to be paid within this many working days
  processingTargetDays: 3, // the target for the average time from sending a claim to its final approval
};

// The five categories expenses.html shows (its filter and its spend chart).
export const CATEGORIES = {
  travel:   { label: "Travel" },
  meals:    { label: "Meals" },
  fuel:     { label: "Fuel" },
  software: { label: "Software" },
  other:    { label: "Other" },
};
export const CATEGORY_KEYS = Object.keys(CATEGORIES);

// Every approval stage, in the order a claim meets them.
export const STAGES = ["manager", "finance", "admin"];

// The stages a claim of this amount needs, in order: manager and Finance
// always, Admin too above EXPENSE_POLICY.adminAbove.
export function chainFor(amount) {
  return amount > EXPENSE_POLICY.adminAbove ? [...STAGES] : STAGES.slice(0, 2);
}

// The stage of the chain that comes after `after` (null = from the start),
// passing over any stage `isHeld(stage)` says nobody can decide. Returns
// { stage, skipped }: the stage (null if none is left) and the stages passed
// over. Stages are compared by their place in STAGES, so `after` may be a
// stage the chain doesn't list (see firstStage).
export function nextStage(chain, after, isHeld) {
  const from = after === null ? -1 : STAGES.indexOf(after);
  const skipped = [];
  for (const stage of chain.filter((s) => STAGES.indexOf(s) > from)) {
    if (isHeld(stage)) return { stage, skipped };
    skipped.push(stage);
  }
  return { stage: null, skipped };
}

// Where a new claim starts. Like nextStage from the start, except that a claim
// whose every stage is passed over goes to an Admin instead of being approved
// with nobody having looked at it (e.g. Finance's only approver, with no
// manager on file, claiming ₹50,000 or less). stage is null only if nobody
// holds the Admin stage either (above ₹50,000 that is already known: Admin was
// one of the stages passed over).
export function firstStage(chain, isHeld) {
  const { stage, skipped } = nextStage(chain, null, isHeld);
  if (stage !== null) return { stage, skipped };
  return { stage: isHeld("admin") ? "admin" : null, skipped };
}

export const needsReceipt = (amount) => amount > EXPENSE_POLICY.receiptAbove;