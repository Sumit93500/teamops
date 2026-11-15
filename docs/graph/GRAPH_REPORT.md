# Graph Report - officeos  (2026-11-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3477 nodes · 15768 edges · 101 communities (99 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 254 edges (avg confidence: 0.85)
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

## God Nodes (most connected - your core abstractions)
1. `el()` - 256 edges
2. `getUser()` - 251 edges
3. `formatDay()` - 192 edges
4. `nameOf()` - 145 edges
5. `useSession()` - 141 edges
6. `pageUrl()` - 128 edges
7. `useData()` - 118 edges
8. `todayIso()` - 106 edges
9. `getAllUsers()` - 104 edges
10. `plural()` - 97 edges

## Surprising Connections (you probably didn't know these)
- `assetApprovers()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/EmployeeDashboard.jsx → assets/js/ui/leave-view.js
- `monthYear()` --calls--> `monthName()`  [EXTRACTED]
  app/src/ui/leaveband.jsx → assets/js/ui/leave-view.js
- `DeptForm()` --indirect_call--> `addDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js
- `DeptForm()` --indirect_call--> `updateDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js
- `MyLeave()` --indirect_call--> `cancelLeave()`  [INFERRED]
  app/src/pages/MyLeave.jsx → assets/js/data/leave-store.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (101 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (90): Badge(), EmptyState(), Icon(), NotBuilt(), StatCard(), StatStrip(), Stepper(), Tabs() (+82 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (81): DecisionButtons(), approvalItems(), leaveWhat(), assetApprovers(), isAsset(), requestItems(), requestName(), updateNodes() (+73 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (70): ASSET_FLOW, CORRECTION_FLOW, decider(), EXPENSE_FLOW, LEAVE_FLOW, LOCATION_FLOW, OVERTIME_FLOW, PROFILE_FLOW (+62 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (71): ASIDE, byId(), decidedAt(), recordedTime(), Regularization(), tabRequests(), TABS, timesCell() (+63 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (69): AuthLayout(), DEMO_USERS, ForgotPassword(), landingOf(), LinkPage(), Login(), Message(), NewPasswordForm() (+61 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (66): Actions(), BADGE, claimsText(), EMPTY, entryOf(), Expenses(), ICONS, lastAt() (+58 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (57): described(), Field(), Input(), Select(), Switch(), TextArea(), bump(), getVersion() (+49 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (66): chainEvents(), decidedAt(), onDay(), deletedName(), chainEvents(), allCorrections, allLeave, asDecidedBy() (+58 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (66): assetWhat(), allAssetRequests(), allAssets(), assetsHeldByInactive(), assetTotals(), isActive(), ACTIONS, actionsCell() (+58 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (50): COMPANY, companyInitial(), PRODUCT, tabTitle(), signInAs(), signOutNow(), useSession(), refreshPrefs() (+42 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (60): applyPermissions(), actionsCell(), categoryCell(), claimsText(), decidableIds(), EMPTY, entryOf(), lastAt() (+52 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (57): preview(), BAND_NAME, BandBadge(), bandChange(), days(), describePolicy(), Explain(), monthYear() (+49 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (54): Kv(), Card(), PageHeader(), useData(), ACTION, askWhom(), ChangeForm(), Content() (+46 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (58): actorWith(), addDepartment(), addUser(), adminOnly(), approvesRun(), byNonAdmin(), carriesAdmin(), changeUser() (+50 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (53): applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkIn(), checkInPlan(), checkInRefusal() (+45 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (46): DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), FilterSelect(), IconButton(), PRESETS, rangeFor() (+38 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (51): ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPE_KEYS, CATEGORIES, CATEGORY_KEYS, CONDITION_KEYS, CONDITIONS, LOCATION_KEYS (+43 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (49): ApplyLeave(), balanceRows(), ERROR_ID, FOCUS, Kv(), typeMeta(), Calendar(), seedDays() (+41 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (43): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+35 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (45): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+37 more)

### Community 20 - "Community 20"
Cohesion: 0.10
Nodes (19): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+11 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (44): BalanceCard(), Balances(), BAR, HEADS, HistoryRow(), MyLeave(), leavePolicyOn(), MoreButton() (+36 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (44): permissionsOf(), fail(), absencesIn(), actorWith(), approveProblem(), approveRun(), approves(), awayThrough() (+36 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (43): assetsWithOpenReports(), openReportOf(), renderReportAlert(), clearError(), clearReportError(), FIELD, fillReplaces(), form (+35 more)

### Community 24 - "Community 24"
Cohesion: 0.10
Nodes (41): changeFor(), stockStatus(), stockValue(), actorWith(), allMovements(), ASSET_REFERENCE, assets, assignAsset() (+33 more)

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (38): BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), MyRequests(), names(), stepsOf(), TABS (+30 more)

### Community 26 - "Community 26"
Cohesion: 0.10
Nodes (38): assetsFor(), approvalChainText(), reportingManagerName(), actions, cardTitled(), closeIcon(), daysAway(), deactivateDialog() (+30 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (36): holdsPayRulePermission(), active(), admin(), applied(), ASK_FINANCE, CALCS, checkDeclaration(), chooseNewRegime() (+28 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (37): monthSpan(), activityItems(), buildRow(), claimItems(), claimText(), EVENT, FinanceDashboard(), Icon() (+29 more)

### Community 29 - "Community 29"
Cohesion: 0.15
Nodes (37): viewOf(), FIELD, FIELDS, PROFILE_SECTIONS, RULES, SECTIONS, hasPermission(), active() (+29 more)

### Community 30 - "Community 30"
Cohesion: 0.10
Nodes (34): NoData(), FLAG_EXPORT, FLAG_LABEL, flagText(), iconOfPlace(), metres(), PLACE_ICON, PLACE_LABEL (+26 more)

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (36): setStat(), setStat(), renderStats(), renderStats(), stat(), setStat(), amount(), approved() (+28 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (32): load(), save(), allEvents(), AUDIT_KINDS, AUDIT_LABEL, empty(), eventsFor(), read() (+24 more)

### Community 33 - "Community 33"
Cohesion: 0.11
Nodes (25): ConfirmContext, ConfirmDialog(), ConfirmProvider(), useConfirm(), CloseIcon(), DISCARD, focusables(), Modal() (+17 more)

### Community 34 - "Community 34"
Cohesion: 0.09
Nodes (34): ATTENDANCE_RULES, clock, errorLine, grace, inBtn, lateMarks, lateNote, modeInputs (+26 more)

### Community 35 - "Community 35"
Cohesion: 0.16
Nodes (31): NO_DATA, asFields(), asForm(), BLANK, Changes(), Content(), DepartmentDefaults(), MON_FIRST (+23 more)

### Community 36 - "Community 36"
Cohesion: 0.16
Nodes (33): activeUser(), allAssignmentRows(), allDepartmentDefaults(), allSwaps(), assignMany(), assignmentsFor(), assignRow(), assignShift() (+25 more)

### Community 37 - "Community 37"
Cohesion: 0.07
Nodes (33): activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, assetWhat(), chart, deptSelect (+25 more)

### Community 38 - "Community 38"
Cohesion: 0.13
Nodes (31): ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT, emptyRow(), Icon(), ICONS, listText() (+23 more)

### Community 39 - "Community 39"
Cohesion: 0.13
Nodes (29): inRail(), RAIL, Icon(), inRail(), isManagerNow(), SIGN_OUT_ICON, getCurrentRole(), pendingFor() (+21 more)

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (31): getCurrentUserId(), salaryFor(), salaryHistory(), allRows, byName(), changeButtons(), changesAtOnce(), closeIcon() (+23 more)

### Community 41 - "Community 41"
Cohesion: 0.09
Nodes (32): calendarCard, cellLook(), clearErrors(), field(), FIELDS, fillMonths(), fixableIssue(), form (+24 more)

### Community 42 - "Community 42"
Cohesion: 0.07
Nodes (31): attentionCount, attentionList, attentionNote(), dateInput, deptBars, deptDate, deptSelect, emptyRow() (+23 more)

### Community 43 - "Community 43"
Cohesion: 0.10
Nodes (28): initialsOf(), GROUPS, Holder(), matrixGroups(), RoleEditor(), ROLES_LIST, Tick(), Content() (+20 more)

### Community 44 - "Community 44"
Cohesion: 0.14
Nodes (31): alertText(), approverNames(), B(), checks(), dayOf(), DONE, monthLabel(), Months() (+23 more)

### Community 45 - "Community 45"
Cohesion: 0.11
Nodes (29): addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry(), fail() (+21 more)

### Community 46 - "Community 46"
Cohesion: 0.08
Nodes (31): ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceCard, barLook(), chart, hoursNote (+23 more)

### Community 47 - "Community 47"
Cohesion: 0.12
Nodes (28): BarRows(), DEDUCTIONS, ICONS, people(), returnToFile(), SLABS, TaxDeductions(), annualTax() (+20 more)

### Community 48 - "Community 48"
Cohesion: 0.09
Nodes (29): movementEvent(), allItems(), movementEvent(), clearError(), deptField, deptSelect, EMPTY, FIELD (+21 more)

### Community 49 - "Community 49"
Cohesion: 0.14
Nodes (30): Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel(), TABS (+22 more)

### Community 50 - "Community 50"
Cohesion: 0.12
Nodes (25): buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form, managerChoice() (+17 more)

### Community 51 - "Community 51"
Cohesion: 0.19
Nodes (29): isValidTime(), MODES, recordOf(), storedRecord(), writeCompletedDay(), writeShiftCheckIn(), writeShiftCheckOut(), checkInAt() (+21 more)

### Community 52 - "Community 52"
Cohesion: 0.15
Nodes (28): monthOvertime(), overtimeDays(), pendingOvertime(), assignmentReader(), peopleOnShift(), named(), reader(), sampleTimes() (+20 more)

### Community 53 - "Community 53"
Cohesion: 0.12
Nodes (23): NO_DATA, flaggedCell(), attentionNote(), emptyRow(), forSummary(), ICONS, isAbsent(), isMissing() (+15 more)

### Community 54 - "Community 54"
Cohesion: 0.14
Nodes (28): placeLabel(), dist(), isHome(), longDate(), m(), MarkAttendance(), ordinal(), pad() (+20 more)

### Community 55 - "Community 55"
Cohesion: 0.13
Nodes (24): RATES_RULES, APP_NAV, APP_OTHER_PAGES, APP_OWN, mayOpenRates(), OFFICES_ITEM, openable(), results() (+16 more)

### Community 56 - "Community 56"
Cohesion: 0.14
Nodes (26): CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), getAssetRequest(), holdersOf(), holdsStage(), isActive() (+18 more)

### Community 57 - "Community 57"
Cohesion: 0.13
Nodes (26): getRegularization(), getRequest(), bellItem(), buildCard(), buildPanel(), cardOpener(), CHAIN_STAGE, closeApprovalCard() (+18 more)

### Community 58 - "Community 58"
Cohesion: 0.12
Nodes (27): cancelLeave(), cancelRequest(), allRows(), assetWith(), cancelClaim(), cancelCorrection(), cancelRequest(), correctionRow() (+19 more)

### Community 59 - "Community 59"
Cohesion: 0.16
Nodes (27): copy(), createShift(), deactivateShift(), entry(), fail(), firstProblem(), hours(), isInt() (+19 more)

### Community 60 - "Community 60"
Cohesion: 0.16
Nodes (27): alertText(), askedMonth, attendanceCheck(), buildRow(), checkItem(), dayOf(), monthLabel(), openAbsencesText() (+19 more)

### Community 61 - "Community 61"
Cohesion: 0.13
Nodes (25): getDepartment(), activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el() (+17 more)

### Community 62 - "Community 62"
Cohesion: 0.13
Nodes (26): avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el(), emptyRow(), exportBtn (+18 more)

### Community 63 - "Community 63"
Cohesion: 0.14
Nodes (23): ColumnChart(), asOld(), ASSET_VERB, assetName(), assetOutcome(), balanceNodes(), barLook(), EmployeeDashboard() (+15 more)

### Community 64 - "Community 64"
Cohesion: 0.17
Nodes (23): copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), headOffice(), manager() (+15 more)

### Community 65 - "Community 65"
Cohesion: 0.24
Nodes (25): compareRegimes(), hraExemption(), money(), oldRegimeDeductions(), payMonth(), taxOn(), tdsFor(), trace() (+17 more)

### Community 66 - "Community 66"
Cohesion: 0.14
Nodes (25): shiftLossOfPay(), pad(), shiftCounts(), shiftMonthFor(), shiftMonthLossOfPay(), dayLossOfPay(), admin(), compOffRule() (+17 more)

### Community 67 - "Community 67"
Cohesion: 0.13
Nodes (25): addBtn, calendarCard, clearError(), dayCell(), defaultMonth(), field(), FIELDS, fillYears() (+17 more)

### Community 68 - "Community 68"
Cohesion: 0.16
Nodes (22): showEmployerBox(), approved(), listed(), missingMonthText(), monthLabel(), notesOf(), openAbsence(), orDash() (+14 more)

### Community 69 - "Community 69"
Cohesion: 0.11
Nodes (24): LEAVE_TYPES, PAST_DAY_WINDOW, balanceList, chainList, clearError(), durationSelect, FIELD, form (+16 more)

### Community 70 - "Community 70"
Cohesion: 0.20
Nodes (22): attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), expenseSpendChart(), headcountChart(), HOURS_DATA, hoursChart() (+14 more)

### Community 71 - "Community 71"
Cohesion: 0.18
Nodes (23): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+15 more)

### Community 72 - "Community 72"
Cohesion: 0.19
Nodes (21): Reason(), ActionsCell(), B(), byName(), changesAtOnce(), editBlocked(), formulaText(), monthlyCost() (+13 more)

### Community 73 - "Community 73"
Cohesion: 0.22
Nodes (20): parts(), runRows(), slipsFor(), withNewEngine(), approveRunWithSnapshot(), approveSnapshotProblem(), fail(), key() (+12 more)

### Community 74 - "Community 74"
Cohesion: 0.22
Nodes (22): active(), applyChange(), blank(), cancelLocationChange(), changes, copy(), decideLocationChange(), fail() (+14 more)

### Community 75 - "Community 75"
Cohesion: 0.10
Nodes (13): DESIGNATIONS, MANAGER_OF, PROFILE_DETAILS, USERS, clearError(), departmentName(), form, role (+5 more)

### Community 76 - "Community 76"
Cohesion: 0.16
Nodes (17): ALSO_FOR_MANAGERS, ROUTES, getCurrentUserLabel(), getSession(), isSignedIn(), signIn(), signOut(), currentPagePath() (+9 more)

### Community 77 - "Community 77"
Cohesion: 0.13
Nodes (21): balanceTable, calendarCard, CAPPED, dayCell(), inView(), isOff(), month, outCard (+13 more)

### Community 78 - "Community 78"
Cohesion: 0.22
Nodes (20): badgeOf(), slipTotals(), amount(), approved(), financialYear(), ICONS, joinedNote(), label() (+12 more)

### Community 79 - "Community 79"
Cohesion: 0.14
Nodes (19): amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD, form (+11 more)

### Community 80 - "Community 80"
Cohesion: 0.18
Nodes (17): deviceLine(), LOCATION_GRANTS, OVERRIDABLE, ROLE_KEYS, SELF_SERVICE, copy(), deviceLabel(), devicesFor() (+9 more)

### Community 81 - "Community 81"
Cohesion: 0.22
Nodes (16): depthInPages(), resolvePageLink(), resolveRootLink(), rootPrefix(), initRail(), close(), fit(), open() (+8 more)

### Community 82 - "Community 82"
Cohesion: 0.20
Nodes (17): resetCompOff(), allOvertimeDecisions(), copy(), decideOvertime(), decideOvertimeItem(), fail(), mayDecideOvertime(), overtimeDecisionsFor() (+9 more)

### Community 83 - "Community 83"
Cohesion: 0.21
Nodes (15): PersonCell(), CAPPED, DOW, Icon(), isOff(), pad(), person(), profileTo() (+7 more)

### Community 84 - "Community 84"
Cohesion: 0.24
Nodes (16): cellText(), COLUMNS, csvCell(), csvText(), downloadCsv(), exportStatsAsCsv(), exportTableAsCsv(), initExports() (+8 more)

### Community 85 - "Community 85"
Cohesion: 0.23
Nodes (10): MAIN, RAW, SamplePage(), ok, closeAllDropdowns(), initDropdowns(), triggerOf(), initMenuToggle() (+2 more)

### Community 86 - "Community 86"
Cohesion: 0.28
Nodes (15): pct(), slabRows(), slabText(), TaxExplain(), lossOfPayDaysIn(), ctcFor(), payFor(), policyLossOfPay() (+7 more)

### Community 87 - "Community 87"
Cohesion: 0.29
Nodes (14): showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme(), onAppearanceChange() (+6 more)

### Community 88 - "Community 88"
Cohesion: 0.18
Nodes (14): addHoliday(), byDate(), dayLabel(), HOLIDAY_KINDS, holidayManager(), holidays, holidaysIn(), isDayOff() (+6 more)

### Community 89 - "Community 89"
Cohesion: 0.23
Nodes (13): admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail(), isDay(), isMonth() (+5 more)

### Community 90 - "Community 90"
Cohesion: 0.27
Nodes (15): approvedMonthCovering(), approvedMonths(), approvedRunMonths(), approvedRuns(), awayOn(), joiningDate(), joiningProblem(), leavingDate() (+7 more)

### Community 91 - "Community 91"
Cohesion: 0.23
Nodes (13): allExpenses(), getExpense(), allRequests(), salaryProposals(), asRequest(), DECIDED, decisionDays(), DECISIONS (+5 more)

### Community 92 - "Community 92"
Cohesion: 0.25
Nodes (12): allVendors(), VENDOR_STATUS_KEYS, byId(), contactLine(), matches(), renderTable(), row(), tbody (+4 more)

### Community 93 - "Community 93"
Cohesion: 0.21
Nodes (11): clearError(), form, showError(), cancelRequest(), render(), clearError(), form, showError() (+3 more)

### Community 94 - "Community 94"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 95 - "Community 95"
Cohesion: 0.36
Nodes (8): buildOption(), closeIcon(), iconButton(), renderSearch(), close(), draw(), setActive(), shutBox()

### Community 96 - "Community 96"
Cohesion: 0.33
Nodes (7): CHAIN_STAGES, createChain(), holds(), managerCanDecide(), refusal(), isActive(), skippedEntry()

### Community 97 - "Community 97"
Cohesion: 0.39
Nodes (8): amountCell(), calendarItem(), dueCell(), people(), render(), renderCalendar(), returnToFile(), stat()

### Community 98 - "Community 98"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 753 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 51` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 17`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 50`, `Community 52`, `Community 54`, `Community 55`, `Community 56`, `Community 58`, `Community 59`, `Community 60`, `Community 63`, `Community 64`, `Community 66`, `Community 67`, `Community 68`, `Community 69`, `Community 70`, `Community 71`, `Community 72`, `Community 74`, `Community 75`, `Community 76`, `Community 77`, `Community 78`, `Community 79`, `Community 80`, `Community 82`, `Community 83`, `Community 88`, `Community 89`, `Community 96`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0656671664167916 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 10` to `Community 1`, `Community 3`, `Community 5`, `Community 7`, `Community 8`, `Community 16`, `Community 17`, `Community 21`, `Community 23`, `Community 25`, `Community 26`, `Community 28`, `Community 30`, `Community 31`, `Community 34`, `Community 35`, `Community 37`, `Community 38`, `Community 40`, `Community 41`, `Community 42`, `Community 46`, `Community 47`, `Community 48`, `Community 50`, `Community 53`, `Community 57`, `Community 58`, `Community 60`, `Community 63`, `Community 67`, `Community 69`, `Community 71`, `Community 77`, `Community 79`, `Community 92`, `Community 97`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06470588235294118 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 12`, `Community 15`, `Community 16`, `Community 18`, `Community 21`, `Community 23`, `Community 25`, `Community 26`, `Community 28`, `Community 30`, `Community 31`, `Community 33`, `Community 35`, `Community 37`, `Community 38`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 46`, `Community 47`, `Community 53`, `Community 57`, `Community 58`, `Community 60`, `Community 63`, `Community 67`, `Community 68`, `Community 71`, `Community 72`, `Community 77`, `Community 78`, `Community 83`, `Community 86`, `Community 93`, `Community 97`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._