// FS1: the file pieces the pages share. Every stored file is read through data/files.js (canViewFile first, then getFileFor, which writes the
// view to the audit trail) and shown through data/fileUrls.js (object URLs revoked when unused, on sign-out and on a change of person).
//   FilePicker     choose a file, take a photo (phones), or drop one (desktop); the rules of data/file-rules.js before anything is kept; the
//                  name, size, type and a preview (an image's thumbnail; a PDF opens in a new tab); Replace and Remove. Keyboard and screen
//                  reader: real buttons, a label, the hint and the error tied to them, the error announced.
//   Attachment     a link's stored file: its name, size and View (through the checked path); "You don't have access to this file." when there
//                  is one the viewer may not see; the old receipt text, labelled "Entered as text", for claims from before files.
//   Avatar         a person's photo where the viewer may see it, else their initials (as before).
//   PhotoEditor    a dialog: choose or take a photo, a square crop with zoom and position, save or remove.
//   DocFile        the file on one of a person's document rows: View, Add file, Replace, Remove for whoever may.
import { useEffect, useId, useRef, useState } from "react";
import { checkFile, formatSize, TYPE_WORD, LIMITS, TYPES_FOR } from "../../../assets/js/data/file-rules.js";
import { listFilesFor, hasFileOn, putFile, removeFile, mayAddFile, NO_ACCESS } from "../../../assets/js/data/files.js";
import { nameOf } from "../../../assets/js/ui/leave-view.js";
import "../components/ds.css";   // before Form's forms.css: the shell (the bell's card) may load this module first, and .ds-btn must come before .ds-btn--primary
import { initialsOf } from "../components/Form.jsx";
import Modal from "../components/Modal.jsx";
import { useData, useSession } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { acquireFileUrl, releaseFileUrl, useFileUrl } from "../data/fileUrls.js";
import { useToast } from "./Toast.jsx";
import "../design/files.css";

const DOC = "M7 3h7l5 5v13H7zM14 3v5h5", IMG = "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5a1.5 1.5 0 1 0 0-.01", CAM = "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8", UP = "M12 16V4M7 9l5-5 5 5M5 20h14";
const Svg = ({ d, cls = "icon" }) => <svg className={cls} viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
const typeIcon = (type) => (type === "pdf" ? DOC : IMG);
const ACCEPT = { pdf: ".pdf,application/pdf", jpg: ".jpg,.jpeg,image/jpeg", png: ".png,image/png" };
const kindTypes = (kind) => TYPES_FOR[kind].map((t) => TYPE_WORD[t]).join(TYPES_FOR[kind].length === 2 ? " or " : ", ").replace(/, (\w+)$/, " or $1");
export const pickerHint = (kind) => `${kindTypes(kind)}, up to ${formatSize(LIMITS[kind])}.`;
const isPhone = () => typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)")?.matches || window.innerWidth <= 560);

// A file chosen in the browser, checked by the rules. -> { ok, sel } | { ok: false, error }
export async function readChosen(kind, file) {
  let bytes = null;
  try { bytes = new Uint8Array(await file.arrayBuffer()); } catch { bytes = null; }
  const r = checkFile(kind, file.name, bytes);
  return r.ok ? { ok: true, sel: { name: r.name, type: r.type, mime: r.mime, size: bytes.length, bytes } } : { ok: false, error: r.error };
}

