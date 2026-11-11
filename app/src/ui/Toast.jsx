// Toasts, as ui/toast.js draws them: a .toast-container (role status, polite) at the end of the page, each
// toast .toast.toast--<type> with its text and a close button, gone after 4 s. The text is plain text (React
// escapes it; the old helper took pre-escaped HTML).
import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const show = useCallback((message, type = "info", duration = 4000) => {
    const id = nextId++;
    setToasts((list) => [...list, { id, message, type }]);
    setTimeout(() => remove(id), duration);
  }, [remove]);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <div className="toast__body"><div className="toast__text">{t.message}</div></div>
            <button className="toast__close" type="button" aria-label="Dismiss" onClick={() => remove(t.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
