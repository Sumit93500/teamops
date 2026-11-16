// F2b: the history pins compare ./js with frozen copies from before F2b. F2b added `// F2b` imports of joinedOn (data/employment-period.js)
// and swapped joiningDate(user.dateOfJoining) for joinedOn(user) at the walkers; this puts the text back, so a pin still sees what it
// always pinned. The new behaviour is pinned by createdon.mjs (and the F2b-changed checks named in DECISIONS.md).
export const unF2b = (s) => String(s)
  .replace(/^import .*\/\/ F2b\r?\n/gm, "")
  .replaceAll("joinedDay", "joinedOn")
  .replaceAll("joinedOn(user)", "joiningDate(user.dateOfJoining)")
  .replace("  const saved = commit(USERS_KEY, box, record);\r\n  if (saved.ok) recordCreated(record.id);   // F2b: the day they were created, kept apart from the record\r\n  return saved;\r\n", "  return commit(USERS_KEY, box, record);\r\n");
