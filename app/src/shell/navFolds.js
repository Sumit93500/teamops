// SD1: which sidebar groups a person has folded in the expanded sidebar, kept per person in "officeos:nav-groups:<employee id>" (a list of group
// names). The group holding the page you're on is always open, whatever was folded. Storage blocked: the choice holds for the visit.
import { useSyncExternalStore } from "react";

const KEY = (id) => `officeos:nav-groups:${id ?? "anyone"}`;
const memory = new Map();
const listeners = new Set();
let version = 0;
let cache = { id: undefined, version: -1, value: [] };

function read(id) {
  try {
    const v = JSON.parse(localStorage.getItem(KEY(id)) ?? "null");
    if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  } catch { /* blocked or broken: the memory copy */ }
  return memory.get(KEY(id)) ?? [];
}
const snapshot = (id) => {
  if (cache.id !== id || cache.version !== version) cache = { id, version, value: read(id) };
  return cache.value;
};

export function setFolded(id, group, folded) {
  const now = new Set(read(id));
  if (folded) now.add(group); else now.delete(group);
  const list = [...now];
  memory.set(KEY(id), list);
  try { localStorage.setItem(KEY(id), JSON.stringify(list)); } catch { /* kept in memory for the visit */ }
  version += 1;
  listeners.forEach((l) => l());
}

export function useFolded(id) {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => snapshot(id));
}