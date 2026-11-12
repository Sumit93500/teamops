// data/company-store.js
// The company's profile (round 14, data only): its name, overview and mission, kept in localStorage under
// "officeos:company-profile" as { version, profile }. Seeded from the sample the app showed before (the Settings page's
// "Northwind Technologies Pvt. Ltd."; overview and mission not added yet). Only an Admin (company:edit) changes it.
// The React app's shared company name (app/src/data/company.js COMPANY.name) reads companyName() from here.
// No screen edits it yet (the page round adds one).
//
//   getCompanyProfile()                          -> { name, overview, mission, updatedAt, updatedBy } (a copy)
//   companyName()                                -> the name
//   updateCompanyProfile(actorUserId, changes)   -> { ok, profile } | { ok: false, error, field }
//   COMPANY_LIMITS                               the length limits the checks use
//   resetCompanyProfile()                        back to the seed (the demo reset)

import { save, load, remove } from "../core/storage.js";
import { getUser } from "./store.js";
import { hasPermission } from "../config/roles.js";

const KEY = "company-profile";
const VERSION = 1;
export const COMPANY_LIMITS = { name: [2, 100], overview: [0, 1000], mission: [0, 300] };
const FIELDS = Object.keys(COMPANY_LIMITS);
const SEED = { name: "Northwind Technologies Pvt. Ltd.", overview: "", mission: "", updatedAt: null, updatedBy: null };

const copy = (value) => JSON.parse(JSON.stringify(value));
const fail = (error, field) => (field ? { ok: false, error, field } : { ok: false, error });

// A read never writes: with nothing saved (or an old or broken copy) it gives the seed, and storage gets a key only
// when an Admin saves a change. So a page that only shows the name adds nothing to storage.
function loadBox() {
  const box = load(KEY);
  const p = box?.profile;
  const valid = box && box.version === VERSION && p && FIELDS.every((f) => typeof p[f] === "string");
  return valid ? box : { version: VERSION, profile: copy(SEED) };
}

export function getCompanyProfile() {
  return copy(loadBox().profile);
}

export const companyName = () => loadBox().profile.name;

// What's wrong with one field's new value, or null. Text is trimmed; the name is one line; overview and mission may have
// line breaks but no other control characters.
function fieldProblem(field, value) {
  const label = { name: "The company name", overview: "The overview", mission: "The mission" }[field];
  if (typeof value !== "string") return `${label} must be text.`;
  const text = value.trim();
  const [min, max] = COMPANY_LIMITS[field];
  if (field === "name" && !text) return "Enter the company name.";
  if (text.length < min) return `${label} must be at least ${min} characters.`;
  if (text.length > max) return `${label} can be at most ${max} characters (it has ${text.length}).`;
  // eslint-disable-next-line no-control-regex
  const bad = field === "name" ? /[\u0000-\u001f\u007f]/ : /[\u0000-\u0009\u000b-\u001f\u007f]/;
  if (bad.test(text)) return `${label} has a character that can't be saved.`;
  return null;
}

// changes: any of { name, overview, mission }; anything else is refused and nothing is saved.
export function updateCompanyProfile(actorUserId, changes = {}) {
  const actor = actorUserId ? getUser(actorUserId) : null;
  if (!actor || actor.status === "inactive" || !hasPermission(actor, "company:edit")) return fail("Only an Admin can change the company profile.");
  const keys = Object.keys(changes ?? {});
  const unknown = keys.find((k) => !FIELDS.includes(k));
  if (unknown) return fail(`"${unknown}" isn't part of the company profile.`, unknown);
  if (!keys.length) return fail("Nothing to change.");
  for (const k of keys) {
    const problem = fieldProblem(k, changes[k]);
    if (problem) return fail(problem, k);
  }
  const box = loadBox();
  keys.forEach((k) => { box.profile[k] = changes[k].trim(); });
  box.profile.updatedAt = new Date().toISOString();
  box.profile.updatedBy = actor.id;
  return save(KEY, box) ? { ok: true, profile: copy(box.profile) } : fail("Couldn't save. Browser storage may be full or disabled.");
}

export function resetCompanyProfile() {
  remove(KEY);
}