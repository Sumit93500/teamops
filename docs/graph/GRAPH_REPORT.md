# Graph Report - officeos  (2026-11-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3094 nodes · 13808 edges · 93 communities (91 shown, 2 thin omitted)
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

## God Nodes (most connected - your core abstractions)
1. `el()` - 251 edges
2. `getUser()` - 200 edges
3. `formatDay()` - 180 edges
4. `nameOf()` - 140 edges
5. `useSession()` - 116 edges
6. `pageUrl()` - 113 edges
7. `todayIso()` - 106 edges
8. `useData()` - 102 edges
9. `plural()` - 96 edges
10. `getAllUsers()` - 93 edges

## Surprising Connections (you probably didn't know these)
- `MyLeave()` --indirect_call--> `byNewest()`  [INFERRED]
  app/src/pages/MyLeave.jsx → assets/js/ui/leave-view.js
- `monthYear()` --calls--> `monthName()`  [EXTRACTED]
  app/src/ui/leaveband.jsx → assets/js/ui/leave-view.js
- `DeptForm()` --indirect_call--> `addDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js
- `DeptForm()` --indirect_call--> `updateDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/MyRequests.jsx → assets/js/ui/leave-view.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (93 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (63): NotBuilt(), detachedRows(), Row(), Table(), tdClass(), text(), NotPorted(), Announcements() (+55 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (77): ApplyLeave(), balanceRows(), ERROR_ID, FOCUS, Kv(), typeMeta(), recentDays(), skippedEntry() (+69 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (76): leaveWhat(), requestName(), activityText(), HistoryRow(), MyLeave(), cancelRequest(), BADGE_TEXT, correctionTitle() (+68 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (76): allAssetRequests(), fulfilAssetRequest(), fail(), actorWith(), allAssets(), assetsHeldByInactive(), assetsWithOpenReports(), assetTotals() (+68 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (65): Badge(), EmptyState(), Icon(), StatCard(), StatStrip(), Stepper(), Tabs(), BarRows() (+57 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (61): ColumnChart(), NO_DATA, NoData(), FLAG_EXPORT, FLAG_LABEL, flaggedCell(), flagText(), iconOfPlace() (+53 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (57): COMPANY, companyInitial(), PRODUCT, tabTitle(), signInAs(), signOutNow(), useSession(), usePrefs() (+49 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (48): ConfirmContext, ConfirmDialog(), ConfirmProvider(), useConfirm(), useDecision(), described(), Field(), Input() (+40 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (58): PersonCell(), LEAVE_FLOW, decidedAt(), LeaveApprovals(), stageBadge(), STATS, TABS, Calendar() (+50 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (58): ASSET_VERB, assetName(), assetOutcome(), balanceNodes(), barLook(), EmployeeDashboard(), Icon(), ICONS (+50 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (53): DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), FilterSelect(), IconButton(), PRESETS, rangeFor() (+45 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (55): activityItems(), claimText(), COST_NOTE, EVENT, FinanceDashboard(), Icon(), ICONS, people() (+47 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (52): runRows(), alertText(), B(), checks(), dayOf(), DONE, monthLabel(), Months() (+44 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (49): showEmployerBox(), departmentName(), initialsFrom(), orDash(), profileOf(), approved(), listed(), missingMonthText() (+41 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (50): ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPE_KEYS, CATEGORIES, CATEGORY_KEYS, CONDITION_KEYS, CONDITIONS, LOCATION_KEYS (+42 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (46): NO_DATA, AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend() (+38 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (51): actorWith(), addDepartment(), addUser(), adminOnly(), approvesRun(), byNonAdmin(), carriesAdmin(), changeUser() (+43 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (45): chainEvents(), salaryProposals(), chainEvents(), allCorrections, allLeave, asDecidedBy(), assetsDecided(), assetsPending() (+37 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (19): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+11 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (42): preview(), BAND_NAME, BandBadge(), bandChange(), bandText(), describePolicy(), monthYear(), NAME (+34 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (44): addHoliday(), byDate(), dayLabel(), getAllHolidays(), HOLIDAY_KINDS, holidayManager(), holidays, holidaysIn() (+36 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (40): applyPermissions(), allVendors(), matches(), renderTable(), actionsHead, arrowIcon(), byId(), decidedAt() (+32 more)

### Community 22 - "Community 22"
Cohesion: 0.08
Nodes (40): activityNodes(), CardTitle(), emptyRow(), flaggedSince(), HrDashboard(), Icon(), ICONS, leaveRow() (+32 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (38): ASSET_FLOW, CORRECTION_FLOW, DecisionButtons(), EXPENSE_FLOW, LOCATION_FLOW, SALARY_FLOW, Actions(), entryOf() (+30 more)

### Community 24 - "Community 24"
Cohesion: 0.08
Nodes (39): movementEvent(), movementEvent(), clearError(), deptField, deptSelect, EMPTY, FIELD, fillDepartments() (+31 more)

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (36): holdsPayRulePermission(), active(), admin(), applied(), ASK_FINANCE, CALCS, checkDeclaration(), chooseNewRegime() (+28 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (37): Kv(), Card(), bump(), ACTION, askWhom(), ChangeForm(), Content(), day() (+29 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (37): applyCorrection(), attendance, chain, checkAgainstRecord(), checkInWindow(), clockLabel(), completedSeedDay(), context() (+29 more)

### Community 28 - "Community 28"
Cohesion: 0.07
Nodes (37): pendingRegularizations(), summarize(), summaryFor(), attentionCount, attentionList, attentionNote(), dateInput, deptBars (+29 more)

### Community 29 - "Community 29"
Cohesion: 0.11
Nodes (35): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+27 more)

### Community 30 - "Community 30"
Cohesion: 0.15
Nodes (35): row(), buildRow(), ASIDE, byId(), decidedAt(), recordedTime(), row(), tabRequests() (+27 more)

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (35): awayOn(), leavingDate(), leavingPeriods(), reportingManagerName(), actions, cardTitled(), closeIcon(), daysAway() (+27 more)

### Community 32 - "Community 32"
Cohesion: 0.10
Nodes (34): allItems(), assetsFor(), clearError(), clearReportError(), FIELD, fillReplaces(), form, ICON (+26 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (33): firstStage(), nextStage(), applied(), approverMustPay(), at(), auto(), averageProcessingDays(), blank() (+25 more)

### Community 34 - "Community 34"
Cohesion: 0.09
Nodes (33): clock, errorLine, grace, inBtn, lateMarks, lateNote, modeInputs, note (+25 more)

### Community 35 - "Community 35"
Cohesion: 0.09
Nodes (33): calendarCard, cellLook(), clearErrors(), field(), FIELDS, fixableIssue(), form, isOffOrEmpty() (+25 more)

### Community 36 - "Community 36"
Cohesion: 0.20
Nodes (31): monthLabel(), now(), pct(), SalaryPlan(), slabRows(), slabText(), TaxExplain(), UnverifiedNote() (+23 more)

### Community 37 - "Community 37"
Cohesion: 0.15
Nodes (32): hasPermission(), deviceLabel(), ACCURACY_LIMIT_M, active(), answer(), applyChange(), blank(), cancelLocationChange() (+24 more)

### Community 38 - "Community 38"
Cohesion: 0.11
Nodes (28): approverNames(), permissionsOf(), recordsStart(), actorWith(), approversFor(), approves(), byName(), checkSalary() (+20 more)

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (31): getCurrentUserId(), allRows, buildRow(), byName(), changeButtons(), changesAtOnce(), closeIcon(), currentRows() (+23 more)

### Community 40 - "Community 40"
Cohesion: 0.07
Nodes (31): activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, assetWhat(), chart, deptSelect (+23 more)

### Community 41 - "Community 41"
Cohesion: 0.13
Nodes (27): clearError(), form, showError(), clearError(), form, showError(), closeIcon(), correctionFlow (+19 more)

### Community 42 - "Community 42"
Cohesion: 0.10
Nodes (29): changeFor(), stockStatus(), stockValue(), allMovements(), ASSET_REFERENCE, assets, at(), availableTagged() (+21 more)

### Community 43 - "Community 43"
Cohesion: 0.12
Nodes (28): addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry(), fail() (+20 more)

### Community 44 - "Community 44"
Cohesion: 0.15
Nodes (30): canApprove(), runMonth(), runTotals(), renderPayroll(), alertText(), askedMonth, attendanceCheck(), buildRow() (+22 more)

### Community 45 - "Community 45"
Cohesion: 0.12
Nodes (25): buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form, managerChoice() (+17 more)

### Community 46 - "Community 46"
Cohesion: 0.12
Nodes (28): waitingCount(), waitingFor(), assetTitle(), correctionTitle(), decisionDate(), expenseTitle(), leaveTitle(), LOC_TAB (+20 more)

### Community 47 - "Community 47"
Cohesion: 0.12
Nodes (29): payableFor(), actionsCell(), claimsText(), decidableIds(), EMPTY, entryOf(), lastAt(), matches() (+21 more)

### Community 48 - "Community 48"
Cohesion: 0.13
Nodes (28): STAGE_NAME, getRequest(), bellItem(), buildCard(), buildPanel(), cardLink(), cardState(), CHAIN_STAGE (+20 more)

### Community 49 - "Community 49"
Cohesion: 0.14
Nodes (27): annualTax(), computePay(), FILING_SAMPLE, filingDates(), lastDay(), leap(), lossOfPayDays(), monthlyTds() (+19 more)

### Community 50 - "Community 50"
Cohesion: 0.14
Nodes (25): isManagerNow(), CHAIN, closeAssetRequest(), decideAssetRequest(), getAssetRequest(), holdersOf(), holdsStage(), isActive() (+17 more)

### Community 51 - "Community 51"
Cohesion: 0.14
Nodes (26): expenseTotals(), payslipTotals(), setStat(), setStat(), renderBalanceStat(), setStat(), approvalsCard, claimsText() (+18 more)

### Community 52 - "Community 52"
Cohesion: 0.16
Nodes (25): copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), headOffice(), manager() (+17 more)

### Community 53 - "Community 53"
Cohesion: 0.10
Nodes (27): activity, approvalsList, approvalsMeta, chart, leaveNote, leaveRange, leaveRows, leaveRowsMeta (+19 more)

### Community 54 - "Community 54"
Cohesion: 0.15
Nodes (26): Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel(), TABS (+18 more)

### Community 55 - "Community 55"
Cohesion: 0.19
Nodes (26): amount(), approved(), buildRow(), field(), financialYear(), joinedNote(), label(), messageRow() (+18 more)

### Community 56 - "Community 56"
Cohesion: 0.17
Nodes (23): decider(), approve(), submit(), getCurrentRole(), redirectToLanding(), depthInPages(), resolvePageLink(), resolveRootLink() (+15 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (26): assetApprovers(), waitingOn(), assetRow(), assetTitle(), correctionRow(), correctionTitle(), expenseRow(), expenseTitle() (+18 more)

### Community 58 - "Community 58"
Cohesion: 0.13
Nodes (24): activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el(), ensureOption() (+16 more)

### Community 59 - "Community 59"
Cohesion: 0.12
Nodes (25): avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el(), emptyRow(), exportBtn (+17 more)

### Community 60 - "Community 60"
Cohesion: 0.16
Nodes (22): ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT, approvalItems(), assetWhat(), emptyRow(), Icon() (+14 more)

### Community 61 - "Community 61"
Cohesion: 0.13
Nodes (19): ALL_LOCATION_PERMISSIONS, ALL_PERMISSIONS, LOCATION_PERMISSIONS, PERMISSIONS, LOCATION_GRANTS, OVERRIDABLE, ROLE_KEYS, ROLES (+11 more)

### Community 62 - "Community 62"
Cohesion: 0.16
Nodes (20): load(), save(), COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS (+12 more)

### Community 63 - "Community 63"
Cohesion: 0.10
Nodes (13): DEPARTMENTS, MANAGER_OF, PROFILE_DETAILS, USERS, clearError(), departmentName(), form, role (+5 more)

### Community 64 - "Community 64"
Cohesion: 0.21
Nodes (21): badgeOf(), Reason(), slipTotals(), amount(), approved(), financialYear(), ICONS, joinedNote() (+13 more)

### Community 65 - "Community 65"
Cohesion: 0.22
Nodes (19): summaryOfDays(), attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), expenseSpendChart(), headcountChart(), HOURS_DATA (+11 more)

### Community 66 - "Community 66"
Cohesion: 0.13
Nodes (20): CATEGORY_KEYS, amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD (+12 more)

### Community 67 - "Community 67"
Cohesion: 0.16
Nodes (18): initialsOf(), Content(), Form(), LIST, MONTHS, OVERRIDES_HINT, plural(), problemsOf() (+10 more)

### Community 68 - "Community 68"
Cohesion: 0.20
Nodes (19): ActionsCell(), B(), byName(), changesAtOnce(), editBlocked(), formulaText(), monthlyCost(), people() (+11 more)

### Community 69 - "Community 69"
Cohesion: 0.21
Nodes (17): APP_NAV, APP_OTHER_PAGES, APP_OWN, mayOpenLeavePolicy(), mayOpenRates(), OFFICES_ITEM, openable(), results() (+9 more)

### Community 70 - "Community 70"
Cohesion: 0.16
Nodes (15): ALSO_FOR_MANAGERS, ROUTES, getCurrentUserLabel(), getSession(), isSignedIn(), signIn(), currentPagePath(), guardPage() (+7 more)

### Community 71 - "Community 71"
Cohesion: 0.35
Nodes (17): isUnverified(), ruleOn(), esiFor(), gratuityAccrualFor(), isIntern(), labourWelfareFor(), money(), monthOf() (+9 more)

### Community 72 - "Community 72"
Cohesion: 0.24
Nodes (16): showSavedTheme(), themeRadios, ACCENTS, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme() (+8 more)

### Community 73 - "Community 73"
Cohesion: 0.21
Nodes (11): MAIN, RAW, SamplePage(), ok, closeAllDropdowns(), initDropdowns(), triggerOf(), initMenuToggle() (+3 more)

### Community 74 - "Community 74"
Cohesion: 0.21
Nodes (15): admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail(), isDay(), isMonth() (+7 more)

### Community 75 - "Community 75"
Cohesion: 0.23
Nodes (14): getCurrentUser(), signOut(), ICONS, SECTION_ICONS, initRail(), close(), fit(), open() (+6 more)

### Community 76 - "Community 76"
Cohesion: 0.20
Nodes (14): CATEGORIES, chainFor(), EXPENSE_POLICY, STAGES, renderWhoApproves(), BADGE, chainText(), expenseFlow (+6 more)

### Community 77 - "Community 77"
Cohesion: 0.24
Nodes (15): cellText(), COLUMNS, csvCell(), csvText(), downloadCsv(), exportStatsAsCsv(), exportTableAsCsv(), isDataColumn() (+7 more)

### Community 78 - "Community 78"
Cohesion: 0.22
Nodes (13): recentRow(), ATTENDANCE_RULES, recentRow(), renderStats(), BADGE, checkInBy(), dayBadge(), hoursText() (+5 more)

### Community 79 - "Community 79"
Cohesion: 0.23
Nodes (13): CheckInPlaces(), Field(), Kv(), MyDevices(), MyProfile(), onDay(), PLACEHOLDER, SAVED (+5 more)

### Community 80 - "Community 80"
Cohesion: 0.25
Nodes (11): NAV, OTHER_PAGES, buildOption(), closeIcon(), iconButton(), matchingPeople(), renderSearch(), close() (+3 more)

### Community 81 - "Community 81"
Cohesion: 0.20
Nodes (13): STAGE_NAME, renderProgress(), assetRequestFlow, assetRequestSteps(), BADGE, describeRequest(), lastEntry(), names() (+5 more)

### Community 82 - "Community 82"
Cohesion: 0.32
Nodes (12): deviceLine(), copy(), devicesFor(), deviceToken(), fail(), mine(), peekDevice(), randomHex() (+4 more)

### Community 83 - "Community 83"
Cohesion: 0.23
Nodes (12): allExpenses(), getExpense(), asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys(), PASSED (+4 more)

### Community 84 - "Community 84"
Cohesion: 0.42
Nodes (12): copy(), createCollection(), add(), commit(), get(), getAll(), loadBox(), remove() (+4 more)

### Community 85 - "Community 85"
Cohesion: 0.30
Nodes (12): approvedMonthCovering(), approvedMonths(), approvedRunMonths(), approvedRuns(), joiningDate(), joiningProblem(), leavingProblem(), localToday() (+4 more)

### Community 86 - "Community 86"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 87 - "Community 87"
Cohesion: 0.31
Nodes (9): checkIn(), checkInPlan(), checkInRefusal(), checkOut(), checkOutPlan(), checkOutRefusal(), dayFor(), isTracked() (+1 more)

### Community 88 - "Community 88"
Cohesion: 0.39
Nodes (6): CHAIN_STAGES, createChain(), holds(), managerCanDecide(), refusal(), isActive()

### Community 89 - "Community 89"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 90 - "Community 90"
Cohesion: 0.83
Nodes (3): parts(), slipsFor(), withNewEngine()

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 709 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 8` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 16`, `Community 17`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 55`, `Community 56`, `Community 57`, `Community 60`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 70`, `Community 74`, `Community 75`, `Community 79`, `Community 82`, `Community 87`, `Community 88`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08527131782945736 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 2` to `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 26`, `Community 28`, `Community 30`, `Community 31`, `Community 32`, `Community 35`, `Community 36`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 44`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 51`, `Community 53`, `Community 55`, `Community 57`, `Community 60`, `Community 64`, `Community 68`, `Community 76`, `Community 79`, `Community 81`, `Community 83`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0620253164556962 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 30` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 8`, `Community 9`, `Community 11`, `Community 13`, `Community 14`, `Community 17`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 28`, `Community 31`, `Community 32`, `Community 34`, `Community 35`, `Community 39`, `Community 40`, `Community 41`, `Community 44`, `Community 45`, `Community 47`, `Community 48`, `Community 49`, `Community 51`, `Community 53`, `Community 55`, `Community 56`, `Community 57`, `Community 60`, `Community 61`, `Community 66`, `Community 76`, `Community 78`, `Community 81`, `Community 83`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._