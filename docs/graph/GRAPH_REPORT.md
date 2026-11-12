# Graph Report - officeos  (2026-11-12)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2768 nodes · 12280 edges · 88 communities (86 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 228 edges (avg confidence: 0.85)
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
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87

## God Nodes (most connected - your core abstractions)
1. `el()` - 250 edges
2. `getUser()` - 186 edges
3. `formatDay()` - 163 edges
4. `nameOf()` - 140 edges
5. `pageUrl()` - 100 edges
6. `plural()` - 97 edges
7. `todayIso()` - 97 edges
8. `useSession()` - 93 edges
9. `Frame()` - 91 edges
10. `getAllUsers()` - 87 edges

## Surprising Connections (you probably didn't know these)
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/MyRequests.jsx → assets/js/ui/leave-view.js
- `MyLeave()` --indirect_call--> `cancelLeave()`  [INFERRED]
  app/src/pages/MyLeave.jsx → assets/js/data/leave-store.js
- `assetWhat()` --calls--> `assetTypeLabel()`  [EXTRACTED]
  app/src/pages/AdminDashboard.jsx → assets/js/ui/inventory-view.js
- `assetApprovers()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/EmployeeDashboard.jsx → assets/js/ui/leave-view.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/Expenses.jsx → assets/js/ui/leave-view.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (88 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (86): BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), MyRequests(), names(), stepsOf(), TABS (+78 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (79): ColumnChart(), ACTIVITY_SOURCES, activityItems(), APPROVAL_TEXT, approvalItems(), assetWhat(), emptyRow(), Icon() (+71 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (58): NotBuilt(), detachedRows(), Row(), Table(), tdClass(), text(), NotPorted(), Announcements() (+50 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (75): useConfirm(), described(), Field(), initialsOf(), Input(), Kv(), Person(), Select() (+67 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (68): Badge(), badgeOf(), Icon(), NO_DATA, PersonCell(), Reason(), StatCard(), StatStrip() (+60 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (71): row(), recentRow(), buildRow(), logRow(), ASIDE, byId(), decidedAt(), recordedTime() (+63 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (61): approverNames(), byName(), salaryRows(), recordsStart(), fail(), absencesIn(), actorWith(), approveProblem() (+53 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (53): approved(), listed(), missingMonthText(), monthLabel(), notesOf(), openAbsence(), orDash(), PayslipView() (+45 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (55): assetRequestDecisionsBy(), allCorrections, allLeave, asDecidedBy(), assetRow(), assetsDecided(), assetsPending(), assetTitle() (+47 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (52): allAssets(), assetsWithOpenReports(), assetTotals(), openReportOf(), ACTIONS, actionSelect, assetSelect, ASSIGN_FIELD (+44 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (45): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+37 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (48): applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkInPlan(), clockLabel(), completedSeedDay() (+40 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (42): DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), FilterSelect(), IconButton(), PRESETS, rangeFor() (+34 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (33): ConfirmContext, ConfirmDialog(), ConfirmProvider(), CloseIcon(), DISCARD, focusables(), useDialogFocus(), getVersion() (+25 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (45): ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), ICONS, isAsset(), isOff(), recentRows() (+37 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (18): area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main(), norm_id() (+10 more)

### Community 16 - "Community 16"
Cohesion: 0.08
Nodes (43): resetHolidays(), resetLeaveData(), avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el() (+35 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (43): changeFor(), stockStatus(), stockValue(), actorWith(), allMovements(), ASSET_REFERENCE, assets, assetsHeldByInactive() (+35 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (41): longDate(), BAR, HEADS, HistoryRow(), MyLeave(), PendingSteps(), StatusBadge(), MoreButton() (+33 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (40): hasPermission(), checkIn(), checkInRefusal(), checkOut(), checkOutPlan(), checkOutRefusal(), stampFields(), deviceLabel() (+32 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (39): permissionsOf(), adminOnly(), approvedRunMonths(), approvedRuns(), approvesRun(), byNonAdmin(), carriesAdmin(), decidesStage() (+31 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (37): statusOf(), checkInWindow(), nowMinutes(), clock, errorLine, grace, inBtn, lateMarks (+29 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (31): EmptyState(), GROUPS, matrixGroups(), RoleEditor(), ROLES_LIST, Tick(), CAPPED, DOW (+23 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (36): BalanceCard(), calendarCard, cellLook(), clearErrors(), field(), FIELDS, fillMonths(), form (+28 more)

### Community 24 - "Community 24"
Cohesion: 0.07
Nodes (34): attentionCount, attentionList, attentionNote(), dateInput, deptBars, deptDate, deptSelect, emptyRow() (+26 more)

### Community 25 - "Community 25"
Cohesion: 0.15
Nodes (33): setStat(), setStat(), setStat(), amount(), approved(), buildRow(), field(), financialYear() (+25 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (33): actions, cardTitled(), closeIcon(), daysAway(), deactivateDialog(), deleteBtn, departmentName(), emptyCard() (+25 more)

### Community 27 - "Community 27"
Cohesion: 0.13
Nodes (28): ALSO_FOR_MANAGERS, ROUTES, getCurrentUser(), signOut(), canOpenPage(), currentPagePath(), guardPage(), PUBLIC_PAGES (+20 more)

### Community 28 - "Community 28"
Cohesion: 0.07
Nodes (33): activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, assetWhat(), chart, deptSelect (+25 more)

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (31): ASSET_FLOW, CORRECTION_FLOW, EXPENSE_FLOW, LEAVE_FLOW, LOCATION_FLOW, SALARY_FLOW, chainEvents(), sentOn() (+23 more)

### Community 30 - "Community 30"
Cohesion: 0.10
Nodes (31): heldText(), allItems(), assetsFor(), clearError(), clearReportError(), FIELD, fillReplaces(), form (+23 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (29): annualTax(), computePay(), FILING_SAMPLE, filingDates(), lastDay(), leap(), lossOfPayAmount(), lossOfPayDays() (+21 more)

### Community 32 - "Community 32"
Cohesion: 0.09
Nodes (29): movementEvent(), ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPE_KEYS, CATEGORIES, CONDITION_KEYS, CONDITIONS, LOCATION_KEYS (+21 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (29): applyPermissions(), runTotals(), alertText(), askedMonth, attendanceCheck(), checkItem(), dayOf(), monthLabel() (+21 more)

### Community 34 - "Community 34"
Cohesion: 0.12
Nodes (29): CHAIN_STAGES, skippedEntry(), applied(), applyLeave(), approvalChainFor(), approvalChainText(), at(), balanceFor() (+21 more)

### Community 35 - "Community 35"
Cohesion: 0.15
Nodes (29): proposalDecidersFor(), allRows, buildRow(), changeButtons(), changesAtOnce(), closeIcon(), currentRows(), editBlocked() (+21 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (25): buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form, managerChoice() (+17 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (28): ACTIVE, asRequest(), DECIDED, decisionDays(), DECISIONS, EXAMPLE, exampleSteps(), figures() (+20 more)

### Community 38 - "Community 38"
Cohesion: 0.11
Nodes (29): CATEGORY_KEYS, LOCATIONS, needsReorder(), STOCK_STATUS_KEYS, stockBarPercent(), blankStock(), inventoryTotals(), reorderAlerts() (+21 more)

### Community 39 - "Community 39"
Cohesion: 0.10
Nodes (27): closeCards(), BellPanel(), Card(), CardHost(), cardState(), CHAIN_STAGE, closeApprovalCard(), closeBellPanel() (+19 more)

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (26): CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), getAssetRequest(), holdersOf(), holdsStage(), isActive() (+18 more)

### Community 41 - "Community 41"
Cohesion: 0.13
Nodes (28): averageProcessingDays(), payableFor(), actionsCell(), claimsText(), decidableIds(), EMPTY, entryOf(), lastAt() (+20 more)

### Community 42 - "Community 42"
Cohesion: 0.13
Nodes (27): bellItem(), buildCard(), buildPanel(), cardOpener(), cardState(), CHAIN_STAGE, closeApprovalCard(), closeBellPanel() (+19 more)

### Community 43 - "Community 43"
Cohesion: 0.14
Nodes (23): decider(), approve(), submit(), ok, getCurrentRole(), closeAllDropdowns(), initDropdowns(), triggerOf() (+15 more)

### Community 44 - "Community 44"
Cohesion: 0.16
Nodes (24): waitingCount(), waitingFor(), isManagerNow(), getCurrentUserId(), pendingFor(), managesAnyone(), pendingFor(), directReportsOf() (+16 more)

### Community 45 - "Community 45"
Cohesion: 0.14
Nodes (22): APP_NAV, APP_OTHER_PAGES, APP_OWN, OFFICES_ITEM, openable(), initialsFrom(), inRail(), RAIL (+14 more)

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (25): CompanyMark(), SearchOpener(), appearanceListeners, Bell(), Icon(), ThemeMenu(), Topbar(), useAppearance() (+17 more)

### Community 47 - "Community 47"
Cohesion: 0.13
Nodes (25): activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el(), ensureOption() (+17 more)

### Community 48 - "Community 48"
Cohesion: 0.12
Nodes (26): actionsHead, decidedAt(), matches(), outCard, overlapAlert, paginationEl, PILL_TAB, pills (+18 more)

### Community 49 - "Community 49"
Cohesion: 0.11
Nodes (25): actionsHead, arrowIcon(), byId(), decidedAt(), matches(), paginationEl, PILL_TAB, pills (+17 more)

### Community 50 - "Community 50"
Cohesion: 0.14
Nodes (20): NO_DATA, stampKey(), attentionItems(), attentionNote(), emptyRow(), ICONS, isAbsent(), isMissing() (+12 more)

### Community 51 - "Community 51"
Cohesion: 0.14
Nodes (19): COMPANY, companyInitial(), PRODUCT, signInAs(), Gallery(), clearError(), DEMO_USERS, escapeHtml() (+11 more)

### Community 52 - "Community 52"
Cohesion: 0.13
Nodes (21): CheckInPlaces(), departmentName(), Field(), initialsFrom(), Kv(), MyDevices(), MyProfile(), onDay() (+13 more)

### Community 53 - "Community 53"
Cohesion: 0.16
Nodes (22): createOffice(), deactivateOffice(), EDITABLE, fail(), manager(), OFFICE_RADIUS, OFFICE_STATES, OFFICE_TYPES (+14 more)

### Community 54 - "Community 54"
Cohesion: 0.17
Nodes (25): actorWith(), addDepartment(), addUser(), commit(), copy(), deactivateUser(), deleteUser(), emailTaken() (+17 more)

### Community 55 - "Community 55"
Cohesion: 0.12
Nodes (24): balanceList, chainList, clearError(), durationSelect, FIELD, form, fromInput, kvRow() (+16 more)

### Community 56 - "Community 56"
Cohesion: 0.11
Nodes (23): clearError(), deptField, deptSelect, EMPTY, FIELD, fillDepartments(), fillItems(), form (+15 more)

### Community 57 - "Community 57"
Cohesion: 0.14
Nodes (23): addBtn, calendarCard, clearError(), dayCell(), defaultMonth(), field(), FIELDS, fillYears() (+15 more)

### Community 58 - "Community 58"
Cohesion: 0.18
Nodes (22): balanceNodes(), barLook(), EmployeeDashboard(), Icon(), Balances(), leaveBalanceChart(), valuesOf(), renderHeadcount() (+14 more)

### Community 59 - "Community 59"
Cohesion: 0.16
Nodes (21): applied(), approverMustPay(), at(), auto(), blank(), by(), canPay(), expenses (+13 more)

### Community 60 - "Community 60"
Cohesion: 0.13
Nodes (21): balanceTable, calendarCard, CAPPED, dayCell(), inView(), isOff(), month, outCard (+13 more)

### Community 61 - "Community 61"
Cohesion: 0.23
Nodes (19): AdminDashboard(), summaryOfDays(), attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), expenseSpendChart(), headcountChart() (+11 more)

### Community 62 - "Community 62"
Cohesion: 0.13
Nodes (20): STAGE_NAME, amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD (+12 more)

### Community 63 - "Community 63"
Cohesion: 0.19
Nodes (19): balanceRows(), recentDays(), Calendar(), pad(), seedDays(), dayNumber(), dayOffChecker(), isDayOff() (+11 more)

### Community 64 - "Community 64"
Cohesion: 0.25
Nodes (18): amount(), approved(), financialYear(), ICONS, joinedNote(), label(), MessageRow(), monthOf() (+10 more)

### Community 65 - "Community 65"
Cohesion: 0.18
Nodes (18): expenseTotals(), runMonth(), renderPayroll(), approvalsCard, claimsText(), claimText(), EVENT, people() (+10 more)

### Community 66 - "Community 66"
Cohesion: 0.25
Nodes (16): deviceLine(), createChain(), holds(), managerCanDecide(), refusal(), isActive(), copy(), devicesFor() (+8 more)

### Community 67 - "Community 67"
Cohesion: 0.17
Nodes (16): cellLook(), DOW, EMPTY_FORM, FIELD_ID, fixableIssue(), ICONS, isOffOrEmpty(), MyAttendance() (+8 more)

### Community 68 - "Community 68"
Cohesion: 0.29
Nodes (14): load(), save(), copy(), createCollection(), add(), commit(), get(), getAll() (+6 more)

### Community 69 - "Community 69"
Cohesion: 0.23
Nodes (14): FLAG_LABEL, flagText(), iconOfPlace(), metres(), PLACE_ICON, PLACE_LABEL, stampsBy(), DAY (+6 more)

### Community 70 - "Community 70"
Cohesion: 0.21
Nodes (16): chainFor(), needsReceipt(), decideExpense(), holdersOf(), holdsStage(), isActive(), isHeldFor(), managerCanDecide() (+8 more)

### Community 71 - "Community 71"
Cohesion: 0.23
Nodes (14): allVendors(), VENDOR_STATUS_KEYS, byId(), contactLine(), matches(), renderTable(), row(), tbody (+6 more)

### Community 72 - "Community 72"
Cohesion: 0.22
Nodes (12): NoData(), activityItems(), claimText(), COST_NOTE, EVENT, FinanceDashboard(), Icon(), ICONS (+4 more)

### Community 73 - "Community 73"
Cohesion: 0.22
Nodes (13): addHoliday(), byDate(), dayLabel(), getAllHolidays(), HOLIDAY_KINDS, holidayManager(), holidays, holidaysIn() (+5 more)

### Community 74 - "Community 74"
Cohesion: 0.32
Nodes (12): isHome(), m(), MarkAttendance(), ordinal(), pad(), placeLine(), refusalText(), twelveHour() (+4 more)

### Community 75 - "Community 75"
Cohesion: 0.22
Nodes (10): getCurrentUserLabel(), getSession(), isSignedIn(), signIn(), DEMO_USERS, loginForm, clearError(), form (+2 more)

### Community 76 - "Community 76"
Cohesion: 0.27
Nodes (12): alertText(), checks(), dayOf(), monthLabel(), Months(), NoRun(), openAbsencesText(), people() (+4 more)

### Community 77 - "Community 77"
Cohesion: 0.39
Nodes (12): approvedMonthCovering(), approvedMonths(), changeUser(), joiningDate(), joiningProblem(), leavingPeriods(), leavingProblem(), localToday() (+4 more)

### Community 78 - "Community 78"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 79 - "Community 79"
Cohesion: 0.33
Nodes (10): COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS, getCompanyProfile(), loadBox() (+2 more)

### Community 80 - "Community 80"
Cohesion: 0.24
Nodes (8): clearError(), form, showError(), clearError(), form, showError(), ensureContainer(), initToasts()

### Community 81 - "Community 81"
Cohesion: 0.38
Nodes (11): closeIcon(), createDecisionFlow(), approve(), buildModal(), clearError(), openReject(), showError(), submitReject() (+3 more)

### Community 82 - "Community 82"
Cohesion: 0.36
Nodes (8): remove(), resetAttendanceData(), resetCompanyProfile(), resetAllDevices(), resetLocationData(), resetLocations(), resetOffices(), resetDemoData()

### Community 83 - "Community 83"
Cohesion: 0.33
Nodes (6): CATEGORIES, CATEGORY_KEYS, EXPENSE_POLICY, firstStage(), nextStage(), STAGES

### Community 84 - "Community 84"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 85 - "Community 85"
Cohesion: 0.60
Nodes (5): focusables(), initModals(), openedFrom, openModal(), topModal()

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 657 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 66` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 13`, `Community 14`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 40`, `Community 41`, `Community 44`, `Community 48`, `Community 49`, `Community 52`, `Community 53`, `Community 54`, `Community 55`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 67`, `Community 70`, `Community 72`, `Community 73`, `Community 74`, `Community 75`, `Community 76`, `Community 79`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.061782661782661785 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 5` to `Community 0`, `Community 1`, `Community 4`, `Community 7`, `Community 8`, `Community 9`, `Community 14`, `Community 18`, `Community 21`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 35`, `Community 36`, `Community 38`, `Community 41`, `Community 42`, `Community 44`, `Community 48`, `Community 49`, `Community 50`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 60`, `Community 62`, `Community 65`, `Community 67`, `Community 70`, `Community 71`, `Community 72`, `Community 81`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05393000573723465 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 0` to `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 14`, `Community 18`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 35`, `Community 39`, `Community 41`, `Community 42`, `Community 48`, `Community 49`, `Community 50`, `Community 52`, `Community 57`, `Community 60`, `Community 64`, `Community 65`, `Community 67`, `Community 72`, `Community 76`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._