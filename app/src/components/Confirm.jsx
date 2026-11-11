// In-app dialogs in place of window.confirm (ruled 2026-11-08): const confirm = useConfirm(); if (await confirm({ message })) ...
// The same question in the same words as the old confirm() (a "\n" starts a new line), as a small modal: the question,
// then Cancel and the action (danger-red when it removes or discards something). Esc, Cancel and the backdrop answer no;
// focus starts on Cancel (the safe answer, as a browser's confirm puts it on OK only for a plain question) and returns to
// what asked. One question at a time; a second one waits for the first.
import { createContext, useCallback, useContext, useId, useRef, useState } from "react";
import { useDialogFocus } from "./Modal.jsx";

const ConfirmContext = createContext(async () => false);
export const useConfirm = () => useContext(ConfirmContext);

function ConfirmDialog({ ask, answer }) {
  const ref = useRef(null), titleId = useId();
  const trap = useDialogFocus(true, ref, { initial: "[data-confirm-cancel]" });
  const [first, ...rest] = ask.message.split("\n");
  return (
    <div className="modal is-open confirm-dialog" ref={ref} role="alertdialog" aria-modal="true" aria-labelledby={titleId}
      onClick={(e) => { if (e.target === ref.current) answer(false); }}
      onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); answer(false); } else trap(e); }}>
      <div className="modal__dialog modal__dialog--sm">
        <div className="modal__body">
          <p className="modal__title confirm-dialog__question" id={titleId}>{first}</p>
          {rest.map((line, i) => <p className="modal__desc" key={i}>{line}</p>)}
        </div>
        <div className="modal__footer">
          <button className="btn" type="button" data-confirm-cancel onClick={() => answer(false)}>{ask.cancelLabel ?? "Cancel"}</button>
          <button className={`btn ${ask.danger ? "btn--danger" : "btn--primary"}`} type="button" data-confirm-ok onClick={() => answer(true)}>{ask.confirmLabel ?? "OK"}</button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const confirm = useCallback((ask) => new Promise((resolve) => setQueue((q) => [...q, { ...ask, resolve }])), []);
  const current = queue[0];
  const answer = (yes) => { current.resolve(yes); setQueue((q) => q.slice(1)); };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {current && <ConfirmDialog key={queue.length} ask={current} answer={answer} />}
    </ConfirmContext.Provider>
  );
}
