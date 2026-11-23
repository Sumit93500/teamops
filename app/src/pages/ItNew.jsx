// Raise an IT request (IT2): one form for every type a person can raise. The desk checks everything (data/it-desk.js createRequest and
// openOffboarding) and its words are shown at the field they name; the priority shows the due time the desk's response times give it.
// A new-account request is not raised here: it opens when HR adds the employee (IT then prepares it on the request's page). A manager
// raises for their direct reports; IT and HR (users:edit) for anyone still working here.
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createRequest, openOffboarding, slaHours } from "../../../assets/js/data/it-desk.js";
import { dueAtFor, PRIORITIES, TITLE_MAX, DETAILS_MAX } from "../../../assets/js/data/it-rules.js";
import { ROLES, ROLE_KEYS, OVERRIDABLE } from "../../../assets/js/config/roles.js";
import { ASSET_CATEGORIES } from "../../../assets/js/data/asset-rules.js";
import { directReportsOf } from "../../../assets/js/data/reporting.js";
import { listAssets } from "../../../assets/js/data/asset-register.js";
import OwnPage from "../ui/OwnPage.jsx";
import { PageHeader, Card } from "../components/Layout.jsx";
import { Field, Input, Select, TextArea } from "../components/Form.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { pageUrl, IT_NEW, IT_REQUEST, IT_MINE } from "../routes.js";
import { useToast } from "../ui/Toast.jsx";
import { typeLabel, nameOf, stamp, activePeople, PRIORITY_LABEL } from "../ui/it.jsx";

const TYPE_HELP = {
  "password-reset": "IT sends a reset link or a temporary password. For an Admin, HR or Finance account an Admin approves it first.",
  "account-unlock": "Unlocks an account that was locked after too many wrong passwords.",
  "access-request": "Ask for one permission or one role. An Admin approves it; IT never changes access itself.",
  "asset-request": "Say what you need. Access cards are stock items, not assets: ask IT for one in your ticket.",
  "asset-return": "Hand back an asset you hold. IT takes it in and records its condition.",
  "software-request": "Ask for a seat on a licence IT keeps.",
  "it-issue": "Anything else: a broken device, no network, a printer. Say what is wrong.",
  offboarding: "Open the checklist for someone who is leaving: sign-in, assets, licences and access. An Admin approves it.",
  "new-account": "A new-account request opens by itself when HR adds an employee. IT prepares it on the request's page and an Admin approves it.",
};
const PERSONAL = ["password-reset", "account-unlock", "access-request", "asset-request", "asset-return", "software-request"];
const permWords = (p) => { const [m, a] = p.split(":"); return `${m.charAt(0).toUpperCase()}${m.slice(1)}: ${a.replace(/-/g, " ")}`; };
const EMPTY = { type: "password-reset", subject: "", title: "", details: "", priority: "normal", accessKind: "permission", permission: "", role: "", category: "", assetTag: "", software: "" };

