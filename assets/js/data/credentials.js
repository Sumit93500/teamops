// data/credentials.js (E1): sign-in accounts. One record per person, never a password or a link token in plain text:
//   "officeos:credentials"  { version: 1, accounts: { "<id>": ACCOUNT }, attempts: { "<email>": { failedCount, lockedUntil } },
//                             used: [tokenHash ...] }
//   ACCOUNT  { salt, hash, algo "PBKDF2-SHA256", iterations, legacy, status "invited" | "active" | "disabled", mustChange,
//              failedCount, lockedUntil (ms | null), tokenHash, tokenExpiry (ms), tokenKind "invite" | "reset", createdBy,
//              updatedAt }
// - Passwords: PBKDF2-SHA256 through WebCrypto, 210,000 iterations, a random 16-byte salt per account; the parameters are
//   stored with the hash. Link tokens: 32 random bytes, stored only as their SHA-256; single use (a used one is remembered
//   by its hash, so it says "already used", not "not valid").
// - The seeded people (data/users.js USERS) sign in with the demo password until their first sign-in, which stores a salted
//   hash of it for them (legacy: the demo password's SHA-256 is all the code holds). Anyone added later has no password until
//   an account is made: a temporary password and a 48-hour set-password link, shown once to whoever made it.
// - First sign-in (temporary password or link): the person must set their own password before anything else (mustChange).
// - Forgot password: the same answer whether or not the email is someone's; if it is, a 60-minute reset link goes to the
//   Mail outbox (data/mail-outbox.js). An Admin or HR (accounts:reset) can issue a reset link or a temporary password for
//   someone else (not an Admin's, unless they are an Admin); an Admin unlocks (accounts:unlock) and disables / enables (accounts:disable).
// - Lockout: 5 failed sign-ins lock the account for 15 minutes; an unknown email is counted the same way, so the answers
//   never tell who has an account. A good sign-in resets the count.
// - Every event goes to the audit trail (data/audit-trail.js), never the secret. Clock: every function takes now (ms).
import { load, save, remove } from "../core/storage.js";
import { getUser, getAllUsers, leavingDate } from "./store.js";
import { executionGrant, recordAdminOverride } from "./it-store.js";   // IT1: request-driven credential steps, and the Admin's override on the trail
import { USERS } from "./users.js";
import { DEMO } from "../config/demo.js";
import { openUnlockRequest } from "./unlock-requests.js";   // F2: a lock opens an unlock request for the Admin
import { officeNow, hhmm } from "./shift-engine.js";   // F2: "Try again after HH:MM" in office time
import { hasPermission } from "../config/roles.js";
import { logEvent } from "./audit-trail.js";
import { queueMail } from "./mail-outbox.js";

const KEY = "credentials";
export const PBKDF2_ITERATIONS = 210000;
export const INVITE_HOURS = 48;
export const RESET_MINUTES = 60;
export const LOCK_AFTER = 5;
export const LOCK_MINUTES = 15;
export const MIN_LENGTH = 10;
// E1b: the seeded people sign in with the demo password only while demo mode is on (config/demo.js); with it off they are
// like anyone added later: no sign-in until an account is made for them.
const SEED_IDS = USERS.map((u) => u.id);
const seeded = (id) => DEMO.mode && SEED_IDS.includes(id);
// No 0 / O / o, 1 / l / I: nothing that reads two ways.
const TEMP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
export const TEMP_LENGTH = 14;
export const COMMON_PASSWORDS = ["password", "password1", "password123", "passw0rd", "123456789", "1234567890", "12345678910", "qwerty123",
  "qwertyuiop", "iloveyou123", "welcome123", "welcome@123", "admin12345", "letmein123", "abc1234567", "1q2w3e4r5t", "zaq12wsxcv",
  "football123", "monkey12345", "sunshine123", "princess123", "northwind123", "officeos123", "changeme123", "india12345",
  "p@ssw0rd123", "password@123", "qwerty@123", "asdfghjkl1", "11111111111"];

