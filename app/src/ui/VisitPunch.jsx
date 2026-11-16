// CV1 (2026-11-16): Mark attendance's third way to check in: "Client / official visit". Shows today's approved visit (or lets the person start
// one now, which the manager approves after), reads the browser's location once on press and says how accurate it is, then checks in or out
// of the visit. There is no 150 m office rule here, but a location is required: a reading worse than 200 m is refused, one over 100 m is
// accepted and flagged. Where the browser can't give a location the person says so with a reason, and the approver's explicit OK makes the
// day count. Every refusal is said in plain words.
import { useState } from "react";
import { Link } from "react-router-dom";
import { visitsFor } from "../../../assets/js/data/visits-store.js";
import { visitCheckIn, visitCheckOut, requestVisit, ACCURACY_REFUSE_M, ACCURACY_FLAG_M, SITE_MAX, PURPOSE_MAX } from "../../../assets/js/data/visits.js";
import { COUNTING, VISIT_KINDS } from "../../../assets/js/data/visits-store.js";
import { officeNow, hhmm } from "../../../assets/js/data/shift-engine.js";
import { formatDay } from "../../../assets/js/ui/leave-view.js";
import { Field, Input, Select, TextArea, Kv } from "../components/Form.jsx";
import { Icon } from "../components/icons.jsx";
import { Pill } from "../components/Layout.jsx";
import { useToast } from "./Toast.jsx";
import { kindLabel, visitDates, PIN } from "./visits.jsx";
import { useData } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { pageUrl, VISIT_PAGE } from "../routes.js";

