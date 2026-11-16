// CV1: the history pins compare ./js with frozen copies from before CV1. CV1 added one `// CV1` import (data/night-fix.js) to data/attendance-store.js
// and, in checkAgainstRecord(), a three-line night-shift judgement (a missed check-out on a night shift's start date is judged by data/night-fix.js;
// every other day falls through to the old rule). This puts the text back, so a pin still sees what it always pinned. The new behaviour is pinned
// by visits.mjs (N1-N15).
export const unCV1 = (s) => String(s)
  .replace(/^import .*\/\/ CV1\r?\n/gm, "")
  .replace(/^  \/\/ CV1: a night shift's check-out is the next morning[^\r\n]*\r?\n  const night = [^\r\n]*\r?\n  if \(night\) [^\r\n]*\r?\n/m, "");
