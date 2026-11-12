// data/places.js
// Small pure helpers for round 14's places (offices, home locations) and a storage box whose reads never write.
//   distanceM(a, b)            metres between two { lat, lng } on the earth's mean sphere (haversine), unrounded
//   coordsProblem(lat, lng)    why a coordinate pair can't be used, or null
//   placeProblem(place)        why a { address, lat, lng } can't be saved, or null
//   cleanPlace(place)          { address (trimmed), lat, lng } as numbers
//   pureBox(key, version, seed, isValid)   { read(), write(box) }: read() gives the saved box, or a fresh seed copy
//                              WITHOUT saving it (a page that only reads adds no key); write() saves

import { save, load } from "../core/storage.js";

const EARTH_M = 6371008.8;   // the mean radius (IUGG), metres
const rad = (deg) => (deg * Math.PI) / 180;

export function distanceM(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

export function coordsProblem(lat, lng) {
  if (!isNum(lat) || !isNum(lng)) return "Latitude and longitude must be numbers.";
  if (lat < -90 || lat > 90) return "Latitude must be between -90 and 90.";
  if (lng < -180 || lng > 180) return "Longitude must be between -180 and 180.";
  return null;
}

export const ADDRESS_MAX = 200;
export function placeProblem(place) {
  if (!place || typeof place !== "object") return "Give the place's address and its latitude and longitude.";
  const address = typeof place.address === "string" ? place.address.trim() : "";
  if (!address) return "Enter the address.";
  if (address.length > ADDRESS_MAX) return `The address can be at most ${ADDRESS_MAX} characters.`;
  return coordsProblem(place.lat, place.lng);
}

export const cleanPlace = (place) => ({ address: place.address.trim(), lat: place.lat, lng: place.lng });

export function pureBox(key, version, seed, isValid) {
  return {
    read() {
      const box = load(key);
      return box && box.version === version && isValid(box) ? box : { version, ...JSON.parse(JSON.stringify(seed())) };
    },
    write: (box) => save(key, box),
  };
}