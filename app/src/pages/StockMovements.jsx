// Stock movements (pages/inventory/stock-movements.html, rebuilt in AS2): the counted items and their ledger (data/stock-ledger.js) for stock:view
// (HR, Finance, IT, Admin); recording and correcting needs stock:move (IT, Admin). Two tabs. Items: on hand (worked out from the ledger, never
// stored), the reorder level and a low / out badge. Movements: every movement, newest first, filtered by the shared date range ("No data in this
// range."), kind, item and person; a correction is a new, opposite movement (a reverse entry), never an edit or a delete. The forms say what
// the ledger says: never below zero on any day, a return no more than was issued, and so on, in its own words. Components: Table, Tabs, Modal.
import { useMemo, useState } from "react";
import { stockItems, stockMovements, lowStock, recordStockMovement, reverseStockMovement, addStockItem, updateStockItem } from "../../../assets/js/data/stock-ledger.js";
import { STOCK_KINDS, STOCK_CATEGORIES } from "../../../assets/js/data/asset-rules.js";
import { nameOf, todayIso, formatDay } from "../../../assets/js/ui/leave-view.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import Modal from "../components/Modal.jsx";
import { PageHeader, KpiCard, Pill } from "../components/Layout.jsx";
import { FilterBar, FilterSelect, FilterSearch, DateRange } from "../components/Controls.jsx";
import { Tabs, EmptyState, NO_DATA } from "../components/Basics.jsx";
import { Field, Input, Select, TextArea } from "../components/Form.jsx";
import { ICON, Icon } from "../components/icons.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { countText } from "../data/counts.js";
import { bump } from "../data/bus.js";
import { useToast } from "../ui/Toast.jsx";
import { PATH, peopleOptions, dayText } from "../ui/assets.jsx";

const PAGE = "inventory/stock-movements.html";
const KIND_LABEL = { in: "Stock in", out: "Issue", return: "Return", remove: "Write-off" };
const KIND_OPTIONS = Object.keys(STOCK_KINDS).map((k) => [k, KIND_LABEL[k]]);
const qtyText = (n) => String(n);

// The item's stock status: out (nothing left of an item that is reordered), low (at or under the reorder level), not reordered (level 0) or in stock.
export function stockStatus(i) {
  if (i.reorderLevel <= 0) return { key: "none", label: "No reorder level", tone: "" };
  if (i.onHand <= 0) return { key: "out", label: "Out of stock", tone: "danger" };
  if (i.onHand <= i.reorderLevel) return { key: "low", label: "Low stock", tone: "warning" };
  return { key: "ok", label: "In stock", tone: "success" };
}

function useStockDialog(onClose) {
  const { userId } = useSession();
  const toast = useToast();
  const [error, setError] = useState(null);
  return { userId, error, setError, fail: (r) => setError({ field: r.field ?? null, text: r.error }),
    done: (m) => { bump(); toast(m, "success"); onClose(); }, fieldError: (n) => (error?.field === n ? error.text : null), general: error && !error.field ? error.text : null };
}
function Shell({ onClose, id, title, desc, submitLabel, general, children }) {
  return (
    <Modal open onClose={onClose} id={`${id}-modal`} title={title} desc={desc}
      footer={<><button type="button" className="ds-btn" onClick={onClose}>Cancel</button><button type="submit" form={id} className="ds-btn ds-btn--primary">{submitLabel}</button></>}>
      {general && <p className="ds-note ds-note--danger" role="alert" id={`${id}-error`}>{general}</p>}
      {children}
    </Modal>
  );
}

