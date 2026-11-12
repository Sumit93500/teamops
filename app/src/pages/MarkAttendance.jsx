// Mark attendance (pages/attendance/mark-attendance.html), in the design system with the place check (L3): today's status,
// the clock and the shift rule as before; then "Check-In From" (only the places this person may check in from:
// data/locations-store.js placesFor), "Use my location" (the browser's position, read once, on press), a status line with
// the distance to the chosen place and its radius (a reading less accurate than 100 m asks to try again), the device's
// status (registered / new / limit reached), and one big Check in or Check out button, enabled only when the place and
// device allow it. Every refusal is said in plain words; a denied permission and a browser without location say what to
// do. Checking out from another place than the check-in's shows a "flagged" notice and asks before it's done. The work
// mode follows the place (a home is work from home). The store does the real checks (checkInAt / checkOutAt). The
// privacy line is on the page. Today's times and places, the shift card, your places, and the last 5 working days with
// where each check-in came from. It all redraws after a punch (the bus) and at the start of every minute.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUser } from "../../../assets/js/data/store.js";
import { ATTENDANCE_RULES as R, dayFor, monthFor, nowMinutes, toMinutes, checkInWindow } from "../../../assets/js/data/attendance-store.js";
import { placesFor, judgePlace, checkInAt, checkOutAt, ACCURACY_LIMIT_M } from "../../../assets/js/data/locations-store.js";
import { peekDevice, devicesFor, deviceToken, sharedWith, MAX_DEVICES } from "../../../assets/js/data/devices-store.js";
import { distanceM } from "../../../assets/js/data/places.js";
import { load } from "../../../assets/js/core/storage.js";
import { typeLabel, todayIso, weekdayName, monthName, dayOfMonth, shortDate } from "../../../assets/js/ui/leave-view.js";
import { dayNumber, isoFromDayNumber } from "../../../assets/js/data/holidays.js";
import { hoursText } from "../../../assets/js/ui/attendance-view.js";
import Frame from "../ui/Frame.jsx";
import { useToast } from "../ui/Toast.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import Table from "../components/Table.jsx";
import { PageHeader, Card, Pill } from "../components/Layout.jsx";
import { Kv } from "../components/Form.jsx";
import { Icon } from "../components/icons.jsx";
import { DayPill, PlaceCell, FlagBadge } from "../ui/attendance.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { bump } from "../data/bus.js";
import { stampsBy, stampKey, PLACE_LABEL } from "../data/stamps.js";
import { PRIVACY } from "./Offices.jsx";
import { pageUrl, MY_LOCATIONS } from "../routes.js";

const PAGE = "attendance/mark-attendance.html";
const RECENT_DAYS = 5;
const PIN = "M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5";
const pad = (n) => String(n).padStart(2, "0");
const twelveHour = (minutes) => { const h = Math.floor(minutes / 60); return `${h % 12 || 12}:${pad(minutes % 60)} ${h < 12 ? "AM" : "PM"}`; };
const longDate = (iso) => `${weekdayName(iso)}, ${dayOfMonth(iso)} ${monthName(Number(iso.slice(5, 7)))} ${iso.slice(0, 4)}`;
const ordinal = (n) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
const m = (n) => `${Number(n).toLocaleString("en-IN")} m`;
const isHome = (place) => place === "homePermanent" || place === "homeTemporary";

