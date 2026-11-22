// Vendors (pages/inventory/vendors.html, rebuilt in AS2): the suppliers on the asset register (data/asset-register.js), for assets:view-all
// (HR, Finance, IT, Admin) to read and vendors:manage (IT, Admin) to add, edit, deactivate, reactivate and delete. The rule is said on the
// page and enforced by the data layer: a vendor named on an asset or a maintenance record can't be deleted, only deactivated; it stays on
// its old records and can't be chosen for new ones. The old register's contacts, supplies and payment terms came with it; an email, GSTIN
// and address it never had are left empty. Components: Table, Modal, FilterBar.
import { useState } from "react";
import { vendorsFor, vendorUses, addVendor, updateVendor, setVendorActive, deleteVendor } from "../../../assets/js/data/asset-register.js";
import { plural } from "../../../assets/js/ui/leave-view.js";
import Frame from "../ui/Frame.jsx";
import Table from "../components/Table.jsx";
import Modal from "../components/Modal.jsx";
import { PageHeader, KpiCard, Pill } from "../components/Layout.jsx";
import { FilterBar, FilterSelect, FilterSearch } from "../components/Controls.jsx";
import { Field, Input, TextArea } from "../components/Form.jsx";
import { EmptyState } from "../components/Basics.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { ICON, Icon } from "../components/icons.jsx";
import { useData, useSession, useCan } from "../data/hooks.js";
import { countText } from "../data/counts.js";
import { bump } from "../data/bus.js";
import { useToast } from "../ui/Toast.jsx";
import { PATH } from "../ui/assets.jsx";

const PAGE = "inventory/vendors.html";
const STATE_OPTIONS = [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "hold", label: "On hold" }];
const stateOf = (v) => (v.active ? "active" : v.onHold ? "hold" : "inactive");

function VendorDialog({ vendor, onClose }) {
  const { userId } = useSession();
  const toast = useToast();
  const editing = Boolean(vendor);
  const [f, setF] = useState({ name: vendor?.name ?? "", contactPerson: vendor?.contactPerson ?? "", phone: vendor?.phone ?? "", email: vendor?.email ?? "", gstin: vendor?.gstin ?? "", address: vendor?.address ?? "", supplies: vendor?.supplies ?? "", terms: vendor?.terms ?? "" });
  const [error, setError] = useState(null);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setError(null); };
  const fe = (n) => (error?.field === n ? error.text : null);
  const submit = (e) => {
    e.preventDefault();
    const r = editing ? updateVendor(userId, vendor.id, f) : addVendor(userId, f);
    if (!r.ok) { setError({ field: r.field ?? null, text: r.error }); return; }
    bump();
    toast(editing ? `${r.record.name} saved.` : `${r.record.name} added.`, "success");
    onClose();
  };
  return (
    <Modal open onClose={onClose} id="vendor-modal" size="lg" title={editing ? `Edit ${vendor.name}` : "Add a vendor"} desc={editing ? "Change its details." : "A new vendor is active at once."}
      footer={<><button type="button" className="ds-btn" onClick={onClose}>Cancel</button><button type="submit" form="vendor-form" className="ds-btn ds-btn--primary">{editing ? "Save" : "Add vendor"}</button></>}>
      {error && !error.field && <p className="ds-note ds-note--danger" role="alert" id="vendor-form-error">{error.text}</p>}
      <form id="vendor-form" className="ds-stack" onSubmit={submit} noValidate>
        <div className="ds-form-grid">
          <Field id="vf-name" label="Name" required full error={fe("name")}><Input id="vf-name" type="text" maxLength={80} value={f.name} error={fe("name")} onChange={set("name")} /></Field>
          <Field id="vf-contact" label="Contact person" error={fe("contactPerson")}><Input id="vf-contact" type="text" maxLength={80} value={f.contactPerson} error={fe("contactPerson")} onChange={set("contactPerson")} /></Field>
          <Field id="vf-phone" label="Phone" error={fe("phone")} hint="10 to 15 digits."><Input id="vf-phone" type="text" inputMode="tel" maxLength={20} value={f.phone} error={fe("phone")} onChange={set("phone")} /></Field>
          <Field id="vf-email" label="Email" error={fe("email")}><Input id="vf-email" type="email" maxLength={120} value={f.email} error={fe("email")} onChange={set("email")} /></Field>
          <Field id="vf-gstin" label="GSTIN" error={fe("gstin")} hint="15 characters, like 06AABCT4821M1Z7."><Input id="vf-gstin" type="text" maxLength={15} value={f.gstin} error={fe("gstin")} onChange={set("gstin")} /></Field>
          <Field id="vf-supplies" label="Supplies" error={fe("supplies")}><Input id="vf-supplies" type="text" maxLength={120} value={f.supplies} error={fe("supplies")} onChange={set("supplies")} /></Field>
          <Field id="vf-terms" label="Payment terms" error={fe("terms")}><Input id="vf-terms" type="text" maxLength={120} value={f.terms} error={fe("terms")} onChange={set("terms")} /></Field>
          <Field id="vf-address" label="Address" full error={fe("address")}><TextArea id="vf-address" rows={2} maxLength={200} value={f.address} error={fe("address")} onChange={set("address")} /></Field>
        </div>
      </form>
    </Modal>
  );
}

