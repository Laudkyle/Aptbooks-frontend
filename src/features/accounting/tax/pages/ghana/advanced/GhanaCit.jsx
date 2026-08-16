import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { PERMISSIONS } from '../../../../../../app/constants/permissions.js';
import { ROUTES } from '../../../../../../app/constants/routes.js';
import { AccountSelect } from '../../../../../../shared/components/forms/AccountSelect.jsx';
import { ContentCard } from '../../../../../../shared/components/layout/ContentCard.jsx';
import { Badge } from '../../../../../../shared/components/ui/Badge.jsx';
import { Button } from '../../../../../../shared/components/ui/Button.jsx';
import { Input } from '../../../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../../../shared/components/ui/Select.jsx';
import { useToast } from '../../../../../../shared/components/ui/Toast.jsx';
import { usePermissions } from '../../../../../../shared/hooks/usePermissions.js';
import { GhanaComplianceShell } from '../../../components/GhanaComplianceShell.jsx';
import { dateText, money, titleCase, useGhanaAdvancedApi } from './_advancedUi.jsx';

const thisYear = new Date().getFullYear();
const initialSettings = {
  enabled: false,
  defaultRateVersionId: '',
  basisPeriodStartMonth: 1,
  basisPeriodEndMonth: 12,
  citPayableAccountId: '',
  citExpenseAccountId: '',
  taxCreditReceivableAccountId: '',
  graTaxOffice: '',
  taxpayerId: '',
  industryRateReviewed: false,
};

