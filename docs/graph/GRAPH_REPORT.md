# Graph Report - officeos  (2026-11-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3263 nodes · 14634 edges · 96 communities (94 shown, 2 thin omitted)
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
2. `getUser()` - 221 edges
3. `formatDay()` - 180 edges
4. `nameOf()` - 145 edges
5. `useSession()` - 131 edges
6. `pageUrl()` - 128 edges
7. `useData()` - 110 edges
8. `todayIso()` - 106 edges
9. `getAllUsers()` - 95 edges
10. `plural()` - 94 edges

## Surprising Connections (you probably didn't know these)
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/MyRequests.jsx → assets/js/ui/leave-view.js
- `assetApprovers()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/EmployeeDashboard.jsx → assets/js/ui/leave-view.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/Expenses.jsx → assets/js/ui/leave-view.js
- `monthYear()` --calls--> `monthName()`  [EXTRACTED]
  app/src/ui/leaveband.jsx → assets/js/ui/leave-view.js
- `DeptForm()` --indirect_call--> `addDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (96 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (118): AuthLayout(), DEMO_USERS, ForgotPassword(), landingOf(), LinkPage(), Login(), Message(), NewPasswordForm() (+110 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (104): leaveWhat(), requestName(), updateNodes(), activityNodes(), activityText(), BalanceCard(), Balances(), BAR (+96 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (62): Badge(), NotBuilt(), Table(), NotPorted(), Announcements(), ApprovalWorkflows(), AuditLog(), T1_COLUMNS (+54 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (80): leaveRow(), row(), attentionItems(), row(), CheckIcon(), OutNextWeek(), PendingSteps(), Step() (+72 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (73): row(), recentRow(), cellLook(), DOW, EMPTY_FORM, FIELD_ID, fixableIssue(), ICONS (+65 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (71): assetWhat(), CONDITION_KEYS, LOCATION_KEYS, allAssets(), assetsHeldByInactive(), assetsWithOpenReports(), assetTotals(), openReportOf() (+63 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (64): recentDays(), seedDays(), dayNumber(), dayOffChecker(), isoFromDayNumber(), daysWorked(), lossOfPayDaysIn(), applied() (+56 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (53): described(), Field(), Input(), Person(), Select(), Switch(), TextArea(), Modal() (+45 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (60): defaultMonth(), DOW, EMPTY, FIELD_ID, Holidays(), holidaysOf(), Icon(), overWarning() (+52 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (59): salaryRows(), permissionsOf(), recordsStart(), fail(), absencesIn(), actorWith(), approveProblem(), approversFor() (+51 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (49): ColumnChart(), NO_DATA, NoData(), detachedRows(), Row(), tdClass(), text(), flaggedCell() (+41 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (51): DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), FilterSelect(), IconButton(), PRESETS, rangeFor() (+43 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (54): applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkIn(), checkInPlan(), checkInRefusal() (+46 more)

### Community 13 - "Community 13"
Cohesion: 0.10
Nodes (51): badgeOf(), EmptyState(), useConfirm(), Kv(), Card(), PageHeader(), useData(), Content() (+43 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (43): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+35 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (49): movementEvent(), ASSET_STATUS_KEYS, changeFor(), needsReorder(), STOCK_STATUS_KEYS, stockStatus(), stockValue(), actorWith() (+41 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (48): deviceLine(), copy(), deviceLabel(), devicesFor(), deviceToken(), fail(), MAX_DEVICES, mine() (+40 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (43): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+35 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (19): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+11 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (45): inventoryValueChart(), ASSET_STATUSES, ASSET_TYPES, CATEGORIES, CONDITIONS, LOCATIONS, MOVEMENT_TYPES, STOCK_STATUSES (+37 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (42): active(), DeclarationsReview(), MyDeclaration(), now(), STATUS, StatusPill(), holdsPayRulePermission(), active() (+34 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (43): ASSET_TYPE_KEYS, chainText(), clearError(), clearReportError(), FIELD, fillReplaces(), form, ICON (+35 more)

### Community 22 - "Community 22"
Cohesion: 0.08
Nodes (41): assetRequestDecisionsBy(), expenseDecisionsBy(), allCorrections, allLeave, asDecidedBy(), assetsDecided(), assetsPending(), correctionsDecided() (+33 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (38): CORRECTION_FLOW, DecisionButtons(), useDecision(), chainEvents(), ApprovalsInbox(), assetTitle(), correctionTitle(), decisionDate() (+30 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (38): LEAVE_FLOW, stampsBy(), ApplyLeave(), balanceRows(), ERROR_ID, FOCUS, Kv(), typeMeta() (+30 more)

### Community 25 - "Community 25"
Cohesion: 0.07
Nodes (40): CATEGORY_KEYS, MOVEMENT_TYPE_KEYS, clearError(), deptField, deptSelect, EMPTY, FIELD, fillDepartments() (+32 more)

### Community 26 - "Community 26"
Cohesion: 0.08
Nodes (40): avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el(), emptyRow(), exportBtn (+32 more)

### Community 27 - "Community 27"
Cohesion: 0.08
Nodes (38): ASSET_FLOW, EXPENSE_FLOW, LOCATION_FLOW, PROFILE_FLOW, SALARY_FLOW, closeCards(), BELL_SELECTOR, bellListeners (+30 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (32): ok, ALSO_FOR_MANAGERS, ROUTES, getCurrentUser(), getCurrentUserLabel(), getSession(), isSignedIn(), signOut() (+24 more)

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (40): actorWith(), addDepartment(), addUser(), adminOnly(), carriesAdmin(), commit(), copy(), deactivateUser() (+32 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (33): ICON, ARROW, Pill(), FLAG_EXPORT, FLAG_LABEL, flagText(), iconOfPlace(), metres() (+25 more)

### Community 31 - "Community 31"
Cohesion: 0.11
Nodes (35): balanceNodes(), valuesOf(), annualTax(), computePay(), FILING_SAMPLE, filingDates(), lastDay(), leap() (+27 more)

### Community 32 - "Community 32"
Cohesion: 0.14
Nodes (35): alertText(), approverNames(), B(), checks(), dayOf(), DONE, monthLabel(), Months() (+27 more)

### Community 33 - "Community 33"
Cohesion: 0.11
Nodes (36): Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel(), TABS (+28 more)

### Community 34 - "Community 34"
Cohesion: 0.07
Nodes (35): attentionCount, attentionList, attentionNote(), dateInput, deptBars, deptDate, deptSelect, emptyRow() (+27 more)

### Community 35 - "Community 35"
Cohesion: 0.12
Nodes (34): claimText(), SALARY_COMPONENTS, claimText(), allRows, buildRow(), byName(), changeButtons(), changesAtOnce() (+26 more)

### Community 36 - "Community 36"
Cohesion: 0.13
Nodes (32): Icon(), PersonCell(), StatCard(), StatStrip(), Stepper(), Tabs(), BarRows(), Expenses() (+24 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (33): monthSpan(), activityItems(), buildRow(), claimItems(), EVENT, FinanceDashboard(), Icon(), ICONS (+25 more)

### Community 38 - "Community 38"
Cohesion: 0.09
Nodes (34): nowMinutes(), clock, errorLine, grace, inBtn, lateMarks, lateNote, modeInputs (+26 more)

### Community 39 - "Community 39"
Cohesion: 0.11
Nodes (33): allExpenses(), actionsCell(), categoryCell(), claimsText(), decidableIds(), EMPTY, entryOf(), lastAt() (+25 more)

### Community 40 - "Community 40"
Cohesion: 0.07
Nodes (32): STAGE_NAME, activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, chart, deptSelect (+24 more)

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (27): approvalChainFor(), resolveManager(), buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field() (+19 more)

### Community 42 - "Community 42"
Cohesion: 0.15
Nodes (28): decider(), approve(), submit(), isManagerNow(), getCurrentRole(), getCurrentUserId(), pendingFor(), managesAnyone() (+20 more)

### Community 43 - "Community 43"
Cohesion: 0.17
Nodes (28): Content(), OfficeForm(), plural(), typeLabel(), useDevicePosition(), ABOUT, copy(), createOffice() (+20 more)

### Community 44 - "Community 44"
Cohesion: 0.12
Nodes (28): addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry(), fail() (+20 more)

### Community 45 - "Community 45"
Cohesion: 0.18
Nodes (29): setStat(), amount(), approved(), buildRow(), field(), financialYear(), joinedNote(), label() (+21 more)

### Community 46 - "Community 46"
Cohesion: 0.11
Nodes (29): actions, closeIcon(), daysAway(), deactivateDialog(), deleteBtn, departmentName(), formatAccount(), heldNote() (+21 more)

### Community 47 - "Community 47"
Cohesion: 0.15
Nodes (24): COMPANY, PRODUCT, waitingCount(), waitingFor(), CompanyMark(), initialsFrom(), inRail(), RAIL (+16 more)

### Community 48 - "Community 48"
Cohesion: 0.22
Nodes (28): compareRegimes(), hraExemption(), money(), oldRegimeDeductions(), payMonth(), policyLossOfPay(), policyLossOfPayFrom(), taxOn() (+20 more)

### Community 49 - "Community 49"
Cohesion: 0.15
Nodes (28): claimsText(), alertText(), approverNames(), askedMonth, attendanceCheck(), buildRow(), checkItem(), dayOf() (+20 more)

### Community 50 - "Community 50"
Cohesion: 0.13
Nodes (27): getRegularization(), getRequest(), bellItem(), buildCard(), buildPanel(), cardState(), CHAIN_STAGE, closeApprovalCard() (+19 more)

### Community 51 - "Community 51"
Cohesion: 0.14
Nodes (28): applied(), approverMustPay(), at(), auto(), averageProcessingDays(), blank(), by(), canPay() (+20 more)

### Community 52 - "Community 52"
Cohesion: 0.12
Nodes (27): headcountByDepartment(), activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el() (+19 more)

### Community 53 - "Community 53"
Cohesion: 0.10
Nodes (27): activity, approvalsList, approvalsMeta, chart, leaveNote, leaveRange, leaveRows, leaveRowsMeta (+19 more)

### Community 54 - "Community 54"
Cohesion: 0.09
Nodes (26): ASSET_VERB, assetOutcome(), balanceCard, barLook(), chart, hoursNote, hoursRange, isOff() (+18 more)

### Community 55 - "Community 55"
Cohesion: 0.17
Nodes (24): NO_DATA, parts(), runRows(), slipsFor(), slipTotals(), withNewEngine(), amount(), approved() (+16 more)

### Community 56 - "Community 56"
Cohesion: 0.11
Nodes (23): ConfirmContext, ConfirmDialog(), ConfirmProvider(), CloseIcon(), DISCARD, focusables(), useDialogFocus(), ACTION (+15 more)

### Community 57 - "Community 57"
Cohesion: 0.15
Nodes (20): APP_ALSO, APP_NAV, APP_OTHER_PAGES, APP_OWN, mayOpenLeavePolicy(), mayOpenOutbox(), mayOpenRates(), OFFICES_ITEM (+12 more)

### Community 58 - "Community 58"
Cohesion: 0.12
Nodes (21): ALL_LOCATION_PERMISSIONS, ALL_PERMISSIONS, LOCATION_PERMISSIONS, PERMISSIONS, LOCATION_GRANTS, OVERRIDABLE, ROLE_KEYS, ROLES (+13 more)

### Community 59 - "Community 59"
Cohesion: 0.18
Nodes (23): load(), save(), copy(), createCollection(), add(), commit(), get(), getAll() (+15 more)

### Community 60 - "Community 60"
Cohesion: 0.16
Nodes (23): CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), getAssetRequest(), holdersOf(), holdsStage(), isActive() (+15 more)

### Community 61 - "Community 61"
Cohesion: 0.11
Nodes (24): account(), admin(), applyLeaveUnderPolicy(), BAND_LABEL, EDITABLE, entry(), fail(), FLAT_POLICY (+16 more)

### Community 62 - "Community 62"
Cohesion: 0.18
Nodes (22): preview(), BAND_NAME, BandBadge(), bandChange(), days(), describePolicy(), Explain(), monthYear() (+14 more)

### Community 63 - "Community 63"
Cohesion: 0.16
Nodes (22): applyPermissions(), allVendors(), VENDOR_STATUS_KEYS, renderAssets(), renderTable(), editButton(), renderComponents(), renderTable() (+14 more)

### Community 64 - "Community 64"
Cohesion: 0.18
Nodes (23): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+15 more)

### Community 65 - "Community 65"
Cohesion: 0.23
Nodes (19): summaryOfDays(), attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), expenseSpendChart(), headcountChart(), HOURS_DATA (+11 more)

### Community 66 - "Community 66"
Cohesion: 0.17
Nodes (18): initialsOf(), Content(), Form(), LIST, MONTHS, OVERRIDES_HINT, plural(), problemsOf() (+10 more)

### Community 67 - "Community 67"
Cohesion: 0.14
Nodes (19): amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD, form (+11 more)

### Community 68 - "Community 68"
Cohesion: 0.14
Nodes (19): actionsHead, arrowIcon(), byId(), decidedAt(), matches(), paginationEl, PILL_TAB, pills (+11 more)

### Community 69 - "Community 69"
Cohesion: 0.22
Nodes (17): showEmployerBox(), approved(), listed(), missingMonthText(), monthLabel(), notesOf(), openAbsence(), orDash() (+9 more)

### Community 70 - "Community 70"
Cohesion: 0.30
Nodes (18): monthLabel(), now(), pct(), SalaryPlan(), slabRows(), slabText(), TaxExplain(), UnverifiedNote() (+10 more)

### Community 71 - "Community 71"
Cohesion: 0.21
Nodes (16): canOpenPage(), depthInPages(), resolvePageLink(), resolveRootLink(), rootPrefix(), buildOption(), closeIcon(), iconButton() (+8 more)

### Community 72 - "Community 72"
Cohesion: 0.19
Nodes (15): companyInitial(), signInAs(), clearError(), DEMO_USERS, escapeHtml(), MAIN, PublicPage(), RAW (+7 more)

### Community 73 - "Community 73"
Cohesion: 0.26
Nodes (16): Reason(), ActionsCell(), B(), byName(), changesAtOnce(), editBlocked(), formulaText(), monthlyCost() (+8 more)

### Community 74 - "Community 74"
Cohesion: 0.19
Nodes (15): ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), barLook(), EmployeeDashboard(), Icon(), ICONS (+7 more)

### Community 75 - "Community 75"
Cohesion: 0.21
Nodes (15): admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail(), isDay(), isMonth() (+7 more)

### Community 76 - "Community 76"
Cohesion: 0.23
Nodes (17): assetRow(), decidedRow(), decisionDate(), expenseRow(), expenseTitle(), leaveRow(), leaveTitle(), pillTab() (+9 more)

### Community 77 - "Community 77"
Cohesion: 0.17
Nodes (15): CATEGORIES, STAGES, STAGE_NAME, renderChain(), BADGE, categoryLabel(), describeClaim(), expenseSteps() (+7 more)

### Community 78 - "Community 78"
Cohesion: 0.15
Nodes (9): clearError(), departmentName(), form, role, save(), SAVED, showError(), STATUS (+1 more)

### Community 79 - "Community 79"
Cohesion: 0.29
Nodes (14): showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme(), onAppearanceChange() (+6 more)

### Community 80 - "Community 80"
Cohesion: 0.28
Nodes (13): ClaimExpense(), FIELD_ID, CATEGORY_KEYS, chainFor(), EXPENSE_POLICY, firstStage(), needsReceipt(), nextStage() (+5 more)

### Community 81 - "Community 81"
Cohesion: 0.29
Nodes (15): approvedMonthCovering(), approvedMonths(), approvedRunMonths(), approvedRuns(), changeUser(), emailTaken(), joiningDate(), joiningProblem() (+7 more)

### Community 82 - "Community 82"
Cohesion: 0.20
Nodes (13): Actions(), BADGE, EMPTY, entryOf(), ICONS, lastAt(), Muted(), names() (+5 more)

### Community 83 - "Community 83"
Cohesion: 0.24
Nodes (12): allAssetRequests(), getExpense(), salaryProposals(), asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys() (+4 more)

### Community 84 - "Community 84"
Cohesion: 0.24
Nodes (9): clearError(), form, showError(), clearError(), form, showError(), ensureContainer(), initToasts() (+1 more)

### Community 85 - "Community 85"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 86 - "Community 86"
Cohesion: 0.20
Nodes (11): approvesRun(), decidesStage(), deleteProblem(), isLastAdmin(), lastApproverProblem(), mayPayClaim(), openProblem(), openRequestsOf() (+3 more)

### Community 87 - "Community 87"
Cohesion: 0.29
Nodes (8): CHAIN_STAGES, createChain(), holds(), managerCanDecide(), refusal(), isActive(), skippedEntry(), decideRegularization()

### Community 88 - "Community 88"
Cohesion: 0.33
Nodes (9): correctionRow(), correctionTitle(), approvalItem(), correctionDetails(), issueLabel(), approveCorrection, approveLeave, correctionFlow (+1 more)

### Community 89 - "Community 89"
Cohesion: 0.38
Nodes (7): byNonAdmin(), isList(), overridesChange(), overridesProblem(), sameList(), storedList(), withoutUnchanged()

### Community 90 - "Community 90"
Cohesion: 0.29
Nodes (4): DESIGNATIONS, MANAGER_OF, PROFILE_DETAILS, USERS

### Community 91 - "Community 91"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 92 - "Community 92"
Cohesion: 0.53
Nodes (5): belowHundred(), belowThousand(), ONES, rupeesInWords(), TENS

### Community 93 - "Community 93"
Cohesion: 0.60
Nodes (5): cardTitled(), emptyCard(), note(), renderAssets(), renderOverrides()

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 730 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 0` to `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 15`, `Community 16`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 28`, `Community 29`, `Community 30`, `Community 32`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 49`, `Community 51`, `Community 53`, `Community 54`, `Community 55`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 69`, `Community 70`, `Community 73`, `Community 74`, `Community 75`, `Community 77`, `Community 78`, `Community 80`, `Community 82`, `Community 87`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05083870967741935 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 4` to `Community 1`, `Community 3`, `Community 5`, `Community 6`, `Community 8`, `Community 10`, `Community 19`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 31`, `Community 34`, `Community 35`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 45`, `Community 46`, `Community 49`, `Community 50`, `Community 53`, `Community 54`, `Community 58`, `Community 63`, `Community 64`, `Community 67`, `Community 68`, `Community 74`, `Community 76`, `Community 77`, `Community 88`, `Community 93`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05221017514595496 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 1` to `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 13`, `Community 17`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 27`, `Community 31`, `Community 32`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 39`, `Community 40`, `Community 45`, `Community 46`, `Community 49`, `Community 50`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 62`, `Community 64`, `Community 66`, `Community 68`, `Community 69`, `Community 70`, `Community 73`, `Community 74`, `Community 76`, `Community 77`, `Community 82`, `Community 88`, `Community 93`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._