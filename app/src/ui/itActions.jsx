// What a person can do with one IT request, and the offboarding checklist (IT2). The buttons come from the data layer's own list
// (data/it-desk.js availableActions: the state machine and the separation of duties together), so a button that isn't there is a move
// the desk would refuse; each dialog calls the desk's function and says its refusal at the field it names. The Admin's flagged
// override (a reason, kept on the review trail) is drawn apart from IT's own steps.
import { useState } from "react";
import {
  availableActions, needsBreakGlass, assignRequest, addComment, prepareNewAccount, submitForApproval, approveRequest, rejectRequest, resumeRequest, cancelRequest,
  handOverAccount, executeReset, executeUnlock, fulfilAssetRequest, fulfilAssetReturn, fulfilSoftwareRequest, resolveIssue, tickChecklist,
  executeOffboardingDisable, waiveOffboardingItem, completeOffboarding,
} from "../../../assets/js/data/it-desk.js";
import { CHECKLIST, NOTE_MIN, BREAK_GLASS_MIN } from "../../../assets/js/data/it-rules.js";
import { ROLES, ROLE_KEYS } from "../../../assets/js/config/roles.js";
import { getUser, departmentChoices } from "../../../assets/js/data/store.js";
import { listAssets } from "../../../assets/js/data/asset-register.js";
import { issuedTo } from "../../../assets/js/data/stock-ledger.js";
import { licencesFor, seatsHeldBy } from "../../../assets/js/data/licences.js";
import { CONDITIONS } from "../../../assets/js/data/asset-rules.js";
import { Field, TextArea } from "../components/Form.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { Icon } from "../components/icons.jsx";
import { useSession } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { useToast } from "./Toast.jsx";
import { AskDialog, itPeople, activePeople, nameOf, stampYear } from "./it.jsx";

const optionsOf = (list, label) => list.map((x) => [x.id ?? x.value, label(x)]);
const CONDITION_OPTIONS = Object.entries(CONDITIONS).map(([k, c]) => [k, c.label ?? c]);
const MODE_OPTIONS = [["link", "A reset link (60 minutes)"], ["temp", "A temporary password"]];
const overrideField = { name: "override", label: "Why you are doing this as an Admin", kind: "textarea", required: true, maxLength: 500, hint: `Kept on the review trail, flagged "admin override". At least ${NOTE_MIN} characters.`, match: /override/i };
const full = (path) => `${window.location.origin}${path}`;
const BUTTON_LABEL = {
  assign: "Assign", prepare: "Prepare the account", submit: "Send to the Admin", approve: "Approve", reject: "Reject", resume: "Take it back", cancel: "Cancel the request",
  "hand-over": "Make the sign-in details", reset: "Reset the password", unlock: "Unlock the account", "fulfil-asset": "Issue an asset", "fulfil-return": "Take the asset back",
  "fulfil-software": "Give a seat", resolve: "Resolve it", tick: "Tick an item", disable: "Disable the sign-in", waive: "Waive returning assets", complete: "Complete the offboarding",
};
const DONE_TEXT = { assign: "Assigned.", prepare: "Details saved.", submit: "Sent to the Admin.", approve: "Approved.", reject: "Rejected: it goes back to IT.", resume: "It is back with you.", cancel: "Cancelled.",
  reset: "Done. Share the secret below.", unlock: "Unlocked.", "fulfil-asset": "Asset issued.", "fulfil-return": "Asset taken back.", "fulfil-software": "Seat given.", resolve: "Resolved.", tick: "Item ticked.",
  disable: "Sign-in disabled.", waive: "Waived.", complete: "Offboarding complete." };
const PRIMARY = ["approve", "hand-over", "reset", "unlock", "fulfil-asset", "fulfil-return", "fulfil-software", "resolve", "complete", "submit", "prepare"];