function MoveDialog({ item, items, onClose }) {
  const d = useStockDialog(onClose);
  const people = useMemo(peopleOptions, []);
  const [f, setF] = useState({ itemId: item?.id ?? "", kind: "in", qty: "", date: todayIso(), toPersonId: "", reason: "", reference: "" });
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); d.setError(null); };
  const chosen = items.find((i) => i.id === f.itemId);
  const withPerson = f.kind === "out" || f.kind === "return";
  const submit = (e) => {
    e.preventDefault();
    const r = recordStockMovement(d.userId, { ...f, toPersonId: withPerson ? f.toPersonId : "" });
    if (!r.ok) { d.fail(r); return; }
    d.done(`${KIND_LABEL[f.kind]} of ${r.record.qty} ${chosen?.unit ?? ""} recorded.`.replace("  ", " "));
  };
  return (
    <Shell onClose={onClose} id="move-form" title="Record a movement" submitLabel="Record" general={d.general}
      desc="The ledger is only added to: a mistake is put right with a correction. Stock can't go below zero on any day, and a person can't hand back more than they were issued.">
      <form id="move-form" className="ds-stack" onSubmit={submit} noValidate>
        <div className="ds-form-grid">
          <Field id="mv-kind" label="What happened" required error={d.fieldError("kind")}><Select id="mv-kind" options={KIND_OPTIONS} value={f.kind} error={d.fieldError("kind")} onChange={set("kind")} /></Field>
          <Field id="mv-item" label="Item" required error={d.fieldError("itemId")}><Select id="mv-item" placeholder="Choose an item" options={items.filter((i) => i.active || f.kind === "return" || f.kind === "remove").map((i) => [i.id, `${i.name} (${qtyText(i.onHand)} ${i.unit})`])} value={f.itemId} error={d.fieldError("itemId")} onChange={set("itemId")} /></Field>
          <Field id="mv-qty" label={`Quantity${chosen ? ` (${chosen.unit})` : ""}`} required error={d.fieldError("qty")} hint="More than 0, up to 2 decimals."><Input id="mv-qty" type="text" inputMode="decimal" value={f.qty} error={d.fieldError("qty")} onChange={set("qty")} /></Field>
          <Field id="mv-date" label="Date" required error={d.fieldError("date")}><Input id="mv-date" type="date" max={todayIso()} value={f.date} error={d.fieldError("date")} onChange={set("date")} /></Field>
          {withPerson && <Field id="mv-person" label={f.kind === "return" ? "Handed back by" : "Issued to (optional)"} required={f.kind === "return"} error={d.fieldError("toPersonId")}><Select id="mv-person" placeholder={f.kind === "return" ? "Choose a person" : "Nobody in particular"} options={people} value={f.toPersonId} error={d.fieldError("toPersonId")} onChange={set("toPersonId")} /></Field>}
          <Field id="mv-reference" label="PO or invoice" error={d.fieldError("reference")}><Input id="mv-reference" type="text" maxLength={40} value={f.reference} error={d.fieldError("reference")} onChange={set("reference")} /></Field>
          <Field id="mv-reason" label="Reason" required full error={d.fieldError("reason")} hint="3 to 200 characters."><TextArea id="mv-reason" rows={2} maxLength={200} value={f.reason} error={d.fieldError("reason")} onChange={set("reason")} /></Field>
        </div>
      </form>
    </Shell>
  );
}

