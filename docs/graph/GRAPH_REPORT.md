# Graph Report - officeos  (2026-11-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2966 nodes · 12847 edges · 88 communities (86 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 235 edges (avg confidence: 0.85)
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
2. `getUser()` - 197 edges
3. `formatDay()` - 163 edges
4. `nameOf()` - 140 edges
5. `pageUrl()` - 103 edges
6. `plural()` - 97 edges
7. `todayIso()` - 97 edges
8. `useSession()` - 97 edges
9. `Frame()` - 91 edges
10. `getAllUsers()` - 89 edges

## Surprising Connections (you probably didn't know these)
- `Run()` --indirect_call--> `approveRun()`  [INFERRED]
  app/src/pages/PayrollRun.jsx → assets/js/data/payroll-store.js
- `Run()` --indirect_call--> `prepareRun()`  [INFERRED]
  app/src/pages/PayrollRun.jsx → assets/js/data/payroll-store.js
- `DeptForm()` --indirect_call--> `addDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js
- `DeptForm()` --indirect_call--> `updateDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js
- `assetApprovers()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/EmployeeDashboard.jsx → assets/js/ui/leave-view.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (88 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (103): permissionsOf(), CHAIN, decideAssetRequest(), fulfilAssetRequest(), getAssetRequest(), holdersOf(), holdsStage(), isActive() (+95 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (76): actorWith(), addDepartment(), addUser(), adminOnly(), approvedMonthCovering(), approvedMonths(), approvedRunMonths(), approvedRuns() (+68 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (56): NotBuilt(), detachedRows(), Row(), Table(), tdClass(), text(), NotPorted(), Announcements() (+48 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (68): ApplyLeave(), balanceRows(), ERROR_ID, FOCUS, Kv(), typeMeta(), Calendar(), pad() (+60 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (65): movementEvent(), allAssets(), assetsWithOpenReports(), assetTotals(), assetTypeOf(), openReportOf(), ACTIONS, actionsCell() (+57 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (61): ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT, assetWhat(), emptyRow(), Icon(), ICONS (+53 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (59): badgeOf(), useConfirm(), Kv(), Card(), PageHeader(), bump(), ACTION, askWhom() (+51 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (58): skippedEntry(), applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkIn(), checkInPlan() (+50 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (55): Badge(), PersonCell(), decisionDate(), decidedAt(), LeaveApprovals(), stageBadge(), STATS, TABS (+47 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (47): COMPANY, companyInitial(), PRODUCT, tabTitle(), signOutNow(), useSession(), waitingCount(), About() (+39 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (48): DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), FilterSelect(), IconButton(), PRESETS, rangeFor() (+40 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (51): defaultMonth(), DOW, EMPTY, FIELD_ID, Holidays(), holidaysOf(), Icon(), overWarning() (+43 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (49): ASSET_FLOW, EXPENSE_FLOW, LEAVE_FLOW, LOCATION_FLOW, SALARY_FLOW, ApprovalsInbox(), assetTitle(), correctionTitle() (+41 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (43): BarRows(), ColumnChart(), NO_DATA, NoData(), FLAG_EXPORT, FLAG_LABEL, flaggedCell(), flagText() (+35 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (47): inventoryValueChart(), ASSET_STATUSES, ASSET_TYPES, CATEGORIES, CATEGORY_KEYS, CONDITION_KEYS, CONDITIONS, LOCATION_KEYS (+39 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (43): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+35 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (45): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+37 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (40): described(), Field(), initialsOf(), Input(), Person(), Select(), Switch(), TextArea() (+32 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (45): allAssetRequests(), getExpense(), salaryProposals(), asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys() (+37 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (44): assetRequestDecisionsBy(), expenseDecisionsBy(), allCorrections, allLeave, asDecidedBy(), assetsDecided(), assetsPending(), assetTitle() (+36 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (44): ASSET_STATUS_KEYS, changeFor(), stockStatus(), stockValue(), actorWith(), allMovements(), ASSET_REFERENCE, assets (+36 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (42): claimText(), expenseTitle(), renderWhoApproves(), salaryTitle(), sinceCell(), allRows, buildRow(), byName() (+34 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (18): area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main(), norm_id() (+10 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (34): ALL_LOCATION_PERMISSIONS, LOCATION_PERMISSIONS, PERMISSIONS, LOCATION_GRANTS, OVERRIDABLE, ROLE_KEYS, SELF_SERVICE, renderRow() (+26 more)

### Community 24 - "Community 24"
Cohesion: 0.07
Nodes (41): MOVEMENT_TYPE_KEYS, movementEvent(), clearError(), deptField, deptSelect, EMPTY, FIELD, fillDepartments() (+33 more)

### Community 25 - "Community 25"
Cohesion: 0.08
Nodes (41): avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el(), emptyRow(), exportBtn (+33 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (37): DEDUCTIONS, ICONS, people(), returnToFile(), SLABS, TaxDeductions(), taxRegimeChart(), annualTax() (+29 more)

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (36): balanceNodes(), activityItems(), COST_NOTE, EVENT, FinanceDashboard(), Icon(), ICONS, people() (+28 more)

### Community 28 - "Community 28"
Cohesion: 0.10
Nodes (35): EMPLOYMENT_SAMPLE, EMPLOYMENT_TYPES, employmentKind(), employmentOf(), account(), admin(), anniversaryOf(), BAND_LABEL (+27 more)

### Community 29 - "Community 29"
Cohesion: 0.07
Nodes (37): activeHeadcount(), getAllUsers(), headcountByDepartment(), activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard (+29 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (35): stampKey(), deviceLine(), isHome(), m(), MarkAttendance(), ordinal(), pad(), placeLine() (+27 more)

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (34): approvalItems(), claimItems(), activityNodes(), activityText(), CardTitle(), emptyRow(), flaggedSince(), HrDashboard() (+26 more)

### Community 32 - "Community 32"
Cohesion: 0.09
Nodes (35): ASSET_TYPE_KEYS, allItems(), assetsFor(), chainText(), clearError(), clearReportError(), FIELD, fillReplaces() (+27 more)

### Community 33 - "Community 33"
Cohesion: 0.07
Nodes (34): attentionCount, attentionList, attentionNote(), dateInput, deptBars, deptDate, deptSelect, emptyRow() (+26 more)

### Community 34 - "Community 34"
Cohesion: 0.13
Nodes (32): EmployeeDashboard(), longDate(), BalanceCard(), Balances(), BAR, HEADS, MyLeave(), PendingSteps() (+24 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (33): actions, cardTitled(), closeIcon(), daysAway(), deactivateDialog(), deleteBtn, departmentName(), emptyCard() (+25 more)

### Community 36 - "Community 36"
Cohesion: 0.09
Nodes (33): nowMinutes(), clock, errorLine, grace, inBtn, lateMarks, lateNote, modeInputs (+25 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (33): waitingOn(), actionsCell(), categoryCell(), claimsText(), decidableIds(), EMPTY, entryOf(), lastAt() (+25 more)

### Community 38 - "Community 38"
Cohesion: 0.10
Nodes (30): OFFICE_STATES, addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry() (+22 more)

### Community 39 - "Community 39"
Cohesion: 0.10
Nodes (33): calendarCard, cancelRequest(), cellLook(), clearErrors(), field(), FIELDS, fixableIssue(), form (+25 more)

### Community 40 - "Community 40"
Cohesion: 0.16
Nodes (29): decider(), approve(), submit(), getCurrentRole(), getCurrentUserId(), getCurrentUserLabel(), getSession(), signOut() (+21 more)

### Community 41 - "Community 41"
Cohesion: 0.12
Nodes (31): leaveWhat(), requestName(), HistoryRow(), cancelRequest(), cancelLeave(), requestsFor(), leaveWhat(), requestName() (+23 more)

### Community 42 - "Community 42"
Cohesion: 0.14
Nodes (31): firstStage(), nextStage(), applied(), approverMustPay(), at(), auto(), blank(), by() (+23 more)

### Community 43 - "Community 43"
Cohesion: 0.15
Nodes (29): EmptyState(), Icon(), NO_DATA, Reason(), StatCard(), StatStrip(), Stepper(), Tabs() (+21 more)

### Community 44 - "Community 44"
Cohesion: 0.14
Nodes (26): clearError(), form, showError(), clearError(), form, showError(), closeIcon(), createDecisionFlow() (+18 more)

### Community 45 - "Community 45"
Cohesion: 0.09
Nodes (30): ASSET_VERB, assetApprovers(), assetOutcome(), balanceCard, barLook(), chart, hoursNote, hoursRange (+22 more)

### Community 46 - "Community 46"
Cohesion: 0.14
Nodes (28): BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), MyRequests(), names(), stepsOf(), TABS (+20 more)

### Community 47 - "Community 47"
Cohesion: 0.18
Nodes (27): Content(), OfficeForm(), plural(), typeLabel(), useDevicePosition(), copy(), createOffice(), deactivateOffice() (+19 more)

### Community 48 - "Community 48"
Cohesion: 0.14
Nodes (28): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+20 more)

### Community 49 - "Community 49"
Cohesion: 0.17
Nodes (28): hasPermission(), deviceLabel(), ACCURACY_LIMIT_M, active(), allLocationChanges(), answer(), applyChange(), blank() (+20 more)

### Community 50 - "Community 50"
Cohesion: 0.13
Nodes (25): activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el(), ensureOption() (+17 more)

### Community 51 - "Community 51"
Cohesion: 0.10
Nodes (23): CORRECTION_FLOW, ACTIVE, asRequest(), DECIDED, decisionDays(), DECISIONS, EXAMPLE, exampleSteps() (+15 more)

### Community 52 - "Community 52"
Cohesion: 0.12
Nodes (24): getRegularization(), getRequest(), buildCard(), buildPanel(), cardState(), CHAIN_STAGE, closeApprovalCard(), closeBellPanel() (+16 more)

### Community 53 - "Community 53"
Cohesion: 0.13
Nodes (25): allRows(), assetRow(), assetWith(), cancelAsset(), cancelClaim(), cancelCorrection(), correctionRow(), correctionTitle() (+17 more)

### Community 54 - "Community 54"
Cohesion: 0.13
Nodes (24): applyPermissions(), actionsHead, arrowIcon(), byId(), decidedAt(), matches(), paginationEl, PILL_TAB (+16 more)

### Community 55 - "Community 55"
Cohesion: 0.16
Nodes (21): active(), admin(), applied(), CALCS, chooseNewRegime(), copy(), declareOldRegime(), editor() (+13 more)

### Community 56 - "Community 56"
Cohesion: 0.10
Nodes (24): activity, approvalsList, approvalsMeta, chart, leaveNote, leaveRange, leaveRows, leaveRowsMeta (+16 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (22): DecisionButtons(), useDecision(), Regularization(), ActionsCell(), B(), byName(), changesAtOnce(), editBlocked() (+14 more)

### Community 58 - "Community 58"
Cohesion: 0.12
Nodes (22): LEAVE_POLICY, balanceTable, calendarCard, CAPPED, dayCell(), inView(), isOff(), month (+14 more)

### Community 59 - "Community 59"
Cohesion: 0.21
Nodes (18): load(), save(), copy(), createCollection(), add(), commit(), get(), getAll() (+10 more)

### Community 60 - "Community 60"
Cohesion: 0.20
Nodes (17): waitingFor(), CHAIN_STAGES, createChain(), holds(), managerCanDecide(), refusal(), isActive(), pendingFor() (+9 more)

### Community 61 - "Community 61"
Cohesion: 0.16
Nodes (20): Actions(), BADGE, claimsText(), EMPTY, entryOf(), Expenses(), ICONS, lastAt() (+12 more)

### Community 62 - "Community 62"
Cohesion: 0.14
Nodes (10): ConfirmContext, ConfirmDialog(), ConfirmProvider(), CloseIcon(), DISCARD, focusables(), Modal(), useDialogFocus() (+2 more)

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (18): ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), barLook(), Icon(), ICONS, isAsset() (+10 more)

### Community 64 - "Community 64"
Cohesion: 0.14
Nodes (19): amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD, form (+11 more)

### Community 65 - "Community 65"
Cohesion: 0.19
Nodes (16): ClaimExpense(), FIELD_ID, CATEGORIES, CATEGORY_KEYS, chainFor(), EXPENSE_POLICY, needsReceipt(), STAGES (+8 more)

### Community 66 - "Community 66"
Cohesion: 0.25
Nodes (18): amount(), approved(), financialYear(), ICONS, joinedNote(), label(), MessageRow(), monthOf() (+10 more)

### Community 67 - "Community 67"
Cohesion: 0.16
Nodes (18): remove(), COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS, loadBox() (+10 more)

### Community 68 - "Community 68"
Cohesion: 0.33
Nodes (18): isUnverified(), ruleOn(), esiFor(), gratuityAccrualFor(), isIntern(), labourWelfareFor(), leap(), money() (+10 more)

### Community 69 - "Community 69"
Cohesion: 0.28
Nodes (17): compareRegimes(), ctcFor(), hraExemption(), money(), oldRegimeDeductions(), payFor(), payMonth(), taxOn() (+9 more)

### Community 70 - "Community 70"
Cohesion: 0.21
Nodes (11): MAIN, RAW, SamplePage(), ok, closeAllDropdowns(), initDropdowns(), triggerOf(), initMenuToggle() (+3 more)

### Community 71 - "Community 71"
Cohesion: 0.22
Nodes (13): signInAs(), clearError(), DEMO_USERS, escapeHtml(), MAIN, PublicPage(), RAW, showError() (+5 more)

### Community 72 - "Community 72"
Cohesion: 0.25
Nodes (14): approved(), listed(), missingMonthText(), monthLabel(), notesOf(), openAbsence(), orDash(), PayslipView() (+6 more)

### Community 73 - "Community 73"
Cohesion: 0.24
Nodes (13): ALSO_FOR_MANAGERS, ROUTES, getCurrentUser(), isSignedIn(), canOpenPage(), currentPagePath(), guardPage(), PUBLIC_PAGES (+5 more)

### Community 74 - "Community 74"
Cohesion: 0.29
Nodes (14): attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), expenseSpendChart(), headcountChart(), HOURS_DATA, hoursChart() (+6 more)

### Community 75 - "Community 75"
Cohesion: 0.23
Nodes (14): allVendors(), VENDOR_STATUS_KEYS, byId(), contactLine(), matches(), renderTable(), row(), tbody (+6 more)

### Community 76 - "Community 76"
Cohesion: 0.15
Nodes (9): clearError(), departmentName(), form, role, save(), SAVED, showError(), STATUS (+1 more)

### Community 77 - "Community 77"
Cohesion: 0.29
Nodes (14): showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme(), onAppearanceChange() (+6 more)

### Community 78 - "Community 78"
Cohesion: 0.20
Nodes (14): closeAssetRequest(), STAGE_NAME, renderRequestCard(), assetRequestFlow, assetRequestSteps(), BADGE, closeFlow, lastEntry() (+6 more)

### Community 79 - "Community 79"
Cohesion: 0.27
Nodes (10): NAV, OTHER_PAGES, buildOption(), closeIcon(), iconButton(), renderSearch(), close(), draw() (+2 more)

### Community 80 - "Community 80"
Cohesion: 0.28
Nodes (11): ICONS, SECTION_ICONS, initRail(), close(), fit(), open(), inRail(), renderFooter() (+3 more)

### Community 81 - "Community 81"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 82 - "Community 82"
Cohesion: 0.24
Nodes (8): signIn(), redirectToLanding(), DEMO_USERS, loginForm, clearError(), form, inputs, showError()

### Community 83 - "Community 83"
Cohesion: 0.58
Nodes (10): assetRow(), correctionRow(), expenseRow(), leaveRow(), realRows(), render(), salaryRow(), titleCell() (+2 more)

### Community 84 - "Community 84"
Cohesion: 0.29
Nodes (7): chainEvents(), sentOn(), latestNote(), chainEvents(), renderActivity(), onDay(), localDateOf()

### Community 85 - "Community 85"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 702 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 60` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 11`, `Community 12`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 23`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 51`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 61`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 72`, `Community 73`, `Community 74`, `Community 76`, `Community 78`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05004170141784821 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 5` to `Community 0`, `Community 3`, `Community 4`, `Community 8`, `Community 11`, `Community 13`, `Community 14`, `Community 18`, `Community 19`, `Community 21`, `Community 23`, `Community 24`, `Community 26`, `Community 27`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 39`, `Community 40`, `Community 41`, `Community 44`, `Community 45`, `Community 46`, `Community 48`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 56`, `Community 57`, `Community 58`, `Community 61`, `Community 63`, `Community 64`, `Community 65`, `Community 75`, `Community 78`, `Community 83`, `Community 84`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06740506329113924 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 21` to `Community 0`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 24`, `Community 26`, `Community 27`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 37`, `Community 39`, `Community 41`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 48`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 56`, `Community 57`, `Community 58`, `Community 61`, `Community 63`, `Community 65`, `Community 66`, `Community 72`, `Community 78`, `Community 83`, `Community 84`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._