// The dialog for one action: { title, desc, submitLabel, danger, fields, run, intro }. null for the actions that only ask yes or no.
function spec(kind, r, userId, override) {
  const ov = override ? [overrideField] : [];
  const o = (v) => (override ? v.override : null);
  const subject = r.subjectPersonId ? getUser(r.subjectPersonId) : null;
  switch (kind) {
    case "assign":
      return { title: `Assign ${r.id}`, desc: "Give it to someone in IT. The person who raised it is told.", submitLabel: "Assign",
        fields: [{ name: "assignedTo", label: "IT person", kind: "select", required: true, options: optionsOf(itPeople(), (u) => u.name), value: r.assignedTo ?? "", alias: ["assignedTo"], match: /IT/ }],
        run: (v) => assignRequest(userId, r.id, v.assignedTo) };
    case "prepare": {
      const p = r.prepared ?? {};
      const roles = ROLE_KEYS.filter((k) => k !== "admin" || getUser(r.requesterId)?.role === "admin").map((k) => [k, ROLES[k].label]);
      return { title: `Prepare ${nameOf(r.subjectPersonId)}'s account`, desc: "Set what they start with. The Admin approves it before any sign-in details are made.", submitLabel: "Save details", size: "lg",
        fields: [
          { name: "role", label: "Role", kind: "select", required: true, options: roles, value: p.role ?? subject?.role ?? "emp", alias: ["role"] },
          { name: "email", label: "Work email", kind: "email", required: true, maxLength: 120, value: p.email ?? subject?.email ?? "", alias: ["email"] },
          { name: "department", label: "Department", kind: "select", required: true, options: departmentChoices().map((d) => [d.code, d.name ?? d.code]), value: p.department ?? subject?.department ?? "", alias: ["department"] },
          { name: "managerId", label: "Manager", kind: "select", options: optionsOf(activePeople().filter((u) => u.id !== r.subjectPersonId), (u) => u.name), value: p.managerId ?? "", placeholder: "No manager", alias: ["managerId"] },
          { name: "startDate", label: "Start date", kind: "date", required: true, value: p.startDate ?? "", alias: ["startDate"] },
        ],
        run: (v) => prepareNewAccount(userId, r.id, v) };
    }
    case "submit":
      return { title: `Send ${r.id} to the Admin`, desc: "It waits for an Admin's decision before anything is carried out.", submitLabel: "Send",
        fields: [{ name: "note", label: "Note for the Admin", kind: "textarea", maxLength: 500, hint: "Optional." }], run: (v) => submitForApproval(userId, r.id, v.note) };
    case "approve": {
      const glass = needsBreakGlass(userId, r.id);
      return { title: `Approve ${r.id}`, desc: glass ? "This is about you or raised by you, and you are the only Admin." : "Approving lets IT carry it out; nothing happens before that.", submitLabel: "Approve",
        intro: glass ? <p className="ds-note ds-note--warning it-banner" id="break-glass-note" role="status"><Icon d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0" />Break-glass: with only one Admin, you may approve it with a written reason of at least {BREAK_GLASS_MIN} characters. It is flagged for review and stays on the Admin dashboard until another Admin marks it reviewed.</p> : null,
        fields: [...(glass ? [{ name: "breakGlass", label: "Your written reason (break-glass)", kind: "textarea", required: true, maxLength: 500, alias: ["breakGlass"] }] : []), { name: "note", label: "Note", kind: "textarea", maxLength: 500, hint: "Optional." }],
        run: (v) => approveRequest(userId, r.id, v.note, Date.now(), { breakGlass: glass ? v.breakGlass : null }) };
    }
    case "reject":
      return { title: `Reject ${r.id}`, desc: "It goes back to IT with your reason.", submitLabel: "Reject", danger: true,
        fields: [{ name: "reason", label: "Reason", kind: "textarea", required: true, maxLength: 500, alias: ["reason"] }], run: (v) => rejectRequest(userId, r.id, v.reason) };
    case "resume":
      return { title: `Take ${r.id} back`, desc: "Work on it again after the Admin's rejection.", submitLabel: "Take it back",
        fields: [{ name: "note", label: "Note", kind: "textarea", maxLength: 500, hint: "Optional." }], run: (v) => resumeRequest(userId, r.id, v.note) };
    case "cancel":
      return { title: `Cancel ${r.id}`, desc: "A cancelled request can't be opened again.", submitLabel: "Cancel the request", danger: true,
        fields: [{ name: "reason", label: "Reason", kind: "textarea", required: true, maxLength: 500, alias: ["reason"] }], run: (v) => cancelRequest(userId, r.id, v.reason) };
    case "reset":
      return { title: `Reset ${nameOf(r.subjectPersonId)}'s password`, desc: "The secret is shown to you once and never kept.", submitLabel: "Reset", override,
        fields: [...ov, { name: "mode", label: "How", kind: "select", required: true, options: MODE_OPTIONS, value: "link" }], run: (v) => executeReset(userId, r.id, v.mode, Date.now(), { override: o(v) }) };
    case "fulfil-asset": {
      const cat = r.payload?.category;
      const tags = listAssets(userId, { status: "in-store", category: cat }).map((a) => [a.tag, `${a.tag}: ${a.name}`]);
      return { title: `Issue an asset to ${nameOf(r.subjectPersonId)}`, desc: tags.length ? "Choose one that is in store." : "Nothing of this kind is in store: add or return one first.", submitLabel: "Issue",
        fields: [...ov, { name: "tag", label: "Asset", kind: "select", required: true, options: tags, alias: ["assetTag"] },
          { name: "condition", label: "Condition", kind: "select", options: CONDITION_OPTIONS, value: "good", alias: ["condition"] }, { name: "notes", label: "Notes", kind: "textarea", maxLength: 500, hint: "Optional." }],
        run: (v) => fulfilAssetRequest(userId, r.id, v.tag, { condition: v.condition, notes: v.notes }, Date.now(), { override: o(v) }) };
    }
    case "fulfil-return":
      return { title: `Take ${r.payload?.assetTag} back`, desc: `From ${nameOf(r.subjectPersonId)}. Record its condition.`, submitLabel: "Take it back",
        fields: [...ov, { name: "condition", label: "Condition", kind: "select", options: CONDITION_OPTIONS, value: "good", alias: ["condition"] }, { name: "notes", label: "Notes", kind: "textarea", maxLength: 500, hint: "Optional." }],
        run: (v) => fulfilAssetReturn(userId, r.id, { condition: v.condition, notes: v.notes }, Date.now(), { override: o(v) }) };
    case "fulfil-software": {
      const lic = licencesFor(userId).filter((l) => l.status === "active" && l.free > 0).map((l) => [l.id, `${l.software} (${l.free} free)`]);
      return { title: `Give ${nameOf(r.subjectPersonId)} a seat`, desc: lic.length ? "Choose the licence." : "No licence has a free seat.", submitLabel: "Give a seat",
        fields: [...ov, { name: "licenceId", label: "Licence", kind: "select", required: true, options: lic, alias: ["licenceId"] }],
        run: (v) => fulfilSoftwareRequest(userId, r.id, v.licenceId, Date.now(), { override: o(v) }) };
    }
    case "resolve":
      return { title: `Resolve ${r.id}`, desc: "Say what was done.", submitLabel: "Resolve",
        fields: [...ov, { name: "note", label: "What was done", kind: "textarea", required: true, maxLength: 500, alias: ["note"] }], run: (v) => resolveIssue(userId, r.id, v.note, Date.now(), { override: o(v) }) };
    case "tick": {
      const items = (r.checklist ?? []).filter((c) => !c.done && !c.waived && c.key !== "disable-signin").map((c) => [c.key, CHECKLIST.find((x) => x.key === c.key)?.label ?? c.key]);
      return { title: "Tick a checklist item", desc: "Only once it holds: nothing still with them, no seats, no overrides.", submitLabel: "Tick it",
        fields: [...ov, { name: "key", label: "Item", kind: "select", required: true, options: items }], run: (v) => tickChecklist(userId, r.id, v.key, Date.now(), { override: o(v) }) };
    }
    case "disable":
      return { title: "Disable the sign-in", desc: "On or after the last working day, once the Admin approved. Nothing is deleted.", submitLabel: "Disable", danger: true,
        fields: ov, run: (v) => executeOffboardingDisable(userId, r.id, Date.now(), { override: o(v) }) };
    case "waive":
      return { title: "Waive returning assets", desc: "Only the Admin can, with a reason; it is flagged on the review trail.", submitLabel: "Waive it", danger: true,
        fields: [{ name: "reason", label: "Reason", kind: "textarea", required: true, maxLength: 500, alias: ["reason"] }], run: (v) => waiveOffboardingItem(userId, r.id, "return-assets", v.reason) };
    case "complete":
      return { title: "Complete the offboarding", desc: "Every item is done or waived.", submitLabel: "Complete", fields: ov, run: (v) => completeOffboarding(userId, r.id, Date.now(), { override: o(v) }) };
    default:
      return null;
  }
}

