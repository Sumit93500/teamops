# Graph Report - officeos  (2026-11-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 4120 nodes · 19090 edges · 103 communities (100 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 270 edges (avg confidence: 0.85)
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

## God Nodes (most connected - your core abstractions)
1. `getUser()` - 308 edges
2. `el()` - 258 edges
3. `formatDay()` - 210 edges
4. `useSession()` - 184 edges
5. `nameOf()` - 169 edges
6. `useData()` - 146 edges
7. `pageUrl()` - 132 edges
8. `todayIso()` - 125 edges
9. `getAllUsers()` - 112 edges
10. `useToast()` - 112 edges

## Surprising Connections (you probably didn't know these)
- `DeclarationsReview()` --indirect_call--> `unlockDeclaration()`  [INFERRED]
  app/src/ui/declarations.jsx → assets/js/data/pay-structure.js
- `DeclarationsReview()` --indirect_call--> `verifyDeclaration()`  [INFERRED]
  app/src/ui/declarations.jsx → assets/js/data/pay-structure.js
- `monthYear()` --calls--> `monthName()`  [EXTRACTED]
  app/src/ui/leaveband.jsx → assets/js/ui/leave-view.js
- `visitDates()` --calls--> `formatDay()`  [EXTRACTED]
  app/src/components/Decision.jsx → assets/js/ui/leave-view.js
