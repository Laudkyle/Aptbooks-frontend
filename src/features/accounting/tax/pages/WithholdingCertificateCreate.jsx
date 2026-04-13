import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileCheck2 } from 'lucide-react';

import { useApi } from '../../../../shared/hooks/useApi.js';
import { qk } from '../../../../shared/query/keys.js';
import { makeTaxApi } from '../api/tax.api.js';
import { makeCoaApi } from '../../chartOfAccounts/api/coa.api.js';
import { ROUTES } from '../../../../app/constants/routes.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../../shared/components/ui/Textarea.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { normalizeRows } from '../../../../shared/tax/frontendTax.js';

export default function WithholdingCertificateCreate() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeTaxApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const toast = useToast();

  const [form, setForm] = useState({
    certificateNo: '',
    customerId: '',
    jurisdictionId: '',
    taxCodeId: '',
    certificateDate: new Date().toISOString().slice(0, 10),
    counterAccountId: '',
    issuedBy: '',
    reference: '',
    memo: '',
  });
  const [selectedIds, setSelectedIds] = useState([]);

  const openItemsQ = useQuery({
    queryKey: qk.withholdingOpenItems({ direction: 'receivable' }),
    queryFn: () => api.listWithholdingOpenItems({ direction: 'receivable' }),
  });
  const accountsQ = useQuery({
    queryKey: qk.coaAccounts({ includeArchived: 'false', group: 'certificate' }),
    queryFn: () => coaApi.list({ includeArchived: 'false', limit: 500 }),
  });
  const jurisdictionsQ = useQuery({
    queryKey: ['tax-juris', 'withholding-certificate-create'],
    queryFn: api.listJurisdictions,
  });
  const codesQ = useQuery({
    queryKey: ['tax-codes-admin', 'withholding-certificate-create'],
    queryFn: () => api.listCodes({ taxCategory: 'withholding' }),
  });

  const openItems = normalizeRows(openItemsQ.data);
  const accounts = normalizeRows(accountsQ.data);
  const jurisdictions = normalizeRows(jurisdictionsQ.data);
  const codes = normalizeRows(codesQ.data);

  const eligibleItems = openItems.filter((item) => {
    if (form.customerId && item.partner_id && item.partner_id !== form.customerId) return false;
    if (form.jurisdictionId && item.jurisdiction_id && item.jurisdiction_id !== form.jurisdictionId) return false;
    if (form.taxCodeId && item.tax_code_id && item.tax_code_id !== form.taxCodeId) return false;
    return true;
  });
  const selectedItems = eligibleItems.filter((item) => selectedIds.includes(item.source_id || item.id));
  const totalAmount = selectedItems.reduce((sum, item) => sum + Number(item.outstanding_amount ?? item.available_amount ?? 0), 0);

  const create = useMutation({
    mutationFn: () => api.createWithholdingCertificate({
      certificateNo: form.certificateNo,
      customerId: form.customerId || null,
      jurisdictionId: form.jurisdictionId || null,
      taxCodeId: form.taxCodeId || null,
      certificateDate: form.certificateDate,
      counterAccountId: form.counterAccountId || null,
      issuedBy: form.issuedBy || null,
      reference: form.reference || null,
      memo: form.memo || null,
      lines: selectedItems.map((item) => ({
        sourceId: item.source_id || item.id,
        sourceType: item.source_type || 'invoice',
        appliedAmount: Number(item.outstanding_amount ?? item.available_amount ?? 0),
      })),
    }),
    onSuccess: (res) => {
      const created = res?.data ?? res;
      toast.success('Withholding certificate draft created.');
      if (created?.id) navigate(ROUTES.accountingTaxWithholdingCertificateDetail(created.id));
      else navigate(ROUTES.accountingTaxWithholding);
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed to create certificate'),
  });

  const accountOptions = [{ value: '', label: 'Select counter account' }].concat(accounts.map((account) => ({ value: account.id, label: `${account.code || ''} ${account.name || account.accountName || ''}`.trim() })));
  const jurisdictionOptions = [{ value: '', label: 'All jurisdictions' }].concat(jurisdictions.map((row) => ({ value: row.id, label: `${row.code} — ${row.name}` })));
  const codeOptions = [{ value: '', label: 'All withholding codes' }].concat(codes.map((row) => ({ value: row.id, label: `${row.code} — ${row.name}` })));

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="New withholding certificate"
        subtitle="Capture customer-side withholding evidence and prepare it for posting."
        icon={FileCheck2}
        actions={<Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.accountingTaxWithholding)}>Back to workspace</Button>}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <ContentCard title="Certificate details">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Certificate number" value={form.certificateNo} onChange={(e) => setForm((s) => ({ ...s, certificateNo: e.target.value }))} />
            <Input label="Customer ID" value={form.customerId} onChange={(e) => setForm((s) => ({ ...s, customerId: e.target.value }))} />
            <Select label="Jurisdiction" value={form.jurisdictionId} onChange={(e) => setForm((s) => ({ ...s, jurisdictionId: e.target.value }))} options={jurisdictionOptions} />
            <Select label="Tax code" value={form.taxCodeId} onChange={(e) => setForm((s) => ({ ...s, taxCodeId: e.target.value }))} options={codeOptions} />
            <Input label="Certificate date" type="date" value={form.certificateDate} onChange={(e) => setForm((s) => ({ ...s, certificateDate: e.target.value }))} />
            <Select label="Counter account" value={form.counterAccountId} onChange={(e) => setForm((s) => ({ ...s, counterAccountId: e.target.value }))} options={accountOptions} />
            <Input label="Issued by" value={form.issuedBy} onChange={(e) => setForm((s) => ({ ...s, issuedBy: e.target.value }))} />
            <Input label="Reference" value={form.reference} onChange={(e) => setForm((s) => ({ ...s, reference: e.target.value }))} />
            <div className="md:col-span-2"><Textarea label="Memo" value={form.memo} onChange={(e) => setForm((s) => ({ ...s, memo: e.target.value }))} rows={4} /></div>
          </div>
        </ContentCard>

        <ContentCard title="Eligible items" actions={<div className="text-sm font-medium text-text-strong">{selectedItems.length} selected</div>}>
          <div className="space-y-3 max-h-[34rem] overflow-auto pr-1">
            {eligibleItems.map((item) => {
              const key = item.source_id || item.id;
              const checked = selectedIds.includes(key);
              return (
                <label key={key} className="flex items-start gap-3 rounded-2xl border border-border-subtle p-4">
                  <input type="checkbox" checked={checked} onChange={(e) => setSelectedIds((current) => e.target.checked ? [...current, key] : current.filter((value) => value !== key))} className="mt-1" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-text-strong">{item.document_no || item.source_document_no || key}</div>
                    <div className="mt-1 text-xs text-text-muted">{item.partner_name || item.customer_name || item.partner_id || 'Unknown customer'}</div>
                    <div className="mt-2 grid gap-1 text-xs text-text-body">
                      <div>Outstanding: {Number(item.outstanding_amount ?? item.available_amount ?? 0).toFixed(2)}</div>
                      <div>Tax code: {item.tax_code || item.tax_code_id || '—'}</div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="mt-4 rounded-2xl border border-border-subtle bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm"><span>Total certificate amount</span><span className="font-semibold">{totalAmount.toFixed(2)}</span></div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(ROUTES.accountingTaxWithholding)}>Cancel</Button>
            <Button disabled={!selectedItems.length || !form.certificateNo || !form.counterAccountId} loading={create.isPending} onClick={() => create.mutate()}>Create certificate draft</Button>
          </div>
        </ContentCard>
      </div>
    </div>
  );
}
