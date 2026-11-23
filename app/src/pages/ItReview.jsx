// The Admin's IT review trail (IT2): every execution, approval, rejection, override, credential issue, disable and response-time change the
// desk recorded (never a secret), newest first, with filters (kind, who did it, who it was about, flag, reviewed or not, the shared date range)
// and a "Reviewed" mark that only another Admin may put on an Admin's own override or break-glass approval. The unreviewed count and the
// break-glass approvals still waiting are also on the Admin dashboard. For it:activity-review (the Admin). Data: data/it-desk.js itActivity.
import { useState } from "react";
import { Link } from "react-router-dom";
import { itActivity, markReviewed, unreviewedCount, breakGlassOpen, soleAdmin } from "../../../assets/js/data/it-desk.js";
import { todayIso, localDateOf } from "../../../assets/js/ui/leave-view.js";
import OwnPage from "../ui/OwnPage.jsx";
import { PageHeader, KpiCard, Card, Pill } from "../components/Layout.jsx";
import { EmptyState, NO_DATA } from "../components/Basics.jsx";
import { DateRange, FilterBar, FilterSelect, FilterSearch } from "../components/Controls.jsx";
import { ICON, Icon } from "../components/icons.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { countText } from "../data/counts.js";
import { bump } from "../data/bus.js";
import { pageUrl, IT_REVIEW, IT_REQUEST } from "../routes.js";
import { useToast } from "../ui/Toast.jsx";
import { nameOf, stampYear } from "../ui/it.jsx";

const NONE = { preset: "", from: "", to: "" };
const KIND_LABEL = { approved: "Approved", rejected: "Rejected", executed: "Carried out", "credential-issued": "Sign-in details issued", disabled: "Sign-in disabled", override: "Override", "sla-changed": "Response times changed" };
const WARN = "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0";

