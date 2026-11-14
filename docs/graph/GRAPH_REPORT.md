# Graph Report - officeos  (2026-11-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3106 nodes · 13856 edges · 88 communities (86 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 245 edges (avg confidence: 0.85)
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
1. `el()` - 251 edges
2. `getUser()` - 201 edges
3. `formatDay()` - 180 edges
4. `nameOf()` - 140 edges
5. `useSession()` - 116 edges
6. `pageUrl()` - 113 edges
7. `todayIso()` - 106 edges
8. `useData()` - 102 edges
9. `plural()` - 94 edges
10. `getAllUsers()` - 93 edges

## Surprising Connections (you probably didn't know these)
- `CompanyProfile()` --indirect_call--> `updateCompanyProfile()`  [INFERRED]
  app/src/pages/CompanyProfile.jsx → assets/js/data/company-store.js
- `DeptForm()` --indirect_call--> `addDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js
- `DeptForm()` --indirect_call--> `updateDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js
- `assetApprovers()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/EmployeeDashboard.jsx → assets/js/ui/leave-view.js
- `MyLeave()` --indirect_call--> `byNewest()`  [INFERRED]
  app/src/pages/MyLeave.jsx → assets/js/ui/leave-view.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (88 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (96): described(), Field(), initialsOf(), Input(), Kv(), Person(), Select(), Switch() (+88 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (79): Badge(), NotBuilt(), StatStrip(), detachedRows(), Row(), Table(), tdClass(), text() (+71 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (87): flaggedCell(), ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT, approvalItems(), emptyRow(), Icon() (+79 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (64): COMPANY, companyInitial(), PRODUCT, tabTitle(), signInAs(), signOutNow(), useSession(), refreshPrefs() (+56 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (55): badgeOf(), PersonCell(), Reason(), Tabs(), ConfirmContext, ConfirmDialog(), ConfirmProvider(), useConfirm() (+47 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (66): Balances(), initialsFrom(), orDash(), profileOf(), daysAway(), DeactivateDialog(), departmentName(), formatAccount() (+58 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (66): balanceRows(), overWarning(), Calendar(), pad(), seedDays(), dayNumber(), dayOffChecker(), isDayOff() (+58 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (63): permissionsOf(), load(), save(), pureBox(), actorWith(), addDepartment(), addUser(), adminOnly() (+55 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (61): byName(), salaryRows(), recordsStart(), approveRunWithSnapshot(), approveSnapshotProblem(), fail(), key(), liveRows() (+53 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (61): attentionItems(), OutNextWeek(), leaveRequestsChart(), allRequests(), activity, approvalItem(), approvalsList, approvalsMeta (+53 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (57): ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceNodes(), barLook(), EmployeeDashboard(), Icon() (+49 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (55): buildRow(), ASIDE, byId(), decidedAt(), recordedTime(), Regularization(), row(), tabRequests() (+47 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (53): FLAG_EXPORT, FLAG_LABEL, flagText(), iconOfPlace(), metres(), PLACE_ICON, PLACE_LABEL, placeLabel() (+45 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (51): stampsBy(), leaveWhat(), requestName(), activityNodes(), activityText(), CardTitle(), emptyRow(), flaggedSince() (+43 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (53): allAssets(), assetsHeldByInactive(), assetsWithOpenReports(), assetTotals(), openReportOf(), ACTIONS, actionSelect, assetSelect (+45 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (51): applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkIn(), checkInPlan(), checkInWindow() (+43 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (46): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+38 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (41): ok, NAV, OTHER_PAGES, ALSO_FOR_MANAGERS, ROUTES, getCurrentRole(), getCurrentUser(), signOut() (+33 more)

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (46): DecisionButtons(), decidedAt(), LeaveApprovals(), stageBadge(), STATS, TABS, CheckIcon(), PendingSteps() (+38 more)

### Community 19 - "Community 19"
Cohesion: 0.10
Nodes (19): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+11 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (45): longDate(), addHoliday(), byDate(), dayLabel(), getAllHolidays(), HOLIDAY_KINDS, holidayManager(), holidays (+37 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (45): cancelAssetRequest(), STAGE_NAME, waitingOn(), cancelExpense(), requestItem(), requestStatusText(), allRows(), assetRow() (+37 more)

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (42): decider(), approve(), submit(), changesAtOnce(), editBlocked(), getCurrentUserId(), proposalDecidersFor(), renderPolicy() (+34 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (43): changeFor(), stockStatus(), stockValue(), actorWith(), allMovements(), ASSET_REFERENCE, assets, assignAsset() (+35 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (43): allCorrections, allLeave, asDecidedBy(), assetsDecided(), assetsPending(), correctionsDecided(), correctionsPending(), decidedBody (+35 more)

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (38): EmptyState(), Icon(), StatCard(), Stepper(), BarRows(), ColumnChart(), NO_DATA, NoData() (+30 more)

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (41): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+33 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (38): slipTotals(), amount(), approved(), financialYear(), ICONS, joinedNote(), label(), MessageRow() (+30 more)

### Community 28 - "Community 28"
Cohesion: 0.07
Nodes (39): movementEvent(), CATEGORY_KEYS, MOVEMENT_TYPE_KEYS, movementEvent(), clearError(), deptField, deptSelect, EMPTY (+31 more)

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (37): active(), admin(), applied(), ASK_FINANCE, CALCS, checkDeclaration(), chooseNewRegime(), copy() (+29 more)

### Community 30 - "Community 30"
Cohesion: 0.09
Nodes (37): ASSET_FLOW, CORRECTION_FLOW, EXPENSE_FLOW, LEAVE_FLOW, LOCATION_FLOW, SALARY_FLOW, BELL_SELECTOR, bellListeners (+29 more)

### Community 31 - "Community 31"
Cohesion: 0.08
Nodes (37): assetWhat(), previewRoute(), ASSET_TYPE_KEYS, renderFulfilNote(), chainText(), clearError(), clearReportError(), FIELD (+29 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (36): hasPermission(), checkInRefusal(), checkOutRefusal(), ACCURACY_LIMIT_M, active(), allLocationChanges(), answer(), applyChange() (+28 more)

### Community 33 - "Community 33"
Cohesion: 0.10
Nodes (35): allAssetRequests(), getExpense(), renderPresent(), renderTotal(), setStat(), asRequest(), DECIDED, decisionDays() (+27 more)

### Community 34 - "Community 34"
Cohesion: 0.09
Nodes (37): cancelRegularization(), calendarCard, cancelRequest(), cellLook(), clearErrors(), field(), FIELDS, fillMonths() (+29 more)

### Community 35 - "Community 35"
Cohesion: 0.09
Nodes (35): ATTENDANCE_RULES, clock, errorLine, grace, inBtn, lateMarks, lateNote, modeInputs (+27 more)

### Community 36 - "Community 36"
Cohesion: 0.14
Nodes (33): chainFor(), firstStage(), nextStage(), applied(), approverMustPay(), at(), auto(), averageProcessingDays() (+25 more)

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (32): asRequest(), decisionDays(), figures(), monthKeys(), BalanceCard(), alertText(), askedMonth, attendanceCheck() (+24 more)

### Community 38 - "Community 38"
Cohesion: 0.11
Nodes (30): ROLE_KEYS, addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry() (+22 more)

### Community 39 - "Community 39"
Cohesion: 0.12
Nodes (31): allExpenses(), actionsCell(), categoryCell(), claimsText(), decidableIds(), EMPTY, entryOf(), lastAt() (+23 more)

### Community 40 - "Community 40"
Cohesion: 0.13
Nodes (28): annualTax(), computePay(), FILING_SAMPLE, filingDates(), lastDay(), leap(), lossOfPayAmount(), lossOfPayDays() (+20 more)

### Community 41 - "Community 41"
Cohesion: 0.07
Nodes (30): activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, assetWhat(), chart, deptSelect (+22 more)

### Community 42 - "Community 42"
Cohesion: 0.12
Nodes (25): buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form, managerChoice() (+17 more)

### Community 43 - "Community 43"
Cohesion: 0.11
Nodes (28): account(), admin(), applyLeaveUnderPolicy(), BAND_LABEL, closeLeaveYear(), copy(), EDITABLE, entry() (+20 more)

### Community 44 - "Community 44"
Cohesion: 0.22
Nodes (28): compareRegimes(), ctcFor(), hraExemption(), money(), oldRegimeDeductions(), payMonth(), taxOn(), tdsFor() (+20 more)

### Community 45 - "Community 45"
Cohesion: 0.13
Nodes (28): inventoryValueChart(), needsReorder(), stockBarPercent(), inventoryTotals(), reorderAlerts(), renderStock(), byCategory(), categoryCell() (+20 more)

### Community 46 - "Community 46"
Cohesion: 0.13
Nodes (25): clearError(), form, showError(), clearError(), form, showError(), closeIcon(), createDecisionFlow() (+17 more)

### Community 47 - "Community 47"
Cohesion: 0.15
Nodes (27): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+19 more)

### Community 48 - "Community 48"
Cohesion: 0.14
Nodes (23): getVersion(), listeners, subscribe(), useData(), useVersion(), ApplyLeave(), ERROR_ID, FOCUS (+15 more)

### Community 49 - "Community 49"
Cohesion: 0.13
Nodes (26): waitingCount(), waitingFor(), assetTitle(), correctionTitle(), decisionDate(), expenseTitle(), leaveTitle(), LOC_TAB (+18 more)

### Community 50 - "Community 50"
Cohesion: 0.18
Nodes (28): chainEvents(), Actions(), entryOf(), Muted(), names(), latestNote(), onDay(), chainEvents() (+20 more)

### Community 51 - "Community 51"
Cohesion: 0.15
Nodes (25): isManagerNow(), CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), getAssetRequest(), holdersOf(), holdsStage() (+17 more)

### Community 52 - "Community 52"
Cohesion: 0.12
Nodes (26): getRegularization(), getRequest(), buildCard(), buildPanel(), cardState(), CHAIN_STAGE, closeApprovalCard(), closeBellPanel() (+18 more)

### Community 53 - "Community 53"
Cohesion: 0.19
Nodes (26): amount(), approved(), buildRow(), field(), financialYear(), joinedNote(), label(), messageRow() (+18 more)

### Community 54 - "Community 54"
Cohesion: 0.13
Nodes (26): avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el(), emptyRow(), exportBtn (+18 more)

### Community 55 - "Community 55"
Cohesion: 0.15
Nodes (20): useAction(), BAR, HEADS, HistoryRow(), MyLeave(), MAIN, RAW, SamplePage() (+12 more)

### Community 56 - "Community 56"
Cohesion: 0.15
Nodes (22): CAPPED, DOW, Icon(), isOff(), person(), TeamLeave(), CHAIN_STAGES, createChain() (+14 more)

### Community 57 - "Community 57"
Cohesion: 0.15
Nodes (25): Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel(), TABS (+17 more)

### Community 58 - "Community 58"
Cohesion: 0.13
Nodes (24): activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el(), ensureOption() (+16 more)

### Community 59 - "Community 59"
Cohesion: 0.17
Nodes (23): preview(), BAND_NAME, BandBadge(), bandChange(), bandText(), days(), describePolicy(), Explain() (+15 more)

### Community 60 - "Community 60"
Cohesion: 0.16
Nodes (24): alertText(), approverNames(), B(), checks(), dayOf(), DONE, monthLabel(), Months() (+16 more)

### Community 61 - "Community 61"
Cohesion: 0.11
Nodes (23): ASSET_STATUS_KEYS, ASSET_STATUSES, CATEGORIES, CONDITION_KEYS, CONDITIONS, LOCATION_KEYS, LOCATIONS, MOVEMENT_TYPES (+15 more)

### Community 62 - "Community 62"
Cohesion: 0.10
Nodes (14): DEPARTMENTS, DESIGNATIONS, MANAGER_OF, PROFILE_DETAILS, USERS, clearError(), departmentName(), form (+6 more)

### Community 63 - "Community 63"
Cohesion: 0.22
Nodes (20): departmentName(), summaryOfDays(), attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), expenseSpendChart(), headcountChart() (+12 more)

### Community 64 - "Community 64"
Cohesion: 0.22
Nodes (19): copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), headOffice(), manager() (+11 more)

### Community 65 - "Community 65"
Cohesion: 0.16
Nodes (18): policyLossOfPay(), policyLossOfPayFrom(), admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail() (+10 more)

### Community 66 - "Community 66"
Cohesion: 0.14
Nodes (19): amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD, form (+11 more)

### Community 67 - "Community 67"
Cohesion: 0.19
Nodes (18): activityItems(), claimItems(), claimText(), EVENT, FinanceDashboard(), Icon(), ICONS, monthlyRuns() (+10 more)

### Community 68 - "Community 68"
Cohesion: 0.17
Nodes (15): ALL_LOCATION_PERMISSIONS, ALL_PERMISSIONS, LOCATION_PERMISSIONS, PERMISSIONS, LOCATION_GRANTS, OVERRIDABLE, ROLES, SELF_SERVICE (+7 more)

### Community 69 - "Community 69"
Cohesion: 0.19
Nodes (17): applyPermissions(), allVendors(), VENDOR_STATUS_KEYS, renderList(), byId(), contactLine(), matches(), renderTable() (+9 more)

### Community 70 - "Community 70"
Cohesion: 0.22
Nodes (17): NO_DATA, showEmployerBox(), slipsFor(), approved(), listed(), missingMonthText(), monthLabel(), notesOf() (+9 more)

### Community 71 - "Community 71"
Cohesion: 0.22
Nodes (17): cellText(), COLUMNS, csvCell(), csvColumns(), csvText(), downloadCsv(), exportStatsAsCsv(), exportTableAsCsv() (+9 more)

### Community 72 - "Community 72"
Cohesion: 0.22
Nodes (15): parts(), runRows(), withNewEngine(), payFor(), payForFinal(), statutoryFrom(), usesNewRules(), approvedRow() (+7 more)

### Community 73 - "Community 73"
Cohesion: 0.17
Nodes (15): names(), withText(), EXPENSE_POLICY, STAGE_NAME, waitingOn(), BADGE, expenseFlow, expenseSteps() (+7 more)

### Community 74 - "Community 74"
Cohesion: 0.29
Nodes (14): showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme(), onAppearanceChange() (+6 more)

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (14): approvedMonthCovering(), approvedMonths(), approvedRunMonths(), approvedRuns(), joiningDate(), joiningProblem(), leavingDate(), leavingPeriods() (+6 more)

### Community 76 - "Community 76"
Cohesion: 0.22
Nodes (10): getCurrentUserLabel(), getSession(), isSignedIn(), signIn(), DEMO_USERS, loginForm, clearError(), form (+2 more)

### Community 77 - "Community 77"
Cohesion: 0.28
Nodes (11): ICONS, SECTION_ICONS, initRail(), close(), fit(), open(), inRail(), renderFooter() (+3 more)

### Community 78 - "Community 78"
Cohesion: 0.41
Nodes (12): copy(), createCollection(), add(), commit(), get(), getAll(), loadBox(), remove() (+4 more)

### Community 79 - "Community 79"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 80 - "Community 80"
Cohesion: 0.33
Nodes (10): COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS, getCompanyProfile(), loadBox() (+2 more)

### Community 81 - "Community 81"
Cohesion: 0.33
Nodes (8): buildOption(), closeIcon(), iconButton(), renderSearch(), close(), draw(), setActive(), shutBox()

### Community 82 - "Community 82"
Cohesion: 0.33
Nodes (5): CATEGORIES, CATEGORY_KEYS, needsReceipt(), STAGES, receiptCell()

### Community 83 - "Community 83"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 86 - "Community 86"
Cohesion: 1.00
Nodes (3): closeAllDropdowns(), initDropdowns(), triggerOf()

### Community 87 - "Community 87"
Cohesion: 0.67
Nodes (3): blank(), expenseTotals(), totalsByDepartment()

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 710 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 56` to `Community 0`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 18`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 27`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 41`, `Community 42`, `Community 43`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 53`, `Community 59`, `Community 60`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 70`, `Community 73`, `Community 76`, `Community 80`, `Community 87`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0683046683046683 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 11` to `Community 2`, `Community 5`, `Community 6`, `Community 9`, `Community 10`, `Community 13`, `Community 14`, `Community 17`, `Community 18`, `Community 20`, `Community 21`, `Community 22`, `Community 24`, `Community 25`, `Community 28`, `Community 31`, `Community 33`, `Community 34`, `Community 35`, `Community 37`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 45`, `Community 46`, `Community 47`, `Community 50`, `Community 52`, `Community 53`, `Community 61`, `Community 66`, `Community 67`, `Community 68`, `Community 69`, `Community 73`, `Community 82`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07356235997012696 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 50` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 14`, `Community 16`, `Community 18`, `Community 20`, `Community 21`, `Community 22`, `Community 24`, `Community 25`, `Community 27`, `Community 30`, `Community 31`, `Community 33`, `Community 34`, `Community 37`, `Community 39`, `Community 40`, `Community 41`, `Community 47`, `Community 48`, `Community 49`, `Community 52`, `Community 53`, `Community 55`, `Community 56`, `Community 59`, `Community 60`, `Community 61`, `Community 67`, `Community 70`, `Community 73`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._