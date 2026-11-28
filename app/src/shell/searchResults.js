// SD1: what the top bar's search finds, in three kinds, at most 5 of each:
//   pages     the pages the person may open (the sidebar's items they see, then the pages found by search only: Sidebar.jsx findablePages)
//   people    only people whose profile the person may open (data/employee-record.js profileLinkable: HR and the Admin anyone, a manager their
//             direct reports), with their name and department read through the profile's own field rules (exportReader); never an id
//   requests  the person's own: leave, attendance corrections, expense claims, asset requests (data/own-requests.js) and IT requests,
//             in words with readable dates ("Casual leave, 3–5 Dec 2026"), matched on those words and the kind ("leave", "claim" ...)
import { getAllUsers, getAllDepartments } from "../../../assets/js/data/store.js";
import { exportReader, profileLinkable } from "../../../assets/js/data/employee-record.js";
import { ownRequests } from "../../../assets/js/data/own-requests.js";
import { requestsFor as itRequestsFor } from "../../../assets/js/data/it-desk.js";
import { STATUSES as IT_STATUSES } from "../../../assets/js/data/it-rules.js";
import { CATEGORIES } from "../../../assets/js/data/expenses.js";
import { typeLabel, requestDates, formatDay } from "../../../assets/js/ui/leave-view.js";
import { assetTypeLabel } from "../../../assets/js/ui/inventory-view.js";
import { pageUrl, IT_REQUEST } from "../routes.js";
import { findablePages } from "./Sidebar.jsx";

export const MAX_EACH = 5;
const PROFILE = "users/user-profile.html";
const MY_REQUESTS = "requests/my-requests.html";
const STATUS = { pending: "Pending", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled", paid: "Paid", fulfilled: "Fulfilled", closed: "Closed" };
const has = (text, q) => text.toLowerCase().includes(q);

export function pageResults(q, userId, role) {
  return findablePages(userId, role).filter((p) => has(p.label, q)).slice(0, MAX_EACH)
    .map((p) => ({ kind: "page", label: p.label, meta: p.group, to: pageUrl(p.href) }));
}

export function peopleResults(q, userId) {
  const read = exportReader(userId);
  const deps = getAllDepartments();
  const out = [];
  for (const u of getAllUsers()) {
    if (out.length === MAX_EACH) break;
    if (!profileLinkable(userId, u.id)) continue;
    const v = read(u, ["name", "department"]);
    if (!v?.name) continue;
    const dept = deps.find((d) => d.code === u.department)?.name ?? v.department ?? "";
    if (!has(v.name, q) && !(dept && has(dept, q))) continue;
    out.push({ kind: "person", label: v.name, meta: dept || "Person", to: `${pageUrl(PROFILE)}?id=${encodeURIComponent(u.id)}` });
  }
  return out;
}

// One own request in words: { label, meta, words } (words: what a search may match, the kind's names included)
export function requestWords({ kind, request: r, status }) {
  const s = STATUS[status] ?? STATUS[r.status] ?? status;
  if (kind === "leave") return { label: `${typeLabel(r.type)}, ${requestDates(r)}`, meta: `My leave request, ${s}`, words: "leave request" };
  if (kind === "attendance") return { label: `Attendance correction, ${formatDay(r.date, true)}`, meta: `My request, ${s}`, words: "attendance correction regularization request" };
  if (kind === "expense") return { label: `${CATEGORIES[r.category]?.label ?? "Expense"} claim, ₹${Number(r.amount).toLocaleString("en-IN")}, ${formatDay(r.date, true)}`, meta: `My claim, ${s}`, words: "expense claim request" };
  return { label: `${assetTypeLabel(r.assetType)} request`, meta: `My request, ${s}`, words: "asset request" };
}

export function requestResults(q, userId) {
  const own = ownRequests(userId).map((x) => ({ ...requestWords(x), to: pageUrl(MY_REQUESTS) }));
  const it = itRequestsFor(userId).filter((r) => r.requesterId === userId)
    .map((r) => ({ label: r.title, meta: `My IT request, ${IT_STATUSES[r.status]?.label ?? r.status}`, words: "it request", to: `${pageUrl(IT_REQUEST)}?id=${encodeURIComponent(r.id)}` }));
  return [...own, ...it].filter((x) => has(`${x.label} ${x.meta} ${x.words}`, q)).slice(0, MAX_EACH)
    .map(({ label, meta, to }) => ({ kind: "request", label, meta, to }));
}

export const searchResults = (q, userId, role) => [...pageResults(q, userId, role), ...peopleResults(q, userId), ...requestResults(q, userId)];