// ui/money.js
// Rupee amounts as the payroll pages show them: "₹83,576" with Indian digit
// grouping, and in words for a payslip ("Eighty-three thousand five hundred
// seventy-six rupees only."). Whole rupees only. No imports, so any page can
// use it without loading anything else.

export const rupees = (n) => `₹${n.toLocaleString("en-IN")}`;

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

// 0-99: "seventy-four" ("" for 0).
const belowHundred = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`);

// 0-999: "five hundred seventy-six" ("" for 0).
const belowThousand = (n) => [Math.floor(n / 100) ? `${ONES[Math.floor(n / 100)]} hundred` : "", belowHundred(n % 100)]
  .filter(Boolean).join(" ");

// A whole amount from 0 up to 999 crore, the Indian way: crore (1,00,00,000),
// lakh (1,00,000), thousand, then the rest. "Zero rupees only." for 0, "One
// rupee only." for 1.
export function rupeesInWords(amount) {
  const n = Math.round(amount);
  const words = [
    [belowThousand(Math.floor(n / 10000000)), "crore"],
    [belowHundred(Math.floor(n / 100000) % 100), "lakh"],
    [belowHundred(Math.floor(n / 1000) % 100), "thousand"],
    [belowThousand(n % 1000), ""],
  ].filter(([count]) => count).map(([count, unit]) => (unit ? `${count} ${unit}` : count)).join(" ") || "zero";
  return `${words[0].toUpperCase()}${words.slice(1)} ${n === 1 ? "rupee" : "rupees"} only.`;
}