export default function Vendors() {
  const { userId } = useSession();
  const canManage = useCan("vendors:manage");
  const toast = useToast();
  const confirm = useConfirm();
  const [dialog, setDialog] = useState(null);
  const [state, setState] = useState("");
  const [query, setQuery] = useState("");
  const d = useData(() => { const list = vendorsFor(userId); return { list, uses: Object.fromEntries(list.map((v) => [v.id, vendorUses(userId, v.id)])) }; }, [userId]);
  const q = query.trim().toLowerCase();
  const rows = d.list.filter((v) => (!state || stateOf(v) === state) && (!q || [v.name, v.contactPerson, v.supplies, v.email, v.phone].join(" ").toLowerCase().includes(q)));
  const active = Boolean(state || q);

  const toggle = async (v) => {
    if (v.active && !(await confirm({ message: `Deactivate ${v.name}?\nIt stays on its old records but can't be chosen for new ones.`, confirmLabel: "Deactivate", cancelLabel: "Keep it active", danger: true }))) return;
    const r = setVendorActive(userId, v.id, !v.active);
    if (!r.ok) { toast(r.error, "danger"); return; }
    bump();
    toast(`${v.name} ${v.active ? "deactivated" : "reactivated"}.`, "success");
  };
  const remove = async (v) => {
    if (!(await confirm({ message: `Delete ${v.name}?\nThis removes it from the list. It can't be undone.`, confirmLabel: "Delete", cancelLabel: "Keep it", danger: true }))) return;
    const r = deleteVendor(userId, v.id);
    if (!r.ok) { toast(r.error, "danger"); return; }
    bump();
    toast(`${v.name} deleted.`, "success");
  };
  const columns = [
    { key: "name", label: "Vendor", className: "as-vendor", sort: (v) => v.name, csv: (v) => v.name, render: (v) => <span className="as-cell"><strong>{v.name}</strong>{v.supplies && <span className="text-muted text-sm">{v.supplies}</span>}</span> },
    { key: "contact", label: "Contact", sort: (v) => v.contactPerson, render: (v) => <span className="as-cell">{v.contactPerson || "—"}{v.phone && <span className="text-muted text-sm">{v.phone}</span>}</span> },
    { key: "terms", label: "Payment terms", render: (v) => v.terms || "—" },
    { key: "uses", label: "Used on", num: true, sort: (v) => d.uses[v.id], render: (v) => (d.uses[v.id] ? plural(d.uses[v.id], "record", "records") : <span className="text-muted">Nothing</span>) },
    { key: "email", label: "Email and GSTIN", render: (v) => (v.email || v.gstin ? <span className="as-cell">{v.email || "—"}{v.gstin && <span className="text-muted text-sm">{v.gstin}</span>}</span> : <span className="text-muted">Not recorded</span>) },
    { key: "state", label: "Status", sort: (v) => stateOf(v), render: (v) => <Pill tone={v.active ? "success" : ""} data-chip="vendor-status" data-state={stateOf(v)}>{v.active ? "Active" : v.onHold ? "On hold" : "Inactive"}</Pill> },
    ...(canManage ? [{ key: "actions", label: "Actions", actions: true, render: (v) => (
      <span className="ds-form-actions__buttons">
        <button type="button" className="ds-btn ds-btn--sm" data-action="edit" onClick={() => setDialog({ vendor: v })} aria-label={`Edit ${v.name}`}>Edit</button>
        <button type="button" className={`ds-btn ds-btn--sm${v.active ? " ds-btn--danger" : ""}`} data-action="toggle" onClick={() => toggle(v)} aria-label={`${v.active ? "Deactivate" : "Reactivate"} ${v.name}`}>{v.active ? "Deactivate" : "Reactivate"}</button>
        <button type="button" className="ds-btn ds-btn--sm ds-btn--danger" data-action="delete" disabled={d.uses[v.id] > 0} aria-describedby={d.uses[v.id] > 0 ? `why-${v.id}` : undefined} onClick={() => remove(v)} aria-label={`Delete ${v.name}`}>Delete</button>
        {d.uses[v.id] > 0 && <span className="as-why" id={`why-${v.id}`}>Named on {plural(d.uses[v.id], "record", "records")}: deactivate it instead.</span>}
      </span>) }] : []),
  ];

  return (
    <Frame page={PAGE}>
      <PageHeader title="Vendors" subtitle="Who the company buys assets and services from"
        actions={canManage ? <button type="button" className="ds-btn ds-btn--primary" id="add-vendor" onClick={() => setDialog({ vendor: null })}><Icon d={PATH.plus} />Add vendor</button> : null} />
      <div className="ds-stack">
        <div className="ds-grid as-kpis" role="group" aria-label="Key numbers">
          <KpiCard id="kpi-vendors" label="Vendors" value={String(d.list.length)} icon={ICON.building} />
          <KpiCard id="kpi-active" label="Active" value={String(d.list.filter((v) => v.active).length)} icon={ICON.users} />
          <KpiCard id="kpi-hold" label="On hold or inactive" value={String(d.list.filter((v) => !v.active).length)} icon={ICON.clock} />
        </div>
        <p className="ds-note" id="vendor-rule">A vendor named on an asset or a maintenance record can't be deleted: deactivate it instead. It stays on its old records but can't be chosen for new ones.</p>
        <section className="ds-card" id="vendors-card" aria-labelledby="vendors-title">
          <div className="ds-card__header"><div><h2 className="ds-card__title" id="vendors-title">All vendors</h2><span className="ds-card__meta" id="vendors-count">{countText(rows.length, d.list.length, "vendor", { filtered: active })}</span></div></div>
          <div className="ds-card__body ds-stack">
            <FilterBar label="Filter the vendors" active={active} onClearAll={() => { setState(""); setQuery(""); }}>
              <FilterSelect label="Status" value={state} onChange={setState} allLabel="All" options={STATE_OPTIONS} />
              <FilterSearch label="Search" value={query} onChange={setQuery} placeholder="Name, contact or supplies" />
            </FilterBar>
            {d.list.length === 0 ? <EmptyState title="No vendors yet." text={canManage ? "Add the first one with Add vendor." : "None have been added."} />
              : <Table bare columns={columns} rows={rows} rowKey={(v) => v.id} empty="No vendors match these filters." tableId="vendors-table" tableClass="table table--tight as-table" />}
          </div>
        </section>
      </div>
      {dialog && <VendorDialog vendor={dialog.vendor} onClose={() => setDialog(null)} />}
    </Frame>
  );
}