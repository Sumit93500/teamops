// ui/icons.js
// Sidebar icons, keyed by the icon names used in config/nav.js.
// Each value is the "d" attribute of a single stroke-based <path> drawn on a
// 24x24 viewBox. Paths are copied from the hardcoded page SVGs where one exists.

export const ICONS = {
  // Overview
  home:      "M3 11 12 3l9 8M5 10v10h14V10",
  check:     "M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",

  // My work
  clock:     "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2",
  tick:      "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M8 12l3 3 5-6",
  calendar:  "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  doc:       "M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6",
  chat:      "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  laptop:    "M4 5h16v11H4zM2 19h20",

  // People
  users:     "M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-2a4 4 0 0 0-3-3.8M16 3.2a3.5 3.5 0 0 1 0 6.6",
  grid:      "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", // invented, no source icon found
  lock:      "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  tag:       "M3 12V3h9l9 9-9 9z",
  flow:      "M4 4h6v6H4zM14 14h6v6h-6zM7 10v4a3 3 0 0 0 3 3h4", // invented, no source icon found
  swap:      "M7 4 3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7", // invented, no source icon found
  sun:       "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4", // invented, no source icon found
  brief:     "M4 8h16v11H4zM9 8V5h6v3",

  // Finance & operations
  cash:      "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M17 14h1",
  bars:      "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  wallet:    "M3 6h18v12H3zM3 10h18",
  percent:   "M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  box:       "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  arrows:    "M7 20V4M3 8l4-4 4 4M17 4v16M13 16l4 4 4-4", // invented, no source icon found
  truck:     "M2 5h12v11H2zM14 9h4l3 3v4h-7M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4", // invented, no source icon found

  // Communication
  megaphone: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a4 4 0 0 1 0 6",

  // System
  chart:     "M4 20V10M10 20V4M16 20v-7M22 20H2",
  list:      "M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6",
  gear:      "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.3 3h-4l-.3 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.3 2.7h4l.3-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2",
  cloud:     "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6",

  // Fallback for any name not listed above
  default:   "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4", // invented, no source icon found
};
