# Graph Report - officeos  (2026-11-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3485 nodes · 15742 edges · 98 communities (95 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 243 edges (avg confidence: 0.85)
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

## God Nodes (most connected - your core abstractions)
1. `el()` - 257 edges
2. `getUser()` - 257 edges
3. `formatDay()` - 192 edges
4. `nameOf()` - 145 edges
5. `useSession()` - 139 edges
6. `useData()` - 116 edges
7. `pageUrl()` - 112 edges
8. `todayIso()` - 106 edges
9. `getAllUsers()` - 104 edges
10. `plural()` - 95 edges

## Surprising Connections (you probably didn't know these)
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/MyRequests.jsx → assets/js/ui/leave-view.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/Expenses.jsx → assets/js/ui/leave-view.js
- `DeclarationsReview()` --indirect_call--> `unlockDeclaration()`  [INFERRED]
  app/src/ui/declarations.jsx → assets/js/data/pay-structure.js
- `DeclarationsReview()` --indirect_call--> `verifyDeclaration()`  [INFERRED]
  app/src/ui/declarations.jsx → assets/js/data/pay-structure.js
- `assetApprovers()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/EmployeeDashboard.jsx → assets/js/ui/leave-view.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (98 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (82): Badge(), Icon(), NotBuilt(), Stepper(), getVersion(), listeners, subscribe(), signOutNow() (+74 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (101): DecisionButtons(), LEAVE_FLOW, chainEvents(), activityNodes(), CardTitle(), emptyRow(), flaggedSince(), HrDashboard() (+93 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (92): StatCard(), StatStrip(), BarRows(), monthSpan(), ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT (+84 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (91): CORRECTION_FLOW, row(), buildRow(), ASIDE, byId(), decidedAt(), recordedTime(), Regularization() (+83 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (79): ColumnChart(), NO_DATA, NoData(), FLAG_EXPORT, FLAG_LABEL, flaggedCell(), flagText(), iconOfPlace() (+71 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (85): CHAIN_STAGES, skippedEntry(), applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkIn() (+77 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (78): PersonCell(), defaultMonth(), DOW, EMPTY, FIELD_ID, Holidays(), holidaysOf(), Icon() (+70 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (80): ApplyLeave(), balanceRows(), ERROR_ID, FOCUS, Kv(), typeMeta(), recentDays(), shiftRecentDays() (+72 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (65): NO_DATA, described(), Field(), Input(), Select(), TextArea(), Modal(), bump() (+57 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (71): load(), actorWith(), addDepartment(), addUser(), adminOnly(), approvedMonthCovering(), approvedMonths(), approvedRunMonths() (+63 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (65): badgeOf(), EmptyState(), initialsOf(), Kv(), Card(), PageHeader(), tabTitle(), useData() (+57 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (66): assetWhat(), assetName(), allAssetRequests(), allAssets(), assetsHeldByInactive(), assetTotals(), ACTIONS, actionsCell() (+58 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (60): BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), MyRequests(), names(), stepsOf(), TABS (+52 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (58): allCorrections, allLeave, asDecidedBy(), assetRow(), assetsDecided(), assetsPending(), assetTitle(), correctionRow() (+50 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (49): Reason(), Tabs(), useConfirm(), useDecision(), Switch(), detachedRows(), Row(), Table() (+41 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (47): DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), FilterSelect(), IconButton(), PRESETS, rangeFor() (+39 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (50): leaveWhat(), requestName(), activityText(), BalanceCard(), Balances(), BAR, HEADS, HistoryRow() (+42 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (43): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+35 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (44): viewOf(), FIELD, FIELDS, PAN_HOLDER, PROFILE_SECTIONS, RULES, SECTIONS, VD (+36 more)

### Community 19 - "Community 19"
Cohesion: 0.10
Nodes (19): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+11 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (47): logEvent(), b64(), b64url(), blank(), changeOwnPassword(), COMMON_PASSWORDS, countFailure(), createAccount() (+39 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (46): ASSET_STATUS_KEYS, changeFor(), needsReorder(), STOCK_STATUS_KEYS, stockStatus(), stockValue(), actorWith(), allMovements() (+38 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (44): ActionsCell(), byName(), changesAtOnce(), editBlocked(), salaryRows(), permissionsOf(), userCan(), actorWith() (+36 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (41): ASSET_STATUSES, ASSET_TYPES, CATEGORIES, CONDITION_KEYS, CONDITIONS, LOCATION_KEYS, LOCATIONS, MOVEMENT_TYPES (+33 more)

### Community 24 - "Community 24"
Cohesion: 0.06
Nodes (41): ATTENDANCE_RULES, activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, assetWhat(), chart (+33 more)

### Community 25 - "Community 25"
Cohesion: 0.10
Nodes (39): ASSET_FLOW, EXPENSE_FLOW, LOCATION_FLOW, OVERTIME_FLOW, PROFILE_FLOW, SALARY_FLOW, timeOf(), UNLOCK_FLOW (+31 more)

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (40): movementEvent(), CATEGORY_KEYS, MOVEMENT_TYPE_KEYS, clearError(), deptField, deptSelect, EMPTY, FIELD (+32 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (39): alertText(), approverNames(), B(), checks(), dayOf(), DONE, monthLabel(), Months() (+31 more)

### Community 28 - "Community 28"
Cohesion: 0.08
Nodes (38): ASSET_TYPE_KEYS, assetsFor(), assetsWithOpenReports(), openReportOf(), reportProblem(), renderReportAlert(), chainText(), clearError() (+30 more)

### Community 29 - "Community 29"
Cohesion: 0.11
Nodes (36): claimText(), averageProcessingDays(), payableFor(), actionsCell(), categoryCell(), claimsText(), decidableIds(), EMPTY (+28 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (36): checkInRefusal(), checkOutRefusal(), resetCompanyProfile(), resetAllDevices(), ACCURACY_LIMIT_M, active(), answer(), applyChange() (+28 more)

### Community 31 - "Community 31"
Cohesion: 0.11
Nodes (35): joiningDate(), joiningProblem(), leavingDate(), leavingPeriods(), reportingManagerName(), actions, cardTitled(), daysAway() (+27 more)

### Community 32 - "Community 32"
Cohesion: 0.09
Nodes (36): calendarCard, cellLook(), clearErrors(), field(), FIELDS, fillMonths(), fixableIssue(), form (+28 more)

### Community 33 - "Community 33"
Cohesion: 0.11
Nodes (33): decideSalaryProposal(), allRows, buildRow(), byName(), changeButtons(), changesAtOnce(), closeIcon(), currentRows() (+25 more)

### Community 34 - "Community 34"
Cohesion: 0.12
Nodes (33): dist(), isHome(), joinsText(), m(), MarkAttendance(), ordinal(), pad(), placeLine() (+25 more)

### Community 35 - "Community 35"
Cohesion: 0.15
Nodes (29): decider(), approve(), submit(), NAV, OTHER_PAGES, getCurrentRole(), getCurrentUser(), getCurrentUserId() (+21 more)

### Community 36 - "Community 36"
Cohesion: 0.13
Nodes (31): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+23 more)

### Community 37 - "Community 37"
Cohesion: 0.10
Nodes (32): closeCards(), BELL_SELECTOR, bellListeners, BellPanel(), Card(), CardHost(), cardState(), CHAIN_STAGE (+24 more)

### Community 38 - "Community 38"
Cohesion: 0.14
Nodes (32): firstStage(), nextStage(), applied(), approverMustPay(), at(), auto(), blank(), by() (+24 more)

### Community 39 - "Community 39"
Cohesion: 0.17
Nodes (32): activeUser(), allAssignmentRows(), allDepartmentDefaults(), allSwaps(), assignMany(), assignmentsFor(), assignRow(), assignShift() (+24 more)

### Community 40 - "Community 40"
Cohesion: 0.13
Nodes (30): Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel(), TABS (+22 more)

### Community 41 - "Community 41"
Cohesion: 0.17
Nodes (30): monthLabel(), now(), pct(), SalaryPlan(), slabRows(), slabText(), TaxExplain(), UnverifiedNote() (+22 more)

### Community 42 - "Community 42"
Cohesion: 0.20
Nodes (30): isAppCreated(), compareRegimes(), hraExemption(), money(), oldRegimeDeductions(), payMonth(), policyLossOfPay(), policyLossOfPayFrom() (+22 more)

### Community 43 - "Community 43"
Cohesion: 0.12
Nodes (28): holdsPayRulePermission(), active(), admin(), applied(), ASK_FINANCE, CALCS, checkDeclaration(), copy() (+20 more)

### Community 44 - "Community 44"
Cohesion: 0.08
Nodes (31): ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceCard, barLook(), chart, hoursNote (+23 more)

### Community 45 - "Community 45"
Cohesion: 0.14
Nodes (27): waitingFor(), createChain(), holds(), managerCanDecide(), refusal(), isActive(), accountOf(), pendingProfileChanges() (+19 more)

### Community 46 - "Community 46"
Cohesion: 0.12
Nodes (23): ok, getCurrentUserLabel(), closeAllDropdowns(), initDropdowns(), triggerOf(), ICONS, SECTION_ICONS, initMenuToggle() (+15 more)

### Community 47 - "Community 47"
Cohesion: 0.11
Nodes (29): getAssetRequest(), STAGE_NAME, getRegularization(), getRequest(), bellItem(), buildCard(), buildPanel(), cardState() (+21 more)

### Community 48 - "Community 48"
Cohesion: 0.12
Nodes (28): addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry(), fail() (+20 more)

### Community 49 - "Community 49"
Cohesion: 0.12
Nodes (25): buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form, managerChoice() (+17 more)

### Community 50 - "Community 50"
Cohesion: 0.10
Nodes (19): ConfirmContext, ConfirmDialog(), ConfirmProvider(), CloseIcon(), DISCARD, focusables(), useDialogFocus(), Content() (+11 more)

### Community 51 - "Community 51"
Cohesion: 0.15
Nodes (28): DAY, copy(), createShift(), deactivateShift(), entry(), fail(), firstProblem(), hours() (+20 more)

### Community 52 - "Community 52"
Cohesion: 0.15
Nodes (26): cell(), d(), FIELD_LABEL, FIELDS, preview(), TYPES, BAND_NAME, BandBadge() (+18 more)

### Community 53 - "Community 53"
Cohesion: 0.14
Nodes (26): allCompOff(), compOffFor(), compOffShield(), copy(), creditOvertime(), plusDays(), resetCompOff(), store (+18 more)

### Community 54 - "Community 54"
Cohesion: 0.16
Nodes (25): copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), headOffice(), manager() (+17 more)

### Community 55 - "Community 55"
Cohesion: 0.12
Nodes (26): actionsHead, arrowIcon(), byId(), decidedAt(), matches(), paginationEl, PILL_TAB, pills (+18 more)

### Community 56 - "Community 56"
Cohesion: 0.18
Nodes (24): AuthLayout(), BrandPanel(), DEMO_USERS, ForgotPassword(), landingOf(), LinkPage(), Login(), Message() (+16 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (24): CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), holdersOf(), holdsStage(), isActive(), isHeldFor() (+16 more)

### Community 58 - "Community 58"
Cohesion: 0.10
Nodes (26): needsReceipt(), STAGE_NAME, renderChain(), amountInput, categorySelect, chainList, clearError(), currentAmount() (+18 more)

### Community 59 - "Community 59"
Cohesion: 0.13
Nodes (25): activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el(), ensureOption() (+17 more)

### Community 60 - "Community 60"
Cohesion: 0.16
Nodes (25): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+17 more)

### Community 61 - "Community 61"
Cohesion: 0.19
Nodes (26): amount(), approved(), buildRow(), field(), financialYear(), joinedNote(), label(), messageRow() (+18 more)

### Community 62 - "Community 62"
Cohesion: 0.13
Nodes (26): avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el(), emptyRow(), exportBtn (+18 more)

### Community 63 - "Community 63"
Cohesion: 0.14
Nodes (19): COMPANY, companyInitial(), PRODUCT, signInAs(), refreshPrefs(), clearError(), DEMO_USERS, escapeHtml() (+11 more)

### Community 64 - "Community 64"
Cohesion: 0.18
Nodes (25): people(), alertText(), askedMonth, attendanceCheck(), buildRow(), checkItem(), dayOf(), monthLabel() (+17 more)

### Community 65 - "Community 65"
Cohesion: 0.12
Nodes (21): ALL_LOCATION_PERMISSIONS, LOCATION_PERMISSIONS, PERMISSIONS, LOCATION_GRANTS, OVERRIDABLE, ROLE_KEYS, SELF_SERVICE, depthInPages() (+13 more)

### Community 66 - "Community 66"
Cohesion: 0.22
Nodes (25): isValidTime(), MODES, recordOf(), storedRecord(), writeCompletedDay(), writeShiftCheckIn(), writeShiftCheckOut(), shiftDayFor() (+17 more)

### Community 67 - "Community 67"
Cohesion: 0.12
Nodes (24): account(), admin(), BAND_LABEL, closeLeaveYear(), EDITABLE, entry(), fail(), FLAT_POLICY (+16 more)

### Community 68 - "Community 68"
Cohesion: 0.18
Nodes (23): parts(), runRows(), slipsFor(), slipTotals(), withNewEngine(), amount(), approved(), financialYear() (+15 more)

### Community 69 - "Community 69"
Cohesion: 0.12
Nodes (19): allEvents(), AUDIT_KINDS, AUDIT_LABEL, empty(), read(), createdOnOf(), officeDayOf(), read() (+11 more)

### Community 70 - "Community 70"
Cohesion: 0.15
Nodes (22): allExpenses(), getExpense(), asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys(), PASSED (+14 more)

### Community 71 - "Community 71"
Cohesion: 0.18
Nodes (20): showEmployerBox(), approved(), listed(), missingMonthText(), monthLabel(), notesOf(), openAbsence(), orDash() (+12 more)

### Community 72 - "Community 72"
Cohesion: 0.16
Nodes (17): ROLES, ALSO_FOR_MANAGERS, ROUTES, getSession(), isSignedIn(), signIn(), signOut(), currentPagePath() (+9 more)

### Community 73 - "Community 73"
Cohesion: 0.18
Nodes (20): named(), sampleTimes(), shiftDay(), addDays(), checkInWindowOf(), classifyDay(), dayNo(), hhmm() (+12 more)

### Community 74 - "Community 74"
Cohesion: 0.22
Nodes (18): closeIcon(), deactivateDialog(), closeIcon(), createDecisionFlow(), approve(), buildModal(), clearError(), openReject() (+10 more)

### Community 75 - "Community 75"
Cohesion: 0.18
Nodes (16): CATEGORIES, CATEGORY_KEYS, chainFor(), EXPENSE_POLICY, STAGES, waitingOn(), renderWhoApproves(), BADGE (+8 more)

### Community 76 - "Community 76"
Cohesion: 0.21
Nodes (15): applyPermissions(), allVendors(), VENDOR_STATUS_KEYS, byId(), contactLine(), matches(), renderTable(), row() (+7 more)

### Community 77 - "Community 77"
Cohesion: 0.23
Nodes (16): cellText(), COLUMNS, csvCell(), csvText(), downloadCsv(), exportStatsAsCsv(), exportTableAsCsv(), isDataColumn() (+8 more)

### Community 78 - "Community 78"
Cohesion: 0.22
Nodes (14): admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail(), isDay(), isMonth() (+6 more)

### Community 79 - "Community 79"
Cohesion: 0.15
Nodes (9): clearError(), departmentName(), form, role, save(), SAVED, showError(), STATUS (+1 more)

### Community 80 - "Community 80"
Cohesion: 0.29
Nodes (14): showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme(), onAppearanceChange() (+6 more)

### Community 81 - "Community 81"
Cohesion: 0.28
Nodes (14): deviceLine(), copy(), deviceLabel(), devicesFor(), deviceToken(), fail(), mine(), peekDevice() (+6 more)

### Community 82 - "Community 82"
Cohesion: 0.28
Nodes (13): initialsFrom(), inRail(), RAIL, useMedia(), setWide(), results(), Icon(), inRail() (+5 more)

### Community 83 - "Community 83"
Cohesion: 0.34
Nodes (13): save(), copy(), createCollection(), add(), commit(), get(), getAll(), loadBox() (+5 more)

### Community 84 - "Community 84"
Cohesion: 0.23
Nodes (13): annualTax(), computePay(), FILING_SAMPLE, lastDay(), leap(), lossOfPayAmount(), lossOfPayDays(), monthlyTds() (+5 more)

### Community 85 - "Community 85"
Cohesion: 0.30
Nodes (13): recordsStart(), shiftLossOfPay(), assignmentReader(), peopleOnShift(), pad(), reader(), shiftCounts(), shiftMonthFor() (+5 more)

### Community 86 - "Community 86"
Cohesion: 0.33
Nodes (11): setPref(), waitingCount(), SearchBox(), SearchOpener(), SIGN_OUT_ICON, applyAccent(), applyTheme(), Bell() (+3 more)

### Community 87 - "Community 87"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 88 - "Community 88"
Cohesion: 0.33
Nodes (10): COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS, getCompanyProfile(), loadBox() (+2 more)

### Community 89 - "Community 89"
Cohesion: 0.24
Nodes (8): clearError(), form, showError(), clearError(), form, showError(), ensureContainer(), initToasts()

### Community 90 - "Community 90"
Cohesion: 0.33
Nodes (9): apply(), listeners, NAV_KEY, read(), storedChoice(), subscribe(), useNavWide(), WIDE_QUERY (+1 more)

### Community 91 - "Community 91"
Cohesion: 0.33
Nodes (8): buildOption(), closeIcon(), iconButton(), renderSearch(), close(), draw(), setActive(), shutBox()

### Community 92 - "Community 92"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 93 - "Community 93"
Cohesion: 0.40
Nodes (5): assetApprovers(), requestItems(), decidedRow(), stageBadge(), statusBadge()

### Community 94 - "Community 94"
Cohesion: 0.60
Nodes (5): payrollRunFor(), payslipsFor(), storedRuns(), yearRows(), taxYearMonths()

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 750 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 45` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 18`, `Community 20`, `Community 21`, `Community 22`, `Community 24`, `Community 25`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 38`, `Community 39`, `Community 41`, `Community 43`, `Community 44`, `Community 48`, `Community 49`, `Community 51`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 60`, `Community 61`, `Community 64`, `Community 66`, `Community 67`, `Community 68`, `Community 69`, `Community 71`, `Community 72`, `Community 78`, `Community 79`, `Community 81`, `Community 85`, `Community 88`, `Community 94`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05470925470925471 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 3` to `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 11`, `Community 12`, `Community 13`, `Community 16`, `Community 23`, `Community 24`, `Community 26`, `Community 28`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 35`, `Community 44`, `Community 47`, `Community 49`, `Community 55`, `Community 58`, `Community 60`, `Community 61`, `Community 64`, `Community 65`, `Community 74`, `Community 75`, `Community 76`, `Community 93`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04222914503288335 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 16` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 8`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 37`, `Community 41`, `Community 44`, `Community 47`, `Community 50`, `Community 52`, `Community 55`, `Community 60`, `Community 61`, `Community 64`, `Community 68`, `Community 71`, `Community 74`, `Community 75`, `Community 93`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._