function ItemDialog({ item, onClose }) {
  const d = useStockDialog(onClose);
  const editing = Boolean(item);
  const [f, setF] = useState({ name: item?.name ?? "", category: item?.category ?? "", unit: item?.unit ?? "", reorderLevel: item ? String(item.reorderLevel) : "0", active: item?.active ?? true });
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); d.setError(null); };
  const submit = (e) => {
    e.preventDefault();
    const r = editing ? updateStockItem(d.userId, item.id, { name: f.name, category: f.category, unit: f.unit, reorderLevel: f.reorderLevel, active: f.active }) : addStockItem(d.userId, { name: f.name, category: f.category, unit: f.unit, reorderLevel: f.reorderLevel });
    if (!r.ok) { d.fail(r); return; }
    d.done(editing ? `${r.record.name} saved.` : `${r.record.name} added.`);
  };
  return (
    <Shell onClose={onClose} id="item-form" title={editing ? `Edit ${item.name}` : "Add an item"} submitLabel={editing ? "Save" : "Add item"} general={d.general}
      desc={editing ? "On hand is worked out from the ledger: it can't be typed here." : "A new item starts with nothing on hand: record a stock-in to count it."}>
      <form id="item-form" className="ds-stack" onSubmit={submit} noValidate>
        <div className="ds-form-grid">
          <Field id="it-name" label="Name" required full error={d.fieldError("name")}><Input id="it-name" type="text" maxLength={80} value={f.name} error={d.fieldError("name")} onChange={set("name")} /></Field>
          <Field id="it-category" label="Category" required error={d.fieldError("category")}><Select id="it-category" placeholder="Choose one" options={Object.entries(STOCK_CATEGORIES).map(([k, c]) => [k, c.label])} value={f.category} error={d.fieldError("category")} onChange={set("category")} /></Field>
          <Field id="it-unit" label="Unit" required error={d.fieldError("unit")} hint="Ream, pack, kg, piece..."><Input id="it-unit" type="text" maxLength={20} value={f.unit} error={d.fieldError("unit")} onChange={set("unit")} /></Field>
          <Field id="it-level" label="Reorder level" error={d.fieldError("reorderLevel")} hint="0 means it is no longer reordered."><Input id="it-level" type="text" inputMode="decimal" value={f.reorderLevel} error={d.fieldError("reorderLevel")} onChange={set("reorderLevel")} /></Field>
          {editing && <Field id="it-active" label="In use"><label className="ds-switch"><input id="it-active" type="checkbox" role="switch" checked={f.active} onChange={(e) => setF((s) => ({ ...s, active: e.target.checked }))} />{f.active ? "In use" : "No longer in use"}</label></Field>}
        </div>
      </form>
    </Shell>
  );
}

function CorrectDialog({ movement, onClose }) {
  const d = useStockDialog(onClose);
  const [f, setF] = useState({ reason: "", date: todayIso() });
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); d.setError(null); };
  const submit = (e) => { e.preventDefault(); const r = reverseStockMovement(d.userId, movement.id, f); if (!r.ok) { d.fail(r); return; } d.done(`${movement.id} corrected by ${r.record.id}.`); };
  return (
    <Shell onClose={onClose} id="correct-form" title={`Correct ${movement.id}`} submitLabel="Add the correction" general={d.general}
      desc={`Adds the opposite movement for ${movement.qty} ${KIND_LABEL[movement.kind].toLowerCase()}. The original stays on the ledger.`}>
      <form id="correct-form" className="ds-stack" onSubmit={submit} noValidate>
        <div className="ds-form-grid">
          <Field id="co-date" label="Date" required error={d.fieldError("date")} hint={`Not before ${formatDay(movement.date, true)}.`}><Input id="co-date" type="date" min={movement.date} max={todayIso()} value={f.date} error={d.fieldError("date")} onChange={set("date")} /></Field>
          <Field id="co-reason" label="Why it was wrong" required full error={d.fieldError("reason")} hint="3 to 200 characters."><TextArea id="co-reason" rows={2} maxLength={200} value={f.reason} error={d.fieldError("reason")} onChange={set("reason")} /></Field>
        </div>
      </form>
    </Shell>
  );
}

