// usage: node bank.mjs   (run through PowerShell with $env:TZ set for the time-zone runs)
// F2: bank and statutory details (config/ifsc-banks.js, the rules in config/employee-fields.js, data/employee-record.js). ./js is
// the build. Clock Mon 16 Nov 2026, 10:00 local.
//   T  the bundled IFSC table: at least 40 banks; the bank from an IFSC's first four letters, nothing for an unknown code
//   A  Aadhaar: 12 digits, not starting 0 or 1, and the last digit checks the others (Verhoeff); spaces allowed
//   P  PAN: 5 letters, 4 digits, a letter, with P (a person) as the 4th letter; typed in lower case, saved in capitals
//   I  IFSC: 4 letters, 0, 6 letters or digits; needed whenever bank details are entered; the bank name fills in from it
//      (not over a name someone typed); unchanged details are never re-judged
//   M  masked: Aadhaar, account and PAN shown as their last 4 to anyone without Show
let NOW = 0;
const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
NOW = new RealDate(2026, 10, 16, 10, 0, 0).getTime();
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const B = await import("./js/config/ifsc-banks.js");
const F = await import("./js/config/employee-fields.js");
const E = await import("./js/data/employee-record.js");
const S = await import("./js/data/store.js");

let passed = 0, failed = 0;
const check = (n, label, cond, detail = "") => { cond ? passed++ : failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${String(n).padEnd(5)} ${label}${detail !== "" ? `  -> ${detail}` : ""}`); };
const section = (t) => console.log(`\n--- ${t} ---`);
const j = JSON.stringify;
const PRIYA = "EMP-1003", KABIR = "EMP-1008", ARJUN = "EMP-1105", SNEHA = "EMP-1029";
// an Aadhaar check digit, worked out here on its own (the standard Verhoeff tables), so a broken table in the app shows
const D = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1], [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]];
const P = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1], [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]];
const INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];
const withCheck = (eleven) => { let c = 0; [...eleven].reverse().forEach((d, i) => { c = D[c][P[(i + 1) % 8][Number(d)]]; }); return eleven + INV[c]; };
const GOOD = withCheck("23412341234");
const BAD = GOOD.slice(0, 11) + String((Number(GOOD[11]) + 1) % 10);
const aadhaar = (v) => F.RULES.aadhaar[0](v), pan = (v) => F.RULES.pan[0](v), ifsc = (v) => F.RULES.ifsc[0](v);
const raw = (userId, key) => { const rec = JSON.parse(mem.get("officeos:employee-records") ?? "{}")?.people?.[userId] ?? {}; return rec[key] ?? S.getUser(userId)?.[key] ?? ""; };

// ---------- T ----------
section("T. The IFSC table");
check("T1", "at least 40 banks, each a 4-letter code with a name", Object.keys(B.IFSC_BANKS).length >= 40 && Object.entries(B.IFSC_BANKS).every(([k, v]) => /^[A-Z]{4}$/.test(k) && v.trim()), String(Object.keys(B.IFSC_BANKS).length));
check("T2", "SBIN0001234 is State Bank of India; hdfc0000001 (lower case) HDFC Bank; ICIC ICICI; UTIB Axis", B.bankFromIfsc("SBIN0001234") === "State Bank of India" && B.bankFromIfsc("hdfc0000001") === "HDFC Bank" && B.bankFromIfsc("ICIC0004321") === "ICICI Bank" && B.bankFromIfsc("UTIB0000123") === "Axis Bank");
check("T3", "an unknown code, a short or empty value: no bank (the person types it)", B.bankFromIfsc("ZZZZ0001234") === null && B.bankFromIfsc("SB") === null && B.bankFromIfsc("") === null && B.bankFromIfsc(null) === null);

// ---------- A ----------
section("A. Aadhaar");
check("A1", "a number whose last digit checks the others passes; with spaces too", aadhaar(GOOD) && aadhaar(`${GOOD.slice(0, 4)} ${GOOD.slice(4, 8)} ${GOOD.slice(8)}`), GOOD);
check("A2", "one digit off (a typing slip) fails, with words that say so", !aadhaar(BAD) && /last digit checks the others/.test(F.RULES.aadhaar[1]), BAD);
check("A3", "11 or 13 digits, a letter, starting 0 or 1: fail", !aadhaar(GOOD.slice(0, 11)) && !aadhaar(GOOD + "1") && !aadhaar(GOOD.slice(0, 11) + "A") && !aadhaar("0" + GOOD.slice(1)) && !aadhaar("1" + GOOD.slice(1)));
check("A4", "two swapped neighbours (the slip the check is built for) fail", !aadhaar(GOOD.slice(0, 5) + GOOD[6] + GOOD[5] + GOOD.slice(7)) || GOOD[5] === GOOD[6]);

// ---------- P ----------
section("P. PAN");
check("P1", "ABCPE1234F passes (P: a person)", pan("ABCPE1234F"));
check("P2", "a company's (C), a firm's (F), a trust's (T) PAN fails: an employee's is a person's", !pan("ABCCE1234F") && !pan("ABCFE1234F") && !pan("ABCTE1234F") && /P as the 4th letter/.test(F.RULES.pan[1]));
check("P3", "wrong shapes fail: too short, digits where letters go, lower case", !pan("ABCPE1234") && !pan("1BCPE1234F") && !pan("ABCPE12345") && !pan("abcpe1234f"));
const p1 = E.saveFields(KABIR, ARJUN, { pan: "bhnpk4321q" });
check("P4", "typed in lower case, saved in capitals", p1.ok && S.getUser(ARJUN).pan === "BHNPK4321Q", j(p1));
const p2 = E.saveFields(KABIR, ARJUN, { pan: "BHNCK4321Q" });
check("P5", "a company's PAN refused at the field; nothing saved", !p2.ok && p2.field === "pan" && S.getUser(ARJUN).pan === "BHNPK4321Q", j(p2));

// ---------- I ----------
section("I. IFSC and the bank details together");
check("I1", "format: 4 letters, 0, then 6 letters or digits", ifsc("SBIN0001234") && ifsc("HDFC0ABC123") && !ifsc("SBIN1001234") && !ifsc("SBI0001234") && !ifsc("SBIN000123"));
const i2 = E.saveFields(KABIR, ARJUN, { branch: "Sector 56, Gurugram" });
check("I2", "bank details without an IFSC are refused at the IFSC (Arjun's account is on file, no IFSC yet)", !i2.ok && i2.field === "ifsc" && /needed whenever bank details/.test(i2.error) && !raw(ARJUN, "branch"), j(i2));
const i3 = E.saveFields(KABIR, ARJUN, { ifsc: "hdfc0001234", branch: "Sector 56, Gurugram" });
check("I3", "with the IFSC: saved; the IFSC in capitals; the bank name filled in from it", i3.ok && raw(ARJUN, "ifsc") === "HDFC0001234" && raw(ARJUN, "bankName") === "HDFC Bank" && raw(ARJUN, "branch") === "Sector 56, Gurugram", j(i3));
E.saveFields(KABIR, ARJUN, { ifsc: "ICIC0004321" });
check("I4", "a new IFSC moves a filled-in bank name to the new bank", raw(ARJUN, "bankName") === "ICICI Bank", raw(ARJUN, "bankName"));
E.saveFields(KABIR, ARJUN, { bankName: "ICICI Bank, Golf Course Road" });
E.saveFields(KABIR, ARJUN, { ifsc: "SBIN0005678" });
check("I5", "a bank name someone typed is never overwritten by the IFSC", raw(ARJUN, "bankName") === "ICICI Bank, Golf Course Road" && raw(ARJUN, "ifsc") === "SBIN0005678");
const i6 = E.saveFields(KABIR, ARJUN, { ifsc: "" });
check("I6", "clearing the IFSC while bank details stay: refused", !i6.ok && i6.field === "ifsc" && raw(ARJUN, "ifsc") === "SBIN0005678", j(i6));
const i7 = E.saveFields(KABIR, SNEHA, { ifsc: "ZZZZ0001234", bankName: "Gurugram Gramin Bank" });
check("I7", "an unknown code: the typed bank name is kept", i7.ok && raw(SNEHA, "bankName") === "Gurugram Gramin Bank", j(i7));
// unchanged bank details aren't re-judged: someone with an account and no IFSC can still have their UAN saved
const before = raw(PRIYA, "ifsc");
const i8 = E.saveFields(KABIR, PRIYA, { uan: "100200300400", bankName: raw(PRIYA, "bankName"), branch: "", accountHolder: "" });
check("I8", "unchanged bank fields sent with another change: no IFSC demanded (an account on file, no IFSC)", i8.ok && before === "" && S.getUser(PRIYA).bankAccount, j(i8));
const i9 = E.requestChange(ARJUN, { branch: "DLF Phase 3" });
check("I9", "the person's own change request follows the same rule (it has an IFSC now: allowed)", i9.ok, j(i9));
const i10 = E.requestChange(PRIYA, { accountHolder: "Priya Nair" });
check("I10", "...and someone with no IFSC asking to add a holder's name is told to enter the IFSC", !i10.ok && i10.field === "ifsc", j(i10));
check("I11", "the help says the details are entered by hand, and branch lookup arrives with the backend", /entered by hand/.test(F.FIELD.bankAccount.hint) && /branch lookup arrives with the backend/.test(F.FIELD.branch.hint));
const len = ["12345678", "123456789", "1234567890123456789"].map((v) => F.RULES.account[0](v));
check("I13", "an account number has 9 to 18 digits: 8 and 19 refused, 9 accepted", j(len) === j([false, true, false]), j(len));
check("I12", "a manager still can't change bank details", !E.saveFields(SNEHA, ARJUN, { ifsc: "SBIN0000001" }).ok);

// ---------- M ----------
section("M. Masked after save");
E.saveFields(PRIYA, ARJUN, { aadhaar: GOOD });
const view = E.profileView(SNEHA === ARJUN ? null : KABIR, ARJUN);
const pv = Object.fromEntries(view.sections.flatMap((s) => s.fields).map((f) => [f.key, f]));
const hv = Object.fromEntries(E.profileView(PRIYA, ARJUN).sections.flatMap((s) => s.fields).map((f) => [f.key, f]));
check("M1", "Finance sees the PAN and account masked to the last 4, not in full", pv.pan.masked && !String(pv.pan.value).includes("BHNPK4") && String(pv.pan.value).endsWith("321Q") && pv.bankAccount.masked, `${pv.pan.value} ${pv.bankAccount.value}`);
check("M2", "HR sees the Aadhaar masked to the last 4", hv.aadhaar.masked && String(hv.aadhaar.value).endsWith(GOOD.slice(-4)) && !String(hv.aadhaar.value).includes(GOOD.slice(0, 8)), String(hv.aadhaar.value));
check("M3", "a bad Aadhaar from HR is refused at the field", (() => { const r = E.saveFields(PRIYA, ARJUN, { aadhaar: BAD }); return !r.ok && r.field === "aadhaar"; })());

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;