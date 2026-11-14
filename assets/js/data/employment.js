// data/employment.js
// P2: everyone's joining date and employment type, for the pay and leave rules (data only; no screen reads this yet).
//
// What was found: the user form (E0) already keeps the joining date, the employment type, the PAN and the bank account
// ON THE USER RECORD ("officeos:users": dateOfJoining "12 Jan 2023", employmentType "Full-time" | "Contract" |
// "Intern", pan, bankAccount). That stays the one place they are edited, and a record's own value always wins here.
// Only four of the ten seeded people have a joining date and a type on their record, though, and filling the other six
// in on the records would change today's screens and payslips (a joining date prorates pay and settles absences). So
// their SAMPLE values are kept here, apart from the records, and are used only where a record has none. Nothing is
// saved by this file: saving the field on the profile replaces the sample.
//
//   employmentOf(userId) -> { userId, joiningDate "YYYY-MM-DD" | null, employmentType, kind "intern" | "employee",
//                             from: { joiningDate: "profile" | "sample" | null, employmentType: "profile" | "sample" | "default" } }
//                           null for an unknown person
//   employmentKind(employmentType) -> "intern" | "employee"
//
// The sample (chosen so every leave band and tenure case exists; the salaries on file all start by 1 Apr 2026, so nobody
// joins after that):
//   over 1 year   Sneha Rao (9 Aug 2021), Vikram Singh (2 Dec 2024); and from their own records Aarav Mehta (4 Apr 2019),
//                 Priya Nair (15 Jul 2020), Kabir Shah (2 Nov 2020), Arjun Kapoor (12 Jan 2023)
//   under 1 year  Rohan Gupta (2 Feb 2026: over 1 year from 2 Feb 2027), Meera Joshi (16 Mar 2026: from 16 Mar 2027)
//   interns       Ananya Iyer (5 Jan 2026), Divya Menon (8 Jan 2024; inactive)

import { getUser, joiningDate } from "./store.js";

export const EMPLOYMENT_TYPES = ["Full-time", "Contract", "Intern"];
export const EMPLOYMENT_SAMPLE = Object.freeze({
  "EMP-1017": Object.freeze({ dateOfJoining: "2026-01-05", employmentType: "Intern" }),      // Ananya Iyer
  "EMP-1023": Object.freeze({ dateOfJoining: "2026-03-16", employmentType: "Full-time" }),   // Meera Joshi
  "EMP-1029": Object.freeze({ dateOfJoining: "2021-08-09", employmentType: "Full-time" }),   // Sneha Rao
  "EMP-1042": Object.freeze({ dateOfJoining: "2026-02-02", employmentType: "Full-time" }),   // Rohan Gupta
  "EMP-1061": Object.freeze({ dateOfJoining: "2024-01-08", employmentType: "Intern" }),      // Divya Menon (inactive)
  "EMP-1088": Object.freeze({ dateOfJoining: "2024-12-02", employmentType: "Full-time" }),   // Vikram Singh
});

export const employmentKind = (employmentType) => (typeof employmentType === "string" && employmentType.trim().toLowerCase() === "intern" ? "intern" : "employee");

export function employmentOf(userId) {
  const user = userId ? getUser(userId) : null;
  if (!user) return null;
  const sample = EMPLOYMENT_SAMPLE[user.id] ?? null;
  const own = joiningDate(user.dateOfJoining);
  const ownType = typeof user.employmentType === "string" && user.employmentType.trim() ? user.employmentType.trim() : null;
  const employmentType = ownType ?? sample?.employmentType ?? "Full-time";
  return {
    userId: user.id,
    joiningDate: own ?? sample?.dateOfJoining ?? null,
    employmentType,
    kind: employmentKind(employmentType),
    from: { joiningDate: own ? "profile" : sample ? "sample" : null, employmentType: ownType ? "profile" : sample ? "sample" : "default" },
  };
}