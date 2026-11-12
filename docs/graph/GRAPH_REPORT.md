# Graph Report - officeos  (2026-11-12)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2645 nodes · 11281 edges · 81 communities (79 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 222 edges (avg confidence: 0.85)
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

## God Nodes (most connected - your core abstractions)
1. `el()` - 253 edges
2. `getUser()` - 176 edges
3. `formatDay()` - 153 edges
4. `nameOf()` - 136 edges
5. `todayIso()` - 94 edges
6. `plural()` - 93 edges
7. `pageUrl()` - 84 edges
8. `Frame()` - 83 edges
9. `getCurrentUserId()` - 79 edges
10. `getAllUsers()` - 77 edges

## Surprising Connections (you probably didn't know these)
- `assetApprovers()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/EmployeeDashboard.jsx → assets/js/ui/leave-view.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/Expenses.jsx → assets/js/ui/leave-view.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/MyRequests.jsx → assets/js/ui/leave-view.js
- `MyLeave()` --indirect_call--> `cancelLeave()`  [INFERRED]
  app/src/pages/MyLeave.jsx → assets/js/data/leave-store.js
- `MarkAttendance()` --indirect_call--> `checkIn()`  [INFERRED]
  app/src/pages/MarkAttendance.jsx → assets/js/data/attendance-store.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (81 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (76): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+68 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (83): chainEvents(), assetTitle(), correctionTitle(), decisionDate(), expenseTitle(), FLOW, leaveTitle(), reachedAt() (+75 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (58): EmptyState(), NotBuilt(), Table(), NotPorted(), Announcements(), AuditLog(), T1_COLUMNS, T1_ROWS() (+50 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (75): leaveRow(), OutNextWeek(), pendingFor(), renderApprovals(), sentOn(), renderPendingApprovals(), activity, approvalItem() (+67 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (67): addBtn, calendarCard, clearError(), dayCell(), defaultMonth(), field(), FIELDS, fillYears() (+59 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (47): getVersion(), listeners, subscribe(), COMPANY, companyInitial(), PRODUCT, tabTitle(), signInAs() (+39 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (62): recentRows(), fixableIssue(), Calendar(), pad(), applyCorrection(), attendance, byName(), chain (+54 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (61): byName(), changesAtOnce(), editBlocked(), salaryRows(), permissionsOf(), recordsStart(), fail(), absencesIn() (+53 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (62): allAssetRequests(), assetsHeldByInactive(), assetsWithOpenReports(), assetTotals(), earliestHandOver(), openReportOf(), ACTIONS, actionsCell() (+54 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (56): Badge(), Icon(), StatCard(), StatStrip(), Stepper(), Tabs(), BarRows(), DecisionButtons() (+48 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (59): load(), actorWith(), addDepartment(), addUser(), adminOnly(), approvesRun(), byNonAdmin(), carriesAdmin() (+51 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (51): activityItems(), claimItems(), claimText(), COST_NOTE, EVENT, FinanceDashboard(), Icon(), ICONS (+43 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (50): row(), recentRow(), buildRow(), recentRow(), logRow(), ASIDE, byId(), decidedAt() (+42 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (51): ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPES, CATEGORIES, CATEGORY_KEYS, CONDITION_KEYS, CONDITIONS, LOCATION_KEYS (+43 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (49): BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), MyRequests(), names(), stepsOf(), TABS (+41 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (47): resetAssetRequestData(), resetAttendanceData(), resetExpenseData(), resetInventoryData(), resetPayrollData(), resetDemoData(), avatarClass(), buildRow() (+39 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (34): Reason(), ConfirmContext, ConfirmDialog(), ConfirmProvider(), useConfirm(), CORRECTION_FLOW, SALARY_FLOW, CloseIcon() (+26 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (18): area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main(), norm_id() (+10 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (42): changeFor(), stockStatus(), stockValue(), actorWith(), allMovements(), ASSET_REFERENCE, assets, assignAsset() (+34 more)

### Community 19 - "Community 19"
Cohesion: 0.10
Nodes (35): detachedRows(), Row(), tdClass(), text(), useAction(), longDate(), MarkAttendance(), ordinal() (+27 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (35): ColumnChart(), NO_DATA, NoData(), ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT, approvalItems() (+27 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (37): PersonCell(), ApplyLeave(), balanceRows(), ERROR_ID, FOCUS, Kv(), typeMeta(), alertText() (+29 more)

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (37): overridesOf(), assetsFor(), reportingManagerName(), actions, cardTitled(), closeIcon(), daysAway(), deactivateDialog() (+29 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (37): hasPermission(), checkInRefusal(), checkOutRefusal(), ACCURACY_LIMIT_M, active(), allLocationChanges(), answer(), applyChange() (+29 more)

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (36): CHAIN_STAGES, skippedEntry(), dayOffChecker(), isWeekend(), resetHolidays(), applied(), applyLeave(), at() (+28 more)

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (34): ATTENDANCE_RULES, nowMinutes(), clock, errorLine, grace, inBtn, lateMarks, lateNote (+26 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (32): balanceNodes(), summaryOfDays(), attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), expenseSpendChart(), headcountChart() (+24 more)

### Community 27 - "Community 27"
Cohesion: 0.07
Nodes (32): pendingRegularizations(), attentionCount, attentionList, attentionNote(), dateInput, deptBars, deptDate, deptSelect (+24 more)

### Community 28 - "Community 28"
Cohesion: 0.10
Nodes (33): calendarCard, cellLook(), clearErrors(), field(), FIELDS, fixableIssue(), form, isOffOrEmpty() (+25 more)

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (29): badgeOf(), departmentName(), Field(), initialsFrom(), Kv(), MyProfile(), orDash(), PLACEHOLDER (+21 more)

### Community 30 - "Community 30"
Cohesion: 0.09
Nodes (31): ASSET_FLOW, closeCards(), BellPanel(), Card(), CardHost(), cardOpener(), cardState(), CHAIN_STAGE (+23 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (32): applyPermissions(), renderTotal(), renderAssets(), alertText(), approverNames(), askedMonth, attendanceCheck(), buildRow() (+24 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (32): averageProcessingDays(), payableFor(), actionsCell(), categoryCell(), claimsText(), decidableIds(), EMPTY, entryOf() (+24 more)

### Community 33 - "Community 33"
Cohesion: 0.14
Nodes (27): results(), navItemVisible(), ALSO_FOR_MANAGERS, ROUTES, getCurrentUser(), isSignedIn(), signOut(), canOpenPage() (+19 more)

### Community 34 - "Community 34"
Cohesion: 0.16
Nodes (26): isManagerNow(), ok, getCurrentRole(), redirectToLanding(), depthInPages(), resolvePageLink(), resolveRootLink(), rootPrefix() (+18 more)

### Community 35 - "Community 35"
Cohesion: 0.13
Nodes (28): annualTax(), computePay(), FILING_SAMPLE, filingDates(), lastDay(), leap(), lossOfPayAmount(), lossOfPayDays() (+20 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (25): buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form, managerChoice() (+17 more)

### Community 37 - "Community 37"
Cohesion: 0.14
Nodes (29): applied(), approverMustPay(), at(), auto(), blank(), by(), canPay(), decideExpense() (+21 more)

### Community 38 - "Community 38"
Cohesion: 0.11
Nodes (29): ASSET_TYPE_KEYS, chainText(), clearError(), clearReportError(), FIELD, fillReplaces(), form, ICON (+21 more)

### Community 39 - "Community 39"
Cohesion: 0.09
Nodes (29): ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceCard, chart, hoursNote, hoursRange (+21 more)

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (28): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+20 more)

### Community 41 - "Community 41"
Cohesion: 0.10
Nodes (26): MOVEMENT_TYPE_KEYS, allAssets(), allItems(), clearError(), deptField, deptSelect, EMPTY, FIELD (+18 more)

### Community 42 - "Community 42"
Cohesion: 0.13
Nodes (26): getDepartment(), headcountByDepartment(), activeInput, addBtn, buildCard(), clearError(), codeInput, descEl (+18 more)

### Community 43 - "Community 43"
Cohesion: 0.12
Nodes (26): actionsHead, arrowIcon(), byId(), decidedAt(), matches(), paginationEl, PILL_TAB, pills (+18 more)

### Community 44 - "Community 44"
Cohesion: 0.16
Nodes (24): CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), holdersOf(), holdsStage(), isActive(), isHeldFor() (+16 more)

### Community 45 - "Community 45"
Cohesion: 0.11
Nodes (26): allRequests(), overlaps(), getAllUsers(), loadRows(), render(), balanceTable, calendarCard, CAPPED (+18 more)

### Community 46 - "Community 46"
Cohesion: 0.12
Nodes (26): PAST_DAY_WINDOW, balanceList, chainList, clearError(), currentDays(), durationSelect, FIELD, form (+18 more)

### Community 47 - "Community 47"
Cohesion: 0.08
Nodes (26): activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, assetWhat(), chart, deptSelect (+18 more)

### Community 48 - "Community 48"
Cohesion: 0.19
Nodes (26): amount(), approved(), buildRow(), field(), financialYear(), joinedNote(), label(), messageRow() (+18 more)

### Community 49 - "Community 49"
Cohesion: 0.12
Nodes (23): getExpense(), renderExample(), buildCard(), buildPanel(), cardState(), CHAIN_STAGE, closeApprovalCard(), closeBellPanel() (+15 more)

### Community 50 - "Community 50"
Cohesion: 0.20
Nodes (24): leaveWhat(), requestName(), activityText(), HistoryRow(), cancelRequest(), leaveWhat(), requestName(), removeOne() (+16 more)

### Community 51 - "Community 51"
Cohesion: 0.10
Nodes (14): DEPARTMENTS, DESIGNATIONS, MANAGER_OF, PROFILE_DETAILS, USERS, clearError(), departmentName(), form (+6 more)

### Community 52 - "Community 52"
Cohesion: 0.13
Nodes (19): ALL_LOCATION_PERMISSIONS, ALL_PERMISSIONS, LOCATION_PERMISSIONS, EVERYONE_LOCATION, LOCATION_GRANTS, OVERRIDABLE, ROLE_KEYS, ROLES (+11 more)

### Community 53 - "Community 53"
Cohesion: 0.19
Nodes (21): copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), getOffices(), headOffice() (+13 more)

### Community 54 - "Community 54"
Cohesion: 0.16
Nodes (20): assetWhat(), ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), barLook(), EmployeeDashboard(), Icon() (+12 more)

### Community 55 - "Community 55"
Cohesion: 0.23
Nodes (19): NO_DATA, amount(), approved(), financialYear(), ICONS, joinedNote(), label(), MessageRow() (+11 more)

### Community 56 - "Community 56"
Cohesion: 0.17
Nodes (18): overWarning(), createChain(), holds(), managerCanDecide(), refusal(), isActive(), submitExpense(), approvalChainFor() (+10 more)

### Community 57 - "Community 57"
Cohesion: 0.22
Nodes (18): ThemeMenu(), useAppearance(), showSavedTheme(), themeRadios, ACCENTS, announce(), applyAccent(), applyTheme() (+10 more)

### Community 58 - "Community 58"
Cohesion: 0.18
Nodes (18): salaryProposals(), setStat(), asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys(), PASSED (+10 more)

### Community 59 - "Community 59"
Cohesion: 0.14
Nodes (19): amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD, form (+11 more)

### Community 60 - "Community 60"
Cohesion: 0.20
Nodes (15): allVendors(), VENDOR_STATUS_KEYS, byId(), contactLine(), matches(), renderTable(), row(), tbody (+7 more)

### Community 61 - "Community 61"
Cohesion: 0.15
Nodes (17): LEAVE_TYPES, balanceCard(), balanceGrid, BAR, fillYears(), holidayList, paginationEl, pendingCard (+9 more)

### Community 62 - "Community 62"
Cohesion: 0.19
Nodes (15): cellLook(), DOW, EMPTY_FORM, FIELD_ID, ICONS, isOffOrEmpty(), latestNote(), MyAttendance() (+7 more)

### Community 63 - "Community 63"
Cohesion: 0.17
Nodes (13): decider(), approve(), submit(), getCurrentUserId(), getCurrentUserLabel(), getSession(), signIn(), DEMO_USERS (+5 more)

### Community 64 - "Community 64"
Cohesion: 0.20
Nodes (15): remove(), COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS, getCompanyProfile() (+7 more)

### Community 65 - "Community 65"
Cohesion: 0.21
Nodes (13): CheckIcon(), PendingSteps(), Step(), currentApproverName(), checkIcon(), HALF, MONTH_NAMES, MONTHS (+5 more)

### Community 66 - "Community 66"
Cohesion: 0.20
Nodes (12): cancelRegularization(), clearError(), form, showError(), cancelRequest(), cancelCorrection(), clearError(), form (+4 more)

### Community 67 - "Community 67"
Cohesion: 0.26
Nodes (14): copy(), deviceLabel(), devicesFor(), deviceToken(), fail(), MAX_DEVICES, mine(), peekDevice() (+6 more)

### Community 68 - "Community 68"
Cohesion: 0.20
Nodes (14): addHoliday(), byDate(), dayLabel(), getAllHolidays(), HOLIDAY_KINDS, holidayManager(), holidays, holidaysIn() (+6 more)

### Community 69 - "Community 69"
Cohesion: 0.18
Nodes (13): ACTIVE, asRequest(), DECIDED, decisionDays(), DECISIONS, EXAMPLE, exampleSteps(), figures() (+5 more)

### Community 70 - "Community 70"
Cohesion: 0.35
Nodes (11): save(), copy(), createCollection(), add(), commit(), get(), getAll(), loadBox() (+3 more)

### Community 71 - "Community 71"
Cohesion: 0.28
Nodes (11): ICONS, SECTION_ICONS, initRail(), close(), fit(), open(), inRail(), renderFooter() (+3 more)

### Community 72 - "Community 72"
Cohesion: 0.29
Nodes (12): approvedMonthCovering(), approvedMonths(), approvedRunMonths(), approvedRuns(), joiningProblem(), leavingPeriods(), leavingProblem(), localToday() (+4 more)

### Community 73 - "Community 73"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 74 - "Community 74"
Cohesion: 0.28
Nodes (9): movementEvent(), getItem(), stockOf(), movementEvent(), icon(), row(), fillTypes(), movementTypeLabel() (+1 more)

### Community 75 - "Community 75"
Cohesion: 0.39
Nodes (7): waitingOn(), assetRequestSteps(), BADGE, lastEntry(), names(), onDay(), STEP_TITLE

### Community 76 - "Community 76"
Cohesion: 0.36
Nodes (7): ADDRESS_MAX, coordsProblem(), distanceM(), isNum(), placeProblem(), pureBox(), rad()

### Community 77 - "Community 77"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 80 - "Community 80"
Cohesion: 1.00
Nodes (3): closeAllDropdowns(), initDropdowns(), triggerOf()

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 649 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 56` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 16`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 50`, `Community 51`, `Community 53`, `Community 54`, `Community 55`, `Community 59`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 67`, `Community 68`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.062434691745036575 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 12` to `Community 1`, `Community 3`, `Community 4`, `Community 6`, `Community 8`, `Community 9`, `Community 11`, `Community 13`, `Community 14`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 31`, `Community 32`, `Community 35`, `Community 36`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 43`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 52`, `Community 54`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 65`, `Community 74`, `Community 75`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06201550387596899 - nodes in this community are weakly interconnected._
- **Why does `getCurrentUserId()` connect `Community 63` to `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 14`, `Community 16`, `Community 18`, `Community 21`, `Community 22`, `Community 25`, `Community 27`, `Community 28`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 36`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 59`, `Community 61`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._