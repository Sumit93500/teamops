# Graph Report - officeos  (2026-11-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3024 nodes · 13317 edges · 87 communities (84 shown, 3 thin omitted)
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

## God Nodes (most connected - your core abstractions)
1. `el()` - 251 edges
2. `getUser()` - 199 edges
3. `formatDay()` - 170 edges
4. `nameOf()` - 140 edges
5. `pageUrl()` - 110 edges
6. `useSession()` - 109 edges
7. `todayIso()` - 99 edges
8. `plural()` - 96 edges
9. `useData()` - 94 edges
10. `Frame()` - 91 edges

## Surprising Connections (you probably didn't know these)
- `CompanyProfile()` --indirect_call--> `updateCompanyProfile()`  [INFERRED]
  app/src/pages/CompanyProfile.jsx → assets/js/data/company-store.js
- `DeptForm()` --indirect_call--> `addDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js
- `DeptForm()` --indirect_call--> `updateDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js
- `MyLeave()` --indirect_call--> `cancelLeave()`  [INFERRED]
  app/src/pages/MyLeave.jsx → assets/js/data/leave-store.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/Expenses.jsx → assets/js/ui/leave-view.js

## Import Cycles
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`

## Communities (87 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (87): ConfirmContext, ConfirmDialog(), ConfirmProvider(), useConfirm(), described(), Field(), initialsOf(), Input() (+79 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (96): leaveWhat(), requestName(), defaultMonth(), DOW, EMPTY, FIELD_ID, Holidays(), holidaysOf() (+88 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (70): Badge(), NotBuilt(), Tabs(), detachedRows(), Row(), Table(), tdClass(), text() (+62 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (74): ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT, chainEvents(), emptyRow(), Icon(), ICONS (+66 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (78): ApprovalsInbox(), assetTitle(), correctionTitle(), decisionDate(), expenseTitle(), leaveTitle(), locationTitle(), readInbox() (+70 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (66): useDecision(), buildRow(), ASIDE, byId(), decidedAt(), recordedTime(), Regularization(), row() (+58 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (65): BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), MyRequests(), names(), stepsOf(), TABS (+57 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (67): assetWhat(), allAssetRequests(), assetsHeldByInactive(), assetsWithOpenReports(), assetTotals(), earliestHandOver(), openReportOf(), assetWhat() (+59 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (64): row(), recentRow(), logRow(), row(), weekCell(), row(), recentRow(), renderRecent() (+56 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (48): COMPANY, companyInitial(), PRODUCT, signOutNow(), refreshPrefs(), waitingCount(), RequireRoute(), ABOUT (+40 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (60): allRequests(), activity, approvalItem(), approvalsList, approvalsMeta, chart, leaveNote, leaveRange (+52 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (56): PersonCell(), DecisionButtons(), approvalItems(), claimItems(), activityNodes(), activityText(), CardTitle(), emptyRow() (+48 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (50): StatCard(), BarRows(), ColumnChart(), NO_DATA, NoData(), FLAG_EXPORT, FLAG_LABEL, flaggedCell() (+42 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (55): recentDays(), applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkIn(), checkInPlan() (+47 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (51): Actions(), BADGE, claimsText(), EMPTY, entryOf(), Expenses(), ICONS, lastAt() (+43 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (51): approverNames(), permissionsOf(), recordsStart(), absencesIn(), actorWith(), approveProblem(), approversFor(), approveRun() (+43 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (43): ALL_LOCATION_PERMISSIONS, ALL_PERMISSIONS, LOCATION_PERMISSIONS, PERMISSIONS, LOCATION_GRANTS, OVERRIDABLE, SELF_SERVICE, approvalChainFor() (+35 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (44): DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), FilterSelect(), IconButton(), PRESETS, rangeFor() (+36 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (43): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+35 more)

### Community 19 - "Community 19"
Cohesion: 0.10
Nodes (19): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+11 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (44): movementEvent(), changeFor(), stockStatus(), stockValue(), actorWith(), allMovements(), ASSET_REFERENCE, assets (+36 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (39): adminOnly(), approvedRunMonths(), approvedRuns(), approvesRun(), byNonAdmin(), carriesAdmin(), decidesStage(), deleteProblem() (+31 more)

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (38): ApplyLeave(), balanceRows(), ERROR_ID, FOCUS, Kv(), typeMeta(), balanceFor(), daysIn() (+30 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (35): ASSET_FLOW, CORRECTION_FLOW, EXPENSE_FLOW, LEAVE_FLOW, LOCATION_FLOW, SALARY_FLOW, waitingFor(), LOC_TAB (+27 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (37): addHoliday(), byDate(), dayLabel(), HOLIDAY_KINDS, holidayManager(), holidays, holidaysIn(), MONTH_NAMES (+29 more)

### Community 25 - "Community 25"
Cohesion: 0.13
Nodes (37): hasPermission(), checkInRefusal(), checkOutRefusal(), deviceLabel(), ACCURACY_LIMIT_M, active(), allLocationChanges(), answer() (+29 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (34): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+26 more)

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (34): CHAIN_STAGES, createChain(), holds(), managerCanDecide(), refusal(), isActive(), skippedEntry(), submitExpense() (+26 more)

### Community 28 - "Community 28"
Cohesion: 0.08
Nodes (27): departmentName(), Field(), initialsFrom(), MyDevices(), onDay(), orDash(), PLACEHOLDER, profileOf() (+19 more)

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (34): applyPermissions(), pendingSalaryProposal(), allRows, buildRow(), byName(), changeButtons(), changesAtOnce(), closeIcon() (+26 more)

### Community 30 - "Community 30"
Cohesion: 0.09
Nodes (35): checkInWindow(), nowMinutes(), clock, errorLine, grace, inBtn, lateMarks, lateNote (+27 more)

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (34): expenseTotals(), runTotals(), renderPayroll(), renderPresent(), renderStock(), setStat(), setStat(), setStat() (+26 more)

### Community 32 - "Community 32"
Cohesion: 0.08
Nodes (34): CATEGORY_KEYS, allAssets(), movementEvent(), clearError(), deptField, deptSelect, EMPTY, FIELD (+26 more)

### Community 33 - "Community 33"
Cohesion: 0.11
Nodes (34): actions, cardTitled(), closeIcon(), daysAway(), deactivateDialog(), deleteBtn, departmentName(), emptyCard() (+26 more)

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (32): ROLE_KEYS, account(), admin(), anniversaryOf(), BAND_LABEL, bandPolicy(), closeLeaveYear(), copy() (+24 more)

### Community 35 - "Community 35"
Cohesion: 0.10
Nodes (33): calendarCard, cancelRequest(), cellLook(), clearErrors(), field(), FIELDS, fixableIssue(), form (+25 more)

### Community 36 - "Community 36"
Cohesion: 0.11
Nodes (24): signInAs(), clearError(), DEMO_USERS, escapeHtml(), MAIN, PublicPage(), RAW, showError() (+16 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (30): EmptyState(), Icon(), Stepper(), alertText(), B(), checks(), dayOf(), DONE (+22 more)

### Community 38 - "Community 38"
Cohesion: 0.09
Nodes (31): previewRoute(), chainText(), clearError(), clearReportError(), FIELD, fillReplaces(), form, ICON (+23 more)

### Community 39 - "Community 39"
Cohesion: 0.11
Nodes (29): addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry(), fail() (+21 more)

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (30): applied(), approverMustPay(), at(), auto(), averageProcessingDays(), blank(), by(), canPay() (+22 more)

### Community 41 - "Community 41"
Cohesion: 0.09
Nodes (29): ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPE_KEYS, ASSET_TYPES, CATEGORIES, CONDITION_KEYS, CONDITIONS, LOCATION_KEYS (+21 more)

### Community 42 - "Community 42"
Cohesion: 0.08
Nodes (29): activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, chainEvents(), chart, deptSelect (+21 more)

### Community 43 - "Community 43"
Cohesion: 0.13
Nodes (28): renderPendingApprovals(), bellItem(), buildCard(), buildPanel(), cardLink(), cardOpener(), cardState(), CHAIN_STAGE (+20 more)

### Community 44 - "Community 44"
Cohesion: 0.13
Nodes (28): allExpenses(), renderWhoApproves(), claimsText(), decidableIds(), EMPTY, entryOf(), lastAt(), matches() (+20 more)

### Community 45 - "Community 45"
Cohesion: 0.15
Nodes (26): copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), getOffices(), headOffice() (+18 more)

### Community 46 - "Community 46"
Cohesion: 0.13
Nodes (25): clearError(), form, showError(), clearError(), form, showError(), closeIcon(), createDecisionFlow() (+17 more)

### Community 47 - "Community 47"
Cohesion: 0.19
Nodes (25): parts(), runRows(), slipsFor(), withNewEngine(), monthLabel(), now(), pct(), SalaryPlan() (+17 more)

### Community 48 - "Community 48"
Cohesion: 0.15
Nodes (25): CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), getAssetRequest(), holdersOf(), holdsStage(), isActive() (+17 more)

### Community 49 - "Community 49"
Cohesion: 0.15
Nodes (26): Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel(), TABS (+18 more)

### Community 50 - "Community 50"
Cohesion: 0.26
Nodes (25): compareRegimes(), hraExemption(), money(), oldRegimeDeductions(), payMonth(), taxOn(), tdsFor(), trace() (+17 more)

### Community 51 - "Community 51"
Cohesion: 0.13
Nodes (25): getDepartment(), activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el() (+17 more)

### Community 52 - "Community 52"
Cohesion: 0.19
Nodes (26): amount(), approved(), buildRow(), field(), financialYear(), joinedNote(), label(), messageRow() (+18 more)

### Community 53 - "Community 53"
Cohesion: 0.13
Nodes (26): avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el(), emptyRow(), exportBtn (+18 more)

### Community 54 - "Community 54"
Cohesion: 0.15
Nodes (22): holdsPayRulePermission(), active(), admin(), applied(), CALCS, chooseNewRegime(), copy(), declareOldRegime() (+14 more)

### Community 55 - "Community 55"
Cohesion: 0.18
Nodes (20): getSession(), isSignedIn(), signIn(), load(), save(), copy(), createCollection(), add() (+12 more)

### Community 56 - "Community 56"
Cohesion: 0.15
Nodes (24): stockBarPercent(), reorderAlerts(), byCategory(), categoryCell(), ICON, icon(), itemCell(), matches() (+16 more)

### Community 57 - "Community 57"
Cohesion: 0.19
Nodes (24): canApprove(), alertText(), askedMonth, attendanceCheck(), buildRow(), checkItem(), dayOf(), monthLabel() (+16 more)

### Community 58 - "Community 58"
Cohesion: 0.20
Nodes (25): actorWith(), addDepartment(), addUser(), changeUser(), commit(), copy(), deactivateUser(), deleteUser() (+17 more)

### Community 59 - "Community 59"
Cohesion: 0.18
Nodes (23): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+15 more)

### Community 60 - "Community 60"
Cohesion: 0.19
Nodes (22): badgeOf(), NO_DATA, Reason(), slipTotals(), amount(), approved(), financialYear(), ICONS (+14 more)

### Community 61 - "Community 61"
Cohesion: 0.18
Nodes (19): getCurrentUserId(), managesAnyone(), pendingFor(), salaryProposals(), directReportsOf(), isManager(), managerOf(), ICONS (+11 more)

### Community 62 - "Community 62"
Cohesion: 0.19
Nodes (20): showEmployerBox(), approved(), listed(), missingMonthText(), monthLabel(), notesOf(), openAbsence(), orDash() (+12 more)

### Community 63 - "Community 63"
Cohesion: 0.19
Nodes (21): Content(), daysAway(), DeactivateDialog(), departmentName(), formatAccount(), heldText(), LEAVE_SHORT, LIST (+13 more)

### Community 64 - "Community 64"
Cohesion: 0.19
Nodes (18): decider(), approve(), submit(), getCurrentRole(), getCurrentUserLabel(), initRail(), close(), fit() (+10 more)

### Community 65 - "Community 65"
Cohesion: 0.22
Nodes (18): flagText(), iconOfPlace(), PLACE_LABEL, isHome(), m(), MarkAttendance(), ordinal(), pad() (+10 more)

### Community 66 - "Community 66"
Cohesion: 0.22
Nodes (19): ActionsCell(), B(), byName(), changesAtOnce(), editBlocked(), formulaText(), monthlyCost(), people() (+11 more)

### Community 67 - "Community 67"
Cohesion: 0.19
Nodes (17): StatStrip(), ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), barLook(), EmployeeDashboard(), Icon() (+9 more)

### Community 68 - "Community 68"
Cohesion: 0.20
Nodes (15): allVendors(), VENDOR_STATUS_KEYS, byId(), contactLine(), matches(), renderTable(), row(), tbody (+7 more)

### Community 69 - "Community 69"
Cohesion: 0.20
Nodes (13): ALSO_FOR_MANAGERS, ROUTES, signOut(), currentPagePath(), guardPage(), PUBLIC_PAGES, redirectToLanding(), depthInPages() (+5 more)

### Community 70 - "Community 70"
Cohesion: 0.21
Nodes (15): admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail(), isDay(), isMonth() (+7 more)

### Community 71 - "Community 71"
Cohesion: 0.23
Nodes (13): NAV, OTHER_PAGES, buildOption(), closeIcon(), iconButton(), matchingPages(), matchingPeople(), renderSearch() (+5 more)

### Community 72 - "Community 72"
Cohesion: 0.29
Nodes (14): showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme(), onAppearanceChange() (+6 more)

### Community 73 - "Community 73"
Cohesion: 0.24
Nodes (15): cellText(), COLUMNS, csvCell(), csvText(), downloadCsv(), exportStatsAsCsv(), exportTableAsCsv(), isDataColumn() (+7 more)

### Community 74 - "Community 74"
Cohesion: 0.23
Nodes (13): annualTax(), computePay(), FILING_SAMPLE, lastDay(), leap(), lossOfPayAmount(), lossOfPayDays(), monthlyTds() (+5 more)

### Community 75 - "Community 75"
Cohesion: 0.32
Nodes (12): deviceLine(), copy(), devicesFor(), deviceToken(), fail(), mine(), peekDevice(), randomHex() (+4 more)

### Community 76 - "Community 76"
Cohesion: 0.32
Nodes (13): approvedMonthCovering(), approvedMonths(), awayOn(), joiningDate(), joiningProblem(), leavingDate(), leavingPeriods(), leavingProblem() (+5 more)

### Community 77 - "Community 77"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 78 - "Community 78"
Cohesion: 0.31
Nodes (10): subscribePrefs(), apply(), listeners, NAV_KEY, read(), storedChoice(), subscribe(), useNavWide() (+2 more)

### Community 79 - "Community 79"
Cohesion: 0.27
Nodes (11): Calendar(), pad(), seedDays(), dayNumber(), dayOffChecker(), isDayOff(), isWeekend(), daysWorked() (+3 more)

### Community 80 - "Community 80"
Cohesion: 0.33
Nodes (10): COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS, getCompanyProfile(), loadBox() (+2 more)

### Community 81 - "Community 81"
Cohesion: 0.27
Nodes (10): getExpense(), asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys(), PASSED, render() (+2 more)

### Community 83 - "Community 83"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 84 - "Community 84"
Cohesion: 0.53
Nodes (5): belowHundred(), belowThousand(), ONES, rupeesInWords(), TENS

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 705 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 27` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 33`, `Community 34`, `Community 35`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 47`, `Community 48`, `Community 52`, `Community 54`, `Community 55`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 65`, `Community 66`, `Community 67`, `Community 70`, `Community 75`, `Community 80`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07610172781984081 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 8` to `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 16`, `Community 22`, `Community 24`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 35`, `Community 38`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 46`, `Community 52`, `Community 56`, `Community 57`, `Community 59`, `Community 67`, `Community 68`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.045622209279751504 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 4` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 17`, `Community 18`, `Community 23`, `Community 24`, `Community 28`, `Community 29`, `Community 31`, `Community 33`, `Community 35`, `Community 37`, `Community 38`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 47`, `Community 52`, `Community 57`, `Community 59`, `Community 60`, `Community 62`, `Community 63`, `Community 66`, `Community 67`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._