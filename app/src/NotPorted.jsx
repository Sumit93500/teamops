// A page that later rounds port (react-stage-scoping.md section 7). It opens at its old URL behind the same
// guard, so routing and permissions can be checked on every page from round 1.
import Frame from "./ui/Frame.jsx";

export default function NotPorted({ page }) {
  return (
    <Frame page={page}>
      <div className="page-header">
        <div>
          <h1>{page}</h1>
          <p className="page-header__subtitle">This page moves to the new app in a later round.</p>
        </div>
      </div>
    </Frame>
  );
}
