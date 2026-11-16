# Graph Report - officeos  (2026-11-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3612 nodes · 16646 edges · 104 communities (101 shown, 3 thin omitted)
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
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102

## God Nodes (most connected - your core abstractions)
1. `getUser()` - 276 edges
2. `el()` - 258 edges
3. `formatDay()` - 204 edges
4. `useSession()` - 155 edges
5. `nameOf()` - 153 edges
6. `useData()` - 127 edges
7. `pageUrl()` - 124 edges
8. `getAllUsers()` - 107 edges
9. `todayIso()` - 106 edges
10. `useToast()` - 100 edges

## Surprising Connections (you probably didn't know these)
- `MyLeave()` --indirect_call--> `byNewest()`  [INFERRED]
  app/src/pages/MyLeave.jsx → assets/js/ui/leave-view.js
- `monthYear()` --calls--> `monthName()`  [EXTRACTED]
  app/src/ui/leaveband.jsx → assets/js/ui/leave-view.js
- `DeclarationsReview()` --indirect_call--> `unlockDeclaration()`  [INFERRED]
  app/src/ui/declarations.jsx → assets/js/data/pay-structure.js
- `DeclarationsReview()` --indirect_call--> `verifyDeclaration()`  [INFERRED]
  app/src/ui/declarations.jsx → assets/js/data/pay-structure.js
