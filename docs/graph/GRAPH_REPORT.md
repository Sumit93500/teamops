# Graph Report - officeos  (2026-11-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 4487 nodes · 21434 edges · 101 communities (97 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 283 edges (avg confidence: 0.85)
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

## God Nodes (most connected - your core abstractions)
1. `getUser()` - 325 edges
2. `el()` - 258 edges
3. `useSession()` - 227 edges
4. `formatDay()` - 217 edges
5. `useData()` - 183 edges
6. `nameOf()` - 170 edges
7. `pageUrl()` - 167 edges
8. `useToast()` - 137 edges
9. `todayIso()` - 137 edges
10. `bump()` - 133 edges

## Surprising Connections (you probably didn't know these)
- `visitDates()` --calls--> `formatDay()`  [EXTRACTED]
  app/src/components/Decision.jsx → assets/js/ui/leave-view.js
- `assetApprovers()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/EmployeeDashboard.jsx → assets/js/ui/leave-view.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/Expenses.jsx → assets/js/ui/leave-view.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/MyRequests.jsx → assets/js/ui/leave-view.js
- `DeptForm()` --indirect_call--> `addDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (101 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (179): chainEvents(), leaveWhat(), requestName(), activityNodes(), activityText(), CardTitle(), emptyRow(), flaggedSince() (+171 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (118): COMPANY, companyInitial(), PRODUCT, tabTitle(), signInAs(), signOutNow(), useSession(), NotPorted() (+110 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (102): Badge(), Icon(), NotBuilt(), PersonCell(), Reason(), StatCard(), StatStrip(), Stepper() (+94 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (96): EmptyState(), FilterBar(), FilterSearch(), FilterSelect(), PRESETS, ICON, Icon(), ARROW (+88 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (85): described(), Field(), Input(), Person(), Select(), Switch(), TextArea(), Modal() (+77 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (84): badgeOf(), initialsOf(), Kv(), Card(), useData(), ACTION, ChangeForm(), Content() (+76 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (82): ColumnChart(), NO_DATA, NoData(), FLAG_EXPORT, FLAG_LABEL, flaggedCell(), metres(), PLACE_ICON (+74 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (87): movementEvent(), row(), buildRow(), row(), row(), shiftBadge(), visitBadge(), MOVEMENT_TYPE_KEYS (+79 more)

### Community 8 - "Community 8"
Cohesion: 0.04
Nodes (85): getCurrentRole(), can(), canAll(), canAny(), currentDataScope(), allAssetRequests(), getAssetRequest(), pendingFor() (+77 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (80): monthSpan(), activityItems(), claimItems(), claimText(), EVENT, FinanceDashboard(), Icon(), ICONS (+72 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (73): acquireFileUrl(), guardViewer(), live, releaseFileUrl(), revokeAllFileUrls(), useFileUrl(), Avatar(), initialsOf() (+65 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (78): actorWith(), addDepartment(), addItDepartment(), addUser(), adminOnly(), approvedMonthCovering(), approvedMonths(), approvedRunMonths() (+70 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (72): CSV_LIMITS, decodeText(), RFC-4180, parseCsv(), protectCell(), quote(), toCsv(), tooMany() (+64 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (70): ApplyLeave(), balanceRows(), ERROR_ID, FOCUS, Kv(), typeMeta(), CHAIN_STAGES, createChain() (+62 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (73): BalanceCard(), checks(), openAbsencesText(), people(), rowName(), workingDays(), applyPermissions(), runMonth() (+65 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (68): preview(), CAPPED, DOW, Icon(), isOff(), pad(), person(), profileTo() (+60 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (68): balanceNodes(), summaryOfDays(), attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), expenseSpendChart(), headcountChart() (+60 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (70): active(), addAsset(), addDaysIso(), addVendor(), ASSET_FIELDS, assetEvents(), assetsNotReturned(), assignmentHistory() (+62 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (68): recentDays(), Calendar(), applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkInPlan() (+60 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (63): viewOf(), FIELD, FIELDS, PAN_HOLDER, PROFILE_SECTIONS, RULES, SECTIONS, VD (+55 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (62): BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), IT_TAB, MyRequests(), names(), stepsOf() (+54 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (62): DEMO, b64(), b64url(), blank(), changeOwnPassword(), checkToken(), COMMON_PASSWORDS, countFailure() (+54 more)

### Community 22 - "Community 22"
Cohesion: 0.07
Nodes (59): askWhom(), Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel() (+51 more)

### Community 23 - "Community 23"
Cohesion: 0.06
Nodes (56): ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPE_KEYS, CATEGORIES, CATEGORY_KEYS, changeFor(), CONDITION_KEYS, CONDITIONS (+48 more)

### Community 24 - "Community 24"
Cohesion: 0.07
Nodes (54): assetsFor(), clearError(), form, showError(), clearError(), clearReportError(), FIELD, fillReplaces() (+46 more)

### Community 25 - "Community 25"
Cohesion: 0.07
Nodes (55): Receipt(), CATEGORIES, CATEGORY_KEYS, firstStage(), needsReceipt(), nextStage(), STAGES, applied() (+47 more)

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (25): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+17 more)

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (53): sentTo(), storedRecord(), managerOf(), ACCURACY_FLAG_M, ACCURACY_REFUSE_M, active(), ADDRESS_MAX, assignVisit() (+45 more)

### Community 28 - "Community 28"
Cohesion: 0.09
Nodes (51): recordsStart(), correctionContext(), NIGHT_WINDOW_DEFAULT, NIGHT_WINDOW_MAX, nightCheckOutJudge(), nightFixHours(), nightFixWindow(), resetNightFix() (+43 more)

### Community 29 - "Community 29"
Cohesion: 0.07
Nodes (53): allAssets(), assetsHeldByInactive(), assetsWithOpenReports(), assetTotals(), openReportOf(), ACTIONS, actionSelect, assetSelect (+45 more)

### Community 30 - "Community 30"
Cohesion: 0.09
Nodes (45): load(), save(), copy(), createCollection(), add(), commit(), get(), getAll() (+37 more)

### Community 31 - "Community 31"
Cohesion: 0.16
Nodes (51): active(), addWorkComment(), assignablePeople(), assigneeProblem(), can(), cancelWorkTask(), copy(), createPersonalTask() (+43 more)

### Community 32 - "Community 32"
Cohesion: 0.09
Nodes (45): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+37 more)

### Community 33 - "Community 33"
Cohesion: 0.09
Nodes (47): permissionsOf(), adminCount(), availableActions(), can(), createRequest(), EXEC_ACTION, isApprover(), isIT() (+39 more)

### Community 34 - "Community 34"
Cohesion: 0.09
Nodes (48): ActionsCell(), B(), byName(), changesAtOnce(), editBlocked(), formulaText(), monthlyCost(), people() (+40 more)

### Community 35 - "Community 35"
Cohesion: 0.08
Nodes (46): depFields(), ASSET_CATEGORY_KEYS, ASSET_STATE_KEYS, ASSET_STATES, canMove(), DATE_MAX, DATE_MIN, EMAIL (+38 more)

### Community 36 - "Community 36"
Cohesion: 0.10
Nodes (44): flagText(), iconOfPlace(), placeLabel(), deviceLine(), dist(), isHome(), joinsText(), m() (+36 more)

### Community 37 - "Community 37"
Cohesion: 0.07
Nodes (38): ALL_LOCATION_PERMISSIONS, ALL_PERMISSIONS, LOCATION_PERMISSIONS, PERMISSIONS, ADMIN_HELD_BACK, LOCATION_GRANTS, OVERRIDABLE, overridesOf() (+30 more)

### Community 38 - "Community 38"
Cohesion: 0.06
Nodes (44): actionsHead, arrowIcon(), byId(), decidedAt(), matches(), paginationEl, PILL_TAB, pills (+36 more)

### Community 39 - "Community 39"
Cohesion: 0.11
Nodes (43): PAY_RULES, payslipTotals(), setStat(), setStat(), setStat(), amount(), approved(), buildRow() (+35 more)

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (38): Content(), MyVisits(), NONE, STATUS_OPTIONS, Content(), link(), NONE, TeamVisits() (+30 more)

### Community 41 - "Community 41"
Cohesion: 0.10
Nodes (40): Content(), ItDashboard(), percentOf(), RequestTable(), view(), Content(), Content(), Offboarding() (+32 more)

### Community 42 - "Community 42"
Cohesion: 0.10
Nodes (42): actorWith(), allMovements(), ASSET_REFERENCE, assets, assignAsset(), at(), availableTagged(), blankStock() (+34 more)

### Community 43 - "Community 43"
Cohesion: 0.11
Nodes (41): actorWith(), approversFor(), approves(), awayThrough(), byName(), canApprove(), checkSalary(), decideSalaryProposal() (+33 more)

### Community 44 - "Community 44"
Cohesion: 0.08
Nodes (41): addHoliday(), byDate(), dayLabel(), getAllHolidays(), HOLIDAY_KINDS, holidayManager(), holidays, holidaysIn() (+33 more)

### Community 45 - "Community 45"
Cohesion: 0.08
Nodes (36): ASSET_FLOW, EXPENSE_FLOW, IT_FLOW, LEAVE_FLOW, LOCATION_FLOW, OVERTIME_FLOW, PROFILE_FLOW, SALARY_FLOW (+28 more)

### Community 46 - "Community 46"
Cohesion: 0.10
Nodes (33): ConfirmContext, ConfirmDialog(), ConfirmProvider(), useConfirm(), CloseIcon(), DISCARD, focusables(), useDialogFocus() (+25 more)

### Community 47 - "Community 47"
Cohesion: 0.11
Nodes (38): checkInRefusal(), resetCompanyProfile(), resetAllDevices(), ACCURACY_LIMIT_M, active(), answer(), applyChange(), blank() (+30 more)

### Community 48 - "Community 48"
Cohesion: 0.11
Nodes (36): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+28 more)

### Community 49 - "Community 49"
Cohesion: 0.10
Nodes (35): CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), holdersOf(), holdsStage(), isActive(), isHeldFor() (+27 more)

### Community 50 - "Community 50"
Cohesion: 0.13
Nodes (34): active(), admin(), applied(), ASK_FINANCE, CALCS, checkDeclaration(), chooseNewRegime(), copy() (+26 more)

### Community 51 - "Community 51"
Cohesion: 0.09
Nodes (35): BELL_SELECTOR, bellListeners, BellPanel(), Card(), CardHost(), cardOpener(), cardState(), CHAIN_STAGE (+27 more)

### Community 52 - "Community 52"
Cohesion: 0.09
Nodes (34): ATTENDANCE_RULES, clock, errorLine, grace, inBtn, lateMarks, lateNote, modeInputs (+26 more)

### Community 53 - "Community 53"
Cohesion: 0.25
Nodes (35): active(), addComment(), addRequest(), approveRequest(), assigneeOnly(), assignRequest(), audit(), cancelRequest() (+27 more)

### Community 54 - "Community 54"
Cohesion: 0.16
Nodes (34): activeUser(), allAssignmentRows(), allDepartmentDefaults(), allSwaps(), assignMany(), assignmentsFor(), assignRow(), assignShift() (+26 more)

### Community 55 - "Community 55"
Cohesion: 0.08
Nodes (33): attentionCount, attentionList, attentionNote(), dateInput, deptBars, deptDate, deptSelect, emptyRow() (+25 more)

### Community 56 - "Community 56"
Cohesion: 0.11
Nodes (33): actions, cardTitled(), closeIcon(), daysAway(), deactivateDialog(), deleteBtn, departmentName(), emptyCard() (+25 more)

### Community 57 - "Community 57"
Cohesion: 0.15
Nodes (30): NO_DATA, DateRange(), rangeFor(), payloadRows(), AssignButton(), Content(), MyTodo(), NONE (+22 more)

### Community 58 - "Community 58"
Cohesion: 0.11
Nodes (30): OFFICE_STATES, addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry() (+22 more)

### Community 59 - "Community 59"
Cohesion: 0.11
Nodes (25): APP_NAV, APP_OTHER_PAGES, APP_OWN, COMPLETE_ITEM, mayOpenLeavePolicy(), mayOpenOutbox(), mayOpenTeamVisits(), MY_VISITS_ITEM (+17 more)

### Community 60 - "Community 60"
Cohesion: 0.13
Nodes (26): subscribePrefs(), waitingCount(), initialsFrom(), inRail(), RAIL, useMedia(), apply(), listeners (+18 more)

### Community 61 - "Community 61"
Cohesion: 0.11
Nodes (28): longDate(), listItem(), longDate(), balanceCard(), balanceGrid, BAR, fillYears(), holidayList (+20 more)

### Community 62 - "Community 62"
Cohesion: 0.14
Nodes (29): copy(), createShift(), deactivateShift(), entry(), fail(), firstProblem(), GENERAL_ID, getShifts() (+21 more)

### Community 63 - "Community 63"
Cohesion: 0.13
Nodes (25): CORRECTION_FLOW, ASIDE, byId(), decidedAt(), recordedTime(), tabRequests(), TABS, timesCell() (+17 more)

### Community 64 - "Community 64"
Cohesion: 0.18
Nodes (25): parts(), runRows(), showEmployerBox(), slipsFor(), withNewEngine(), approveRunWithSnapshot(), approveSnapshotProblem(), fail() (+17 more)

### Community 65 - "Community 65"
Cohesion: 0.16
Nodes (27): BUTTON_LABEL, CONDITION_OPTIONS, DONE_TEXT, full(), MODE_OPTIONS, optionsOf(), overrideField, PRIMARY (+19 more)

### Community 66 - "Community 66"
Cohesion: 0.20
Nodes (27): checkIn(), isValidTime(), recordOf(), stampFields(), writeCompletedDay(), writeShiftCheckIn(), writeShiftCheckOut(), checkInAt() (+19 more)

### Community 67 - "Community 67"
Cohesion: 0.20
Nodes (27): active(), addDaysIso(), addLicence(), assignSeat(), can(), copy(), expiringRenewals(), fail() (+19 more)

### Community 68 - "Community 68"
Cohesion: 0.25
Nodes (26): compareRegimes(), hraExemption(), money(), oldRegimeDeductions(), payMonth(), taxOn(), tdsFor(), trace() (+18 more)

### Community 69 - "Community 69"
Cohesion: 0.12
Nodes (26): headcountByDepartment(), activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el() (+18 more)

### Community 70 - "Community 70"
Cohesion: 0.11
Nodes (25): registerBox, sample(), SAMPLE_AT(), addDays(), at(), buildImport(), CONDITIONS, copy() (+17 more)

### Community 71 - "Community 71"
Cohesion: 0.19
Nodes (26): qtyHundredths(), active(), addMovement(), addStockItem(), copy(), fail(), getStockItem(), h() (+18 more)

### Community 72 - "Community 72"
Cohesion: 0.15
Nodes (20): ALSO_FOR_MANAGERS, ROUTES, getCurrentUserLabel(), getSession(), isSignedIn(), signIn(), signOut(), canOpenPage() (+12 more)

### Community 73 - "Community 73"
Cohesion: 0.14
Nodes (18): ok, allVendors(), byId(), contactLine(), matches(), renderTable(), row(), tbody (+10 more)

### Community 74 - "Community 74"
Cohesion: 0.12
Nodes (20): allEvents(), AUDIT_KINDS, AUDIT_LABEL, empty(), eventsFor(), read(), createdDay(), employmentPeriod() (+12 more)

### Community 75 - "Community 75"
Cohesion: 0.18
Nodes (20): Content(), errorFileName(), ImportEmployees(), StatusPill(), STEPS, Content(), Details(), ImportHistory() (+12 more)

### Community 76 - "Community 76"
Cohesion: 0.18
Nodes (19): assetWhat(), asOld(), ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), barLook(), EmployeeDashboard() (+11 more)

### Community 77 - "Community 77"
Cohesion: 0.26
Nodes (20): monthLabel(), now(), pct(), SalaryPlan(), slabRows(), slabText(), TaxExplain(), ctcFor() (+12 more)

### Community 78 - "Community 78"
Cohesion: 0.18
Nodes (20): resetCompOff(), example(), copy(), decideOvertime(), decideOvertimeItem(), fail(), mayDecideOvertime(), monthOvertime() (+12 more)

### Community 79 - "Community 79"
Cohesion: 0.22
Nodes (19): copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), headOffice(), manager() (+11 more)

### Community 80 - "Community 80"
Cohesion: 0.20
Nodes (20): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), orDash() (+12 more)

### Community 81 - "Community 81"
Cohesion: 0.23
Nodes (19): slipTotals(), amount(), approved(), financialYear(), ICONS, joinedNote(), label(), MessageRow() (+11 more)

### Community 82 - "Community 82"
Cohesion: 0.21
Nodes (17): itItem(), waitingFor(), accountOf(), fail(), lockedOnly(), mayUnlock(), pendingUnlockRequests(), resolveUnlockRequest() (+9 more)

### Community 83 - "Community 83"
Cohesion: 0.18
Nodes (18): annualTax(), computePay(), FILING_SAMPLE, filingDates(), lastDay(), leap(), lossOfPayAmount(), lossOfPayDays() (+10 more)

### Community 84 - "Community 84"
Cohesion: 0.20
Nodes (18): admin(), compOffRule(), copy(), DEFAULT_COMP_OFF, DEFAULT_LATE_POLICY, DEFAULT_SHIFT_RULES_FROM, entry(), fail() (+10 more)

### Community 85 - "Community 85"
Cohesion: 0.23
Nodes (15): active(), cellOf(), DATE_KEYS, EXPORT_LIMIT, EXPORT_MODULES, exportColumns(), exportFile(), exportScope() (+7 more)

### Community 86 - "Community 86"
Cohesion: 0.15
Nodes (9): clearError(), departmentName(), form, role, save(), SAVED, showError(), STATUS (+1 more)

### Community 87 - "Community 87"
Cohesion: 0.23
Nodes (13): admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail(), isDay(), isMonth() (+5 more)

### Community 88 - "Community 88"
Cohesion: 0.25
Nodes (11): NAV, OTHER_PAGES, buildOption(), closeIcon(), iconButton(), matchingPeople(), renderSearch(), close() (+3 more)

### Community 89 - "Community 89"
Cohesion: 0.31
Nodes (12): getCurrentUser(), initRail(), close(), fit(), open(), inRail(), renderFooter(), renderProfile() (+4 more)

### Community 90 - "Community 90"
Cohesion: 0.27
Nodes (11): ICONS, SECTION_ICONS, matchingPages(), buildItem(), buildTrigger(), currentPagePath(), navItemHref(), navItemVisible() (+3 more)

### Community 92 - "Community 92"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 93 - "Community 93"
Cohesion: 0.33
Nodes (7): isTaskPage(), mayOpenTaskPage(), TASK_ITEMS, TASK_PAGES, directReportsOf(), isManager(), teamScope()

### Community 94 - "Community 94"
Cohesion: 0.33
Nodes (6): departmentName(), initialsFrom(), orDash(), profileOf(), maskAccount(), maskPan()

### Community 95 - "Community 95"
Cohesion: 0.47
Nodes (6): assetFields(), maintFields(), notesOf(), date(), isStockOnlyCategory(), text()

### Community 96 - "Community 96"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 99 - "Community 99"
Cohesion: 0.67
Nodes (3): decider(), approve(), submit()

## Knowledge Gaps
- **2 isolated node(s):** `RFC-4180`, `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 914 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 13` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 24`, `Community 25`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 33`, `Community 34`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 49`, `Community 50`, `Community 52`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 61`, `Community 62`, `Community 63`, `Community 65`, `Community 66`, `Community 67`, `Community 70`, `Community 71`, `Community 72`, `Community 74`, `Community 75`, `Community 76`, `Community 78`, `Community 79`, `Community 80`, `Community 81`, `Community 82`, `Community 84`, `Community 85`, `Community 86`, `Community 87`, `Community 89`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **What connects `RFC-4180`, `RFC-4180` to the rest of the system?**
  _2 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0314028899761065 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 14`, `Community 15`, `Community 16`, `Community 20`, `Community 23`, `Community 24`, `Community 29`, `Community 32`, `Community 34`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 44`, `Community 45`, `Community 46`, `Community 49`, `Community 51`, `Community 55`, `Community 56`, `Community 57`, `Community 61`, `Community 63`, `Community 76`, `Community 77`, `Community 80`, `Community 81`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04355219650448748 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 7` to `Community 0`, `Community 1`, `Community 4`, `Community 6`, `Community 8`, `Community 9`, `Community 13`, `Community 14`, `Community 16`, `Community 20`, `Community 23`, `Community 24`, `Community 25`, `Community 29`, `Community 34`, `Community 37`, `Community 38`, `Community 39`, `Community 44`, `Community 49`, `Community 52`, `Community 55`, `Community 56`, `Community 61`, `Community 63`, `Community 73`, `Community 76`, `Community 80`, `Community 83`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.052129326306793906 - nodes in this community are weakly interconnected._