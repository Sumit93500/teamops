// F2: what a placeholder page's URL shows (shell/placeholders.js): one neutral page, the page's own title, and the way back.
import { Link } from "react-router-dom";
import Frame from "../ui/Frame.jsx";
import { useSession } from "../data/hooks.js";
import { pageUrl } from "../routes.js";
import { Icon } from "../components/icons.jsx";
import "../design/rebuild.css";

const TOOLS = "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z";

export default function Rebuilding({ page }) {
  const { role } = useSession();
  return (
    <Frame page={page}>
      <section className="rebuilding" aria-labelledby="rebuilding-title">
        <span className="rebuilding__icon" aria-hidden="true"><Icon d={TOOLS} /></span>
        <h1 className="rebuilding__title" id="rebuilding-title">This section is being rebuilt.</h1>
        <p className="rebuilding__text">Please check back soon. Everything else works as usual.</p>
        <Link className="ds-btn ds-btn--primary" to={pageUrl(role?.landing ?? "dashboard/employee.html")} id="rebuilding-back">Back to dashboard</Link>
      </section>
    </Frame>
  );
}