export default function GhanaCit() {
  const api = useGhanaAdvancedApi();
  const toast = useToast();
  const qc = useQueryClient();
  const permissions = usePermissions();
  const canManage = permissions.can(PERMISSIONS.taxGhanaCitManage);
  const canFile = permissions.can(PERMISSIONS.taxGhanaCitFile);

  const [settings, setSettings] = useState(initialSettings);
  const [comp, setComp] = useState({ taxYear: String(thisYear), basisPeriodStart: `${thisYear}-01-01`, basisPeriodEnd: `${thisYear}-12-31`, rateVersionId: '' });
  const [sa, setSa] = useState({ taxYear: String(thisYear), basisPeriodStart: `${thisYear}-01-01`, estimatedChargeableIncome: '', taxCredits: '', rateVersionId: '', reasonsForRevision: '' });
  const [filing, setFiling] = useState({ assessmentId: '', graReference: '' });
  const [payment, setPayment] = useState({ assessmentId: '', quarter: '1', paidDate: '', amountPaid: '', reference: '' });

  const settingsQ = useQuery({ queryKey: ['gra', 'cit', 'settings'], queryFn: () => api.cit.getSettings() });
  const ratesQ = useQuery({ queryKey: ['gra', 'cit', 'rates'], queryFn: () => api.cit.listRates() });
  const compsQ = useQuery({ queryKey: ['gra', 'cit', 'computations'], queryFn: () => api.cit.listComputations() });
  const saQ = useQuery({ queryKey: ['gra', 'cit', 'selfAssessments'], queryFn: () => api.cit.listSelfAssessments() });

  useEffect(() => {
    const s = settingsQ.data;
    if (!s) return;
    setSettings({
      enabled: s.enabled === true,
      defaultRateVersionId: s.default_rate_version_id ?? '',
      basisPeriodStartMonth: s.basis_period_start_month,
      basisPeriodEndMonth: s.basis_period_end_month,
      citPayableAccountId: s.cit_payable_account_id ?? '',
      citExpenseAccountId: s.cit_expense_account_id ?? '',
      taxCreditReceivableAccountId: s.tax_credit_receivable_account_id ?? '',
      graTaxOffice: s.gra_tax_office ?? '',
      taxpayerId: s.taxpayer_id ?? '',
      industryRateReviewed: s.industry_rate_reviewed === true,
    });
    setComp((current) => ({ ...current, rateVersionId: s.default_rate_version_id ?? '' }));
    setSa((current) => ({ ...current, rateVersionId: s.default_rate_version_id ?? '' }));
  }, [settingsQ.data]);

  const rateOptions = useMemo(() => [
    { value: '', label: 'Select CIT rate' },
    ...(ratesQ.data ?? []).map((r) => ({ value: r.id, label: `${r.code} — ${r.name} (${r.tax_rate}%)` })),
  ], [ratesQ.data]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['gra', 'cit'] });
    qc.invalidateQueries({ queryKey: ['tax', 'ghana', 'readiness'] });
  };

  const save = useMutation({
    mutationFn: () => api.cit.updateSettings({
      ...settings,
      defaultRateVersionId: settings.defaultRateVersionId || null,
      citPayableAccountId: settings.citPayableAccountId || null,
      citExpenseAccountId: settings.citExpenseAccountId || null,
      taxCreditReceivableAccountId: settings.taxCreditReceivableAccountId || null,
    }),
    onSuccess: () => { toast.success('CIT settings saved.'); refresh(); },
    onError: (e) => toast.error(e?.message ?? 'Could not save CIT settings.'),
  });
  const prepare = useMutation({
    mutationFn: () => api.cit.prepareComputation({ ...comp, taxYear: Number(comp.taxYear), rateVersionId: comp.rateVersionId || undefined }),
    onSuccess: () => { toast.success('DT101 computation prepared.'); refresh(); },
    onError: (e) => toast.error(e?.message ?? 'Could not prepare CIT computation.'),
  });
  const createSa = useMutation({
    mutationFn: () => api.cit.createSelfAssessment({
      ...sa,
      taxYear: Number(sa.taxYear),
      taxCredits: sa.taxCredits || '0',
      rateVersionId: sa.rateVersionId || undefined,
      reasonsForRevision: sa.reasonsForRevision || undefined,
    }),
    onSuccess: () => { toast.success('CIT self-assessment prepared.'); refresh(); },
    onError: (e) => toast.error(e?.message ?? 'Could not prepare self-assessment.'),
  });
  const finalizeSa = useMutation({
    mutationFn: (id) => api.cit.finalizeSelfAssessment(id),
    onSuccess: () => { toast.success('Self-assessment finalized.'); refresh(); },
    onError: (e) => toast.error(e?.message ?? 'Could not finalize self-assessment.'),
  });
  const fileSa = useMutation({
    mutationFn: () => api.cit.markSelfAssessmentFiled(filing.assessmentId, filing.graReference),
    onSuccess: () => { toast.success('Self-assessment marked filed.'); setFiling({ assessmentId: '', graReference: '' }); refresh(); },
    onError: (e) => toast.error(e?.message ?? 'Could not mark self-assessment filed.'),
  });
  const paySa = useMutation({
    mutationFn: () => api.cit.recordSelfAssessmentPayment(payment.assessmentId, {
      quarter: Number(payment.quarter),
      paidDate: payment.paidDate,
      amountPaid: payment.amountPaid,
      reference: payment.reference || null,
    }),
    onSuccess: () => { toast.success('Quarterly CIT instalment recorded.'); setPayment({ assessmentId: '', quarter: '1', paidDate: '', amountPaid: '', reference: '' }); refresh(); },
    onError: (e) => toast.error(e?.message ?? 'Could not record CIT instalment.'),
  });

  const activePaymentAssessment = (saQ.data ?? []).find((row) => row.id === payment.assessmentId);
  const activePaymentInstalment = activePaymentAssessment?.instalments_json?.find((x) => String(x.quarter) === String(payment.quarter));

  return (
    <GhanaComplianceShell title="Corporate Income Tax" subtitle="DT101 annual computation, DT102/DT102A self-assessment and quarterly instalment tracking.">
      <div className="grid gap-4 xl:grid-cols-2">
        <ContentCard title="CIT settings">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (canManage) save.mutate(); }}>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.enabled} disabled={!canManage} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} /> Enable Ghana CIT</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.industryRateReviewed} disabled={!canManage} onChange={(e) => setSettings({ ...settings, industryRateReviewed: e.target.checked })} /> Special-rate eligibility reviewed</label>
            <Input label="Taxpayer ID / TIN" value={settings.taxpayerId} disabled={!canManage} onChange={(e) => setSettings({ ...settings, taxpayerId: e.target.value })} />
            <Input label="GRA tax office" value={settings.graTaxOffice} disabled={!canManage} onChange={(e) => setSettings({ ...settings, graTaxOffice: e.target.value })} />
            <Select label="Default CIT rate" value={settings.defaultRateVersionId} disabled={!canManage} onChange={(e) => setSettings({ ...settings, defaultRateVersionId: e.target.value, industryRateReviewed: false })} options={rateOptions} />
            <Input label="Basis period start month" type="number" min="1" max="12" value={settings.basisPeriodStartMonth} disabled={!canManage} onChange={(e) => setSettings({ ...settings, basisPeriodStartMonth: Number(e.target.value) })} />
            <Input label="Basis period end month" type="number" min="1" max="12" value={settings.basisPeriodEndMonth} disabled={!canManage} onChange={(e) => setSettings({ ...settings, basisPeriodEndMonth: Number(e.target.value) })} />
            <AccountSelect label="CIT payable account" value={settings.citPayableAccountId} disabled={!canManage} onChange={(e) => setSettings({ ...settings, citPayableAccountId: e.target.value })} allowEmpty />
            <AccountSelect label="CIT expense account" value={settings.citExpenseAccountId} disabled={!canManage} onChange={(e) => setSettings({ ...settings, citExpenseAccountId: e.target.value })} allowEmpty />
            <AccountSelect label="Tax credit receivable account" value={settings.taxCreditReceivableAccountId} disabled={!canManage} onChange={(e) => setSettings({ ...settings, taxCreditReceivableAccountId: e.target.value })} allowEmpty />
            {canManage ? <div className="md:col-span-2"><Button type="submit" loading={save.isPending}>Save CIT settings</Button></div> : null}
          </form>
        </ContentCard>

        <ContentCard title="Prepare DT101">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (canManage) prepare.mutate(); }}>
            <Input label="Tax year" type="number" value={comp.taxYear} disabled={!canManage} onChange={(e) => setComp({ ...comp, taxYear: e.target.value })} />
            <Select label="CIT rate" value={comp.rateVersionId} disabled={!canManage} onChange={(e) => setComp({ ...comp, rateVersionId: e.target.value })} options={rateOptions} />
            <Input label="Basis period start" type="date" value={comp.basisPeriodStart} disabled={!canManage} onChange={(e) => setComp({ ...comp, basisPeriodStart: e.target.value })} />
            <Input label="Basis period end" type="date" value={comp.basisPeriodEnd} disabled={!canManage} onChange={(e) => setComp({ ...comp, basisPeriodEnd: e.target.value })} />
            <div className="md:col-span-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Accounting profit, finalized capital allowances, received income-WHT credits and finalized CIT instalments are pulled from the backend's accounting records by default.</div>
            {canManage ? <div className="md:col-span-2"><Button type="submit" loading={prepare.isPending}>Prepare DT101</Button></div> : null}
          </form>
        </ContentCard>
      </div>

      <ContentCard title="CIT computations">
        <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="px-3 py-3">Year</th><th className="px-3 py-3">Version</th><th className="px-3 py-3">Rate</th><th className="px-3 py-3">Accounting profit</th><th className="px-3 py-3">Chargeable income</th><th className="px-3 py-3">Net CIT</th><th className="px-3 py-3">Due</th><th className="px-3 py-3">Status</th><th /></tr></thead><tbody>{(compsQ.data ?? []).map((r) => <tr key={r.id} className="border-b border-slate-100"><td className="px-3 py-3">{r.tax_year}</td><td className="px-3 py-3">v{r.version_no}</td><td className="px-3 py-3">{r.rate_code} · {r.tax_rate}%</td><td className="px-3 py-3">{money(r.accounting_profit)}</td><td className="px-3 py-3">{money(r.chargeable_income)}</td><td className="px-3 py-3">{money(r.net_tax_payable)}</td><td className="px-3 py-3">{dateText(r.annual_return_due_date)}</td><td className="px-3 py-3"><Badge>{titleCase(r.status)}</Badge></td><td className="px-3 py-3 text-right"><Link to={ROUTES.accountingTaxGhanaCitComputation(r.id)}><Button size="sm" variant="outline">Open</Button></Link></td></tr>)}</tbody></table></div>
      </ContentCard>

      <ContentCard title="DT102 / DT102A self-assessment">
        {canManage ? <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" onSubmit={(e) => { e.preventDefault(); createSa.mutate(); }}>
          <Input label="Tax year" type="number" value={sa.taxYear} onChange={(e) => setSa({ ...sa, taxYear: e.target.value })} />
          <Input label="Basis period start" type="date" value={sa.basisPeriodStart} onChange={(e) => setSa({ ...sa, basisPeriodStart: e.target.value })} />
          <Select label="CIT rate" value={sa.rateVersionId} onChange={(e) => setSa({ ...sa, rateVersionId: e.target.value })} options={rateOptions} />
          <Input label="Estimated chargeable income" type="number" step="0.01" value={sa.estimatedChargeableIncome} onChange={(e) => setSa({ ...sa, estimatedChargeableIncome: e.target.value })} />
          <Input label="Tax credits" type="number" step="0.01" value={sa.taxCredits} onChange={(e) => setSa({ ...sa, taxCredits: e.target.value })} />
          <Input label="Revision reason (DT102A)" value={sa.reasonsForRevision} onChange={(e) => setSa({ ...sa, reasonsForRevision: e.target.value })} />
          <div className="xl:col-span-6"><Button type="submit" loading={createSa.isPending}>Prepare self-assessment</Button></div>
        </form> : null}

        <div className="mt-5 space-y-3">{(saQ.data ?? []).map((r) => <div key={r.id} className="rounded-xl border border-border-subtle p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><strong>{r.form_code} · {r.tax_year} · v{r.version_no}</strong><div className="text-xs text-slate-500">Estimated CIT {money(r.estimated_annual_tax)} · {r.rate_code} {r.tax_rate}%</div></div><div className="flex items-center gap-2"><Badge>{titleCase(r.status)}</Badge>{canFile && r.status === 'draft' ? <Button size="sm" onClick={() => finalizeSa.mutate(r.id)} loading={finalizeSa.isPending}>Finalize</Button> : null}{canFile && r.status === 'finalized' ? <Button size="sm" variant="outline" onClick={() => setFiling({ assessmentId: r.id, graReference: '' })}>Mark filed</Button> : null}{canManage && ['finalized','filed'].includes(r.status) ? <Button size="sm" variant="outline" onClick={() => setPayment({ assessmentId: r.id, quarter: '1', paidDate: '', amountPaid: r.instalments_json?.[0]?.amountDue ?? '', reference: '' })}>Record instalment</Button> : null}</div></div>
          <div className="mt-3 grid gap-2 md:grid-cols-4">{(r.instalments_json ?? []).map((x) => <div key={x.quarter} className="rounded-lg bg-slate-50 p-3 text-xs"><strong>Q{x.quarter}</strong><div>Due {dateText(x.dueDate)}</div><div>{money(x.amountDue)} · paid {money(x.amountPaid)}</div></div>)}</div>
        </div>)}</div>
      </ContentCard>

      {filing.assessmentId ? <ContentCard title="Record GRA filing"><form className="flex flex-col gap-3 md:flex-row md:items-end" onSubmit={(e) => { e.preventDefault(); fileSa.mutate(); }}><Input label="GRA filing reference" value={filing.graReference} onChange={(e) => setFiling({ ...filing, graReference: e.target.value })} required /><Button type="submit" loading={fileSa.isPending}>Mark filed</Button><Button type="button" variant="outline" onClick={() => setFiling({ assessmentId: '', graReference: '' })}>Cancel</Button></form></ContentCard> : null}

      {payment.assessmentId ? <ContentCard title={`Record ${activePaymentAssessment?.form_code ?? 'CIT'} quarterly instalment`}><form className="grid gap-3 md:grid-cols-4" onSubmit={(e) => { e.preventDefault(); paySa.mutate(); }}><Select label="Quarter" value={payment.quarter} onChange={(e) => { const quarter = e.target.value; const selected = activePaymentAssessment?.instalments_json?.find((x) => String(x.quarter) === quarter); setPayment({ ...payment, quarter, amountPaid: selected?.amountDue ?? payment.amountPaid }); }} options={(activePaymentAssessment?.instalments_json ?? []).map((x) => ({ value: String(x.quarter), label: `Q${x.quarter} — due ${dateText(x.dueDate)}` }))} /><Input label="Payment date" type="date" value={payment.paidDate} onChange={(e) => setPayment({ ...payment, paidDate: e.target.value })} required /><Input label={`Amount (${activePaymentInstalment ? `scheduled ${money(activePaymentInstalment.amountDue)}` : 'GHS'})`} type="number" step="0.01" value={payment.amountPaid} onChange={(e) => setPayment({ ...payment, amountPaid: e.target.value })} required /><Input label="Payment reference" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} /><div className="md:col-span-4 flex gap-2"><Button type="submit" loading={paySa.isPending}>Record instalment</Button><Button type="button" variant="outline" onClick={() => setPayment({ assessmentId: '', quarter: '1', paidDate: '', amountPaid: '', reference: '' })}>Cancel</Button></div></form></ContentCard> : null}
    </GhanaComplianceShell>
  );
}
