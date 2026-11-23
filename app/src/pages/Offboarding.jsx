// Offboarding (IT2): the checklists of the people who are leaving or have left, for IT (it:offboard) and the Admin. Each shows its items
// (who did them and when), what is still with the person (assets, stock, licence seats) and the buttons the desk allows right now, among them
// the Admin's waiver of "return assets" and the flagged override. People who left before offboarding existed are listed with a way to open
// one. Everything is data/it-desk.js; the page draws it. Components: Card, Checklist, RequestActions.
import { useState } from "react";
import { Link } from "react-router-dom";
import { requestsFor, getItRequest, exitsWithoutOffboarding, openOffboarding } from "../../../assets/js/data/it-desk.js";
import { OPEN_STATUSES } from "../../../assets/js/data/it-rules.js";
import { formatDay } from "../../../assets/js/ui/leave-view.js";
import OwnPage from "../ui/OwnPage.jsx";
import { PageHeader, Card } from "../components/Layout.jsx";
import { EmptyState, Tabs } from "../components/Basics.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { pageUrl, IT_OFFBOARDING, IT_REQUEST } from "../routes.js";
import { useToast } from "../ui/Toast.jsx";
import { StatusChip, SecretPanel } from "../ui/it.jsx";
import { RequestActions, Checklist } from "../ui/itActions.jsx";

const TABS = [["open", "Open"], ["done", "Finished"]];

function Content() {
  const { userId } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState(0);
  const [secret, setSecret] = useState(null);
  const d = useData(() => {
    const all = requestsFor(userId, { type: "offboarding" });
    return { all, full: Object.fromEntries(all.map((r) => [r.id, getItRequest(userId, r.id)])), exits: exitsWithoutOffboarding(userId) };
  }, [userId]);
  const open = d.all.filter((r) => OPEN_STATUSES.includes(r.status)), done = d.all.filter((r) => !OPEN_STATUSES.includes(r.status));
  const shown = tab === 0 ? open : done;
  const start = (p) => {
    const r = openOffboarding(userId, p.personId);
    if (!r.ok) { toast(r.error, "danger"); return; }
    bump(); toast(`Offboarding opened for ${p.name}.`, "success");
  };
  return (
    <>
      <PageHeader title="Offboarding" subtitle="Closing someone's access, assets and licences when they leave" />
      <div className="ds-stack">
        {secret && <SecretPanel {...secret} onClose={() => setSecret(null)} />}
        {d.exits.length > 0 && (
          <Card id="exits-card" title="Left with no offboarding" meta={`${d.exits.length} ${d.exits.length === 1 ? "person" : "people"}`}>
            <ul className="it-seats">
              {d.exits.map((p) => (
                <li key={p.personId} data-exit={p.personId}><span>{p.name} <span className="it-sub">{p.lastDay ? `last day ${formatDay(p.lastDay, true)}` : "last day not recorded"}</span></span>
                  <button type="button" className="ds-btn ds-btn--sm" data-action="open-offboarding" onClick={() => start(p)} aria-label={`Open an offboarding for ${p.name}`}>Open offboarding</button></li>
              ))}
            </ul>
          </Card>
        )}
        <Tabs pill active={tab} onChange={setTab} tabs={TABS.map(([k, l], i) => ({ label: l, count: String((i === 0 ? open : done).length) }))} />
        {d.all.length === 0 ? <EmptyState title="No offboardings yet." text="One opens when someone is given a last working day." />
          : shown.length === 0 ? <p className="text-muted" id="offboarding-empty">{tab === 0 ? "No offboarding is open." : "None has finished yet."}</p>
          : shown.map((r) => (
            <Card key={r.id} id={`ob-${r.id}`} title={r.title} meta={<><StatusChip status={r.status} /> <Link to={`${pageUrl(IT_REQUEST)}?id=${r.id}`}>{r.id}</Link></>}>
              <div className="it-two">
                <Checklist request={d.full[r.id]} />
                <RequestActions request={d.full[r.id]} onSecret={setSecret} />
              </div>
              {r.details && <p className="text-muted text-sm">{r.details}</p>}
            </Card>
          ))}
      </div>
    </>
  );
}

export default function Offboarding() {
  const offboard = useCan("it:offboard"), approve = useCan("it:approve");
  return <OwnPage page={IT_OFFBOARDING} title="Offboarding" allowed={offboard || approve}><Content /></OwnPage>;
}