// IT2: who may open each IT desk page. The pages are the app's own (not in config/routes.js), so each draws its own guard (ui/OwnPage.jsx
// allowed) from the same rule as here; the sidebar and the search use these too. The data functions check the permissions again.
//   IT desk, IT requests   it:requests-handle (IT, Admin)
//   Licences               it:licences-manage (IT, Admin) or it:licences-view-costs (Finance)
//   Offboarding            it:offboard (IT) or it:approve (Admin)
//   IT review trail        it:activity-review (Admin)
//   My IT requests, Raise  everyone signed in (it:requests-create)
//   One request            whoever may see it: the page asks the desk
//   Complete details       assets:manage (IT, Admin)
import { can } from "../../../assets/js/core/rbac.js";
import { IT_DASHBOARD, IT_REQUESTS, IT_REQUEST, IT_NEW, IT_MINE, IT_LICENCES, IT_OFFBOARDING, IT_REVIEW, COMPLETE_DETAILS } from "../routes.js";

export const IT_PAGES = {
  [IT_DASHBOARD]: () => can("it:requests-handle") || can("it:approve"),
  [IT_REQUESTS]: () => can("it:requests-handle") || can("it:approve"),
  [IT_REQUEST]: () => true,
  [IT_NEW]: () => can("it:requests-create"),
  [IT_MINE]: () => can("it:requests-create"),
  [IT_LICENCES]: () => can("it:licences-manage") || can("it:licences-view-costs"),
  [IT_OFFBOARDING]: () => can("it:offboard") || can("it:approve"),
  [IT_REVIEW]: () => can("it:activity-review"),
  [COMPLETE_DETAILS]: () => can("assets:manage"),
};
export const isItPage = (page) => Object.hasOwn(IT_PAGES, page);
export const mayOpenItPage = (page) => isItPage(page) && IT_PAGES[page]();

// the sidebar's group (shell/appNav.js): a section with its own icon
const DESK = "M4 5h16v10H4zM2 19h20M9 15v4M15 15v4";
export const IT_NAV = {
  group: "IT desk", iconPath: DESK,
  items: [
    { label: "IT dashboard", icon: "laptop", href: IT_DASHBOARD, anyOf: ["it:requests-handle", "it:approve"] },
    { label: "IT requests", icon: "list", href: IT_REQUESTS, anyOf: ["it:requests-handle", "it:approve"] },
    { label: "My IT requests", icon: "chat", href: IT_MINE, permission: "it:requests-create" },
    { label: "Raise a request", icon: "tick", href: IT_NEW, permission: "it:requests-create" },
    { label: "Licences", icon: "tag", href: IT_LICENCES, anyOf: ["it:licences-manage", "it:licences-view-costs"] },
    { label: "Offboarding", icon: "users", href: IT_OFFBOARDING, anyOf: ["it:offboard", "it:approve"] },
    { label: "IT review trail", icon: "check", href: IT_REVIEW, permission: "it:activity-review" },
  ],
};