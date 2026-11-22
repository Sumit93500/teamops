# Graph Report - officeos  (2026-11-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 4012 nodes · 18246 edges · 99 communities (95 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 261 edges (avg confidence: 0.85)
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
1. `getUser()` - 306 edges
2. `el()` - 258 edges
3. `formatDay()` - 206 edges
4. `useSession()` - 166 edges
5. `nameOf()` - 157 edges
6. `useData()` - 134 edges
7. `pageUrl()` - 125 edges
8. `getAllUsers()` - 110 edges
9. `todayIso()` - 106 edges
10. `useToast()` - 103 edges

## Surprising Connections (you probably didn't know these)
- `MyLeave()` --indirect_call--> `cancelLeave()`  [INFERRED]
  app/src/pages/MyLeave.jsx → assets/js/data/leave-store.js
- `MyLeave()` --indirect_call--> `byNewest()`  [INFERRED]
  app/src/pages/MyLeave.jsx → assets/js/ui/leave-view.js
- `CompanyProfile()` --indirect_call--> `updateCompanyProfile()`  [INFERRED]
  app/src/pages/CompanyProfile.jsx → assets/js/data/company-store.js
- `DeptForm()` --indirect_call--> `addDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js
- `DeptForm()` --indirect_call--> `updateDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (99 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (137): Badge(), badgeOf(), Icon(), NotBuilt(), PersonCell(), Reason(), StatCard(), StatStrip() (+129 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (102): overridesOf(), permissionsOf(), text(), active(), addComment(), addRequest(), approveRequest(), assigneeOnly() (+94 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (89): EmptyState(), NO_DATA, DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), FilterSelect(), IconButton() (+81 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (92): signInAs(), AuthLayout(), BrandPanel(), DEMO_USERS, ForgotPassword(), landingOf(), LinkPage(), Login() (+84 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (90): inventoryValueChart(), ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPE_KEYS, ASSET_TYPES, CATEGORY_KEYS, CONDITION_KEYS, CONDITIONS (+82 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (90): chainEvents(), assetTitle(), correctionTitle(), decisionDate(), expenseTitle(), leaveTitle(), LOC_TAB, locationTitle() (+82 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (85): row(), recentRow(), buildRow(), fixableIssue(), logRow(), row(), row(), weekCell() (+77 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (78): useCan(), slipsFor(), slipTotals(), alertText(), approverNames(), B(), dayOf(), DONE (+70 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (77): isValidTime(), MODES, recordOf(), storedRecord(), writeCompletedDay(), writeShiftCheckIn(), writeShiftCheckOut(), correctionContext() (+69 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (71): BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), MyRequests(), names(), stepsOf(), TABS (+63 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (74): active(), addAsset(), addDaysIso(), addVendor(), ASSET_FIELDS, assetEvents(), assetFields(), assetsNotReturned() (+66 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (59): initialsOf(), getVersion(), listeners, subscribe(), acquireFileUrl(), guardViewer(), live, releaseFileUrl() (+51 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (66): shiftRecentDays(), seedDays(), joinedOn(), dayNumber(), dayOffChecker(), isoFromDayNumber(), daysWorked(), lossOfPayDaysIn() (+58 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (59): described(), Field(), Input(), Person(), Select(), Switch(), TextArea(), Modal() (+51 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (59): ASSET_FLOW, EXPENSE_FLOW, LEAVE_FLOW, LOCATION_FLOW, OVERTIME_FLOW, PROFILE_FLOW, SALARY_FLOW, timeOf() (+51 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (50): tabTitle(), signOutNow(), useSession(), NotPorted(), About(), Appearance(), ChangePassword(), Password() (+42 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (61): movementEvent(), allAssetRequests(), assetsWithOpenReports(), assetTotals(), closeReport(), openReportOf(), movementEvent(), ACTIONS (+53 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (59): monthlyRuns(), byName(), salaryRows(), monthFor(), fail(), actorWith(), approveProblem(), approversFor() (+51 more)

### Community 18 - "Community 18"
Cohesion: 0.07
Nodes (55): checks(), openAbsencesText(), people(), rowName(), workingDays(), people(), allExpenses(), annualTax() (+47 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (56): assetsFor(), clearReportError(), openReportForm(), showReportError(), submitReport(), actions, cardTitled(), closeIcon() (+48 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (55): deviceLine(), checkInRefusal(), checkOutRefusal(), copy(), deviceLabel(), devicesFor(), deviceToken(), fail() (+47 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (56): recentDays(), statusOf(), skippedEntry(), allRegularizations(), applyCorrection(), attendance, byName(), chain (+48 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (25): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+17 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (51): useConfirm(), Kv(), Card(), useData(), ACTION, ChangeForm(), Content(), day() (+43 more)

### Community 24 - "Community 24"
Cohesion: 0.06
Nodes (52): DecisionButtons(), activityNodes(), CardTitle(), emptyRow(), flaggedSince(), HrDashboard(), Icon(), ICONS (+44 more)

### Community 25 - "Community 25"
Cohesion: 0.08
Nodes (49): Segmented(), FLAG_EXPORT, FLAG_LABEL, flagText(), iconOfPlace(), metres(), PLACE_ICON, PLACE_LABEL (+41 more)

### Community 26 - "Community 26"
Cohesion: 0.08
Nodes (49): getExpense(), ascii(), checkFile(), cleanName(), EXT_TYPE, extensionOf(), fail(), hiddenContent() (+41 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (49): askWhom(), initialsFrom(), orDash(), profileOf(), viewOf(), FIELD, FIELDS, PAN_HOLDER (+41 more)

### Community 28 - "Community 28"
Cohesion: 0.09
Nodes (44): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+36 more)

### Community 29 - "Community 29"
Cohesion: 0.07
Nodes (43): adminOnly(), approvedRunMonths(), approvedRuns(), approvesRun(), carriesAdmin(), decidesStage(), deletedName(), deleteProblem() (+35 more)

### Community 30 - "Community 30"
Cohesion: 0.10
Nodes (42): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+34 more)

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (38): decider(), approve(), submit(), changesAtOnce(), editBlocked(), isManagerNow(), NAV, OTHER_PAGES (+30 more)

### Community 32 - "Community 32"
Cohesion: 0.08
Nodes (40): applyPermissions(), allVendors(), renderTable(), renderList(), renderAssets(), renderLog(), actionsHead, arrowIcon() (+32 more)

### Community 33 - "Community 33"
Cohesion: 0.10
Nodes (42): changeFor(), stockStatus(), stockValue(), actorWith(), allMovements(), ASSET_REFERENCE, assets, assetsHeldByInactive() (+34 more)

### Community 34 - "Community 34"
Cohesion: 0.09
Nodes (40): allCompOff(), compOffFor(), copy(), creditOvertime(), plusDays(), resetCompOff(), store, allOvertimeDecisions() (+32 more)

### Community 35 - "Community 35"
Cohesion: 0.12
Nodes (39): asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys(), PASSED, render(), renderExample() (+31 more)

### Community 36 - "Community 36"
Cohesion: 0.11
Nodes (37): claimText(), allRows, buildRow(), byName(), changeButtons(), changesAtOnce(), closeIcon(), currentRows() (+29 more)

### Community 37 - "Community 37"
Cohesion: 0.09
Nodes (38): Calendar(), CAPPED, DOW, Icon(), isOff(), pad(), person(), profileTo() (+30 more)

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (39): MAX_QTY, qtyHundredths(), REASON_MAX, REASON_MIN, REVERSE_KIND, STOCK_KINDS, CATEGORIES, active() (+31 more)

### Community 39 - "Community 39"
Cohesion: 0.12
Nodes (36): active(), admin(), applied(), ASK_FINANCE, CALCS, checkDeclaration(), chooseNewRegime(), copy() (+28 more)

### Community 40 - "Community 40"
Cohesion: 0.10
Nodes (36): ASSET_CATEGORIES, ASSET_CATEGORY_KEYS, ASSET_STATE_KEYS, ASSET_STATES, canMove(), DATE_MAX, DATE_MIN, EMAIL (+28 more)

### Community 41 - "Community 41"
Cohesion: 0.09
Nodes (37): addHoliday(), dayLabel(), HOLIDAY_KINDS, holidayManager(), holidays, isDayOff(), isValidDate(), MONTH_NAMES (+29 more)

### Community 42 - "Community 42"
Cohesion: 0.13
Nodes (37): previewRoute(), firstStage(), nextStage(), applied(), approverMustPay(), at(), auto(), blank() (+29 more)

### Community 43 - "Community 43"
Cohesion: 0.12
Nodes (30): ROLES, ALSO_FOR_MANAGERS, ROUTES, getCurrentUser(), getCurrentUserLabel(), getSession(), isSignedIn(), signIn() (+22 more)

### Community 44 - "Community 44"
Cohesion: 0.08
Nodes (36): ATTENDANCE_RULES, clock, errorLine, grace, inBtn, lateMarks, lateNote, longDate() (+28 more)

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (36): managerOf(), ACCURACY_FLAG_M, ACCURACY_REFUSE_M, active(), assignVisit(), build(), cancelVisit(), completeVisitDay() (+28 more)

### Community 46 - "Community 46"
Cohesion: 0.09
Nodes (35): setStat(), approvalItem(), actionsHead, decidedAt(), matches(), outCard, overlapAlert, paginationEl (+27 more)

### Community 47 - "Community 47"
Cohesion: 0.15
Nodes (35): activeUser(), allAssignmentRows(), allDepartmentDefaults(), allSwaps(), assignMany(), assignmentReader(), assignmentsFor(), assignRow() (+27 more)

### Community 48 - "Community 48"
Cohesion: 0.09
Nodes (35): calendarCard, cancelRequest(), cellLook(), clearErrors(), field(), FIELDS, fillMonths(), fixableIssue() (+27 more)

### Community 49 - "Community 49"
Cohesion: 0.11
Nodes (34): needsReceipt(), averageProcessingDays(), payableFor(), actionsCell(), categoryCell(), claimsText(), decidableIds(), EMPTY (+26 more)

### Community 50 - "Community 50"
Cohesion: 0.12
Nodes (33): Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel(), TABS (+25 more)

### Community 51 - "Community 51"
Cohesion: 0.10
Nodes (32): compOffShield(), isAppCreated(), account(), admin(), anniversaryOf(), applyLeaveUnderPolicy(), BAND_LABEL, closeLeaveYear() (+24 more)

### Community 52 - "Community 52"
Cohesion: 0.07
Nodes (33): needsReorder(), reorderAlerts(), activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, chart (+25 more)

### Community 53 - "Community 53"
Cohesion: 0.10
Nodes (31): OFFICE_STATES, addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry() (+23 more)

### Community 54 - "Community 54"
Cohesion: 0.11
Nodes (24): COMPANY, companyInitial(), PRODUCT, clearError(), DEMO_USERS, escapeHtml(), MAIN, PublicPage() (+16 more)

### Community 55 - "Community 55"
Cohesion: 0.12
Nodes (27): parts(), showEmployerBox(), withNewEngine(), APP_NAV, APP_OTHER_PAGES, APP_OWN, mayOpenLeavePolicy(), mayOpenOutbox() (+19 more)

### Community 56 - "Community 56"
Cohesion: 0.15
Nodes (30): ApplyLeave(), balanceRows(), ERROR_ID, FOCUS, Kv(), typeMeta(), cell(), Content() (+22 more)

### Community 57 - "Community 57"
Cohesion: 0.12
Nodes (32): runMonth(), runTotals(), renderChart(), renderPayroll(), alertText(), approverNames(), askedMonth, attendanceCheck() (+24 more)

### Community 58 - "Community 58"
Cohesion: 0.11
Nodes (26): OVERRIDABLE, buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form (+18 more)

### Community 59 - "Community 59"
Cohesion: 0.08
Nodes (31): ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceCard, barLook(), chart, hoursNote (+23 more)

### Community 60 - "Community 60"
Cohesion: 0.12
Nodes (29): getRegularization(), STAGE_NAME, bellItem(), buildCard(), buildPanel(), cardLink(), cardOpener(), cardState() (+21 more)

### Community 61 - "Community 61"
Cohesion: 0.18
Nodes (29): date(), active(), addDaysIso(), addLicence(), assignSeat(), can(), copy(), expiringRenewals() (+21 more)

### Community 62 - "Community 62"
Cohesion: 0.17
Nodes (30): actorWith(), addDepartment(), addItDepartment(), addUser(), byNonAdmin(), changeUser(), commit(), copy() (+22 more)

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (28): copy(), createShift(), deactivateShift(), entry(), fail(), firstProblem(), GENERAL_ID, hours() (+20 more)

### Community 64 - "Community 64"
Cohesion: 0.13
Nodes (25): activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el(), ensureOption() (+17 more)

### Community 65 - "Community 65"
Cohesion: 0.16
Nodes (25): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+17 more)

### Community 66 - "Community 66"
Cohesion: 0.13
Nodes (26): avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el(), emptyRow(), exportBtn (+18 more)

### Community 67 - "Community 67"
Cohesion: 0.14
Nodes (25): leaveWhat(), activityText(), cancelRequest(), leaveWhat(), requestName(), activityText(), balanceCard(), balanceGrid (+17 more)

### Community 68 - "Community 68"
Cohesion: 0.11
Nodes (25): chainText(), clearError(), FIELD, fillReplaces(), form, ICON, icon(), isOpen() (+17 more)

### Community 69 - "Community 69"
Cohesion: 0.15
Nodes (23): assetWhat(), asOld(), ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceNodes(), barLook() (+15 more)

### Community 70 - "Community 70"
Cohesion: 0.19
Nodes (21): load(), save(), copy(), createCollection(), add(), commit(), get(), getAll() (+13 more)

### Community 71 - "Community 71"
Cohesion: 0.18
Nodes (21): CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), holdersOf(), holdsStage(), isActive(), isHeldFor() (+13 more)

### Community 72 - "Community 72"
Cohesion: 0.20
Nodes (22): nowMinutes(), summaryOfDays(), attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), expenseSpendChart(), headcountChart() (+14 more)

### Community 73 - "Community 73"
Cohesion: 0.18
Nodes (16): waitingCount(), waitingFor(), initialsFrom(), inRail(), RAIL, useMedia(), setWide(), closeCards() (+8 more)

### Community 74 - "Community 74"
Cohesion: 0.13
Nodes (20): CATEGORY_KEYS, amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD (+12 more)

### Community 75 - "Community 75"
Cohesion: 0.22
Nodes (19): copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), headOffice(), manager() (+11 more)

### Community 76 - "Community 76"
Cohesion: 0.24
Nodes (19): runRows(), compareRegimes(), ctcFor(), hraExemption(), money(), oldRegimeDeductions(), payFor(), payMonth() (+11 more)

### Community 77 - "Community 77"
Cohesion: 0.17
Nodes (16): ConfirmContext, ConfirmDialog(), ConfirmProvider(), CloseIcon(), DISCARD, focusables(), useDialogFocus(), defaultMonth() (+8 more)

### Community 78 - "Community 78"
Cohesion: 0.16
Nodes (17): CATEGORIES, chainFor(), EXPENSE_POLICY, STAGES, renderWhoApproves(), renderPolicy(), BADGE, chainText() (+9 more)

### Community 79 - "Community 79"
Cohesion: 0.16
Nodes (15): allEvents(), AUDIT_KINDS, AUDIT_LABEL, empty(), eventsFor(), read(), EMPLOYMENT_SAMPLE, EMPLOYMENT_TYPES (+7 more)

### Community 80 - "Community 80"
Cohesion: 0.29
Nodes (15): approveRunWithSnapshot(), approveSnapshotProblem(), fail(), key(), liveRows(), payForFinal(), prepareRunWithSnapshot(), approvedRow() (+7 more)

### Community 81 - "Community 81"
Cohesion: 0.21
Nodes (15): admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail(), isDay(), isMonth() (+7 more)

### Community 82 - "Community 82"
Cohesion: 0.15
Nodes (9): clearError(), departmentName(), form, role, save(), SAVED, showError(), STATUS (+1 more)

### Community 83 - "Community 83"
Cohesion: 0.29
Nodes (14): showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme(), onAppearanceChange() (+6 more)

### Community 84 - "Community 84"
Cohesion: 0.24
Nodes (15): cellText(), COLUMNS, csvCell(), csvText(), downloadCsv(), exportStatsAsCsv(), exportTableAsCsv(), isDataColumn() (+7 more)

### Community 85 - "Community 85"
Cohesion: 0.47
Nodes (14): ruleOn(), esiFor(), gratuityAccrualFor(), isIntern(), labourWelfareFor(), money(), monthOf(), pfFor() (+6 more)

### Community 86 - "Community 86"
Cohesion: 0.21
Nodes (10): ALL_LOCATION_PERMISSIONS, ALL_PERMISSIONS, LOCATION_PERMISSIONS, PERMISSIONS, ADMIN_HELD_BACK, LOCATION_GRANTS, ROLE_KEYS, SELF_SERVICE (+2 more)

### Community 88 - "Community 88"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 89 - "Community 89"
Cohesion: 0.31
Nodes (10): subscribePrefs(), apply(), listeners, NAV_KEY, read(), storedChoice(), subscribe(), useNavWide() (+2 more)

### Community 90 - "Community 90"
Cohesion: 0.33
Nodes (10): COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS, getCompanyProfile(), loadBox() (+2 more)

### Community 91 - "Community 91"
Cohesion: 0.36
Nodes (11): approvedMonthCovering(), approvedMonths(), joiningDate(), joiningProblem(), leavingPeriods(), leavingProblem(), localToday(), monthEnd() (+3 more)

### Community 92 - "Community 92"
Cohesion: 0.24
Nodes (8): clearError(), form, showError(), clearError(), form, showError(), ensureContainer(), initToasts()

### Community 93 - "Community 93"
Cohesion: 0.27
Nodes (8): CORRECTION_FLOW, ASIDE, byId(), decidedAt(), recordedTime(), tabRequests(), TABS, timesCell()

### Community 94 - "Community 94"
Cohesion: 0.39
Nodes (6): CHAIN_STAGES, createChain(), holds(), managerCanDecide(), refusal(), isActive()

### Community 95 - "Community 95"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 823 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 42` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 41`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 51`, `Community 52`, `Community 53`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 61`, `Community 62`, `Community 63`, `Community 65`, `Community 67`, `Community 68`, `Community 69`, `Community 71`, `Community 72`, `Community 73`, `Community 74`, `Community 75`, `Community 77`, `Community 79`, `Community 81`, `Community 82`, `Community 90`, `Community 93`, `Community 94`?**
  _High betweenness centrality (0.155) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04186795491143317 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 13` to `Community 0`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 9`, `Community 14`, `Community 15`, `Community 16`, `Community 18`, `Community 19`, `Community 23`, `Community 24`, `Community 25`, `Community 28`, `Community 32`, `Community 35`, `Community 36`, `Community 37`, `Community 41`, `Community 46`, `Community 48`, `Community 49`, `Community 52`, `Community 56`, `Community 57`, `Community 59`, `Community 60`, `Community 65`, `Community 67`, `Community 68`, `Community 69`, `Community 77`, `Community 78`, `Community 93`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07583108715184186 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 6` to `Community 0`, `Community 4`, `Community 5`, `Community 9`, `Community 12`, `Community 13`, `Community 14`, `Community 16`, `Community 18`, `Community 19`, `Community 24`, `Community 25`, `Community 31`, `Community 32`, `Community 35`, `Community 36`, `Community 37`, `Community 41`, `Community 44`, `Community 46`, `Community 48`, `Community 49`, `Community 52`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 65`, `Community 67`, `Community 68`, `Community 69`, `Community 74`, `Community 78`, `Community 93`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._