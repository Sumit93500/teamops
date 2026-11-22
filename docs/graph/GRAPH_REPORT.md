# Graph Report - officeos  (2026-11-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3710 nodes · 17022 edges · 99 communities (95 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 246 edges (avg confidence: 0.85)
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

## God Nodes (most connected - your core abstractions)
1. `getUser()` - 280 edges
2. `el()` - 258 edges
3. `formatDay()` - 206 edges
4. `useSession()` - 166 edges
5. `nameOf()` - 157 edges
6. `useData()` - 134 edges
7. `pageUrl()` - 125 edges
8. `getAllUsers()` - 107 edges
9. `todayIso()` - 106 edges
10. `useToast()` - 103 edges

## Surprising Connections (you probably didn't know these)
- `DeclarationsReview()` --indirect_call--> `unlockDeclaration()`  [INFERRED]
  app/src/ui/declarations.jsx → assets/js/data/pay-structure.js
- `DeclarationsReview()` --indirect_call--> `verifyDeclaration()`  [INFERRED]
  app/src/ui/declarations.jsx → assets/js/data/pay-structure.js
- `assetApprovers()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/EmployeeDashboard.jsx → assets/js/ui/leave-view.js
- `assetWhat()` --calls--> `assetTypeLabel()`  [EXTRACTED]
  app/src/pages/AdminDashboard.jsx → assets/js/ui/inventory-view.js
- `monthYear()` --calls--> `monthName()`  [EXTRACTED]
  app/src/ui/leaveband.jsx → assets/js/ui/leave-view.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (99 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (103): COMPANY, companyInitial(), PRODUCT, tabTitle(), signInAs(), signOutNow(), refreshPrefs(), resetPrefs() (+95 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (106): monthLabel(), now(), pct(), SalaryPlan(), slabRows(), slabText(), TaxExplain(), UnverifiedNote() (+98 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (92): HistoryRow(), cancelRequest(), BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), MyRequests(), names() (+84 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (81): row(), recentRow(), buildRow(), logRow(), attentionItems(), attentionNote(), emptyRow(), forSummary() (+73 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (84): assetTitle(), correctionTitle(), decisionDate(), expenseTitle(), leaveTitle(), locationTitle(), readInbox(), salaryTitle() (+76 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (70): Badge(), Icon(), NotBuilt(), Reason(), StatCard(), StatStrip(), Stepper(), Tabs() (+62 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (73): activityNodes(), activityText(), CardTitle(), emptyRow(), flaggedSince(), HrDashboard(), Icon(), ICONS (+65 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (69): acquireFileUrl(), guardViewer(), live, releaseFileUrl(), revokeAllFileUrls(), useFileUrl(), initialsOf(), ACCEPT (+61 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (69): badgeOf(), Kv(), Card(), useData(), ACTION, askWhom(), ChangeForm(), Content() (+61 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (64): described(), Field(), Input(), Select(), Switch(), TextArea(), Modal(), bump() (+56 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (65): asOld(), ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceNodes(), barLook(), EmployeeDashboard() (+57 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (64): allAssetRequests(), assetsHeldByInactive(), assetsWithOpenReports(), assetTotals(), assetTypeOf(), isActive(), openReportOf(), ACTIONS (+56 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (53): EmptyState(), NO_DATA, useConfirm(), DateRange(), FilterBar(), FilterSelect(), rangeFor(), useDecision() (+45 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (59): pendingRegularizations(), actionsHead, arrowIcon(), byId(), decidedAt(), matches(), paginationEl, PILL_TAB (+51 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (58): preview(), BAND_NAME, BandBadge(), bandChange(), bandText(), days(), describePolicy(), Explain() (+50 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (58): salaryRows(), permissionsOf(), absencesIn(), actorWith(), approveProblem(), approversFor(), approveRun(), approves() (+50 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (56): FLAG_EXPORT, FLAG_LABEL, flaggedCell(), flagText(), iconOfPlace(), metres(), PLACE_ICON, PLACE_LABEL (+48 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (58): applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkIn(), checkInPlan(), checkOut() (+50 more)

### Community 18 - "Community 18"
Cohesion: 0.06
Nodes (53): ASSET_FLOW, CORRECTION_FLOW, DecisionButtons(), EXPENSE_FLOW, LEAVE_FLOW, LOCATION_FLOW, OVERTIME_FLOW, PROFILE_FLOW (+45 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (25): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+17 more)

### Community 20 - "Community 20"
Cohesion: 0.06
Nodes (54): ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPE_KEYS, ASSET_TYPES, CATEGORIES, CATEGORY_KEYS, CONDITION_KEYS, CONDITIONS (+46 more)

### Community 21 - "Community 21"
Cohesion: 0.07
Nodes (52): claimItems(), claimText(), chainFor(), EXPENSE_POLICY, allExpenses(), STAGE_NAME, waitingOn(), renderWhoApproves() (+44 more)

### Community 22 - "Community 22"
Cohesion: 0.07
Nodes (50): defaultMonth(), DOW, EMPTY, FIELD_ID, Holidays(), holidaysOf(), Icon(), overWarning() (+42 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (46): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+38 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (51): load(), addUser(), adminOnly(), approvedMonthCovering(), approvedMonths(), approvedRunMonths(), approvedRuns(), approvesRun() (+43 more)

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (44): showEmployerBox(), approved(), listed(), missingMonthText(), monthLabel(), notesOf(), openAbsence(), orDash() (+36 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (45): ApplyLeave(), balanceRows(), ERROR_ID, FOCUS, Kv(), typeMeta(), fixableIssue(), seedDays() (+37 more)

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (43): DEMO, b64(), b64url(), blank(), COMMON_PASSWORDS, countFailure(), createAccount(), empty() (+35 more)

### Community 28 - "Community 28"
Cohesion: 0.09
Nodes (43): changeFor(), stockStatus(), stockValue(), actorWith(), allMovements(), ASSET_REFERENCE, assets, assignAsset() (+35 more)

### Community 29 - "Community 29"
Cohesion: 0.16
Nodes (42): logEvent(), managerOf(), ACCURACY_FLAG_M, ACCURACY_REFUSE_M, active(), ADDRESS_MAX, assignVisit(), build() (+34 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (39): checkInRefusal(), checkOutRefusal(), active(), allLocationChanges(), answer(), applyChange(), blank(), cancelLocationChange() (+31 more)

### Community 31 - "Community 31"
Cohesion: 0.09
Nodes (36): ColumnChart(), ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT, approvalItems(), assetWhat(), chainEvents() (+28 more)

### Community 32 - "Community 32"
Cohesion: 0.14
Nodes (33): FilterSearch(), Person(), ICON, Icon(), ARROW, HeroCard(), KpiCard(), linePath() (+25 more)

### Community 33 - "Community 33"
Cohesion: 0.11
Nodes (38): CATEGORIES, CATEGORY_KEYS, firstStage(), nextStage(), STAGES, applied(), approverMustPay(), at() (+30 more)

### Community 34 - "Community 34"
Cohesion: 0.12
Nodes (34): parts(), runRows(), slipsFor(), withNewEngine(), approveRunWithSnapshot(), approveSnapshotProblem(), fail(), key() (+26 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (36): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+28 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (36): recordsStart(), shiftLossOfPay(), baseDay(), named(), pad(), reader(), sampleTimes(), shiftCounts() (+28 more)

### Community 37 - "Community 37"
Cohesion: 0.16
Nodes (37): viewOf(), hasPermission(), active(), allProfileChanges(), BANK_KEYS, bankTogether(), canReveal(), canSee() (+29 more)

### Community 38 - "Community 38"
Cohesion: 0.09
Nodes (36): activity, activityText(), approvalItem(), approvalsList, approvalsMeta, chart, leaveNote, leaveRange (+28 more)

### Community 39 - "Community 39"
Cohesion: 0.09
Nodes (31): initialsOf(), GROUPS, Holder(), matrixGroups(), RoleEditor(), ROLES_LIST, Tick(), Content() (+23 more)

### Community 40 - "Community 40"
Cohesion: 0.06
Nodes (36): movementEvent(), activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, assetWhat(), chainEvents() (+28 more)

### Community 41 - "Community 41"
Cohesion: 0.14
Nodes (36): activeUser(), allAssignmentRows(), allDepartmentDefaults(), allSwaps(), assignMany(), assignmentReader(), assignmentsFor(), assignRow() (+28 more)

### Community 42 - "Community 42"
Cohesion: 0.09
Nodes (33): ADMIN_HELD_BACK, LOCATION_GRANTS, OVERRIDABLE, ROLE_KEYS, SELF_SERVICE, correctionContext(), NIGHT_WINDOW_DEFAULT, NIGHT_WINDOW_MAX (+25 more)

### Community 43 - "Community 43"
Cohesion: 0.10
Nodes (31): PersonCell(), Calendar(), CAPPED, DOW, Icon(), isOff(), pad(), person() (+23 more)

### Community 44 - "Community 44"
Cohesion: 0.09
Nodes (33): cancelRegularization(), calendarCard, cancelRequest(), cellLook(), clearErrors(), field(), FIELDS, fillMonths() (+25 more)

### Community 45 - "Community 45"
Cohesion: 0.09
Nodes (33): checkInWindow(), clock, errorLine, grace, inBtn, lateMarks, lateNote, modeInputs (+25 more)

### Community 46 - "Community 46"
Cohesion: 0.10
Nodes (33): assetsFor(), chainText(), clearError(), clearReportError(), FIELD, fillReplaces(), form, ICON (+25 more)

### Community 47 - "Community 47"
Cohesion: 0.11
Nodes (32): actions, cardTitled(), closeIcon(), daysAway(), deactivateDialog(), deleteBtn, departmentName(), emptyCard() (+24 more)

### Community 48 - "Community 48"
Cohesion: 0.15
Nodes (29): isManagerNow(), CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), holdersOf(), holdsStage(), isActive() (+21 more)

### Community 49 - "Community 49"
Cohesion: 0.16
Nodes (25): decider(), approve(), submit(), NAV, OTHER_PAGES, getCurrentRole(), canOpenPage(), depthInPages() (+17 more)

### Community 50 - "Community 50"
Cohesion: 0.14
Nodes (30): Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel(), TABS (+22 more)

### Community 51 - "Community 51"
Cohesion: 0.12
Nodes (29): getAssetRequest(), getRegularization(), getRequest(), bellItem(), buildCard(), buildPanel(), cardState(), CHAIN_STAGE (+21 more)

### Community 52 - "Community 52"
Cohesion: 0.13
Nodes (29): allCompOff(), copy(), creditOvertime(), plusDays(), resetCompOff(), store, allOvertimeDecisions(), copy() (+21 more)

### Community 53 - "Community 53"
Cohesion: 0.12
Nodes (25): buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form, managerChoice() (+17 more)

### Community 54 - "Community 54"
Cohesion: 0.11
Nodes (28): salaryProposals(), renderPresent(), renderStock(), renderTotal(), setStat(), asRequest(), DECIDED, decisionDays() (+20 more)

### Community 55 - "Community 55"
Cohesion: 0.14
Nodes (29): copy(), createShift(), deactivateShift(), entry(), fail(), firstProblem(), GENERAL_ID, getShifts() (+21 more)

### Community 56 - "Community 56"
Cohesion: 0.14
Nodes (26): annualTax(), computePay(), FILING_SAMPLE, filingDates(), lastDay(), leap(), lossOfPayAmount(), lossOfPayDays() (+18 more)

### Community 57 - "Community 57"
Cohesion: 0.14
Nodes (27): applyPermissions(), allRows, buildRow(), changeButtons(), closeIcon(), currentRows(), editButton(), field() (+19 more)

### Community 58 - "Community 58"
Cohesion: 0.12
Nodes (26): headcountByDepartment(), activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el() (+18 more)

### Community 59 - "Community 59"
Cohesion: 0.11
Nodes (25): allAssets(), allItems(), clearError(), deptField, deptSelect, EMPTY, FIELD, fillDepartments() (+17 more)

### Community 60 - "Community 60"
Cohesion: 0.17
Nodes (26): alertText(), approverNames(), askedMonth, attendanceCheck(), buildRow(), checkItem(), dayOf(), monthLabel() (+18 more)

### Community 61 - "Community 61"
Cohesion: 0.19
Nodes (26): amount(), approved(), buildRow(), field(), financialYear(), joinedNote(), label(), messageRow() (+18 more)

### Community 62 - "Community 62"
Cohesion: 0.13
Nodes (26): avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el(), emptyRow(), exportBtn (+18 more)

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (22): subscribePrefs(), initialsFrom(), inRail(), RAIL, useMedia(), apply(), listeners, NAV_KEY (+14 more)

### Community 64 - "Community 64"
Cohesion: 0.15
Nodes (22): APP_NAV, APP_OTHER_PAGES, APP_OWN, mayOpenLeavePolicy(), mayOpenOutbox(), mayOpenRates(), mayOpenTeamVisits(), MY_VISITS_ITEM (+14 more)

### Community 65 - "Community 65"
Cohesion: 0.12
Nodes (22): NO_DATA, NoData(), ConfirmContext, ConfirmDialog(), ConfirmProvider(), CloseIcon(), DISCARD, focusables() (+14 more)

### Community 66 - "Community 66"
Cohesion: 0.12
Nodes (16): ok, clearError(), form, showError(), clearError(), form, showError(), closeAllDropdowns() (+8 more)

### Community 67 - "Community 67"
Cohesion: 0.12
Nodes (24): balanceList, chainList, clearError(), currentDays(), durationSelect, FIELD, form, fromInput (+16 more)

### Community 68 - "Community 68"
Cohesion: 0.16
Nodes (18): ALSO_FOR_MANAGERS, ROUTES, getCurrentUser(), getCurrentUserLabel(), getSession(), isSignedIn(), signIn(), signOut() (+10 more)

### Community 69 - "Community 69"
Cohesion: 0.21
Nodes (21): summaryOfDays(), attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), expenseSpendChart(), headcountChart(), HOURS_DATA (+13 more)

### Community 70 - "Community 70"
Cohesion: 0.10
Nodes (13): DEPARTMENTS, MANAGER_OF, PROFILE_DETAILS, USERS, clearError(), departmentName(), form, role (+5 more)

### Community 71 - "Community 71"
Cohesion: 0.18
Nodes (21): alertText(), approverNames(), B(), checks(), dayOf(), DONE, monthLabel(), Months() (+13 more)

### Community 72 - "Community 72"
Cohesion: 0.26
Nodes (21): MODES, storedRecord(), stampAfter(), shiftDayFor(), hhmm(), completeShiftDay(), fail(), inPlan() (+13 more)

### Community 73 - "Community 73"
Cohesion: 0.16
Nodes (19): allEvents(), AUDIT_KINDS, AUDIT_LABEL, empty(), eventsFor(), read(), createdOnOf(), officeDayOf() (+11 more)

### Community 74 - "Community 74"
Cohesion: 0.23
Nodes (17): detachedRows(), Row(), Table(), tdClass(), text(), BalanceCard(), Balances(), BAR (+9 more)

### Community 75 - "Community 75"
Cohesion: 0.20
Nodes (18): waitingCount(), waitingFor(), accountOf(), pendingProfileChanges(), fail(), lockedOnly(), mayUnlock(), pendingUnlockRequests() (+10 more)

### Community 76 - "Community 76"
Cohesion: 0.22
Nodes (19): copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), headOffice(), manager() (+11 more)

### Community 77 - "Community 77"
Cohesion: 0.20
Nodes (21): actorWith(), addDepartment(), commit(), copy(), deactivateUser(), deleteUser(), fail(), getDepartment() (+13 more)

### Community 78 - "Community 78"
Cohesion: 0.20
Nodes (19): ActionsCell(), B(), byName(), changesAtOnce(), editBlocked(), formulaText(), monthlyCost(), people() (+11 more)

### Community 79 - "Community 79"
Cohesion: 0.14
Nodes (19): amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD, form (+11 more)

### Community 80 - "Community 80"
Cohesion: 0.25
Nodes (16): closeIcon(), createDecisionFlow(), approve(), buildModal(), clearError(), openReject(), showError(), submitReject() (+8 more)

### Community 81 - "Community 81"
Cohesion: 0.29
Nodes (14): showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme(), onAppearanceChange() (+6 more)

### Community 82 - "Community 82"
Cohesion: 0.24
Nodes (15): cellText(), COLUMNS, csvCell(), csvText(), downloadCsv(), exportStatsAsCsv(), exportTableAsCsv(), isDataColumn() (+7 more)

### Community 83 - "Community 83"
Cohesion: 0.24
Nodes (14): EVENT, FinanceDashboard(), Icon(), ICONS, monthlyRuns(), people(), ROW_STATUS, short() (+6 more)

### Community 84 - "Community 84"
Cohesion: 0.38
Nodes (12): save(), copy(), createCollection(), add(), commit(), get(), getAll(), loadBox() (+4 more)

### Community 85 - "Community 85"
Cohesion: 0.27
Nodes (12): allVendors(), VENDOR_STATUS_KEYS, byId(), contactLine(), matches(), renderTable(), row(), tbody (+4 more)

### Community 87 - "Community 87"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 88 - "Community 88"
Cohesion: 0.33
Nodes (11): initRail(), close(), fit(), open(), inRail(), renderFooter(), renderProfile(), renderSignOut() (+3 more)

### Community 89 - "Community 89"
Cohesion: 0.33
Nodes (10): COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS, getCompanyProfile(), loadBox() (+2 more)

### Community 90 - "Community 90"
Cohesion: 0.20
Nodes (8): FIELD, FIELDS, PAN_HOLDER, PROFILE_SECTIONS, RULES, SECTIONS, VD, VP

### Community 91 - "Community 91"
Cohesion: 0.33
Nodes (7): CHAIN_STAGES, createChain(), holds(), managerCanDecide(), refusal(), isActive(), skippedEntry()

### Community 92 - "Community 92"
Cohesion: 0.33
Nodes (8): buildOption(), closeIcon(), iconButton(), renderSearch(), close(), draw(), setActive(), shutBox()

### Community 93 - "Community 93"
Cohesion: 0.60
Nodes (4): getVersion(), listeners, subscribe(), useVersion()

### Community 94 - "Community 94"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 95 - "Community 95"
Cohesion: 0.47
Nodes (5): allMail(), empty(), links, read(), resetMailOutbox()

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 785 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 48` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 21`, `Community 22`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 33`, `Community 34`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 49`, `Community 52`, `Community 53`, `Community 55`, `Community 57`, `Community 60`, `Community 61`, `Community 65`, `Community 67`, `Community 68`, `Community 69`, `Community 70`, `Community 71`, `Community 72`, `Community 73`, `Community 75`, `Community 76`, `Community 77`, `Community 78`, `Community 79`, `Community 83`, `Community 89`, `Community 91`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.049327865117338804 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 4` to `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 18`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 31`, `Community 32`, `Community 38`, `Community 40`, `Community 43`, `Community 44`, `Community 46`, `Community 47`, `Community 51`, `Community 54`, `Community 56`, `Community 57`, `Community 60`, `Community 61`, `Community 65`, `Community 71`, `Community 74`, `Community 78`, `Community 83`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.051274362818590706 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 3` to `Community 2`, `Community 4`, `Community 6`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 20`, `Community 21`, `Community 22`, `Community 25`, `Community 31`, `Community 38`, `Community 40`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 51`, `Community 53`, `Community 56`, `Community 57`, `Community 59`, `Community 60`, `Community 61`, `Community 65`, `Community 67`, `Community 79`, `Community 80`, `Community 83`, `Community 85`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._