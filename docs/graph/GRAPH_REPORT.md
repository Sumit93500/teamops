# Graph Report - officeos  (2026-11-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3477 nodes · 15699 edges · 106 communities (103 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 243 edges (avg confidence: 0.85)
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

## God Nodes (most connected - your core abstractions)
1. `getUser()` - 257 edges
2. `el()` - 256 edges
3. `formatDay()` - 192 edges
4. `nameOf()` - 145 edges
5. `useSession()` - 139 edges
6. `useData()` - 116 edges
7. `pageUrl()` - 112 edges
8. `todayIso()` - 106 edges
9. `getAllUsers()` - 104 edges
10. `plural()` - 95 edges

## Surprising Connections (you probably didn't know these)
- `assetApprovers()` --indirect_call--> `nameOf()`  [INFERRED]
  app/src/pages/EmployeeDashboard.jsx → assets/js/ui/leave-view.js
- `monthYear()` --calls--> `monthName()`  [EXTRACTED]
  app/src/ui/leaveband.jsx → assets/js/ui/leave-view.js
- `CompanyProfile()` --indirect_call--> `updateCompanyProfile()`  [INFERRED]
  app/src/pages/CompanyProfile.jsx → assets/js/data/company-store.js
- `DeptForm()` --indirect_call--> `addDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js
- `DeptForm()` --indirect_call--> `updateDepartment()`  [INFERRED]
  app/src/pages/Departments.jsx → assets/js/data/store.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (106 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (88): leaveWhat(), asOld(), ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceNodes(), barLook() (+80 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (80): EmptyState(), NO_DATA, useConfirm(), described(), Field(), Input(), Select(), Switch() (+72 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (75): balanceRows(), overWarning(), Calendar(), CheckIcon(), OutNextWeek(), Step(), seedDays(), addDays() (+67 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (71): BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), MyRequests(), names(), stepsOf(), TABS (+63 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (68): assetWhat(), allAssetRequests(), allAssets(), assetsWithOpenReports(), assetTotals(), assetTypeOf(), openReportOf(), assetWhat() (+60 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (67): decisionDate(), onDay(), assetRequestDecisionsBy(), expenseDecisionsBy(), salaryProposals(), allCorrections, allLeave, asDecidedBy() (+59 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (53): Badge(), Icon(), NotBuilt(), Stepper(), detachedRows(), Row(), Table(), tdClass() (+45 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (64): addHoliday(), byDate(), dayLabel(), getAllHolidays(), HOLIDAY_KINDS, holidayManager(), holidays, holidaysIn() (+56 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (58): initialsOf(), Kv(), Card(), tabTitle(), Content(), MyLocations(), Content(), Form() (+50 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (53): DateRange(), DownloadMenu(), FilterBar(), FilterSearch(), FilterSelect(), IconButton(), PRESETS, rangeFor() (+45 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (60): fulfilAssetRequest(), ASSET_STATUS_KEYS, ASSET_STATUSES, CATEGORIES, CATEGORY_KEYS, changeFor(), CONDITION_KEYS, CONDITIONS (+52 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (54): StatCard(), StatStrip(), BarRows(), ColumnChart(), NO_DATA, NoData(), flaggedCell(), stampKey() (+46 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (59): approvalItems(), claimItems(), activityNodes(), activityText(), CardTitle(), emptyRow(), flaggedSince(), HrDashboard() (+51 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (43): COMPANY, PRODUCT, signOutNow(), refreshPrefs(), setPref(), usePrefs(), Appearance(), AppearancePanel() (+35 more)

### Community 14 - "Community 14"
Cohesion: 0.10
Nodes (53): skippedEntry(), applyCorrection(), attendance, byName(), chain, checkAgainstRecord(), checkIn(), checkInPlan() (+45 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (50): movementEvent(), getItem(), stockOf(), movementEvent(), clearError(), deptField, deptSelect, EMPTY (+42 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (51): logEvent(), accountOf(), b64(), b64url(), blank(), changeOwnPassword(), checkToken(), COMMON_PASSWORDS (+43 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (45): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+37 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (46): permissionsOf(), fail(), absencesIn(), actorWith(), approversFor(), approves(), byName(), checkSalary() (+38 more)

### Community 19 - "Community 19"
Cohesion: 0.10
Nodes (19): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+11 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (44): ACTIVITY_SOURCES, activityItems(), AdminDashboard(), APPROVAL_TEXT, chainEvents(), emptyRow(), Icon(), ICONS (+36 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (38): load(), adminOnly(), approvesRun(), byNonAdmin(), carriesAdmin(), decidesStage(), deletedName(), deleteProblem() (+30 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (38): FLAG_EXPORT, FLAG_LABEL, flagText(), iconOfPlace(), metres(), PLACE_ICON, PLACE_LABEL, placeLabel() (+30 more)

### Community 23 - "Community 23"
Cohesion: 0.12
Nodes (38): alertText(), approverNames(), B(), checks(), dayOf(), DONE, monthLabel(), Months() (+30 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (38): applyPermissions(), allVendors(), renderTable(), renderTable(), actionsHead, arrowIcon(), byId(), decidedAt() (+30 more)

### Community 25 - "Community 25"
Cohesion: 0.10
Nodes (37): preview(), BandBadge(), bandChange(), EMPLOYMENT_SAMPLE, EMPLOYMENT_TYPES, employmentKind(), employmentOf(), account() (+29 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (36): holdsPayRulePermission(), active(), admin(), applied(), ASK_FINANCE, CALCS, checkDeclaration(), chooseNewRegime() (+28 more)

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (29): NotPorted(), Content(), KIND, Mail(), MailOutbox(), when(), Rebuilding(), RequireRoute() (+21 more)

### Community 28 - "Community 28"
Cohesion: 0.10
Nodes (35): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+27 more)

### Community 29 - "Community 29"
Cohesion: 0.11
Nodes (37): Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel(), TABS (+29 more)

### Community 30 - "Community 30"
Cohesion: 0.11
Nodes (33): DEDUCTIONS, ICONS, people(), returnToFile(), SLABS, annualTax(), computePay(), FILING_SAMPLE (+25 more)

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (36): chainFor(), firstStage(), nextStage(), applied(), approverMustPay(), at(), auto(), averageProcessingDays() (+28 more)

### Community 32 - "Community 32"
Cohesion: 0.11
Nodes (35): assetsFor(), actions, cardTitled(), closeIcon(), daysAway(), deactivateDialog(), deleteBtn, departmentName() (+27 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (35): monthOvertime(), overtimeDays(), pendingOvertime(), named(), pad(), reader(), sampleTimes(), shiftCounts() (+27 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (35): setStat(), setStat(), renderStats(), setStat(), setStat(), amount(), approved(), buildRow() (+27 more)

### Community 35 - "Community 35"
Cohesion: 0.17
Nodes (35): viewOf(), hasPermission(), active(), allProfileChanges(), BANK_KEYS, bankTogether(), canReveal(), canSee() (+27 more)

### Community 36 - "Community 36"
Cohesion: 0.07
Nodes (34): attentionCount, attentionList, attentionNote(), dateInput, deptBars, deptDate, deptSelect, emptyRow() (+26 more)

### Community 37 - "Community 37"
Cohesion: 0.10
Nodes (34): calendarCard, cellLook(), clearErrors(), field(), FIELDS, fixableIssue(), form, isOffOrEmpty() (+26 more)

### Community 38 - "Community 38"
Cohesion: 0.10
Nodes (32): DecisionButtons(), BELL_SELECTOR, bellListeners, BellPanel(), Card(), CardHost(), cardLink(), cardOpener() (+24 more)

### Community 39 - "Community 39"
Cohesion: 0.10
Nodes (31): Actions(), BADGE, claimsText(), EMPTY, entryOf(), Expenses(), ICONS, lastAt() (+23 more)

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (32): ACCURACY_LIMIT_M, active(), answer(), applyChange(), blank(), cancelLocationChange(), changes, checkPlace() (+24 more)

### Community 41 - "Community 41"
Cohesion: 0.16
Nodes (33): activeUser(), allAssignmentRows(), allDepartmentDefaults(), allSwaps(), assignMany(), assignmentsFor(), assignRow(), assignShift() (+25 more)

### Community 42 - "Community 42"
Cohesion: 0.09
Nodes (33): clock, errorLine, grace, inBtn, lateMarks, lateNote, modeInputs, note (+25 more)

### Community 43 - "Community 43"
Cohesion: 0.14
Nodes (30): monthSpan(), activityItems(), EVENT, FinanceDashboard(), Icon(), ICONS, monthlyRuns(), people() (+22 more)

### Community 44 - "Community 44"
Cohesion: 0.11
Nodes (30): ASSET_FLOW, CORRECTION_FLOW, EXPENSE_FLOW, LEAVE_FLOW, LOCATION_FLOW, OVERTIME_FLOW, PROFILE_FLOW, SALARY_FLOW (+22 more)

### Community 45 - "Community 45"
Cohesion: 0.19
Nodes (31): monthLabel(), now(), pct(), SalaryPlan(), slabRows(), slabText(), TaxExplain(), UnverifiedNote() (+23 more)

### Community 46 - "Community 46"
Cohesion: 0.11
Nodes (32): payableFor(), actionsCell(), categoryCell(), claimsText(), decidableIds(), EMPTY, entryOf(), lastAt() (+24 more)

### Community 47 - "Community 47"
Cohesion: 0.09
Nodes (31): ASSET_TYPE_KEYS, clearError(), clearReportError(), FIELD, fillReplaces(), form, ICON, icon() (+23 more)

### Community 48 - "Community 48"
Cohesion: 0.11
Nodes (31): pendingSalaryProposal(), withdrawSalaryProposal(), allRows, byName(), changeButtons(), changesAtOnce(), closeIcon(), currentRows() (+23 more)

### Community 49 - "Community 49"
Cohesion: 0.08
Nodes (32): ASSET_VERB, assetApprovers(), assetName(), assetOutcome(), balanceCard, barLook(), chart, hoursNote (+24 more)

### Community 50 - "Community 50"
Cohesion: 0.12
Nodes (29): PersonCell(), Tabs(), decidedAt(), LeaveApprovals(), stageBadge(), STATS, TABS, CAPPED (+21 more)

### Community 51 - "Community 51"
Cohesion: 0.07
Nodes (31): activity, ACTIVITY_SOURCES, activityMeta, APPROVAL_TEXT, approvalsCard, chainEvents(), chart, deptSelect (+23 more)

### Community 52 - "Community 52"
Cohesion: 0.12
Nodes (28): ASIDE, byId(), decidedAt(), recordedTime(), Regularization(), row(), tabRequests(), TABS (+20 more)

### Community 53 - "Community 53"
Cohesion: 0.12
Nodes (28): addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry(), fail() (+20 more)

### Community 54 - "Community 54"
Cohesion: 0.15
Nodes (30): runMonth(), runTotals(), renderPayroll(), alertText(), askedMonth, attendanceCheck(), buildRow(), checkItem() (+22 more)

### Community 55 - "Community 55"
Cohesion: 0.12
Nodes (25): buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form, managerChoice() (+17 more)

### Community 56 - "Community 56"
Cohesion: 0.10
Nodes (28): actionsHead, decidedAt(), matches(), outCard, overlapAlert, paginationEl, PILL_TAB, pills (+20 more)

### Community 57 - "Community 57"
Cohesion: 0.19
Nodes (28): isValidTime(), recordOf(), storedRecord(), writeCompletedDay(), writeShiftCheckIn(), writeShiftCheckOut(), checkInAt(), checkOutAt() (+20 more)

### Community 58 - "Community 58"
Cohesion: 0.15
Nodes (28): copy(), createShift(), deactivateShift(), entry(), fail(), firstProblem(), hours(), isInt() (+20 more)

### Community 59 - "Community 59"
Cohesion: 0.19
Nodes (24): isManagerNow(), navItemVisible(), getCurrentRole(), getCurrentUser(), getCurrentUserId(), canOpenPage(), can(), canAll() (+16 more)

### Community 60 - "Community 60"
Cohesion: 0.15
Nodes (27): inventoryValueChart(), stockBarPercent(), allItems(), inventoryTotals(), reorderAlerts(), byCategory(), categoryCell(), ICON (+19 more)

### Community 61 - "Community 61"
Cohesion: 0.19
Nodes (27): save(), actorWith(), addDepartment(), addUser(), changeUser(), commit(), copy(), deactivateUser() (+19 more)

### Community 62 - "Community 62"
Cohesion: 0.14
Nodes (24): CHAIN, closeAssetRequest(), decideAssetRequest(), getAssetRequest(), holdersOf(), holdsStage(), isActive(), isHeldFor() (+16 more)

### Community 63 - "Community 63"
Cohesion: 0.13
Nodes (25): getDepartment(), activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el() (+17 more)

### Community 64 - "Community 64"
Cohesion: 0.16
Nodes (25): approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel(), openAbsence() (+17 more)

### Community 65 - "Community 65"
Cohesion: 0.13
Nodes (26): avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el(), emptyRow(), exportBtn (+18 more)

### Community 66 - "Community 66"
Cohesion: 0.18
Nodes (21): AuthLayout(), BrandPanel(), DEMO_USERS, ForgotPassword(), landingOf(), LinkPage(), Login(), Message() (+13 more)

### Community 67 - "Community 67"
Cohesion: 0.15
Nodes (22): claimText(), approvalsCard, claimsText(), claimText(), EVENT, people(), renderDepartments(), renderReimbursements() (+14 more)

### Community 68 - "Community 68"
Cohesion: 0.12
Nodes (16): ok, clearError(), form, showError(), clearError(), form, showError(), closeAllDropdowns() (+8 more)

### Community 69 - "Community 69"
Cohesion: 0.12
Nodes (22): getRegularization(), getRequest(), buildCard(), buildPanel(), CHAIN_STAGE, closeApprovalCard(), closeBellPanel(), closeIcon() (+14 more)

### Community 70 - "Community 70"
Cohesion: 0.17
Nodes (21): badgeOf(), parts(), runRows(), showEmployerBox(), slipsFor(), withNewEngine(), approved(), listed() (+13 more)

### Community 71 - "Community 71"
Cohesion: 0.12
Nodes (12): ConfirmContext, ConfirmDialog(), ConfirmProvider(), CloseIcon(), DISCARD, focusables(), useDialogFocus(), DOW (+4 more)

### Community 72 - "Community 72"
Cohesion: 0.16
Nodes (17): getVersion(), listeners, subscribe(), companyInitial(), signInAs(), useVersion(), clearError(), DEMO_USERS (+9 more)

### Community 73 - "Community 73"
Cohesion: 0.17
Nodes (18): NAV, OTHER_PAGES, depthInPages(), resolvePageLink(), resolveRootLink(), rootPrefix(), buildOption(), closeIcon() (+10 more)

### Community 74 - "Community 74"
Cohesion: 0.16
Nodes (17): ALSO_FOR_MANAGERS, ROUTES, getCurrentUserLabel(), getSession(), isSignedIn(), signIn(), signOut(), currentPagePath() (+9 more)

### Community 75 - "Community 75"
Cohesion: 0.22
Nodes (19): copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), headOffice(), manager() (+11 more)

### Community 76 - "Community 76"
Cohesion: 0.23
Nodes (19): slipTotals(), amount(), approved(), financialYear(), ICONS, joinedNote(), label(), MessageRow() (+11 more)

### Community 77 - "Community 77"
Cohesion: 0.21
Nodes (17): waitingCount(), waitingFor(), pendingProfileChanges(), pendingLocationChanges(), fail(), lockedOnly(), mayUnlock(), pendingUnlockRequests() (+9 more)

### Community 78 - "Community 78"
Cohesion: 0.21
Nodes (19): employmentPeriod(), employmentState(), isEmployedOn(), joinsOn(), SEEDED, approvedMonthCovering(), approvedMonths(), approvedRunMonths() (+11 more)

### Community 79 - "Community 79"
Cohesion: 0.14
Nodes (19): amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD, form (+11 more)

### Community 80 - "Community 80"
Cohesion: 0.23
Nodes (18): Reason(), ActionsCell(), B(), byName(), changesAtOnce(), editBlocked(), formulaText(), monthlyCost() (+10 more)

### Community 81 - "Community 81"
Cohesion: 0.35
Nodes (17): isUnverified(), ruleOn(), esiFor(), gratuityAccrualFor(), isIntern(), labourWelfareFor(), money(), monthOf() (+9 more)

### Community 82 - "Community 82"
Cohesion: 0.21
Nodes (17): admin(), compOffRule(), copy(), DEFAULT_COMP_OFF, DEFAULT_LATE_POLICY, DEFAULT_SHIFT_RULES_FROM, entry(), fail() (+9 more)

### Community 83 - "Community 83"
Cohesion: 0.21
Nodes (14): CHAIN_STAGES, createChain(), holds(), managerCanDecide(), refusal(), isActive(), approvalChainFor(), managerFor() (+6 more)

### Community 84 - "Community 84"
Cohesion: 0.21
Nodes (15): admin(), copy(), DEFAULT_LEAVE_FROM, DEFAULT_STATUTORY_FROM, entry(), fail(), isDay(), isMonth() (+7 more)

### Community 85 - "Community 85"
Cohesion: 0.25
Nodes (16): closeIcon(), createDecisionFlow(), approve(), buildModal(), clearError(), openReject(), showError(), submitReject() (+8 more)

### Community 86 - "Community 86"
Cohesion: 0.15
Nodes (9): clearError(), departmentName(), form, role, save(), SAVED, showError(), STATUS (+1 more)

### Community 87 - "Community 87"
Cohesion: 0.29
Nodes (14): showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme(), onAppearanceChange() (+6 more)

### Community 88 - "Community 88"
Cohesion: 0.25
Nodes (13): ICONS, SECTION_ICONS, initRail(), close(), fit(), open(), inRail(), renderFooter() (+5 more)

### Community 89 - "Community 89"
Cohesion: 0.27
Nodes (12): cell(), Content(), d(), FIELD_LABEL, FIELDS, LeavePolicy(), TYPES, mayOpenLeavePolicy() (+4 more)

### Community 90 - "Community 90"
Cohesion: 0.19
Nodes (10): ALL_LOCATION_PERMISSIONS, LOCATION_PERMISSIONS, PERMISSIONS, LOCATION_GRANTS, OVERRIDABLE, ROLE_KEYS, ROLES, SELF_SERVICE (+2 more)

### Community 91 - "Community 91"
Cohesion: 0.22
Nodes (10): allEvents(), AUDIT_KINDS, AUDIT_LABEL, empty(), eventsFor(), read(), allMail(), empty() (+2 more)

### Community 92 - "Community 92"
Cohesion: 0.24
Nodes (12): allRegularizations(), allExpenses(), getExpense(), asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys() (+4 more)

### Community 93 - "Community 93"
Cohesion: 0.38
Nodes (12): copy(), createCollection(), add(), commit(), get(), getAll(), loadBox(), remove() (+4 more)

### Community 94 - "Community 94"
Cohesion: 0.29
Nodes (12): copy(), deviceLabel(), devicesFor(), deviceToken(), fail(), MAX_DEVICES, mine(), peekDevice() (+4 more)

### Community 95 - "Community 95"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 96 - "Community 96"
Cohesion: 0.22
Nodes (10): ACTION, askWhom(), day(), KIND_HINT, KIND_NAME, STATUS, PRIVACY, assignmentReader() (+2 more)

### Community 97 - "Community 97"
Cohesion: 0.33
Nodes (10): COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS, getCompanyProfile(), loadBox() (+2 more)

### Community 98 - "Community 98"
Cohesion: 0.33
Nodes (10): allOvertimeDecisions(), copy(), decideOvertime(), decideOvertimeItem(), fail(), mayDecideOvertime(), overtimeDecisionsFor(), parseId() (+2 more)

### Community 99 - "Community 99"
Cohesion: 0.20
Nodes (8): FIELD, FIELDS, PAN_HOLDER, PROFILE_SECTIONS, RULES, SECTIONS, VD, VP

### Community 100 - "Community 100"
Cohesion: 0.39
Nodes (7): allCompOff(), compOffFor(), compOffShield(), copy(), creditOvertime(), plusDays(), store

### Community 101 - "Community 101"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 102 - "Community 102"
Cohesion: 0.50
Nodes (4): decider(), useDecision(), approve(), submit()

## Knowledge Gaps
- **1 isolated node(s):** `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 750 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 83` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 16`, `Community 18`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 61`, `Community 62`, `Community 64`, `Community 66`, `Community 67`, `Community 70`, `Community 71`, `Community 74`, `Community 75`, `Community 76`, `Community 77`, `Community 78`, `Community 79`, `Community 80`, `Community 82`, `Community 84`, `Community 86`, `Community 94`, `Community 97`, `Community 98`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `nameOf()` (e.g. with `assetApprovers()` and `names()`) actually correct?**
  _`nameOf()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05673758865248227 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 12`, `Community 15`, `Community 17`, `Community 20`, `Community 23`, `Community 24`, `Community 25`, `Community 30`, `Community 32`, `Community 34`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 54`, `Community 56`, `Community 64`, `Community 67`, `Community 69`, `Community 70`, `Community 71`, `Community 76`, `Community 80`, `Community 89`, `Community 96`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 20` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 11`, `Community 12`, `Community 15`, `Community 24`, `Community 30`, `Community 32`, `Community 34`, `Community 36`, `Community 37`, `Community 39`, `Community 42`, `Community 43`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 51`, `Community 52`, `Community 54`, `Community 55`, `Community 56`, `Community 60`, `Community 64`, `Community 67`, `Community 69`, `Community 79`, `Community 85`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._