// Today's status: the pill, which button works, and the line under them (mark-attendance.js renderStatus, same words).
function statusOf(day, user) {
  if (!day) return { pill: ["danger", "Account inactive"], why: user ? "Your account is inactive, so attendance can't be recorded." : "Your employee record wasn't found, so attendance can't be recorded." };
  if (day.checkOut) return { pill: ["", `Checked out at ${day.checkOut}`], why: "You're done for today." };
  if (day.checkIn) return { pill: day.minutesLate ? ["warning", `Checked in at ${day.checkIn}, late by ${day.minutesLate} min`] : ["success", `Checked in at ${day.checkIn}`], canOut: true, why: "" };
  if (day.status === "on-leave") return { pill: ["info", "On leave today"], why: `You're on approved ${day.leave ? typeLabel(day.leave.type).toLowerCase() : "leave"} today, so there's nothing to check in for.` };
  if (day.status === "weekend") return { pill: ["", "Weekend"], why: "No attendance is needed on weekends." };
  if (day.status === "holiday") return { pill: ["", `Holiday: ${day.holiday.name}`], why: "No attendance is needed on holidays." };
  if (day.status === "not-joined") return { pill: ["", "Not joined yet"], why: `Attendance starts on your joining date, ${user.dateOfJoining}.` };
  if (day.status === "absent") return { pill: ["danger", "Not checked in, the shift has ended"], why: `Check-in closed at ${twelveHour(checkInWindow(day).closes)}. If you were working today, use Request fix on My attendance.` };
  if (nowMinutes() < checkInWindow(day).opens) return { pill: ["warning", "Not checked in yet"], why: `Check-in opens at ${twelveHour(checkInWindow(day).opens)}.` };
  return { pill: ["warning", "Not checked in yet"], canIn: true, why: "" };
}

// A minute tick, from the start of the next minute.
function useMinute() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const now = new Date();
    let interval = 0;
    const timer = setTimeout(() => { setTick((t) => t + 1); interval = setInterval(() => setTick((t) => t + 1), 60 * 1000); }, (60 - now.getSeconds()) * 1000 - now.getMilliseconds());
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, []);
  return tick;
}

