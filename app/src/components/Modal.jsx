// Modal, as css/components/modal.css draws it and ui/modal.js runs it: .modal.is-open (the backdrop) > .modal__dialog
// (sm or lg) > header (title, close), body, footer. Focus goes to the first field (else the first control) on open and back
// to what opened it on close; Tab stays inside; Esc, the close button and the backdrop close it.
// The unsaved-changes guard (Forms round, now in-app): once something is typed or changed inside, Esc, the close button
// and the backdrop ask "Discard what you've entered?" in an in-app dialog; Cancel keeps it open with what was entered.
// The page's own Save/Cancel buttons close it directly (onClose), as before.
import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { useConfirm } from "./Confirm.jsx";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const FIELDS = 'input:not([type="hidden"]), select, textarea';
export const DISCARD = "Discard what you've entered?";
const focusables = (root) => [...root.querySelectorAll(FOCUSABLE)].filter((n) => !n.closest("[hidden]"));
export const CloseIcon = () => <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>;

// The Tab trap and focus in/out, shared with the confirm dialog.
export function useDialogFocus(open, ref, { initial = "field" } = {}) {
  const openedFrom = useRef(null);
  useLayoutEffect(() => {
    if (!open) return undefined;
    openedFrom.current = document.activeElement;
    const list = focusables(ref.current);
    (initial === "field" ? list.find((n) => n.matches(FIELDS)) ?? list[0] : ref.current.querySelector(initial) ?? list[0])?.focus();
    const back = openedFrom.current;
    return () => { if (back?.isConnected) back.focus(); };
  }, [open]);   // eslint-disable-line react-hooks/exhaustive-deps
  return (e) => {
    if (e.key !== "Tab") return;
    const list = focusables(ref.current);
    if (!list.length) { e.preventDefault(); return; }
    const first = list[0], last = list[list.length - 1], at = document.activeElement;
    if (e.shiftKey && (at === first || !ref.current.contains(at))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (at === last || !ref.current.contains(at))) { e.preventDefault(); first.focus(); }
  };
}

export default function Modal({ open, onClose, title, desc, size = "", footer, guard = true, id, children }) {
  const ref = useRef(null), changed = useRef(false);
  const titleId = useId(), descId = useId();
  const confirm = useConfirm();
  const trap = useDialogFocus(open, ref);
  useEffect(() => { if (open) changed.current = false; }, [open]);

  const tryClose = async () => {
    if (guard && changed.current && !(await confirm({ message: DISCARD, confirmLabel: "Discard", cancelLabel: "Keep editing", danger: true }))) return;
    onClose();
  };
  if (!open) return null;
  return (
    <div className="modal is-open" id={id} ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={desc ? descId : undefined}
      onInputCapture={() => { changed.current = true; }} onChangeCapture={() => { changed.current = true; }}
      onMouseDown={(e) => { ref.current.downOnBackdrop = e.target === ref.current; }}
      onClick={(e) => { if (e.target === ref.current && ref.current.downOnBackdrop) tryClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); tryClose(); } else trap(e); }}>
      <div className={`modal__dialog${size ? ` modal__dialog--${size}` : ""}`}>
        <div className="modal__header">
          <h2 className="modal__title" id={titleId}>{title}</h2>
          <button className="modal__close" type="button" aria-label="Close" onClick={tryClose}><CloseIcon /></button>
        </div>
        <div className="modal__body">
          {desc && <p className="modal__desc" id={descId}>{desc}</p>}
          {children}
        </div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