export function CommentBox({ request }) {
  const { userId } = useSession();
  const [note, setNote] = useState("");
  const [error, setError] = useState(null);
  const toast = useToast();
  const send = (e) => {
    e.preventDefault();
    const r = addComment(userId, request.id, note);
    if (!r.ok) { setError(r.error); return; }
    bump();
    setNote("");
    toast("Comment added.", "success");
  };
  return (
    <form className="ds-stack" id="comment-form" onSubmit={send} noValidate>
      <Field id="comment-note" label="Add a comment" error={error} hint="Everyone who can see this request reads it. It can't be changed afterwards."><TextArea id="comment-note" rows={3} maxLength={500} value={note} error={error} onChange={(e) => { setNote(e.target.value); setError(null); }} /></Field>
      <div><button type="submit" className="ds-btn" id="comment-send">Add comment</button></div>
    </form>
  );
}

// The buttons for one request. onSecret({ title, lead, items }) hands what must be shown once to the page.
export function RequestActions({ request, onSecret }) {
  const { userId } = useSession();
  const confirm = useConfirm();
  const toast = useToast();
  const [dialog, setDialog] = useState(null);   // { kind, override }
  const av = availableActions(userId, request.id);
  const who = nameOf(request.subjectPersonId);

  const secretFrom = (kind, res) => {
    if (kind === "hand-over") onSecret({ title: "Share these sign-in details", lead: `Give them to ${who} yourself. They are shown only now: they are not kept anywhere, and they will not be shown again. ${who} must choose a new password at the first sign-in.`,
      items: [{ label: "Temporary password", value: res.tempPassword }, { label: "Set-password link", value: full(res.link) }] });
    else if (kind === "reset") onSecret({ title: res.tempPassword ? "Share this temporary password" : "Share this reset link", lead: `Give it to ${who} yourself. It is shown only now and is not kept.`,
      items: res.tempPassword ? [{ label: "Temporary password", value: res.tempPassword }] : [{ label: "Reset link", value: full(res.link) }] });
  };
  const direct = async (kind) => {
    if (kind === "hand-over") {
      if (!(await confirm({ message: `Make ${who}'s sign-in details now?\nThe temporary password and the link are shown once, to you only.`, confirmLabel: "Make them" }))) return;
      const res = await handOverAccount(userId, request.id);
      if (!res.ok) { toast(res.error, "danger"); return; }
      bump(); secretFrom("hand-over", res);
    } else if (kind === "unlock") {
      if (!(await confirm({ message: `Unlock ${who}'s account?`, confirmLabel: "Unlock" }))) return;
      const res = executeUnlock(userId, request.id);
      if (!res.ok) { toast(res.error, "danger"); return; }
      bump(); toast(`${who}'s account is unlocked.`, "success");
    }
  };
  const open = (kind, override = false) => {
    if (kind === "hand-over" || (kind === "unlock" && !override)) { direct(kind); return; }
    setDialog({ kind, override });
  };
  const btn = (kind, override = false) => (
    <button key={`${kind}${override ? "-ov" : ""}`} type="button" className={`ds-btn ds-btn--sm${PRIMARY.includes(kind) && !override ? " ds-btn--primary" : ""}${kind === "reject" || kind === "cancel" || kind === "waive" || kind === "disable" ? " ds-btn--danger" : ""}`}
      data-action={kind} data-override={override ? "" : undefined} onClick={() => open(kind, override)}>{BUTTON_LABEL[kind]}</button>
  );
  const steps = av.actions.filter((a) => a !== "comment" && a !== "cancel" && a !== "approve" && a !== "reject");
  const decide = av.actions.filter((a) => a === "approve" || a === "reject");
  const other = av.actions.filter((a) => a === "cancel");
  const sp = dialog ? spec(dialog.kind, request, userId, dialog.override) : null;
  const nothing = !steps.length && !decide.length && !other.length && !av.override.length;
  return (
    <div className="ds-stack" id="request-actions">
      {nothing && <p className="text-muted" id="no-actions">Nothing for you to do on this request right now.</p>}
      {steps.length > 0 && <div className="it-actions__group"><h3 className="it-actions__title">Work on it</h3><div className="it-actions">{steps.map((k) => btn(k))}</div></div>}
      {decide.length > 0 && <div className="it-actions__group"><h3 className="it-actions__title">Decide</h3><div className="it-actions">{decide.map((k) => btn(k))}</div>{needsBreakGlass(userId, request.id) && <span className="it-why">You are the only Admin: approving this takes a written reason (break-glass).</span>}</div>}
      {av.override.length > 0 && <div className="it-actions__group"><h3 className="it-actions__title">As Admin (override, flagged and reviewed)</h3><div className="it-actions">{av.override.map((k) => btn(k, true))}</div></div>}
      {other.length > 0 && <div className="it-actions__group"><div className="it-actions">{other.map((k) => btn(k))}</div></div>}
      {sp && <AskDialog id={`act-${dialog.kind}`} {...sp} onClose={() => setDialog(null)} onDone={(res) => { secretFrom(dialog.kind, res); toast(dialog.kind === "approve" && res.breakGlass ? "Approved as the only Admin. It is flagged for review." : DONE_TEXT[dialog.kind] ?? "Done.", "success"); }} />}
    </div>
  );
}

