# Graph Report - officeos  (2026-11-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3865 nodes · 17570 edges · 96 communities (93 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 255 edges (avg confidence: 0.85)
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
1. `getUser()` - 287 edges
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
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/MyRequests.jsx → assets/js/ui/leave-view.js
- `assetApprovers()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/EmployeeDashboard.jsx → assets/js/ui/leave-view.js
- `visitDates()` --calls--> `formatDay()`  [EXTRACTED]
  app/src/components/Decision.jsx → assets/js/ui/leave-view.js
- `submit()` --indirect_call--> `note()`  [INFERRED]
  app/src/components/Decision.jsx → assets/js/data/visits.js
- `monthYear()` --calls--> `monthName()`  [EXTRACTED]
  app/src/ui/leaveband.jsx → assets/js/ui/leave-view.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (96 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (118): monthSpan(), ACTIVITY_SOURCES, activityItems(), APPROVAL_TEXT, approvalItems(), emptyRow(), Icon(), ICONS (+110 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (114): assetWhat(), allAssetRequests(), fulfilAssetRequest(), submitAssetRequest(), typeWord(), fail(), changeFor(), stockStatus() (+106 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (88): StatCard(), StatStrip(), BarRows(), ColumnChart(), NO_DATA, NoData(), detachedRows(), Row() (+80 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (93): initialsOf(), Kv(), Card(), useData(), ACTION, askWhom(), ChangeForm(), Content() (+85 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (86): EmptyState(), Icon(), NO_DATA, described(), Field(), Input(), Select(), Switch() (+78 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (77): NotBuilt(), Stepper(), getVersion(), listeners, subscribe(), signInAs(), useSession(), useVersion() (+69 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (89): movementEvent(), inventoryValueChart(), ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPE_KEYS, CATEGORIES, CATEGORY_KEYS, CONDITION_KEYS (+81 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (73): Tabs(), DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), FilterSelect(), IconButton(), PRESETS (+65 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (77): chainEvents(), sentOn(), decisionDate(), activityNodes(), assetRequestDecisionsBy(), expenseDecisionsBy(), chainEvents(), allCorrections (+69 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (75): badgeOf(), Actions(), BADGE, claimsText(), EMPTY, entryOf(), Expenses(), ICONS (+67 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (67): acquireFileUrl(), guardViewer(), live, releaseFileUrl(), revokeAllFileUrls(), useFileUrl(), ACCEPT, Attachment() (+59 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (70): BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), MyRequests(), names(), stepsOf(), TABS (+62 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (68): allRegularizations(), salaryProposals(), asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys(), PASSED (+60 more)

### Community 13 - "Community 13"
Cohesion: 0.06
Nodes (69): balanceRows(), recentDays(), fixableIssue(), CHAIN_STAGES, skippedEntry(), seedDays(), dayNumber(), dayOffChecker() (+61 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (66): asOld(), ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceNodes(), barLook(), EmployeeDashboard() (+58 more)

### Community 15 - "Community 15"
Cohesion: 0.05
Nodes (68): row(), timesCell(), applyPermissions(), renderTable(), approvalItem(), renderTable(), row(), actionsHead (+60 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (65): heldText(), allItems(), assetsFor(), clearError(), form, showError(), chainText(), clearError() (+57 more)

### Community 17 - "Community 17"
Cohesion: 0.05
Nodes (64): ASSET_FLOW, CORRECTION_FLOW, DecisionButtons(), EXPENSE_FLOW, LEAVE_FLOW, LOCATION_FLOW, OVERTIME_FLOW, PROFILE_FLOW (+56 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (59): recordedTime(), applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkIn(), checkInPlan() (+51 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (55): recordsStart(), correctionContext(), NIGHT_WINDOW_DEFAULT, NIGHT_WINDOW_MAX, nightCheckOutJudge(), nightFixHours(), nightFixWindow(), setNightFixHours() (+47 more)

### Community 20 - "Community 20"
Cohesion: 0.07
Nodes (44): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+36 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (25): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+17 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (52): DEMO, b64(), b64url(), blank(), changeOwnPassword(), checkToken(), COMMON_PASSWORDS, countFailure() (+44 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (50): defaultMonth(), DOW, EMPTY, FIELD_ID, Holidays(), holidaysOf(), Icon(), overWarning() (+42 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (49): claimText(), approvalsCard, claimsText(), claimText(), EVENT, people(), renderDepartments(), renderReimbursements() (+41 more)

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (50): deviceLine(), checkInRefusal(), checkOutRefusal(), copy(), deviceLabel(), devicesFor(), deviceToken(), fail() (+42 more)

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (45): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+37 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (49): directReportsOf(), managerOf(), ACCURACY_FLAG_M, ACCURACY_REFUSE_M, active(), ADDRESS_MAX, assignVisit(), build() (+41 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (45): viewOf(), FIELD, FIELDS, PAN_HOLDER, PROFILE_SECTIONS, RULES, SECTIONS, VD (+37 more)

### Community 29 - "Community 29"
Cohesion: 0.11
Nodes (42): active(), DeclarationsReview(), MyDeclaration(), now(), STATUS, StatusPill(), holdsPayRulePermission(), active() (+34 more)

### Community 30 - "Community 30"
Cohesion: 0.09
Nodes (42): preview(), BAND_NAME, BandBadge(), bandChange(), days(), describePolicy(), Explain(), monthYear() (+34 more)

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (36): decider(), approve(), submit(), ALSO_FOR_MANAGERS, ROUTES, getCurrentRole(), getCurrentUser(), getCurrentUserId() (+28 more)

### Community 32 - "Community 32"
Cohesion: 0.07
Nodes (40): adminOnly(), approvesRun(), byNonAdmin(), carriesAdmin(), decidesStage(), deletedName(), deleteProblem(), DEMO_PII (+32 more)

### Community 33 - "Community 33"
Cohesion: 0.11
Nodes (37): DEDUCTIONS, ICONS, people(), returnToFile(), SLABS, TaxDeductions(), taxRegimeChart(), valuesOf() (+29 more)

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (38): Reason(), ActionsCell(), B(), byName(), changesAtOnce(), editBlocked(), formulaText(), monthlyCost() (+30 more)

### Community 35 - "Community 35"
Cohesion: 0.14
Nodes (39): active(), addDaysIso(), ASSET_FIELDS, assetEvents(), assetsNotReturned(), assignmentHistory(), assignmentsOf(), BASE (+31 more)

### Community 36 - "Community 36"
Cohesion: 0.13
Nodes (37): MAX_QTY, qtyHundredths(), REASON_MAX, REASON_MIN, REVERSE_KIND, STOCK_KINDS, active(), addMovement() (+29 more)

### Community 37 - "Community 37"
Cohesion: 0.14
Nodes (34): absencesIn(), approveProblem(), approveRun(), awayThrough(), byName(), correctableUntil(), figures(), MONTH_NAMES (+26 more)

### Community 38 - "Community 38"
Cohesion: 0.10
Nodes (34): remove(), resetAssetRegister(), allCompOff(), compOffFor(), compOffShield(), copy(), creditOvertime(), plusDays() (+26 more)

### Community 39 - "Community 39"
Cohesion: 0.10
Nodes (34): renderHeadcount(), renderBalanceCard(), actions, cardTitled(), daysAway(), deleteBtn, departmentName(), emptyCard() (+26 more)

### Community 40 - "Community 40"
Cohesion: 0.07
Nodes (34): attentionCount, attentionList, attentionNote(), dateInput, deptBars, deptDate, deptSelect, emptyRow() (+26 more)

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (34): allExpenses(), expenseTotals(), actionsCell(), categoryCell(), claimsText(), decidableIds(), EMPTY, entryOf() (+26 more)

### Community 42 - "Community 42"
Cohesion: 0.09
Nodes (34): clock, errorLine, grace, inBtn, lateMarks, lateNote, modeInputs, note (+26 more)

### Community 43 - "Community 43"
Cohesion: 0.11
Nodes (33): leaveWhat(), requestName(), activityText(), BalanceCard(), Balances(), HistoryRow(), MyLeave(), cancelRequest() (+25 more)

### Community 44 - "Community 44"
Cohesion: 0.16
Nodes (33): activeUser(), allAssignmentRows(), allDepartmentDefaults(), allSwaps(), assignMany(), assignmentsFor(), assignRow(), assignShift() (+25 more)

### Community 45 - "Community 45"
Cohesion: 0.10
Nodes (33): calendarCard, cellLook(), clearErrors(), field(), FIELDS, fillMonths(), fixableIssue(), form (+25 more)

### Community 46 - "Community 46"
Cohesion: 0.14
Nodes (30): Badge(), PersonCell(), decidedAt(), LeaveApprovals(), stageBadge(), STATS, TABS, Calendar() (+22 more)

### Community 47 - "Community 47"
Cohesion: 0.13
Nodes (31): alertText(), approverNames(), B(), checks(), dayOf(), DONE, monthLabel(), Months() (+23 more)

### Community 48 - "Community 48"
Cohesion: 0.12
Nodes (28): addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry(), fail() (+20 more)

### Community 49 - "Community 49"
Cohesion: 0.12
Nodes (25): buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form, managerChoice() (+17 more)

### Community 50 - "Community 50"
Cohesion: 0.13
Nodes (28): Person(), Content(), Departments(), plural(), Stat(), Content(), departmentName(), plural() (+20 more)

### Community 51 - "Community 51"
Cohesion: 0.15
Nodes (28): copy(), createShift(), deactivateShift(), entry(), fail(), firstProblem(), GENERAL_ID, hours() (+20 more)

### Community 52 - "Community 52"
Cohesion: 0.11
Nodes (27): resetAttendanceData(), resetDemoData(), avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el() (+19 more)

### Community 53 - "Community 53"
Cohesion: 0.25
Nodes (26): compareRegimes(), hraExemption(), money(), oldRegimeDeductions(), payMonth(), taxOn(), tdsFor(), trace() (+18 more)

### Community 54 - "Community 54"
Cohesion: 0.10
Nodes (27): activity, approvalsList, approvalsMeta, chart, leaveNote, leaveRange, leaveRows, leaveRowsMeta (+19 more)

### Community 55 - "Community 55"
Cohesion: 0.17
Nodes (23): COMPANY, companyInitial(), PRODUCT, waitingCount(), CompanyMark(), initialsFrom(), inRail(), RAIL (+15 more)

### Community 56 - "Community 56"
Cohesion: 0.13
Nodes (19): clearError(), DEMO_USERS, escapeHtml(), MAIN, PublicPage(), RAW, showError(), styleObject() (+11 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (23): load(), save(), allEvents(), AUDIT_KINDS, AUDIT_LABEL, empty(), eventsFor(), read() (+15 more)

### Community 58 - "Community 58"
Cohesion: 0.24
Nodes (27): addAsset(), addVendor(), assetFields(), closeMaintenance(), copy(), defaultsIn(), deleteVendor(), disposeAsset() (+19 more)

### Community 59 - "Community 59"
Cohesion: 0.11
Nodes (25): getAssetRequest(), getRegularization(), getRequest(), buildCard(), buildPanel(), cardState(), CHAIN_STAGE, closeApprovalCard() (+17 more)

### Community 60 - "Community 60"
Cohesion: 0.16
Nodes (24): copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), headOffice(), manager() (+16 more)

### Community 61 - "Community 61"
Cohesion: 0.16
Nodes (25): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+17 more)

### Community 62 - "Community 62"
Cohesion: 0.08
Nodes (24): sample(), SAMPLE_AT(), event(), ASSET_CATEGORIES, ASSET_CATEGORY_KEYS, ASSET_STATE_KEYS, ASSET_STATES, canMove() (+16 more)

### Community 63 - "Community 63"
Cohesion: 0.16
Nodes (25): alertText(), askedMonth, attendanceCheck(), buildRow(), checkItem(), dayOf(), monthLabel(), openAbsencesText() (+17 more)

### Community 64 - "Community 64"
Cohesion: 0.18
Nodes (23): parts(), runRows(), slipsFor(), slipTotals(), withNewEngine(), amount(), approved(), financialYear() (+15 more)

### Community 65 - "Community 65"
Cohesion: 0.16
Nodes (22): showEmployerBox(), approved(), listed(), missingMonthText(), monthLabel(), notesOf(), openAbsence(), orDash() (+14 more)

### Community 66 - "Community 66"
Cohesion: 0.21
Nodes (25): actorWith(), addDepartment(), addUser(), changeUser(), commit(), copy(), deactivateUser(), deleteUser() (+17 more)

### Community 67 - "Community 67"
Cohesion: 0.16
Nodes (21): APP_NAV, APP_OTHER_PAGES, APP_OWN, mayOpenLeavePolicy(), mayOpenOutbox(), mayOpenRates(), mayOpenTeamVisits(), MY_VISITS_ITEM (+13 more)

### Community 68 - "Community 68"
Cohesion: 0.22
Nodes (22): monthLabel(), now(), pct(), SalaryPlan(), slabRows(), slabText(), TaxExplain(), EMPLOYMENT_SAMPLE (+14 more)

### Community 69 - "Community 69"
Cohesion: 0.19
Nodes (18): waitingFor(), isManagerNow(), pendingFor(), managesAnyone(), pendingFor(), pendingOvertime(), isManager(), ICONS (+10 more)

### Community 70 - "Community 70"
Cohesion: 0.17
Nodes (19): NAV, OTHER_PAGES, canOpenPage(), depthInPages(), resolvePageLink(), resolveRootLink(), rootPrefix(), buildOption() (+11 more)

### Community 71 - "Community 71"
Cohesion: 0.22
Nodes (22): depFields(), money(), percent(), anniversary(), dayNo(), depreciation(), disposalFigures(), engine() (+14 more)

### Community 72 - "Community 72"
Cohesion: 0.19
Nodes (22): createdDay(), employmentPeriod(), employmentState(), isAppCreated(), isEmployedOn(), joinedOn(), joinsOn(), SEEDED (+14 more)

### Community 73 - "Community 73"
Cohesion: 0.22
Nodes (20): summaryOfDays(), attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), expenseSpendChart(), headcountChart(), HOURS_DATA (+12 more)

### Community 74 - "Community 74"
Cohesion: 0.13
Nodes (21): balanceTable, calendarCard, CAPPED, dayCell(), inView(), isOff(), month, outCard (+13 more)

### Community 75 - "Community 75"
Cohesion: 0.26
Nodes (20): shiftRecentDays(), MODES, storedRecord(), shiftDayFor(), completeShiftDay(), fail(), inPlan(), nextCheckIn() (+12 more)

### Community 76 - "Community 76"
Cohesion: 0.18
Nodes (17): CHAIN, closeAssetRequest(), decideAssetRequest(), holdersOf(), holdsStage(), isActive(), isHeldFor(), managerCanDecide() (+9 more)

### Community 77 - "Community 77"
Cohesion: 0.17
Nodes (18): policyLossOfPay(), policyLossOfPayFrom(), admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail() (+10 more)

### Community 78 - "Community 78"
Cohesion: 0.18
Nodes (15): ConfirmContext, ConfirmDialog(), ConfirmProvider(), useConfirm(), useDecision(), CloseIcon(), DISCARD, focusables() (+7 more)

### Community 79 - "Community 79"
Cohesion: 0.25
Nodes (17): dist(), isHome(), joinsText(), m(), MarkAttendance(), ordinal(), pad(), placeLine() (+9 more)

### Community 80 - "Community 80"
Cohesion: 0.20
Nodes (17): admin(), compOffRule(), copy(), DEFAULT_COMP_OFF, DEFAULT_LATE_POLICY, DEFAULT_SHIFT_RULES_FROM, entry(), fail() (+9 more)

### Community 81 - "Community 81"
Cohesion: 0.24
Nodes (16): cellText(), COLUMNS, csvCell(), csvText(), downloadCsv(), exportStatsAsCsv(), exportTableAsCsv(), initExports() (+8 more)

### Community 82 - "Community 82"
Cohesion: 0.33
Nodes (14): approveRunWithSnapshot(), approveSnapshotProblem(), fail(), key(), liveRows(), prepareRunWithSnapshot(), usesNewRules(), approvedRow() (+6 more)

### Community 83 - "Community 83"
Cohesion: 0.15
Nodes (9): clearError(), departmentName(), form, role, save(), SAVED, showError(), STATUS (+1 more)

### Community 84 - "Community 84"
Cohesion: 0.29
Nodes (14): showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme(), onAppearanceChange() (+6 more)

### Community 85 - "Community 85"
Cohesion: 0.28
Nodes (13): fail(), lockedOnly(), mayUnlock(), pendingUnlockRequests(), resolveUnlockRequest(), stillLocked(), unlockRequestItem(), allUnlockRequests() (+5 more)

### Community 86 - "Community 86"
Cohesion: 0.25
Nodes (12): allVendors(), VENDOR_STATUS_KEYS, byId(), contactLine(), matches(), renderTable(), row(), tbody (+4 more)

### Community 87 - "Community 87"
Cohesion: 0.30
Nodes (11): createChain(), holds(), managerCanDecide(), refusal(), isActive(), previewRoute(), submitExpense(), managerFor() (+3 more)

### Community 88 - "Community 88"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 89 - "Community 89"
Cohesion: 0.33
Nodes (10): COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS, getCompanyProfile(), loadBox() (+2 more)

### Community 90 - "Community 90"
Cohesion: 0.22
Nodes (8): ALL_LOCATION_PERMISSIONS, LOCATION_PERMISSIONS, PERMISSIONS, ADMIN_HELD_BACK, LOCATION_GRANTS, OVERRIDABLE, ROLE_KEYS, SELF_SERVICE

### Community 91 - "Community 91"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 92 - "Community 92"
Cohesion: 0.70
Nodes (4): createdOnOf(), officeDayOf(), read(), recordCreated()

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 805 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 87` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 51`, `Community 54`, `Community 58`, `Community 60`, `Community 61`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 68`, `Community 69`, `Community 72`, `Community 73`, `Community 74`, `Community 75`, `Community 76`, `Community 77`, `Community 78`, `Community 79`, `Community 80`, `Community 83`, `Community 85`, `Community 89`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.040383846461415435 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 24` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 12`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 23`, `Community 26`, `Community 29`, `Community 30`, `Community 33`, `Community 34`, `Community 39`, `Community 40`, `Community 41`, `Community 43`, `Community 45`, `Community 46`, `Community 47`, `Community 54`, `Community 59`, `Community 61`, `Community 63`, `Community 64`, `Community 65`, `Community 68`, `Community 74`, `Community 78`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.040524609490126734 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 0` to `Community 1`, `Community 2`, `Community 4`, `Community 6`, `Community 8`, `Community 9`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 23`, `Community 24`, `Community 33`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 45`, `Community 49`, `Community 54`, `Community 59`, `Community 61`, `Community 63`, `Community 74`, `Community 86`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._