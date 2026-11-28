# Graph Report - officeos  (2026-11-28)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 4615 nodes · 21928 edges · 114 communities (111 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 314 edges (avg confidence: 0.85)
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
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112

## God Nodes (most connected - your core abstractions)
1. `getUser()` - 329 edges
2. `el()` - 258 edges
3. `useSession()` - 230 edges
4. `formatDay()` - 218 edges
5. `useData()` - 185 edges
6. `pageUrl()` - 172 edges
7. `nameOf()` - 170 edges
8. `todayIso()` - 140 edges
9. `getAllUsers()` - 139 edges
10. `useToast()` - 139 edges

## Surprising Connections (you probably didn't know these)
- `monthYear()` --calls--> `monthName()`  [EXTRACTED]
  app/src/ui/leaveband.jsx → assets/js/ui/leave-view.js
- `CompanyProfile()` --indirect_call--> `updateCompanyProfile()`  [INFERRED]
  app/src/pages/CompanyProfile.jsx → assets/js/data/company-store.js
- `renderTable()` --indirect_call--> `page()`  [INFERRED]
  assets/js/pages/admin-dashboard.js → app/src/pages/ImportPages.jsx
- `assetWhat()` --calls--> `assetTypeLabel()`  [EXTRACTED]
  app/src/pages/AdminDashboard.jsx → assets/js/ui/inventory-view.js
- `submit()` --indirect_call--> `note()`  [INFERRED]
  app/src/components/Decision.jsx → assets/js/data/visits.js

## Import Cycles
- 2-file cycle: `app/src/components/Confirm.jsx -> app/src/components/Modal.jsx -> app/src/components/Confirm.jsx`
- 2-file cycle: `assets/js/data/holidays.js -> assets/js/data/store.js -> assets/js/data/holidays.js`

## Communities (114 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (177): ApplyLeave(), balanceRows(), ERROR_ID, FOCUS, Kv(), typeMeta(), defaultMonth(), DOW (+169 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (144): itPeople(), BUTTON_LABEL, CONDITION_OPTIONS, DONE_TEXT, full(), MODE_OPTIONS, optionsOf(), overrideField (+136 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (117): StatCard(), StatStrip(), ColumnChart(), NO_DATA, NoData(), flaggedCell(), stampKey(), ACTIVITY_SOURCES (+109 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (124): movementEvent(), row(), recentRow(), buildRow(), logRow(), placeWords(), row(), weekCell() (+116 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (116): chainEvents(), assetTitle(), correctionTitle(), decisionDate(), expenseTitle(), leaveTitle(), LOC_TAB, locationTitle() (+108 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (99): ASSET_FLOW, EXPENSE_FLOW, IT_FLOW, LOCATION_FLOW, OVERTIME_FLOW, PROFILE_FLOW, SALARY_FLOW, timeOf() (+91 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (81): EmptyState(), Tabs(), ConfirmContext, ConfirmDialog(), ConfirmProvider(), DateRange(), DownloadMenu(), FilterBar() (+73 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (81): signOutNow(), refreshPrefs(), NotPorted(), About(), Appearance(), AppearancePanel(), options(), Row() (+73 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (82): described(), Field(), Input(), Select(), Switch(), TextArea(), Modal(), bump() (+74 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (84): assetApprovers(), BADGE_TEXT, correctionTitle(), expenseTitle(), FromNode(), IT_TAB, MyRequests(), names() (+76 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (80): assetsFor(), chainText(), clearError(), clearReportError(), FIELD, fillReplaces(), form, ICON (+72 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (75): initialsOf(), Kv(), Card(), tabTitle(), ACTION, askWhom(), ChangeForm(), Content() (+67 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (71): acquireFileUrl(), guardViewer(), live, releaseFileUrl(), revokeAllFileUrls(), useFileUrl(), Avatar(), initialsOf() (+63 more)

