// The design system's line icons (24-unit paths, stroked in currentColor by the old .icon class) and one Icon component.
export const ICON = {
  calendar: "M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3",
  close: "M18 6 6 18M6 6l12 12",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 6v6l4 2",
  progress: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 2v20",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
  building: "M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M2 21h20M8 7h4M8 11h4M8 15h4",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  layers: "M12 2 2 7l10 5 10-5-10-5M2 17l10 5 10-5M2 12l10 5 10-5",
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  map: "M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3M9 3v15M15 6v15",
  table: "M3 5h18v14H3zM3 10h18M3 15h18M9 5v14",
};

export function Icon({ d, className = "" }) {
  return <svg className={`icon${className ? ` ${className}` : ""}`} viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
}