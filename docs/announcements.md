# Announcements (SD1)

Built in SD1 (2026-11-28). The old static page (`pages/announcements/announcements.html`) held only fixed sample cards and F2 hid it; SD1 brings it back for everyone as an app page with a small store of its own.

## The data: `assets/js/data/announcements.js`

One key, `officeos:announcements`: `{ version: 1, next: { post, notice }, posts, notices }`, read through `places.js` `pureBox`. A read never writes, so until the first post is made everyone reads the seed.

- **The seed:** three short sample posts, marked `sample` (a pinned one for everyone, one for everyone, one for Engineering). Samples never make a bell notice.
- **A post:** `{ id "AN-n", title, body, audience, pinned, expiresOn, postedBy, postedAt, editedBy, editedAt, endedBy, endedAt }`.
  - The title takes 3 to 120 characters and the message 3 to 2,000. Neither may contain `<` or `>`.
  - `audience` is `"everyone"` or a department's code.
  - `expiresOn` is a day, or none. The post shows through that office day. The day can't be in the past and can be at most a year away.
- **A notice:** `{ id "ANN-n", userId, postId, at, read }`. There is one per person and post, made lazily by `syncAnnouncementNotices` and never twice. It stores no words: the bell draws "New announcement: <title>" when it is read, and only while the person may still read the post.

| function | what |
|---|---|
| `announcementsFor(viewer, now)` | the live posts meant for the viewer (everyone's and their department's), pinned first, then newest |
| `allAnnouncements(viewer, now)` | every post, ended and expired ones too, each with `state` live / expired / ended (for `announcements:create`) |
| `getAnnouncement(viewer, id, now)` | one post, or `null` when it isn't the viewer's to read |
| `postAnnouncement(actor, fields, now)` | a new post; a refusal names its field, in plain words |
| `editAnnouncement(actor, id, changes, now)` | title, message, audience, pin and end date only; a taken-down post can't be edited |
| `setAnnouncementPinned(actor, id, pinned, now)` | pin or unpin |
| `endAnnouncement(actor, id, now)` | takes the post down at once; it can't come back (post it again) |
| `syncAnnouncementNotices(viewer, now)` | makes the viewer's missing notices: posts made in the app, live, meant for them and not their own |
| `announcementNoticesFor(viewer, { unreadOnly })` · `markAnnouncementRead(viewer, postId)` | the bell's list; read when the page is opened |
| `mayPost(viewer)` · `audienceCount(audience)` | who may post; how many active people a post reaches |

## Who

No new permission. `announcements:view` (every role) reads the posts. `announcements:create` (HR and the Admin, overridable) posts, edits, pins and takes down any post, and also sees posts that have ended. An inactive person reads nothing.

## The audit trail

Three kinds: `announcement-posted`, `announcement-changed` and `announcement-ended`. Each line holds the post's id and the audience or the changed field names, never the title or the message.

## Screens

- **Announcements** (`announcements/announcements.html`, everyone):
  - the posts, pinned first, each with who posted it, the day ("16 Nov 2026") and the audience;
  - for those who may post: New announcement, Edit, Pin / Unpin and Take down (asked first), and a list of the posts that have ended or expired;
  - opening the page marks its bell notices read.
- **Dashboard card** (every dashboard): the newest posts, with "See all" (or "Post or see all").
- **The bell:** an Announcements section lists the unread notices. The bell now shows for anyone with an unread update, even someone with no approvals inbox.

## Choices made where the brief was silent

- Taking a post down is permanent.
- There are no read counts: the notice's `read` flag is per person and nobody else sees it.
- The poster gets no notice of their own post.

## Checks

`tests/live/sd1.mjs` (P, A, N, L; 3 zones) and `tests/live/react/sd1.mjs` A.
