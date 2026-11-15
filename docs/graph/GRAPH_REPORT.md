# Graph Report - officeos  (2026-11-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3474 nodes · 15760 edges · 95 communities (92 shown, 3 thin omitted)
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
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/MyRequests.jsx → assets/js/ui/leave-view.js
- `CompanyProfile()` --indirect_call--> `updateCompanyProfile()`  [INFERRED]
  app/src/pages/CompanyProfile.jsx → assets/js/data/company-store.js
- `DeptForm()` --indirect_call--> `addDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js
- `DeptForm()` --indirect_call--> `updateDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (95 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (77): Badge(), NotBuilt(), Tabs(), detachedRows(), Row(), Table(), tdClass(), text() (+69 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (85): StatCard(), StatStrip(), BarRows(), ColumnChart(), NO_DATA, NoData(), flaggedCell(), asOld() (+77 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (87): assetApprovers(), assetName(), isAsset(), requestItems(), BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode() (+79 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (77): PersonCell(), leaveWhat(), requestName(), decidedAt(), LeaveApprovals(), stageBadge(), STATS, TABS (+69 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (78): ApplyLeave(), balanceRows(), ERROR_ID, FOCUS, Kv(), typeMeta(), recentDays(), Calendar() (+70 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (76): recordedTime(), CHAIN_STAGES, createChain(), holds(), managerCanDecide(), refusal(), isActive(), closeAssetRequest() (+68 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (72): approvalItems(), row(), buildRow(), claimItems(), row(), timesCell(), row(), cardLink() (+64 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (69): runRows(), monthlyRuns(), alertText(), approverNames(), B(), checks(), dayOf(), DONE (+61 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (69): AuthLayout(), DEMO_USERS, ForgotPassword(), landingOf(), LinkPage(), Login(), Message(), NewPasswordForm() (+61 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (67): actorWith(), addDepartment(), addUser(), adminOnly(), approvedMonthCovering(), approvedMonths(), approvedRunMonths(), approvedRuns() (+59 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (60): ASSET_FLOW, CORRECTION_FLOW, DecisionButtons(), EXPENSE_FLOW, LEAVE_FLOW, LOCATION_FLOW, OVERTIME_FLOW, PROFILE_FLOW (+52 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (61): movementEvent(), assetsHeldByInactive(), assetsWithOpenReports(), assetTotals(), earliestHandOver(), openReportOf(), ACTIONS, actionsCell() (+53 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (60): assetRequestDecisionsBy(), expenseDecisionsBy(), managesAnyone(), decidedBy(), salaryProposals(), allCorrections, allLeave, asDecidedBy() (+52 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (53): NO_DATA, described(), Field(), Input(), Person(), Select(), TextArea(), Modal() (+45 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (54): monthLabel(), now(), pct(), SalaryPlan(), slabRows(), slabText(), TaxExplain(), EMPLOYMENT_SAMPLE (+46 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (49): DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), FilterSelect(), IconButton(), PRESETS, rangeFor() (+41 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (46): Icon(), Stepper(), Switch(), getVersion(), listeners, subscribe(), useCan(), useData() (+38 more)

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (52): BADGE, claimsText(), EMPTY, Expenses(), ICONS, lastAt(), PAGE_STAGES, Receipt() (+44 more)

### Community 18 - "Community 18"
Cohesion: 0.07
Nodes (49): defaultMonth(), DOW, EMPTY, FIELD_ID, Holidays(), holidaysOf(), Icon(), overWarning() (+41 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (44): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+36 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (46): preview(), BAND_NAME, BandBadge(), bandChange(), days(), describePolicy(), Explain(), NAME (+38 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (46): Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel(), TABS (+38 more)

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (19): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+11 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (43): initialsFrom(), orDash(), profileOf(), approvalChainText(), leavingDate(), reportingManagerName(), actions, cardTitled() (+35 more)

### Community 24 - "Community 24"
Cohesion: 0.07
Nodes (42): clearError(), form, showError(), clock, errorLine, grace, inBtn, lateMarks (+34 more)

### Community 25 - "Community 25"
Cohesion: 0.10
Nodes (42): FLAG_EXPORT, FLAG_LABEL, flagText(), iconOfPlace(), metres(), PLACE_ICON, PLACE_LABEL, placeLabel() (+34 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (42): MODES, storedRecord(), stampAfter(), monthOvertime(), overtimeDays(), pendingOvertime(), sampleTimes(), shiftDayFor() (+34 more)

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (40): badgeOf(), parts(), showEmployerBox(), slipsFor(), slipTotals(), withNewEngine(), amount(), approved() (+32 more)

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (41): viewOf(), FIELD, FIELDS, PROFILE_SECTIONS, RULES, SECTIONS, hasPermission(), active() (+33 more)

### Community 29 - "Community 29"
Cohesion: 0.10
Nodes (41): changeFor(), stockStatus(), stockValue(), actorWith(), allMovements(), ASSET_REFERENCE, assets, assignAsset() (+33 more)

### Community 30 - "Community 30"
Cohesion: 0.08
Nodes (41): pendingFor(), activity, activityText(), approvalItem(), approvalsList, approvalsMeta, chart, leaveNote (+33 more)

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (36): DEDUCTIONS, ICONS, people(), returnToFile(), SLABS, annualTax(), computePay(), FILING_SAMPLE (+28 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (38): allAssetRequests(), asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys(), PASSED, render() (+30 more)

### Community 33 - "Community 33"
Cohesion: 0.11
Nodes (36): ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT, emptyRow(), Icon(), ICONS, listText() (+28 more)

### Community 34 - "Community 34"
Cohesion: 0.12
Nodes (33): load(), save(), allEvents(), AUDIT_KINDS, AUDIT_LABEL, empty(), eventsFor(), read() (+25 more)

### Community 35 - "Community 35"
Cohesion: 0.09
Nodes (36): allAssets(), allItems(), movementEvent(), clearError(), deptField, deptSelect, EMPTY, FIELD (+28 more)

### Community 36 - "Community 36"
Cohesion: 0.09
Nodes (37): calendarCard, cancelRequest(), cellLook(), clearErrors(), field(), FIELDS, fillMonths(), fixableIssue() (+29 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (34): EmptyState(), useConfirm(), initialsOf(), Card(), Content(), Content(), Form(), LIST (+26 more)

### Community 38 - "Community 38"
Cohesion: 0.14
Nodes (36): activeUser(), allAssignmentRows(), allDepartmentDefaults(), allSwaps(), assignMany(), assignmentReader(), assignmentsFor(), assignRow() (+28 more)

### Community 39 - "Community 39"
Cohesion: 0.10
Nodes (34): waitingFor(), closeCards(), BELL_SELECTOR, bellListeners, BellPanel(), Card(), CardHost(), cardState() (+26 more)

### Community 40 - "Community 40"
Cohesion: 0.11
Nodes (29): ALSO_FOR_MANAGERS, ROUTES, getCurrentUser(), getCurrentUserLabel(), getSession(), isSignedIn(), signIn(), signOut() (+21 more)

### Community 41 - "Community 41"
Cohesion: 0.14
Nodes (34): checkInRefusal(), checkOutRefusal(), resetCompanyProfile(), resetAllDevices(), active(), allLocationChanges(), applyChange(), blank() (+26 more)

### Community 42 - "Community 42"
Cohesion: 0.10
Nodes (33): assetsFor(), chainText(), clearError(), clearReportError(), FIELD, fillReplaces(), form, ICON (+25 more)

### Community 43 - "Community 43"
Cohesion: 0.09
Nodes (30): DEPARTMENTS, DESIGNATIONS, MANAGER_OF, PROFILE_DETAILS, USERS, avatarClass(), buildRow(), departmentName() (+22 more)

### Community 44 - "Community 44"
Cohesion: 0.07
Nodes (33): activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, assetWhat(), chart, deptSelect (+25 more)

### Community 45 - "Community 45"
Cohesion: 0.13
Nodes (32): allRows, buildRow(), byName(), changeButtons(), changesAtOnce(), closeIcon(), currentRows(), editBlocked() (+24 more)

### Community 46 - "Community 46"
Cohesion: 0.13
Nodes (32): Reason(), ActionsCell(), B(), byName(), changesAtOnce(), editBlocked(), formulaText(), monthlyCost() (+24 more)

### Community 47 - "Community 47"
Cohesion: 0.13
Nodes (30): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+22 more)

### Community 48 - "Community 48"
Cohesion: 0.13
Nodes (32): isOff(), renderOpenRequests(), renderPayslip(), renderPresent(), renderRecent(), setStat(), alertText(), askedMonth (+24 more)

### Community 49 - "Community 49"
Cohesion: 0.08
Nodes (30): ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPE_KEYS, CATEGORIES, CATEGORY_KEYS, CONDITION_KEYS, CONDITIONS, LOCATION_KEYS (+22 more)

### Community 50 - "Community 50"
Cohesion: 0.20
Nodes (30): compareRegimes(), hraExemption(), money(), oldRegimeDeductions(), payMonth(), policyLossOfPay(), policyLossOfPayFrom(), shiftLossOfPay() (+22 more)

### Community 51 - "Community 51"
Cohesion: 0.12
Nodes (29): activityItems(), claimText(), EVENT, FinanceDashboard(), Icon(), ICONS, people(), ROW_STATUS (+21 more)

### Community 52 - "Community 52"
Cohesion: 0.12
Nodes (28): addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry(), fail() (+20 more)

### Community 53 - "Community 53"
Cohesion: 0.12
Nodes (25): buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form, managerChoice() (+17 more)

### Community 54 - "Community 54"
Cohesion: 0.14
Nodes (29): applied(), approverMustPay(), at(), auto(), blank(), by(), canPay(), decideExpense() (+21 more)

### Community 55 - "Community 55"
Cohesion: 0.18
Nodes (24): tabTitle(), signOutNow(), useSession(), About(), Appearance(), Gallery(), cell(), Content() (+16 more)

### Community 56 - "Community 56"
Cohesion: 0.15
Nodes (28): DAY, copy(), createShift(), deactivateShift(), entry(), fail(), firstProblem(), hours() (+20 more)

### Community 57 - "Community 57"
Cohesion: 0.12
Nodes (27): getDepartment(), headcountByDepartment(), activeInput, addBtn, buildCard(), clearError(), codeInput, descEl (+19 more)

### Community 58 - "Community 58"
Cohesion: 0.13
Nodes (26): getRegularization(), getRequest(), bellItem(), buildCard(), buildPanel(), cardState(), CHAIN_STAGE, closeApprovalCard() (+18 more)

### Community 59 - "Community 59"
Cohesion: 0.15
Nodes (24): CHAIN, decideAssetRequest(), fulfilAssetRequest(), getAssetRequest(), holdersOf(), holdsStage(), isActive(), isHeldFor() (+16 more)

### Community 60 - "Community 60"
Cohesion: 0.17
Nodes (23): copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), headOffice(), manager() (+15 more)

### Community 61 - "Community 61"
Cohesion: 0.11
Nodes (25): setStat(), actionsHead, decidedAt(), matches(), outCard, overlapAlert, paginationEl, PILL_TAB (+17 more)

### Community 62 - "Community 62"
Cohesion: 0.16
Nodes (25): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+17 more)

### Community 63 - "Community 63"
Cohesion: 0.16
Nodes (23): applyPermissions(), allVendors(), VENDOR_STATUS_KEYS, renderTable(), byCategory(), matches(), renderTable(), renderTable() (+15 more)

### Community 64 - "Community 64"
Cohesion: 0.15
Nodes (24): inventoryValueChart(), stockBarPercent(), blankStock(), inventoryTotals(), reorderAlerts(), categoryCell(), ICON, icon() (+16 more)

### Community 65 - "Community 65"
Cohesion: 0.16
Nodes (21): subscribePrefs(), ABOUT, initialsFrom(), inRail(), RAIL, useMedia(), apply(), listeners (+13 more)

### Community 66 - "Community 66"
Cohesion: 0.20
Nodes (19): getCurrentRole(), getCurrentUserId(), pendingFor(), directReportsOf(), isManager(), waitingNow(), ICONS, SECTION_ICONS (+11 more)

### Community 67 - "Community 67"
Cohesion: 0.14
Nodes (21): admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail(), isDay(), isMonth() (+13 more)

### Community 68 - "Community 68"
Cohesion: 0.13
Nodes (21): balanceTable, calendarCard, CAPPED, dayCell(), inView(), isOff(), month, outCard (+13 more)

### Community 69 - "Community 69"
Cohesion: 0.15
Nodes (18): decider(), useDecision(), approve(), submit(), activityNodes(), activityText(), CardTitle(), emptyRow() (+10 more)

### Community 70 - "Community 70"
Cohesion: 0.13
Nodes (20): allRegularizations(), actionsHead, arrowIcon(), byId(), decidedAt(), matches(), paginationEl, PILL_TAB (+12 more)

### Community 71 - "Community 71"
Cohesion: 0.22
Nodes (19): Kv(), ACTION, askWhom(), ChangeForm(), Content(), day(), HomeCard(), KIND_HINT (+11 more)

### Community 72 - "Community 72"
Cohesion: 0.18
Nodes (16): COMPANY, companyInitial(), PRODUCT, signInAs(), clearError(), DEMO_USERS, escapeHtml(), MAIN (+8 more)

### Community 73 - "Community 73"
Cohesion: 0.18
Nodes (16): RATES_RULES, APP_OTHER_PAGES, APP_OWN, mayOpenLeavePolicy(), mayOpenOutbox(), mayOpenRates(), OFFICES_ITEM, openable() (+8 more)

### Community 74 - "Community 74"
Cohesion: 0.14
Nodes (19): amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD, form (+11 more)

### Community 75 - "Community 75"
Cohesion: 0.16
Nodes (9): ConfirmContext, ConfirmDialog(), ConfirmProvider(), CloseIcon(), DISCARD, focusables(), useDialogFocus(), ToastContext (+1 more)

### Community 76 - "Community 76"
Cohesion: 0.19
Nodes (14): GROUPS, Holder(), matrixGroups(), RoleEditor(), ROLES_LIST, Tick(), ALL_LOCATION_PERMISSIONS, ALL_PERMISSIONS (+6 more)

### Community 77 - "Community 77"
Cohesion: 0.21
Nodes (11): MAIN, RAW, SamplePage(), ok, closeAllDropdowns(), initDropdowns(), triggerOf(), initMenuToggle() (+3 more)

### Community 78 - "Community 78"
Cohesion: 0.23
Nodes (14): depthInPages(), resolvePageLink(), resolveRootLink(), rootPrefix(), buildOption(), closeIcon(), iconButton(), matchingPages() (+6 more)

### Community 79 - "Community 79"
Cohesion: 0.24
Nodes (16): cellText(), COLUMNS, csvCell(), csvText(), downloadCsv(), exportStatsAsCsv(), exportTableAsCsv(), initExports() (+8 more)

### Community 80 - "Community 80"
Cohesion: 0.25
Nodes (16): closeIcon(), createDecisionFlow(), approve(), buildModal(), clearError(), openReject(), showError(), submitReject() (+8 more)

### Community 81 - "Community 81"
Cohesion: 0.15
Nodes (9): clearError(), departmentName(), form, role, save(), SAVED, showError(), STATUS (+1 more)

### Community 82 - "Community 82"
Cohesion: 0.29
Nodes (14): showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme(), onAppearanceChange() (+6 more)

### Community 83 - "Community 83"
Cohesion: 0.25
Nodes (14): admin(), compOffRule(), copy(), DEFAULT_COMP_OFF, DEFAULT_LATE_POLICY, DEFAULT_SHIFT_RULES_FROM, entry(), fail() (+6 more)

### Community 84 - "Community 84"
Cohesion: 0.20
Nodes (12): CATEGORIES, chainFor(), EXPENSE_POLICY, STAGES, BADGE, describeClaim(), expenseFlow, LATER (+4 more)

### Community 85 - "Community 85"
Cohesion: 0.29
Nodes (12): copy(), deviceLabel(), devicesFor(), deviceToken(), fail(), MAX_DEVICES, mine(), peekDevice() (+4 more)

### Community 86 - "Community 86"
Cohesion: 0.35
Nodes (10): setPref(), waitingCount(), CompanyMark(), SearchOpener(), applyAccent(), applyTheme(), Bell(), Icon() (+2 more)

### Community 87 - "Community 87"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 88 - "Community 88"
Cohesion: 0.29
Nodes (8): ASIDE, byId(), decidedAt(), Regularization(), tabRequests(), TABS, pageList(), Pagination()

### Community 89 - "Community 89"
Cohesion: 0.20
Nodes (10): LOCATION_GRANTS, OVERRIDABLE, permissionsOf(), ROLE_KEYS, SELF_SERVICE, decidesStage(), mayPayClaim(), paysClaim() (+2 more)

### Community 90 - "Community 90"
Cohesion: 0.36
Nodes (7): APP_NAV, results(), SEARCH_ICON, SearchBox(), isManagerNow(), navItemHref(), navItemVisible()

### Community 91 - "Community 91"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 753 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 5` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 20`, `Community 21`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 32`, `Community 33`, `Community 34`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 44`, `Community 45`, `Community 46`, `Community 48`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 56`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 66`, `Community 67`, `Community 68`, `Community 70`, `Community 74`, `Community 81`, `Community 83`, `Community 85`, `Community 86`, `Community 88`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07326732673267326 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 10` to `Community 1`, `Community 2`, `Community 3`, `Community 6`, `Community 7`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 23`, `Community 27`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 36`, `Community 37`, `Community 39`, `Community 42`, `Community 44`, `Community 45`, `Community 46`, `Community 48`, `Community 49`, `Community 51`, `Community 55`, `Community 58`, `Community 61`, `Community 62`, `Community 68`, `Community 69`, `Community 70`, `Community 71`, `Community 84`, `Community 88`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05197368421052632 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 6` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 17`, `Community 18`, `Community 23`, `Community 24`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 35`, `Community 36`, `Community 42`, `Community 44`, `Community 45`, `Community 48`, `Community 49`, `Community 51`, `Community 53`, `Community 58`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 68`, `Community 69`, `Community 70`, `Community 74`, `Community 80`, `Community 84`, `Community 88`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._