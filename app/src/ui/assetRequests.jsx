// "Request an asset" and "Request return" (AS2): the two ways a person asks IT for equipment, shared by My assets and My requests. Each makes an
// IT request (data/it-desk.js createRequest: type asset-request or asset-return); the person follows the request in My IT requests (IT2). The desk refuses a second open request for the same thing and a return of an asset the person
// doesn't hold, and says so; those words are shown as they are.
import { useState } from "react";
import { createRequest } from "../../../assets/js/data/it-desk.js";
import { ASSET_CATEGORIES } from "../../../assets/js/data/asset-rules.js";
import Modal from "../components/Modal.jsx";
import { Field, Select, TextArea } from "../components/Form.jsx";
import { useSession } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { useToast } from "./Toast.jsx";

export const IT_STATUS = {
  open: ["Waiting for IT", "warning"], "in-progress": ["IT is working on it", "info"], "awaiting-approval": ["Waiting for an Admin's approval", "warning"],
  approved: ["Approved", "info"], rejected: ["Sent back to IT", "danger"], done: ["Done", "success"], cancelled: ["Cancelled", ""],
};
const CATEGORIES = Object.entries(ASSET_CATEGORIES).map(([k, c]) => [k, c.label]);
const PRIORITIES = [["low", "Low"], ["normal", "Normal"], ["high", "High"]];

function useAsk(onClose) {
  const { userId } = useSession();
  const toast = useToast();
  const [error, setError] = useState(null);
  const send = (fields, message) => {
    const r = createRequest(userId, fields);
    if (!r.ok) { setError({ field: r.field ?? null, text: r.error }); return; }
    bump();
    toast(`${message} (${r.record.id}). Follow it in My IT requests.`, "success");
    onClose();
  };
  return { error, setError, send, fe: (n) => (error?.field === n ? error.text : null), general: error && !error.field ? error.text : null };
}
function Shell({ id, title, desc, submitLabel, onClose, general, children }) {
  return (
    <Modal open onClose={onClose} id={`${id}-modal`} title={title} desc={desc}
      footer={<><button type="button" className="ds-btn" onClick={onClose}>Cancel</button><button type="submit" form={id} className="ds-btn ds-btn--primary">{submitLabel}</button></>}>
      {general && <p className="ds-note ds-note--danger" role="alert" id={`${id}-error`}>{general}</p>}
      {children}
    </Modal>
  );
}

export function RequestAssetDialog({ onClose }) {
  const a = useAsk(onClose);
  const [f, setF] = useState({ category: "", details: "", priority: "normal" });
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); a.setError(null); };
  const submit = (e) => {
    e.preventDefault();
    const label = ASSET_CATEGORIES[f.category]?.label;
    a.send({ type: "asset-request", title: label ? `Asset request: ${label}` : "Asset request", details: f.details, priority: f.priority, payload: { category: f.category } }, "Request sent to IT");
  };
  return (
    <Shell id="request-asset-form" title="Request an asset" onClose={onClose} submitLabel="Send to IT" general={a.general}
      desc="Say what you need. IT looks at it and, if it is approved, issues one to you; no tag is chosen until it is handed over.">
      <form id="request-asset-form" className="ds-stack" onSubmit={submit} noValidate>
        <div className="ds-form-grid">
          <Field id="ra-category" label="What you need" required error={a.fe("payload")} full><Select id="ra-category" placeholder="Choose the kind of asset" options={CATEGORIES} value={f.category} error={a.fe("payload")} onChange={set("category")} /></Field>
          <Field id="ra-priority" label="How soon" error={a.fe("priority")}><Select id="ra-priority" options={PRIORITIES} value={f.priority} error={a.fe("priority")} onChange={set("priority")} /></Field>
          <Field id="ra-details" label="What it is for" full error={a.fe("details")} hint="Optional, up to 2,000 characters."><TextArea id="ra-details" rows={3} maxLength={2000} value={f.details} error={a.fe("details")} onChange={set("details")} /></Field>
        </div>
      </form>
    </Shell>
  );
}

export function RequestReturnDialog({ asset, onClose }) {
  const a = useAsk(onClose);
  const [details, setDetails] = useState("");
  const submit = (e) => { e.preventDefault(); a.send({ type: "asset-return", title: `Return ${asset.tag}`, details, priority: "normal", payload: { assetTag: asset.tag } }, `Return of ${asset.tag} requested`); };
  return (
    <Shell id="request-return-form" title={`Request the return of ${asset.tag}`} onClose={onClose} submitLabel="Send to IT" general={a.general}
      desc={`${asset.name}: IT takes it back from you and records its condition.`}>
      <form id="request-return-form" className="ds-stack" onSubmit={submit} noValidate>
        <Field id="rr-details" label="Anything IT should know" full error={a.fe("details")} hint="Optional."><TextArea id="rr-details" rows={3} maxLength={2000} value={details} error={a.fe("details")} onChange={(e) => { setDetails(e.target.value); a.setError(null); }} /></Field>
      </form>
    </Shell>
  );
}