function Form() {
  const { userId, user } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const deactivate = useCan("users:deactivate"), offboard = useCan("it:offboard"), handle = useCan("it:requests-handle"), editUsers = useCan("users:edit");
  const canOffboard = deactivate || offboard, canForAnyone = handle || editUsers;
  const canCreateUsers = useCan("users:create");
  const pre = params.get("type");
  const [f, setF] = useState({ ...EMPTY, type: pre && pre in TYPE_HELP ? pre : EMPTY.type });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState(null);
  const d = useData(() => ({ people: activePeople(), reports: directReportsOf(userId), sla: slaHours() }), [userId]);
  const types = Object.keys(TYPE_HELP).filter((t) => t !== "offboarding" || canOffboard);
  const subjectId = f.subject || userId;
  const subjects = canForAnyone ? d.people : [user, ...d.reports.filter((u) => u.status !== "inactive")].filter(Boolean);
  const held = useData(() => listAssets(userId).filter((a) => a.holderId === subjectId || (a.heldByYou && subjectId === userId)), [userId, subjectId]);
  // the title follows the type and person until it has been typed in
  useEffect(() => {
    if (touched) return;
    const who = nameOf(subjectId);
    const auto = { "password-reset": `Reset password for ${who}`, "account-unlock": `Unlock ${who}'s account`, "access-request": `Access for ${who}`, "asset-request": "Asset request", "asset-return": f.assetTag ? `Return ${f.assetTag}` : "Return an asset",
      "software-request": f.software ? `Software: ${f.software}` : "Software request", "it-issue": "", offboarding: `Offboarding: ${who}` }[f.type] ?? "";
    setF((s) => (s.title === auto ? s : { ...s, title: auto }));
  }, [f.type, subjectId, f.assetTag, f.software, touched]);   // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => { const v = e.target.value; setF((s) => ({ ...s, [k]: v, ...(k === "type" ? { assetTag: "", permission: "", role: "", category: "", software: "" } : {}) })); if (k === "title") setTouched(true); if (k === "type") setTouched(false); setError(null); };
  const fe = (n) => (error?.field === n ? error.text : null);
  const due = dueAtFor(new Date().toISOString(), f.priority, d.sla);

  const submit = (e) => {
    e.preventDefault();
    if (f.type === "new-account") return;
    let r;
    if (f.type === "offboarding") r = openOffboarding(userId, f.subject);
    else {
      const payload = f.type === "access-request" ? (f.accessKind === "role" ? { role: f.role } : { permission: f.permission }) : f.type === "asset-request" ? { category: f.category }
        : f.type === "asset-return" ? { assetTag: f.assetTag } : f.type === "software-request" ? { software: f.software } : {};
      r = createRequest(userId, { type: f.type, subjectPersonId: PERSONAL.includes(f.type) ? subjectId : undefined, title: f.title, details: f.details, priority: f.priority, payload });
    }
    if (!r.ok) { setError({ field: r.field ?? null, text: r.error }); return; }
    bump();
    toast(`Request ${r.record.id} sent to IT.`, "success");
    navigate(`${pageUrl(IT_REQUEST)}?id=${r.record.id}`);
  };
  const payloadError = fe("payload");
  const personal = PERSONAL.includes(f.type);
  return (
    <Card id="new-request-card" title="What do you need?">
      {error && !error.field && <p className="ds-note ds-note--danger" role="alert" id="new-request-error">{error.text}</p>}
      <form id="new-request-form" className="ds-stack" onSubmit={submit} noValidate>
        <div className="ds-form-grid">
          <Field id="nr-type" label="Kind of request" required error={fe("type")} full hint={f.type === "new-account" ? undefined : TYPE_HELP[f.type]}><Select id="nr-type" options={types.map((t) => [t, typeLabel(t)])} value={f.type} error={fe("type")} onChange={set("type")} /></Field>
          {f.type === "new-account" ? (
            <p className="ds-note" id="new-account-note">{TYPE_HELP["new-account"]} {canCreateUsers && <Link to={pageUrl("users/user-form.html")}>Add an employee</Link>}</p>
          ) : (
            <>
              {(personal || f.type === "offboarding") && (canForAnyone || f.type === "offboarding" || d.reports.length > 0) && (
                <Field id="nr-subject" label={f.type === "offboarding" ? "Who is leaving" : "For"} required={f.type === "offboarding"} error={fe("subjectPersonId")} full>
                  <Select id="nr-subject" placeholder={f.type === "offboarding" ? "Choose a person" : undefined} options={(f.type === "offboarding" ? d.people.filter((u) => u.id !== userId) : subjects).map((u) => [u.id, u.id === userId ? `${u.name} (you)` : u.name])}
                    value={f.type === "offboarding" ? f.subject : subjectId} error={fe("subjectPersonId")} onChange={set("subject")} />
                </Field>
              )}
              {f.type === "access-request" && (
                <>
                  <Field id="nr-kind" label="Ask for" required full><Select id="nr-kind" options={[["permission", "One permission"], ["role", "A role"]]} value={f.accessKind} onChange={set("accessKind")} /></Field>
                  {f.accessKind === "role"
                    ? <Field id="nr-role" label="Role" required error={payloadError} full><Select id="nr-role" placeholder="Choose a role" options={ROLE_KEYS.filter((k) => k !== "admin").map((k) => [k, ROLES[k].label])} value={f.role} error={payloadError} onChange={set("role")} /></Field>
                    : <Field id="nr-permission" label="Permission" required error={payloadError} full><Select id="nr-permission" placeholder="Choose a permission" options={OVERRIDABLE.map((p) => [p, permWords(p)])} value={f.permission} error={payloadError} onChange={set("permission")} /></Field>}
                </>
              )}
              {f.type === "asset-request" && <Field id="nr-category" label="Kind of asset" required error={payloadError} full><Select id="nr-category" placeholder="Choose the kind of asset" options={Object.entries(ASSET_CATEGORIES).map(([k, c]) => [k, c.label])} value={f.category} error={payloadError} onChange={set("category")} /></Field>}
              {f.type === "asset-return" && <Field id="nr-asset" label="Asset to return" required error={payloadError} full hint={held.length ? undefined : "Nothing is issued to this person."}><Select id="nr-asset" placeholder="Choose the asset" options={held.map((a) => [a.tag, `${a.tag}: ${a.name}`])} value={f.assetTag} error={payloadError} onChange={set("assetTag")} /></Field>}
              {f.type === "software-request" && <Field id="nr-software" label="Software" required error={payloadError} full><Input id="nr-software" type="text" maxLength={80} value={f.software} error={payloadError} onChange={set("software")} /></Field>}
              {f.type !== "offboarding" && (
                <>
                  <Field id="nr-title" label="Title" required error={fe("title")} full hint={`3 to ${TITLE_MAX} characters.`}><Input id="nr-title" type="text" maxLength={TITLE_MAX} value={f.title} error={fe("title")} onChange={set("title")} /></Field>
                  <Field id="nr-details" label="Details" error={fe("details")} full hint={`Optional, up to ${DETAILS_MAX.toLocaleString("en-IN")} characters.`}><TextArea id="nr-details" rows={4} maxLength={DETAILS_MAX} value={f.details} error={fe("details")} onChange={set("details")} /></Field>
                  <Field id="nr-priority" label="How soon" error={fe("priority")} hint={`IT aims to answer within ${d.sla[f.priority]} h: by ${stamp(due)}.`} full><Select id="nr-priority" options={PRIORITIES.map((p) => [p, PRIORITY_LABEL[p]])} value={f.priority} error={fe("priority")} onChange={set("priority")} /></Field>
                </>
              )}
            </>
          )}
        </div>
        {f.type !== "new-account" && <div className="ds-form-actions"><button type="submit" className="ds-btn ds-btn--primary" id="new-request-send">{f.type === "offboarding" ? "Open the offboarding" : "Send to IT"}</button><Link className="ds-btn" to={pageUrl(IT_MINE)}>Cancel</Link></div>}
      </form>
    </Card>
  );
}

export default function ItNew() {
  return (
    <OwnPage page={IT_NEW} title="Raise an IT request">
      <PageHeader title="Raise an IT request" subtitle="Ask IT for help or for something you need" breadcrumb={[{ label: "IT desk", to: pageUrl(IT_MINE) }, { label: "Raise a request" }]} />
      <Form />
    </OwnPage>
  );
}