export const MESSAGES = {
  invalid: "That email and password don't match. Check them and try again.",
  locked: "Too many attempts. Try again later, or ask your administrator to unlock your account.",   // F2: lockedMessage() says until when
  disabled: "This account can't sign in. Ask an Admin.",
  inactive: "This account can't sign in any more. Ask HR.",
  noAccount: "That email and password don't match. Check them and try again.",
  resetSent: `If an account uses that email, a link to reset its password is on its way. The link works once, for ${RESET_MINUTES} minutes.`,
  tokenInvalid: "This link isn't valid. It may have been copied wrongly. Ask for a new one.",
  tokenExpired: "This link has expired. Ask for a new one.",
  tokenUsed: "This link has already been used. Ask for a new one if you need to.",
};

// ---------- encoding and hashing ----------
const enc = new TextEncoder();
const b64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromB64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
const b64url = (bytes) => b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const random = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));
async function pbkdf2(password, salt, iterations) {
  const key = await globalThis.crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await globalThis.crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return b64(new Uint8Array(bits));
}
async function sha256hex(text) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// Compares in time that doesn't depend on where the first difference is.
function sameText(a, b) {
  const x = String(a), y = String(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return diff === 0;
}
async function passwordFields(password) {
  const salt = random(16);
  return { salt: b64(salt), hash: await pbkdf2(password, salt, PBKDF2_ITERATIONS), algo: "PBKDF2-SHA256", iterations: PBKDF2_ITERATIONS, legacy: false };
}
async function passwordMatches(account, password, userId) {
  if (account?.hash) return sameText(await pbkdf2(password, fromB64(account.salt), account.iterations), account.hash);
  if (seeded(userId) && (!account || account.legacy)) return sameText(await sha256hex(password), await sha256hex(DEMO.password));
  return false;
}

// A temporary password: TEMP_LENGTH characters from TEMP_ALPHABET, with an upper case letter, a lower case letter and a
// digit (rejection sampling, so every character is equally likely).
export function makeTempPassword() {
  for (;;) {
    const out = [];
    while (out.length < TEMP_LENGTH) {
      const [byte] = random(1);
      if (byte < 256 - (256 % TEMP_ALPHABET.length)) out.push(TEMP_ALPHABET[byte % TEMP_ALPHABET.length]);
    }
    const text = out.join("");
    if (/[A-Z]/.test(text) && /[a-z]/.test(text) && /[2-9]/.test(text)) return text;
  }
}
const makeToken = () => b64url(random(32));

// ---------- storage ----------
const empty = () => ({ version: 1, accounts: {}, attempts: {}, used: [] });
function read() {
  const box = load(KEY);
  return box && box.version === 1 && box.accounts && typeof box.accounts === "object" ? { attempts: {}, used: [], ...box } : empty();
}
const write = (box) => save(KEY, box);
const blank = (actorId, now) => ({ salt: null, hash: null, algo: "PBKDF2-SHA256", iterations: PBKDF2_ITERATIONS, legacy: false, status: "active", mustChange: false,
  failedCount: 0, lockedUntil: null, tokenHash: null, tokenExpiry: null, tokenKind: null, createdBy: actorId, updatedAt: new Date(now).toISOString() });
const touch = (account, now) => { account.updatedAt = new Date(now).toISOString(); };
const userByEmail = (email) => {
  const wanted = String(email ?? "").trim().toLowerCase();
  return wanted ? getAllUsers().find((u) => String(u.email ?? "").trim().toLowerCase() === wanted) ?? null : null;
};
const nameOfId = (id) => getUser(id)?.name ?? id;
const minutes = (n) => n * 60 * 1000;

// What the app may show about an account (never a hash or a token):
//   { status: "invited" | "active" | "disabled" | "locked" | "none", mustChange, failedCount, lockedUntil, linkKind,
//     linkExpires, hasPassword, updatedAt }
// "none": someone added before accounts existed, or through the store directly, with no sign-in yet.
export function accountOf(userId, now = Date.now()) {
  const account = read().accounts[userId] ?? null;
  const isSeed = seeded(userId);
  if (!account && !isSeed) return { status: "none", mustChange: false, failedCount: 0, lockedUntil: null, linkKind: null, linkExpires: null, hasPassword: false, updatedAt: null };
  const a = account ?? blank("seed", 0);
  const locked = a.lockedUntil && a.lockedUntil > now;
  return {
    status: a.status === "disabled" ? "disabled" : locked ? "locked" : a.status,
    mustChange: a.mustChange, failedCount: a.failedCount, lockedUntil: locked ? a.lockedUntil : null,
    linkKind: a.tokenHash && a.tokenExpiry > now ? a.tokenKind : null, linkExpires: a.tokenHash && a.tokenExpiry > now ? a.tokenExpiry : null,
    hasPassword: Boolean(a.hash) || (isSeed && !account?.hash), updatedAt: account?.updatedAt ?? null,
  };
}

// ---------- password rules ----------
// The problems with a new password for a person, in plain words ([] when it's fine).
export function passwordProblems(password, user) {
  const pw = String(password ?? "");
  const low = pw.toLowerCase();
  const out = [];
  if (pw.length < MIN_LENGTH) out.push(`Use at least ${MIN_LENGTH} characters.`);
  const email = String(user?.email ?? "").toLowerCase();
  const local = email.split("@")[0];
  const name = String(user?.name ?? "").toLowerCase();
  const names = [email, local, name, name.replace(/\s+/g, ""), String(user?.id ?? "").toLowerCase()].filter((x) => x.length >= 3);
  if (names.some((n) => low === n || low.replace(/[^a-z0-9]/g, "") === n.replace(/[^a-z0-9]/g, ""))) out.push("Don't use your name, email or employee ID.");
  if (COMMON_PASSWORDS.includes(low)) out.push("That's a common password. Choose something harder to guess.");
  return out;
}
// 0-4 and a word: length and variety, with a common or name-like password at 0.
export function passwordStrength(password, user) {
  const pw = String(password ?? "");
  if (!pw) return { score: 0, label: "Too short" };
  if (passwordProblems(pw, user).some((p) => !p.startsWith("Use at least"))) return { score: 0, label: "Too easy to guess" };
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  let score = pw.length >= MIN_LENGTH ? 1 : 0;
  if (pw.length >= MIN_LENGTH && kinds >= 2) score = 2;
  if (pw.length >= 12 && kinds >= 3) score = 3;
  if (pw.length >= 16 && kinds >= 3) score = 4;
  return { score, label: ["Too short", "Weak", "Fair", "Good", "Strong"][score] };
}

// ---------- making an account, and the links ----------
function newLink(account, kind, now) {
  const token = makeToken();
  return sha256hex(token).then((hash) => {
    account.tokenHash = hash;
    account.tokenKind = kind;
    account.tokenExpiry = now + (kind === "invite" ? minutes(INVITE_HOURS * 60) : minutes(RESET_MINUTES));
    return token;
  });
}
const linkFor = (kind, token) => `/pages/auth/${kind === "invite" ? "set-password" : "reset-password"}.html?token=${encodeURIComponent(token)}`;
const fail = (error, code) => ({ ok: false, error, code });

// Sign-in details for someone new: a temporary password and a 48-hour set-password link, returned once (and never stored); status
// invited, mustChange. Refused for someone who already has an active account.
// IT1: only an Admin makes them directly (users:create or accounts:reset, and the Admin role): the documented override, flagged on
// the IT review trail (data/it-store.js). Anyone else (HR) is refused with code "needs-it": the employee form opens a new-account
// request instead (data/it-desk.js newSignIn), which IT prepares, the Admin approves and IT hands over (createAccountForRequest).
export async function createAccount(actorId, userId, now = Date.now()) {
  const actor = getUser(actorId);
  if (!actor || actor.status === "inactive" || !(hasPermission(actor, "users:create") || hasPermission(actor, "accounts:reset"))) return fail("You can't make sign-in details.", "not-allowed");
  if (actor.role !== "admin") return fail("Sign-in details for a new employee are made by IT and approved by an Admin: ask IT.", "needs-it");
  const made = await makeAccount(actorId, userId, now);
  if (made.ok) recordAdminOverride(actorId, userId, "credential-issued", `An Admin made ${nameOfId(userId)}'s sign-in details directly (admin override); the secret was shown once to the Admin.`, now);
  return made;
}

// IT1: the new-account request's hand-over: only the IT person who prepared it, only once the Admin approved it (it-store.js
// executionGrant). Returns the temporary password and the link once, to that IT person; nothing secret is kept.
export async function createAccountForRequest(actorId, requestId, now = Date.now()) {
  const grant = executionGrant(requestId, actorId, ["new-account"], { preparerOnly: true });
  if (!grant.ok) return fail(grant.error, "not-allowed");
  if (!grant.subject) return fail("That employee doesn't exist.", "no-employee");
  return makeAccount(actorId, grant.subject.id, now);
}

async function makeAccount(actorId, userId, now) {
  const user = getUser(userId);
  if (!user) return fail(`No employee with id ${userId}.`, "no-employee");
  const box = read();
  if (box.accounts[userId]?.hash || seeded(userId)) return fail(`${user.name} already has an account. Issue a reset instead.`, "exists");
  const tempPassword = makeTempPassword();
  const account = { ...blank(actorId, now), ...(await passwordFields(tempPassword)), status: "invited", mustChange: true };
  const token = await newLink(account, "invite", now);
  box.accounts[userId] = account;
  write(box);
  const link = linkFor("invite", token);
  const mail = queueMail({ to: user.email, userId, kind: "invite", subject: "Your sign-in details", expiresAt: new Date(account.tokenExpiry).toISOString(), link,
    body: `Welcome to the team. Sign in with the temporary password ${nameOfId(actorId)} gave you, or set your own password with the link. Either way you choose a new password first. The link works once, for ${INVITE_HOURS} hours.` }, now);
  logEvent({ actorId, userId, kind: "account-created", detail: `Sign-in details made; the set-password link expires ${new Date(account.tokenExpiry).toISOString().slice(0, 16).replace("T", " ")} UTC.` }, now);
  return { ok: true, tempPassword, link, mailId: mail.id, expiresAt: account.tokenExpiry };
}

// ---------- signing in ----------
// F2: "Too many attempts. Try again after 10:45, or ask your administrator to unlock your account." (office time). The same words for
// an email nobody has, so the answer never says who has an account.
export const lockedMessage = (until) => `Too many attempts. Try again after ${hhmm(officeNow(until).minutes)}, or ask your administrator to unlock your account.`;
function lockState(box, userId, email, now) {
  const slot = userId ? box.accounts[userId] : box.attempts[email];
  return slot && slot.lockedUntil && slot.lockedUntil > now ? slot.lockedUntil : null;
}
function countFailure(box, userId, email, now) {
  let slot = userId ? box.accounts[userId] : box.attempts[email];
  if (!slot) {
    slot = userId ? blank("seed", now) : { failedCount: 0, lockedUntil: null };
    if (userId) { slot.legacy = true; box.accounts[userId] = slot; } else box.attempts[email] = slot;
  }
  if (slot.lockedUntil && slot.lockedUntil <= now) { slot.lockedUntil = null; slot.failedCount = 0; }
  slot.failedCount += 1;
  let locked = false;
  if (slot.failedCount >= LOCK_AFTER) { slot.lockedUntil = now + minutes(LOCK_MINUTES); slot.failedCount = 0; locked = true; }
  if (userId) touch(slot, now);
  return locked;
}

// { ok: true, userId, mustChange } | { ok: false, code: "invalid" | "locked" | "disabled" | "inactive", error }
export async function signInWithPassword(email, password, now = Date.now()) {
  const key = String(email ?? "").trim().toLowerCase();
  const user = userByEmail(key);
  const box = read();
  const lockedUntil = lockState(box, user?.id ?? null, key, now);
  if (lockedUntil) return fail(lockedMessage(lockedUntil), "locked");
  const account = user ? box.accounts[user.id] ?? null : null;
  const known = user && (account || seeded(user.id));
  const good = known ? await passwordMatches(account, password, user.id) : false;
  if (!good) {
    const locked = countFailure(box, known ? user.id : null, key, now);
    write(box);
    if (locked && known) {
      logEvent({ userId: user.id, kind: "signin-failed", detail: `${LOCK_AFTER} failed sign-ins in a row.` }, now);
      logEvent({ userId: user.id, kind: "locked", detail: `Locked for ${LOCK_MINUTES} minutes.` }, now);
      openUnlockRequest(user.id, now, box.accounts[user.id].lockedUntil, LOCK_AFTER);   // F2: once, at the lock (not per attempt)
    }
    return fail(locked ? lockedMessage(lockState(box, known ? user.id : null, key, now)) : MESSAGES.invalid, locked ? "locked" : "invalid");
  }
  if (account?.status === "disabled") return fail(MESSAGES.disabled, "disabled");
  if (user.status === "inactive") return fail(MESSAGES.inactive, "inactive");
  // the seeded demo password, upgraded to a salted hash on the first good sign-in
  const a = account ?? blank("seed", now);
  if (!a.hash) Object.assign(a, await passwordFields(password));
  a.failedCount = 0;
  a.lockedUntil = null;
  touch(a, now);
  box.accounts[user.id] = a;
  write(box);
  logEvent({ actorId: user.id, userId: user.id, kind: "signin", detail: a.mustChange ? "Signed in with a temporary password." : "Signed in." }, now);
  return { ok: true, userId: user.id, mustChange: a.mustChange };
}

// Whether a signed-in person may stay signed in (false once their sign-in is disabled), and whether they must first set a
// new password.
export const sessionAllowed = (userId) => read().accounts[userId]?.status !== "disabled";
export const mustChangePassword = (userId) => Boolean(read().accounts[userId]?.mustChange);

// ---------- setting a password ----------
async function setPassword(box, userId, password, now) {
  const account = box.accounts[userId] ?? blank("seed", now);
  Object.assign(account, await passwordFields(password), { mustChange: false, failedCount: 0, lockedUntil: null });
  if (account.status !== "disabled") account.status = "active";
  if (account.tokenHash) box.used.push(account.tokenHash);
  account.tokenHash = null; account.tokenExpiry = null; account.tokenKind = null;
  touch(account, now);
  box.accounts[userId] = account;
}

// The first sign-in's new password (signed in with the temporary one): only while mustChange is set.
export async function setFirstPassword(userId, password, now = Date.now()) {
  const user = getUser(userId);
  const box = read();
  if (!user || !box.accounts[userId]?.mustChange) return fail("There's no password to set here.", "not-needed");
  const problems = passwordProblems(password, user);
  if (problems.length) return fail(problems[0], "weak");
  await setPassword(box, userId, password, now);
  write(box);
  logEvent({ actorId: userId, userId, kind: "password-set", detail: "Set their own password at first sign-in." }, now);
  return { ok: true };
}

// My own password, changed while signed in: the current one first.
export async function changeOwnPassword(userId, current, password, now = Date.now()) {
  const user = getUser(userId);
  const box = read();
  if (!user || !(await passwordMatches(box.accounts[userId] ?? null, current, userId))) return fail("Your current password isn't right.", "current");
  const problems = passwordProblems(password, user);
  if (problems.length) return fail(problems[0], "weak");
  if (current === password) return fail("Choose a password you haven't been using.", "same");
  await setPassword(box, userId, password, now);
  write(box);
  logEvent({ actorId: userId, userId, kind: "password-changed", detail: "Changed their own password." }, now);
  return { ok: true };
}

// What a link is: { ok: true, kind, userId, expiresAt } | { ok: false, code: "invalid" | "expired" | "used", error }
export async function checkToken(token, now = Date.now()) {
  if (!token || typeof token !== "string") return fail(MESSAGES.tokenInvalid, "invalid");
  const hash = await sha256hex(token);
  const box = read();
  const entry = Object.entries(box.accounts).find(([, a]) => a.tokenHash && sameText(a.tokenHash, hash));
  if (!entry) return box.used.includes(hash) ? fail(MESSAGES.tokenUsed, "used") : fail(MESSAGES.tokenInvalid, "invalid");
  const [userId, account] = entry;
  if (account.tokenExpiry <= now) return fail(MESSAGES.tokenExpired, "expired");
  if (account.status === "disabled") return fail(MESSAGES.disabled, "disabled");
  return { ok: true, kind: account.tokenKind, userId, expiresAt: account.tokenExpiry };
}

// A link's new password: the link must be valid; it is used up, the temporary password and the lock go with it.
export async function redeemToken(token, password, now = Date.now()) {
  const state = await checkToken(token, now);
  if (!state.ok) return state;
  const user = getUser(state.userId);
  const problems = passwordProblems(password, user);
  if (problems.length) return fail(problems[0], "weak");
  const box = read();
  await setPassword(box, state.userId, password, now);
  write(box);
  logEvent({ actorId: state.userId, userId: state.userId, kind: state.kind === "invite" ? "link-used" : "reset-used", detail: state.kind === "invite" ? "Used the set-password link." : "Used a reset link." }, now);
  logEvent({ actorId: state.userId, userId: state.userId, kind: "password-set", detail: "Set their own password with a link." }, now);
  return { ok: true, userId: state.userId };
}

// ---------- forgot password, and help from an Admin or HR ----------
// The answer is the same whoever asks: { ok: true, message }. A real account (not disabled, still employed) gets a reset
// link in the Mail outbox; any earlier link stops working.
export async function requestReset(email, now = Date.now()) {
  const user = userByEmail(email);
  const box = read();
  const account = user ? box.accounts[user.id] ?? (seeded(user.id) ? { ...blank("seed", now), legacy: true } : null) : null;
  if (user && account && account.status !== "disabled" && user.status !== "inactive") {
    if (account.tokenHash) box.used.push(account.tokenHash);
    const token = await newLink(account, "reset", now);
    touch(account, now);
    box.accounts[user.id] = account;
    write(box);
    queueMail({ to: user.email, userId: user.id, kind: "reset", subject: "Reset your password", expiresAt: new Date(account.tokenExpiry).toISOString(), link: linkFor("reset", token),
      body: `Someone asked to reset the password for this account. If it was you, use the link within ${RESET_MINUTES} minutes; it works once. If it wasn't, you can ignore this.` }, now);
    logEvent({ userId: user.id, kind: "reset-requested", detail: "Asked for a reset link from the sign-in page." }, now);
  }
  return { ok: true, message: MESSAGES.resetSent };
}

const mayHelp = (actor, user, permission) => {
  if (!actor || actor.status === "inactive" || !hasPermission(actor, permission)) return "You can't do that.";
  if (!user) return "That employee doesn't exist.";
  if (actor.id === user.id) return "Use your own sign-in page for your own account.";
  if (user.role === "admin" && actor.role !== "admin") return "Only an Admin can change an Admin's sign-in.";
  return null;
};

// accounts:reset: a reset link (mode "link", 60 minutes) or a new temporary password (mode "temp", must be changed at the
// next sign-in), returned once: { ok, link | tempPassword, expiresAt }.
export async function issueReset(actorId, userId, mode = "link", now = Date.now()) {
  const actor = getUser(actorId), user = getUser(userId);
  const why = mayHelp(actor, user, "accounts:reset");
  if (why) return fail(why, "not-allowed");
  const res = await resetCore(actorId, user, mode, now);
  // IT2: HR no longer holds accounts:reset; an Admin's direct reset is the documented override, flagged on the IT review trail
  if (res.ok && actor.role === "admin") recordAdminOverride(actorId, userId, "credential-issued", `An Admin issued ${nameOfId(userId)} ${mode === "temp" ? "a temporary password" : "a reset link"} directly (admin override); the secret was not kept.`, now);
  return res;
}

// IT1: a reset for a password-reset request, by its IT assignee (approved first when the account holds Admin, HR or Finance), or by
// an Admin through the override. Never for oneself.
export async function resetForRequest(actorId, requestId, mode = "link", now = Date.now(), { override = null } = {}) {
  const grant = executionGrant(requestId, actorId, ["password-reset"], { override });
  if (!grant.ok) return fail(grant.error, "not-allowed");
  if (!grant.subject || grant.subject.id === actorId) return fail("Use your own sign-in page for your own account.", "not-allowed");
  return resetCore(actorId, grant.subject, mode, now);
}

async function resetCore(actorId, user, mode, now) {
  const userId = user.id;
  const box = read();
  // IT1: someone with no sign-in yet gets one only through IT's approved new-account request, never through a reset
  if (!box.accounts[userId] && !seeded(userId)) return fail(`${user.name} has no sign-in yet: IT makes it through a new-account request.`, "none");
  const account = box.accounts[userId] ?? { ...blank("seed", now), legacy: true };
  if (account.status === "disabled") return fail(`${user.name}'s sign-in is disabled. Enable it first.`, "disabled");
  if (account.tokenHash) box.used.push(account.tokenHash);
  account.tokenHash = null; account.tokenExpiry = null; account.tokenKind = null;
  if (mode === "temp") {
    const tempPassword = makeTempPassword();
    Object.assign(account, await passwordFields(tempPassword), { mustChange: true, failedCount: 0, lockedUntil: null });
    touch(account, now);
    box.accounts[userId] = account;
    write(box);
    logEvent({ actorId, userId, kind: "temp-issued", detail: "A new temporary password was issued; it must be changed at the next sign-in." }, now);
    return { ok: true, tempPassword };
  }
  const token = await newLink(account, "reset", now);
  touch(account, now);
  box.accounts[userId] = account;
  write(box);
  const link = linkFor("reset", token);
  queueMail({ to: user.email, userId, kind: "reset", subject: "Reset your password", expiresAt: new Date(account.tokenExpiry).toISOString(), link,
    body: `${nameOfId(actorId)} sent you a link to set a new password. It works once, for ${RESET_MINUTES} minutes.` }, now);
  logEvent({ actorId, userId, kind: "reset-issued", detail: `A reset link was issued; it expires in ${RESET_MINUTES} minutes.` }, now);
  return { ok: true, link, expiresAt: account.tokenExpiry };
}

// accounts:unlock (Admin): unlock now.
export function unlockAccount(actorId, userId, now = Date.now()) {
  const actor = getUser(actorId), user = getUser(userId);
  const why = mayHelp(actor, user, "accounts:unlock");
  if (why) return fail(why, "not-allowed");
  return unlockCore(actorId, user, now);
}

// IT1: an unlock for an account-unlock request, as resetForRequest.
export function unlockForRequest(actorId, requestId, now = Date.now(), { override = null } = {}) {
  const grant = executionGrant(requestId, actorId, ["account-unlock"], { override });
  if (!grant.ok) return fail(grant.error, "not-allowed");
  if (!grant.subject || grant.subject.id === actorId) return fail("Use your own sign-in page for your own account.", "not-allowed");
  return unlockCore(actorId, grant.subject, now);
}

function unlockCore(actorId, user, now) {
  const userId = user.id;
  const box = read();
  const account = box.accounts[userId];
  if (!account || !account.lockedUntil || account.lockedUntil <= now) return fail(`${user.name}'s account isn't locked.`, "not-locked");
  account.lockedUntil = null; account.failedCount = 0;
  touch(account, now);
  write(box);
  logEvent({ actorId, userId, kind: "unlocked", detail: "Unlocked by an Admin." }, now);
  return { ok: true };
}

// accounts:disable (Admin): stop or allow someone's sign-in. The employee record stays as it is; a disabled person's
// session ends at its next check (sessionAllowed).
export function setSignInEnabled(actorId, userId, enabled, now = Date.now()) {
  const actor = getUser(actorId), user = getUser(userId);
  const why = mayHelp(actor, user, "accounts:disable");
  if (why) return fail(why, "not-allowed");
  return enableCore(actorId, user, enabled, now);
}

// IT1: offboarding's "disable sign-in": only once the Admin approved the offboarding, by its IT assignee (or an Admin through the
// override), on or after the person's last working day. Nothing is deleted: the account is disabled, its history stays.
export function disableForRequest(actorId, requestId, now = Date.now(), { override = null } = {}) {
  const grant = executionGrant(requestId, actorId, ["offboarding"], { override });
  if (!grant.ok) return fail(grant.error, "not-allowed");
  const user = grant.subject;
  if (!user || user.id === actorId) return fail("You can't disable your own sign-in.", "not-allowed");
  const lastDay = leavingDate(user);
  if (user.status !== "inactive" || (lastDay && officeNow(now).date < lastDay)) return fail(`${user.name}'s sign-in is disabled on their last working day${lastDay ? `, ${lastDay}` : ""}, not before.`, "too-early");
  return enableCore(actorId, user, false, now);
}

function enableCore(actorId, user, enabled, now) {
  const userId = user.id;
  const box = read();
  const account = box.accounts[userId] ?? (seeded(userId) ? { ...blank("seed", now), legacy: true } : null);
  if (!account) return fail(`${user.name} has no sign-in yet.`, "none");
  if (enabled === (account.status !== "disabled")) return fail(enabled ? `${user.name} can already sign in.` : `${user.name}'s sign-in is already disabled.`, "same");
  account.status = enabled ? (account.mustChange ? "invited" : "active") : "disabled";
  touch(account, now);
  box.accounts[userId] = account;
  write(box);
  logEvent({ actorId, userId, kind: enabled ? "enabled" : "disabled", detail: enabled ? "Sign-in enabled." : "Sign-in disabled; the employee record is unchanged." }, now);
  return { ok: true };
}

export function resetCredentials() { remove(KEY); }