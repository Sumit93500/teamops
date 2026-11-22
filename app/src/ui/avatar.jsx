// FS1: a person's photo where the viewer may see it (data/files.js listFilesFor -> canViewFile; the URL from data/fileUrls.js), else their
// initials, as before. Kept apart from ui/files.jsx on purpose: the shell (Topbar) imports this, and it must not pull Form or Modal (and so
// their stylesheets) into the shell's import order, which would put the base .ds-btn rule after .ds-btn--primary.
import { listFilesFor } from "../../../assets/js/data/files.js";
import { nameOf } from "../../../assets/js/ui/leave-view.js";
import { useData, useSession } from "../data/hooks.js";
import { useFileUrl } from "../data/fileUrls.js";
import "../design/files.css";

const initialsOf = (name) => (name ? String(name).split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() : "");

// cls: the avatar classes the spot used before; initials: the spot's own initials when it had them.
export function Avatar({ userId, name, cls = "ds-avatar", label, initials: given }) {
  const { userId: me } = useSession();
  const meta = useData(() => (userId ? listFilesFor(me, { type: "user", id: userId })[0] ?? null : null), [me, userId]);
  const f = useFileUrl(me, meta?.id ?? null);
  const initials = given ?? initialsOf(name ?? nameOf(userId));
  if (f.state === "ok") return <span className={`${cls} avatar-photo`} aria-hidden={label ? undefined : "true"} title={label}><img src={f.url} alt={label ?? ""} /></span>;
  return <span className={cls} aria-hidden={label ? undefined : "true"} title={label}>{initials}</span>;
}

// The signed-in person's own avatar (the header).
export function SelfAvatar(props) {
  const { userId } = useSession();
  return <Avatar userId={userId} {...props} />;
}