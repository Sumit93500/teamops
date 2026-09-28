// data/collection.js
// A small, reusable list of records kept in localStorage: the same load,
// re-seed, copy and commit steps as data/store.js, written once so each new
// module (holidays, leave, ...) doesn't copy them again.
//
// Saved as { version, nextNum, records } under "officeos:<key>" (core/storage.js
// adds the "officeos:" prefix).
//
// Why the seed can never be changed through here:
//   - seed() is only ever read through copy(), so the saved records share no
//     references with the module's constant seed list.
//   - Every read and write goes through load()/save(), which serialise to and
//     from JSON text, so each call works on a fresh copy.
//   - Reads return deep copies too, so a page that edits the object it was
//     given changes nothing until it calls update().

import { save, load, remove as removeKey } from "../core/storage.js";

export const copy = (value) => JSON.parse(JSON.stringify(value));
// `field` (optional) names the form field the error is about, so a page can show it there.
export const fail = (error, field) => (field ? { ok: false, error, field } : { ok: false, error });

export function createCollection({ key, version, seed, idPrefix }) {
  // The number after the prefix, e.g. "LV-2201" -> 2201. Anything else -> NaN.
  const idNum = (id) => (String(id).startsWith(idPrefix) ? Number(String(id).slice(idPrefix.length)) : NaN);

  // Seeded records may already have ids (e.g. "LV-2201"); ones without get the
  // next free number. nextNum starts past the highest id in the seed.
  function seedBox() {
    const records = copy(seed());
    const used = records.map((r) => idNum(r.id)).filter(Number.isInteger);
    let nextNum = used.length ? Math.max(...used) + 1 : 1;
    records.forEach((r) => {
      if (!Number.isInteger(idNum(r.id))) r.id = `${idPrefix}${nextNum++}`;
    });
    const box = { version, nextNum, records };
    save(key, box);
    return box;
  }

  // A saved copy is used only if it's intact and the current version; anything
  // else (missing, corrupt, old shape) is replaced with a fresh seed.
  function loadBox() {
    const box = load(key);
    const valid = box && box.version === version && Number.isInteger(box.nextNum) && Array.isArray(box.records);
    return valid ? box : seedBox();
  }

  function commit(box, record) {
    return save(key, box)
      ? { ok: true, record: copy(record) }
      : fail("Couldn't save. Browser storage may be full or disabled.");
  }

  // ---------- reads (always deep copies) ----------

  function getAll() {
    return copy(loadBox().records);
  }

  function get(id) {
    const record = loadBox().records.find((r) => r.id === id);
    return record ? copy(record) : null;
  }

  // ---------- writes ----------

  // Checks belong to the module using the collection; this only stores.
  function add(fields = {}) {
    const box = loadBox();
    const { id: _ignored, ...rest } = fields;   // ids are always generated here
    const record = { ...copy(rest), id: `${idPrefix}${box.nextNum}` };
    box.records.push(record);
    box.nextNum += 1;   // only ever goes up, so a removed id is never handed out again
    return commit(box, record);
  }

  function update(id, changes = {}) {
    const box = loadBox();
    const record = box.records.find((r) => r.id === id);
    if (!record) return fail(`No record with id ${id}.`);
    if ("id" in changes && changes.id !== id) return fail("A record's id can't be changed.");
    const { id: _ignored, ...rest } = changes;
    Object.assign(record, copy(rest));
    return commit(box, record);
  }

  function remove(id) {
    const box = loadBox();
    const index = box.records.findIndex((r) => r.id === id);
    if (index === -1) return fail(`No record with id ${id}.`);
    const [removed] = box.records.splice(index, 1);
    return commit(box, removed);
  }

  // Throws away every change; the next read re-seeds.
  function reset() {
    removeKey(key);
  }

  return { getAll, get, add, update, remove, reset };
}