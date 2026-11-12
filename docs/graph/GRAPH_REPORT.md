# Graph Report - officeos  (2026-11-12)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2442 nodes · 10636 edges · 82 communities (80 shown, 2 thin omitted)
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
- Community 79
- Community 80
- Community 81

## God Nodes (most connected - your core abstractions)
1. `el()` - 253 edges
2. `getUser()` - 162 edges
3. `formatDay()` - 149 edges
4. `nameOf()` - 136 edges
5. `plural()` - 93 edges
6. `todayIso()` - 91 edges
7. `pageUrl()` - 82 edges
8. `Frame()` - 82 edges
9. `getCurrentUserId()` - 79 edges
10. `getAllUsers()` - 77 edges

## Surprising Connections (you probably didn't know these)
- `MyLeave()` --indirect_call--> `cancelLeave()`  [INFERRED]
  app/src/pages/MyLeave.jsx → assets/js/data/leave-store.js
- `assetApprovers()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/EmployeeDashboard.jsx → assets/js/ui/leave-view.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/Expenses.jsx → assets/js/ui/leave-view.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/MyRequests.jsx → assets/js/ui/leave-view.js
- `Run()` --indirect_call--> `approveRun()`  [INFERRED]
  app/src/pages/PayrollRun.jsx → assets/js/data/payroll-store.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (82 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (71): permissionsOf(), actorWith(), addDepartment(), addUser(), adminOnly(), approvedMonthCovering(), approvedMonths(), approvedRunMonths() (+63 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (49): NotBuilt(), Table(), NotPorted(), Announcements(), AuditLog(), T1_COLUMNS, T1_ROWS(), Backup() (+41 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (61): assetWhat(), allAssets(), assetsWithOpenReports(), assetTotals(), openReportOf(), assetWhat(), ACTIONS, actionSelect (+53 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (57): assetRequestDecisionsBy(), expenseDecisionsBy(), allCorrections, allLeave, asDecidedBy(), assetRow(), assetsDecided(), assetsPending() (+49 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (56): CATEGORIES, CATEGORY_KEYS, firstStage(), needsReceipt(), nextStage(), STAGES, applied(), approverMustPay() (+48 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (47): ASSET_FLOW, CORRECTION_FLOW, decider(), DecisionButtons(), EXPENSE_FLOW, LEAVE_FLOW, SALARY_FLOW, useDecision() (+39 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (44): waitingNow(), ALSO_FOR_MANAGERS, ROUTES, getCurrentRole(), getCurrentUser(), getCurrentUserId(), getCurrentUserLabel(), getSession() (+36 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (49): fail(), actorWith(), approveProblem(), approveRun(), awayThrough(), byName(), checkSalary(), decideSalaryProposal() (+41 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (49): applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkIn(), checkOut(), clockLabel() (+41 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (48): ASSET_STATUS_KEYS, ASSET_STATUSES, CATEGORIES, CATEGORY_KEYS, CONDITION_KEYS, CONDITIONS, LOCATION_KEYS, LOCATIONS (+40 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (41): signOutNow(), initialsFrom(), inRail(), RAIL, useMedia(), results(), SEARCH_ICON, SearchBox() (+33 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (39): BarRows(), ColumnChart(), NO_DATA, NoData(), detachedRows(), Row(), tdClass(), text() (+31 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (44): changeFor(), stockStatus(), stockValue(), actorWith(), allMovements(), ASSET_REFERENCE, assets, assetsHeldByInactive() (+36 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (18): area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main(), norm_id() (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (40): activityNodes(), activityText(), emptyRow(), HrDashboard(), Icon(), ICONS, newestSent(), SAMPLE (+32 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (37): DEDUCTIONS, ICONS, people(), returnToFile(), SLABS, TaxDeductions(), annualTax(), computePay() (+29 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (32): ALL_PERMISSIONS, PERMISSIONS, OVERRIDABLE, ROLE_KEYS, SELF_SERVICE, renderRow(), rows, buildRecord() (+24 more)

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (38): movementEvent(), clearError(), deptField, deptSelect, EMPTY, FIELD, fillDepartments(), fillItems() (+30 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (38): balanceRows(), Calendar(), pad(), dayNumber(), isWeekend(), balanceFor(), daysIn(), overAllowance() (+30 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (35): CHAIN_STAGES, createChain(), holds(), managerCanDecide(), refusal(), isActive(), skippedEntry(), isoFromDayNumber() (+27 more)

### Community 20 - "Community 20"
Cohesion: 0.06
Nodes (36): activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, chainEvents(), chart, deptSelect (+28 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (35): overridesOf(), deactivateUser(), actions, cardTitled(), closeIcon(), daysAway(), deactivateDialog(), deleteBtn (+27 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (36): calendarCard, cancelRequest(), cellLook(), clearErrors(), field(), FIELDS, fillMonths(), fixableIssue() (+28 more)

### Community 23 - "Community 23"
Cohesion: 0.12
Nodes (26): getVersion(), subscribe(), signInAs(), useCan(), useSession(), useVersion(), ClaimExpense(), FIELD_ID (+18 more)

### Community 24 - "Community 24"
Cohesion: 0.15
Nodes (33): PersonCell(), buildRow(), decidedAt(), LeaveApprovals(), stageBadge(), STATS, TABS, row() (+25 more)

### Community 25 - "Community 25"
Cohesion: 0.10
Nodes (34): ASSET_TYPE_KEYS, allItems(), assetsFor(), reportProblem(), chainText(), clearError(), clearReportError(), FIELD (+26 more)

### Community 26 - "Community 26"
Cohesion: 0.08
Nodes (33): attentionCount, attentionList, attentionNote(), dateInput, deptBars, deptDate, deptSelect, emptyRow() (+25 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (30): ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), ICONS, isAsset(), requestItems(), requestName() (+22 more)

### Community 28 - "Community 28"
Cohesion: 0.09
Nodes (32): resetAssetRequestData(), resetAttendanceData(), resetExpenseData(), resetInventoryData(), resetPayrollData(), resetDemoData(), avatarClass(), buildRow() (+24 more)

### Community 29 - "Community 29"
Cohesion: 0.09
Nodes (32): clock, errorLine, grace, inBtn, lateMarks, lateNote, modeInputs, note (+24 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (29): departmentName(), Field(), initialsFrom(), Kv(), MyProfile(), orDash(), PLACEHOLDER, profileOf() (+21 more)

### Community 31 - "Community 31"
Cohesion: 0.08
Nodes (31): ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceCard, barLook(), chart, hoursNote (+23 more)

### Community 32 - "Community 32"
Cohesion: 0.10
Nodes (27): CardTitle(), closeCards(), DETAIL_PAGES, BellPanel(), Card(), CardHost(), cardOpener(), cardState() (+19 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (30): allRows, buildRow(), byName(), changeButtons(), changesAtOnce(), closeIcon(), currentRows(), editBlocked() (+22 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (27): Badge(), EmptyState(), Icon(), StatCard(), StatStrip(), Stepper(), Tabs(), ApprovalsInbox() (+19 more)

### Community 35 - "Community 35"
Cohesion: 0.15
Nodes (28): barLook(), EmployeeDashboard(), Icon(), isOff(), recentRows(), BADGE_TEXT, correctionTitle(), expenseTitle() (+20 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (29): cancelRegularization(), cancelExpense(), cancelLeave(), allRows(), assetWith(), cancelClaim(), cancelCorrection(), cancelRequest() (+21 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (28): getRegularization(), getRequest(), bellItem(), buildCard(), buildPanel(), cardOpener(), cardState(), CHAIN_STAGE (+20 more)

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (29): expenseTotals(), actionsCell(), categoryCell(), claimsText(), decidableIds(), EMPTY, entryOf(), lastAt() (+21 more)

### Community 39 - "Community 39"
Cohesion: 0.14
Nodes (28): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+20 more)

### Community 40 - "Community 40"
Cohesion: 0.17
Nodes (25): SearchOpener(), SIGN_OUT_ICON, appearanceListeners, Bell(), Icon(), ThemeMenu(), Topbar(), useAppearance() (+17 more)

### Community 41 - "Community 41"
Cohesion: 0.12
Nodes (27): pendingRegularizations(), actionsHead, arrowIcon(), byId(), decidedAt(), matches(), paginationEl, PILL_TAB (+19 more)

### Community 42 - "Community 42"
Cohesion: 0.16
Nodes (27): canApprove(), alertText(), askedMonth, attendanceCheck(), buildRow(), checkItem(), dayOf(), monthLabel() (+19 more)

### Community 43 - "Community 43"
Cohesion: 0.14
Nodes (20): ConfirmContext, ConfirmDialog(), ConfirmProvider(), useConfirm(), CloseIcon(), DISCARD, focusables(), Modal() (+12 more)

### Community 44 - "Community 44"
Cohesion: 0.09
Nodes (25): ACTIVITY_SOURCES, APPROVAL_TEXT, approvalItems(), chainEvents(), ICONS, MOVEMENT_DOT, movementEvent(), STEP_DOT (+17 more)

### Community 45 - "Community 45"
Cohesion: 0.15
Nodes (26): alertText(), approverNames(), B(), checks(), dayOf(), DONE, monthLabel(), Months() (+18 more)

### Community 46 - "Community 46"
Cohesion: 0.13
Nodes (26): addBtn, calendarCard, clearError(), dayCell(), defaultMonth(), field(), FIELDS, fillYears() (+18 more)

### Community 47 - "Community 47"
Cohesion: 0.12
Nodes (26): actionsHead, decidedAt(), matches(), outCard, overlapAlert, paginationEl, PILL_TAB, pills (+18 more)

### Community 48 - "Community 48"
Cohesion: 0.19
Nodes (26): amount(), approved(), buildRow(), field(), financialYear(), joinedNote(), label(), messageRow() (+18 more)

### Community 49 - "Community 49"
Cohesion: 0.17
Nodes (23): CHAIN, decideAssetRequest(), fulfilAssetRequest(), getAssetRequest(), holdersOf(), holdsStage(), isActive(), isHeldFor() (+15 more)

### Community 50 - "Community 50"
Cohesion: 0.13
Nodes (24): activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el(), ensureOption() (+16 more)

### Community 51 - "Community 51"
Cohesion: 0.10
Nodes (14): DEPARTMENTS, DESIGNATIONS, MANAGER_OF, PROFILE_DETAILS, USERS, clearError(), departmentName(), form (+6 more)

### Community 52 - "Community 52"
Cohesion: 0.23
Nodes (22): row(), recentRow(), recentRow(), logRow(), row(), weekCell(), row(), recentRow() (+14 more)

### Community 53 - "Community 53"
Cohesion: 0.20
Nodes (21): badgeOf(), NO_DATA, Reason(), amount(), approved(), financialYear(), ICONS, joinedNote() (+13 more)

### Community 54 - "Community 54"
Cohesion: 0.16
Nodes (18): attentionItems(), attentionNote(), emptyRow(), ICONS, isAbsent(), isMissing(), NO_RECORD, TAB_LABELS (+10 more)

### Community 55 - "Community 55"
Cohesion: 0.19
Nodes (20): allExpenses(), payslipTotals(), renderPolicy(), approvalsCard, claimsText(), claimText(), EVENT, people() (+12 more)

### Community 56 - "Community 56"
Cohesion: 0.12
Nodes (20): balanceTable, calendarCard, CAPPED, dayCell(), inView(), isOff(), month, outCard (+12 more)

### Community 57 - "Community 57"
Cohesion: 0.19
Nodes (19): activityItems(), emptyRow(), actionsCell(), assetCell(), row(), renderRecent(), row(), renderBadMonth() (+11 more)

### Community 58 - "Community 58"
Cohesion: 0.25
Nodes (18): summaryOfDays(), attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), expenseSpendChart(), headcountChart(), HOURS_DATA (+10 more)

### Community 59 - "Community 59"
Cohesion: 0.15
Nodes (18): LEAVE_TYPES, balanceCard(), balanceGrid, BAR, fillYears(), holidayList, paginationEl, pendingCard (+10 more)

### Community 60 - "Community 60"
Cohesion: 0.25
Nodes (17): closeIcon(), createDecisionFlow(), approve(), buildModal(), clearError(), openReject(), showError(), submitReject() (+9 more)

### Community 61 - "Community 61"
Cohesion: 0.15
Nodes (16): AdminDashboard(), Icon(), listText(), sentOn(), claimText(), COST_NOTE, EVENT, FinanceDashboard() (+8 more)

### Community 62 - "Community 62"
Cohesion: 0.18
Nodes (17): Actions(), BADGE, claimsText(), EMPTY, entryOf(), Expenses(), ICONS, lastAt() (+9 more)

### Community 63 - "Community 63"
Cohesion: 0.21
Nodes (15): applyPermissions(), allVendors(), byId(), contactLine(), matches(), renderTable(), row(), tbody (+7 more)

### Community 64 - "Community 64"
Cohesion: 0.23
Nodes (17): cellText(), COLUMNS, csvCell(), csvText(), downloadCsv(), exportStatsAsCsv(), exportTableAsCsv(), initExports() (+9 more)

### Community 65 - "Community 65"
Cohesion: 0.18
Nodes (15): useData(), ApplyLeave(), ERROR_ID, FOCUS, Kv(), typeMeta(), GROUPS, Holder() (+7 more)

### Community 66 - "Community 66"
Cohesion: 0.18
Nodes (16): cancelAssetRequest(), closeAssetRequest(), assetRow(), cancelAsset(), assetRequestSteps(), BADGE, closeFlow, describeRequest() (+8 more)

### Community 67 - "Community 67"
Cohesion: 0.18
Nodes (16): seedDays(), addHoliday(), byDate(), dayLabel(), dayOffChecker(), getAllHolidays(), HOLIDAY_KINDS, holidayManager() (+8 more)

### Community 68 - "Community 68"
Cohesion: 0.33
Nodes (13): load(), remove(), save(), copy(), createCollection(), add(), commit(), get() (+5 more)

### Community 69 - "Community 69"
Cohesion: 0.28
Nodes (15): leaveWhat(), leaveRow(), HistoryRow(), cancelRequest(), leaveWhat(), requestName(), activityText(), leaveRow() (+7 more)

### Community 70 - "Community 70"
Cohesion: 0.26
Nodes (10): ASIDE, byId(), decidedAt(), recordedTime(), tabRequests(), TABS, timesCell(), allRegularizations() (+2 more)

### Community 71 - "Community 71"
Cohesion: 0.26
Nodes (11): allAssetRequests(), getExpense(), asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys(), PASSED (+3 more)

### Community 72 - "Community 72"
Cohesion: 0.26
Nodes (9): clearError(), form, showError(), clearError(), form, showError(), ensureContainer(), initToasts() (+1 more)

### Community 73 - "Community 73"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 74 - "Community 74"
Cohesion: 0.38
Nodes (10): longDate(), MarkAttendance(), ordinal(), pad(), recentRows(), statusOf(), twelveHour(), useMinute() (+2 more)

### Community 75 - "Community 75"
Cohesion: 0.31
Nodes (10): setStat(), setStat(), renderJoiners(), setStat(), renderStats(), setStat(), setStat(), setOptionalStatNote() (+2 more)

### Community 76 - "Community 76"
Cohesion: 0.36
Nodes (10): balanceNodes(), valuesOf(), renderHeadcount(), renderBalanceCard(), renderSpend(), renderValue(), renderSummary(), renderDepartments() (+2 more)

### Community 77 - "Community 77"
Cohesion: 0.33
Nodes (8): buildOption(), closeIcon(), iconButton(), renderSearch(), close(), draw(), setActive(), shutBox()

### Community 78 - "Community 78"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 81 - "Community 81"
Cohesion: 1.00
Nodes (3): closeAllDropdowns(), initDropdowns(), triggerOf()

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 612 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `el()` connect `Community 57` to `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 9`, `Community 11`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 20`, `Community 21`, `Community 22`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 29`, `Community 31`, `Community 33`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 41`, `Community 42`, `Community 44`, `Community 46`, `Community 47`, `Community 48`, `Community 52`, `Community 54`, `Community 55`, `Community 56`, `Community 59`, `Community 60`, `Community 61`, `Community 63`, `Community 66`, `Community 69`, `Community 70`, `Community 74`, `Community 76`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07668231611893583 - nodes in this community are weakly interconnected._
- **Why does `getUser()` connect `Community 24` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 16`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 26`, `Community 27`, `Community 29`, `Community 30`, `Community 31`, `Community 33`, `Community 35`, `Community 36`, `Community 38`, `Community 39`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 51`, `Community 53`, `Community 55`, `Community 56`, `Community 58`, `Community 59`, `Community 61`, `Community 62`, `Community 65`, `Community 66`, `Community 67`, `Community 69`, `Community 70`, `Community 74`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11106639839034205 - nodes in this community are weakly interconnected._
- **Why does `getCurrentUserId()` connect `Community 6` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 10`, `Community 14`, `Community 16`, `Community 17`, `Community 18`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 26`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 41`, `Community 42`, `Community 43`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 50`, `Community 51`, `Community 55`, `Community 56`, `Community 59`, `Community 60`, `Community 62`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._