// The browser's position, read once on press: { status: idle | busy | ok | denied | unsupported | error, reading }.
function useReading() {
  const [geo, setGeo] = useState({ status: "idle", reading: null });
  const read = () => {
    if (!globalThis.navigator?.geolocation) { setGeo({ status: "unsupported", reading: null }); return; }
    setGeo({ status: "busy", reading: null });
    navigator.geolocation.getCurrentPosition(
      (p) => setGeo({ status: "ok", reading: { lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: Math.round(p.coords.accuracy) } }),
      (err) => setGeo({ status: err.code === 1 ? "denied" : "error", reading: null }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };
  return [geo, read, () => setGeo({ status: "idle", reading: null })];
}

// The line under "Use my location": the accuracy in words.
function readingLine(geo) {
  if (geo.status === "idle") return { tone: "", text: "Press Use my location. It is read once, now, and saved with your check-in." };
  if (geo.status === "busy") return { tone: "info", text: "Reading your location…" };
  if (geo.status === "unsupported") return { tone: "danger", text: "This browser can't share its location. Use your phone, or say your location isn't available." };
  if (geo.status === "denied") return { tone: "danger", text: "Location is blocked for this site. Allow it in your browser's site settings and press Use my location again, or say it isn't available." };
  if (geo.status === "error") return { tone: "danger", text: "Your location couldn't be read. Press Use my location to try again, or say it isn't available." };
  const a = geo.reading.accuracyM;
  if (a > ACCURACY_REFUSE_M) return { tone: "danger", text: `Your location is only accurate to within ${a} m; it needs to be within ${ACCURACY_REFUSE_M} m. Move near a window or outdoors, then try again.`, bad: true };
  if (a > ACCURACY_FLAG_M) return { tone: "warning", text: `Accurate to within ${a} m. It is accepted but flagged as low accuracy.`, ok: true };
  return { tone: "success", text: `Location read, accurate to within ${a} m.`, ok: true };
}

export default function VisitPunch({ userId }) {
  const toast = useToast();
  const [geo, read, resetGeo] = useReading();
  const [unavailable, setUnavailable] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [f, setF] = useState({ kind: "client", siteName: "", purpose: "" });
  const [fe, setFe] = useState(null);
  const d = useData(() => {
    const now = officeNow();
    const mine = visitsFor(userId);
    const visit = mine.find((v) => v.dates.includes(now.date) && COUNTING.includes(v.status)) ?? null;
    const waiting = mine.find((v) => v.dates.includes(now.date) && v.status === "pending") ?? null;
    return { now, visit, waiting, day: visit?.days?.[now.date] ?? { in: null, out: null } };
  }, [userId]);
  const { visit, waiting, day, now } = d;
  const line = readingLine(geo);
  const needsReason = unavailable;
  const ready = unavailable ? reason.trim().length >= 3 : Boolean(line.ok);
  const out = Boolean(day.in && !day.out);
  const done = Boolean(day.in && day.out);

  const punch = () => {
    const opts = unavailable ? { unavailable: true, reason } : {};
    const r = (out ? visitCheckOut : visitCheckIn)(userId, unavailable ? null : geo.reading, opts);
    if (!r.ok) { setError(r.error); return; }
    setError(""); setUnavailable(false); setReason(""); resetGeo(); bump();
    toast(out ? (r.completed ? "Checked out. The visit is complete." : "Checked out of the visit.") : `Checked in at ${visit.siteName}.${r.punch.lowAccuracy ? " Flagged: low accuracy." : ""}${r.punch.needsOk ? " Your manager has to accept it without a location." : ""}`, "success");
  };
  const startNow = (e) => {
    e.preventDefault();
    const r = requestVisit(userId, { ...f, sameDay: true });
    if (!r.ok) { setFe({ field: r.field ?? "siteName", text: r.error }); return; }
    toast("Visit started. Your manager approves it afterwards.", "success"); setStarting(false); setF({ kind: "client", siteName: "", purpose: "" }); setFe(null); bump();
  };
  const fieldError = (k) => (fe?.field === k ? fe.text : undefined);

  return (
    <div className="visit-mode" id="visit-mode">
      {visit ? (
        <>
          <Kv rows={[["Visit", <Link className="link" to={`${pageUrl(VISIT_PAGE)}?id=${visit.id}`}>{visit.siteName}</Link>], ["Kind", kindLabel(visit.kind)], ["Purpose", visit.purpose], ["Days", visitDates(visit)]]} />
          {visit.approvalPending && <p className="ds-note ds-note--warning" id="visit-pending-note">Started today before approval. Your manager approves it after; if it is rejected, today counts under the ordinary office rules.</p>}
          {done ? <p className="ds-hint" id="visit-done">{`You checked in at ${day.in.time} and out at ${day.out.time}. You're done for this visit today.`}</p> : (
            <>
              <div className="ds-form-actions">
                <button type="button" className="ds-btn" id="visit-locate-btn" disabled={geo.status === "busy" || unavailable} onClick={() => { setError(""); read(); }}><Icon d={PIN} />{line.bad ? "Try again" : "Use my location"}</button>
              </div>
              <p className={`ds-status${line.tone ? ` ds-status--${line.tone}` : ""} visit-reading`} id="visit-reading" role="status">{line.text}</p>
              <label className="ds-check" htmlFor="visit-unavailable"><input type="checkbox" id="visit-unavailable" checked={unavailable} onChange={(e) => { setUnavailable(e.target.checked); setError(""); }} />My location isn't available</label>
              {needsReason && (
                <Field id="visit-reason" label="Why isn't it available?" required hint="Your manager has to accept this before the day counts.">
                  <Input id="visit-reason" maxLength={200} value={reason} onChange={(e) => { setReason(e.target.value); setError(""); }} />
                </Field>
              )}
              <div className="punch__actions">
                <button type="button" className="ds-btn ds-btn--primary ds-btn--lg" id={out ? "visit-check-out-btn" : "visit-check-in-btn"} disabled={!ready} onClick={punch}>{out ? "Check out of visit" : "Check in to visit"}</button>
              </div>
              {day.in && <p className="ds-hint" id="visit-in-note">{`Checked in at ${day.in.time}${day.in.lowAccuracy ? " (low accuracy)" : ""}${day.in.needsOk && !day.in.okBy ? ", waiting for an OK without a location" : ""}.`}</p>}
            </>
          )}
        </>
      ) : waiting ? (
        <p className="ds-hint" id="visit-waiting-note">{`Your visit to ${waiting.siteName} is waiting for approval. You can check in once it is approved.`}</p>
      ) : (
        <>
          <p className="ds-hint" id="visit-none-note">{`You have no approved visit for ${formatDay(now.date, true)}. Ask for one from My visits, or start one now: your manager approves it afterwards.`}</p>
          {!starting
            ? <div className="ds-form-actions"><button type="button" className="ds-btn" id="visit-start-btn" onClick={() => setStarting(true)}>Start a visit now</button><Link className="ds-btn" to={pageUrl("visits/my-visits.html")}>My visits</Link></div>
            : (
              <form id="visit-start-form" noValidate onSubmit={startNow}>
                <div className="ds-form-grid">
                  <Field id="vs-kind" label="Kind of visit" required><Select id="vs-kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} options={VISIT_KINDS.map((k) => [k, kindLabel(k)])} /></Field>
                  <Field id="vs-site" label="Client or place" required error={fieldError("siteName")}><Input id="vs-site" maxLength={SITE_MAX} value={f.siteName} onChange={(e) => { setF({ ...f, siteName: e.target.value }); setFe(null); }} /></Field>
                  <Field id="vs-purpose" label="Purpose" required full error={fieldError("purpose")}><TextArea id="vs-purpose" rows={2} maxLength={PURPOSE_MAX} value={f.purpose} onChange={(e) => { setF({ ...f, purpose: e.target.value }); setFe(null); }} /></Field>
                  {fieldError("fromDate") && <span className="ds-field__error" role="alert">{fieldError("fromDate")}</span>}
                </div>
                <div className="ds-form-actions"><button type="button" className="ds-btn" onClick={() => { setStarting(false); setFe(null); }}>Cancel</button><button type="submit" className="ds-btn ds-btn--primary">Start the visit</button></div>
              </form>
            )}
        </>
      )}
      <p className="ds-field__error" id="visit-error" role="alert" hidden={!error || undefined}>{error}</p>
    </div>
  );
}
