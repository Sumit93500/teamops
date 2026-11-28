// Announcements (SD1, restored): the posts meant for you (everyone's and your department's), pinned first, newest first. HR and the Admin
// (announcements:create) also post, edit, pin and take down, and see what was taken down or has ended. Opening the page marks the bell's
// announcement notices read. Data: data/announcements.js (the store decides who sees what; this only draws it).
import { useEffect, useState } from "react";
import { announcementsFor, allAnnouncements, postAnnouncement, editAnnouncement, setAnnouncementPinned, endAnnouncement, announcementNoticesFor, markAnnouncementRead, mayPost, audienceCount, ANNOUNCEMENT_LIMITS } from "../../../assets/js/data/announcements.js";
import { getAllDepartments, getUser } from "../../../assets/js/data/store.js";
import { formatDay } from "../../../assets/js/ui/leave-view.js";
import Frame from "../ui/Frame.jsx";
import { PageHeader, Card, Pill } from "../components/Layout.jsx";
import { EmptyState } from "../components/Basics.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { useData, useSession } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { useToast } from "../ui/Toast.jsx";
import { AskDialog } from "../ui/it.jsx";
import "../design/posts.css";

const PAGE = "announcements/announcements.html";
const dateOf = (iso) => formatDay(String(iso).slice(0, 10), true);
const nameOf = (id) => getUser(id)?.name ?? "Someone";

function audienceText(audience, departments) {
  if (audience === "everyone") return "To everyone";
  return `To ${departments.find((d) => d.code === audience)?.name ?? "one department"}`;
}

function Post({ p, poster, departments, onEdit }) {
  const { userId } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const run = (r, ok) => { if (!r.ok) toast(r.error, "danger"); else { bump(); toast(ok, "success"); } };
  const takeDown = async () => {
    if (!(await confirm({ message: `Take down "${p.title}"? Nobody will see it any more, and it can't come back.`, confirmLabel: "Take down", danger: true }))) return;
    run(endAnnouncement(userId, p.id), "Taken down.");
  };
  const state = p.state === "ended" ? "Taken down" : p.state === "expired" ? "Ended" : null;
  return (
    <article className={`post${p.pinned ? " post--pinned" : ""}${state ? " post--off" : ""}`} data-post={p.id} aria-labelledby={`${p.id}-title`}>
      <header className="post__head">
        <h2 className="post__title" id={`${p.id}-title`}>{p.title}</h2>
        <div className="post__chips">
          {p.pinned && <Pill tone="info">Pinned</Pill>}
          {state && <Pill tone="">{state}</Pill>}
        </div>
      </header>
      <p className="post__body">{p.body}</p>
      <footer className="post__foot">
        <span className="post__meta">{nameOf(p.postedBy)}, {dateOf(p.postedAt)}. {audienceText(p.audience, departments)}{p.expiresOn ? `, until ${formatDay(p.expiresOn, true)}` : ""}.{p.editedAt ? " Edited." : ""}</span>
        {poster && !p.endedAt && (
          <span className="post__actions">
            <button type="button" className="ds-btn ds-btn--sm" onClick={() => onEdit(p)}>Edit</button>
            <button type="button" className="ds-btn ds-btn--sm" onClick={() => run(setAnnouncementPinned(userId, p.id, !p.pinned), p.pinned ? "Unpinned." : "Pinned to the top.")}>{p.pinned ? "Unpin" : "Pin"}</button>
            <button type="button" className="ds-btn ds-btn--sm" onClick={takeDown}>Take down</button>
          </span>
        )}
      </footer>
    </article>
  );
}

function Content() {
  const { userId } = useSession();
  const toast = useToast();
  const [dialog, setDialog] = useState(null);   // null | "new" | a post
  const d = useData(() => {
    const poster = mayPost(userId);
    const all = poster ? allAnnouncements(userId) : [];
    return { poster, live: announcementsFor(userId), off: all.filter((p) => !p.live), departments: getAllDepartments(), unread: announcementNoticesFor(userId, { unreadOnly: true }) };
  }, [userId]);
  // seen here: the bell's notices for these posts are read
  useEffect(() => { if (d.unread.length) { d.unread.forEach((n) => markAnnouncementRead(userId, n.postId)); bump(); } }, [d.unread.length, userId]);   // eslint-disable-line react-hooks/exhaustive-deps
  const audienceOptions = [["everyone", `Everyone (${audienceCount("everyone")} people)`], ...d.departments.map((x) => [x.code, `${x.name} (${audienceCount(x.code)})`])];
  const edit = dialog && dialog !== "new" ? dialog : null;
  return (
    <>
      <PageHeader title="Announcements" subtitle={d.poster ? "News for everyone, or for one department. Pinned posts stay at the top." : "News for everyone, and for your department"}
        actions={d.poster ? <button type="button" className="ds-btn ds-btn--primary" id="post-open" onClick={() => setDialog("new")}>Post an announcement</button> : null} />
      <div className="ds-stack">
        {d.live.length === 0 ? <EmptyState title="No announcements right now." text={d.poster ? "Post one: it reaches everyone, or one department." : "When HR or an Admin posts one, it shows here and in your bell."} />
          : <div className="posts" id="posts">{d.live.map((p) => <Post key={p.id} p={p} poster={d.poster} departments={d.departments} onEdit={setDialog} />)}</div>}
        {d.poster && d.off.length > 0 && (
          <Card id="posts-off" title="Taken down or ended" meta={`${d.off.length}`}>
            <div className="posts">{d.off.map((p) => <Post key={p.id} p={p} poster={false} departments={d.departments} onEdit={setDialog} />)}</div>
          </Card>
        )}
      </div>
      {dialog && (
        <AskDialog id={edit ? "post-edit" : "post-new"} title={edit ? "Edit the announcement" : "Post an announcement"} submitLabel={edit ? "Save" : "Post"} size="lg"
          fields={[
            { name: "title", label: "Title", required: true, maxLength: ANNOUNCEMENT_LIMITS.title, value: edit?.title ?? "", full: true },
            { name: "body", label: "Message", kind: "textarea", required: true, rows: 5, maxLength: ANNOUNCEMENT_LIMITS.body, value: edit?.body ?? "" },
            { name: "audience", label: "Send to", kind: "select", options: audienceOptions, value: edit?.audience ?? "everyone", placeholder: null },
            { name: "pinned", label: "Pin to the top", kind: "select", options: [["no", "No"], ["yes", "Yes"]], value: edit?.pinned ? "yes" : "no", placeholder: null },
            { name: "expiresOn", label: "Show until", kind: "date", value: edit?.expiresOn ?? "", hint: "Optional: the last day it shows." },
          ]}
          run={(v) => { const f = { ...v, pinned: v.pinned === "yes", expiresOn: v.expiresOn || null }; return edit ? editAnnouncement(userId, edit.id, f) : postAnnouncement(userId, f); }}
          onClose={() => setDialog(null)} onDone={() => toast(edit ? "Saved." : "Posted. The people it's for will see it in their bell.", "success")} />
      )}
    </>
  );
}

export default function Announcements() {
  return <Frame page={PAGE}><Content /></Frame>;
}