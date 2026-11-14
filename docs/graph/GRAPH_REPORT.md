# Graph Report - officeos  (2026-11-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3050 nodes · 13546 edges · 96 communities (93 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 237 edges (avg confidence: 0.85)
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
1. `el()` - 251 edges
2. `getUser()` - 199 edges
3. `formatDay()` - 177 edges
4. `nameOf()` - 140 edges
5. `pageUrl()` - 113 edges
6. `useSession()` - 113 edges
7. `todayIso()` - 104 edges
8. `useData()` - 99 edges
9. `plural()` - 96 edges
10. `Frame()` - 91 edges

## Surprising Connections (you probably didn't know these)
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/Expenses.jsx → assets/js/ui/leave-view.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/MyRequests.jsx → assets/js/ui/leave-view.js
- `MyLeave()` --indirect_call--> `cancelLeave()`  [INFERRED]
  app/src/pages/MyLeave.jsx → assets/js/data/leave-store.js
- `CompanyProfile()` --indirect_call--> `updateCompanyProfile()`  [INFERRED]
  app/src/pages/CompanyProfile.jsx → assets/js/data/company-store.js
- `DeptForm()` --indirect_call--> `addDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (96 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (79): ApplyLeave(), balanceRows(), ERROR_ID, FOCUS, Kv(), typeMeta(), Calendar(), pad() (+71 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (71): Actions(), BADGE, claimsText(), EMPTY, entryOf(), Expenses(), ICONS, lastAt() (+63 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (66): decisionDate(), assetRequestDecisionsBy(), pendingRegularizations(), expenseDecisionsBy(), managesAnyone(), pendingFor(), salaryProposals(), allCorrections (+58 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (64): deviceLine(), isHome(), longDate(), m(), MarkAttendance(), ordinal(), pad(), placeLine() (+56 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (46): NotBuilt(), NotPorted(), Announcements(), AuditLog(), T1_COLUMNS, T1_ROWS(), Backup(), T1_COLUMNS (+38 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (50): NO_DATA, NoData(), FLAG_EXPORT, FLAG_LABEL, flaggedCell(), metres(), PLACE_ICON, stampKey() (+42 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (62): load(), save(), pureBox(), actorWith(), addDepartment(), addUser(), adminOnly(), approvesRun() (+54 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (60): initialsFrom(), orDash(), profileOf(), Content(), daysAway(), departmentName(), formatAccount(), heldText() (+52 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (60): leaveWhat(), activityNodes(), activityText(), emptyRow(), flaggedSince(), HrDashboard(), Icon(), ICONS (+52 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (59): assetsHeldByInactive(), assetTotals(), earliestHandOver(), ACTIONS, actionsCell(), actionSelect, assetCell(), assetSelect (+51 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (50): DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), FilterSelect(), IconButton(), PRESETS, rangeFor() (+42 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (56): BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), MyRequests(), names(), stepsOf(), TABS (+48 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (46): ConfirmContext, ConfirmDialog(), ConfirmProvider(), useConfirm(), described(), Field(), Input(), Person() (+38 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (52): ASSET_FLOW, CORRECTION_FLOW, decider(), EXPENSE_FLOW, LEAVE_FLOW, LOCATION_FLOW, SALARY_FLOW, useDecision() (+44 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (53): attentionItems(), attentionNote(), CheckIcon(), OutNextWeek(), Step(), byDate(), getAllHolidays(), HOLIDAY_KINDS (+45 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (48): preview(), BAND_NAME, bandChange(), bandText(), days(), describePolicy(), Explain(), monthYear() (+40 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (51): recordedTime(), attendance, byName(), chain, checkIn(), checkInPlan(), checkInRefusal(), checkOut() (+43 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (43): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+35 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (44): activityItems(), claimItems(), claimText(), COST_NOTE, EVENT, FinanceDashboard(), Icon(), ICONS (+36 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (42): Badge(), Icon(), NO_DATA, PersonCell(), StatCard(), StatStrip(), Stepper(), Tabs() (+34 more)

### Community 20 - "Community 20"
Cohesion: 0.10
Nodes (19): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+11 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (46): ASSET_STATUS_KEYS, needsReorder(), STOCK_STATUS_KEYS, stockStatus(), stockValue(), actorWith(), allMovements(), ASSET_REFERENCE (+38 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (43): allAssetRequests(), getExpense(), asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys(), PASSED (+35 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (41): ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT, approvalItems(), assetWhat(), chainEvents(), emptyRow() (+33 more)

### Community 24 - "Community 24"
Cohesion: 0.08
Nodes (41): avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el(), emptyRow(), exportBtn (+33 more)

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (41): row(), recentRow(), buildRow(), fixableIssue(), logRow(), row(), timesCell(), placeWords() (+33 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (40): applyPermissions(), runMonth(), runTotals(), renderPayroll(), renderAssets(), renderLog(), alertText(), askedMonth (+32 more)

### Community 27 - "Community 27"
Cohesion: 0.07
Nodes (38): attentionCount, attentionList, attentionNote(), dateInput, deptBars, deptDate, deptSelect, emptyRow() (+30 more)

### Community 28 - "Community 28"
Cohesion: 0.08
Nodes (36): MOVEMENT_TYPE_KEYS, allAssets(), clearError(), deptField, deptSelect, EMPTY, FIELD, fillDepartments() (+28 more)

### Community 29 - "Community 29"
Cohesion: 0.09
Nodes (35): ATTENDANCE_RULES, checkInWindow(), clock, errorLine, grace, inBtn, lateMarks, lateNote (+27 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (32): permissionsOf(), actorWith(), approveProblem(), approveRun(), approves(), awayThrough(), canApprove(), checkSalary() (+24 more)

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (31): useData(), defaultMonth(), DOW, EMPTY, FIELD_ID, Holidays(), holidaysOf(), Icon() (+23 more)

### Community 32 - "Community 32"
Cohesion: 0.13
Nodes (31): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+23 more)

### Community 33 - "Community 33"
Cohesion: 0.07
Nodes (33): activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, assetWhat(), chainEvents(), chart (+25 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (32): firstStage(), nextStage(), applied(), approverMustPay(), at(), auto(), blank(), by() (+24 more)

### Community 35 - "Community 35"
Cohesion: 0.10
Nodes (32): calendarCard, cellLook(), clearErrors(), field(), FIELDS, fillMonths(), form, isOffOrEmpty() (+24 more)

### Community 36 - "Community 36"
Cohesion: 0.09
Nodes (31): ASSET_TYPE_KEYS, clearError(), clearReportError(), FIELD, fillReplaces(), form, ICON, icon() (+23 more)

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (27): clearError(), form, showError(), clearError(), form, showError(), issueLabel(), closeIcon() (+19 more)

### Community 38 - "Community 38"
Cohesion: 0.08
Nodes (31): ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceCard, barLook(), chart, hoursNote (+23 more)

### Community 39 - "Community 39"
Cohesion: 0.12
Nodes (28): addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry(), fail() (+20 more)

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (25): buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form, managerChoice() (+17 more)

### Community 41 - "Community 41"
Cohesion: 0.16
Nodes (29): tabTitle(), signOutNow(), useSession(), About(), Appearance(), Gallery(), LeavePolicy(), ACTION (+21 more)

### Community 42 - "Community 42"
Cohesion: 0.14
Nodes (27): ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), barLook(), EmployeeDashboard(), Icon(), ICONS (+19 more)

### Community 43 - "Community 43"
Cohesion: 0.14
Nodes (28): departmentName(), Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel() (+20 more)

### Community 44 - "Community 44"
Cohesion: 0.19
Nodes (26): Content(), OfficeForm(), plural(), typeLabel(), useDevicePosition(), copy(), createOffice(), deactivateOffice() (+18 more)

### Community 45 - "Community 45"
Cohesion: 0.14
Nodes (26): CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), getAssetRequest(), holdersOf(), holdsStage(), isActive() (+18 more)

### Community 46 - "Community 46"
Cohesion: 0.11
Nodes (28): actionsHead, decidedAt(), matches(), outCard, overlapAlert, paginationEl, PILL_TAB, pills (+20 more)

### Community 47 - "Community 47"
Cohesion: 0.12
Nodes (26): getRegularization(), getRequest(), buildCard(), buildPanel(), cardState(), CHAIN_STAGE, closeApprovalCard(), closeBellPanel() (+18 more)

### Community 48 - "Community 48"
Cohesion: 0.25
Nodes (26): compareRegimes(), hraExemption(), money(), oldRegimeDeductions(), payMonth(), taxOn(), tdsFor(), trace() (+18 more)

### Community 49 - "Community 49"
Cohesion: 0.14
Nodes (26): inventoryValueChart(), CATEGORY_KEYS, stockBarPercent(), inventoryTotals(), byCategory(), categoryCell(), ICON, icon() (+18 more)

### Community 50 - "Community 50"
Cohesion: 0.17
Nodes (25): Reason(), DecisionButtons(), ActionsCell(), B(), byName(), changesAtOnce(), editBlocked(), formulaText() (+17 more)

### Community 51 - "Community 51"
Cohesion: 0.17
Nodes (22): getCurrentRole(), getCurrentUser(), getCurrentUserLabel(), getSession(), isSignedIn(), signOut(), canAll(), canAny() (+14 more)

### Community 52 - "Community 52"
Cohesion: 0.15
Nodes (22): holdsPayRulePermission(), active(), admin(), applied(), CALCS, chooseNewRegime(), copy(), declareOldRegime() (+14 more)

### Community 53 - "Community 53"
Cohesion: 0.13
Nodes (24): activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el(), ensureOption() (+16 more)

### Community 54 - "Community 54"
Cohesion: 0.16
Nodes (25): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+17 more)

### Community 55 - "Community 55"
Cohesion: 0.16
Nodes (20): APP_NAV, APP_OTHER_PAGES, initialsFrom(), inRail(), RAIL, useMedia(), setWide(), results() (+12 more)

### Community 56 - "Community 56"
Cohesion: 0.12
Nodes (23): ASSET_STATUSES, ASSET_TYPES, CATEGORIES, changeFor(), CONDITION_KEYS, CONDITIONS, LOCATION_KEYS, LOCATIONS (+15 more)

### Community 57 - "Community 57"
Cohesion: 0.16
Nodes (23): alertText(), approverNames(), B(), checks(), dayOf(), DONE, monthLabel(), Months() (+15 more)

### Community 58 - "Community 58"
Cohesion: 0.17
Nodes (20): APP_OWN, mayOpenLeavePolicy(), mayOpenRates(), OFFICES_ITEM, openable(), NAV, OTHER_PAGES, canOpenPage() (+12 more)

### Community 59 - "Community 59"
Cohesion: 0.17
Nodes (22): getCurrentUserId(), allRows, changeButtons(), changesAtOnce(), closeIcon(), currentRows(), editBlocked(), field() (+14 more)

### Community 60 - "Community 60"
Cohesion: 0.14
Nodes (23): allRegularizations(), actionsHead, arrowIcon(), byId(), decidedAt(), matches(), paginationEl, PILL_TAB (+15 more)

### Community 61 - "Community 61"
Cohesion: 0.10
Nodes (14): DEPARTMENTS, DESIGNATIONS, MANAGER_OF, PROFILE_DETAILS, USERS, clearError(), departmentName(), form (+6 more)

### Community 62 - "Community 62"
Cohesion: 0.13
Nodes (23): addBtn, calendarCard, clearError(), defaultMonth(), field(), FIELDS, fillYears(), form (+15 more)

### Community 63 - "Community 63"
Cohesion: 0.14
Nodes (21): initialsOf(), Kv(), Content(), Form(), LIST, MONTHS, OVERRIDES_HINT, plural() (+13 more)

### Community 64 - "Community 64"
Cohesion: 0.15
Nodes (17): ALSO_FOR_MANAGERS, ROUTES, signIn(), currentPagePath(), guardPage(), PUBLIC_PAGES, redirectToLanding(), depthInPages() (+9 more)

### Community 65 - "Community 65"
Cohesion: 0.19
Nodes (18): badgeOf(), showEmployerBox(), approved(), listed(), missingMonthText(), monthLabel(), notesOf(), openAbsence() (+10 more)

### Community 66 - "Community 66"
Cohesion: 0.18
Nodes (16): COMPANY, companyInitial(), PRODUCT, signInAs(), clearError(), DEMO_USERS, escapeHtml(), MAIN (+8 more)

### Community 67 - "Community 67"
Cohesion: 0.23
Nodes (19): slipTotals(), amount(), approved(), financialYear(), ICONS, joinedNote(), label(), MessageRow() (+11 more)

### Community 68 - "Community 68"
Cohesion: 0.17
Nodes (18): annualTax(), computePay(), FILING_SAMPLE, lastDay(), leap(), lossOfPayAmount(), lossOfPayDays(), monthlyTds() (+10 more)

### Community 69 - "Community 69"
Cohesion: 0.14
Nodes (19): amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD, form (+11 more)

### Community 70 - "Community 70"
Cohesion: 0.22
Nodes (18): parts(), runRows(), slipsFor(), withNewEngine(), statutoryFrom(), usesNewRules(), monthKey(), payrollRun() (+10 more)

### Community 71 - "Community 71"
Cohesion: 0.32
Nodes (17): monthLabel(), now(), pct(), SalaryPlan(), slabRows(), slabText(), TaxExplain(), UnverifiedNote() (+9 more)

### Community 72 - "Community 72"
Cohesion: 0.16
Nodes (14): ALL_LOCATION_PERMISSIONS, LOCATION_PERMISSIONS, PERMISSIONS, LOCATION_GRANTS, OVERRIDABLE, ROLE_KEYS, ROLES, SELF_SERVICE (+6 more)

### Community 73 - "Community 73"
Cohesion: 0.17
Nodes (16): balanceGrid, BAR, cancelRequest(), fillYears(), historyRow(), holidayList, paginationEl, pendingCard (+8 more)

### Community 74 - "Community 74"
Cohesion: 0.25
Nodes (14): setPref(), waitingCount(), waitingFor(), CompanyMark(), SearchBox(), SearchOpener(), SIGN_OUT_ICON, applyAccent() (+6 more)

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (14): showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme(), onAppearanceChange() (+6 more)

### Community 76 - "Community 76"
Cohesion: 0.23
Nodes (13): admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail(), isDay(), isMonth() (+5 more)

### Community 77 - "Community 77"
Cohesion: 0.30
Nodes (12): ColumnChart(), detachedRows(), Row(), Table(), tdClass(), text(), HEADCOUNT, Reports() (+4 more)

### Community 78 - "Community 78"
Cohesion: 0.23
Nodes (13): CheckInPlaces(), Field(), Kv(), MyDevices(), MyProfile(), onDay(), PLACEHOLDER, SAVED (+5 more)

### Community 79 - "Community 79"
Cohesion: 0.25
Nodes (11): CHAIN_STAGES, createChain(), holds(), managerCanDecide(), refusal(), isActive(), managerFor(), directReportsOf() (+3 more)

### Community 80 - "Community 80"
Cohesion: 0.29
Nodes (14): approvedMonthCovering(), approvedMonths(), approvedRunMonths(), approvedRuns(), joiningDate(), joiningProblem(), leavingDate(), leavingPeriods() (+6 more)

### Community 81 - "Community 81"
Cohesion: 0.23
Nodes (13): skippedEntry(), applyCorrection(), checkAgainstRecord(), dayRefusal(), decideRegularization(), requestRegularization(), fail(), addHoliday() (+5 more)

### Community 82 - "Community 82"
Cohesion: 0.30
Nodes (10): COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS, getCompanyProfile(), loadBox() (+2 more)

### Community 83 - "Community 83"
Cohesion: 0.29
Nodes (11): allVendors(), VENDOR_STATUS_KEYS, byId(), contactLine(), matches(), renderTable(), row(), tbody (+3 more)

### Community 84 - "Community 84"
Cohesion: 0.30
Nodes (10): isManager(), ICONS, SECTION_ICONS, buildItem(), buildTrigger(), currentPagePath(), isManager(), navItemVisible() (+2 more)

### Community 85 - "Community 85"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 86 - "Community 86"
Cohesion: 0.31
Nodes (10): subscribePrefs(), apply(), listeners, NAV_KEY, read(), storedChoice(), subscribe(), useNavWide() (+2 more)

### Community 87 - "Community 87"
Cohesion: 0.27
Nodes (10): waitingOn(), assetRequestSteps(), BADGE, describeRequest(), lastEntry(), names(), onDay(), STEP_TITLE (+2 more)

### Community 88 - "Community 88"
Cohesion: 0.44
Nodes (10): copy(), createCollection(), add(), commit(), get(), getAll(), loadBox(), remove() (+2 more)

### Community 89 - "Community 89"
Cohesion: 0.33
Nodes (8): EmptyState(), GROUPS, Holder(), matrixGroups(), RoleEditor(), ROLES_LIST, Tick(), ALL_PERMISSIONS

### Community 90 - "Community 90"
Cohesion: 0.36
Nodes (6): ok, closeAllDropdowns(), initDropdowns(), triggerOf(), initMenuToggle(), renderHeadcount()

### Community 92 - "Community 92"
Cohesion: 0.40
Nodes (6): movementEvent(), assetsWithOpenReports(), openReportOf(), movementEvent(), renderReportAlert(), officeDate()

### Community 93 - "Community 93"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 708 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 79` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 18`, `Community 19`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 26`, `Community 27`, `Community 29`, `Community 30`, `Community 31`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 38`, `Community 39`, `Community 40`, `Community 42`, `Community 44`, `Community 45`, `Community 46`, `Community 50`, `Community 51`, `Community 52`, `Community 54`, `Community 57`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 65`, `Community 67`, `Community 69`, `Community 70`, `Community 73`, `Community 74`, `Community 76`, `Community 78`, `Community 81`, `Community 82`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.059921710328214396 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 25` to `Community 0`, `Community 1`, `Community 2`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 14`, `Community 18`, `Community 22`, `Community 23`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 31`, `Community 33`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 40`, `Community 42`, `Community 46`, `Community 47`, `Community 49`, `Community 54`, `Community 56`, `Community 59`, `Community 60`, `Community 62`, `Community 69`, `Community 72`, `Community 73`, `Community 83`, `Community 87`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.058738738738738736 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 11` to `Community 1`, `Community 2`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 22`, `Community 23`, `Community 25`, `Community 26`, `Community 27`, `Community 31`, `Community 33`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 41`, `Community 42`, `Community 46`, `Community 47`, `Community 50`, `Community 54`, `Community 56`, `Community 57`, `Community 59`, `Community 60`, `Community 62`, `Community 65`, `Community 67`, `Community 71`, `Community 73`, `Community 78`, `Community 87`, `Community 92`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._