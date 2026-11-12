// perm(key): what rbac.js applyPermissions gave an element marked [data-permission] on the old pages, as props: the
// attribute, and hidden when the person may not use it. Kept current with the session (round 16).
import { can } from "../../../assets/js/core/rbac.js";
import { useSession } from "../data/hooks.js";

export function usePerm() {
  useSession();
  return (key) => ({ "data-permission": key, hidden: !can(key) || undefined });
}