- `Run()` --indirect_call--> `approveRunWithSnapshot()`  [INFERRED]
  app/src/pages/PayrollRun.jsx → assets/js/data/pay-runs.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (103 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (113): buildRow(), leaveRow(), row(), applyPermissions(), pendingFor(), assetRow(), correctionRow(), expenseRow() (+105 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (92): compareRegimes(), hraExemption(), money(), oldRegimeDeductions(), payMonth(), taxOn(), tdsFor(), trace() (+84 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (85): BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), IT_TAB, MyRequests(), names(), stepsOf() (+77 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (82): Badge(), Icon(), PersonCell(), StatCard(), StatStrip(), Stepper(), decider(), useDecision() (+74 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (66): Person(), Switch(), tabTitle(), signOutNow(), useAction(), useData(), refreshPrefs(), NotPorted() (+58 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (78): AuthLayout(), BrandPanel(), DEMO_USERS, ForgotPassword(), landingOf(), LinkPage(), Login(), Message() (+70 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (75): described(), Field(), Input(), Select(), TextArea(), Modal(), bump(), useSession() (+67 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (77): overridesOf(), permissionsOf(), active(), addComment(), addRequest(), approveRequest(), assigneeOnly(), assignRequest() (+69 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (68): acquireFileUrl(), guardViewer(), live, releaseFileUrl(), revokeAllFileUrls(), useFileUrl(), Avatar(), initialsOf() (+60 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (76): active(), addAsset(), addDaysIso(), addVendor(), ASSET_FIELDS, assetEvents(), assetFields(), assetsNotReturned() (+68 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (68): preview(), BAND_NAME, BandBadge(), bandChange(), bandText(), days(), describePolicy(), Explain() (+60 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (66): chainEvents(), decisionDate(), activityItems(), ASIDE, byId(), decidedAt(), recordedTime(), tabRequests() (+58 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (62): ASSET_FLOW, CORRECTION_FLOW, DecisionButtons(), EXPENSE_FLOW, LEAVE_FLOW, LOCATION_FLOW, OVERTIME_FLOW, PROFILE_FLOW (+54 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (62): NotBuilt(), monthlyRuns(), alertText(), approverNames(), B(), dayOf(), DONE, monthLabel() (+54 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (60): assetsFor(), openReportOf(), reportProblem(), clearError(), form, showError(), chainText(), clearError() (+52 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (62): actorWith(), addDepartment(), addItDepartment(), addUser(), adminOnly(), approvesRun(), byNonAdmin(), carriesAdmin() (+54 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (58): CATEGORIES, CATEGORY_KEYS, chainFor(), EXPENSE_POLICY, firstStage(), needsReceipt(), nextStage(), STAGES (+50 more)

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (47): COMPANY, companyInitial(), PRODUCT, signInAs(), setPref(), usePrefs(), waitingCount(), AppearancePanel() (+39 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (55): CHAIN_STAGES, skippedEntry(), applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkIn() (+47 more)

### Community 19 - "Community 19"
Cohesion: 0.10
Nodes (50): detachedRows(), Row(), Table(), tdClass(), text(), AssetAssignment(), ITEMS, tagLink() (+42 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (25): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+17 more)

### Community 21 - "Community 21"
Cohesion: 0.07
Nodes (54): addHoliday(), byDate(), dayLabel(), getAllHolidays(), HOLIDAY_KINDS, holidayManager(), holidays, holidaysIn() (+46 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (51): recordsStart(), correctionContext(), NIGHT_WINDOW_DEFAULT, NIGHT_WINDOW_MAX, nightCheckOutJudge(), nightFixHours(), nightFixWindow(), resetNightFix() (+43 more)

### Community 23 - "Community 23"
Cohesion: 0.07
Nodes (53): applied(), applyLeave(), at(), balanceFor(), byManager(), CAPPED_TYPES, chain, checkedInDays() (+45 more)

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (44): DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), FilterSelect(), IconButton(), PRESETS, rangeFor() (+36 more)

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (49): Reason(), ActionsCell(), B(), byName(), changesAtOnce(), editBlocked(), formulaText(), monthlyCost() (+41 more)

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (46): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+38 more)

### Community 27 - "Community 27"
Cohesion: 0.07
Nodes (50): allAssets(), assetTotals(), assetTypeOf(), ACTIONS, actionSelect, assetSelect, ASSIGN_FIELD, byTag() (+42 more)

### Community 28 - "Community 28"
Cohesion: 0.08
Nodes (43): initialsOf(), CheckInPlaces(), departmentName(), Kv(), MyDevices(), onDay(), PLACEHOLDER, SAVED (+35 more)

### Community 29 - "Community 29"
Cohesion: 0.09
Nodes (46): ASSET_CATEGORY_KEYS, ASSET_STATE_KEYS, ASSET_STATES, DATE_MAX, DATE_MIN, EMAIL, GSTIN, MAX_QTY (+38 more)

### Community 30 - "Community 30"
Cohesion: 0.08
Nodes (46): Calendar(), CAPPED, DOW, Icon(), isOff(), pad(), person(), profileTo() (+38 more)

### Community 31 - "Community 31"
Cohesion: 0.09
Nodes (44): changeFor(), stockStatus(), stockValue(), actorWith(), allMovements(), ASSET_REFERENCE, assets, assetsHeldByInactive() (+36 more)

### Community 32 - "Community 32"
Cohesion: 0.10
Nodes (41): badgeOf(), parts(), runRows(), showEmployerBox(), slipsFor(), slipTotals(), withNewEngine(), amount() (+33 more)

### Community 33 - "Community 33"
Cohesion: 0.10
Nodes (43): flagText(), iconOfPlace(), row(), recentRow(), cellLook(), DOW, EMPTY_FORM, FIELD_ID (+35 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (42): leaveWhat(), requestName(), activityText(), BalanceCard(), Balances(), BAR, HEADS, HistoryRow() (+34 more)

### Community 35 - "Community 35"
Cohesion: 0.09
Nodes (41): initialsFrom(), orDash(), profileOf(), approvalChainText(), reportingManagerName(), actions, cardTitled(), closeIcon() (+33 more)

### Community 36 - "Community 36"
Cohesion: 0.11
Nodes (38): BarRows(), balanceRows(), DEDUCTIONS, ICONS, people(), returnToFile(), SLABS, TaxDeductions() (+30 more)

### Community 37 - "Community 37"
Cohesion: 0.11
Nodes (40): checkInRefusal(), checkOutRefusal(), deviceLabel(), ACCURACY_LIMIT_M, active(), allLocationChanges(), answer(), applyChange() (+32 more)

### Community 38 - "Community 38"
Cohesion: 0.10
Nodes (41): averageProcessingDays(), renderWhoApproves(), actionsCell(), categoryCell(), claimsText(), decidableIds(), EMPTY, entryOf() (+33 more)

### Community 39 - "Community 39"
Cohesion: 0.10
Nodes (39): Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel(), TABS (+31 more)

### Community 40 - "Community 40"
Cohesion: 0.16
Nodes (35): EmptyState(), Card(), PageHeader(), countText(), nounOf(), Content(), Content(), MyVisits() (+27 more)

### Community 41 - "Community 41"
Cohesion: 0.10
Nodes (35): ColumnChart(), stampsBy(), ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT, emptyRow(), Icon() (+27 more)

### Community 42 - "Community 42"
Cohesion: 0.10
Nodes (35): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+27 more)

### Community 43 - "Community 43"
Cohesion: 0.11
Nodes (37): checks(), openAbsencesText(), people(), rowName(), workingDays(), people(), runTotals(), renderPayroll() (+29 more)

### Community 44 - "Community 44"
Cohesion: 0.16
Nodes (34): monthLabel(), now(), pct(), SalaryPlan(), slabRows(), slabText(), TaxExplain(), rupees() (+26 more)

### Community 45 - "Community 45"
Cohesion: 0.07
Nodes (35): pendingRegularizations(), attentionCount, attentionList, attentionNote(), dateInput, deptBars, deptDate, deptSelect (+27 more)

### Community 46 - "Community 46"
Cohesion: 0.10
Nodes (35): creditOvertime(), plusDays(), resetCompOff(), allOvertimeDecisions(), copy(), decideOvertime(), decideOvertimeItem(), fail() (+27 more)

### Community 47 - "Community 47"
Cohesion: 0.11
Nodes (29): NO_DATA, NoData(), flaggedCell(), stampKey(), attentionItems(), attentionNote(), emptyRow(), forSummary() (+21 more)

### Community 48 - "Community 48"
Cohesion: 0.13
Nodes (34): placeLabel(), deviceLine(), dist(), isHome(), joinsText(), longDate(), m(), MarkAttendance() (+26 more)

### Community 49 - "Community 49"
Cohesion: 0.12
Nodes (28): APP_ALSO, APP_NAV, APP_OTHER_PAGES, APP_OWN, mayOpenLeavePolicy(), mayOpenOutbox(), mayOpenRates(), mayOpenTeamVisits() (+20 more)

### Community 50 - "Community 50"
Cohesion: 0.20
Nodes (35): ACCURACY_FLAG_M, ACCURACY_REFUSE_M, active(), assignVisit(), build(), cancelVisit(), completeVisitDay(), copy() (+27 more)

### Community 51 - "Community 51"
Cohesion: 0.18
Nodes (34): viewOf(), hasPermission(), active(), allProfileChanges(), BANK_KEYS, bankTogether(), canReveal(), canSee() (+26 more)

### Community 52 - "Community 52"
Cohesion: 0.15
Nodes (34): activeUser(), allAssignmentRows(), allDepartmentDefaults(), allSwaps(), assignMany(), assignmentsFor(), assignRow(), assignShift() (+26 more)

### Community 53 - "Community 53"
Cohesion: 0.09
Nodes (34): calendarCard, cellLook(), clearErrors(), field(), FIELDS, fillMonths(), fixableIssue(), form (+26 more)

### Community 54 - "Community 54"
Cohesion: 0.09
Nodes (33): clearError(), deptField, deptSelect, EMPTY, FIELD, fillDepartments(), fillItems(), fillTypes() (+25 more)

### Community 55 - "Community 55"
Cohesion: 0.16
Nodes (31): setStat(), amount(), approved(), buildRow(), field(), financialYear(), joinedNote(), label() (+23 more)

### Community 56 - "Community 56"
Cohesion: 0.09
Nodes (33): clock, errorLine, grace, inBtn, lateMarks, lateNote, modeInputs, note (+25 more)

### Community 57 - "Community 57"
Cohesion: 0.15
Nodes (30): attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), expenseSpendChart(), headcountChart(), HOURS_DATA, hoursChart() (+22 more)

### Community 58 - "Community 58"
Cohesion: 0.13
Nodes (27): useConfirm(), getVersion(), listeners, subscribe(), useCan(), useVersion(), ApplyLeave(), ERROR_ID (+19 more)

### Community 59 - "Community 59"
Cohesion: 0.11
Nodes (26): OVERRIDABLE, buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form (+18 more)

### Community 60 - "Community 60"
Cohesion: 0.09
Nodes (29): ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPE_KEYS, CATEGORY_KEYS, CONDITION_KEYS, CONDITIONS, LOCATION_KEYS, LOCATIONS (+21 more)

### Community 61 - "Community 61"
Cohesion: 0.08
Nodes (30): activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, chainEvents(), chart, deptSelect (+22 more)

### Community 62 - "Community 62"
Cohesion: 0.11
Nodes (17): NO_DATA, Tabs(), CorrectDialog(), ItemDialog(), KIND_LABEL, KIND_OPTIONS, MoveDialog(), qtyText() (+9 more)

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (23): ok, getCurrentRole(), redirectToLanding(), depthInPages(), resolvePageLink(), resolveRootLink(), rootPrefix(), initMenuToggle() (+15 more)

### Community 64 - "Community 64"
Cohesion: 0.14
Nodes (28): load(), save(), allEvents(), AUDIT_KINDS, AUDIT_LABEL, empty(), eventsFor(), read() (+20 more)

### Community 65 - "Community 65"
Cohesion: 0.09
Nodes (29): ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceCard, barLook(), chart, hoursNote (+21 more)

### Community 66 - "Community 66"
Cohesion: 0.14
Nodes (28): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+20 more)

### Community 67 - "Community 67"
Cohesion: 0.12
Nodes (27): assetWhat(), asOld(), ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceNodes(), barLook() (+19 more)

### Community 68 - "Community 68"
Cohesion: 0.11
Nodes (27): registerBox, sample(), SAMPLE_AT(), ASSET_CATEGORIES, addDays(), at(), buildImport(), CONDITIONS (+19 more)

### Community 69 - "Community 69"
Cohesion: 0.12
Nodes (27): getRegularization(), getRequest(), bellItem(), buildCard(), buildPanel(), cardState(), CHAIN_STAGE, closeApprovalCard() (+19 more)

### Community 70 - "Community 70"
Cohesion: 0.15
Nodes (28): copy(), createShift(), deactivateShift(), entry(), fail(), firstProblem(), hours(), isInt() (+20 more)

### Community 71 - "Community 71"
Cohesion: 0.12
Nodes (27): getDepartment(), headcountByDepartment(), activeInput, addBtn, buildCard(), clearError(), codeInput, descEl (+19 more)

### Community 72 - "Community 72"
Cohesion: 0.15
Nodes (24): FLAG_EXPORT, FLAG_LABEL, metres(), PLACE_ICON, PLACE_LABEL, copy(), createOffice(), deactivateOffice() (+16 more)

### Community 73 - "Community 73"
Cohesion: 0.15
Nodes (27): inventoryValueChart(), stockBarPercent(), allItems(), inventoryTotals(), reorderAlerts(), byCategory(), categoryCell(), ICON (+19 more)

### Community 74 - "Community 74"
Cohesion: 0.12
Nodes (27): resetInventoryData(), avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el(), emptyRow() (+19 more)

### Community 75 - "Community 75"
Cohesion: 0.20
Nodes (27): active(), addDaysIso(), addLicence(), assignSeat(), can(), copy(), expiringRenewals(), fail() (+19 more)

### Community 76 - "Community 76"
Cohesion: 0.11
Nodes (23): assignable(), LOOK, mayCompleteVisitDay(), OnSiteChip(), Svg(), VisitsToday(), visitTitle(), directReportsOf() (+15 more)

### Community 77 - "Community 77"
Cohesion: 0.15
Nodes (24): isManagerNow(), CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), getAssetRequest(), holdersOf(), holdsStage() (+16 more)

### Community 78 - "Community 78"
Cohesion: 0.15
Nodes (23): ConfirmContext, ConfirmDialog(), ConfirmProvider(), Kv(), CloseIcon(), DISCARD, focusables(), useDialogFocus() (+15 more)

### Community 79 - "Community 79"
Cohesion: 0.09
Nodes (24): ALWAYS_SENSITIVE, CHECKLIST, CHECKLIST_KEYS, DETAILS_MAX, detailsCheck(), executionRefusal(), holds(), isSensitive() (+16 more)

### Community 80 - "Community 80"
Cohesion: 0.22
Nodes (24): isValidTime(), MODES, recordOf(), storedRecord(), writeCompletedDay(), writeShiftCheckIn(), writeShiftCheckOut(), shiftDayFor() (+16 more)

### Community 81 - "Community 81"
Cohesion: 0.13
Nodes (20): ALL_LOCATION_PERMISSIONS, ALL_PERMISSIONS, LOCATION_PERMISSIONS, PERMISSIONS, ADMIN_HELD_BACK, LOCATION_GRANTS, ROLE_KEYS, ROLES (+12 more)

### Community 82 - "Community 82"
Cohesion: 0.14
Nodes (19): Content(), Form(), LIST, MONTHS, OVERRIDES_HINT, plural(), problemsOf(), RULES (+11 more)

### Community 83 - "Community 83"
Cohesion: 0.10
Nodes (13): DESIGNATIONS, MANAGER_OF, PROFILE_DETAILS, USERS, clearError(), departmentName(), form, role (+5 more)

### Community 84 - "Community 84"
Cohesion: 0.16
Nodes (20): sentTo(), createChain(), holds(), managerCanDecide(), refusal(), isActive(), previewRoute(), active() (+12 more)

### Community 85 - "Community 85"
Cohesion: 0.16
Nodes (16): ALSO_FOR_MANAGERS, ROUTES, getCurrentUserLabel(), getSession(), isSignedIn(), signIn(), signOut(), currentPagePath() (+8 more)

### Community 86 - "Community 86"
Cohesion: 0.21
Nodes (17): waitingFor(), pendingProfileChanges(), pendingLocationChanges(), fail(), lockedOnly(), mayUnlock(), pendingUnlockRequests(), resolveUnlockRequest() (+9 more)

### Community 87 - "Community 87"
Cohesion: 0.25
Nodes (19): anniversary(), dayNo(), depreciation(), disposalFigures(), engine(), accRaw(), fullOn(), lifeYear() (+11 more)

### Community 88 - "Community 88"
Cohesion: 0.19
Nodes (18): movementEvent(), movementEvent(), cellText(), COLUMNS, csvCell(), csvText(), downloadCsv(), exportStatsAsCsv() (+10 more)

### Community 89 - "Community 89"
Cohesion: 0.22
Nodes (17): employmentState(), isEmployedOn(), SEEDED, approvedMonthCovering(), approvedMonths(), approvedRunMonths(), approvedRuns(), joiningDate() (+9 more)

### Community 90 - "Community 90"
Cohesion: 0.23
Nodes (13): NAV, OTHER_PAGES, canOpenPage(), buildOption(), closeIcon(), iconButton(), matchingPages(), matchingPeople() (+5 more)

### Community 91 - "Community 91"
Cohesion: 0.29
Nodes (14): showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme(), onAppearanceChange() (+6 more)

### Community 92 - "Community 92"
Cohesion: 0.26
Nodes (12): getCurrentUser(), ICONS, SECTION_ICONS, initRail(), close(), fit(), open(), inRail() (+4 more)

### Community 93 - "Community 93"
Cohesion: 0.26
Nodes (11): allAssetRequests(), getExpense(), asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys(), PASSED (+3 more)

### Community 94 - "Community 94"
Cohesion: 0.29
Nodes (11): allVendors(), VENDOR_STATUS_KEYS, byId(), contactLine(), matches(), renderTable(), row(), tbody (+3 more)

### Community 95 - "Community 95"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 96 - "Community 96"
Cohesion: 0.33
Nodes (10): COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS, getCompanyProfile(), loadBox() (+2 more)

### Community 97 - "Community 97"
Cohesion: 0.20
Nodes (8): FIELD, FIELDS, PAN_HOLDER, PROFILE_SECTIONS, RULES, SECTIONS, VD, VP

### Community 98 - "Community 98"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 101 - "Community 101"
Cohesion: 1.00
Nodes (3): closeAllDropdowns(), initDropdowns(), triggerOf()

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 851 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 84` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 18`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 37`, `Community 38`, `Community 40`, `Community 41`, `Community 43`, `Community 45`, `Community 46`, `Community 48`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 61`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 70`, `Community 72`, `Community 75`, `Community 76`, `Community 77`, `Community 79`, `Community 80`, `Community 82`, `Community 83`, `Community 85`, `Community 86`, `Community 89`, `Community 92`, `Community 96`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.039880059970014994 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 0` to `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 11`, `Community 14`, `Community 16`, `Community 21`, `Community 23`, `Community 25`, `Community 27`, `Community 30`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 38`, `Community 41`, `Community 43`, `Community 45`, `Community 47`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 59`, `Community 60`, `Community 61`, `Community 65`, `Community 66`, `Community 67`, `Community 69`, `Community 73`, `Community 81`, `Community 94`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.052277227722772275 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 34` to `Community 0`, `Community 2`, `Community 3`, `Community 6`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 19`, `Community 21`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 30`, `Community 32`, `Community 33`, `Community 35`, `Community 36`, `Community 38`, `Community 40`, `Community 41`, `Community 43`, `Community 44`, `Community 45`, `Community 47`, `Community 53`, `Community 55`, `Community 58`, `Community 60`, `Community 61`, `Community 62`, `Community 65`, `Community 66`, `Community 67`, `Community 69`, `Community 76`, `Community 78`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._