// ---------- the offboarding checklist ----------
const TICK = "m5 12 5 5 9-10";
export function Checklist({ request }) {
  const { userId } = useSession();
  const person = request.subjectPersonId;
  const held = listAssets(userId, { status: "assigned" }).filter((a) => a.holderId === person);
  const stock = issuedTo(userId, person);
  const seats = seatsHeldBy(userId, person);
  const out = [...held.map((a) => `${a.tag} (${a.name})`), ...stock.map((x) => `${x.qty} ${x.unit} ${x.name}`)];
  return (
    <div className="ds-stack">
      <ul className="it-check" id="offboarding-checklist">
        {request.checklist.map((c) => {
          const state = c.done ? "done" : c.waived ? "waived" : "open";
          const label = CHECKLIST.find((x) => x.key === c.key)?.label ?? c.key;
          return (
            <li key={c.key} className="it-check__item" data-state={state} data-item={c.key}>
              <span className="it-check__box" aria-hidden="true">{state === "done" && <Icon d={TICK} />}</span>
              <div>
                <strong>{label}</strong>
                <span className="it-sub">{state === "done" ? `Done by ${nameOf(c.by)}, ${stampYear(c.at)}` : state === "waived" ? `Waived by ${nameOf(c.waived.by)}, ${stampYear(c.waived.at)}: ${c.waived.reason}` : "Not done yet"}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <div id="still-with-them">
        <h3 className="it-actions__title">Still with {nameOf(person)}</h3>
        {out.length || seats.length ? <ul className="it-seats">{out.map((t) => <li key={t}>{t}</li>)}{seats.map((s) => <li key={s.id}>Licence seat {s.id}</li>)}</ul> : <p className="text-muted">Nothing: no assets, stock or licence seats.</p>}
      </div>
    </div>
  );
}