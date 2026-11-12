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
