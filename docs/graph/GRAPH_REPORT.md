# Graph Report - officeos  (2026-11-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3259 nodes · 14600 edges · 87 communities (85 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 250 edges (avg confidence: 0.85)
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

## God Nodes (most connected - your core abstractions)
1. `el()` - 251 edges
2. `getUser()` - 221 edges
3. `formatDay()` - 180 edges
4. `nameOf()` - 145 edges
5. `useSession()` - 131 edges
6. `pageUrl()` - 126 edges
7. `useData()` - 110 edges
8. `todayIso()` - 106 edges
9. `getAllUsers()` - 95 edges
10. `plural()` - 94 edges

## Surprising Connections (you probably didn't know these)
- `CompanyProfile()` --indirect_call--> `updateCompanyProfile()`  [INFERRED]
  app/src/pages/CompanyProfile.jsx → assets/js/data/company-store.js
- `DeptForm()` --indirect_call--> `addDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js
- `DeptForm()` --indirect_call--> `updateDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js
- `assetApprovers()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/EmployeeDashboard.jsx → assets/js/ui/leave-view.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/MyRequests.jsx → assets/js/ui/leave-view.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (87 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (106): AuthLayout(), DEMO_PASSWORD, DEMO_USERS, ForgotPassword(), landingOf(), LinkPage(), Login(), Message() (+98 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (74): EmptyState(), initialsOf(), Switch(), Card(), bump(), getVersion(), listeners, subscribe() (+66 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (76): BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), MyRequests(), names(), stepsOf(), TABS (+68 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (73): row(), recentRow(), buildRow(), logRow(), ASIDE, byId(), decidedAt(), recordedTime() (+65 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (70): assetRequestDecisionsBy(), expenseDecisionsBy(), managesAnyone(), salaryProposals(), allCorrections, allLeave, asDecidedBy(), assetRow() (+62 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (52): NotBuilt(), ColumnChart(), detachedRows(), Row(), Table(), tdClass(), text(), Announcements() (+44 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (66): ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPE_KEYS, CATEGORIES, CATEGORY_KEYS, CONDITION_KEYS, CONDITIONS, LOCATION_KEYS (+58 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (61): checkInRefusal(), checkOutRefusal(), deviceLabel(), ACCURACY_LIMIT_M, active(), allLocationChanges(), answer(), applyChange() (+53 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (54): NO_DATA, NoData(), FLAG_EXPORT, FLAG_LABEL, flaggedCell(), flagText(), iconOfPlace(), metres() (+46 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (63): allAssetRequests(), assetsWithOpenReports(), assetTotals(), openReportOf(), ACTIONS, actionsCell(), actionSelect, assetCell() (+55 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (45): ConfirmContext, ConfirmDialog(), ConfirmProvider(), useConfirm(), useDecision(), described(), Field(), Input() (+37 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (50): COMPANY, companyInitial(), PRODUCT, signInAs(), ROLE_COLOUR, usePrefs(), AppearancePanel(), options() (+42 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (59): ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceNodes(), barLook(), EmployeeDashboard(), Icon() (+51 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (58): CATEGORIES, CATEGORY_KEYS, chainFor(), EXPENSE_POLICY, firstStage(), needsReceipt(), nextStage(), applied() (+50 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (59): actorWith(), addDepartment(), addUser(), adminOnly(), approvesRun(), byNonAdmin(), carriesAdmin(), changeUser() (+51 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (54): ApplyLeave(), balanceRows(), ERROR_ID, FOCUS, Kv(), typeMeta(), Calendar(), pad() (+46 more)

### Community 16 - "Community 16"
Cohesion: 0.08
Nodes (54): leaveWhat(), longDate(), BalanceCard(), Balances(), BAR, HEADS, HistoryRow(), MyLeave() (+46 more)

### Community 17 - "Community 17"
Cohesion: 0.07
Nodes (52): defaultMonth(), DOW, EMPTY, FIELD_ID, Holidays(), holidaysOf(), Icon(), overWarning() (+44 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (51): applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkIn(), checkInPlan(), checkInWindow() (+43 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (45): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+37 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (43): tabTitle(), signOutNow(), useSession(), NotPorted(), About(), Appearance(), Gallery(), LeavePolicy() (+35 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (45): preview(), BAND_NAME, BandBadge(), bandChange(), bandText(), days(), describePolicy(), Explain() (+37 more)

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (46): byName(), salaryRows(), ATTENDANCE_RULES, recordsStart(), absencesIn(), actorWith(), awayThrough(), checkSalary() (+38 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (46): permissionsOf(), fail(), changeFor(), stockStatus(), stockValue(), actorWith(), allMovements(), ASSET_REFERENCE (+38 more)

### Community 24 - "Community 24"
Cohesion: 0.08
Nodes (45): activityNodes(), activityText(), CardTitle(), emptyRow(), flaggedSince(), HrDashboard(), Icon(), ICONS (+37 more)

### Community 25 - "Community 25"
Cohesion: 0.10
Nodes (19): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+11 more)

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (43): ASSET_FLOW, CORRECTION_FLOW, EXPENSE_FLOW, LEAVE_FLOW, LOCATION_FLOW, PROFILE_FLOW, SALARY_FLOW, closeCards() (+35 more)

### Community 27 - "Community 27"
Cohesion: 0.09
Nodes (42): waitingCount(), waitingFor(), ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT, assetWhat(), chainEvents() (+34 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (40): Badge(), Icon(), PersonCell(), StatCard(), StatStrip(), Stepper(), Tabs(), DecisionButtons() (+32 more)

### Community 29 - "Community 29"
Cohesion: 0.08
Nodes (35): ALL_LOCATION_PERMISSIONS, ALL_PERMISSIONS, LOCATION_PERMISSIONS, PERMISSIONS, LOCATION_GRANTS, OVERRIDABLE, ROLE_KEYS, SELF_SERVICE (+27 more)

### Community 30 - "Community 30"
Cohesion: 0.14
Nodes (36): DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), FilterSelect(), IconButton(), PRESETS, rangeFor() (+28 more)

### Community 31 - "Community 31"
Cohesion: 0.08
Nodes (39): applyPermissions(), renderAssets(), calendarCard, cellLook(), clearErrors(), field(), FIELDS, fillMonths() (+31 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (38): alertText(), approverNames(), B(), checks(), dayOf(), DONE, monthLabel(), Months() (+30 more)

### Community 33 - "Community 33"
Cohesion: 0.11
Nodes (36): ROLES, runMonth(), renderPayroll(), alertText(), askedMonth, attendanceCheck(), buildRow(), checkItem() (+28 more)

### Community 34 - "Community 34"
Cohesion: 0.09
Nodes (36): allAssets(), allItems(), clearError(), deptField, deptSelect, EMPTY, FIELD, fillDepartments() (+28 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (34): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+26 more)

### Community 36 - "Community 36"
Cohesion: 0.11
Nodes (34): assetsFor(), actions, cardTitled(), daysAway(), deleteBtn, departmentName(), emptyCard(), formatAccount() (+26 more)

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (32): holdsPayRulePermission(), active(), admin(), applied(), CALCS, checkDeclaration(), chooseNewRegime(), copy() (+24 more)

### Community 38 - "Community 38"
Cohesion: 0.13
Nodes (34): proposalDecidersFor(), allRows, buildRow(), byName(), changeButtons(), changesAtOnce(), closeIcon(), currentRows() (+26 more)

### Community 39 - "Community 39"
Cohesion: 0.07
Nodes (34): attentionCount, attentionList, attentionNote(), dateInput, deptBars, deptDate, deptSelect, emptyRow() (+26 more)

### Community 40 - "Community 40"
Cohesion: 0.10
Nodes (32): CAPPED, DOW, Icon(), isOff(), person(), TeamLeave(), leavePolicyOn(), overlaps() (+24 more)

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (31): getExpense(), PAY_RULES, payslipTotals(), asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys() (+23 more)

### Community 42 - "Community 42"
Cohesion: 0.13
Nodes (28): load(), save(), allEvents(), AUDIT_KINDS, AUDIT_LABEL, empty(), eventsFor(), read() (+20 more)

### Community 43 - "Community 43"
Cohesion: 0.14
Nodes (30): CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), holdersOf(), holdsStage(), isActive(), isHeldFor() (+22 more)

### Community 44 - "Community 44"
Cohesion: 0.09
Nodes (29): DEPARTMENTS, MANAGER_OF, PROFILE_DETAILS, USERS, avatarClass(), buildRow(), departmentName(), departmentSelect (+21 more)

### Community 45 - "Community 45"
Cohesion: 0.09
Nodes (32): clock, errorLine, grace, inBtn, lateMarks, lateNote, modeInputs, note (+24 more)

### Community 46 - "Community 46"
Cohesion: 0.12
Nodes (31): actionsCell(), categoryCell(), claimsText(), decidableIds(), EMPTY, entryOf(), lastAt(), matches() (+23 more)

### Community 47 - "Community 47"
Cohesion: 0.13
Nodes (29): badgeOf(), Reason(), BADGE, claimsText(), EMPTY, Expenses(), ICONS, lastAt() (+21 more)

### Community 48 - "Community 48"
Cohesion: 0.12
Nodes (29): monthSpan(), activityItems(), claimItems(), claimText(), EVENT, FinanceDashboard(), Icon(), ICONS (+21 more)

### Community 49 - "Community 49"
Cohesion: 0.14
Nodes (30): Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel(), TABS (+22 more)

### Community 50 - "Community 50"
Cohesion: 0.15
Nodes (28): deviceLine(), dist(), isHome(), m(), MarkAttendance(), ordinal(), pad(), placeLine() (+20 more)

### Community 51 - "Community 51"
Cohesion: 0.18
Nodes (24): NAV, OTHER_PAGES, getCurrentUserId(), canOpenPage(), depthInPages(), resolvePageLink(), resolveRootLink(), rootPrefix() (+16 more)

### Community 52 - "Community 52"
Cohesion: 0.22
Nodes (28): lossOfPayDaysIn(), compareRegimes(), hraExemption(), money(), oldRegimeDeductions(), payMonth(), policyLossOfPay(), policyLossOfPayFrom() (+20 more)

### Community 53 - "Community 53"
Cohesion: 0.12
Nodes (27): addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry(), fail() (+19 more)

### Community 54 - "Community 54"
Cohesion: 0.07
Nodes (29): activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, assetWhat(), chart, deptSelect (+21 more)

### Community 55 - "Community 55"
Cohesion: 0.12
Nodes (27): getDepartment(), headcountByDepartment(), activeInput, addBtn, buildCard(), clearError(), codeInput, descEl (+19 more)

### Community 56 - "Community 56"
Cohesion: 0.10
Nodes (28): chainText(), clearError(), clearReportError(), FIELD, fillReplaces(), form, ICON, icon() (+20 more)

### Community 57 - "Community 57"
Cohesion: 0.19
Nodes (27): amount(), approved(), buildRow(), field(), financialYear(), joinedNote(), label(), messageRow() (+19 more)

### Community 58 - "Community 58"
Cohesion: 0.14
Nodes (26): bellItem(), buildCard(), buildPanel(), cardLink(), cardState(), CHAIN_STAGE, closeApprovalCard(), closeBellPanel() (+18 more)

### Community 59 - "Community 59"
Cohesion: 0.15
Nodes (24): NO_DATA, showEmployerBox(), slipsFor(), approved(), listed(), missingMonthText(), monthLabel(), notesOf() (+16 more)

### Community 60 - "Community 60"
Cohesion: 0.18
Nodes (24): submitReport(), submitRequest(), closeIcon(), deactivateDialog(), closeIcon(), correctionFlow, createDecisionFlow(), approve() (+16 more)

### Community 61 - "Community 61"
Cohesion: 0.23
Nodes (23): parts(), runRows(), withNewEngine(), monthLabel(), now(), pct(), SalaryPlan(), slabRows() (+15 more)

### Community 62 - "Community 62"
Cohesion: 0.19
Nodes (23): summaryOfDays(), attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), expenseSpendChart(), headcountChart(), HOURS_DATA (+15 more)

### Community 63 - "Community 63"
Cohesion: 0.11
Nodes (24): setStat(), actionsHead, decidedAt(), matches(), outCard, overlapAlert, paginationEl, PILL_TAB (+16 more)

### Community 64 - "Community 64"
Cohesion: 0.12
Nodes (23): balanceList, chainList, clearError(), durationSelect, FIELD, form, fromInput, kvRow() (+15 more)

### Community 65 - "Community 65"
Cohesion: 0.18
Nodes (23): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+15 more)

### Community 66 - "Community 66"
Cohesion: 0.16
Nodes (17): ALSO_FOR_MANAGERS, ROUTES, getCurrentUserLabel(), getSession(), isSignedIn(), signIn(), signOut(), currentPagePath() (+9 more)

### Community 67 - "Community 67"
Cohesion: 0.11
Nodes (14): initialsFrom(), orDash(), profileOf(), approvalChainText(), reportingManagerName(), clearError(), departmentName(), form (+6 more)

### Community 68 - "Community 68"
Cohesion: 0.17
Nodes (19): annualTax(), computePay(), FILING_SAMPLE, filingDates(), lastDay(), leap(), lossOfPayAmount(), lossOfPayDays() (+11 more)

### Community 69 - "Community 69"
Cohesion: 0.21
Nodes (18): BarRows(), DEDUCTIONS, ICONS, people(), returnToFile(), SLABS, TaxDeductions(), active() (+10 more)

### Community 70 - "Community 70"
Cohesion: 0.22
Nodes (19): Kv(), ACTION, askWhom(), ChangeForm(), Content(), day(), HomeCard(), KIND_HINT (+11 more)

### Community 71 - "Community 71"
Cohesion: 0.23
Nodes (19): slipTotals(), amount(), approved(), financialYear(), ICONS, joinedNote(), label(), MessageRow() (+11 more)

### Community 72 - "Community 72"
Cohesion: 0.21
Nodes (11): MAIN, RAW, SamplePage(), ok, closeAllDropdowns(), initDropdowns(), triggerOf(), initMenuToggle() (+3 more)

### Community 73 - "Community 73"
Cohesion: 0.21
Nodes (15): admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail(), isDay(), isMonth() (+7 more)

### Community 74 - "Community 74"
Cohesion: 0.24
Nodes (16): cellText(), COLUMNS, csvCell(), csvText(), downloadCsv(), exportStatsAsCsv(), exportTableAsCsv(), initExports() (+8 more)

### Community 75 - "Community 75"
Cohesion: 0.25
Nodes (13): ICONS, SECTION_ICONS, initRail(), close(), fit(), open(), inRail(), renderFooter() (+5 more)

### Community 76 - "Community 76"
Cohesion: 0.26
Nodes (14): approvedMonthCovering(), approvedMonths(), approvedRunMonths(), approvedRuns(), joiningDate(), joiningProblem(), leavingPeriods(), leavingProblem() (+6 more)

### Community 77 - "Community 77"
Cohesion: 0.24
Nodes (11): decider(), approve(), submit(), getCurrentRole(), getCurrentUser(), can(), canAll(), canAny() (+3 more)

### Community 78 - "Community 78"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 79 - "Community 79"
Cohesion: 0.44
Nodes (11): copy(), createCollection(), add(), commit(), get(), getAll(), loadBox(), remove() (+3 more)

### Community 80 - "Community 80"
Cohesion: 0.33
Nodes (10): COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS, getCompanyProfile(), loadBox() (+2 more)

### Community 81 - "Community 81"
Cohesion: 0.24
Nodes (8): clearError(), form, showError(), clearError(), form, showError(), ensureContainer(), initToasts()

### Community 82 - "Community 82"
Cohesion: 0.40
Nodes (8): liveRows(), approvedRow(), approvedSnapshot(), copy(), freezeSnapshot(), snapshotMonth(), store, writeSnapshot()

### Community 83 - "Community 83"
Cohesion: 0.33
Nodes (8): buildOption(), closeIcon(), iconButton(), renderSearch(), close(), draw(), setActive(), shutBox()

### Community 84 - "Community 84"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 731 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 43` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 27`, `Community 28`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 50`, `Community 51`, `Community 53`, `Community 54`, `Community 56`, `Community 57`, `Community 59`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 71`, `Community 73`, `Community 77`, `Community 80`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05536445536445536 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 3` to `Community 2`, `Community 4`, `Community 6`, `Community 8`, `Community 9`, `Community 12`, `Community 13`, `Community 16`, `Community 17`, `Community 24`, `Community 27`, `Community 28`, `Community 29`, `Community 31`, `Community 33`, `Community 34`, `Community 36`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 45`, `Community 46`, `Community 48`, `Community 51`, `Community 54`, `Community 56`, `Community 57`, `Community 58`, `Community 60`, `Community 63`, `Community 64`, `Community 65`, `Community 68`, `Community 77`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0692202462380301 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 2` to `Community 1`, `Community 3`, `Community 4`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 16`, `Community 17`, `Community 19`, `Community 21`, `Community 24`, `Community 26`, `Community 27`, `Community 28`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 36`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 46`, `Community 47`, `Community 48`, `Community 54`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 61`, `Community 63`, `Community 65`, `Community 69`, `Community 70`, `Community 71`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._