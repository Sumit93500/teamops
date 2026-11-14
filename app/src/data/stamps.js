// Where each check-in and check-out came from (L3): the place stamps round 14 writes on attendance records
// (data/attendance-store.js stampFields: checkInPlace / checkInDistanceM, checkOutPlace / checkOutDistanceM, flagged,
// flagReasons). The derived days don't carry them, so the attendance pages read them here, from the saved records, in one
// read: stampsBy() -> Map("<userId>|<date>" -> stamp). A record without a stamp (the seed, a check-in before L3) isn't in it.
// Reads only: storage that was never written gives an empty map (nothing is seeded by looking).
import { load } from "../../../assets/js/core/storage.js";

export const PLACE_LABEL = { head: "Head office", branch: "Branch office", homePermanent: "Permanent home", homeTemporary: "Temporary home" };
export const PLACE_ICON = {
  office: "M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M2 21h20M8 7h4M8 11h4M8 15h4",
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
};
export const iconOfPlace = (place) => (place === "homePermanent" || place === "homeTemporary" ? PLACE_ICON.home : PLACE_ICON.office);
export const FLAG_LABEL = {
  "place-changed": "Checked out from a different place",
  "device-changed": "Checked out from a different device",
  "shared-device": "Device also registered to someone else",
};
export const flagText = (reasons) => (reasons ?? []).map((r) => FLAG_LABEL[r] ?? r).join("; ");
// L5: a file's Flagged cell says why, from the store's reason codes: "Yes: checked out from a different place",
// "Yes: shared device", several joined with "; " (a code with no wording here is written as it is; a flag with no
// reason is "Yes"), and "No" otherwise.
export const FLAG_EXPORT = {
  "place-changed": "checked out from a different place",
  "device-changed": "checked out from a different device",
  "shared-device": "shared device",
};
export function flaggedCell(stamp) {
  if (!stamp?.flagged) return "No";
  const why = (stamp.reasons ?? []).map((r) => FLAG_EXPORT[r] ?? r).join("; ");
  return why ? `Yes: ${why}` : "Yes";
}
const metres = (m) => (m == null ? null : `${Number(m).toLocaleString("en-IN")} m`);

export function stampsBy() {
  let records = [];
  try { records = load("attendance")?.records ?? []; } catch { records = []; }
  const map = new Map();
  for (const r of Array.isArray(records) ? records : []) {
    if (!r || !(r.checkInPlace || r.checkOutPlace || r.flagged)) continue;
    map.set(`${r.userId}|${r.date}`, {
      inPlace: r.checkInPlace ?? null, inDistance: metres(r.checkInDistanceM), outPlace: r.checkOutPlace ?? null, outDistance: metres(r.checkOutDistanceM),
      flagged: Boolean(r.flagged), reasons: Array.isArray(r.flagReasons) ? r.flagReasons : [],
    });
  }
  return map;
}
export const stampKey = (userId, date) => `${userId}|${date}`;