function Content() {
  const { userId } = useSession();
  const toast = useToast();
  const [f, setF] = useState({ kind: "", actor: "", person: "", flag: "", reviewed: "" });
  const [range, setRange] = useState(NONE);
  const [q, setQ] = useState("");
  const d = useData(() => ({ all: itActivity(userId), unreviewed: unreviewedCount(userId), glass: breakGlassOpen(userId), sole: soleAdmin() }), [userId]);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const query = q.trim().toLowerCase();
  const rows = d.all.filter((a) => (!f.kind || a.kind === f.kind) && (!f.actor || a.actorId === f.actor) && (!f.person || a.personId === f.person)
    && (!f.flag || (f.flag === "override" ? a.override : f.flag === "glass" ? a.breakGlass : !a.override && !a.breakGlass))
    && (!f.reviewed || Boolean(a.reviewedBy) === (f.reviewed === "yes"))
    && (!range.preset || (localDateOf(a.at) >= range.from && localDateOf(a.at) <= range.to))
    && (!query || [a.summary, nameOf(a.actorId), nameOf(a.personId), a.requestId ?? ""].join(" ").toLowerCase().includes(query)));
  const active = Boolean(Object.values(f).some(Boolean) || range.preset || query);
  const unique = (key) => [...new Set(d.all.map((a) => a[key]).filter(Boolean))];
  const kinds = unique("kind").map((k) => ({ value: k, label: KIND_LABEL[k] ?? k }));
  const people = (key) => unique(key).map((id) => ({ value: id, label: nameOf(id) })).sort((a, b) => a.label.localeCompare(b.label));
  const review = (a) => {
    const r = markReviewed(userId, a.id);
    if (!r.ok) { toast(r.error, "danger"); return; }
    bump(); toast("Marked as reviewed.", "success");
  };
  return (
    <>
      <PageHeader title="IT review trail" subtitle="What IT and the Admin did with accounts, access and assets" />
      <div className="ds-stack">
        {d.sole && <p className="ds-note ds-note--warning it-banner" id="second-admin-note" role="status"><Icon d={WARN} />You are the only Admin. A request about you or raised by you can only be approved by you, with a written reason (break-glass). Add a second Admin so that someone else can decide, and review these.</p>}
        <div className="ds-grid it-kpis" role="group" aria-label="Key numbers">
          <KpiCard id="kpi-unreviewed" label="Not reviewed yet" value={String(d.unreviewed)} icon={ICON.clock} />
          <KpiCard id="kpi-glass" label="Break-glass waiting" value={String(d.glass.length)} icon={ICON.pulse} />
          <KpiCard id="kpi-all" label="Entries" value={String(d.all.length)} icon={ICON.table} />
        </div>
        <Card id="trail-card" title="Activity" meta={<span id="trail-count">{countText(rows.length, d.all.length, ["entry", "entries"], { filtered: active })}</span>}>
          <div className="ds-stack">
            <div className="as-filters"><FilterBar label="Filter the activity" active={active} onClearAll={() => { setF({ kind: "", actor: "", person: "", flag: "", reviewed: "" }); setRange(NONE); setQ(""); }}>
              <FilterSelect label="What" value={f.kind} onChange={set("kind")} allLabel="Everything" options={kinds} />
              <FilterSelect label="Done by" value={f.actor} onChange={set("actor")} allLabel="Anyone" options={people("actorId")} />
              <FilterSelect label="About" value={f.person} onChange={set("person")} allLabel="Anyone" options={people("personId")} />
              <FilterSelect label="Flag" value={f.flag} onChange={set("flag")} allLabel="Any" options={[{ value: "override", label: "Admin override" }, { value: "glass", label: "Break-glass" }, { value: "plain", label: "Neither" }]} />
              <FilterSelect label="Reviewed" value={f.reviewed} onChange={set("reviewed")} allLabel="Both" options={[{ value: "no", label: "Not reviewed" }, { value: "yes", label: "Reviewed" }]} />
              <DateRange value={range} onChange={setRange} today={todayIso()} label="Happened in" />
              <FilterSearch label="Search" value={q} onChange={setQ} placeholder="Words, person or request" />
            </FilterBar></div>
            {d.all.length === 0 ? <EmptyState title="Nothing recorded yet." text="Approvals, overrides and executions appear here." />
              : rows.length === 0 ? <p className="text-muted" id="trail-empty">{range.preset ? NO_DATA : "No entries match these filters."}</p> : (
                <ul className="it-feed" id="trail-list">
                  {rows.map((a) => {
                    const own = a.actorId === userId && (a.override || a.breakGlass);
                    return (
                      <li key={a.id} className={`it-feed__item${a.breakGlass ? " it-glass" : ""}`} data-activity={a.id} data-break-glass={a.breakGlass ? "" : undefined}>
                        <div>
                          <strong>{a.summary}</strong>
                          <span className="it-sub">{KIND_LABEL[a.kind] ?? a.kind}, by {nameOf(a.actorId)}{a.personId ? `, about ${nameOf(a.personId)}` : ""}, {stampYear(a.at)}{a.requestId ? <>, <Link to={`${pageUrl(IT_REQUEST)}?id=${a.requestId}`}>{a.requestId}</Link></> : null}</span>
                          <div className="it-feed__chips">
                            {a.breakGlass && <Pill tone="danger" icon={WARN}>Break-glass</Pill>}
                            {a.override && <Pill tone="warning" icon={WARN}>Admin override</Pill>}
                            {a.reviewedBy ? <Pill tone="success" icon="m5 12 5 5 9-10">Reviewed by {nameOf(a.reviewedBy)}, {stampYear(a.reviewedAt)}</Pill> : <Pill>Not reviewed</Pill>}
                          </div>
                        </div>
                        {!a.reviewedBy && (
                          <div>
                            <button type="button" className="ds-btn ds-btn--sm" data-action="review" disabled={own} aria-describedby={own ? `why-${a.id}` : undefined} onClick={() => review(a)}>Mark reviewed</button>
                            {own && <span className="it-why" id={`why-${a.id}`}>Another Admin reviews your own.</span>}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
          </div>
        </Card>
      </div>
    </>
  );
}

export default function ItReview() {
  const allowed = useCan("it:activity-review");
  return <OwnPage page={IT_REVIEW} title="IT review trail" allowed={allowed}><Content /></OwnPage>;
}