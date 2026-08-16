import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { AccountSelect } from '../../../../shared/components/forms/AccountSelect.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { GhanaPayrollShell, titleCase, useGhanaPayrollApi } from './_ghanaPayrollUi.jsx';
import { usePermissions } from '../../../../shared/hooks/usePermissions.js';
import { PERMISSIONS } from '../../../../app/constants/permissions.js';

const initial = {
  enabled: false,
  payeEnabled: false,
  ssnitEnabled: false,
  tier2Enabled: false,
  payePayableAccountId: '',
  ssnitTier1PayableAccountId: '',
  tier2PayableAccountId: '',
  employerPensionExpenseAccountId: '',
  defaultTier2SchemeName: '',
  graTaxOffice: '',
  employerTaxId: '',
  ssnitEmployerNumber: '',
};

export default function GhanaPayrollOverview() {
  const api = useGhanaPayrollApi();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.hrPayrollGhanaManage);
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(initial);
  const settingsQ = useQuery({ queryKey: ['hr', 'payroll', 'ghana', 'settings'], queryFn: () => api.getSettings() });

  useEffect(() => {
    const s = settingsQ.data;
    if (!s) return;
    setForm({
      enabled: s.enabled === true,
      payeEnabled: s.paye_enabled === true,
      ssnitEnabled: s.ssnit_enabled === true,
      tier2Enabled: s.tier2_enabled === true,
      payePayableAccountId: s.paye_payable_account_id ?? '',
      ssnitTier1PayableAccountId: s.ssnit_tier1_payable_account_id ?? '',
      tier2PayableAccountId: s.tier2_payable_account_id ?? '',
      employerPensionExpenseAccountId: s.employer_pension_expense_account_id ?? '',
      defaultTier2SchemeName: s.default_tier2_scheme_name ?? '',
      graTaxOffice: s.gra_tax_office ?? '',
      employerTaxId: s.employer_tax_id ?? '',
      ssnitEmployerNumber: s.ssnit_employer_number ?? '',
    });
  }, [settingsQ.data]);

  const save = useMutation({
    mutationFn: () => api.updateSettings({
      ...form,
      payePayableAccountId: form.payePayableAccountId || null,
      ssnitTier1PayableAccountId: form.ssnitTier1PayableAccountId || null,
      tier2PayableAccountId: form.tier2PayableAccountId || null,
      employerPensionExpenseAccountId: form.employerPensionExpenseAccountId || null,
      defaultTier2SchemeName: form.defaultTier2SchemeName || null,
      graTaxOffice: form.graTaxOffice || null,
      employerTaxId: form.employerTaxId || null,
      ssnitEmployerNumber: form.ssnitEmployerNumber || null,
    }),
    onSuccess: () => { toast.success('Ghana payroll settings saved.'); qc.invalidateQueries({ queryKey: ['hr', 'payroll', 'ghana', 'settings'] }); },
    onError: (e) => toast.error(e?.message ?? 'Could not save Ghana payroll settings.'),
  });

  const s = settingsQ.data;
  const setupChecks = [
    ['Employer tax ID', Boolean(s?.employer_tax_id)],
    ['PAYE payable account', !s?.paye_enabled || Boolean(s?.paye_payable_account_id)],
    ['SSNIT Tier 1 payable account', !s?.ssnit_enabled || Boolean(s?.ssnit_tier1_payable_account_id)],
    ['Tier 2 payable account', !s?.tier2_enabled || Boolean(s?.tier2_payable_account_id)],
    ['Employer pension expense account', !s?.ssnit_enabled || Boolean(s?.employer_pension_expense_account_id)],
  ];

  return (
    <GhanaPayrollShell title="Ghana Payroll" subtitle="Configure PAYE, SSNIT Tier 1 and Tier 2 statutory payroll without exposing internal accounting IDs.">
      <div className="grid gap-4 lg:grid-cols-3">
        <ContentCard title="Statutory status" className="lg:col-span-1">
          <div className="space-y-3">
            {setupChecks.map(([label, ok]) => <div key={label} className="flex items-center justify-between rounded-xl border border-border-subtle px-3 py-2 text-sm"><span>{label}</span>{ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-amber-600" />}</div>)}
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Ghana payroll status: <strong>{s?.enabled ? 'Enabled' : 'Disabled'}</strong>. PAYE: {titleCase(s?.paye_enabled ? 'enabled' : 'disabled')}; SSNIT: {titleCase(s?.ssnit_enabled ? 'enabled' : 'disabled')}; Tier 2: {titleCase(s?.tier2_enabled ? 'enabled' : 'disabled')}.</div>
        </ContentCard>

        <ContentCard title="Ghana payroll settings" className="lg:col-span-2">
          {settingsQ.isLoading ? <div className="py-8 text-sm text-slate-500">Loading Ghana payroll settings…</div> : (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (canManage) save.mutate(); }}><fieldset disabled={!canManage} className="contents">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} /> Enable Ghana payroll</label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.payeEnabled} onChange={(e) => setForm((f) => ({ ...f, payeEnabled: e.target.checked }))} /> PAYE</label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.ssnitEnabled} onChange={(e) => setForm((f) => ({ ...f, ssnitEnabled: e.target.checked }))} /> SSNIT</label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.tier2Enabled} onChange={(e) => setForm((f) => ({ ...f, tier2Enabled: e.target.checked }))} /> Tier 2</label>
              <Input label="Employer tax ID" value={form.employerTaxId} onChange={(e) => setForm((f) => ({ ...f, employerTaxId: e.target.value }))} />
              <Input label="GRA tax office" value={form.graTaxOffice} onChange={(e) => setForm((f) => ({ ...f, graTaxOffice: e.target.value }))} />
              <Input label="SSNIT employer number" value={form.ssnitEmployerNumber} onChange={(e) => setForm((f) => ({ ...f, ssnitEmployerNumber: e.target.value }))} />
              <Input label="Default Tier 2 scheme" value={form.defaultTier2SchemeName} onChange={(e) => setForm((f) => ({ ...f, defaultTier2SchemeName: e.target.value }))} />
              <AccountSelect label="PAYE payable account" value={form.payePayableAccountId} onChange={(e) => setForm((f) => ({ ...f, payePayableAccountId: e.target.value }))} allowEmpty />
              <AccountSelect label="SSNIT Tier 1 payable account" value={form.ssnitTier1PayableAccountId} onChange={(e) => setForm((f) => ({ ...f, ssnitTier1PayableAccountId: e.target.value }))} allowEmpty />
              <AccountSelect label="Tier 2 payable account" value={form.tier2PayableAccountId} onChange={(e) => setForm((f) => ({ ...f, tier2PayableAccountId: e.target.value }))} allowEmpty />
              <AccountSelect label="Employer pension expense account" value={form.employerPensionExpenseAccountId} onChange={(e) => setForm((f) => ({ ...f, employerPensionExpenseAccountId: e.target.value }))} allowEmpty />
              <div className="md:col-span-2"><Button type="submit" loading={save.isPending}>Save Ghana payroll settings</Button>{!canManage ? <span className="ml-3 text-sm text-slate-500">Read-only access.</span> : null}</div></fieldset>
            </form>
          )}
        </ContentCard>
      </div>
    </GhanaPayrollShell>
  );
}
