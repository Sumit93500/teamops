# usage: powershell -File run-suites.ps1 <suite dir (has *.mjs and js\)> <pages dir> <output dir>
param([string]$P, [string]$Pages, [string]$O)
New-Item -ItemType Directory -Force $O | Out-Null
Set-Location $P
$pattern = [regex]'(\d+) passed, (\d+) failed'
function Run($name, [string[]]$cmd) {
  $out = & node @cmd 2>&1 | Out-String
  $out | Set-Content -Encoding utf8 (Join-Path $O "$name.txt")
  $p = 0; $f = 0
  foreach ($m in $pattern.Matches($out)) { $p += [int]$m.Groups[1].Value; $f += [int]$m.Groups[2].Value }
  "{0,-32} exit={1}  {2} passed, {3} failed" -f $name, $LASTEXITCODE, $p, $f
}
$env:TZ = $null
Run "store" @("store.mjs")
Run "users-list" @("users-list.mjs", "R")
foreach ($r in "admin", "fin", "hr") { Run "user-profile-$r" @("user-profile.mjs", $r) }
foreach ($s in "admin", "hr", "fin", "emp", "edited", "old") { Run "my-profile-$s" @("my-profile.mjs", $s) }
Run "departments" @("departments.mjs")
if (Test-Path "reset-button.mjs") { Run "reset-button" @("reset-button.mjs") }
foreach ($tz in "Asia/Kolkata", "UTC", "America/Los_Angeles") {
  $env:TZ = $tz
  $t = $tz.Replace("/", "-")
  if (Test-Path "attendance.mjs") { Run "attendance-$t" @("attendance.mjs") }
  if (Test-Path "mark.mjs") { Run "mark-$t" @("mark.mjs", $Pages) }
  if (Test-Path "myatt.mjs") { Run "myatt-$t" @("myatt.mjs", $Pages) }
  if (Test-Path "reg.mjs") { Run "reg-$t" @("reg.mjs", $Pages) }
  if (Test-Path "team.mjs") { Run "team-$t" @("team.mjs", $Pages) }
  if (Test-Path "view.mjs") { Run "view-$t" @("view.mjs", $Pages) }
  if (Test-Path "decision.mjs") { Run "decision-$t" @("decision.mjs", $Pages) }
  if (Test-Path "shared.mjs") { Run "shared-$t" @("shared.mjs", $Pages) }
  if (Test-Path "cells.mjs") { Run "cells-$t" @("cells.mjs", $Pages) }
  if (Test-Path "issues.mjs") { Run "issues-$t" @("issues.mjs", $Pages) }
  if (Test-Path "payroll.mjs") { Run "payroll-$t" @("payroll.mjs", $Pages) }
  if (Test-Path "payrun.mjs") { Run "payrun-$t" @("payrun.mjs", $Pages) }
  if (Test-Path "payslip.mjs") { Run "payslip-$t" @("payslip.mjs", $Pages) }
  if (Test-Path "salary.mjs") { Run "salary-$t" @("salary.mjs", $Pages) }
  if (Test-Path "adjacent.mjs") { Run "adjacent-$t" @("adjacent.mjs", $Pages) }
  if (Test-Path "expenses.mjs") { Run "expenses-$t" @("expenses.mjs", $Pages) }
  if (Test-Path "exppage.mjs") { Run "exppage-$t" @("exppage.mjs", $Pages) }
  if (Test-Path "expinbox.mjs") { Run "expinbox-$t" @("expinbox.mjs", $Pages) }
  if (Test-Path "expclaim.mjs") { Run "expclaim-$t" @("expclaim.mjs", $Pages) }
  if (Test-Path "inventory.mjs") { Run "inventory-$t" @("inventory.mjs", $Pages) }
  if (Test-Path "invpages.mjs") { Run "invpages-$t" @("invpages.mjs", $Pages) }
  if (Test-Path "assetpages.mjs") { Run "assetpages-$t" @("assetpages.mjs", $Pages) }
  if (Test-Path "assetreq.mjs") { Run "assetreq-$t" @("assetreq.mjs", $Pages) }
  if (Test-Path "vendorpages.mjs") { Run "vendorpages-$t" @("vendorpages.mjs", $Pages) }
  if (Test-Path "backlog.mjs") { Run "backlog-$t" @("backlog.mjs", $Pages) }
  if (Test-Path "roleview.mjs") { Run "roleview-$t" @("roleview.mjs", $Pages) }
  if (Test-Path "closeout.mjs") { Run "closeout-$t" @("closeout.mjs", $Pages) }
  if (Test-Path "rules.mjs") { Run "rules-$t" @("rules.mjs", $Pages) }
  if (Test-Path "payclock.mjs") { Run "payclock-$t" @("payclock.mjs", $Pages) }
  if (Test-Path "leftovers.mjs") { Run "leftovers-$t" @("leftovers.mjs", $Pages) }
  if (Test-Path "forward.mjs") { Run "forward-$t" @("forward.mjs", $Pages) }
  if (Test-Path "chain.mjs") { Run "chain-$t" @("chain.mjs", $Pages) }
  if (Test-Path "absence.mjs") { Run "absence-$t" @("absence.mjs", $Pages) }
  if (Test-Path "periods.mjs") { Run "periods-$t" @("periods.mjs", $Pages) }
  if (Test-Path "boards.mjs") { Run "boards-$t" @("boards.mjs", $Pages) }
  if (Test-Path "findash.mjs") { Run "findash-$t" @("findash.mjs", $Pages) }
  if (Test-Path "taxlabel.mjs") { Run "taxlabel-$t" @("taxlabel.mjs", $Pages) }
  if (Test-Path "dots.mjs") { Run "dots-$t" @("dots.mjs", $Pages) }
  if (Test-Path "labels.mjs") { Run "labels-$t" @("labels.mjs", $Pages) }
  if (Test-Path "claims.mjs") { Run "claims-$t" @("claims.mjs", $Pages) }
  if (Test-Path "deferred.mjs") { Run "deferred-$t" @("deferred.mjs", $Pages) }
  if (Test-Path "remnants.mjs") { Run "remnants-$t" @("remnants.mjs", $Pages) }
  if (Test-Path "fictional.mjs") { Run "fictional-$t" @("fictional.mjs", $Pages) }
  if (Test-Path "generic.mjs") { Run "generic-$t" @("generic.mjs", $Pages) }
  if (Test-Path "roster.mjs") { Run "roster-$t" @("roster.mjs", $Pages) }
  if (Test-Path "holders.mjs") { Run "holders-$t" @("holders.mjs", $Pages) }
  if (Test-Path "adminguard.mjs") { Run "adminguard-$t" @("adminguard.mjs", $Pages) }
  if (Test-Path "managerid.mjs") { Run "managerid-$t" @("managerid.mjs", $Pages) }
  if (Test-Path "demoteguard.mjs") { Run "demoteguard-$t" @("demoteguard.mjs", $Pages) }
  if (Test-Path "deactguard.mjs") { Run "deactguard-$t" @("deactguard.mjs", $Pages) }
  if (Test-Path "handover.mjs") { Run "handover-$t" @("handover.mjs", $Pages) }
  if (Test-Path "joinguard.mjs") { Run "joinguard-$t" @("joinguard.mjs", $Pages) }
  if (Test-Path "holileave.mjs") { Run "holileave-$t" @("holileave.mjs", $Pages) }
  if (Test-Path "taxnote.mjs") { Run "taxnote-$t" @("taxnote.mjs", $Pages) }
  if (Test-Path "mgrfall.mjs") { Run "mgrfall-$t" @("mgrfall.mjs", $Pages) }
  if (Test-Path "workedday.mjs") { Run "workedday-$t" @("workedday.mjs", $Pages) }
  if (Test-Path "holiguard.mjs") { Run "holiguard-$t" @("holiguard.mjs", $Pages) }
  if (Test-Path "deptguard.mjs") { Run "deptguard-$t" @("deptguard.mjs", $Pages) }
  if (Test-Path "userguard.mjs") { Run "userguard-$t" @("userguard.mjs", $Pages) }
  if (Test-Path "acctpages.mjs") { Run "acctpages-$t" @("acctpages.mjs", $Pages) }
  if (Test-Path "authpages.mjs") { Run "authpages-$t" @("authpages.mjs", $Pages) }
  if (Test-Path "pagenotes.mjs") { Run "pagenotes-$t" @("pagenotes.mjs", $Pages) }
  if (Test-Path "signnotes.mjs") { Run "signnotes-$t" @("signnotes.mjs", $Pages) }
  if (Test-Path "resetnotes.mjs") { Run "resetnotes-$t" @("resetnotes.mjs", $Pages) }
  if (Test-Path "authnotes.mjs") { Run "authnotes-$t" @("authnotes.mjs", $Pages) }
  if (Test-Path "sweepnotes.mjs") { Run "sweepnotes-$t" @("sweepnotes.mjs", $Pages) }
  if (Test-Path "roadnotes.mjs") { Run "roadnotes-$t" @("roadnotes.mjs", $Pages) }
  if (Test-Path "recordrole.mjs") { Run "recordrole-$t" @("recordrole.mjs", $Pages) }
  if (Test-Path "overrides.mjs") { Run "overrides-$t" @("overrides.mjs", $Pages) }
  if (Test-Path "payruns.mjs") { Run "payruns-$t" @("payruns.mjs", $Pages) }
  if (Test-Path "paygate.mjs") { Run "paygate-$t" @("paygate.mjs", $Pages) }
  if (Test-Path "latepause.mjs") { Run "latepause-$t" @("latepause.mjs", $Pages) }
  if (Test-Path "leavebal.mjs") { Run "leavebal-$t" @("leavebal.mjs", $Pages) }
  if (Test-Path "leavers.mjs") { Run "leavers-$t" @("leavers.mjs", $Pages) }
  if (Test-Path "stranded.mjs") { Run "stranded-$t" @("stranded.mjs", $Pages) }
  if (Test-Path "accesscard.mjs") { Run "accesscard-$t" @("accesscard.mjs", $Pages) }
  if (Test-Path "leftreqs.mjs") { Run "leftreqs-$t" @("leftreqs.mjs", $Pages) }
  if (Test-Path "unpaid.mjs") { Run "unpaid-$t" @("unpaid.mjs", $Pages) }
  if (Test-Path "joiners.mjs") { Run "joiners-$t" @("joiners.mjs", $Pages) }
  if (Test-Path "joindate.mjs") { Run "joindate-$t" @("joindate.mjs", $Pages) }
  if (Test-Path "reactivate.mjs") { Run "reactivate-$t" @("reactivate.mjs", $Pages) }
  if (Test-Path "rejoin.mjs") { Run "rejoin-$t" @("rejoin.mjs", $Pages) }
  if (Test-Path "gap.mjs") { Run "gap-$t" @("gap.mjs", $Pages) }
  if (Test-Path "nottheirs.mjs") { Run "nottheirs-$t" @("nottheirs.mjs", $Pages) }
  if (Test-Path "decidegap.mjs") { Run "decidegap-$t" @("decidegap.mjs", $Pages) }
  if (Test-Path "leftpages.mjs") { Run "leftpages-$t" @("leftpages.mjs", $Pages) }
  if (Test-Path "notjoined.mjs") { Run "notjoined-$t" @("notjoined.mjs", $Pages) }
  if (Test-Path "comeback.mjs") { Run "comeback-$t" @("comeback.mjs", $Pages) }
  if (Test-Path "firstleft.mjs") { Run "firstleft-$t" @("firstleft.mjs", $Pages) }
  if (Test-Path "bothdates.mjs") { Run "bothdates-$t" @("bothdates.mjs", $Pages) }
  if (Test-Path "newstarts.mjs") { Run "newstarts-$t" @("newstarts.mjs", $Pages) }
  if (Test-Path "tenure.mjs") { Run "tenure-$t" @("tenure.mjs", $Pages) }
  if (Test-Path "statuses.mjs") { Run "statuses-$t" @("statuses.mjs", $Pages) }
  if (Test-Path "heldassets.mjs") { Run "heldassets-$t" @("heldassets.mjs", $Pages) }
  if (Test-Path "delheld.mjs") { Run "delheld-$t" @("delheld.mjs", $Pages) }
  if (Test-Path "newhire.mjs") { Run "newhire-$t" @("newhire.mjs", $Pages) }
  if (Test-Path "salwrite.mjs") { Run "salwrite-$t" @("salwrite.mjs", $Pages) }
  if (Test-Path "saledit.mjs") { Run "saledit-$t" @("saledit.mjs", $Pages) }
  if (Test-Path "salchain.mjs") { Run "salchain-$t" @("salchain.mjs", $Pages) }
  if (Test-Path "salpage.mjs") { Run "salpage-$t" @("salpage.mjs", $Pages) }
  if (Test-Path "salinbox.mjs") { Run "salinbox-$t" @("salinbox.mjs", $Pages) }
  if (Test-Path "relief.mjs") { Run "relief-$t" @("relief.mjs", $Pages) }
  if (Test-Path "tdsyear.mjs") { Run "tdsyear-$t" @("tdsyear.mjs", $Pages) }
  if (Test-Path "wfsalary.mjs") { Run "wfsalary-$t" @("wfsalary.mjs", $Pages) }
  if (Test-Path "delopen.mjs") { Run "delopen-$t" @("delopen.mjs", $Pages) }
  if (Test-Path "delnames.mjs") { Run "delnames-$t" @("delnames.mjs", $Pages) }
  if (Test-Path "sessrole.mjs") { Run "sessrole-$t" @("sessrole.mjs", $Pages) }
  if (Test-Path "resetcard.mjs") { Run "resetcard-$t" @("resetcard.mjs", $Pages) }
  if (Test-Path "delask.mjs") { Run "delask-$t" @("delask.mjs", $Pages) }
  if (Test-Path "holipast.mjs") { Run "holipast-$t" @("holipast.mjs", $Pages) }
  if (Test-Path "legend.mjs") { Run "legend-$t" @("legend.mjs", $Pages) }
  if (Test-Path "cssguard.mjs") { Run "cssguard-$t" @("cssguard.mjs", $Pages) }
  if (Test-Path "pagefreeze.mjs") { Run "pagefreeze-$t" @("pagefreeze.mjs", $Pages) }
  if (Test-Path "jsguard.mjs") { Run "jsguard-$t" @("jsguard.mjs", $Pages) }
  if (Test-Path "noflash.mjs") { Run "noflash-$t" @("noflash.mjs", $Pages) }
  if (Test-Path "rail.mjs") { Run "rail-$t" @("rail.mjs", $Pages) }
  if (Test-Path "phone.mjs") { Run "phone-$t" @("phone.mjs", $Pages) }
  if (Test-Path "findsort.mjs") { Run "findsort-$t" @("findsort.mjs", $Pages) }
  if (Test-Path "closing.mjs") { Run "closing-$t" @("closing.mjs", $Pages) }
  if (Test-Path "cardbell.mjs") { Run "cardbell-$t" @("cardbell.mjs", $Pages) }
  if (Test-Path "bellphone.mjs") { Run "bellphone-$t" @("bellphone.mjs", $Pages) }
  if (Test-Path "reasons.mjs") { Run "reasons-$t" @("reasons.mjs", $Pages) }
  if (Test-Path "reasons2.mjs") { Run "reasons2-$t" @("reasons2.mjs", $Pages) }
  if (Test-Path "forms.mjs") { Run "forms-$t" @("forms.mjs", $Pages) }
  if (Test-Path "contrast.mjs") { Run "contrast-$t" @("contrast.mjs", $Pages) }
  if (Test-Path "smallleft.mjs") { Run "smallleft-$t" @("smallleft.mjs", $Pages) }
  if (Test-Path "financeperm.mjs") { Run "financeperm-$t" @("financeperm.mjs", $Pages) }
  if (Test-Path "mgrscope.mjs") { Run "mgrscope-$t" @("mgrscope.mjs", $Pages) }
  if (Test-Path "exports.mjs") { Run "exports-$t" @("exports.mjs", $Pages) }
  if (Test-Path "exports2.mjs") { Run "exports2-$t" @("exports2.mjs", $Pages) }
  if (Test-Path "chartdata.mjs") { Run "chartdata-$t" @("chartdata.mjs", $Pages) }
  if (Test-Path "demobtn.mjs") { Run "demobtn-$t" @("demobtn.mjs", $Pages) }
  if (Test-Path "tidyups.mjs") { Run "tidyups-$t" @("tidyups.mjs", $Pages) }
  if (Test-Path "emptyrange.mjs") { Run "emptyrange-$t" @("emptyrange.mjs", $Pages) }
  if (Test-Path "consistency.mjs") { Run "consistency-$t" @("consistency.mjs", $Pages) }
  if (Test-Path "shell.mjs") { Run "shell-$t" @("shell.mjs", $Pages) }
  if (Test-Path "appearance.mjs") { Run "appearance-$t" @("appearance.mjs", $Pages) }
  if (Test-Path "honest.mjs") { Run "honest-$t" @("honest.mjs", $Pages) }
  if (Test-Path "cleanup.mjs") { Run "cleanup-$t" @("cleanup.mjs", $Pages) }
  if (Test-Path "dash.mjs") { Run "dash-$t" @("dash.mjs", $Pages) }
  if (Test-Path "hrdash.mjs") { Run "hrdash-$t" @("hrdash.mjs", $Pages) }
  if (Test-Path "admdash.mjs") { Run "admdash-$t" @("admdash.mjs", $Pages) }
  # Round 14: offices, locations, devices and the company profile (data only)
  if (Test-Path "company.mjs") { Run "company-$t" @("company.mjs") }
  if (Test-Path "offices.mjs") { Run "offices-$t" @("offices.mjs") }
  if (Test-Path "homes.mjs") { Run "homes-$t" @("homes.mjs") }
  if (Test-Path "devices.mjs") { Run "devices-$t" @("devices.mjs") }
  if (Test-Path "places.mjs") { Run "places-$t" @("places.mjs") }
  if (Test-Path "punch14.mjs") { Run "punch14-$t" @("punch14.mjs") }
  if (Test-Path "perms14.mjs") { Run "perms14-$t" @("perms14.mjs") }
  # L4: the chosen place (checkInAt / checkOutAt / checkPlace placeId)
  if (Test-Path "chosen.mjs") { Run "chosen-$t" @("chosen.mjs") }
  # P1: the dated statutory rules table and the calculations on it (data/pay-rules.js, data/statutory.js)
  if (Test-Path "payrules.mjs") { Run "payrules-$t" @("payrules.mjs") }
  # P2: salary templates, regime, TDS and the whole month (data/employment.js, pay-structure.js, pay-engine.js)
  if (Test-Path "paystructure.mjs") { Run "paystructure-$t" @("paystructure.mjs") }
  # P4: the two start dates and the two permissions (data/pay-settings.js, config/permissions.js)
  if (Test-Path "paysettings.mjs") { Run "paysettings-$t" @("paysettings.mjs") }
  # P5: the pay and leave rules binding (snapshots, the leave policy, the policy's loss of pay, self-service declarations)
  if (Test-Path "binding.mjs") { Run "binding-$t" @("binding.mjs") }
  # P3: leave by tenure (data/leave-policy.js)
  if (Test-Path "leavebands.mjs") { Run "leavebands-$t" @("leavebands.mjs") }
  Run "leave-$t" @("leave.mjs")
  Run "pages-$t" @("pages.mjs", $Pages)
  Run "approvals-$t" @("approvals.mjs", $Pages)
}
$env:TZ = $null
$fails = @(Select-String -Path (Join-Path $O "*.txt") -Pattern "^FAIL")
"FAIL lines: $($fails.Count)"
