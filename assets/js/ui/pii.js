// ui/pii.js
// How a bank account and a PAN are shown masked: the last 4 digits of the
// account, the last 5 characters of the PAN. Used by my-profile, user-profile
// and the payslip, so the three can't drift apart. Each returns "" when there's
// nothing on file, and the page decides what to show instead. No imports, so
// any page can use it without loading anything else.

export const maskAccount = (last4) => (last4 ? `•••• •••• ${last4}` : "");

export const maskPan = (pan) => (pan ? `•••••${pan.slice(-5)}` : "");