// value: { name, type, mime, size, bytes } | null.  onChange(value | null).
export function FilePicker({ id, kind, label, required = false, hint, value, onChange, disabled = false, error: outerError }) {
  const input = useRef(null), camera = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [over, setOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [broken, setBroken] = useState(false);
  const [phone] = useState(isPhone);
  const hintId = `${id}-hint`, errId = `${id}-error`, nameId = `${id}-name`;
  const shown = outerError ?? error;
  useEffect(() => {
    setBroken(false);
    if (!value || value.type === "pdf") { setPreview(null); return undefined; }
    const url = URL.createObjectURL(new Blob([value.bytes], { type: value.mime }));
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);
  const take = async (file) => {
    if (!file) return;
    setBusy(true); setError(null);
    const r = await readChosen(kind, file);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    onChange(r.sel);
  };
  const pick = (e) => { const f = e.target.files?.[0]; e.target.value = ""; take(f); };
  const openPdf = () => { const url = URL.createObjectURL(new Blob([value.bytes], { type: value.mime })); window.open(url, "_blank", "noopener"); setTimeout(() => URL.revokeObjectURL(url), 60000); };
  const accept = TYPES_FOR[kind].map((t) => ACCEPT[t]).join(",");
  const describedBy = [hintId, shown ? errId : null, value ? nameId : null].filter(Boolean).join(" ");
  return (
    <div className={`fp${over ? " fp--over" : ""}${shown ? " fp--error" : ""}`} id={id}
      onDragOver={(e) => { if (disabled || busy) return; e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled && !busy) take(e.dataTransfer.files?.[0]); }}>
      <span className={`fp__label${required ? " fp__label--required" : ""}`} id={`${id}-label`}>{label}</span>
      <input ref={input} type="file" className="visually-hidden" tabIndex={-1} aria-hidden="true" accept={accept} onChange={pick} data-file-input="" />
      <input ref={camera} type="file" className="visually-hidden" tabIndex={-1} aria-hidden="true" accept={TYPES_FOR[kind].includes("jpg") ? "image/jpeg,image/png" : accept} capture="environment" onChange={pick} data-camera-input="" />
      {value ? (
        <div className="fp__file" id={nameId} aria-live="polite">
          {preview && !broken ? <img className="fp__thumb" src={preview} alt={`Preview of ${value.name}`} onError={() => setBroken(true)} /> : <span className="fp__icon"><Svg d={typeIcon(value.type)} /></span>}
          <span className="fp__meta"><strong className="fp__name" title={value.name}>{value.name}</strong><span className="fp__sub">{`${TYPE_WORD[value.type]}, ${formatSize(value.size)}`}</span></span>
          <span className="fp__actions">
            {value.type === "pdf" && <button type="button" className="ds-btn ds-btn--sm" onClick={openPdf}>Open<span className="visually-hidden"> {value.name} in a new tab</span></button>}
            <button type="button" className="ds-btn ds-btn--sm" disabled={disabled || busy} onClick={() => input.current.click()} aria-describedby={describedBy}>Replace<span className="visually-hidden"> {value.name}</span></button>
            <button type="button" className="ds-btn ds-btn--sm" disabled={disabled || busy} onClick={() => { onChange(null); setError(null); }}>Remove<span className="visually-hidden"> {value.name}</span></button>
          </span>
        </div>
      ) : (
        <div className="fp__drop">
          <span className="fp__icon fp__icon--muted"><Svg d={UP} /></span>
          <span className="fp__buttons">
            <button type="button" className="ds-btn ds-btn--sm" id={`${id}-choose`} disabled={disabled || busy} onClick={() => input.current.click()} aria-labelledby={`${id}-label ${id}-choose`} aria-describedby={describedBy}>Choose a file</button>
            {phone && <button type="button" className="ds-btn ds-btn--sm" id={`${id}-camera`} disabled={disabled || busy} onClick={() => camera.current.click()}><Svg d={CAM} />Take a photo</button>}
          </span>
          {!phone && <span className="fp__or">or drop a file here</span>}
        </div>
      )}
      <span className="fp__hint" id={hintId}>{busy ? "Checking the file…" : hint ?? pickerHint(kind)}</span>
      {shown && <span className="fp__error" id={errId} role="alert">{shown}</span>}
    </div>
  );
}

// A stored file: name, size, View. View opens an image in a dialog and a PDF in a new tab, both through the checked path.
export function StoredFile({ meta }) {
  const { userId } = useSession();
  const [img, setImg] = useState(null);
  const [err, setErr] = useState(null);
  const view = async () => {
    setErr(null);
    if (meta.mime === "application/pdf") {
      const tab = window.open("", "_blank");
      const r = await acquireFileUrl(userId, meta.id);
      if (!r.ok) { tab?.close(); setErr(r.error); return; }
      if (tab) tab.location.href = r.url;
      setTimeout(() => releaseFileUrl(userId, meta.id), 60000);
      return;
    }
    setImg(meta.id);
  };
  const type = meta.mime === "application/pdf" ? "pdf" : meta.mime === "image/png" ? "png" : "jpg";
  return (
    <span className="fv" data-file={meta.id}>
      <span className="fp__icon fp__icon--sm"><Svg d={typeIcon(type)} /></span>
      <span className="fp__meta"><span className="fp__name" title={meta.name}>{meta.name}</span><span className="fp__sub">{`${TYPE_WORD[type]}, ${formatSize(meta.size)}`}</span></span>
      <button type="button" className="ds-btn ds-btn--sm" onClick={view}>View<span className="visually-hidden"> {meta.name}</span></button>
      {err && <span className="fp__error" role="alert">{err}</span>}
      {img && <ImageViewer fileId={img} name={meta.name} onClose={() => setImg(null)} />}
    </span>
  );
}
function ImageViewer({ fileId, name, onClose }) {
  const { userId } = useSession();
  const f = useFileUrl(userId, fileId);
  return (
    <Modal open onClose={onClose} id="file-viewer" size="lg" title={name} guard={false} footer={<button type="button" className="ds-btn" onClick={onClose}>Close</button>}>
      {f.state === "ok" ? <img className="fv__image" src={f.url} alt={name} /> : f.state === "error" ? <p className="fp__error" role="alert">{f.error}</p> : <p className="ds-hint">Opening the file…</p>}
    </Modal>
  );
}

// A link's file for the signed-in person: the file, "You don't have access to this file.", the old text, or nothing.
export function Attachment({ linkTo, oldText, empty = null }) {
  const { userId } = useSession();
  const d = useData(() => ({ files: listFilesFor(userId, linkTo), any: hasFileOn(linkTo) }), [userId, linkTo.type, linkTo.id, linkTo.slot]);
  if (d.files.length) return <span className="fv-list">{d.files.map((m) => <StoredFile key={m.id} meta={m} />)}</span>;
  if (d.any) return <span className="fv-none" data-no-access="">{NO_ACCESS}</span>;
  if (oldText) return <span className="fv-old"><span className="fp__name" title={oldText}>{oldText}</span><span className="fv-old__tag">Entered as text</span></span>;
  return empty;
}

// Avatar and SelfAvatar live in ./avatar.jsx (the shell imports them without Form or Modal); re-exported here.
export { Avatar, SelfAvatar } from "./avatar.jsx";

// The photo dialog: choose / take, crop square with zoom and position, save or remove.
export function PhotoEditor({ userId, open, onClose }) {
  const { userId: me } = useSession();
  const toast = useToast();
  const [sel, setSel] = useState(null);
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1), [x, setX] = useState(50), [y, setY] = useState(50);
  const [busy, setBusy] = useState(false), [err, setErr] = useState(null);
  const canvas = useRef(null);
  const current = useData(() => listFilesFor(me, { type: "user", id: userId })[0] ?? null, [me, userId]);
  const zoomId = useId();
  useEffect(() => { if (!open) { setSel(null); setImg(null); setZoom(1); setX(50); setY(50); setErr(null); } }, [open]);
  useEffect(() => {
    if (!sel) { setImg(null); return undefined; }
    const url = URL.createObjectURL(new Blob([sel.bytes], { type: sel.mime }));
    const im = new Image(); im.onload = () => setImg(im); im.onerror = () => setErr("This photo couldn't be opened. Try another one."); im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [sel]);
  const draw = (cv, size) => {
    const c = cv.getContext("2d"), side = Math.min(img.width, img.height) / zoom;
    const sx = (img.width - side) * (x / 100), sy = (img.height - side) * (y / 100);
    c.clearRect(0, 0, size, size); c.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  };
  useEffect(() => { if (img && canvas.current) draw(canvas.current, 240); });
  const save = async () => {
    if (!img) return;
    setBusy(true); setErr(null);
    const out = document.createElement("canvas"); out.width = out.height = 512; draw(out, 512);
    const blob = await new Promise((r) => out.toBlob(r, "image/jpeg", 0.9));
    const r = await putFile(me, { type: "user", id: userId }, { name: "photo.jpg", bytes: new Uint8Array(await blob.arrayBuffer()) }, { kind: "profile-photo" });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    toast(userId === me ? "Your photo is saved." : `${nameOf(userId)}'s photo is saved.`, "success"); bump(); onClose();
  };
  const drop = async () => {
    if (!current) return;
    setBusy(true);
    const r = await removeFile(me, current.id);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    toast("Photo removed. Initials show instead.", "success"); bump(); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} id="photo-editor" size="sm" title={current ? "Change photo" : "Add a photo"} desc="Square, centred on the face. JPG or PNG, up to 2 MB."
      footer={<>
        {current && !sel && <button type="button" className="ds-btn ds-btn--danger" disabled={busy} onClick={drop}>Remove photo</button>}
        <button type="button" className="ds-btn" onClick={onClose}>Cancel</button>
        <button type="button" className="ds-btn ds-btn--primary" disabled={!img || busy} onClick={save}>{busy ? "Saving…" : "Save photo"}</button>
      </>}>
      <div className="pe">
        {img ? (
          <>
            <canvas ref={canvas} className="pe__canvas" width="240" height="240" role="img" aria-label="The cropped photo" />
            <div className="pe__controls">
              <label className="pe__range" htmlFor={`${zoomId}-z`}>Zoom<input id={`${zoomId}-z`} type="range" min="1" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></label>
              <label className="pe__range" htmlFor={`${zoomId}-x`}>Left to right<input id={`${zoomId}-x`} type="range" min="0" max="100" step="1" value={x} onChange={(e) => setX(Number(e.target.value))} /></label>
              <label className="pe__range" htmlFor={`${zoomId}-y`}>Top to bottom<input id={`${zoomId}-y`} type="range" min="0" max="100" step="1" value={y} onChange={(e) => setY(Number(e.target.value))} /></label>
            </div>
          </>
        ) : null}
        <FilePicker id="photo-file" kind="profile-photo" label="Photo" value={sel} onChange={setSel} disabled={busy} />
        {err && <p className="fp__error" role="alert">{err}</p>}
      </div>
    </Modal>
  );
}

