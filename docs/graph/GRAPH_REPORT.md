# Graph Report - officeos  (2026-11-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3628 nodes · 16710 edges · 97 communities (94 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 245 edges (avg confidence: 0.85)
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

## God Nodes (most connected - your core abstractions)
1. `getUser()` - 277 edges
2. `el()` - 258 edges
3. `formatDay()` - 206 edges
4. `useSession()` - 156 edges
5. `nameOf()` - 153 edges
6. `useData()` - 128 edges
7. `pageUrl()` - 125 edges
8. `getAllUsers()` - 107 edges
9. `todayIso()` - 106 edges
10. `useToast()` - 100 edges

## Surprising Connections (you probably didn't know these)
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/MyRequests.jsx → assets/js/ui/leave-view.js
- `MyLeave()` --indirect_call--> `cancelLeave()`  [INFERRED]
  app/src/pages/MyLeave.jsx → assets/js/data/leave-store.js
- `visitDates()` --calls--> `formatDay()`  [EXTRACTED]
  app/src/components/Decision.jsx → assets/js/ui/leave-view.js
- `assetWhat()` --calls--> `assetTypeLabel()`  [EXTRACTED]
  app/src/pages/AdminDashboard.jsx → assets/js/ui/inventory-view.js
- `monthYear()` --calls--> `monthName()`  [EXTRACTED]
  app/src/ui/leaveband.jsx → assets/js/ui/leave-view.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (97 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (104): Badge(), badgeOf(), Icon(), NotBuilt(), Reason(), StatCard(), StatStrip(), Stepper() (+96 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (86): BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), MyRequests(), names(), stepsOf(), TABS (+78 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (69): PRODUCT, ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS (+61 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (83): chainEvents(), correctionTitle(), decisionDate(), Actions(), entryOf(), Muted(), names(), activityItems() (+75 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (65): DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), IconButton(), PRESETS, rangeFor(), rangeWords() (+57 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (63): COMPANY, companyInitial(), tabTitle(), signInAs(), signOutNow(), useSession(), NotPorted(), About() (+55 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (69): ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT, approvalItems(), assetWhat(), emptyRow(), Icon() (+61 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (69): ApplyLeave(), balanceRows(), ERROR_ID, FOCUS, Kv(), typeMeta(), skippedEntry(), dayNumber() (+61 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (68): DEMO, logEvent(), accountOf(), b64(), b64url(), blank(), changeOwnPassword(), checkToken() (+60 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (62): flagText(), activityNodes(), CardTitle(), emptyRow(), flaggedSince(), HrDashboard(), Icon(), ICONS (+54 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (66): allAssetRequests(), allAssets(), assetsHeldByInactive(), assetsWithOpenReports(), assetTotals(), isActive(), openReportOf(), ACTIONS (+58 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (59): pendingRegularizations(), actionsHead, arrowIcon(), byId(), decidedAt(), matches(), paginationEl, PILL_TAB (+51 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (51): EmptyState(), NO_DATA, useConfirm(), FilterSelect(), useDecision(), countText(), nounOf(), Content() (+43 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (51): ColumnChart(), NO_DATA, NoData(), FLAG_EXPORT, FLAG_LABEL, flaggedCell(), metres(), PLACE_ICON (+43 more)

### Community 14 - "Community 14"
Cohesion: 0.10
Nodes (58): applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkIn(), checkInPlan(), checkInRefusal() (+50 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (54): preview(), BAND_NAME, BandBadge(), bandChange(), bandText(), days(), describePolicy(), Explain() (+46 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (58): actorWith(), addDepartment(), addUser(), adminOnly(), approvesRun(), byNonAdmin(), carriesAdmin(), changeUser() (+50 more)

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (55): leaveWhat(), leaveTitle(), requestName(), activityText(), longDate(), BalanceCard(), Balances(), BAR (+47 more)

### Community 18 - "Community 18"
Cohesion: 0.06
Nodes (55): ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPE_KEYS, CATEGORIES, CATEGORY_KEYS, CONDITION_KEYS, CONDITIONS, LOCATION_KEYS (+47 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (51): described(), Field(), Input(), Select(), Switch(), TextArea(), Modal(), bump() (+43 more)

### Community 20 - "Community 20"
Cohesion: 0.10
Nodes (55): row(), recentRow(), buildRow(), logRow(), ASIDE, byId(), decidedAt(), recordedTime() (+47 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (25): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+17 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (52): recordsStart(), correctionContext(), NIGHT_WINDOW_DEFAULT, NIGHT_WINDOW_MAX, nightCheckOutJudge(), nightFixHours(), nightFixWindow(), resetNightFix() (+44 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (49): PersonCell(), decidedAt(), LeaveApprovals(), stageBadge(), STATS, TABS, Calendar(), CAPPED (+41 more)

### Community 24 - "Community 24"
Cohesion: 0.07
Nodes (49): defaultMonth(), DOW, EMPTY, FIELD_ID, Holidays(), holidaysOf(), Icon(), overWarning() (+41 more)

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (46): parts(), runRows(), withNewEngine(), alertText(), approverNames(), B(), checks(), dayOf() (+38 more)

### Community 26 - "Community 26"
Cohesion: 0.10
Nodes (42): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+34 more)

### Community 27 - "Community 27"
Cohesion: 0.08
Nodes (45): resetAssetRequestData(), resetAttendanceData(), resetPayrollData(), avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam (+37 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (41): active(), DeclarationsReview(), MyDeclaration(), now(), STATUS, StatusPill(), holdsPayRulePermission(), active() (+33 more)

### Community 29 - "Community 29"
Cohesion: 0.14
Nodes (44): directReportsOf(), managerOf(), ACCURACY_FLAG_M, ACCURACY_REFUSE_M, active(), ADDRESS_MAX, assignVisit(), build() (+36 more)

### Community 30 - "Community 30"
Cohesion: 0.10
Nodes (42): movementEvent(), changeFor(), stockStatus(), stockValue(), actorWith(), allMovements(), ASSET_REFERENCE, assets (+34 more)

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (41): viewOf(), FIELD, FIELDS, PAN_HOLDER, PROFILE_SECTIONS, RULES, SECTIONS, VD (+33 more)

### Community 32 - "Community 32"
Cohesion: 0.10
Nodes (39): seedDays(), dayOffChecker(), isoFromDayNumber(), daysWorked(), lossOfPayDaysIn(), absencesIn(), approversFor(), approves() (+31 more)

### Community 33 - "Community 33"
Cohesion: 0.09
Nodes (35): showEmployerBox(), slipsFor(), CheckInPlaces(), departmentName(), initialsFrom(), Kv(), MyDevices(), MyProfile() (+27 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (36): initialsOf(), Card(), useData(), Content(), daysAway(), departmentName(), Devices(), heldText() (+28 more)

### Community 35 - "Community 35"
Cohesion: 0.10
Nodes (32): ASSET_FLOW, CORRECTION_FLOW, EXPENSE_FLOW, LEAVE_FLOW, LOCATION_FLOW, OVERTIME_FLOW, PROFILE_FLOW, SALARY_FLOW (+24 more)

### Community 36 - "Community 36"
Cohesion: 0.09
Nodes (29): Content(), Form(), LIST, MONTHS, OVERRIDES_HINT, plural(), problemsOf(), RULES (+21 more)

### Community 37 - "Community 37"
Cohesion: 0.09
Nodes (35): checkInWindow(), clock, errorLine, grace, inBtn, lateMarks, lateNote, modeInputs (+27 more)

### Community 38 - "Community 38"
Cohesion: 0.10
Nodes (34): reportingManagerName(), actions, cardTitled(), closeIcon(), daysAway(), deactivateDialog(), deleteBtn, departmentName() (+26 more)

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (34): setStat(), setStat(), setStat(), setStat(), amount(), approved(), buildRow(), field() (+26 more)

### Community 40 - "Community 40"
Cohesion: 0.10
Nodes (33): DecisionButtons(), BELL_SELECTOR, bellListeners, BellPanel(), Card(), CardHost(), cardOpener(), cardState() (+25 more)

### Community 41 - "Community 41"
Cohesion: 0.16
Nodes (34): hasPermission(), activeUser(), allAssignmentRows(), allDepartmentDefaults(), allSwaps(), assignMany(), assignmentsFor(), assignRow() (+26 more)

### Community 42 - "Community 42"
Cohesion: 0.16
Nodes (29): decider(), approve(), submit(), NAV, OTHER_PAGES, getCurrentRole(), getCurrentUserId(), canOpenPage() (+21 more)

### Community 43 - "Community 43"
Cohesion: 0.13
Nodes (29): load(), save(), AUDIT_KINDS, AUDIT_LABEL, empty(), read(), resetAuditTrail(), copy() (+21 more)

### Community 44 - "Community 44"
Cohesion: 0.12
Nodes (31): monthSpan(), claimItems(), claimText(), EVENT, FinanceDashboard(), Icon(), ICONS, monthlyRuns() (+23 more)

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (31): monthLabel(), now(), pct(), SalaryPlan(), slabRows(), slabText(), TaxExplain(), compareRegimes() (+23 more)

### Community 46 - "Community 46"
Cohesion: 0.10
Nodes (32): calendarCard, cellLook(), clearErrors(), field(), FIELDS, fixableIssue(), form, isOffOrEmpty() (+24 more)

### Community 47 - "Community 47"
Cohesion: 0.14
Nodes (31): resetCompanyProfile(), resetAllDevices(), ACCURACY_LIMIT_M, active(), answer(), applyChange(), blank(), cancelLocationChange() (+23 more)

### Community 48 - "Community 48"
Cohesion: 0.11
Nodes (29): addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry(), fail() (+21 more)

### Community 49 - "Community 49"
Cohesion: 0.07
Nodes (31): activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, assetWhat(), chart, deptSelect (+23 more)

### Community 50 - "Community 50"
Cohesion: 0.12
Nodes (31): actionsCell(), categoryCell(), claimsText(), decidableIds(), EMPTY, entryOf(), lastAt(), matches() (+23 more)

### Community 51 - "Community 51"
Cohesion: 0.14
Nodes (30): people(), ATTENDANCE_RULES, canApprove(), alertText(), askedMonth, attendanceCheck(), buildRow(), checkItem() (+22 more)

### Community 52 - "Community 52"
Cohesion: 0.12
Nodes (29): getAssetRequest(), getRegularization(), getRequest(), bellItem(), buildCard(), buildPanel(), cardOpener(), cardState() (+21 more)

### Community 53 - "Community 53"
Cohesion: 0.11
Nodes (30): assetsFor(), clearError(), clearReportError(), FIELD, fillReplaces(), form, ICON, icon() (+22 more)

### Community 54 - "Community 54"
Cohesion: 0.13
Nodes (29): renderBadMonth(), approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel() (+21 more)

### Community 55 - "Community 55"
Cohesion: 0.12
Nodes (25): buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form, managerChoice() (+17 more)

### Community 56 - "Community 56"
Cohesion: 0.15
Nodes (29): ActionsCell(), B(), byName(), changesAtOnce(), editBlocked(), formulaText(), monthlyCost(), salaryRows() (+21 more)

### Community 57 - "Community 57"
Cohesion: 0.13
Nodes (29): CATEGORIES, applied(), approverMustPay(), at(), auto(), averageProcessingDays(), blank(), by() (+21 more)

### Community 58 - "Community 58"
Cohesion: 0.10
Nodes (28): allItems(), movementEvent(), clearError(), deptField, deptSelect, EMPTY, FIELD, fillDepartments() (+20 more)

### Community 59 - "Community 59"
Cohesion: 0.14
Nodes (27): annualTax(), computePay(), FILING_SAMPLE, filingDates(), lastDay(), leap(), lossOfPayDays(), monthlyTds() (+19 more)

### Community 60 - "Community 60"
Cohesion: 0.09
Nodes (29): ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceCard, chart, hoursNote, hoursRange (+21 more)

### Community 61 - "Community 61"
Cohesion: 0.16
Nodes (28): allRows, buildRow(), changeButtons(), changesAtOnce(), closeIcon(), currentRows(), editBlocked(), field() (+20 more)

### Community 62 - "Community 62"
Cohesion: 0.14
Nodes (27): waitingFor(), remove(), resetCompOff(), pendingLocationChanges(), pendingUnlockRequests(), allOvertimeDecisions(), copy(), decideOvertime() (+19 more)

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (26): isManagerNow(), CHAIN, decideAssetRequest(), fulfilAssetRequest(), holdersOf(), holdsStage(), isActive(), isHeldFor() (+18 more)

### Community 64 - "Community 64"
Cohesion: 0.15
Nodes (27): copy(), createShift(), deactivateShift(), entry(), fail(), firstProblem(), hours(), isInt() (+19 more)

### Community 65 - "Community 65"
Cohesion: 0.15
Nodes (22): APP_NAV, APP_OTHER_PAGES, APP_OWN, mayOpenLeavePolicy(), mayOpenOutbox(), mayOpenRates(), mayOpenTeamVisits(), MY_VISITS_ITEM (+14 more)

### Community 66 - "Community 66"
Cohesion: 0.13
Nodes (24): activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el(), ensureOption() (+16 more)

### Community 67 - "Community 67"
Cohesion: 0.18
Nodes (23): iconOfPlace(), placeLabel(), dist(), isHome(), joinsText(), m(), MarkAttendance(), ordinal() (+15 more)

### Community 68 - "Community 68"
Cohesion: 0.18
Nodes (23): placesFor(), copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), getOffices() (+15 more)

### Community 69 - "Community 69"
Cohesion: 0.23
Nodes (23): MODES, storedRecord(), checkInAt(), checkOutAt(), stampAfter(), where(), shiftDayFor(), completeShiftDay() (+15 more)

### Community 70 - "Community 70"
Cohesion: 0.17
Nodes (23): allEvents(), createdDay(), employmentPeriod(), employmentState(), isAppCreated(), isEmployedOn(), joinedOn(), joinsOn() (+15 more)

### Community 71 - "Community 71"
Cohesion: 0.10
Nodes (14): DEPARTMENTS, DESIGNATIONS, MANAGER_OF, PROFILE_DETAILS, USERS, clearError(), departmentName(), form (+6 more)

### Community 72 - "Community 72"
Cohesion: 0.13
Nodes (22): balanceTable, calendarCard, CAPPED, dayCell(), inView(), isOff(), month, outCard (+14 more)

### Community 73 - "Community 73"
Cohesion: 0.15
Nodes (18): ConfirmContext, ConfirmDialog(), ConfirmProvider(), CloseIcon(), DISCARD, focusables(), useDialogFocus(), cell() (+10 more)

### Community 74 - "Community 74"
Cohesion: 0.16
Nodes (16): ALSO_FOR_MANAGERS, ROUTES, getCurrentUserLabel(), getSession(), isSignedIn(), signIn(), signOut(), currentPagePath() (+8 more)

### Community 75 - "Community 75"
Cohesion: 0.14
Nodes (19): amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD, form (+11 more)

### Community 76 - "Community 76"
Cohesion: 0.24
Nodes (17): Kv(), ACTION, askWhom(), ChangeForm(), Content(), day(), HomeCard(), KIND_HINT (+9 more)

### Community 77 - "Community 77"
Cohesion: 0.21
Nodes (17): admin(), compOffRule(), copy(), DEFAULT_COMP_OFF, DEFAULT_LATE_POLICY, DEFAULT_SHIFT_RULES_FROM, entry(), fail() (+9 more)

### Community 78 - "Community 78"
Cohesion: 0.18
Nodes (11): ok, depthInPages(), resolveRootLink(), rootPrefix(), closeAllDropdowns(), initDropdowns(), triggerOf(), initMenuToggle() (+3 more)

### Community 79 - "Community 79"
Cohesion: 0.21
Nodes (15): applyPermissions(), allVendors(), VENDOR_STATUS_KEYS, editButton(), renderComponents(), byId(), contactLine(), matches() (+7 more)

### Community 80 - "Community 80"
Cohesion: 0.25
Nodes (16): closeIcon(), createDecisionFlow(), approve(), buildModal(), clearError(), openReject(), showError(), submitReject() (+8 more)

### Community 81 - "Community 81"
Cohesion: 0.23
Nodes (14): getCurrentUser(), ICONS, SECTION_ICONS, initRail(), close(), fit(), open(), inRail() (+6 more)

### Community 82 - "Community 82"
Cohesion: 0.33
Nodes (15): payRuleSettings(), esiFor(), gratuityAccrualFor(), isIntern(), labourWelfareFor(), money(), monthOf(), monthStart() (+7 more)

### Community 83 - "Community 83"
Cohesion: 0.29
Nodes (14): showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme(), onAppearanceChange() (+6 more)

### Community 84 - "Community 84"
Cohesion: 0.26
Nodes (14): deviceLine(), copy(), deviceLabel(), devicesFor(), deviceToken(), fail(), MAX_DEVICES, mine() (+6 more)

### Community 85 - "Community 85"
Cohesion: 0.23
Nodes (13): admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail(), isDay(), isMonth() (+5 more)

### Community 86 - "Community 86"
Cohesion: 0.26
Nodes (11): allExpenses(), getExpense(), asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys(), PASSED (+3 more)

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
Nodes (8): buildOption(), closeIcon(), iconButton(), renderSearch(), close(), draw(), setActive(), shutBox()

### Community 91 - "Community 91"
Cohesion: 0.39
Nodes (6): CHAIN_STAGES, createChain(), holds(), managerCanDecide(), refusal(), isActive()

### Community 92 - "Community 92"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 93 - "Community 93"
Cohesion: 0.47
Nodes (5): ADDRESS_MAX, coordsProblem(), distanceM(), isNum(), rad()

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 769 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 7` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 19`, `Community 20`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 41`, `Community 42`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 67`, `Community 68`, `Community 69`, `Community 70`, `Community 71`, `Community 72`, `Community 74`, `Community 75`, `Community 77`, `Community 81`, `Community 84`, `Community 85`, `Community 88`, `Community 91`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.049523809523809526 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 1` to `Community 0`, `Community 3`, `Community 4`, `Community 6`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 28`, `Community 33`, `Community 34`, `Community 35`, `Community 38`, `Community 39`, `Community 40`, `Community 44`, `Community 45`, `Community 46`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 56`, `Community 59`, `Community 60`, `Community 61`, `Community 72`, `Community 73`, `Community 76`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05860805860805861 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 20` to `Community 1`, `Community 3`, `Community 6`, `Community 7`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 17`, `Community 18`, `Community 19`, `Community 23`, `Community 24`, `Community 37`, `Community 38`, `Community 39`, `Community 42`, `Community 44`, `Community 46`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 55`, `Community 58`, `Community 59`, `Community 60`, `Community 61`, `Community 72`, `Community 75`, `Community 79`, `Community 80`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._