- `assetWhat()` --calls--> `assetTypeLabel()`  [EXTRACTED]
  app/src/pages/AdminDashboard.jsx → assets/js/ui/inventory-view.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (104 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (80): Badge(), BarRows(), detachedRows(), Row(), Table(), tdClass(), text(), getVersion() (+72 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (86): ROLE_KEYS, compareRegimes(), hraExemption(), money(), oldRegimeDeductions(), payMonth(), taxOn(), tdsFor() (+78 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (76): Reason(), parts(), runRows(), showEmployerBox(), slipsFor(), slipTotals(), withNewEngine(), amount() (+68 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (73): NO_DATA, NoData(), row(), recentRow(), cellLook(), DOW, EMPTY_FORM, FIELD_ID (+65 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (74): useConfirm(), initialsOf(), Kv(), Card(), useData(), ACTION, askWhom(), ChangeForm() (+66 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (76): chainEvents(), decisionDate(), assetRequestDecisionsBy(), expenseDecisionsBy(), chainEvents(), allCorrections, allLeave, asDecidedBy() (+68 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (72): balanceRows(), CHAIN_STAGES, createChain(), holds(), managerCanDecide(), refusal(), isActive(), skippedEntry() (+64 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (65): DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), FilterSelect(), IconButton(), PRESETS, rangeFor() (+57 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (71): AuthLayout(), BrandPanel(), DEMO_USERS, ForgotPassword(), landingOf(), LinkPage(), Login(), Message() (+63 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (68): badgeOf(), Icon(), NO_DATA, NotBuilt(), PersonCell(), StatCard(), StatStrip(), Stepper() (+60 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (70): allAssetRequests(), allAssets(), assetsHeldByInactive(), assetsWithOpenReports(), assetTotals(), isActive(), openReportOf(), movementEvent() (+62 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (60): recentDays(), applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkIn(), checkInPlan() (+52 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (58): leaveWhat(), leaveTitle(), activityNodes(), activityText(), CardTitle(), emptyRow(), flaggedSince(), HrDashboard() (+50 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (58): buildRow(), names(), withText(), ASIDE, byId(), decidedAt(), recordedTime(), Regularization() (+50 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (57): actorWith(), addDepartment(), addUser(), adminOnly(), approvesRun(), byNonAdmin(), carriesAdmin(), changeUser() (+49 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (52): AssignShiftModal(), dayWords(), MOON, otText(), shiftBadge(), ShiftCard(), ShiftLine(), shiftOptions() (+44 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (45): decider(), approve(), submit(), isManagerNow(), ALSO_FOR_MANAGERS, ROUTES, getCurrentRole(), getCurrentUserId() (+37 more)

### Community 17 - "Community 17"
Cohesion: 0.16
Nodes (46): described(), Field(), Input(), Select(), Switch(), TextArea(), Modal(), bump() (+38 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (44): EmptyState(), Content(), MyVisits(), NONE, STATUS_OPTIONS, Content(), link(), NONE (+36 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (49): applyPermissions(), ASSET_STATUSES, ASSET_TYPES, CATEGORIES, CONDITION_KEYS, CONDITIONS, LOCATION_KEYS, LOCATIONS (+41 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (48): permissionsOf(), fail(), absencesIn(), actorWith(), approveProblem(), approversFor(), approveRun(), approves() (+40 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (40): signOutNow(), Content(), KIND, Mail(), MailOutbox(), when(), APP_ALSO, RequireRoute() (+32 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (45): FLAG_EXPORT, FLAG_LABEL, flaggedCell(), flagText(), iconOfPlace(), metres(), PLACE_ICON, PLACE_LABEL (+37 more)

### Community 23 - "Community 23"
Cohesion: 0.10
Nodes (42): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+34 more)

### Community 24 - "Community 24"
Cohesion: 0.10
Nodes (19): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (45): CATEGORIES, CATEGORY_KEYS, chainFor(), EXPENSE_POLICY, STAGES, applied(), approverMustPay(), at() (+37 more)

### Community 26 - "Community 26"
Cohesion: 0.08
Nodes (44): overWarning(), Calendar(), pad(), addHoliday(), byDate(), dayLabel(), getAllHolidays(), HOLIDAY_KINDS (+36 more)

### Community 27 - "Community 27"
Cohesion: 0.09
Nodes (43): ASSET_STATUS_KEYS, changeFor(), STOCK_STATUS_KEYS, stockStatus(), stockValue(), actorWith(), allMovements(), ASSET_REFERENCE (+35 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (40): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+32 more)

### Community 29 - "Community 29"
Cohesion: 0.09
Nodes (43): claimText(), needsReceipt(), renderWhoApproves(), actionsCell(), categoryCell(), claimsText(), decidableIds(), EMPTY (+35 more)

### Community 30 - "Community 30"
Cohesion: 0.08
Nodes (40): approvalItems(), claimItems(), attentionItems(), BellPanel(), Card(), InboxLink(), waitingSince(), CheckIcon() (+32 more)

### Community 31 - "Community 31"
Cohesion: 0.08
Nodes (37): longDate(), leaveBalanceChart(), deletedName(), renderChart(), listItem(), longDate(), balanceCard(), balanceGrid (+29 more)

### Community 32 - "Community 32"
Cohesion: 0.18
Nodes (40): logEvent(), managerOf(), ACCURACY_FLAG_M, ACCURACY_REFUSE_M, active(), ADDRESS_MAX, assignVisit(), build() (+32 more)

### Community 33 - "Community 33"
Cohesion: 0.10
Nodes (38): byName(), salaryRows(), newestFirst(), pendingSalaryProposal(), proposalDecidersFor(), salaryFor(), salaryHistory(), storedProposals() (+30 more)

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (38): Person(), Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel() (+30 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (36): ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT, assetWhat(), emptyRow(), Icon(), ICONS (+28 more)

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (35): hasPermission(), active(), allProfileChanges(), BANK_KEYS, bankTogether(), canReveal(), canSee(), clean() (+27 more)

### Community 37 - "Community 37"
Cohesion: 0.07
Nodes (34): attentionCount, attentionList, attentionNote(), dateInput, deptBars, deptDate, deptSelect, emptyRow() (+26 more)

### Community 38 - "Community 38"
Cohesion: 0.09
Nodes (34): checkInWindow(), clock, errorLine, grace, inBtn, lateMarks, lateNote, modeInputs (+26 more)

### Community 39 - "Community 39"
Cohesion: 0.10
Nodes (34): ASSET_TYPE_KEYS, allItems(), assetsFor(), chainText(), clearError(), clearReportError(), FIELD, fillReplaces() (+26 more)

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (32): shiftLossOfPay(), baseDay(), named(), pad(), sampleTimes(), shiftCounts(), shiftDay(), shiftMonthFor() (+24 more)

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (33): actions, cardTitled(), closeIcon(), daysAway(), deactivateDialog(), deleteBtn, departmentName(), emptyCard() (+25 more)

### Community 42 - "Community 42"
Cohesion: 0.15
Nodes (32): cell(), Content(), d(), FIELD_LABEL, FIELDS, preview(), TYPES, BAND_NAME (+24 more)

### Community 43 - "Community 43"
Cohesion: 0.09
Nodes (32): closeCards(), BELL_SELECTOR, bellListeners, CardHost(), cardLink(), cardOpener(), cardState(), CHAIN_STAGE (+24 more)

### Community 44 - "Community 44"
Cohesion: 0.12
Nodes (32): assetRequestsFor(), regularizationsFor(), cancelExpense(), expensesFor(), requestsFor(), openRequests(), ownRequests(), TAB (+24 more)

### Community 45 - "Community 45"
Cohesion: 0.08
Nodes (33): ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceCard, barLook(), chart, hoursNote (+25 more)

### Community 46 - "Community 46"
Cohesion: 0.10
Nodes (33): calendarCard, cancelRequest(), cellLook(), clearErrors(), field(), FIELDS, fixableIssue(), form (+25 more)

### Community 47 - "Community 47"
Cohesion: 0.10
Nodes (29): ASSET_FLOW, CORRECTION_FLOW, EXPENSE_FLOW, LEAVE_FLOW, LOCATION_FLOW, OVERTIME_FLOW, PROFILE_FLOW, SALARY_FLOW (+21 more)

### Community 48 - "Community 48"
Cohesion: 0.12
Nodes (30): people(), annualTax(), computePay(), FILING_SAMPLE, filingDates(), lastDay(), leap(), lossOfPayAmount() (+22 more)

### Community 49 - "Community 49"
Cohesion: 0.13
Nodes (30): monthSpan(), activityItems(), EVENT, FinanceDashboard(), Icon(), ICONS, monthlyRuns(), people() (+22 more)

### Community 50 - "Community 50"
Cohesion: 0.11
Nodes (30): getAssetRequest(), getRegularization(), getRequest(), bellItem(), buildCard(), buildPanel(), cardLink(), cardState() (+22 more)

### Community 51 - "Community 51"
Cohesion: 0.17
Nodes (30): setStat(), amount(), approved(), buildRow(), field(), financialYear(), joinedNote(), label() (+22 more)

### Community 52 - "Community 52"
Cohesion: 0.12
Nodes (29): ColumnChart(), asOld(), ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceNodes(), barLook() (+21 more)

### Community 53 - "Community 53"
Cohesion: 0.15
Nodes (30): checkInRefusal(), deviceLabel(), ACCURACY_LIMIT_M, active(), allLocationChanges(), answer(), applyChange(), blank() (+22 more)

### Community 54 - "Community 54"
Cohesion: 0.07
Nodes (30): activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, assetWhat(), chart, deptSelect (+22 more)

### Community 55 - "Community 55"
Cohesion: 0.12
Nodes (25): buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form, managerChoice() (+17 more)

### Community 56 - "Community 56"
Cohesion: 0.13
Nodes (24): subscribePrefs(), waitingCount(), initialsFrom(), inRail(), RAIL, useMedia(), apply(), listeners (+16 more)

### Community 57 - "Community 57"
Cohesion: 0.09
Nodes (28): movementEvent(), CATEGORY_KEYS, MOVEMENT_TYPE_KEYS, clearError(), deptField, deptSelect, EMPTY, FIELD (+20 more)

### Community 58 - "Community 58"
Cohesion: 0.10
Nodes (27): isAppCreated(), account(), admin(), applyLeaveUnderPolicy(), BAND_LABEL, daysWorked(), EDITABLE, entry() (+19 more)

### Community 59 - "Community 59"
Cohesion: 0.15
Nodes (28): copy(), createShift(), deactivateShift(), entry(), fail(), firstProblem(), getShifts(), isInt() (+20 more)

### Community 60 - "Community 60"
Cohesion: 0.12
Nodes (26): getDepartment(), activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el() (+18 more)

### Community 61 - "Community 61"
Cohesion: 0.15
Nodes (27): alertText(), approverNames(), askedMonth, attendanceCheck(), buildRow(), checkItem(), dayOf(), monthLabel() (+19 more)

### Community 62 - "Community 62"
Cohesion: 0.13
Nodes (22): allVendors(), VENDOR_STATUS_KEYS, clearError(), form, showError(), removeOne(), clearError(), form (+14 more)

### Community 63 - "Community 63"
Cohesion: 0.13
Nodes (26): avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el(), emptyRow(), exportBtn (+18 more)

### Community 64 - "Community 64"
Cohesion: 0.16
Nodes (21): load(), save(), COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS (+13 more)

### Community 65 - "Community 65"
Cohesion: 0.18
Nodes (23): CHAIN, decideAssetRequest(), fulfilAssetRequest(), holdersOf(), holdsStage(), isActive(), isHeldFor(), managerCanDecide() (+15 more)

### Community 66 - "Community 66"
Cohesion: 0.23
Nodes (24): MODES, storedRecord(), checkOutAt(), stampAfter(), where(), shiftDayFor(), addDays(), hhmm() (+16 more)

### Community 67 - "Community 67"
Cohesion: 0.10
Nodes (14): DEPARTMENTS, DESIGNATIONS, MANAGER_OF, PROFILE_DETAILS, USERS, clearError(), departmentName(), form (+6 more)

### Community 68 - "Community 68"
Cohesion: 0.13
Nodes (23): actionsHead, decidedAt(), matches(), outCard, overlapAlert, paginationEl, PILL_TAB, pills (+15 more)

### Community 69 - "Community 69"
Cohesion: 0.18
Nodes (23): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+15 more)

### Community 70 - "Community 70"
Cohesion: 0.14
Nodes (22): cancelAssetRequest(), closeAssetRequest(), isOpen(), newestFirst(), renderRequestCard(), assetRow(), cancelAsset(), assetRequestFlow (+14 more)

### Community 71 - "Community 71"
Cohesion: 0.18
Nodes (17): COMPANY, companyInitial(), PRODUCT, signInAs(), clearError(), DEMO_USERS, escapeHtml(), MAIN (+9 more)

### Community 72 - "Community 72"
Cohesion: 0.22
Nodes (19): copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), headOffice(), manager() (+11 more)

### Community 73 - "Community 73"
Cohesion: 0.17
Nodes (16): CheckInPlaces(), departmentName(), initialsFrom(), Kv(), MyDevices(), MyProfile(), onDay(), orDash() (+8 more)

### Community 74 - "Community 74"
Cohesion: 0.14
Nodes (19): amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD, form (+11 more)

### Community 75 - "Community 75"
Cohesion: 0.16
Nodes (9): ConfirmContext, ConfirmDialog(), ConfirmProvider(), CloseIcon(), DISCARD, focusables(), useDialogFocus(), ToastContext (+1 more)

### Community 76 - "Community 76"
Cohesion: 0.17
Nodes (15): GROUPS, Holder(), matrixGroups(), RoleEditor(), ROLES_LIST, Tick(), ALL_LOCATION_PERMISSIONS, ALL_PERMISSIONS (+7 more)

### Community 77 - "Community 77"
Cohesion: 0.23
Nodes (16): waitingFor(), allOvertimeDecisions(), copy(), decideOvertime(), decideOvertimeItem(), fail(), mayDecideOvertime(), monthOvertime() (+8 more)

### Community 78 - "Community 78"
Cohesion: 0.22
Nodes (17): admin(), copy(), DEFAULT_COMP_OFF, DEFAULT_LATE_POLICY, DEFAULT_SHIFT_RULES_FROM, entry(), fail(), lateHalfDays() (+9 more)

### Community 79 - "Community 79"
Cohesion: 0.25
Nodes (16): closeIcon(), createDecisionFlow(), approve(), buildModal(), clearError(), openReject(), showError(), submitReject() (+8 more)

### Community 80 - "Community 80"
Cohesion: 0.22
Nodes (14): admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail(), isDay(), isMonth() (+6 more)

### Community 81 - "Community 81"
Cohesion: 0.29
Nodes (14): showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme(), onAppearanceChange() (+6 more)

### Community 82 - "Community 82"
Cohesion: 0.24
Nodes (15): cellText(), COLUMNS, csvCell(), csvText(), downloadCsv(), exportStatsAsCsv(), exportTableAsCsv(), isDataColumn() (+7 more)

### Community 83 - "Community 83"
Cohesion: 0.25
Nodes (13): EMPLOYMENT_SAMPLE, EMPLOYMENT_TYPES, employmentKind(), createdDay(), employmentPeriod(), employmentState(), isEmployedOn(), joinedOn() (+5 more)

### Community 84 - "Community 84"
Cohesion: 0.28
Nodes (13): fail(), lockedOnly(), mayUnlock(), pendingUnlockRequests(), resolveUnlockRequest(), stillLocked(), unlockRequestItem(), allUnlockRequests() (+5 more)

### Community 85 - "Community 85"
Cohesion: 0.25
Nodes (11): NAV, OTHER_PAGES, buildOption(), closeIcon(), iconButton(), matchingPeople(), renderSearch(), close() (+3 more)

### Community 86 - "Community 86"
Cohesion: 0.21
Nodes (12): copy(), freezeSnapshot(), resetPaySnapshots(), store, writeSnapshot(), ADDRESS_MAX, coordsProblem(), distanceM() (+4 more)

### Community 87 - "Community 87"
Cohesion: 0.24
Nodes (8): ok, closeAllDropdowns(), initDropdowns(), triggerOf(), initMenuToggle(), renderHeadcount(), initTableFilters(), initTabs()

### Community 88 - "Community 88"
Cohesion: 0.24
Nodes (12): allExpenses(), getExpense(), salaryProposals(), asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys() (+4 more)

### Community 89 - "Community 89"
Cohesion: 0.22
Nodes (12): NIGHT_WINDOW_DEFAULT, NIGHT_WINDOW_MAX, nightCheckOutJudge(), nightFixHours(), nightFixWindow(), resetNightFix(), setNightFixHours(), setNightFixWindow() (+4 more)

### Community 90 - "Community 90"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 91 - "Community 91"
Cohesion: 0.36
Nodes (10): getCurrentUser(), initRail(), close(), fit(), open(), inRail(), renderFooter(), renderProfile() (+2 more)

### Community 92 - "Community 92"
Cohesion: 0.44
Nodes (11): copy(), createCollection(), add(), commit(), get(), getAll(), loadBox(), remove() (+3 more)

### Community 93 - "Community 93"
Cohesion: 0.31
Nodes (11): approvedMonthCovering(), approvedMonths(), approvedRunMonths(), approvedRuns(), joiningProblem(), leavingProblem(), localToday(), monthEnd() (+3 more)

### Community 94 - "Community 94"
Cohesion: 0.20
Nodes (8): FIELD, FIELDS, PAN_HOLDER, PROFILE_SECTIONS, RULES, SECTIONS, VD, VP

### Community 95 - "Community 95"
Cohesion: 0.27
Nodes (9): PERMISSIONS, renderBadMonth(), GROUPS, moduleRow(), renderDetails(), renderMatrix(), renderNotFound(), tickBox() (+1 more)

### Community 96 - "Community 96"
Cohesion: 0.28
Nodes (8): allVisits(), copy(), getVisit(), KIND_LABEL, LIVE, resetVisits(), STATUS_LABEL, store

### Community 97 - "Community 97"
Cohesion: 0.39
Nodes (7): allCompOff(), compOffFor(), compOffShield(), copy(), creditOvertime(), plusDays(), store

### Community 98 - "Community 98"
Cohesion: 0.43
Nodes (6): allEvents(), AUDIT_KINDS, AUDIT_LABEL, empty(), eventsFor(), read()

### Community 99 - "Community 99"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 100 - "Community 100"
Cohesion: 0.53
Nodes (5): belowHundred(), belowThousand(), ONES, rupeesInWords(), TENS

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 766 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 6` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 20`, `Community 22`, `Community 25`, `Community 26`, `Community 27`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 49`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 55`, `Community 58`, `Community 59`, `Community 61`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 69`, `Community 70`, `Community 72`, `Community 73`, `Community 74`, `Community 77`, `Community 78`, `Community 80`, `Community 83`, `Community 84`, `Community 89`, `Community 91`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.058383838383838385 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 2` to `Community 0`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 23`, `Community 25`, `Community 26`, `Community 29`, `Community 30`, `Community 31`, `Community 33`, `Community 35`, `Community 37`, `Community 39`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 54`, `Community 61`, `Community 62`, `Community 68`, `Community 69`, `Community 70`, `Community 73`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.054199328107502796 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 13` to `Community 0`, `Community 3`, `Community 5`, `Community 6`, `Community 10`, `Community 12`, `Community 15`, `Community 16`, `Community 19`, `Community 25`, `Community 26`, `Community 29`, `Community 30`, `Community 31`, `Community 33`, `Community 35`, `Community 37`, `Community 38`, `Community 39`, `Community 41`, `Community 44`, `Community 45`, `Community 46`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 54`, `Community 55`, `Community 57`, `Community 61`, `Community 62`, `Community 68`, `Community 69`, `Community 70`, `Community 74`, `Community 79`, `Community 95`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._