// The page frame, as the old pages lay it out: .app > .main > main.content. Round 2 adds the sidebar and
// the topbar around main; until then a page is its main content only, and an empty cell holds the sidebar's
// column (shell.css: .app is a grid of sidebar width + the rest; at phone width one column, where the empty
// cell has no height), so main sits where it does on the old pages. The column is the rail's 64px, as rail.css
// sets it above 820px once the old sidebar is drawn (data-nav-drawn, not set here: phone.css would hide main
// waiting for the phone layout); at 820px and below shell's grid has one column and the width isn't used.
const RAIL = { "--sidebar-width": "64px" };

export default function Frame({ page, children }) {
  return (
    <div className="app" style={RAIL}>
      <div className="app__sidebar-slot" aria-hidden="true" />
      <div className="main">
        <main className="content" id="main" data-page={page}>{children}</main>
      </div>
    </div>
  );
}
