# Graph Report - officeos  (2026-11-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 4247 nodes · 20207 edges · 105 communities (101 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 275 edges (avg confidence: 0.85)
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
- Community 103

## God Nodes (most connected - your core abstractions)
1. `getUser()` - 313 edges
2. `el()` - 258 edges
3. `formatDay()` - 217 edges
4. `useSession()` - 211 edges
5. `nameOf()` - 170 edges
6. `useData()` - 169 edges
7. `pageUrl()` - 156 edges
8. `todayIso()` - 129 edges
9. `useToast()` - 129 edges
10. `bump()` - 122 edges

## Surprising Connections (you probably didn't know these)
- `assetApprovers()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/EmployeeDashboard.jsx → assets/js/ui/leave-view.js
- `MyLeave()` --indirect_call--> `byNewest()`  [INFERRED]
  app/src/pages/MyLeave.jsx → assets/js/ui/leave-view.js
- `visitDates()` --calls--> `formatDay()`  [EXTRACTED]
  app/src/components/Decision.jsx → assets/js/ui/leave-view.js
- `CompanyProfile()` --indirect_call--> `updateCompanyProfile()`  [INFERRED]
  app/src/pages/CompanyProfile.jsx → assets/js/data/company-store.js
- `DeptForm()` --indirect_call--> `addDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (105 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (143): assetWhat(), asOld(), ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceNodes(), barLook() (+135 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (108): EmptyState(), DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), FilterSelect(), IconButton(), PRESETS (+100 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (104): Badge(), Icon(), NotBuilt(), PersonCell(), StatCard(), StatStrip(), Stepper(), Tabs() (+96 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (101): ACTIVITY_SOURCES, activityItems(), APPROVAL_TEXT, emptyRow(), ICONS, leaveWhat(), MOVEMENT_DOT, row() (+93 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (94): approvalItems(), activityNodes(), activityText(), CardTitle(), emptyRow(), flaggedSince(), HrDashboard(), Icon() (+86 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (93): chainEvents(), sentOn(), assetTitle(), correctionTitle(), decisionDate(), expenseTitle(), leaveTitle(), locationTitle() (+85 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (78): ColumnChart(), NO_DATA, NoData(), FLAG_EXPORT, FLAG_LABEL, flaggedCell(), flagText(), iconOfPlace() (+70 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (81): movementEvent(), ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPE_KEYS, CATEGORY_KEYS, CONDITION_KEYS, CONDITIONS, LOCATION_KEYS (+73 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (70): Segmented(), signOutNow(), NotPorted(), Appearance(), AppearancePanel(), options(), Row(), Swatches() (+62 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (80): AuthLayout(), BrandPanel(), DEMO_USERS, ForgotPassword(), landingOf(), LinkPage(), Login(), Message() (+72 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (79): changeFor(), needsReorder(), stockStatus(), stockValue(), actorWith(), allItems(), allMovements(), ASSET_REFERENCE (+71 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (69): described(), Field(), Input(), Select(), Switch(), TextArea(), Modal(), bump() (+61 more)

### Community 12 - "Community 12"
Cohesion: 0.05
Nodes (71): ApplyLeave(), balanceRows(), ERROR_ID, FOCUS, Kv(), typeMeta(), CHAIN_STAGES, createChain() (+63 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (72): actorWith(), addDepartment(), addItDepartment(), addUser(), adminOnly(), approvedMonths(), approvedRunMonths(), approvedRuns() (+64 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (64): ASSET_FLOW, CORRECTION_FLOW, EXPENSE_FLOW, IT_FLOW, LEAVE_FLOW, LOCATION_FLOW, OVERTIME_FLOW, PROFILE_FLOW (+56 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (68): active(), addAsset(), addDaysIso(), addVendor(), ASSET_FIELDS, assetEvents(), assetsNotReturned(), assignmentHistory() (+60 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (65): recentDays(), shiftRecentDays(), recordedTime(), Calendar(), applyCorrection(), attendance, byName(), chain (+57 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (56): PageHeader(), Content(), ItDashboard(), percentOf(), RequestTable(), view(), EMPTY, Form() (+48 more)

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (55): badgeOf(), Kv(), Card(), tabTitle(), useData(), ACTION, askWhom(), ChangeForm() (+47 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (52): STATUS_OPTIONS, Content(), link(), NONE, TeamVisits(), ACTION_WORDS, Content(), inWords() (+44 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (25): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+17 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (50): monthlyRuns(), byName(), salaryRows(), absencesIn(), actorWith(), approversFor(), approves(), awayThrough() (+42 more)

### Community 22 - "Community 22"
Cohesion: 0.08
Nodes (48): ADMIN_HELD_BACK, LOCATION_GRANTS, OVERRIDABLE, overridesOf(), permissionsOf(), ROLE_KEYS, ROLES, SELF_SERVICE (+40 more)

### Community 23 - "Community 23"
Cohesion: 0.07
Nodes (52): allAssetRequests(), allAssets(), assetTotals(), ACTIONS, actionSelect, assetSelect, ASSIGN_FIELD, byTag() (+44 more)

### Community 24 - "Community 24"
Cohesion: 0.10
Nodes (48): NO_DATA, asFields(), asForm(), BLANK, Changes(), Content(), DepartmentDefaults(), MON_FIRST (+40 more)

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (46): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+38 more)

### Community 26 - "Community 26"
Cohesion: 0.08
Nodes (48): CATEGORIES, CATEGORY_KEYS, chainFor(), EXPENSE_POLICY, firstStage(), nextStage(), STAGES, applied() (+40 more)

### Community 27 - "Community 27"
Cohesion: 0.09
Nodes (48): renderPresent(), renderStock(), renderTotal(), setStat(), asRequest(), DECIDED, decisionDays(), DECISIONS (+40 more)

### Community 28 - "Community 28"
Cohesion: 0.09
Nodes (46): preview(), BAND_NAME, BandBadge(), bandChange(), bandText(), days(), describePolicy(), Explain() (+38 more)

### Community 29 - "Community 29"
Cohesion: 0.10
Nodes (45): AdminDashboard(), Icon(), listText(), claimItems(), claimText(), EVENT, FinanceDashboard(), Icon() (+37 more)

### Community 30 - "Community 30"
Cohesion: 0.11
Nodes (42): active(), DeclarationsReview(), MyDeclaration(), now(), STATUS, StatusPill(), holdsPayRulePermission(), active() (+34 more)

### Community 31 - "Community 31"
Cohesion: 0.09
Nodes (43): depFields(), ASSET_CATEGORY_KEYS, ASSET_STATE_KEYS, ASSET_STATES, canMove(), DATE_MAX, DATE_MIN, EMAIL (+35 more)

### Community 32 - "Community 32"
Cohesion: 0.11
Nodes (42): alertText(), approverNames(), B(), checks(), dayOf(), DONE, monthLabel(), Months() (+34 more)

### Community 33 - "Community 33"
Cohesion: 0.10
Nodes (40): getCurrentUserId(), clearError(), form, showError(), removeOne(), clearError(), form, showError() (+32 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (36): decider(), approve(), submit(), NAV, OTHER_PAGES, getCurrentRole(), canOpenPage(), depthInPages() (+28 more)

### Community 35 - "Community 35"
Cohesion: 0.08
Nodes (39): allVendors(), VENDOR_STATUS_KEYS, actionsHead, arrowIcon(), byId(), decidedAt(), matches(), paginationEl (+31 more)

### Community 36 - "Community 36"
Cohesion: 0.21
Nodes (43): active(), addComment(), approveRequest(), assigneeOnly(), assignRequest(), audit(), can(), cancelRequest() (+35 more)

### Community 37 - "Community 37"
Cohesion: 0.09
Nodes (38): departmentName(), initialsFrom(), orDash(), profileOf(), actions, cardTitled(), closeIcon(), daysAway() (+30 more)

### Community 38 - "Community 38"
Cohesion: 0.13
Nodes (38): isValidTime(), MODES, recordOf(), storedRecord(), writeCompletedDay(), writeShiftCheckIn(), writeShiftCheckOut(), correctionContext() (+30 more)

### Community 39 - "Community 39"
Cohesion: 0.09
Nodes (33): initialsOf(), Content(), Form(), LIST, MONTHS, OVERRIDES_HINT, plural(), problemsOf() (+25 more)

### Community 40 - "Community 40"
Cohesion: 0.11
Nodes (37): Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), statusLabel(), TABS, UsersList() (+29 more)

### Community 41 - "Community 41"
Cohesion: 0.09
Nodes (30): DEPARTMENTS, DESIGNATIONS, MANAGER_OF, PROFILE_DETAILS, USERS, buildRecord(), clearError(), defaultRoleInput (+22 more)

### Community 42 - "Community 42"
Cohesion: 0.11
Nodes (31): ALSO_FOR_MANAGERS, ROUTES, getCurrentUser(), getCurrentUserLabel(), getSession(), isSignedIn(), signIn(), signOut() (+23 more)

### Community 43 - "Community 43"
Cohesion: 0.09
Nodes (37): calendarCard, cancelRequest(), cellLook(), clearErrors(), field(), FIELDS, fillMonths(), fixableIssue() (+29 more)

### Community 44 - "Community 44"
Cohesion: 0.15
Nodes (36): hasPermission(), activeUser(), allAssignmentRows(), allDepartmentDefaults(), allSwaps(), assignMany(), assignmentReader(), assignmentsFor() (+28 more)

### Community 45 - "Community 45"
Cohesion: 0.13
Nodes (30): setPref(), usePrefs(), waitingCount(), APP_NAV, CompanyMark(), initialsFrom(), inRail(), RAIL (+22 more)

### Community 46 - "Community 46"
Cohesion: 0.12
Nodes (33): recordsStart(), baseDay(), named(), pad(), reader(), shiftCounts(), shiftDay(), shiftMonthFor() (+25 more)

### Community 47 - "Community 47"
Cohesion: 0.16
Nodes (35): active(), allProfileChanges(), BANK_KEYS, bankTogether(), canReveal(), canSee(), clean(), completeness() (+27 more)

### Community 48 - "Community 48"
Cohesion: 0.10
Nodes (34): longDate(), byDate(), getAllHolidays(), holidaysIn(), addBtn, calendarCard, clearError(), dayCell() (+26 more)

### Community 49 - "Community 49"
Cohesion: 0.09
Nodes (33): CAPPED, DOW, Icon(), isOff(), pad(), person(), profileTo(), TeamLeave() (+25 more)

### Community 50 - "Community 50"
Cohesion: 0.13
Nodes (31): load(), save(), copy(), createCollection(), add(), commit(), get(), getAll() (+23 more)

### Community 51 - "Community 51"
Cohesion: 0.09
Nodes (34): ATTENDANCE_RULES, checkInWindow(), clock, errorLine, grace, inBtn, lateMarks, lateNote (+26 more)

### Community 52 - "Community 52"
Cohesion: 0.13
Nodes (34): checkInRefusal(), checkOutRefusal(), ACCURACY_LIMIT_M, active(), allLocationChanges(), answer(), applyChange(), blank() (+26 more)

### Community 53 - "Community 53"
Cohesion: 0.12
Nodes (30): DEDUCTIONS, ICONS, returnToFile(), SLABS, annualTax(), computePay(), FILING_SAMPLE, filingDates() (+22 more)

### Community 54 - "Community 54"
Cohesion: 0.14
Nodes (32): summaryOfDays(), attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), expenseSpendChart(), headcountChart(), HOURS_DATA (+24 more)

### Community 55 - "Community 55"
Cohesion: 0.14
Nodes (32): MAX_QTY, qtyHundredths(), REASON_MAX, REASON_MIN, REVERSE_KIND, STOCK_KINDS, CATEGORIES, active() (+24 more)

### Community 56 - "Community 56"
Cohesion: 0.24
Nodes (31): employmentPeriod(), managerOf(), active(), assignVisit(), build(), cancelVisit(), completeVisitDay(), copy() (+23 more)

### Community 57 - "Community 57"
Cohesion: 0.20
Nodes (30): compareRegimes(), hraExemption(), money(), oldRegimeDeductions(), payMonth(), policyLossOfPay(), policyLossOfPayFrom(), shiftLossOfPay() (+22 more)

### Community 58 - "Community 58"
Cohesion: 0.13
Nodes (28): CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), getAssetRequest(), holdersOf(), holdsStage(), isActive() (+20 more)

### Community 59 - "Community 59"
Cohesion: 0.07
Nodes (30): activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, chart, deptSelect, headcountBars (+22 more)

### Community 60 - "Community 60"
Cohesion: 0.15
Nodes (27): PhotoEditor(), getExpense(), active(), allFileMeta(), audit(), BANK_OR_TAX, canViewFile(), copy() (+19 more)

### Community 61 - "Community 61"
Cohesion: 0.18
Nodes (29): employmentState(), isEmployedOn(), active(), addDaysIso(), addLicence(), assignSeat(), can(), copy() (+21 more)

### Community 62 - "Community 62"
Cohesion: 0.12
Nodes (27): addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry(), fail() (+19 more)

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (26): copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), headOffice(), manager() (+18 more)

### Community 64 - "Community 64"
Cohesion: 0.15
Nodes (28): copy(), createShift(), deactivateShift(), entry(), fail(), firstProblem(), hours(), isInt() (+20 more)

### Community 65 - "Community 65"
Cohesion: 0.12
Nodes (27): getDepartment(), headcountByDepartment(), activeInput, addBtn, buildCard(), clearError(), codeInput, descEl (+19 more)

### Community 66 - "Community 66"
Cohesion: 0.17
Nodes (23): acquireFileUrl(), guardViewer(), live, releaseFileUrl(), revokeAllFileUrls(), useFileUrl(), Avatar(), initialsOf() (+15 more)

### Community 67 - "Community 67"
Cohesion: 0.13
Nodes (26): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+18 more)

### Community 68 - "Community 68"
Cohesion: 0.11
Nodes (26): registerBox, sample(), SAMPLE_AT(), ASSET_CATEGORIES, addDays(), at(), buildImport(), CONDITIONS (+18 more)

### Community 69 - "Community 69"
Cohesion: 0.12
Nodes (27): resetInventoryData(), avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el(), emptyRow() (+19 more)

### Community 70 - "Community 70"
Cohesion: 0.13
Nodes (27): categoryCell(), claimsText(), decidableIds(), EMPTY, entryOf(), lastAt(), matches(), myPayable() (+19 more)

### Community 71 - "Community 71"
Cohesion: 0.14
Nodes (26): bellItem(), buildCard(), buildPanel(), cardState(), CHAIN_STAGE, closeApprovalCard(), closeBellPanel(), closeIcon() (+18 more)

### Community 72 - "Community 72"
Cohesion: 0.18
Nodes (24): BUTTON_LABEL, CONDITION_OPTIONS, DONE_TEXT, full(), MODE_OPTIONS, optionsOf(), overrideField, PRIMARY (+16 more)

### Community 73 - "Community 73"
Cohesion: 0.15
Nodes (18): ok, closeAllDropdowns(), initDropdowns(), triggerOf(), initMenuToggle(), addBack(), addMore(), cellKinds() (+10 more)

### Community 74 - "Community 74"
Cohesion: 0.16
Nodes (23): alertText(), askedMonth, attendanceCheck(), checkItem(), dayOf(), monthLabel(), openAbsencesText(), people() (+15 more)

### Community 75 - "Community 75"
Cohesion: 0.20
Nodes (20): itItem(), waitingFor(), sentTo(), fail(), mayUnlock(), pendingUnlockRequests(), resolveUnlockRequest(), stillLocked() (+12 more)

### Community 76 - "Community 76"
Cohesion: 0.19
Nodes (22): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+14 more)

### Community 77 - "Community 77"
Cohesion: 0.19
Nodes (21): Reason(), DecisionButtons(), ActionsCell(), B(), changesAtOnce(), editBlocked(), formulaText(), monthlyCost() (+13 more)

### Community 78 - "Community 78"
Cohesion: 0.18
Nodes (20): showEmployerBox(), approved(), listed(), missingMonthText(), monthLabel(), notesOf(), openAbsence(), orDash() (+12 more)

### Community 79 - "Community 79"
Cohesion: 0.26
Nodes (21): monthLabel(), now(), pct(), SalaryPlan(), slabRows(), slabText(), TaxExplain(), UnverifiedNote() (+13 more)

### Community 80 - "Community 80"
Cohesion: 0.17
Nodes (21): creditOvertime(), plusDays(), resetCompOff(), allOvertimeDecisions(), copy(), decideOvertime(), decideOvertimeItem(), fail() (+13 more)

### Community 81 - "Community 81"
Cohesion: 0.15
Nodes (21): ascii(), checkFile(), cleanName(), EXT_TYPE, extensionOf(), fail(), hiddenContent(), KINDS (+13 more)

### Community 82 - "Community 82"
Cohesion: 0.18
Nodes (16): COMPANY, companyInitial(), PRODUCT, signInAs(), clearError(), DEMO_USERS, escapeHtml(), MAIN (+8 more)

### Community 83 - "Community 83"
Cohesion: 0.17
Nodes (17): parts(), runRows(), slipsFor(), withNewEngine(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry() (+9 more)

### Community 84 - "Community 84"
Cohesion: 0.23
Nodes (19): slipTotals(), amount(), approved(), financialYear(), ICONS, joinedNote(), label(), MessageRow() (+11 more)

### Community 85 - "Community 85"
Cohesion: 0.14
Nodes (19): amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD, form (+11 more)

### Community 86 - "Community 86"
Cohesion: 0.23
Nodes (16): deviceLine(), copy(), deviceLabel(), devicesFor(), deviceToken(), fail(), MAX_DEVICES, mine() (+8 more)

### Community 87 - "Community 87"
Cohesion: 0.24
Nodes (16): cellText(), COLUMNS, csvCell(), csvText(), downloadCsv(), exportStatsAsCsv(), exportTableAsCsv(), initExports() (+8 more)

### Community 88 - "Community 88"
Cohesion: 0.25
Nodes (16): closeIcon(), createDecisionFlow(), approve(), buildModal(), clearError(), openReject(), showError(), submitReject() (+8 more)

### Community 89 - "Community 89"
Cohesion: 0.15
Nodes (9): clearError(), departmentName(), form, role, save(), SAVED, showError(), STATUS (+1 more)

### Community 90 - "Community 90"
Cohesion: 0.29
Nodes (14): showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme(), onAppearanceChange() (+6 more)

### Community 92 - "Community 92"
Cohesion: 0.29
Nodes (11): COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS, getCompanyProfile(), loadBox() (+3 more)

### Community 93 - "Community 93"
Cohesion: 0.31
Nodes (10): subscribePrefs(), apply(), listeners, NAV_KEY, read(), storedChoice(), subscribe(), useNavWide() (+2 more)

### Community 94 - "Community 94"
Cohesion: 0.20
Nodes (8): FIELD, FIELDS, PAN_HOLDER, PROFILE_SECTIONS, RULES, SECTIONS, VD, VP

### Community 95 - "Community 95"
Cohesion: 0.36
Nodes (7): EMPLOYMENT_SAMPLE, EMPLOYMENT_TYPES, createdDay(), isAppCreated(), joinedOn(), SEEDED, joiningDate()

### Community 96 - "Community 96"
Cohesion: 0.29
Nodes (6): ALL_LOCATION_PERMISSIONS, ALL_PERMISSIONS, LOCATION_PERMISSIONS, PERMISSIONS, renderRow(), rows

### Community 97 - "Community 97"
Cohesion: 0.43
Nodes (6): allEvents(), AUDIT_KINDS, AUDIT_LABEL, empty(), eventsFor(), read()

### Community 98 - "Community 98"
Cohesion: 0.53
Nodes (6): ClaimExpense(), needsReceipt(), holdersOf(), isHeldFor(), previewRoute(), submitExpense()

### Community 99 - "Community 99"
Cohesion: 0.47
Nodes (6): assetFields(), maintFields(), notesOf(), date(), isStockOnlyCategory(), text()

### Community 100 - "Community 100"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 103 - "Community 103"
Cohesion: 0.67
Nodes (3): itLookup(), getItRequest(), withTimeline()

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 878 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 75` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 32`, `Community 33`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 54`, `Community 55`, `Community 56`, `Community 58`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 68`, `Community 70`, `Community 72`, `Community 74`, `Community 76`, `Community 77`, `Community 78`, `Community 79`, `Community 80`, `Community 83`, `Community 84`, `Community 85`, `Community 86`, `Community 89`, `Community 92`, `Community 95`, `Community 98`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.03293598233995585 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 3` to `Community 0`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 10`, `Community 12`, `Community 23`, `Community 24`, `Community 26`, `Community 27`, `Community 29`, `Community 33`, `Community 35`, `Community 37`, `Community 41`, `Community 43`, `Community 48`, `Community 49`, `Community 51`, `Community 53`, `Community 54`, `Community 59`, `Community 70`, `Community 71`, `Community 74`, `Community 76`, `Community 85`, `Community 88`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06535480023852117 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 14`, `Community 17`, `Community 18`, `Community 19`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 32`, `Community 33`, `Community 35`, `Community 37`, `Community 43`, `Community 48`, `Community 49`, `Community 53`, `Community 59`, `Community 70`, `Community 71`, `Community 74`, `Community 76`, `Community 77`, `Community 78`, `Community 79`, `Community 84`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._