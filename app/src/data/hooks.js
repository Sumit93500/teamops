// The hooks between React and the old stores. The stores are used exactly as they are: their reads return
// fresh copies from localStorage, their writes validate, save and return { ok, record | error, field }.
//   useData(read, deps)  the read's result, re-read when anything changes (bus.js) or a dep changes
//   useAction(write)     the write, called unchanged; a successful one bumps the bus so every reader re-reads
//   useSession()         who is signed in: { session, user, role, userId }
//   useCan(permission)   core/rbac.js can(), kept current with the session
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { subscribe, getVersion, bump } from "./bus.js";
import { getSession, getCurrentUser, getCurrentRole, getCurrentUserId, signIn, signOut } from "../../../assets/js/core/auth.js";
import { can } from "../../../assets/js/core/rbac.js";

const useVersion = () => useSyncExternalStore(subscribe, getVersion);

export function useData(read, deps = []) {
  const version = useVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => read(), [version, ...deps]);
}

export function useAction(write) {
  return useCallback((...args) => {
    const result = write(...args);
    if (!result || result.ok !== false) bump();   // a refusal changes nothing
    return result;
  }, [write]);
}

export function useSession() {
  useVersion();
  return { session: getSession(), user: getCurrentUser(), role: getCurrentRole(), userId: getCurrentUserId() };
}

export function useCan(permission) {
  useVersion();
  return can(permission);
}

// Signing in and out change the session for every reader.
export function signInAs(roleKey, userLabel, employeeId) {
  signIn(roleKey, userLabel, employeeId);
  bump();
}
export function signOutNow() {
  signOut();
  bump();
}