// The browser's position, once per press: { status: idle | busy | ok | denied | unsupported | error, reading }.
function useReading() {
  const [geo, setGeo] = useState({ status: "idle", reading: null });
  const read = () => {
    if (!globalThis.navigator?.geolocation) { setGeo({ status: "unsupported", reading: null }); return; }
    setGeo({ status: "busy", reading: null });
    navigator.geolocation.getCurrentPosition(
      (p) => setGeo({ status: "ok", reading: { lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: Math.round(p.coords.accuracy) } }),
      (err) => setGeo({ status: err.code === 1 ? "denied" : "error", reading: null }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };
  return [geo, read];
}

// The line under "Use my location": what the reading means for the chosen place.
function placeLine(geo, place) {
  if (!place) return { tone: "danger", text: "No place is set for you to check in from. Ask an Admin to set your office." };
  if (geo.status === "idle") return { tone: "", text: "Press Use my location. It's read once, now, to check you're at the place you chose." };
  if (geo.status === "busy") return { tone: "info", text: "Reading your location…" };
  if (geo.status === "unsupported") return { tone: "danger", text: "This browser can't share its location, so you can't check in from it. Use another browser, or your phone." };
  if (geo.status === "denied") return { tone: "danger", text: "Location is blocked for this site. Allow it in your browser's site settings, then press Use my location again." };
  if (geo.status === "error") return { tone: "danger", text: "Your location couldn't be read. Press Use my location to try again." };
  const { accuracyM } = geo.reading;
  if (accuracyM > ACCURACY_LIMIT_M) return { tone: "warning", text: `Your location is only accurate to within ${m(accuracyM)}; it needs to be within ${ACCURACY_LIMIT_M} m. Move near a window or outdoors, then press Use my location again.`, retry: true };
  const d = Math.round(distanceM(geo.reading, place));
  return d <= place.radiusM
    ? { tone: "success", text: `You're ${m(d)} from ${place.name}, inside its ${m(place.radiusM)} radius.`, inside: true, d }
    : { tone: "danger", text: `You're ${m(d)} from ${place.name}. Check-in needs you within ${m(place.radiusM)}.`, d };
}

// This browser as a check-in device for this person (read only: no token is made until a check-in).
function deviceLine(userId) {
  const token = load("device-token")?.token ?? null;
  const answer = token ? peekDevice(userId, token) : (() => {
    const mine = devicesFor(userId, userId);
    const n = mine.ok ? mine.records.length : 0;
    return n >= MAX_DEVICES ? { ok: false, code: "device-limit" } : { ok: true, known: false };
  })();
  const used = (() => { const mine = devicesFor(userId, userId); return mine.ok ? mine.records.length : 0; })();
  const shared = token && sharedWith(token, userId).length ? " It's also registered to another employee, so check-ins from it are flagged for HR." : "";
  if (!answer.ok && answer.code === "device-limit") return { tone: "danger", label: "Device limit reached", text: `You already use ${MAX_DEVICES} devices. Ask an Admin to reset yours to check in from this one.`, ok: false };
  if (!answer.ok) return { tone: "danger", label: "No device", text: answer.error ?? "This browser can't be used as a device.", ok: false };
  if (answer.known) return { tone: "success", label: "Registered device", text: `This browser is one of your devices.${shared}`, ok: true };
  return { tone: shared ? "warning" : "info", label: "New device", text: `Checking in registers this browser (${used} of ${MAX_DEVICES} used).${shared}`, ok: true };
}

// The store's refusal, in plain words.
function refusalText(r) {
  switch (r.code) {
    case "no-location": return "Your location wasn't read. Press Use my location first.";
    case "inaccurate": return `Your location isn't accurate enough (it needs to be within ${ACCURACY_LIMIT_M} m). Press Use my location to try again.`;
    case "outside": return `You're ${r.error}. Move within the place's radius, then press Use my location again.`;
    case "no-place": return "No office is set for you. Ask an Admin.";
    case "no-token": return "This browser can't keep a device token. Allow site storage for this site, then reload.";
    default: return r.error;
  }
}

function recentDays(userId, today) {
  const days = [];
  for (let n = dayNumber(today); days.length < RECENT_DAYS && n > dayNumber(today) - 31; n--) {
    const day = dayFor(userId, isoFromDayNumber(n));
    if (!day || day.status === "no-data" || day.status === "not-joined") break;
    if (day.status === "weekend" || day.status === "holiday") continue;
    days.push(day);
  }
  return days;
}

export default function MarkAttendance() {
  const { userId } = useSession();
  const canMark = useCan("attendance:mark");
  const showToast = useToast();
  const confirm = useConfirm();
  const tick = useMinute();
  const [geo, read] = useReading();
  const [chosen, setChosen] = useState(null);   // the place the person picked, once they pick one
  const [error, setError] = useState("");
  const d = useData(() => {
    const today = todayIso();
    const day = dayFor(userId, today);
    const stamps = stampsBy();
    return { today, day, user: getUser(userId), month: monthFor(userId, Number(today.slice(0, 4)), Number(today.slice(5, 7))), places: placesFor(userId),
      device: deviceLine(userId), stamp: stamps.get(stampKey(userId, today)) ?? null, recent: recentDays(userId, today).map((x) => ({ ...x, stamp: stamps.get(stampKey(userId, x.date)) ?? null })),
      minutes: new Date().getHours() * 60 + new Date().getMinutes() };
  }, [userId, tick]);

  const { day, user, month, today, places, device, stamp } = d;
  const st = statusOf(day, user);
  const fallback = day?.suggestedMode === "wfh" ? places.find((p) => isHome(p.place)) : null;
  const place = places.find((p) => p.place === chosen) ?? fallback ?? places[0] ?? null;
  const line = placeLine(geo, place);
  const ready = Boolean(line.inside) && device.ok;
  // Where the store would place this check-out (the nearest place inside), against the check-in's place.
  const outAt = st.canOut && geo.reading ? judgePlace(geo.reading, places) : null;
  const moved = Boolean(st.canOut && stamp?.inPlace && outAt?.ok && outAt.place !== stamp.inPlace);
  let start = toMinutes(R.shiftStart), end = toMinutes(R.shiftEnd);
  if (day?.halfDayLeave === "first-half") start = toMinutes(R.halfSplit);
  if (day?.halfDayLeave === "second-half") end = toMinutes(R.halfSplit);
  const half = day?.halfDayLeave ? `You're on leave for the ${day.halfDayLeave === "first-half" ? "first" : "second"} half today. ` : "";
  const [time, ampm] = twelveHour(d.minutes).split(" ");
  let lateNote = "";
  if (month?.penaltyHalfDays) lateNote = `Every ${ordinal(R.penaltyEvery)} late mark in a month counts as half a day: ${month.penaltyHalfDays} this month. Each half day is taken from your pay, not your leave balance, when payroll is processed.`;
  else if (month && month.lateMarks === R.penaltyEvery - 1) lateNote = "One more late mark this month counts as half a day. Each half day is taken from your pay, not your leave balance, when payroll is processed.";

  const after = (r, done) => {
    if (!r.ok) { setError(refusalText(r)); return; }
    setError(""); bump();
    showToast(done(r.record), "success");
  };
  const doIn = () => {
    const mode = isHome(place.place) ? "wfh" : "office";
    after(checkInAt(userId, mode, geo.reading, deviceToken()), (rec) => `Checked in from ${PLACE_LABEL[rec.checkInPlace] ?? place.name}.${rec.flagged ? " Flagged for HR: this device is registered to someone else too." : ""}`);
  };
  const doOut = async () => {
    if (moved && !(await confirm({ message: `Check out from ${outAt.placeName}?\nYou checked in at ${PLACE_LABEL[stamp.inPlace]}. A check-out from another place is flagged for HR to look at.`, confirmLabel: "Check out", danger: true }))) return;
    after(checkOutAt(userId, geo.reading, deviceToken()), (rec) => (rec.flagged ? `Checked out. Flagged for HR: ${rec.flagReasons.includes("place-changed") ? "a different place than your check-in" : "a different device or a shared one"}.` : "Checked out."));
  };

  const recentColumns = [
    { key: "date", label: "Date", render: (x) => shortDate(x.date) },
    { key: "in", label: "Check-in", render: (x) => (x.checkIn ? `${x.checkIn}${x.mode === "wfh" ? " (WFH)" : ""}` : "–") },
    { key: "place", label: "Place", render: (x) => <PlaceCell stamp={x.stamp} /> },
    { key: "out", label: "Check-out", render: (x) => (x.incomplete ? "Not recorded" : x.checkOut ?? "–") },
    { key: "hours", label: "Hours", num: true, render: (x) => (x.minutesWorked === null ? "–" : hoursText(x.minutesWorked)) },
    { key: "status", label: "Status", render: (x) => <span className="ds-chips"><DayPill day={x} />{x.regularized && <Pill tone="success">Regularized</Pill>}{x.stamp?.flagged && <FlagBadge reasons={x.stamp.reasons} />}</span> },
  ];

  return (
    <Frame page={PAGE}>
      <PageHeader title="Mark attendance" subtitle={<span id="today-date">{longDate(today)}</span>}
        actions={<><Link className="ds-btn" to={pageUrl(MY_LOCATIONS)}>My locations</Link><Link className="ds-btn" to={pageUrl("attendance/my-attendance.html")}>View my attendance</Link></>} />
      <div className="ds-stack">
        <div className="ds-two-col ds-two-col--main">
          <Card id="punch-card" title="Today" meta={<Pill tone={st.pill[0]} id="punch-status">{st.pill[1]}</Pill>}>
            <div className="ds-stack">
            <div className="ds-stack punch">
              <div className="punch__time" id="punch-clock"><time dateTime={`${pad(Math.floor(d.minutes / 60))}:${pad(d.minutes % 60)}`}>{time.padStart(5, "0")}</time><small>{ampm}</small></div>
              <p className="ds-hint" id="punch-rule">{`${half}Shift ${twelveHour(start)} – ${twelveHour(end)}. Checking in after ${twelveHour(start + R.graceMinutes)} is marked late.`}</p>
              {(st.canIn || st.canOut) && canMark && (
                <>
                  <div className="ds-field">
                    <label className="ds-field__label" htmlFor="checkin-from">{st.canOut ? "Check-Out From" : "Check-In From"}</label>
                    <div className="ds-control ds-control--select">
                      <Icon d={PIN} />
                      <select id="checkin-from" value={place?.place ?? ""} disabled={!places.length || st.canOut} aria-describedby="place-status" onChange={(e) => { setChosen(e.target.value); setError(""); }}>
                        {places.length ? places.map((p) => <option key={p.place} value={p.place}>{`${p.name} (${m(p.radiusM)})`}</option>) : <option value="">No place set</option>}
                      </select>
                    </div>
                    <span className="ds-field__helper">{st.canOut ? "Check-out counts at any of your places." : place && isHome(place.place) ? "Counts as work from home." : "Counts as office work."}</span>
                  </div>
                  <div className="ds-form-actions">
                    <button type="button" className="ds-btn" id="locate-btn" disabled={geo.status === "busy" || !place} onClick={() => { setError(""); read(); }}><Icon d={PIN} />{line.retry ? "Try again" : "Use my location"}</button>
                  </div>
                  <p className={`ds-status${line.tone ? ` ds-status--${line.tone}` : ""}`} id="place-status" role="status">{line.text}</p>
                  <p className={`ds-status ds-status--${device.tone}`} id="device-status"><span><strong>{device.label}.</strong> {device.text}</span></p>
                  {moved && <p className="ds-note ds-note--warning" id="flag-notice">{`Flagged: you checked in at ${PLACE_LABEL[stamp.inPlace]} and you're at ${outAt.placeName} now. Checking out here flags the day for HR.`}</p>}
                </>
              )}
              <div className="punch__actions">
                {st.canOut
                  ? <button className="ds-btn ds-btn--primary ds-btn--lg" type="button" id="check-out-btn" disabled={!ready && !(moved && device.ok)} onClick={doOut}>Check out</button>
                  : <button className="ds-btn ds-btn--primary ds-btn--lg" type="button" id="check-in-btn" hidden={!canMark || undefined} disabled={!st.canIn || !ready} onClick={doIn}>Check in</button>}
              </div>
              <p className="ds-hint" id="punch-note" hidden={!st.why || undefined}>{st.why}</p>
              <p className="ds-field__error" id="punch-error" role="alert" hidden={!error || undefined}>{error}</p>
              <p className="ds-privacy">{PRIVACY}</p>
            </div>
            <Kv id="punch-stats" rows={[
              ["Check-in", <span id="stat-check-in">{day?.checkIn ? `${day.checkIn}${day.mode === "wfh" ? " (WFH)" : ""}` : "–"}</span>],
              ["Checked in from", <span id="stat-check-in-place">{stamp?.inPlace ? `${PLACE_LABEL[stamp.inPlace]}${stamp.inDistance ? `, ${stamp.inDistance}` : ""}` : "–"}</span>],
              ["Check-out", <span id="stat-check-out">{day?.checkOut ?? "–"}</span>],
              ["Checked out from", <span id="stat-check-out-place">{stamp?.outPlace ? `${PLACE_LABEL[stamp.outPlace]}${stamp.outDistance ? `, ${stamp.outDistance}` : ""}` : "–"}</span>],
              ["Hours today", <span id="stat-hours">{hoursText(day?.minutesWorked ?? 0)}</span>],
            ]} />
            </div>
          </Card>
          <div className="ds-stack">
            <Card id="shift-card" title="Today's shift">
              <Kv rows={[["Shift", "General"], ["Timing", <span id="shift-timing">{`${twelveHour(toMinutes(R.shiftStart))} – ${twelveHour(toMinutes(R.shiftEnd))}`}</span>],
                ["Grace period", <span id="shift-grace">{`${R.graceMinutes} minutes`}</span>], ["Late marks this month", <span id="late-marks">{month ? `${month.lateMarks} of ${R.penaltyEvery}` : "–"}</span>]]} />
              <p className="ds-hint" id="late-note" hidden={!lateNote || undefined}>{lateNote}</p>
            </Card>
            <Card id="places-card" title="Your places" actions={<Link className="ds-btn ds-btn--sm" to={pageUrl(MY_LOCATIONS)}>My locations</Link>}>
              {places.length ? <Kv rows={places.map((p) => [p.name.charAt(0).toUpperCase() + p.name.slice(1), `Within ${m(p.radiusM)}`])} /> : <p className="ds-hint">No place is set for you. Ask an Admin.</p>}
            </Card>
          </div>
        </div>
        <Card id="recent-card" title="Recent punches" actions={<Link className="ds-btn ds-btn--sm" to={pageUrl("attendance/my-attendance.html")}>View full month</Link>}>
          <Table bare columns={recentColumns} rows={d.recent} rowKey={(x) => x.date} empty="No attendance recorded yet." tableId="recent-punches" />
        </Card>
        <p className="ds-note">Forgot to punch, or the system was down? Ask for a correction from <Link className="link" to={pageUrl("attendance/my-attendance.html")}>My attendance</Link>.</p>
      </div>
    </Frame>
  );
}
