// F2: the one wording for a list's counter (the app's lists say it the same way).
//   countText(shown, total, noun, { filtered, range })
//     nothing filtered      "11 people" (one: "1 person")
//     a filter or search    "Showing 4 of 11" with the noun after, "Showing 4 of 11 people"
//     a page of a long list (range "1–10", unfiltered)  "Showing 1–10 of 14 people"
//     part of a list, nothing filtered (a capped list)  "Showing 10 of 11 requests"
// A pluralising noun is [one, many], or a string that takes an "s".
export const nounOf = (noun, n) => (Array.isArray(noun) ? (n === 1 ? noun[0] : noun[1]) : n === 1 ? noun : `${noun}s`);

export function countText(shown, total, noun, { filtered = false, range = null } = {}) {
  if (filtered) return `Showing ${shown} of ${total} ${nounOf(noun, total)}`;
  if (range && total > shown) return `Showing ${range} of ${total} ${nounOf(noun, total)}`;
  if (total > shown) return `Showing ${shown} of ${total} ${nounOf(noun, total)}`;   // a capped list: only part shown
  return `${total} ${nounOf(noun, total)}`;
}