# Graph Report - officeos  (2026-11-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3602 nodes · 16574 edges · 96 communities (93 shown, 3 thin omitted)
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

## God Nodes (most connected - your core abstractions)
1. `getUser()` - 275 edges
2. `el()` - 258 edges
3. `formatDay()` - 203 edges
4. `useSession()` - 153 edges
5. `nameOf()` - 152 edges
6. `useData()` - 126 edges
7. `pageUrl()` - 124 edges
8. `getAllUsers()` - 107 edges
9. `todayIso()` - 106 edges
10. `useToast()` - 98 edges

## Surprising Connections (you probably didn't know these)
- `CompanyProfile()` --indirect_call--> `updateCompanyProfile()`  [INFERRED]
  app/src/pages/CompanyProfile.jsx → assets/js/data/company-store.js
- `DeptForm()` --indirect_call--> `addDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js
- `DeptForm()` --indirect_call--> `updateDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js
- `DeclarationsReview()` --indirect_call--> `unlockDeclaration()`  [INFERRED]
  app/src/ui/declarations.jsx → assets/js/data/pay-structure.js
- `DeclarationsReview()` --indirect_call--> `verifyDeclaration()`  [INFERRED]
  app/src/ui/declarations.jsx → assets/js/data/pay-structure.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (96 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (108): movementEvent(), stockStatus(), stockValue(), actorWith(), allAssets(), ASSET_REFERENCE, assets, assetsHeldByInactive() (+100 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (68): getVersion(), listeners, subscribe(), tabTitle(), signOutNow(), useVersion(), refreshPrefs(), NotPorted() (+60 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (87): signInAs(), AuthLayout(), BrandPanel(), DEMO_USERS, ForgotPassword(), landingOf(), LinkPage(), Login() (+79 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (80): Badge(), badgeOf(), Icon(), NotBuilt(), Reason(), StatCard(), StatStrip(), Stepper() (+72 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (75): ROLE_KEYS, copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), headOffice() (+67 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (74): useConfirm(), initialsOf(), Kv(), Card(), useData(), ACTION, askWhom(), ChangeForm() (+66 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (72): runRows(), B(), formulaText(), monthlyCost(), SalaryStructure(), signed(), StatusCell(), statusOf() (+64 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (74): MODES, recordsStart(), storedRecord(), stampAfter(), correctionContext(), NIGHT_WINDOW_DEFAULT, NIGHT_WINDOW_MAX, nightCheckOutJudge() (+66 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (75): permissionsOf(), load(), actorWith(), addDepartment(), addUser(), adminOnly(), approvedMonthCovering(), approvedMonths() (+67 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (66): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+58 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (63): described(), Field(), Input(), Person(), Select(), Switch(), TextArea(), Modal() (+55 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (62): balanceRows(), recentDays(), CHAIN_STAGES, skippedEntry(), seedDays(), dayNumber(), dayOffChecker(), isDayOff() (+54 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (58): ASSET_FLOW, CORRECTION_FLOW, EXPENSE_FLOW, LEAVE_FLOW, LOCATION_FLOW, OVERTIME_FLOW, PROFILE_FLOW, SALARY_FLOW (+50 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (57): summaryOfDays(), attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), expenseSpendChart(), headcountChart(), HOURS_DATA (+49 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (56): assetRequestDecisionsBy(), expenseDecisionsBy(), pendingFor(), salaryProposals(), allCorrections, allLeave, asDecidedBy(), assetRow() (+48 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (57): applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkIn(), checkInPlan(), checkInWindow() (+49 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (51): NO_DATA, NoData(), FLAG_EXPORT, FLAG_LABEL, flaggedCell(), flagText(), iconOfPlace(), metres() (+43 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (54): row(), recentRow(), buildRow(), logRow(), ASIDE, byId(), decidedAt(), recordedTime() (+46 more)

### Community 18 - "Community 18"
Cohesion: 0.07
Nodes (50): ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPES, CATEGORIES, CATEGORY_KEYS, changeFor(), CONDITION_KEYS, CONDITIONS (+42 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (50): PersonCell(), approvalItems(), leaveRow(), OutNextWeek(), getAssetRequest(), STAGE_NAME, getRegularization(), getRequest() (+42 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (48): preview(), BAND_NAME, BandBadge(), bandChange(), bandText(), days(), describePolicy(), Explain() (+40 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (45): viewOf(), FIELD, FIELDS, PAN_HOLDER, PROFILE_SECTIONS, RULES, SECTIONS, VD (+37 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (47): managerOf(), ACCURACY_FLAG_M, ACCURACY_REFUSE_M, active(), ADDRESS_MAX, assignVisit(), build(), cancelVisit() (+39 more)

### Community 23 - "Community 23"
Cohesion: 0.12
Nodes (40): EmptyState(), NO_DATA, useDecision(), PageHeader(), countText(), nounOf(), Content(), MyVisits() (+32 more)

### Community 24 - "Community 24"
Cohesion: 0.10
Nodes (45): byName(), salaryRows(), absencesIn(), actorWith(), awayThrough(), checkSalary(), correctableUntil(), decideSalaryProposal() (+37 more)

### Community 25 - "Community 25"
Cohesion: 0.10
Nodes (19): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+11 more)

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (44): allAssetRequests(), allExpenses(), getExpense(), filingDates(), payslipTotals(), renderPresent(), setStat(), asRequest() (+36 more)

### Community 27 - "Community 27"
Cohesion: 0.07
Nodes (46): allItems(), allMovements(), assetsFor(), movementsFor(), newestFirst(), openReportForm(), renderAssets(), clearError() (+38 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (41): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+33 more)

### Community 29 - "Community 29"
Cohesion: 0.07
Nodes (31): CheckInPlaces(), departmentName(), initialsFrom(), Kv(), MyDevices(), onDay(), orDash(), PLACEHOLDER (+23 more)

### Community 30 - "Community 30"
Cohesion: 0.07
Nodes (40): ASSET_TYPE_KEYS, clearError(), form, showError(), removeOne(), chainText(), clearError(), clearReportError() (+32 more)

### Community 31 - "Community 31"
Cohesion: 0.09
Nodes (34): ALL_LOCATION_PERMISSIONS, ALL_PERMISSIONS, LOCATION_PERMISSIONS, LOCATION_GRANTS, OVERRIDABLE, ROLES, SELF_SERVICE, renderRow() (+26 more)

### Community 32 - "Community 32"
Cohesion: 0.08
Nodes (40): DecisionButtons(), chainEvents(), decisionDate(), decidedAt(), LeaveApprovals(), stageBadge(), STATS, TABS (+32 more)

### Community 33 - "Community 33"
Cohesion: 0.10
Nodes (40): claimText(), ActionsCell(), changesAtOnce(), editBlocked(), decidesProposal(), proposalDecidersFor(), renderWhoApproves(), claimText() (+32 more)

### Community 34 - "Community 34"
Cohesion: 0.08
Nodes (38): applyPermissions(), allVendors(), VENDOR_STATUS_KEYS, renderTable(), actionsHead, arrowIcon(), byId(), decidedAt() (+30 more)

### Community 35 - "Community 35"
Cohesion: 0.09
Nodes (39): leaveRow(), activity, activityText(), approvalItem(), approvalsList, approvalsMeta, chart, leaveNote (+31 more)

### Community 36 - "Community 36"
Cohesion: 0.07
Nodes (38): assetWhat(), assetTitle(), assetName(), assetWhat(), ASSET_VERB, assetApprovers(), assetName(), assetOutcome() (+30 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (36): placeLabel(), deviceLine(), dist(), isHome(), joinsText(), longDate(), m(), MarkAttendance() (+28 more)

### Community 38 - "Community 38"
Cohesion: 0.09
Nodes (35): Calendar(), CAPPED, DOW, Icon(), isOff(), pad(), person(), profileTo() (+27 more)

### Community 39 - "Community 39"
Cohesion: 0.13
Nodes (33): createChain(), holds(), managerCanDecide(), refusal(), isActive(), CHAIN, closeAssetRequest(), decideAssetRequest() (+25 more)

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (35): claimsText(), people(), approversFor(), approves(), byName(), canApprove(), runTotals(), renderPayroll() (+27 more)

### Community 41 - "Community 41"
Cohesion: 0.12
Nodes (33): BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), MyRequests(), names(), stepsOf(), TABS (+25 more)

### Community 42 - "Community 42"
Cohesion: 0.12
Nodes (29): ALSO_FOR_MANAGERS, ROUTES, getCurrentUser(), getCurrentUserLabel(), getSession(), isSignedIn(), signIn(), signOut() (+21 more)

### Community 43 - "Community 43"
Cohesion: 0.07
Nodes (34): attentionCount, attentionList, attentionNote(), dateInput, deptBars, deptDate, deptSelect, emptyRow() (+26 more)

### Community 44 - "Community 44"
Cohesion: 0.15
Nodes (32): checkInRefusal(), checkOutRefusal(), active(), allLocationChanges(), answer(), applyChange(), blank(), cancelLocationChange() (+24 more)

### Community 45 - "Community 45"
Cohesion: 0.11
Nodes (32): waitingFor(), ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT, emptyRow(), Icon(), ICONS (+24 more)

### Community 46 - "Community 46"
Cohesion: 0.10
Nodes (32): LEAVE_POLICY, LEAVE_TYPES, listItem(), longDate(), balanceCard(), balanceGrid, BAR, fillYears() (+24 more)

### Community 47 - "Community 47"
Cohesion: 0.10
Nodes (32): cancelAssetRequest(), cancelRegularization(), cancelExpense(), cancelRequest(), render(), allRows(), assetRow(), assetWith() (+24 more)

### Community 48 - "Community 48"
Cohesion: 0.09
Nodes (32): clock, errorLine, grace, inBtn, lateMarks, lateNote, modeInputs, note (+24 more)

### Community 49 - "Community 49"
Cohesion: 0.12
Nodes (31): actions, cardTitled(), closeIcon(), daysAway(), deactivateDialog(), deleteBtn, departmentName(), emptyCard() (+23 more)

### Community 50 - "Community 50"
Cohesion: 0.09
Nodes (31): ATTENDANCE_RULES, calendarCard, cellLook(), clearErrors(), field(), FIELDS, fixableIssue(), form (+23 more)

### Community 51 - "Community 51"
Cohesion: 0.14
Nodes (27): decider(), approve(), submit(), NAV, OTHER_PAGES, getCurrentRole(), getCurrentUserId(), managesAnyone() (+19 more)

### Community 52 - "Community 52"
Cohesion: 0.18
Nodes (30): activeUser(), assignMany(), assignmentsFor(), assignRow(), assignShift(), cancelAssignment(), cancelSwap(), checkAssign() (+22 more)

### Community 53 - "Community 53"
Cohesion: 0.10
Nodes (19): ConfirmContext, ConfirmDialog(), ConfirmProvider(), CloseIcon(), DISCARD, focusables(), useDialogFocus(), cell() (+11 more)

### Community 54 - "Community 54"
Cohesion: 0.12
Nodes (25): waitingCount(), ABOUT, initialsFrom(), inRail(), RAIL, useMedia(), apply(), listeners (+17 more)

### Community 55 - "Community 55"
Cohesion: 0.12
Nodes (29): payableFor(), actionsCell(), claimsText(), EMPTY, entryOf(), lastAt(), matches(), muted() (+21 more)

### Community 56 - "Community 56"
Cohesion: 0.14
Nodes (28): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+20 more)

### Community 57 - "Community 57"
Cohesion: 0.12
Nodes (26): activityItems(), claimItems(), EVENT, FinanceDashboard(), Icon(), ICONS, monthlyRuns(), people() (+18 more)

### Community 58 - "Community 58"
Cohesion: 0.15
Nodes (28): copy(), createShift(), deactivateShift(), entry(), fail(), firstProblem(), hours(), isInt() (+20 more)

### Community 59 - "Community 59"
Cohesion: 0.15
Nodes (25): asOld(), ASSET_VERB, assetApprovers(), assetOutcome(), balanceNodes(), barLook(), EmployeeDashboard(), emptyNote() (+17 more)

### Community 60 - "Community 60"
Cohesion: 0.15
Nodes (24): MY_LOCATIONS, APP_NAV, APP_OTHER_PAGES, APP_OWN, mayOpenLeavePolicy(), mayOpenOutbox(), mayOpenTeamVisits(), MY_VISITS_ITEM (+16 more)

### Community 61 - "Community 61"
Cohesion: 0.15
Nodes (26): copy(), createCollection(), add(), commit(), get(), getAll(), loadBox(), remove() (+18 more)

### Community 62 - "Community 62"
Cohesion: 0.12
Nodes (26): headcountByDepartment(), activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el() (+18 more)

### Community 63 - "Community 63"
Cohesion: 0.14
Nodes (25): allCompOff(), compOffFor(), compOffShield(), copy(), creditOvertime(), plusDays(), resetCompOff(), store (+17 more)

### Community 64 - "Community 64"
Cohesion: 0.13
Nodes (26): isWeekend(), overAllowanceIfWorking(), addBtn, calendarCard, clearError(), dayCell(), defaultMonth(), field() (+18 more)

### Community 65 - "Community 65"
Cohesion: 0.19
Nodes (26): amount(), approved(), buildRow(), field(), financialYear(), joinedNote(), label(), messageRow() (+18 more)

### Community 66 - "Community 66"
Cohesion: 0.16
Nodes (25): Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel(), TABS (+17 more)

### Community 67 - "Community 67"
Cohesion: 0.12
Nodes (25): avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el(), emptyRow(), exportBtn (+17 more)

### Community 68 - "Community 68"
Cohesion: 0.15
Nodes (24): applied(), approverMustPay(), at(), auto(), averageProcessingDays(), blank(), by(), canPay() (+16 more)

### Community 69 - "Community 69"
Cohesion: 0.20
Nodes (23): leaveWhat(), requestName(), BalanceCard(), Balances(), BAR, HEADS, HistoryRow(), MyLeave() (+15 more)

### Community 70 - "Community 70"
Cohesion: 0.22
Nodes (20): approveRunWithSnapshot(), approveSnapshotProblem(), fail(), key(), liveRows(), prepareRunWithSnapshot(), approvedRow(), approvedSnapshot() (+12 more)

### Community 71 - "Community 71"
Cohesion: 0.16
Nodes (19): annualTax(), computePay(), FILING_SAMPLE, lastDay(), leap(), lossOfPayAmount(), lossOfPayDays(), monthlyTds() (+11 more)

### Community 72 - "Community 72"
Cohesion: 0.19
Nodes (15): COMPANY, companyInitial(), PRODUCT, clearError(), DEMO_USERS, escapeHtml(), MAIN, PublicPage() (+7 more)

### Community 73 - "Community 73"
Cohesion: 0.17
Nodes (17): allEvents(), AUDIT_KINDS, AUDIT_LABEL, empty(), eventsFor(), read(), createdOnOf(), officeDayOf() (+9 more)

### Community 74 - "Community 74"
Cohesion: 0.14
Nodes (19): amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD, form (+11 more)

### Community 75 - "Community 75"
Cohesion: 0.22
Nodes (17): parts(), showEmployerBox(), slipsFor(), withNewEngine(), approved(), listed(), missingMonthText(), monthLabel() (+9 more)

### Community 76 - "Community 76"
Cohesion: 0.23
Nodes (15): colorVar(), dashFor(), MARKS, PatternDefs(), SERIES_COUNT, AreaPlot(), axisNumber(), BarPlot() (+7 more)

### Community 77 - "Community 77"
Cohesion: 0.20
Nodes (16): activityNodes(), activityText(), CardTitle(), emptyRow(), flaggedSince(), HrDashboard(), Icon(), ICONS (+8 more)

### Community 78 - "Community 78"
Cohesion: 0.19
Nodes (16): admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail(), isDay(), isMonth() (+8 more)

### Community 79 - "Community 79"
Cohesion: 0.28
Nodes (15): save(), showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme() (+7 more)

### Community 80 - "Community 80"
Cohesion: 0.22
Nodes (16): admin(), copy(), DEFAULT_COMP_OFF, DEFAULT_LATE_POLICY, DEFAULT_SHIFT_RULES_FROM, entry(), fail(), lateOn() (+8 more)

### Community 81 - "Community 81"
Cohesion: 0.25
Nodes (16): closeIcon(), createDecisionFlow(), approve(), buildModal(), clearError(), openReject(), showError(), submitReject() (+8 more)

### Community 82 - "Community 82"
Cohesion: 0.17
Nodes (15): Actions(), BADGE, EMPTY, entryOf(), ICONS, lastAt(), Muted(), names() (+7 more)

### Community 83 - "Community 83"
Cohesion: 0.30
Nodes (11): ColumnChart(), detachedRows(), Row(), Table(), tdClass(), text(), cardColumns(), cellKinds() (+3 more)

### Community 84 - "Community 84"
Cohesion: 0.24
Nodes (8): ok, closeAllDropdowns(), initDropdowns(), triggerOf(), initMenuToggle(), initTableFilters(), initTabs(), renderBell()

### Community 85 - "Community 85"
Cohesion: 0.23
Nodes (11): CATEGORIES, chainFor(), EXPENSE_POLICY, firstStage(), nextStage(), STAGES, BADGE, LATER (+3 more)

### Community 86 - "Community 86"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 87 - "Community 87"
Cohesion: 0.33
Nodes (10): COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS, getCompanyProfile(), loadBox() (+2 more)

### Community 88 - "Community 88"
Cohesion: 0.36
Nodes (10): isManagerNow(), decideExpense(), holdersOf(), holdsStage(), isActive(), isHeldFor(), managerCanDecide(), pendingFor() (+2 more)

### Community 89 - "Community 89"
Cohesion: 0.38
Nodes (5): clampView(), IndiaPlot(), STATE_NAMES, [, , W, H], ZoomButton()

### Community 90 - "Community 90"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 91 - "Community 91"
Cohesion: 0.47
Nodes (5): allMail(), empty(), links, read(), resetMailOutbox()

### Community 92 - "Community 92"
Cohesion: 0.40
Nodes (5): resetCompanyProfile(), resetAllDevices(), resetLocationData(), resetLocations(), resetOffices()

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 766 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 39` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 26`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 52`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 61`, `Community 63`, `Community 64`, `Community 65`, `Community 68`, `Community 69`, `Community 73`, `Community 74`, `Community 75`, `Community 78`, `Community 80`, `Community 82`, `Community 87`, `Community 88`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04144144144144144 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 17` to `Community 0`, `Community 3`, `Community 10`, `Community 11`, `Community 13`, `Community 14`, `Community 16`, `Community 18`, `Community 19`, `Community 26`, `Community 27`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 38`, `Community 40`, `Community 41`, `Community 43`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 55`, `Community 56`, `Community 57`, `Community 59`, `Community 64`, `Community 65`, `Community 69`, `Community 71`, `Community 74`, `Community 77`, `Community 81`, `Community 85`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06802244039270687 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 41` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 6`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 14`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 23`, `Community 26`, `Community 27`, `Community 29`, `Community 30`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 38`, `Community 40`, `Community 43`, `Community 45`, `Community 46`, `Community 47`, `Community 49`, `Community 50`, `Community 53`, `Community 55`, `Community 56`, `Community 57`, `Community 59`, `Community 64`, `Community 65`, `Community 69`, `Community 75`, `Community 77`, `Community 82`, `Community 85`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._