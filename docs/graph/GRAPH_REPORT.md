# Graph Report - officeos  (2026-11-12)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2539 nodes · 10976 edges · 79 communities (77 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 221 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78

## God Nodes (most connected - your core abstractions)
1. `el()` - 253 edges
2. `getUser()` - 162 edges
3. `formatDay()` - 153 edges
4. `nameOf()` - 136 edges
5. `todayIso()` - 94 edges
6. `plural()` - 93 edges
7. `pageUrl()` - 84 edges
8. `Frame()` - 83 edges
9. `getCurrentUserId()` - 79 edges
10. `getAllUsers()` - 77 edges

## Surprising Connections (you probably didn't know these)
- `MyLeave()` --indirect_call--> `cancelLeave()`  [INFERRED]
  app/src/pages/MyLeave.jsx → assets/js/data/leave-store.js
- `Run()` --indirect_call--> `approveRun()`  [INFERRED]
  app/src/pages/PayrollRun.jsx → assets/js/data/payroll-store.js
- `assetApprovers()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/EmployeeDashboard.jsx → assets/js/ui/leave-view.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/Expenses.jsx → assets/js/ui/leave-view.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/MyRequests.jsx → assets/js/ui/leave-view.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (79 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (67): NotBuilt(), Table(), NotPorted(), Announcements(), ACTIVE, ApprovalWorkflows(), DECIDED, DECISIONS (+59 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (75): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+67 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (65): StatCard(), StatStrip(), BarRows(), ColumnChart(), NO_DATA, NoData(), ConfirmContext, ConfirmDialog() (+57 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (71): PersonCell(), useAction(), ACTIVITY_SOURCES, AdminDashboard(), APPROVAL_TEXT, approvalItems(), chainEvents(), emptyRow() (+63 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (73): assetWhat(), assetTitle(), assetApprovers(), assetName(), applyPermissions(), waitingOn(), ASSET_TYPE_KEYS, CONDITION_KEYS (+65 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (70): recentRow(), longDate(), MarkAttendance(), ordinal(), pad(), recentRow(), recentRows(), statusOf() (+62 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (64): overWarning(), Calendar(), pad(), seedDays(), dayNumber(), dayOffChecker(), isoFromDayNumber(), isWeekend() (+56 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (57): cancelExpense(), cancelLeave(), requestsFor(), clearError(), form, showError(), balanceCard(), balanceGrid (+49 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (48): Tabs(), ASSET_FLOW, CORRECTION_FLOW, DecisionButtons(), EXPENSE_FLOW, LEAVE_FLOW, SALARY_FLOW, useDecision() (+40 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (52): Badge(), badgeOf(), Reason(), FromNode(), alertText(), approverNames(), B(), checks() (+44 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (51): ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPES, CATEGORIES, CATEGORY_KEYS, changeFor(), CONDITIONS, LOCATIONS (+43 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (51): assetsFor(), openReportOf(), chainText(), clearError(), clearReportError(), FIELD, fillReplaces(), form (+43 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (45): activityItems(), claimItems(), claimText(), COST_NOTE, EVENT, FinanceDashboard(), Icon(), ICONS (+37 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (46): resetAssetRequestData(), resetExpenseData(), resetInventoryData(), resetPayrollData(), resetDemoData(), avatarClass(), buildRow(), departmentName() (+38 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (45): movementEvent(), allAssets(), getItem(), stockOf(), movementEvent(), clearError(), deptField, deptSelect (+37 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (18): area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main(), norm_id() (+10 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (43): cancelAssetRequest(), fail(), actorWith(), allMovements(), ASSET_REFERENCE, assets, assetsHeldByInactive(), assignAsset() (+35 more)

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (41): row(), requestItems(), buildRow(), row(), timesCell(), row(), weekCell(), weekPart() (+33 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (37): activityItems(), requestName(), renderActivity(), allRows, buildRow(), changeButtons(), changesAtOnce(), closeIcon() (+29 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (35): ASSET_VERB, assetOutcome(), balanceNodes(), barLook(), EmployeeDashboard(), Icon(), ICONS, isAsset() (+27 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (37): assetRequestsFor(), regularizationsFor(), expensesFor(), openRequests(), ownRequests(), TAB, ASSET_VERB, assetApprovers() (+29 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (30): COMPANY, companyInitial(), PRODUCT, ABOUT, CompanyMark(), PoweredBy(), initialsFrom(), inRail() (+22 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (37): monthAttendanceChart(), calendarCard, cancelRequest(), cellLook(), clearErrors(), field(), FIELDS, fillMonths() (+29 more)

### Community 23 - "Community 23"
Cohesion: 0.07
Nodes (36): activeHeadcount(), activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, chainEvents(), chart (+28 more)

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (30): ALSO_FOR_MANAGERS, ROUTES, getCurrentUser(), getCurrentUserLabel(), getSession(), isSignedIn(), signIn(), signOut() (+22 more)

### Community 25 - "Community 25"
Cohesion: 0.07
Nodes (34): assetRequestDecisionsBy(), expenseDecisionsBy(), managesAnyone(), allCorrections, allLeave, assetsDecided(), assetsPending(), correctionsPending() (+26 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (35): firstStage(), nextStage(), applied(), approverMustPay(), at(), auto(), averageProcessingDays(), blank() (+27 more)

### Community 27 - "Community 27"
Cohesion: 0.07
Nodes (34): attentionCount, attentionList, attentionNote(), dateInput, deptBars, deptDate, deptSelect, emptyRow() (+26 more)

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (32): CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), holdersOf(), holdsStage(), isActive(), isHeldFor() (+24 more)

### Community 29 - "Community 29"
Cohesion: 0.11
Nodes (34): expenseSpendChart(), allExpenses(), actionsCell(), categoryCell(), claimsText(), decidableIds(), EMPTY, entryOf() (+26 more)

### Community 30 - "Community 30"
Cohesion: 0.09
Nodes (34): clock, errorLine, grace, inBtn, lateMarks, lateNote, modeInputs, note (+26 more)

### Community 31 - "Community 31"
Cohesion: 0.08
Nodes (31): ATTENDANCE_RULES, activity, approvalsList, approvalsMeta, chart, leaveNote, leaveRange, leaveRows (+23 more)

### Community 32 - "Community 32"
Cohesion: 0.10
Nodes (31): approvalItem(), newestSent(), render(), renderApprovals(), renderTable(), actionsHead, arrowIcon(), byId() (+23 more)

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (31): setStat(), renderStats(), amount(), approved(), buildRow(), field(), financialYear(), joinedNote() (+23 more)

### Community 34 - "Community 34"
Cohesion: 0.09
Nodes (28): byNonAdmin(), deletedName(), DEMO_PII, formatId(), FULL_MONTHS, isList(), loadDeletedNames(), mayPayClaim() (+20 more)

### Community 35 - "Community 35"
Cohesion: 0.14
Nodes (25): results(), SEARCH_ICON, navItemHref(), navItemVisible(), NAV, OTHER_PAGES, canOpenPage(), depthInPages() (+17 more)

### Community 36 - "Community 36"
Cohesion: 0.11
Nodes (29): overridesOf(), actions, cardTitled(), closeIcon(), daysAway(), deleteBtn, departmentName(), emptyCard() (+21 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (25): buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form, managerChoice() (+17 more)

### Community 38 - "Community 38"
Cohesion: 0.13
Nodes (28): getRegularization(), getRequest(), bellItem(), buildCard(), buildPanel(), cardOpener(), cardState(), CHAIN_STAGE (+20 more)

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (25): permissionsOf(), absencesIn(), actorWith(), approveProblem(), approveRun(), approves(), canApprove(), checkSalary() (+17 more)

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (26): headcountByDepartment(), activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el() (+18 more)

### Community 41 - "Community 41"
Cohesion: 0.18
Nodes (23): decider(), approve(), submit(), isManagerNow(), getCurrentRole(), getCurrentUserId(), pendingFor(), pendingFor() (+15 more)

### Community 42 - "Community 42"
Cohesion: 0.14
Nodes (25): addBtn, calendarCard, clearError(), dayCell(), defaultMonth(), field(), FIELDS, fillYears() (+17 more)

### Community 43 - "Community 43"
Cohesion: 0.14
Nodes (25): alertText(), askedMonth, attendanceCheck(), checkItem(), dayOf(), monthLabel(), openAbsencesText(), people() (+17 more)

### Community 44 - "Community 44"
Cohesion: 0.12
Nodes (24): clash(), overlaps(), balanceTable, calendarCard, CAPPED, dayCell(), inView(), isOff() (+16 more)

### Community 45 - "Community 45"
Cohesion: 0.11
Nodes (22): BellPanel(), Card(), cardState(), CHAIN_STAGE, CloseIcon(), connected(), DECIDED, focusables() (+14 more)

### Community 46 - "Community 46"
Cohesion: 0.18
Nodes (23): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+15 more)

### Community 47 - "Community 47"
Cohesion: 0.16
Nodes (17): signInAs(), clearError(), DEMO_USERS, escapeHtml(), MAIN, PublicPage(), RAW, showError() (+9 more)

### Community 48 - "Community 48"
Cohesion: 0.13
Nodes (18): ALL_PERMISSIONS, PERMISSIONS, OVERRIDABLE, ROLE_KEYS, ROLES, SELF_SERVICE, DEMO_USERS, loginForm (+10 more)

### Community 49 - "Community 49"
Cohesion: 0.11
Nodes (22): setStat(), actionsHead, decidedAt(), matches(), outCard, overlapAlert, paginationEl, PILL_TAB (+14 more)

### Community 50 - "Community 50"
Cohesion: 0.15
Nodes (18): EmptyState(), Icon(), Stepper(), useData(), ClaimExpense(), FIELD_ID, GROUPS, Holder() (+10 more)

### Community 51 - "Community 51"
Cohesion: 0.20
Nodes (21): save(), actorWith(), addDepartment(), commit(), copy(), deactivateUser(), deleteUser(), fail() (+13 more)

### Community 52 - "Community 52"
Cohesion: 0.26
Nodes (21): assetRow(), assetTitle(), correctionRow(), correctionTitle(), decidedRow(), expenseRow(), expenseTitle(), inboxRows() (+13 more)

### Community 53 - "Community 53"
Cohesion: 0.17
Nodes (20): correctionTitle(), decisionDate(), reachedAt(), readInbox(), waitingSince(), activityNodes(), decidedBy(), asDecidedBy() (+12 more)

### Community 54 - "Community 54"
Cohesion: 0.15
Nodes (18): CATEGORIES, CATEGORY_KEYS, chainFor(), EXPENSE_POLICY, STAGES, STAGE_NAME, renderPolicy(), BADGE (+10 more)

### Community 55 - "Community 55"
Cohesion: 0.17
Nodes (18): annualTax(), computePay(), FILING_SAMPLE, lastDay(), leap(), lossOfPayAmount(), lossOfPayDays(), monthlyTds() (+10 more)

### Community 56 - "Community 56"
Cohesion: 0.14
Nodes (19): amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD, form (+11 more)

### Community 57 - "Community 57"
Cohesion: 0.23
Nodes (18): NO_DATA, amount(), approved(), financialYear(), ICONS, joinedNote(), label(), MessageRow() (+10 more)

### Community 58 - "Community 58"
Cohesion: 0.18
Nodes (18): Actions(), BADGE, claimsText(), EMPTY, entryOf(), Expenses(), ICONS, lastAt() (+10 more)

### Community 59 - "Community 59"
Cohesion: 0.19
Nodes (17): asRequest(), decisionDays(), figures(), allAssetRequests(), allRegularizations(), getExpense(), allRequests(), salaryProposals() (+9 more)

### Community 60 - "Community 60"
Cohesion: 0.25
Nodes (16): ThemeMenu(), useAppearance(), showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme() (+8 more)

### Community 61 - "Community 61"
Cohesion: 0.21
Nodes (15): allVendors(), VENDOR_STATUS_KEYS, renderTable(), byId(), contactLine(), matches(), renderTable(), row() (+7 more)

### Community 62 - "Community 62"
Cohesion: 0.24
Nodes (17): addUser(), adminOnly(), approvedMonthCovering(), approvedMonths(), carriesAdmin(), changeUser(), emailTaken(), joiningProblem() (+9 more)

### Community 63 - "Community 63"
Cohesion: 0.14
Nodes (10): reportingManagerName(), clearError(), departmentName(), form, role, save(), SAVED, showError() (+2 more)

### Community 64 - "Community 64"
Cohesion: 0.22
Nodes (15): changesAtOnce(), editBlocked(), recordsStart(), approversFor(), byName(), payrollRun(), payrollRunFor(), prepareProblem() (+7 more)

### Community 65 - "Community 65"
Cohesion: 0.30
Nodes (12): remove(), resetAttendanceData(), copy(), createCollection(), add(), commit(), get(), getAll() (+4 more)

### Community 66 - "Community 66"
Cohesion: 0.20
Nodes (14): addHoliday(), byDate(), dayLabel(), getAllHolidays(), HOLIDAY_KINDS, holidayManager(), holidays, holidaysIn() (+6 more)

### Community 67 - "Community 67"
Cohesion: 0.25
Nodes (14): awayThrough(), monthKey(), pad(), pausedLateMarks(), payslipsFor(), plural(), rowFor(), runProblems() (+6 more)

### Community 68 - "Community 68"
Cohesion: 0.24
Nodes (12): load(), approvedRunMonths(), approvedRuns(), approvesRun(), decidesStage(), deleteProblem(), isLastAdmin(), lastApproverProblem() (+4 more)

### Community 69 - "Community 69"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 70 - "Community 70"
Cohesion: 0.31
Nodes (9): BADGE_TEXT, correctionTitle(), expenseTitle(), MyRequests(), names(), stepsOf(), TABS, TYPES (+1 more)

### Community 71 - "Community 71"
Cohesion: 0.36
Nodes (8): defaultMonth(), DOW, EMPTY, FIELD_ID, Holidays(), holidaysOf(), Icon(), pad()

### Community 72 - "Community 72"
Cohesion: 0.33
Nodes (7): CHAIN_STAGES, createChain(), holds(), managerCanDecide(), refusal(), isActive(), skippedEntry()

### Community 73 - "Community 73"
Cohesion: 0.36
Nodes (8): byName(), salaryRows(), newestFirst(), pendingSalaryProposal(), salaryFor(), salaryHistory(), byName(), salaryRows()

### Community 74 - "Community 74"
Cohesion: 0.33
Nodes (6): departmentName(), initialsFrom(), orDash(), profileOf(), maskAccount(), maskPan()

### Community 75 - "Community 75"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 76 - "Community 76"
Cohesion: 0.53
Nodes (5): belowHundred(), belowThousand(), ONES, rupeesInWords(), TENS

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 627 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `el()` connect `Community 17` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 18`, `Community 19`, `Community 20`, `Community 22`, `Community 23`, `Community 25`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 36`, `Community 37`, `Community 38`, `Community 42`, `Community 43`, `Community 44`, `Community 46`, `Community 48`, `Community 49`, `Community 52`, `Community 53`, `Community 54`, `Community 56`, `Community 61`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08339575530586767 - nodes in this community are weakly interconnected._
- **Why does `getUser()` connect `Community 28` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 12`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 36`, `Community 37`, `Community 39`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 46`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 56`, `Community 57`, `Community 58`, `Community 63`, `Community 64`, `Community 66`, `Community 67`, `Community 70`, `Community 71`, `Community 72`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06335204490777867 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 18` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 17`, `Community 19`, `Community 20`, `Community 22`, `Community 23`, `Community 25`, `Community 27`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 36`, `Community 38`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 49`, `Community 50`, `Community 52`, `Community 53`, `Community 54`, `Community 57`, `Community 58`, `Community 70`, `Community 71`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._