// The file on one document row (slot = the row's number): View for whoever may see it, Add / Replace / Remove for whoever may change it.
export function DocFile({ userId, slot, docType }) {
  const { userId: me } = useSession();
  const toast = useToast();
  const link = { type: "document", id: userId, slot: String(slot) };
  const d = useData(() => ({ files: listFilesFor(me, link), any: hasFileOn(link), may: mayAddFile(me, "employee-document", link).ok }), [me, userId, slot]);
  const [adding, setAdding] = useState(false), [sel, setSel] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState(null);
  const save = async () => {
    setBusy(true); setErr(null);
    const r = await putFile(me, link, sel, { kind: "employee-document", docType });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    toast(`File added to ${docType || "the document"}.`, "success"); setAdding(false); setSel(null); bump();
  };
  const drop = async (id) => { const r = await removeFile(me, id); if (!r.ok) toast(r.error, "danger"); else { toast("File removed.", "success"); bump(); } };
  const file = d.files[0];
  return (
    <span className="docfile">
      {file ? <StoredFile meta={file} /> : d.any ? <span className="fv-none">{NO_ACCESS}</span> : <span className="is-muted">No file</span>}
      {d.may && <button type="button" className="ds-btn ds-btn--sm" onClick={() => setAdding(true)}>{file ? "Replace" : "Add file"}<span className="visually-hidden">{` for ${docType || `row ${Number(slot) + 1}`}`}</span></button>}
      {d.may && file && <button type="button" className="ds-btn ds-btn--sm ds-btn--ghost" onClick={() => drop(file.id)}>Remove<span className="visually-hidden">{` the file for ${docType || `row ${Number(slot) + 1}`}`}</span></button>}
      {adding && (
        <Modal open onClose={() => { setAdding(false); setSel(null); setErr(null); }} id="doc-file-modal" size="sm" title={`${file ? "Replace the file" : "Add a file"}: ${docType || `row ${Number(slot) + 1}`}`} desc={`${nameOf(userId)}'s document. Seen by ${nameOf(userId)} and HR (Finance too for bank and tax proof).`}
          footer={<><button type="button" className="ds-btn" onClick={() => { setAdding(false); setSel(null); }}>Cancel</button><button type="button" className="ds-btn ds-btn--primary" disabled={!sel || busy} onClick={save}>{busy ? "Saving…" : "Save file"}</button></>}>
          <FilePicker id={`doc-file-${slot}`} kind="employee-document" label="File" value={sel} onChange={(v) => { setSel(v); setErr(null); }} disabled={busy} error={err} />
        </Modal>
      )}
    </span>
  );
}