### Community 13 - "Community 13"
Cohesion: 0.09
Nodes (68): BarRows(), useCan(), ImportEmployees(), SPEC, page(), Content(), ItDashboard(), percentOf() (+60 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (72): Badge(), Icon(), PersonCell(), Stepper(), CORRECTION_FLOW, DecisionButtons(), LEAVE_FLOW, leaveWhat() (+64 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (71): CSV_LIMITS, decodeText(), RFC-4180, parseCsv(), protectCell(), quote(), toCsv(), tooMany() (+63 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (69): preview(), BAND_NAME, BandBadge(), bandChange(), bandText(), days(), describePolicy(), Explain() (+61 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (71): active(), addAsset(), addVendor(), ASSET_FIELDS, assetEvents(), assetFields(), assetsNotReturned(), assignmentHistory() (+63 more)

### Community 18 - "Community 18"
Cohesion: 0.06
Nodes (53): MAX_QTY, ISSUES, anyDate(), ASSET_COLUMNS, assetApplyRow(), ASSETS_FORM, byName(), categoryOf() (+45 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (66): addItDepartment(), addUser(), adminOnly(), approvedMonthCovering(), approvedMonths(), approvedRunMonths(), approvedRuns(), approvesRun() (+58 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (49): decider(), approve(), submit(), ok, ALSO_FOR_MANAGERS, ROUTES, getCurrentRole(), getCurrentUserId() (+41 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (54): monthLabel(), now(), pct(), SalaryPlan(), slabRows(), slabText(), TaxExplain(), UnverifiedNote() (+46 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (25): git(), area_for(), catalog(), header(), index_page(), job_suite(), load_suites(), main() (+17 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (53): recordsStart(), correctionContext(), NIGHT_WINDOW_DEFAULT, NIGHT_WINDOW_MAX, nightCheckOutJudge(), nightFixHours(), nightFixWindow(), resetNightFix() (+45 more)

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (56): b64(), b64url(), blank(), changeOwnPassword(), checkToken(), COMMON_PASSWORDS, countFailure(), createAccount() (+48 more)

### Community 25 - "Community 25"
Cohesion: 0.10
Nodes (51): AssetAssignment(), ITEMS, tagLink(), WARRANTY_DAYS, Inventory(), List(), PAGE, WARRANTY_OPTIONS (+43 more)

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (55): applyPermissions(), allAssets(), assetsHeldByInactive(), assetsWithOpenReports(), assetTotals(), assetTypeOf(), openReportOf(), ACTIONS (+47 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (52): approverNames(), absencesIn(), actorWith(), approveProblem(), approversFor(), approves(), awayThrough(), byName() (+44 more)

### Community 28 - "Community 28"
Cohesion: 0.08
Nodes (43): COMPLETE_DETAILS, APP_NAV, APP_OTHER_PAGES, APP_OWN, COMPLETE_ITEM, mayOpenLeavePolicy(), mayOpenOutbox(), mayOpenTeamVisits() (+35 more)

### Community 29 - "Community 29"
Cohesion: 0.09
Nodes (46): AreaChart(), AreaPlot, BarChart(), BarPlot, DonutChart(), DonutPlot, fillLegend(), Frame() (+38 more)

### Community 30 - "Community 30"
Cohesion: 0.10
Nodes (47): parts(), runRows(), withNewEngine(), alertText(), B(), checks(), dayOf(), DONE (+39 more)

### Community 31 - "Community 31"
Cohesion: 0.11
Nodes (41): useConfirm(), useDecision(), getVersion(), listeners, subscribe(), useVersion(), Content(), MyVisits() (+33 more)

### Community 32 - "Community 32"
Cohesion: 0.12
Nodes (47): viewOf(), active(), allProfileChanges(), BANK_KEYS, bankTogether(), canReveal(), canSee(), changeText() (+39 more)

### Community 33 - "Community 33"
Cohesion: 0.09
Nodes (45): changeFor(), stockStatus(), stockValue(), actorWith(), allMovements(), ASSET_REFERENCE, assets, assignAsset() (+37 more)

### Community 34 - "Community 34"
Cohesion: 0.08
Nodes (40): ASIDE, byId(), decidedAt(), recordedTime(), Regularization(), row(), tabRequests(), TABS (+32 more)

### Community 35 - "Community 35"
Cohesion: 0.09
Nodes (39): assetActions(), ASSET_CATEGORY_KEYS, ASSET_STATE_KEYS, ASSET_STATES, canMove(), DATE_MAX, DATE_MIN, EMAIL (+31 more)

### Community 36 - "Community 36"
Cohesion: 0.10
Nodes (38): ALLOWED, applyPrefs(), carryOver(), changed(), clean(), darkDevice(), DEFAULTS, DENSITIES (+30 more)

### Community 37 - "Community 37"
Cohesion: 0.18
Nodes (40): hasPermission(), ACCURACY_FLAG_M, ACCURACY_REFUSE_M, active(), ADDRESS_MAX, assignVisit(), build(), cancelVisit() (+32 more)

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (37): resetCompanyProfile(), deviceLabel(), resetAllDevices(), sharedWith(), ACCURACY_LIMIT_M, active(), answer(), applyChange() (+29 more)

### Community 39 - "Community 39"
Cohesion: 0.12
Nodes (34): FLAG_EXPORT, FLAG_LABEL, flagText(), iconOfPlace(), metres(), PLACE_ICON, PLACE_LABEL, placeLabel() (+26 more)

### Community 40 - "Community 40"
Cohesion: 0.13
Nodes (36): qtyHundredths(), REASON_MAX, REASON_MIN, REVERSE_KIND, STOCK_KINDS, stockApplyRow(), stockContext(), CATEGORIES (+28 more)

### Community 41 - "Community 41"
Cohesion: 0.10
Nodes (35): deactivateUser(), actions, cardTitled(), closeIcon(), daysAway(), deactivateDialog(), deleteBtn, departmentName() (+27 more)

### Community 42 - "Community 42"
Cohesion: 0.15
Nodes (35): activeUser(), allAssignmentRows(), allDepartmentDefaults(), allSwaps(), assignMany(), assignmentsFor(), assignRow(), assignShift() (+27 more)

### Community 43 - "Community 43"
Cohesion: 0.12
Nodes (30): Segmented(), ABOUT, Content(), ExportData(), firstOfMonth(), MAX, Content(), ExportPay() (+22 more)

### Community 44 - "Community 44"
Cohesion: 0.16
Nodes (33): byName(), chain, checkInPlan(), checkInRefusal(), clockLabel(), context(), correctionProblem(), dayFor() (+25 more)

### Community 45 - "Community 45"
Cohesion: 0.09
Nodes (34): checkInWindow(), nowMinutes(), clock, errorLine, grace, inBtn, lateMarks, lateNote (+26 more)

### Community 46 - "Community 46"
Cohesion: 0.16
Nodes (28): NO_DATA, useData(), CompleteDialog(), LicenceDialog(), AssignButton(), Content(), MyTodo(), NONE (+20 more)

### Community 47 - "Community 47"
Cohesion: 0.14
Nodes (32): ClaimExpense(), needsReceipt(), applied(), approverMustPay(), at(), auto(), averageProcessingDays(), by() (+24 more)

### Community 48 - "Community 48"
Cohesion: 0.12
Nodes (27): deviceLine(), CheckInPlaces(), departmentName(), initialsFrom(), Kv(), MyDevices(), onDay(), orDash() (+19 more)

### Community 49 - "Community 49"
Cohesion: 0.09
Nodes (31): allItems(), movementEvent(), clearError(), deptField, deptSelect, EMPTY, FIELD, fillDepartments() (+23 more)

### Community 50 - "Community 50"
Cohesion: 0.15
Nodes (29): CHAIN, closeAssetRequest(), decideAssetRequest(), fulfilAssetRequest(), holdersOf(), holdsStage(), isActive(), isHeldFor() (+21 more)

### Community 51 - "Community 51"
Cohesion: 0.11
Nodes (29): addRule(), admin(), ALL, allRules(), CONFIDENCE, copy(), entry(), fail() (+21 more)

### Community 52 - "Community 52"
Cohesion: 0.14
Nodes (30): Content(), departmentName(), plural(), RESET_CONFIRM, roleLabel(), STATUS, statusLabel(), TABS (+22 more)

### Community 53 - "Community 53"
Cohesion: 0.08
Nodes (23): FIELD, FIELDS, PAN_HOLDER, PROFILE_SECTIONS, RULES, SECTIONS, VD, VP (+15 more)

### Community 54 - "Community 54"
Cohesion: 0.10
Nodes (30): addDays(), activity, activityText(), approvalsList, approvalsMeta, chart, leaveNote, leaveRange (+22 more)

### Community 55 - "Community 55"
Cohesion: 0.08
Nodes (29): ASSET_STATUS_KEYS, ASSET_STATUSES, ASSET_TYPE_KEYS, ASSET_TYPES, CATEGORY_KEYS, CONDITION_KEYS, LOCATION_KEYS, LOCATIONS (+21 more)

### Community 56 - "Community 56"
Cohesion: 0.13
Nodes (30): canApprove(), alertText(), askedMonth, attendanceCheck(), buildRow(), checkItem(), dayOf(), monthLabel() (+22 more)

### Community 57 - "Community 57"
Cohesion: 0.12
Nodes (25): buildRecord(), clearError(), defaultRoleInput, designationSelect, editId, field(), form, managerChoice() (+17 more)

### Community 58 - "Community 58"
Cohesion: 0.13
Nodes (28): allAssetRequests(), allExpenses(), asRequest(), DECIDED, decisionDays(), DECISIONS, monthKeys(), PASSED (+20 more)

### Community 59 - "Community 59"
Cohesion: 0.13
Nodes (27): getAssetRequest(), getRegularization(), getRequest(), bellItem(), buildCard(), buildPanel(), cardState(), CHAIN_STAGE (+19 more)

### Community 60 - "Community 60"
Cohesion: 0.15
Nodes (26): copy(), createOffice(), deactivateOffice(), EDITABLE, fail(), getOffice(), headOffice(), manager() (+18 more)

### Community 61 - "Community 61"
Cohesion: 0.13
Nodes (28): actionsCell(), claimsText(), decidableIds(), EMPTY, entryOf(), lastAt(), matches(), muted() (+20 more)

### Community 62 - "Community 62"
Cohesion: 0.16
Nodes (24): COMPANY, PRODUCT, AuthLayout(), BrandPanel(), DEMO_USERS, ForgotPassword(), landingOf(), LinkPage() (+16 more)

### Community 63 - "Community 63"
Cohesion: 0.11
Nodes (26): registerBox, sample(), SAMPLE_AT(), ASSET_CATEGORIES, addDays(), at(), buildImport(), CONDITIONS (+18 more)

### Community 64 - "Community 64"
Cohesion: 0.13
Nodes (27): SALARY_COMPONENTS, allRows, byName(), changeButtons(), changesAtOnce(), closeIcon(), currentRows(), editBlocked() (+19 more)

### Community 65 - "Community 65"
Cohesion: 0.19
Nodes (27): payslipTotals(), amount(), approved(), buildRow(), field(), financialYear(), joinedNote(), label() (+19 more)

### Community 66 - "Community 66"
Cohesion: 0.15
Nodes (27): copy(), createShift(), deactivateShift(), entry(), fail(), firstProblem(), hours(), isInt() (+19 more)

### Community 67 - "Community 67"
Cohesion: 0.12
Nodes (26): getDepartment(), activeInput, addBtn, buildCard(), clearError(), codeInput, descEl, el() (+18 more)

### Community 68 - "Community 68"
Cohesion: 0.14
Nodes (23): subscribePrefs(), initialsFrom(), inRail(), RAIL, useMedia(), apply(), listeners, NAV_KEY (+15 more)

### Community 69 - "Community 69"
Cohesion: 0.15
Nodes (25): itItem(), waitingCount(), waitingFor(), resetCompOff(), pendingLocationChanges(), allOvertimeDecisions(), copy(), decideOvertime() (+17 more)

### Community 70 - "Community 70"
Cohesion: 0.13
Nodes (22): GROUPS, Holder(), matrixGroups(), RoleEditor(), ROLES_LIST, Tick(), ALL_LOCATION_PERMISSIONS, ALL_PERMISSIONS (+14 more)

### Community 71 - "Community 71"
Cohesion: 0.11
Nodes (26): resetInventoryData(), avatarClass(), buildRow(), departmentName(), departmentSelect, deptParam, el(), emptyRow() (+18 more)

### Community 72 - "Community 72"
Cohesion: 0.26
Nodes (25): compareRegimes(), hraExemption(), money(), oldRegimeDeductions(), payMonth(), taxOn(), tdsFor(), trace() (+17 more)

### Community 73 - "Community 73"
Cohesion: 0.15
Nodes (24): stockBarPercent(), reorderAlerts(), byCategory(), categoryCell(), ICON, icon(), itemCell(), matches() (+16 more)

### Community 74 - "Community 74"
Cohesion: 0.16
Nodes (21): badgeOf(), showEmployerBox(), slipsFor(), approved(), listed(), missingMonthText(), monthLabel(), notesOf() (+13 more)

### Community 75 - "Community 75"
Cohesion: 0.14
Nodes (21): save(), allEvents(), AUDIT_KINDS, AUDIT_LABEL, empty(), eventsFor(), read(), createdOnOf() (+13 more)

### Community 76 - "Community 76"
Cohesion: 0.18
Nodes (23): ATTENDANCE_RULES, approved(), asked, field(), linkBack(), listed(), missingMonthText(), monthLabel() (+15 more)

### Community 77 - "Community 77"
Cohesion: 0.21
Nodes (17): NotBuilt(), detachedRows(), Row(), Table(), tdClass(), text(), ChangePassword(), Password() (+9 more)

### Community 78 - "Community 78"
Cohesion: 0.15
Nodes (21): Actions(), BADGE, claimsText(), EMPTY, entryOf(), Expenses(), ICONS, lastAt() (+13 more)

### Community 79 - "Community 79"
Cohesion: 0.13
Nodes (21): balanceTable, calendarCard, CAPPED, dayCell(), inView(), isOff(), month, outCard (+13 more)

### Community 80 - "Community 80"
Cohesion: 0.16
Nodes (18): FIELD_ID, CATEGORIES, CATEGORY_KEYS, chainFor(), EXPENSE_POLICY, STAGES, waitingOn(), renderWhoApproves() (+10 more)

### Community 81 - "Community 81"
Cohesion: 0.16
Nodes (19): CAP(), DAY_STATUS, DURATION, iso(), monthsIn(), overlaps(), pad(), people() (+11 more)

### Community 82 - "Community 82"
Cohesion: 0.23
Nodes (19): slipTotals(), amount(), approved(), financialYear(), ICONS, joinedNote(), label(), MessageRow() (+11 more)

### Community 83 - "Community 83"
Cohesion: 0.19
Nodes (19): activityItems(), claimItems(), claimText(), EVENT, FinanceDashboard(), Icon(), ICONS, monthlyRuns() (+11 more)

### Community 84 - "Community 84"
Cohesion: 0.28
Nodes (19): MODES, storedRecord(), shiftDayFor(), completeShiftDay(), fail(), inPlan(), nextCheckIn(), outPlan() (+11 more)

### Community 85 - "Community 85"
Cohesion: 0.14
Nodes (19): amountInput, categorySelect, chainList, clearError(), currentAmount(), dateInput, FIELD, form (+11 more)

### Community 86 - "Community 86"
Cohesion: 0.24
Nodes (18): Reason(), ActionsCell(), B(), byName(), changesAtOnce(), editBlocked(), formulaText(), monthlyCost() (+10 more)

### Community 87 - "Community 87"
Cohesion: 0.20
Nodes (17): annualTax(), computePay(), FILING_SAMPLE, filingDates(), lastDay(), leap(), lossOfPayAmount(), lossOfPayDays() (+9 more)

### Community 88 - "Community 88"
Cohesion: 0.20
Nodes (18): admin(), compOffRule(), copy(), DEFAULT_COMP_OFF, DEFAULT_LATE_POLICY, DEFAULT_SHIFT_RULES_FROM, entry(), fail() (+10 more)

### Community 89 - "Community 89"
Cohesion: 0.20
Nodes (17): active(), cellOf(), DATE_KEYS, dayNumberOf(), EXPORT_LIMIT, EXPORT_MODULES, exportColumns(), exportFile() (+9 more)

### Community 90 - "Community 90"
Cohesion: 0.25
Nodes (15): accountOf(), unlockAccount(), fail(), lockedOnly(), mayUnlock(), pendingUnlockRequests(), resolveUnlockRequest(), stillLocked() (+7 more)

### Community 91 - "Community 91"
Cohesion: 0.14
Nodes (10): DEPARTMENTS, clearError(), departmentName(), form, role, save(), SAVED, showError() (+2 more)

### Community 92 - "Community 92"
Cohesion: 0.22
Nodes (13): companyInitial(), signInAs(), clearError(), DEMO_USERS, escapeHtml(), MAIN, PublicPage(), RAW (+5 more)

### Community 93 - "Community 93"
Cohesion: 0.20
Nodes (16): attendance, checkIn(), checkOut(), checkOutPlan(), checkOutRefusal(), completedSeedDay(), fromMinutes(), generatedRecord() (+8 more)

### Community 94 - "Community 94"
Cohesion: 0.29
Nodes (14): showSavedTheme(), themeRadios, announce(), applyAccent(), applyTheme(), deviceScheme(), loadTheme(), onAppearanceChange() (+6 more)

### Community 95 - "Community 95"
Cohesion: 0.24
Nodes (15): cellText(), COLUMNS, csvCell(), csvText(), downloadCsv(), exportStatsAsCsv(), exportTableAsCsv(), isDataColumn() (+7 more)

### Community 96 - "Community 96"
Cohesion: 0.16
Nodes (3): initScrollHints(), ToastContext, ToastProvider()

### Community 97 - "Community 97"
Cohesion: 0.25
Nodes (11): NAV, OTHER_PAGES, buildOption(), closeIcon(), iconButton(), matchingPeople(), renderSearch(), close() (+3 more)

### Community 98 - "Community 98"
Cohesion: 0.29
Nodes (13): applyCorrection(), checkAgainstRecord(), dayRefusal(), decideRegularization(), isValidTime(), recordOf(), requestRegularization(), writeCompletedDay() (+5 more)

### Community 99 - "Community 99"
Cohesion: 0.28
Nodes (11): allVendors(), byId(), contactLine(), matches(), renderTable(), row(), tbody, vendorCell() (+3 more)

### Community 100 - "Community 100"
Cohesion: 0.26
Nodes (10): PAY_RULES, TAX_SAMPLE, amountCell(), calendarItem(), dueCell(), people(), render(), renderCalendar() (+2 more)

### Community 101 - "Community 101"
Cohesion: 0.33
Nodes (11): addBack(), addMore(), cellKinds(), DETAIL_PAGES, headText(), initPhone(), isActions(), labelTable() (+3 more)

### Community 102 - "Community 102"
Cohesion: 0.36
Nodes (10): getCurrentUser(), initRail(), close(), fit(), open(), inRail(), renderFooter(), renderProfile() (+2 more)

### Community 103 - "Community 103"
Cohesion: 0.44
Nodes (11): copy(), createCollection(), add(), commit(), get(), getAll(), loadBox(), remove() (+3 more)

### Community 104 - "Community 104"
Cohesion: 0.33
Nodes (10): COMPANY_LIMITS, companyName(), copy(), fail(), fieldProblem(), FIELDS, getCompanyProfile(), loadBox() (+2 more)

### Community 105 - "Community 105"
Cohesion: 0.33
Nodes (7): CHAIN_STAGES, createChain(), holds(), managerCanDecide(), refusal(), isActive(), skippedEntry()

### Community 106 - "Community 106"
Cohesion: 0.29
Nodes (6): clearError(), form, showError(), clearError(), form, showError()

### Community 107 - "Community 107"
Cohesion: 0.33
Nodes (3): LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_TYPES

### Community 108 - "Community 108"
Cohesion: 0.53
Nodes (5): allMail(), empty(), links, queueMail(), read()

### Community 109 - "Community 109"
Cohesion: 0.53
Nodes (5): belowHundred(), belowThousand(), ONES, rupeesInWords(), TENS

### Community 112 - "Community 112"
Cohesion: 1.00
Nodes (3): closeAllDropdowns(), initDropdowns(), triggerOf()

## Knowledge Gaps
- **2 isolated node(s):** `RFC-4180`, `RFC-4180`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 951 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getUser()` connect `Community 50` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 19`, `Community 20`, `Community 21`, `Community 23`, `Community 24`, `Community 26`, `Community 27`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 47`, `Community 48`, `Community 51`, `Community 54`, `Community 56`, `Community 57`, `Community 58`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 69`, `Community 74`, `Community 75`, `Community 76`, `Community 78`, `Community 79`, `Community 80`, `Community 82`, `Community 83`, `Community 84`, `Community 85`, `Community 86`, `Community 88`, `Community 89`, `Community 90`, `Community 91`, `Community 93`, `Community 98`, `Community 102`, `Community 104`, `Community 105`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **What connects `RFC-4180`, `RFC-4180` to the rest of the system?**
  _2 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.031037489102005232 - nodes in this community are weakly interconnected._
- **Why does `el()` connect `Community 3` to `Community 0`, `Community 2`, `Community 4`, `Community 8`, `Community 9`, `Community 10`, `Community 14`, `Community 26`, `Community 34`, `Community 41`, `Community 45`, `Community 49`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 61`, `Community 64`, `Community 65`, `Community 70`, `Community 73`, `Community 76`, `Community 79`, `Community 80`, `Community 83`, `Community 85`, `Community 87`, `Community 99`, `Community 100`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05548098434004474 - nodes in this community are weakly interconnected._
- **Why does `formatDay()` connect `Community 4` to `Community 0`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 14`, `Community 16`, `Community 21`, `Community 25`, `Community 26`, `Community 29`, `Community 30`, `Community 31`, `Community 34`, `Community 41`, `Community 48`, `Community 54`, `Community 55`, `Community 56`, `Community 58`, `Community 59`, `Community 61`, `Community 64`, `Community 65`, `Community 74`, `Community 76`, `Community 78`, `Community 79`, `Community 80`, `Community 82`, `Community 83`, `Community 86`, `Community 100`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.04032809295967191 - nodes in this community are weakly interconnected._