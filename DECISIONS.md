# Decisions

One line per decision: date, round, decision, why. Newest last. Every round appends its own (see CLAUDE.md).

| date | round | decision | why |
|---|---|---|---|
| 2026-11-01 | 13U | Freeze the css pins: a css edit costs one guard check (cssguard) | css edits were tripping ~66 page pins |
| 2026-11-04 | 14A | Freeze pages and js behind pagefreeze and jsguard (suite-only, no app change) | page and js edits tripped many single pins |
| 2026-11-07 | 14F | Check-in opens 08:30 and closes at the day's own end | user ruling (14F) |
| 2026-11-08 | 14G | Approval card and the bell's list of what waits, built in stages; Approve/Reject on the card later | user ruling (14G, 3 stages) |
| 2026-11-08 | 14E | Disabled controls show why, as a visible reason line under them | a disabled control said nothing about why |
| 2026-11-09 | Contrast | Every text, field edge, switch and chip meets WCAG; dark overlay 0.86 to 0.40 | accessibility |
| 2026-11-09 | Manager scoping | Managers see direct reports' attendance and leave only; no pay, assets or exports | least access; one reporting rule (data/reporting.js) |
| 2026-11-09 | Manager scoping | The finance dashboard needs its own permission, dashboard:finance | only Finance and Admin should open it |
| 2026-11-09 | Data export | CSV exports guard formula starts, keep negatives as numbers, ISO dates, unit in the heading | spreadsheet safety and clean numbers |
| 2026-11-10 | Data export 2 | Exports carry every filtered row, a split Employee column and the office's date | the file matches what the person filtered |
| 2026-11-10 | Chart data | Each chart's numbers come from one function in data/chart-data.js, apart from drawing | the React app can redraw without touching rules |
| 2026-11-10 | Charts | Value readout under a chart at every width; non-colour cues (hatched, striped, dotted) | phones and colour-blind readers |
| 2026-11-11 | Tooling | Lean verification: traced gate, 9 shards, xmap for pixels, one full run after apply | same coverage, about half the wall time |
| 2026-11-11 | React scoping | React stage: 29 rounds, Vite + React in app/, on the old URLs | port without changing a URL or the data |
| 2026-11-11 | React scoping | Cutover in place on teamops-eh3c, with rollback by switching the service back | users keep their localStorage data |
| 2026-11-11 | React scoping | After cutover, tag the old site; remove pages/ and the page suites a week later; data suites stay | keep history, drop dead weight |
| 2026-11-11 | React scoping | Parity first; design changes only in rounds 25–26 | one change at a time, easy to review |
| 2026-11-11 | React scoping | The 10 sample pages are ported as faithful samples | no new features inside a port |
| 2026-11-11 | React scoping | The 20-day limit is cancelled; every pre-React logic item is in scope inside the React stage | nothing cut |
| 2026-11-11 | React scoping | Render build filter: ignore app/** on the live service | app pushes can't redeploy the old site |
| 2026-11-11 | React 2 | The solid Eazy-style header on every page; dark-mode search takes the page's surface colour | the approved look; a white field glared in dark |
| 2026-11-11 | React 4 | In-app dialogs replace window.confirm; each action names its own buttons | one dialog style; clearer choices |
| 2026-11-11 | React 5 | Empty ranges: chart-data empty/emptyReason, recordsStart(), runMonthState(); data only, additive | "No data in this range." from one rule |
| 2026-11-11 | React 5 | Data rounds change assets/js additively only and run the full suite set | the live static site still runs on it |
| 2026-11-12 | Chain 3 | Parking item 8 becomes round 9b (empty ranges on the attendance pages) | the rule was in, the pages weren't |
| 2026-11-12 | Chain 3 | Parking item 9 becomes round 23b: de-bridge rounds 6–9 before the polish round | Nodes.jsx is a stopgap |
| 2026-11-12 | Chain 3 | Parking item 10: route-level lazy() code splitting in round 27 | bundle over Vite's 500 kB warning |
| 2026-11-12 | React 13 | Split round 13 into 13a (pages) and 13b (the card in React with Approve/Reject) | the round was about twice the usual size |
| 2026-11-12 | React 13b | The approval card gets Approve and Reject through the pages' own decision flows | ruled in 14F (option B) |
| 2026-11-12 | React 13c | The in-app dialog wordings chosen in rounds 10–13 are kept; the 13a/13b split stands | user ruling |
| 2026-11-12 | React 13c | Leave approvals: aside under the table below 1440px so Actions is never clipped | parking item 11; the inbox's existing rule |
| 2026-11-12 | React 13c | "No data in this range." on payslips, payslip view, expenses and tax deductions | parking items 12 and 13 |
| 2026-11-12 | React 13c | The approval card's More is a secondary button; Approve stays the one primary | parking item 14 |
| 2026-11-12 | Chain 4 | Sample pages are JSX components; ?raw only for large static tables, each use listed | real components, readable diffs |
| 2026-11-12 | React 16 | Designations rebuilt from data/users.js: real titles, departments and roles; Add/Edit stay demo | 14E4 queue; the sample's numbers were invented |
| 2026-11-12 | React 16 | Designations counts leave inactive people out; the roles list still counts them | a title is a current job; a role is still held |
| 2026-11-12 | React 23 | Reports' sample chart uses ColumnChart, so its readout shows at every width | the 2026-11-10 chart ruling |
| 2026-11-12 | React 23 | Settings ported as it is; its inventory settings wait for round 17 | that store is a data round |
| 2026-11-12 | D1 | Docs, a code graph and test records live in the repo; app/, assets/, pages/ untouched | one place to read the project |
| 2026-11-12 | D1 | tests/live holds suites that run on today's code; guards and static chrome go to one archive file | small repo, nothing stored twice |
| 2026-11-12 | D1 | The repo run leaves out React att Y and pay R, V (the ruled "No data in this range." months) | they match only the rertree reference, not the old pages |
| 2026-11-12 | D2a | Design tokens in app/src/design/tokens.css, after the old css; old --color-*/--radius-* names point at them | one system now, without rewriting old page css |
| 2026-11-12 | D2a | Company details in app/src/data/company.js (Settings' sample values); shell, About, tab title, payslip read it | ruled: no stored settings yet |
| 2026-11-12 | D2a | The company's name, a link to About, replaces "OfficeOS" at the top (shell, sign-in brand panel) | white-label shell; "Powered by OfficeOS" ends every page |
| 2026-11-12 | D2a | From D2 on, pixel parity with the old site isn't required; text, behaviour and role access are | the design is new; the pixel reference is xbase's D2a baseline |
| 2026-11-12 | D2a | No bottom nav added on phones (the brief said "stays"; there was none) | a new navigation pattern needs its own ruling |
| 2026-11-12 | D2b | Charts on Recharts 3.10.1 (MIT), the map on @svg-maps/india 2.0.0 (CC BY 4.0, credited under the map); both load lazily in their own chunks | the first screen grows 15.8 kB, not 600 kB |
| 2026-11-12 | D2b | The lazy chunks import no app module but patterns.jsx (formatters come as props, the map draws its own buttons) | an import made the bundler split ds.css into a chunk loaded before the old css; D2a's pixel baseline caught it |
| 2026-11-12 | D2b | Every chart: readout line, data table ("Show as table"), patterns or dashes per series, no animation | meaning never by colour alone; calm; reduced motion for free |
| 2026-11-12 | D2b | Only the Admin dashboard's headcount moved to the new BarChart; the rest wait for the restyle sweep | one proof, parity on text (department and count pairs) |
| 2026-11-12 | D2b | IndiaMap is gallery-only: no employee or office has a state yet | no invented data; the need is in the parking lot |
| 2026-11-12 | 14 | Round 14's seven permissions live in LOCATION_PERMISSIONS / LOCATION_GRANTS, checked by hasPermission(); not in PERMISSIONS until the page round | the role editor and roles list draw from PERMISSIONS; no screen may change in a data round |
| 2026-11-12 | 14 | An employee's office and home-eligible flag are kept in the new stores (head office / false by default), not on the user record | the users box and every page reading it stay byte-identical |
| 2026-11-12 | 14 | The new stores' reads never write; a key appears on the first change | a page that only reads adds nothing to storage |
| 2026-11-12 | 14 | checkIn / checkOut take an optional stamp; checkInAt / checkOutAt check place, device and attendance before writing anything | without the new input nothing changes; a refusal writes nothing |
| 2026-11-12 | 14 | Place check: whole metres, exactly the radius is inside, accuracy over 100 m refused, homes 150 m, the nearest place inside wins | stated rules, tested at the edges |
| 2026-11-12 | 14 | Location changes aren't in ui/waiting.js yet; an Admin's own change is approved at once | inbox, sidebar and dashboard card learn the kind together (page round); as with leave |
| 2026-11-12 | 14 | COMPANY.name in app/src/data/company.js reads the company profile store (a getter, same selector) | the one file outside the data layer, as item 1 asked |
| 2026-11-12 | L0 | The 7 location permissions join PERMISSIONS (79 -> 86); everyone's self-service gains offices:view, devices:view-own, locations:set-own; Admin all | ruled: the role pages show and count them now; HR's home-eligible flag still decides set-own |
| 2026-11-12 | L0 | Offices have a state from a fixed list of 36; required on create; head office Haryana; old offices read state null | ruled; payroll's state rules (PT, LWF) need it |
| 2026-11-12 | L0 | Reset demo data also clears the company profile, offices, home locations, change requests and devices (not the browser's device token) | ruled |
| 2026-11-12 | P0 | Head office Haryana, no branches; leave bands = the scoping defaults as Admin-editable samples; new tax regime by default | ruled (payroll-rules-scoping.md E1-E3) |
| 2026-11-12 | P0 | Interns: a separate stipend template, no PF / ESI / gratuity; PF capped at the wage ceiling, with a company switch for full wages | ruled (E4, E5) |
| 2026-11-12 | P0 | Standard template basic = 50% of gross for new calculations; payslips already issued unchanged | ruled (E6) |
| 2026-11-12 | P0 | Haryana professional tax = 0, flagged unverified (the sample ₹200 stops for new calculations); no Maharashtra gender rule now | ruled (E7, E8) |
| 2026-11-12 | P0 | Cess 4% and old-regime slabs ship with commonly used values flagged "unverified"; payslips show an "unverified rates" label; no refusal to compute | ruled (E9) |
| 2026-11-12 | P0 | Gratuity is an employer accrual only; an Admin "verify rates" action (name + date per row) is required before any real use | ruled (E10, E11) |
| 2026-11-12 | L1 | The four users pages are built straight in the design system; parity is on text, behaviour and role access, read by meaning (tools/react/users.mjs) | ruled in the L brief: no old-CSS look for new screens |
| 2026-11-12 | L1 | Offices is the app's own page (/pages/company/offices.html), open to everyone, managed by the Admin; linked from About, the profile and Settings, not the sidebar | config/nav.js is the old site's; no new nav entry without a ruling |
| 2026-11-12 | L1 | Settings gains a saved Company profile section (Admin, as Settings is); About shows the overview, mission and offices | the profile store from round 14 |
| 2026-11-12 | L1 | Public pages' footer: "© <year> <company> · Powered by OfficeOS"; the brand panel's old "© 2026 OfficeOS" line removed | parking-lot item, said once |
| 2026-11-12 | L1 | The profile's Tenure says "—" with no joining date (the old page kept its static sample "5 years, 6 months") | no invented figures |
| 2026-11-12 | L2 | Offices is the last item of the sidebar's Attendance section for every role (React-only list, app/src/shell/appNav.js; config/nav.js unchanged); About stays reachable from the company name only | ruled after L1 |
| 2026-11-12 | L2 | My locations is the app's own page (/pages/account/my-locations.html), open to everyone: homes set once, then a change request with a reason; search finds it, My profile and Mark attendance link it (not in the sidebar) | the L brief; only Offices was ruled into the sidebar |
| 2026-11-12 | L2 | Location changes are the inbox's sixth kind in app/src/data/waiting.js; the inbox, card, bell, sidebar count and Admin dashboard all read it; only locations:review (Admin) decides; Reject needs a reason | counts never disagree with the list |
| 2026-11-12 | L2 | My devices on My profile reads the device token without making one, marks this browser, warns at the limit, and says a browser can't prove who uses it | reads never write |
| 2026-11-12 | L3 | Mark attendance (React) checks in and out only through checkInAt / checkOutAt: Check-In From lists only the person's places, Use my location reads once on press, one big button enabled only inside the chosen place with an allowed device; the work mode follows the place (home = work from home) | the L brief; the old work-mode radios are gone |
| 2026-11-12 | L3 | A check-out from another place than the check-in's shows a Flagged notice and asks first; a device registered to someone else checks in, flagged | flag for HR, don't block |
| 2026-11-12 | L3 | The place stamps are read from the saved attendance records in the app (app/src/data/stamps.js), not added to the derived days; the old js is untouched | no old-suite pins move |
| 2026-11-12 | L3 | Place column + Flagged badge and filter on My attendance and Team attendance (manager rule unchanged); HR dashboard gains Flagged check-ins, last 7 days | the L brief |
| 2026-11-12 | L3 | att.mjs M (Mark attendance old-vs-new parity) retired and P narrowed to Shifts: the page is redesigned; att3.mjs checks it, and My attendance's phone card | ruled by the redesign |
