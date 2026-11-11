// The page frame. A page that has the shell on the old site (sidebar + topbar) gets the React shell (round 2), with the
// topbar title the old page's HTML gives; the sign-in and error pages are their main content only, as before.
import META from "virtual:page-meta";
import Shell from "../shell/Shell.jsx";

export default function Frame({ page, children }) {
  const meta = META[page];
  if (meta?.shell) return <Shell page={page} title={meta.title} back={meta.back}>{children}</Shell>;
  return (
    <div className="app">
      <div className="main">
        <main className="content" id="main" data-page={page}>{children}</main>
      </div>
    </div>
  );
}
