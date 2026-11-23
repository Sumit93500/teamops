# Graph Report - officeos  (2026-11-23)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 4398 nodes · 20838 edges · 108 communities (105 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 282 edges (avg confidence: 0.85)
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
- Community 104
- Community 105
- Community 106

## God Nodes (most connected - your core abstractions)
1. `getUser()` - 323 edges
2. `el()` - 258 edges
3. `formatDay()` - 217 edges
4. `useSession()` - 217 edges
5. `useData()` - 173 edges
6. `nameOf()` - 170 edges
7. `pageUrl()` - 163 edges
8. `useToast()` - 133 edges
9. `todayIso()` - 133 edges
10. `bump()` - 126 edges

## Surprising Connections (you probably didn't know these)
- `submit()` --indirect_call--> `note()`  [INFERRED]
  app/src/components/Decision.jsx → assets/js/data/visits.js
- `visitDates()` --calls--> `formatDay()`  [EXTRACTED]
  app/src/components/Decision.jsx → assets/js/ui/leave-view.js
- `assetApprovers()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/EmployeeDashboard.jsx → assets/js/ui/leave-view.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/Expenses.jsx → assets/js/ui/leave-view.js
- `names()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/MyRequests.jsx → assets/js/ui/leave-view.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (108 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (106): ASSET_FLOW, CORRECTION_FLOW, decider(), EXPENSE_FLOW, IT_FLOW, LEAVE_FLOW, LOCATION_FLOW, OVERTIME_FLOW (+98 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (92): COMPANY, companyInitial(), PRODUCT, tabTitle(), signInAs(), signOutNow(), refreshPrefs(), NotPorted() (+84 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (100): ASSET_TYPE_KEYS, changeFor(), CONDITION_KEYS, LOCATION_KEYS, needsReorder(), stockStatus(), stockValue(), actorWith() (+92 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (82): Badge(), EmptyState(), DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), FilterSelect(), IconButton() (+74 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (94): PersonCell(), balanceRows(), recentDays(), shiftRecentDays(), Calendar(), CAPPED, DOW, Icon() (+86 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (91): EMPLOYMENT_SAMPLE, createdDay(), employmentPeriod(), employmentState(), isEmployedOn(), joinedOn(), joinsOn(), SEEDED (+83 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (90): CHAIN_STAGES, createChain(), holds(), managerCanDecide(), refusal(), isActive(), skippedEntry(), applyCorrection() (+82 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (87): movementEvent(), ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPES, CATEGORIES, CATEGORY_KEYS, CONDITIONS, LOCATIONS (+79 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (77): described(), Field(), Input(), Person(), Select(), Switch(), TextArea(), Modal() (+69 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (77): longDate(), BalanceCard(), addHoliday(), byDate(), dayLabel(), getAllHolidays(), HOLIDAY_KINDS, holidayManager() (+69 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (72): itPeople(), BUTTON_LABEL, CONDITION_OPTIONS, DONE_TEXT, full(), MODE_OPTIONS, optionsOf(), overrideField (+64 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (71): CSV_LIMITS, decodeText(), RFC-4180, parseCsv(), protectCell(), quote(), toCsv(), tooMany() (+63 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (58): NO_DATA, Tabs(), Content(), ItDashboard(), percentOf(), RequestTable(), view(), EMPTY (+50 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (69): row(), recentRow(), buildRow(), logRow(), ASIDE, byId(), decidedAt(), recordedTime() (+61 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (55): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+47 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (58): ColumnChart(), NO_DATA, NoData(), FLAG_EXPORT, FLAG_LABEL, flaggedCell(), flagText(), iconOfPlace() (+50 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (65): assetRequestDecisionsBy(), expenseDecisionsBy(), allCorrections, allLeave, asDecidedBy(), assetRow(), assetsDecided(), assetsPending() (+57 more)

### Community 17 - "Community 17"
Cohesion: 0.07
Nodes (57): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+49 more)

### Community 18 - "Community 18"
Cohesion: 0.09
Nodes (60): FIELD, FIELDS, PAN_HOLDER, PROFILE_SECTIONS, RULES, SECTIONS, VD, VP (+52 more)

### Community 19 - "Community 19"
Cohesion: 0.06
Nodes (59): balanceNodes(), attendanceRateChart(), dayKind(), departmentPresenceChart(), emptyAs(), headcountChart(), HOURS_DATA, hoursChart() (+51 more)

### Community 20 - "Community 20"
Cohesion: 0.07
Nodes (57): preview(), BAND_NAME, BandBadge(), bandChange(), bandText(), days(), describePolicy(), Explain() (+49 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (57): DEMO, logEvent(), accountOf(), b64(), b64url(), blank(), changeOwnPassword(), checkToken() (+49 more)

### Community 22 - "Community 22"
Cohesion: 0.07
Nodes (55): DecisionButtons(), leaveWhat(), activityText(), decidedAt(), LeaveApprovals(), stageBadge(), STATS, TABS (+47 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (49): acquireFileUrl(), guardViewer(), live, releaseFileUrl(), revokeAllFileUrls(), useFileUrl(), ClaimExpense(), initialsOf() (+41 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (25): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+17 more)

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (53): BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), IT_TAB, MyRequests(), names(), stepsOf() (+45 more)

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (46): deviceLine(), load(), save(), COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem() (+38 more)

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (53): active(), addAsset(), addDaysIso(), ASSET_FIELDS, assetEvents(), assetsNotReturned(), assignmentHistory(), assignmentsOf() (+45 more)

### Community 28 - "Community 28"
Cohesion: 0.16
Nodes (54): text(), active(), addComment(), addRequest(), approveRequest(), assigneeOnly(), assignRequest(), audit() (+46 more)

### Community 29 - "Community 29"
Cohesion: 0.10
Nodes (48): filingDates(), lastDay(), leap(), nextMonth(), payslipTotals(), tdsReturn(), two(), renderReimbursements() (+40 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (48): directReportsOf(), managerOf(), ACCURACY_FLAG_M, ACCURACY_REFUSE_M, active(), ADDRESS_MAX, assignVisit(), build() (+40 more)

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (45): FIELD_ID, CATEGORIES, CATEGORY_KEYS, chainFor(), EXPENSE_POLICY, firstStage(), nextStage(), STAGES (+37 more)

### Community 32 - "Community 32"
Cohesion: 0.11
Nodes (41): getVersion(), listeners, subscribe(), useVersion(), Content(), MyVisits(), NONE, STATUS_OPTIONS (+33 more)

### Community 33 - "Community 33"
Cohesion: 0.09
Nodes (42): renderWhoApproves(), clearError(), form, showError(), claimText(), cancelCorrection(), clearError(), form (+34 more)

### Community 34 - "Community 34"
Cohesion: 0.12
Nodes (44): useConfirm(), Kv(), Card(), useData(), ACTION, askWhom(), ChangeForm(), Content() (+36 more)

### Community 35 - "Community 35"
Cohesion: 0.08
Nodes (39): initialsOf(), Content(), Form(), LIST, MONTHS, OVERRIDES_HINT, plural(), problemsOf() (+31 more)

### Community 36 - "Community 36"
Cohesion: 0.10
Nodes (44): checkInRefusal(), checkOutRefusal(), resetCompanyProfile(), deviceLabel(), resetAllDevices(), ACCURACY_LIMIT_M, active(), allLocationChanges() (+36 more)

### Community 37 - "Community 37"
Cohesion: 0.11
Nodes (34): Icon(), NotBuilt(), Stepper(), detachedRows(), Row(), Table(), tdClass(), text() (+26 more)

### Community 38 - "Community 38"
Cohesion: 0.09
Nodes (41): StatCard(), StatStrip(), ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT, emptyRow(), Icon() (+33 more)

### Community 39 - "Community 39"
Cohesion: 0.08
Nodes (40): applyPermissions(), allVendors(), VENDOR_STATUS_KEYS, renderAssets(), actionsHead, arrowIcon(), byId(), decidedAt() (+32 more)

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (39): fail(), actorWith(), approveProblem(), approveRun(), awayThrough(), byName(), checkSalary(), decideSalaryProposal() (+31 more)

### Community 41 - "Community 41"
Cohesion: 0.12
Nodes (38): alertText(), approverNames(), B(), checks(), dayOf(), DONE, monthLabel(), Months() (+30 more)

### Community 42 - "Community 42"
Cohesion: 0.10
Nodes (37): ActionsCell(), B(), byName(), changesAtOnce(), editBlocked(), formulaText(), monthlyCost(), salaryRows() (+29 more)

### Community 43 - "Community 43"
Cohesion: 0.12
Nodes (35): holdsPayRulePermission(), active(), admin(), applied(), ASK_FINANCE, CALCS, checkDeclaration(), chooseNewRegime() (+27 more)

### Community 44 - "Community 44"
Cohesion: 0.15
Nodes (34): asFields(), asForm(), BLANK, Content(), DepartmentDefaults(), MON_FIRST, NUM, ShiftForm() (+26 more)

### Community 45 - "Community 45"
Cohesion: 0.07
Nodes (36): ATTENDANCE_RULES, activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, chart, deptSelect (+28 more)

### Community 46 - "Community 46"
Cohesion: 0.12
Nodes (35): recordsStart(), shiftLossOfPay(), baseDay(), named(), pad(), reader(), sampleTimes(), shiftCounts() (+27 more)

### Community 47 - "Community 47"
Cohesion: 0.12
Nodes (32): getCurrentRole(), getCurrentUserId(), getCurrentUserLabel(), getSession(), signOut(), canAll(), canAny(), currentDataScope() (+24 more)

### Community 48 - "Community 48"
Cohesion: 0.11
Nodes (35): assetsFor(), actions, cardTitled(), closeIcon(), daysAway(), deactivateDialog(), deleteBtn, departmentName() (+27 more)

### Community 49 - "Community 49"
Cohesion: 0.13
Nodes (31): Segmented(), useCan(), Content(), ExportPay(), Content(), errorFileName(), ImportEmployees(), StatusPill() (+23 more)

### Community 50 - "Community 50"
Cohesion: 0.12
Nodes (27): ok, NAV, OTHER_PAGES, depthInPages(), resolvePageLink(), resolveRootLink(), rootPrefix(), initMenuToggle() (+19 more)

### Community 51 - "Community 51"
Cohesion: 0.09
Nodes (35): cancelRegularization(), calendarCard, cancelRequest(), cellLook(), clearErrors(), field(), FIELDS, fillMonths() (+27 more)

### Community 52 - "Community 52"
Cohesion: 0.11
Nodes (35): expenseSpendChart(), blank(), expenseTotals(), totalsByDepartment(), actionsCell(), categoryCell(), claimsText(), decidableIds() (+27 more)

### Community 53 - "Community 53"
Cohesion: 0.12
Nodes (33): Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel(), TABS (+25 more)

### Community 54 - "Community 54"
Cohesion: 0.14
Nodes (34): MAX_QTY, qtyHundredths(), REASON_MAX, REASON_MIN, REVERSE_KIND, STOCK_KINDS, active(), addMovement() (+26 more)

### Community 55 - "Community 55"
Cohesion: 0.08
Nodes (33): attentionCount, attentionList, attentionNote(), dateInput, deptBars, deptDate, deptSelect, emptyRow() (+25 more)

### Community 56 - "Community 56"
Cohesion: 0.17
Nodes (31): activeUser(), allAssignmentRows(), allDepartmentDefaults(), allSwaps(), assignMany(), assignmentsFor(), assignRow(), assignShift() (+23 more)

### Community 57 - "Community 57"
Cohesion: 0.14
Nodes (28): itItem(), waitingCount(), waitingFor(), mayCompleteVisitDay(), previewRoute(), mayHelp(), setSignInEnabled(), unlockAccount() (+20 more)

### Community 58 - "Community 58"
Cohesion: 0.12
Nodes (28): addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry(), fail() (+20 more)

### Community 59 - "Community 59"
Cohesion: 0.12
Nodes (25): buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form, managerChoice() (+17 more)

### Community 60 - "Community 60"
Cohesion: 0.13
Nodes (24): APP_OWN, COMPLETE_ITEM, mayOpenLeavePolicy(), mayOpenOutbox(), mayOpenRates(), mayOpenTeamVisits(), MY_VISITS_ITEM, OFFICES_ITEM (+16 more)

### Community 61 - "Community 61"
Cohesion: 0.11
Nodes (29): chainText(), clearError(), clearReportError(), FIELD, fillReplaces(), form, ICON, icon() (+21 more)

### Community 62 - "Community 62"
Cohesion: 0.11
Nodes (25): ConfirmContext, ConfirmDialog(), ConfirmProvider(), CloseIcon(), DISCARD, focusables(), useDialogFocus(), defaultMonth() (+17 more)

### Community 63 - "Community 63"
Cohesion: 0.15
Nodes (28): people(), claimsText(), alertText(), approverNames(), askedMonth, attendanceCheck(), buildRow(), checkItem() (+20 more)

### Community 64 - "Community 64"
Cohesion: 0.13
Nodes (27): getRegularization(), getRequest(), bellItem(), buildCard(), buildPanel(), cardOpener(), CHAIN_STAGE, closeApprovalCard() (+19 more)

### Community 65 - "Community 65"
Cohesion: 0.15
Nodes (28): copy(), createShift(), deactivateShift(), entry(), fail(), firstProblem(), hours(), isInt() (+20 more)

### Community 66 - "Community 66"
Cohesion: 0.12
Nodes (27): activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el(), ensureOption() (+19 more)

### Community 67 - "Community 67"
Cohesion: 0.12
Nodes (27): resetInventoryData(), avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el(), emptyRow() (+19 more)

### Community 68 - "Community 68"
Cohesion: 0.20
Nodes (27): active(), addDaysIso(), addLicence(), assignSeat(), can(), copy(), expiringRenewals(), fail() (+19 more)

### Community 69 - "Community 69"
Cohesion: 0.25
Nodes (26): compareRegimes(), hraExemption(), money(), oldRegimeDeductions(), payMonth(), taxOn(), tdsFor(), trace() (+18 more)

### Community 70 - "Community 70"
Cohesion: 0.11
Nodes (25): registerBox, sample(), SAMPLE_AT(), addDays(), at(), buildImport(), CONDITIONS, copy() (+17 more)

### Community 71 - "Community 71"
Cohesion: 0.20
Nodes (26): isValidTime(), MODES, recordOf(), storedRecord(), writeCompletedDay(), writeShiftCheckIn(), writeShiftCheckOut(), lockedMessage() (+18 more)

### Community 72 - "Community 72"
Cohesion: 0.15
Nodes (21): APP_NAV, APP_OTHER_PAGES, initialsFrom(), inRail(), RAIL, useMedia(), setWide(), isPlaceholder() (+13 more)

### Community 73 - "Community 73"
Cohesion: 0.16
Nodes (23): CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), getAssetRequest(), holdersOf(), holdsStage(), isActive() (+15 more)

### Community 74 - "Community 74"
Cohesion: 0.11
Nodes (24): amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD, form (+16 more)

### Community 75 - "Community 75"
Cohesion: 0.16
Nodes (22): badgeOf(), parts(), runRows(), showEmployerBox(), slipsFor(), withNewEngine(), approved(), listed() (+14 more)

### Community 76 - "Community 76"
Cohesion: 0.15
Nodes (23): assetWhat(), asOld(), ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), barLook(), EmployeeDashboard() (+15 more)

### Community 77 - "Community 77"
Cohesion: 0.21
Nodes (24): addVendor(), assetFields(), closeMaintenance(), copy(), deleteVendor(), disposeAsset(), fail(), hasLeft() (+16 more)

### Community 78 - "Community 78"
Cohesion: 0.18
Nodes (23): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+15 more)

### Community 79 - "Community 79"
Cohesion: 0.18
Nodes (22): resetCompOff(), allOvertimeDecisions(), copy(), decideOvertime(), decideOvertimeItem(), fail(), mayDecideOvertime(), monthOvertime() (+14 more)

### Community 80 - "Community 80"
Cohesion: 0.20
Nodes (22): anniversary(), dayNo(), depreciation(), disposalFigures(), engine(), accRaw(), fullOn(), lifeYear() (+14 more)

### Community 81 - "Community 81"
Cohesion: 0.13
Nodes (22): actionsHead, decidedAt(), matches(), outCard, overlapAlert, paginationEl, PILL_TAB, pills (+14 more)

### Community 82 - "Community 82"
Cohesion: 0.12
Nodes (22): balanceTable, calendarCard, CAPPED, dayCell(), inView(), isOff(), month, outCard (+14 more)

### Community 83 - "Community 83"
Cohesion: 0.25
Nodes (20): monthLabel(), now(), pct(), SalaryPlan(), slabRows(), slabText(), TaxExplain(), UNVERIFIED_TEXT (+12 more)

### Community 84 - "Community 84"
Cohesion: 0.15
Nodes (17): ALSO_FOR_MANAGERS, ROUTES, getCurrentUser(), isSignedIn(), signIn(), canOpenPage(), currentPagePath(), guardPage() (+9 more)

### Community 85 - "Community 85"
Cohesion: 0.15
Nodes (21): ascii(), checkFile(), cleanName(), EXT_TYPE, extensionOf(), fail(), hiddenContent(), KINDS (+13 more)

### Community 86 - "Community 86"
Cohesion: 0.21
Nodes (20): copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), headOffice(), manager() (+12 more)

### Community 87 - "Community 87"
Cohesion: 0.22
Nodes (20): Reason(), slipTotals(), amount(), approved(), financialYear(), ICONS, joinedNote(), label() (+12 more)

### Community 88 - "Community 88"
Cohesion: 0.16
Nodes (20): BarRows(), Actions(), BADGE, claimsText(), EMPTY, entryOf(), Expenses(), ICONS (+12 more)

### Community 89 - "Community 89"
Cohesion: 0.21
Nodes (19): Settings(), admin(), compOffRule(), copy(), DEFAULT_COMP_OFF, DEFAULT_LATE_POLICY, DEFAULT_SHIFT_RULES_FROM, entry() (+11 more)

### Community 90 - "Community 90"
Cohesion: 0.13
Nodes (17): EMPLOYMENT_TYPES, applyRow(), bad(), byName(), COLUMNS, displayDate(), EMPLOYEES_FORM, example() (+9 more)

### Community 91 - "Community 91"
Cohesion: 0.17
Nodes (18): policyLossOfPay(), policyLossOfPayFrom(), admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail() (+10 more)

### Community 92 - "Community 92"
Cohesion: 0.26
Nodes (16): dist(), isHome(), joinsText(), m(), MarkAttendance(), ordinal(), pad(), placeLine() (+8 more)

### Community 93 - "Community 93"
Cohesion: 0.12
Nodes (15): ASSET_CATEGORY_KEYS, ASSET_STATE_KEYS, ASSET_STATES, DATE_MAX, DATE_MIN, EMAIL, GSTIN, moveRefusal() (+7 more)

### Community 94 - "Community 94"
Cohesion: 0.17
Nodes (13): CheckInPlaces(), departmentName(), initialsFrom(), Kv(), MyDevices(), onDay(), orDash(), PLACEHOLDER (+5 more)

### Community 95 - "Community 95"
Cohesion: 0.15
Nodes (9): clearError(), departmentName(), form, role, save(), SAVED, showError(), STATUS (+1 more)

### Community 96 - "Community 96"
Cohesion: 0.19
Nodes (12): GROUPS, Holder(), matrixGroups(), RoleEditor(), ROLES_LIST, Tick(), ALL_LOCATION_PERMISSIONS, ALL_PERMISSIONS (+4 more)

### Community 97 - "Community 97"
Cohesion: 0.22
Nodes (14): allAssetRequests(), allRegularizations(), allExpenses(), getExpense(), salaryProposals(), asRequest(), DECIDED, decisionDays() (+6 more)

### Community 98 - "Community 98"
Cohesion: 0.31
Nodes (13): closeIcon(), createDecisionFlow(), buildModal(), clearError(), openReject(), showError(), submitReject(), closeModal() (+5 more)

### Community 99 - "Community 99"
Cohesion: 0.23
Nodes (12): correctionContext(), NIGHT_WINDOW_DEFAULT, NIGHT_WINDOW_MAX, nightCheckOutJudge(), nightFixHours(), nightFixWindow(), resetNightFix(), setNightFixHours() (+4 more)

### Community 100 - "Community 100"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 101 - "Community 101"
Cohesion: 0.44
Nodes (11): copy(), createCollection(), add(), commit(), get(), getAll(), loadBox(), remove() (+3 more)

### Community 102 - "Community 102"
Cohesion: 0.40
Nodes (9): initRail(), close(), fit(), open(), inRail(), renderFooter(), renderProfile(), renderSignOut() (+1 more)

### Community 103 - "Community 103"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 106 - "Community 106"
Cohesion: 1.00
Nodes (3): closeAllDropdowns(), initDropdowns(), triggerOf()

## Knowledge Gaps
- **2 isolated node(s):** `RFC-4180`, `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 900 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 57` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 51`, `Community 52`, `Community 54`, `Community 55`, `Community 56`, `Community 58`, `Community 59`, `Community 61`, `Community 62`, `Community 63`, `Community 65`, `Community 68`, `Community 70`, `Community 71`, `Community 73`, `Community 74`, `Community 75`, `Community 76`, `Community 77`, `Community 78`, `Community 79`, `Community 81`, `Community 82`, `Community 84`, `Community 86`, `Community 87`, `Community 88`, `Community 89`, `Community 91`, `Community 92`, `Community 94`, `Community 95`, `Community 99`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **What connects `RFC-4180`, `RFC-4180` to the rest of the system?**
  _2 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.03934571175950486 - nodes in this community are weakly interconnected._
- **Why does `getAllUsers()` connect `Community 44` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 15`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 25`, `Community 28`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 37`, `Community 38`, `Community 40`, `Community 41`, `Community 42`, `Community 45`, `Community 48`, `Community 50`, `Community 53`, `Community 55`, `Community 56`, `Community 59`, `Community 66`, `Community 67`, `Community 72`, `Community 73`, `Community 79`, `Community 82`, `Community 84`, `Community 90`, `Community 96`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.052623261694058156 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 13` to `Community 0`, `Community 2`, `Community 4`, `Community 6`, `Community 7`, `Community 9`, `Community 15`, `Community 16`, `Community 17`, `Community 19`, `Community 22`, `Community 25`, `Community 29`, `Community 31`, `Community 33`, `Community 38`, `Community 39`, `Community 44`, `Community 45`, `Community 47`, `Community 48`, `Community 51`, `Community 52`, `Community 55`, `Community 59`, `Community 61`, `Community 63`, `Community 64`, `Community 74`, `Community 76`, `Community 78`, `Community 81`, `Community 82`, `Community 88`, `Community 98`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.04245193222920236 - nodes in this community are weakly interconnected._