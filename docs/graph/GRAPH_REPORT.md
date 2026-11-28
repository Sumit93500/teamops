# Graph Report - officeos  (2026-11-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 4716 nodes · 22455 edges · 106 communities (103 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 372 edges (avg confidence: 0.85)
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
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104

## God Nodes (most connected - your core abstractions)
1. `getUser()` - 334 edges
2. `el()` - 258 edges
3. `useSession()` - 239 edges
4. `formatDay()` - 230 edges
5. `useData()` - 193 edges
6. `pageUrl()` - 183 edges
7. `nameOf()` - 170 edges
8. `useToast()` - 143 edges
9. `getAllUsers()` - 143 edges
10. `todayIso()` - 140 edges

## Surprising Connections (you probably didn't know these)
- `visitDates()` --calls--> `formatDay()`  [EXTRACTED]
  app/src/components/Decision.jsx → assets/js/ui/leave-view.js
- `assetApprovers()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/EmployeeDashboard.jsx → assets/js/ui/leave-view.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/Expenses.jsx → assets/js/ui/leave-view.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/MyRequests.jsx → assets/js/ui/leave-view.js
- `CompanyProfile()` --indirect_call--> `updateCompanyProfile()`  [INFERRED]
  app/src/pages/CompanyProfile.jsx → assets/js/data/company-store.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (106 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (103): COMPANY, companyInitial(), PRODUCT, tabTitle(), signInAs(), signOutNow(), useSession(), refreshPrefs() (+95 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (109): ASSET_FLOW, IT_FLOW, LEAVE_FLOW, LOCATION_FLOW, OVERTIME_FLOW, PROFILE_FLOW, SALARY_FLOW, timeOf() (+101 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (110): allAssetRequests(), changeFor(), needsReorder(), stockStatus(), stockValue(), actorWith(), allAssets(), allItems() (+102 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (97): BarRows(), ColumnChart(), NO_DATA, NoData(), flaggedCell(), stampKey(), row(), asOld() (+89 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (102): applyPermissions(), inventoryValueChart(), ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPES, CATEGORY_KEYS, CONDITION_KEYS, LOCATION_KEYS (+94 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (97): NotBuilt(), Reason(), StatCard(), StatStrip(), slipTotals(), EVENT, FinanceDashboard(), ICONS (+89 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (99): leaveWhat(), requestName(), BalanceCard(), Balances(), BAR, HEADS, HistoryRow(), MyLeave() (+91 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (87): ICON, ARROW, KpiCard(), linePath(), PageHeader(), Pill(), detachedRows(), Row() (+79 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (85): Content(), FAQ, Help(), helpFor(), ANNOUNCEMENTS, EXPORT_DATA, EXPORT_PAY, HELP (+77 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (88): badgeOf(), EXPENSE_FLOW, Actions(), BADGE, claimsText(), EMPTY, entryOf(), Expenses() (+80 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (81): described(), Field(), Input(), Person(), Select(), Switch(), TextArea(), Modal() (+73 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (76): NO_DATA, AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend() (+68 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (76): byDue(), Content(), dueWords(), MyTodo(), QuickAdd(), Row(), sectionOf(), SECTIONS (+68 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (79): assetApprovers(), assetName(), emptyNote(), isAsset(), requestItems(), updateNodes(), row(), assetRow() (+71 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (77): actorWith(), addDepartment(), addItDepartment(), addUser(), adminOnly(), approvedMonthCovering(), approvedMonths(), approvedRunMonths() (+69 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (74): asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys(), PASSED, render(), stat() (+66 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (76): active(), addAsset(), addDaysIso(), addVendor(), ASSET_FIELDS, assetEvents(), assetFields(), assetsNotReturned() (+68 more)

### Community 17 - "Community 17"
Cohesion: 0.06
Nodes (61): initialsOf(), getVersion(), listeners, subscribe(), acquireFileUrl(), guardViewer(), live, releaseFileUrl() (+53 more)

### Community 18 - "Community 18"
Cohesion: 0.06
Nodes (66): ActionsCell(), changesAtOnce(), editBlocked(), itLookup(), itRows(), getCurrentUserId(), proposalDecidersFor(), clearError() (+58 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (68): CSV_LIMITS, decodeText(), RFC-4180, parseCsv(), protectCell(), quote(), tooMany(), utf8() (+60 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (71): itDeskNumbers(), overridesOf(), permissionsOf(), active(), addComment(), addRequest(), adminCount(), approveRequest() (+63 more)

### Community 21 - "Community 21"
Cohesion: 0.06
Nodes (66): CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), holdersOf(), holdsStage(), isActive(), isHeldFor() (+58 more)

### Community 22 - "Community 22"
Cohesion: 0.07
Nodes (68): balanceRows(), Calendar(), pad(), skippedEntry(), seedDays(), dayNumber(), dayOffChecker(), isoFromDayNumber() (+60 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (60): EmptyState(), Icon(), Tabs(), Content(), ItDashboard(), latest(), percentOf(), RequestTable() (+52 more)

### Community 24 - "Community 24"
Cohesion: 0.06
Nodes (51): vendorsFor(), isStockOnlyCategory(), MAX_QTY, ISSUES, anyDate(), ASSET_COLUMNS, assetApplyRow(), assetContext() (+43 more)

### Community 25 - "Community 25"
Cohesion: 0.06
Nodes (63): preview(), BAND_NAME, BandBadge(), bandChange(), bandText(), days(), describePolicy(), Explain() (+55 more)

### Community 26 - "Community 26"
Cohesion: 0.06
Nodes (59): monthSpan(), CORRECTION_FLOW, ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT, assetWhat(), chainEvents() (+51 more)

### Community 27 - "Community 27"
Cohesion: 0.07
Nodes (50): decider(), approve(), submit(), ok, ALSO_FOR_MANAGERS, ROUTES, getCurrentRole(), getCurrentUser() (+42 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (60): applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkIn(), checkInPlan(), checkInWindow() (+52 more)

### Community 29 - "Community 29"
Cohesion: 0.10
Nodes (61): b64(), b64url(), blank(), changeOwnPassword(), checkToken(), COMMON_PASSWORDS, countFailure(), createAccount() (+53 more)

### Community 30 - "Community 30"
Cohesion: 0.09
Nodes (25): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+17 more)

### Community 31 - "Community 31"
Cohesion: 0.06
Nodes (43): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+35 more)

### Community 32 - "Community 32"
Cohesion: 0.09
Nodes (50): Kv(), Card(), useData(), Content(), ACTION, ChangeForm(), Content(), day() (+42 more)

### Community 33 - "Community 33"
Cohesion: 0.07
Nodes (53): claimText(), allExpenses(), payableFor(), renderWhoApproves(), actionsCell(), categoryCell(), claimsText(), decidableIds() (+45 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (51): monthlyRuns(), byName(), salaryRows(), absencesIn(), actorWith(), approveProblem(), approversFor(), approveRun() (+43 more)

### Community 35 - "Community 35"
Cohesion: 0.08
Nodes (51): assetRequestDecisionsBy(), expenseDecisionsBy(), managesAnyone(), decidedBy(), salaryProposals(), allCorrections, allLeave, asDecidedBy() (+43 more)

### Community 36 - "Community 36"
Cohesion: 0.10
Nodes (47): monthLabel(), now(), pct(), SalaryPlan(), slabRows(), slabText(), TaxExplain(), holdsPayRulePermission() (+39 more)

### Community 37 - "Community 37"
Cohesion: 0.09
Nodes (48): recordsStart(), correctionContext(), NIGHT_WINDOW_DEFAULT, NIGHT_WINDOW_MAX, nightCheckOutJudge(), nightFixHours(), nightFixWindow(), setNightFixHours() (+40 more)

### Community 38 - "Community 38"
Cohesion: 0.08
Nodes (47): readChosen(), getExpense(), ascii(), checkFile(), cleanName(), EXT_TYPE, extensionOf(), fail() (+39 more)

### Community 39 - "Community 39"
Cohesion: 0.10
Nodes (49): Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel(), TABS (+41 more)

### Community 40 - "Community 40"
Cohesion: 0.07
Nodes (46): P(), ASSET_CATEGORY_KEYS, ASSET_STATE_KEYS, ASSET_STATES, canMove(), DATE_MAX, DATE_MIN, EMAIL (+38 more)

### Community 41 - "Community 41"
Cohesion: 0.12
Nodes (36): Content(), MyVisits(), NONE, STATUS_OPTIONS, Content(), link(), NONE, TeamVisits() (+28 more)

### Community 42 - "Community 42"
Cohesion: 0.12
Nodes (36): thisToken(), load(), save(), copy(), createCollection(), add(), commit(), get() (+28 more)

### Community 43 - "Community 43"
Cohesion: 0.16
Nodes (41): employmentPeriod(), managerOf(), ACCURACY_FLAG_M, ACCURACY_REFUSE_M, active(), ADDRESS_MAX, assignVisit(), build() (+33 more)

### Community 44 - "Community 44"
Cohesion: 0.09
Nodes (34): Stepper(), ConfirmContext, ConfirmDialog(), ConfirmProvider(), useConfirm(), useDecision(), CloseIcon(), DISCARD (+26 more)

### Community 45 - "Community 45"
Cohesion: 0.15
Nodes (40): viewOf(), hasPermission(), active(), allProfileChanges(), BANK_KEYS, bankTogether(), canReveal(), canSee() (+32 more)

### Community 46 - "Community 46"
Cohesion: 0.10
Nodes (36): assetsFor(), actions, cardTitled(), closeIcon(), daysAway(), deactivateDialog(), deleteBtn, departmentName() (+28 more)

### Community 47 - "Community 47"
Cohesion: 0.09
Nodes (32): resetInventoryData(), DEPARTMENTS, DESIGNATIONS, MANAGER_OF, PROFILE_DETAILS, USERS, avatarClass(), buildRow() (+24 more)

### Community 48 - "Community 48"
Cohesion: 0.15
Nodes (35): activeUser(), allAssignmentRows(), allDepartmentDefaults(), allSwaps(), assignMany(), assignmentsFor(), assignRow(), assignShift() (+27 more)

### Community 49 - "Community 49"
Cohesion: 0.09
Nodes (34): monthFor(), clock, errorLine, grace, inBtn, lateMarks, lateNote, modeInputs (+26 more)

### Community 50 - "Community 50"
Cohesion: 0.08
Nodes (34): LEAVE_TYPES, assetTitle(), ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceCard, barLook() (+26 more)

### Community 51 - "Community 51"
Cohesion: 0.08
Nodes (33): attentionCount, attentionList, attentionNote(), dateInput, deptBars, deptDate, deptSelect, emptyRow() (+25 more)

### Community 52 - "Community 52"
Cohesion: 0.14
Nodes (33): checkInRefusal(), checkOutRefusal(), ACCURACY_LIMIT_M, active(), allLocationChanges(), answer(), applyChange(), blank() (+25 more)

### Community 53 - "Community 53"
Cohesion: 0.11
Nodes (30): askWhom(), has(), MAX_EACH, pageResults(), peopleResults(), requestResults(), searchResults(), STATUS (+22 more)

### Community 54 - "Community 54"
Cohesion: 0.11
Nodes (26): OVERRIDABLE, buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form (+18 more)

### Community 55 - "Community 55"
Cohesion: 0.17
Nodes (31): qtyHundredths(), stockApplyRow(), stockContext(), active(), addMovement(), addStockItem(), copy(), fail() (+23 more)

### Community 56 - "Community 56"
Cohesion: 0.11
Nodes (29): addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry(), fail() (+21 more)

### Community 57 - "Community 57"
Cohesion: 0.07
Nodes (31): activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, assetWhat(), chart, deptSelect (+23 more)

### Community 58 - "Community 58"
Cohesion: 0.14
Nodes (28): Badge(), PersonCell(), DecisionButtons(), decidedAt(), LeaveApprovals(), stageBadge(), STATS, TABS (+20 more)

### Community 59 - "Community 59"
Cohesion: 0.19
Nodes (30): Content(), BellPanel(), active(), allAnnouncements(), ANNOUNCEMENT_LIMITS, announcementNoticesFor(), announcementsFor(), audienceCount() (+22 more)

### Community 60 - "Community 60"
Cohesion: 0.14
Nodes (28): departmentName(), initialsFrom(), orDash(), profileOf(), approved(), asked, field(), linkBack() (+20 more)

### Community 61 - "Community 61"
Cohesion: 0.14
Nodes (24): waitingCount(), initialsFrom(), inRail(), RAIL, useMedia(), cache, listeners, memory (+16 more)

### Community 62 - "Community 62"
Cohesion: 0.18
Nodes (28): active(), addDaysIso(), addLicence(), assignSeat(), can(), copy(), expiringRenewals(), fail() (+20 more)

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (28): copy(), createShift(), deactivateShift(), entry(), fail(), firstProblem(), getShifts(), hours() (+20 more)

### Community 64 - "Community 64"
Cohesion: 0.11
Nodes (26): registerBox, sample(), SAMPLE_AT(), ASSET_CATEGORIES, addDays(), at(), buildImport(), CONDITIONS (+18 more)

### Community 65 - "Community 65"
Cohesion: 0.15
Nodes (27): canApprove(), alertText(), askedMonth, attendanceCheck(), buildRow(), checkItem(), dayOf(), monthLabel() (+19 more)

### Community 66 - "Community 66"
Cohesion: 0.12
Nodes (26): getDepartment(), activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el() (+18 more)

### Community 67 - "Community 67"
Cohesion: 0.15
Nodes (24): parts(), showEmployerBox(), slipsFor(), withNewEngine(), approved(), listed(), missingMonthText(), monthLabel() (+16 more)

### Community 68 - "Community 68"
Cohesion: 0.13
Nodes (26): addBtn, calendarCard, clearError(), dayCell(), defaultMonth(), field(), FIELDS, fillYears() (+18 more)

### Community 69 - "Community 69"
Cohesion: 0.09
Nodes (21): FIELD, FIELDS, PAN_HOLDER, PROFILE_SECTIONS, RULES, SECTIONS, VD, VP (+13 more)

### Community 70 - "Community 70"
Cohesion: 0.15
Nodes (22): NAV, OTHER_PAGES, activeHeadcount(), buildOption(), closeIcon(), iconButton(), matchingPages(), matchingPeople() (+14 more)

### Community 71 - "Community 71"
Cohesion: 0.12
Nodes (25): setStat(), actionsHead, decidedAt(), matches(), outCard, overlapAlert, paginationEl, PILL_TAB (+17 more)

### Community 72 - "Community 72"
Cohesion: 0.13
Nodes (23): defaultMonth(), DOW, EMPTY, FIELD_ID, Holidays(), holidaysOf(), Icon(), overWarning() (+15 more)

### Community 73 - "Community 73"
Cohesion: 0.18
Nodes (24): itPeople(), BUTTON_LABEL, CONDITION_OPTIONS, DONE_TEXT, full(), MODE_OPTIONS, optionsOf(), overrideField (+16 more)

### Community 74 - "Community 74"
Cohesion: 0.10
Nodes (23): ALWAYS_SENSITIVE, approvalPath(), approvalRefusal(), BREAK_GLASS_MIN, CHECKLIST, CHECKLIST_KEYS, DETAILS_MAX, executionRefusal() (+15 more)

### Community 75 - "Community 75"
Cohesion: 0.17
Nodes (21): AuthLayout(), BrandPanel(), DEMO_PICKS, demoPeople(), ForgotPassword(), landingOf(), LinkPage(), Login() (+13 more)

### Community 76 - "Community 76"
Cohesion: 0.09
Nodes (18): ASSETS, ATTENDANCE, ImportAssets, ImportAttendance, ImportLeave, ImportLicences, ImportStock, LEAVE (+10 more)

### Community 77 - "Community 77"
Cohesion: 0.19
Nodes (20): itItem(), waitingFor(), example(), pendingUnlockRequests(), allOvertimeDecisions(), copy(), decideOvertime(), decideOvertimeItem() (+12 more)

### Community 78 - "Community 78"
Cohesion: 0.20
Nodes (21): deviceLine(), dist(), isHome(), joinsText(), longDate(), m(), MarkAttendance(), ordinal() (+13 more)

### Community 79 - "Community 79"
Cohesion: 0.22
Nodes (20): summaryOfDays(), attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), expenseSpendChart(), headcountChart(), HOURS_DATA (+12 more)

### Community 80 - "Community 80"
Cohesion: 0.13
Nodes (21): balanceTable, calendarCard, CAPPED, dayCell(), inView(), isOff(), month, outCard (+13 more)

### Community 81 - "Community 81"
Cohesion: 0.27
Nodes (20): MODES, storedRecord(), shiftDayFor(), hhmm(), completeShiftDay(), fail(), inPlan(), nextCheckIn() (+12 more)

### Community 82 - "Community 82"
Cohesion: 0.22
Nodes (19): copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), headOffice(), manager() (+11 more)

### Community 83 - "Community 83"
Cohesion: 0.14
Nodes (20): actionsHead, arrowIcon(), byId(), decidedAt(), matches(), paginationEl, PILL_TAB, pills (+12 more)

### Community 84 - "Community 84"
Cohesion: 0.17
Nodes (18): FLAG_EXPORT, FLAG_LABEL, flagText(), iconOfPlace(), metres(), PLACE_ICON, PLACE_LABEL, placeLabel() (+10 more)

### Community 85 - "Community 85"
Cohesion: 0.22
Nodes (16): colorVar(), dashFor(), MARKS, PatternDefs(), SERIES_COUNT, Swatch(), AreaPlot(), axisNumber() (+8 more)

### Community 86 - "Community 86"
Cohesion: 0.20
Nodes (18): admin(), compOffRule(), copy(), DEFAULT_COMP_OFF, DEFAULT_LATE_POLICY, DEFAULT_SHIFT_RULES_FROM, entry(), fail() (+10 more)

### Community 87 - "Community 87"
Cohesion: 0.29
Nodes (16): runRows(), approveRunWithSnapshot(), approveSnapshotProblem(), fail(), key(), liveRows(), payForFinal(), prepareRunWithSnapshot() (+8 more)

### Community 88 - "Community 88"
Cohesion: 0.20
Nodes (17): toCsv(), active(), cellOf(), DATE_KEYS, dayNumberOf(), EXPORT_LIMIT, EXPORT_MODULES, exportColumns() (+9 more)

### Community 89 - "Community 89"
Cohesion: 0.35
Nodes (17): isUnverified(), ruleOn(), esiFor(), gratuityAccrualFor(), isIntern(), labourWelfareFor(), money(), monthOf() (+9 more)

### Community 90 - "Community 90"
Cohesion: 0.31
Nodes (16): compareRegimes(), ctcFor(), hraExemption(), money(), oldRegimeDeductions(), payFor(), payMonth(), policyLossOfPay() (+8 more)

### Community 91 - "Community 91"
Cohesion: 0.15
Nodes (9): clearError(), departmentName(), form, role, save(), SAVED, showError(), STATUS (+1 more)

### Community 92 - "Community 92"
Cohesion: 0.25
Nodes (13): CHAIN_STAGES, createChain(), holds(), managerCanDecide(), refusal(), isActive(), approvalChainFor(), approvalChainText() (+5 more)

### Community 93 - "Community 93"
Cohesion: 0.28
Nodes (13): accountOf(), fail(), lockedOnly(), mayUnlock(), resolveUnlockRequest(), stillLocked(), unlockRequestItem(), allUnlockRequests() (+5 more)

### Community 94 - "Community 94"
Cohesion: 0.23
Nodes (13): admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail(), isDay(), isMonth() (+5 more)

### Community 95 - "Community 95"
Cohesion: 0.29
Nodes (12): copy(), deviceLabel(), devicesFor(), deviceToken(), fail(), MAX_DEVICES, mine(), peekDevice() (+4 more)

### Community 96 - "Community 96"
Cohesion: 0.23
Nodes (9): ALL_LOCATION_PERMISSIONS, ALL_PERMISSIONS, LOCATION_PERMISSIONS, PERMISSIONS, ADMIN_HELD_BACK, LOCATION_GRANTS, SELF_SERVICE, renderRow() (+1 more)

### Community 97 - "Community 97"
Cohesion: 0.26
Nodes (10): allEvents(), AUDIT_KINDS, AUDIT_LABEL, empty(), eventsFor(), read(), createdDay(), employmentState() (+2 more)

### Community 98 - "Community 98"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 99 - "Community 99"
Cohesion: 0.33
Nodes (10): COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS, getCompanyProfile(), loadBox() (+2 more)

### Community 100 - "Community 100"
Cohesion: 0.38
Nodes (5): clampView(), IndiaPlot(), STATE_NAMES, [, , W, H], ZoomButton()

### Community 101 - "Community 101"
Cohesion: 0.43
Nodes (6): ADDRESS_MAX, coordsProblem(), distanceM(), isNum(), placeProblem(), rad()

### Community 102 - "Community 102"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

## Knowledge Gaps
- **2 isolated node(s):** `RFC-4180`, `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 971 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 92` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 41`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 67`, `Community 68`, `Community 71`, `Community 72`, `Community 73`, `Community 74`, `Community 75`, `Community 77`, `Community 78`, `Community 79`, `Community 80`, `Community 81`, `Community 82`, `Community 83`, `Community 86`, `Community 88`, `Community 91`, `Community 93`, `Community 94`, `Community 95`, `Community 97`, `Community 99`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **What connects `RFC-4180`, `RFC-4180` to the rest of the system?**
  _2 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05228758169934641 - nodes in this community are weakly interconnected._
- **Why does `getAllUsers()` connect `Community 53` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 17`, `Community 18`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 28`, `Community 29`, `Community 32`, `Community 34`, `Community 37`, `Community 39`, `Community 41`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 51`, `Community 54`, `Community 57`, `Community 58`, `Community 59`, `Community 66`, `Community 69`, `Community 70`, `Community 73`, `Community 75`, `Community 77`, `Community 79`, `Community 80`, `Community 88`, `Community 92`, `Community 96`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03838910618571636 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 13` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 15`, `Community 18`, `Community 21`, `Community 23`, `Community 25`, `Community 26`, `Community 32`, `Community 33`, `Community 35`, `Community 36`, `Community 41`, `Community 44`, `Community 46`, `Community 50`, `Community 51`, `Community 53`, `Community 57`, `Community 58`, `Community 60`, `Community 65`, `Community 67`, `Community 68`, `Community 71`, `Community 72`, `Community 76`, `Community 80`, `Community 83`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.04124525916561315 - nodes in this community are weakly interconnected._