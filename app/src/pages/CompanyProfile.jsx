// The Settings page's "Company profile" section (L1), in the design system: the company's name, overview and mission from
// data/company-store.js. An Admin (company:edit) saves them (the store's checks and words: the name 2-100 characters on one
// line, the overview up to 1,000, the mission up to 300); everyone else reads them. The shell, the tab title, About and
// the payslip follow the saved name at once.
import { useState } from "react";
import { getCompanyProfile, updateCompanyProfile, COMPANY_LIMITS } from "../../../assets/js/data/company-store.js";
import { useData, useAction, useSession, useCan } from "../data/hooks.js";
import { useToast } from "../ui/Toast.jsx";
import { Card } from "../components/Layout.jsx";
import { Field, Input, TextArea } from "../components/Form.jsx";
import { formatDay } from "../../../assets/js/ui/leave-view.js";
import { getUser } from "../../../assets/js/data/store.js";

export default function CompanyProfile() {
  const { userId } = useSession();
  const canEdit = useCan("company:edit");
  const toast = useToast();
  const save = useAction(updateCompanyProfile);
  const saved = useData(() => getCompanyProfile());
  const [f, setF] = useState(() => ({ name: saved.name, overview: saved.overview, mission: saved.mission }));
  const [error, setError] = useState(null);
  const changed = ["name", "overview", "mission"].filter((k) => f[k] !== saved[k]);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setError(null); };
  const err = (k) => (error?.field === k ? error.text : null);
  const count = (k) => `${f[k].trim().length} of ${COMPANY_LIMITS[k][1]} characters`;

  const submit = (e) => {
    e.preventDefault();
    if (!changed.length) { toast("Nothing to change.", "info"); return; }
    const r = save(userId, Object.fromEntries(changed.map((k) => [k, f[k]])));
    if (!r.ok) { if (r.field && r.field in f) setError({ field: r.field, text: r.error }); else toast(r.error, "danger"); return; }
    setF({ name: r.profile.name, overview: r.profile.overview, mission: r.profile.mission });
    toast("Company profile saved.", "success");
  };
  const by = saved.updatedBy ? getUser(saved.updatedBy)?.name ?? saved.updatedBy : null;

  return (
    <Card id="company-profile" title="Company profile" meta={canEdit ? "Saved for everyone" : "Only an Admin can change it"}
      footer={saved.updatedAt ? `Last changed ${formatDay(saved.updatedAt.slice(0, 10), true)}${by ? ` by ${by}` : ""}.` : "Not changed yet: the sample company's name."}>
      <form className="ds-stack" onSubmit={submit} noValidate id="company-profile-form">
        <Field id="cp-name" label="Company name" required error={err("name")} hint="Shown at the top of every page, on the tab and on payslips.">
          <Input id="cp-name" type="text" value={f.name} disabled={!canEdit} maxLength={COMPANY_LIMITS.name[1] + 20} error={err("name")} hint="Shown at the top of every page, on the tab and on payslips." onChange={set("name")} />
        </Field>
        <Field id="cp-overview" label="Overview" error={err("overview")} hint={count("overview")}>
          <TextArea id="cp-overview" value={f.overview} disabled={!canEdit} rows={4} error={err("overview")} hint={count("overview")} onChange={set("overview")} />
        </Field>
        <Field id="cp-mission" label="Mission" error={err("mission")} hint={count("mission")}>
          <TextArea id="cp-mission" value={f.mission} disabled={!canEdit} rows={3} error={err("mission")} hint={count("mission")} onChange={set("mission")} />
        </Field>
        {canEdit && (
          <div className="ds-form-actions">
            <span className="ds-hint">{changed.length ? `${changed.length} unsaved ${changed.length === 1 ? "change" : "changes"}` : "No unsaved changes"}</span>
            <div className="ds-form-actions__buttons">
              <button type="button" className="ds-btn" disabled={!changed.length} onClick={() => { setF({ name: saved.name, overview: saved.overview, mission: saved.mission }); setError(null); }}>Undo changes</button>
              <button type="submit" className="ds-btn ds-btn--primary">Save company profile</button>
            </div>
          </div>
        )}
      </form>
    </Card>
  );
}