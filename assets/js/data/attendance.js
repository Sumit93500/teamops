// data/attendance.js
// Attendance records. Each entry is one person's punch for one day.
// Everything the dashboards show (present/late/absent counts, "19/22 days")
// should be calculated from this list, not hardcoded per page.

export const ATTENDANCE = [
  // EMP-1105, Arjun Kapoor — the sample "logged-in employee" used across the mockups
  { userId: "EMP-1105", date: "2026-09-14", checkIn: "09:22", checkOut: "18:10", status: "present" },
  { userId: "EMP-1105", date: "2026-09-15", checkIn: "09:10", checkOut: "17:58", status: "present" },
  { userId: "EMP-1105", date: "2026-09-16", checkIn: "09:25", checkOut: "18:05", status: "present" },
  { userId: "EMP-1105", date: "2026-09-17", checkIn: "10:12", checkOut: "18:30", status: "late" },
  { userId: "EMP-1105", date: "2026-09-18", checkIn: "09:18", checkOut: "18:02", status: "present" },

  { userId: "EMP-1042", date: "2026-09-18", checkIn: "09:12", checkOut: null, status: "present" },
  { userId: "EMP-1017", date: "2026-09-18", checkIn: "09:31", checkOut: null, status: "present" },
  { userId: "EMP-1088", date: "2026-09-18", checkIn: "10:24", checkOut: null, status: "late" },
  { userId: "EMP-1023", date: "2026-09-18", checkIn: null,    checkOut: null, status: "on-leave" },
  { userId: "EMP-1061", date: "2026-09-18", checkIn: null,    checkOut: null, status: "absent" },
];

export function attendanceFor(userId) {
  return ATTENDANCE.filter((a) => a.userId === userId);
}

// Company-wide counts for one date, used on the Admin/HR dashboards.
export function attendanceSummary(date) {
  const rows = ATTENDANCE.filter((a) => a.date === date);
  return {
    present: rows.filter((r) => r.status === "present" || r.status === "late").length,
    late:    rows.filter((r) => r.status === "late").length,
    onLeave: rows.filter((r) => r.status === "on-leave").length,
    absent:  rows.filter((r) => r.status === "absent").length,
  };
}