export default function StockMovements() {
  const { userId } = useSession();
  const canMove = useCan("stock:move");
  const today = todayIso();
  const [tab, setTab] = useState(0);
  const [dialog, setDialog] = useState(null);
  const d = useData(() => ({ items: stockItems(userId), moves: stockMovements(userId), low: lowStock(userId) }), [userId]);
  const [f, setF] = useState({ range: { preset: "", from: "", to: "" }, kind: "", item: "", person: "" });
  const [query, setQuery] = useState("");
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const itemName = (id) => d.items.find((i) => i.id === id)?.name ?? id;
  const reversed = useMemo(() => new Set(d.moves.filter((m) => m.reverses).map((m) => m.reverses)), [d.moves]);
  const hasRange = Boolean(f.range.preset);
  const active = hasRange || Boolean(f.kind || f.item || f.person || query.trim());
  const q = query.trim().toLowerCase();
  const rows = d.moves.filter((m) => (!hasRange || (f.range.from && f.range.to && m.date >= f.range.from && m.date <= f.range.to)) && (!f.kind || m.kind === f.kind) && (!f.item || m.itemId === f.item)
    && (!f.person || m.toPersonId === f.person || m.byPersonId === f.person) && (!q || `${itemName(m.itemId)} ${m.reason} ${m.reference}`.toLowerCase().includes(q)));
  const people = useMemo(() => [...new Set(d.moves.flatMap((m) => [m.toPersonId, m.byPersonId]).filter(Boolean))].map((id) => ({ value: id, label: nameOf(id) })).sort((a, b) => a.label.localeCompare(b.label)), [d.moves]);
  const outCount = d.items.filter((i) => stockStatus(i).key === "out").length;

  const itemCols = [
    { key: "name", label: "Item", sort: (i) => i.name, csv: (i) => i.name, render: (i) => <span className="as-cell"><strong>{i.name}</strong>{i.sku && <span className="text-muted text-sm">{i.sku}{i.tagged ? ", tagged units are in the asset register" : ""}</span>}{!i.active && <Pill>No longer in use</Pill>}</span> },
    { key: "category", label: "Category", sort: (i) => STOCK_CATEGORIES[i.category]?.label ?? i.category, render: (i) => STOCK_CATEGORIES[i.category]?.label ?? i.category },
    { key: "onHand", label: "On hand", num: true, sort: (i) => i.onHand, render: (i) => <span><strong>{qtyText(i.onHand)}</strong> {i.unit}</span> },
    { key: "level", label: "Reorder level", num: true, sort: (i) => i.reorderLevel, render: (i) => (i.reorderLevel > 0 ? qtyText(i.reorderLevel) : <span className="text-muted">None</span>) },
    { key: "status", label: "Status", sort: (i) => stockStatus(i).key, render: (i) => { const s = stockStatus(i); return <Pill tone={s.tone} icon={s.key === "out" || s.key === "low" ? PATH.alert : s.key === "ok" ? PATH.check : undefined} data-chip="stock-status" data-stock={s.key}>{s.label}</Pill>; } },
    ...(canMove ? [{ key: "actions", label: "Actions", actions: true, render: (i) => (
      <span className="ds-form-actions__buttons">
        <button type="button" className="ds-btn ds-btn--sm" data-action="move" onClick={() => setDialog({ kind: "move", item: i })} aria-label={`Record a movement for ${i.name}`}>Record movement</button>
        <button type="button" className="ds-btn ds-btn--sm" data-action="edit-item" onClick={() => setDialog({ kind: "item", item: i })} aria-label={`Edit ${i.name}`}>Edit</button>
      </span>) }] : []),
  ];
  const moveCols = [
    { key: "date", label: "Date", sort: (m) => m.date, csv: (m) => m.date, render: (m) => dayText(m.date) },
    { key: "item", label: "Item", sort: (m) => itemName(m.itemId), render: (m) => itemName(m.itemId) },
    { key: "kind", label: "What", sort: (m) => m.kind, render: (m) => <Pill tone={m.kind === "in" || m.kind === "return" ? "success" : "warning"} data-chip="kind">{KIND_LABEL[m.kind]}{m.reverses ? " (correction)" : ""}</Pill> },
    { key: "qty", label: "Quantity", num: true, sort: (m) => STOCK_KINDS[m.kind].sign * m.qty, render: (m) => `${STOCK_KINDS[m.kind].sign > 0 ? "+" : "−"}${qtyText(m.qty)}` },
    { key: "person", label: "Person", sort: (m) => (m.toPersonId ? nameOf(m.toPersonId) : ""), render: (m) => (m.toPersonId ? nameOf(m.toPersonId) : <span className="text-muted">—</span>) },
    { key: "by", label: "Recorded by", render: (m) => nameOf(m.byPersonId) },
    { key: "reason", label: "Reason", className: "as-reason", render: (m) => <span className="as-cell">{m.reason}{m.reference && m.reference !== m.reason && <span className="text-muted text-sm">{m.reference}</span>}{reversed.has(m.id) && <Pill data-chip="corrected">Corrected</Pill>}</span> },
    ...(canMove ? [{ key: "actions", label: "Actions", actions: true, render: (m) => (!m.reverses && !reversed.has(m.id)
      ? <button type="button" className="ds-btn ds-btn--sm" data-action="correct" onClick={() => setDialog({ kind: "correct", movement: m })} aria-label={`Correct ${m.id}`}>Correct</button> : null) }] : []),
  ];

  return (
    <Frame page={PAGE}>
      <PageHeader title="Stock movements" subtitle="Counted items and what came in and went out"
        actions={canMove ? <><button type="button" className="ds-btn" id="add-item" onClick={() => setDialog({ kind: "item", item: null })}><Icon d={PATH.plus} />Add item</button>
          <button type="button" className="ds-btn ds-btn--primary" id="record-move" onClick={() => setDialog({ kind: "move", item: null })}><Icon d={PATH.plus} />Record movement</button></> : null} />
      <div className="ds-stack">
        <div className="ds-grid as-kpis" role="group" aria-label="Key numbers">
          <KpiCard id="kpi-items" label="Items" value={String(d.items.length)} icon={ICON.layers} />
          <KpiCard id="kpi-low" label="Low or out of stock" value={String(d.low.length)} icon={ICON.pulse} />
          <KpiCard id="kpi-out" label="Out of stock" value={String(outCount)} icon={ICON.clock} />
          <KpiCard id="kpi-moves" label="Movements" value={String(d.moves.length)} icon={ICON.table} />
        </div>
        <section className="ds-card" aria-label="Stock">
          <div className="ds-card__body ds-stack">
            <div className="as-tabs"><Tabs pill active={tab} onChange={setTab} tabs={[{ label: "Items", count: String(d.items.length) }, { label: "Movements", count: String(d.moves.length) }]} /></div>
            {tab === 0 ? (
              d.items.length ? <>
                {d.low.length > 0 && <p className="ds-note ds-note--warning" id="low-stock-note" role="status"><Icon d={PATH.alert} /> {d.low.length === 1 ? "1 item is" : `${d.low.length} items are`} at or under the reorder level: {d.low.slice(0, 4).map((i) => i.name).join(", ")}{d.low.length > 4 ? "…" : ""}.</p>}
                <Table bare columns={itemCols} rows={d.items} rowKey={(i) => i.id} empty="No items." tableId="items-table" />
                <p className="ds-hint" id="items-count">{countText(d.items.length, d.items.length, "item")}</p>
              </> : <EmptyState title="No items yet." text={canMove ? "Add the first one with Add item." : "Nothing has been counted."} />
            ) : (
              <>
                <div className="as-filters"><FilterBar label="Filter the movements" active={active} onClearAll={() => { setF({ range: { preset: "", from: "", to: "" }, kind: "", item: "", person: "" }); setQuery(""); }}>
                  <DateRange value={f.range} onChange={set("range")} today={today} label="Date range" />
                  <FilterSelect label="What" value={f.kind} onChange={set("kind")} allLabel="Everything" options={KIND_OPTIONS.map(([value, label]) => ({ value, label }))} />
                  <FilterSelect label="Item" value={f.item} onChange={set("item")} allLabel="All items" options={d.items.map((i) => ({ value: i.id, label: i.name }))} />
                  <FilterSelect label="Person" value={f.person} onChange={set("person")} allLabel="Anyone" options={people} />
                  <FilterSearch label="Search" value={query} onChange={setQuery} placeholder="Item, reason or PO" />
                </FilterBar></div>
                {d.moves.length === 0
                  ? <EmptyState title="Nothing recorded yet." text="Every stock-in, issue, return and write-off appears here." />
                  : <Table bare columns={moveCols} rows={rows} rowKey={(m) => m.id} empty={hasRange ? NO_DATA : "No movements match these filters."} tableId="moves-table" />}
                <p className="ds-hint" id="moves-count">{countText(rows.length, d.moves.length, "movement", { filtered: active })}</p>
              </>
            )}
          </div>
        </section>
      </div>
      {dialog?.kind === "move" && <MoveDialog item={dialog.item} items={d.items} onClose={() => setDialog(null)} />}
      {dialog?.kind === "item" && <ItemDialog item={dialog.item} onClose={() => setDialog(null)} />}
      {dialog?.kind === "correct" && <CorrectDialog movement={dialog.movement} onClose={() => setDialog(null)} />}
    </Frame>
  );
}