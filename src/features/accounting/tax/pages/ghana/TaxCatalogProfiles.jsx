import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';

import { useApi } from '../../../../../shared/hooks/useApi.js';
import { qk } from '../../../../../shared/query/keys.js';
import { ContentCard } from '../../../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../../../shared/components/ui/Button.jsx';
import { Input } from '../../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../../../shared/components/ui/Textarea.jsx';
import { Modal } from '../../../../../shared/components/ui/Modal.jsx';
import { Badge } from '../../../../../shared/components/ui/Badge.jsx';
import { Table } from '../../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../../shared/components/ui/Toast.jsx';
import { makeGhanaComplianceApi } from '../../api/ghanaCompliance.api.js';
import { GhanaComplianceShell } from '../../components/GhanaComplianceShell.jsx';
import { PERMISSIONS } from '../../../../../app/constants/permissions.js';
import { PermissionGate } from '../../../../../app/routes/route-guards.jsx';

const SUPPLY_TYPES = [
  { value: 'goods', label: 'Goods' },
  { value: 'services', label: 'Services' },
  { value: 'mixed', label: 'Mixed supply' },
  { value: 'import', label: 'Import' },
  { value: 'export', label: 'Export' },
];

const TAX_SCOPES = [
  { value: 'taxable', label: 'Taxable' },
  { value: 'zero_rated', label: 'Zero-rated' },
  { value: 'exempt', label: 'Exempt' },
  { value: 'relieved', label: 'Relieved' },
  { value: 'out_of_scope', label: 'Out of scope' },
  { value: 'reverse_charge', label: 'Reverse charge' },
  { value: 'import', label: 'Import' },
  { value: 'export', label: 'Export' },
  { value: 'non_recoverable', label: 'Non-recoverable' },
];

const RECOVERY_MODES = [
  { value: 'direct_taxable', label: 'Direct taxable — recoverable' },
  { value: 'direct_exempt', label: 'Direct exempt — blocked' },
  { value: 'mixed', label: 'Mixed-use — apportion' },
  { value: 'not_applicable', label: 'Not applicable' },
];

const TAX_CATEGORIES = [
  { value: '', label: 'Not specified' },
  { value: 'standard', label: 'Standard rated' },
  { value: 'zero_rated', label: 'Zero-rated' },
  { value: 'exempt', label: 'Exempt' },
  { value: 'relieved', label: 'Relieved' },
  { value: 'out_of_scope', label: 'Out of scope' },
];

const EMPTY_FORM = {
  code: '',
  name: '',
  supplyType: 'goods',
  taxCategory: 'standard',
  salesTaxScope: 'taxable',
  purchaseTaxScope: 'taxable',
  salesTaxCodeId: '',
  purchaseTaxCodeId: '',
  exemptionReasonCode: '',
  exemptionReason: '',
  hsCode: '',
  fiscalClassificationCode: '',
  purchaseRecoveryMode: 'direct_taxable',
  defaultRecoverablePercent: '100',
  legalReference: '',
  effectiveFrom: '',
  effectiveTo: '',
  status: 'active',
};

function rowToForm(row) {
  return {
    code: row.code || '',
    name: row.name || '',
    supplyType: row.supply_type || 'goods',
    taxCategory: row.tax_category || '',
    salesTaxScope: row.sales_tax_scope || 'taxable',
    purchaseTaxScope: row.purchase_tax_scope || 'taxable',
    salesTaxCodeId: row.sales_tax_code_id || '',
    purchaseTaxCodeId: row.purchase_tax_code_id || '',
    exemptionReasonCode: row.exemption_reason_code || '',
    exemptionReason: row.exemption_reason || '',
    hsCode: row.hs_code || '',
    fiscalClassificationCode: row.fiscal_classification_code || '',
    purchaseRecoveryMode: row.purchase_recovery_mode || 'direct_taxable',
    defaultRecoverablePercent: row.default_recoverable_percent == null ? '100' : String(Number(row.default_recoverable_percent) * 100),
    legalReference: row.legal_reference || '',
    effectiveFrom: row.effective_from || '',
    effectiveTo: row.effective_to || '',
    status: row.status || 'active',
  };
}

function formToPayload(form) {
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    supplyType: form.supplyType,
    taxCategory: form.taxCategory || null,
    salesTaxScope: form.salesTaxScope,
    purchaseTaxScope: form.purchaseTaxScope,
    salesTaxCodeId: form.salesTaxCodeId || null,
    purchaseTaxCodeId: form.purchaseTaxCodeId || null,
    exemptionReasonCode: form.exemptionReasonCode.trim() || null,
    exemptionReason: form.exemptionReason.trim() || null,
    hsCode: form.hsCode.trim() || null,
    fiscalClassificationCode: form.fiscalClassificationCode.trim() || null,
    purchaseRecoveryMode: form.purchaseRecoveryMode,
    defaultRecoverablePercent: form.defaultRecoverablePercent === '' ? null : Number(form.defaultRecoverablePercent) / 100,
    legalReference: form.legalReference.trim() || null,
    effectiveFrom: form.effectiveFrom || undefined,
    effectiveTo: form.effectiveTo || null,
    status: form.status,
  };
}

function scopeTone(scope) {
  if (scope === 'taxable') return 'success';
  if (scope === 'exempt') return 'warning';
  if (scope === 'zero_rated') return 'info';
  if (scope === 'relieved') return 'primary';
  return 'muted';
}

export default function TaxCatalogProfiles() {
  const { http } = useApi();
  const api = useMemo(() => makeGhanaComplianceApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const profilesQuery = useQuery({
    queryKey: qk.taxCatalogProfiles({}),
    queryFn: () => api.listCatalogProfiles({}),
  });

  const codesQuery = useQuery({
    queryKey: qk.taxCodes({ status: 'active' }),
    queryFn: () => api.listTaxCodes({ status: 'active' }),
    staleTime: 60_000,
  });

  const taxCodeOptions = [
    { value: '', label: 'No default tax code' },
    ...(codesQuery.data ?? []).map((code) => ({
      value: code.id,
      label: code.code && code.name ? `${code.code} — ${code.name}` : code.name || code.code || 'Unnamed tax code',
    })),
  ];

  const saveMutation = useMutation({
    mutationFn: async () => editing
      ? api.updateCatalogProfile(editing.id, formToPayload(form))
      : api.createCatalogProfile(formToPayload(form)),
    onSuccess: async () => {
      toast.success(editing ? 'Tax catalog profile updated' : 'Tax catalog profile created');
      await qc.invalidateQueries({ queryKey: ['tax', 'catalogProfiles'] });
      await qc.invalidateQueries({ queryKey: qk.ghanaReadiness });
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    },
    onError: (error) => toast.error(error?.message || 'Unable to save tax catalog profile'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteCatalogProfile(id),
    onSuccess: async (result) => {
      toast.success(result.deactivated ? 'Profile is in use and was deactivated' : 'Tax catalog profile deleted');
      await qc.invalidateQueries({ queryKey: ['tax', 'catalogProfiles'] });
      await qc.invalidateQueries({ queryKey: qk.ghanaReadiness });
    },
    onError: (error) => toast.error(error?.message || 'Unable to remove tax catalog profile'),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm(rowToForm(row));
    setModalOpen(true);
  }

  const rows = profilesQuery.data ?? [];

  return (
    <GhanaComplianceShell
      title="Tax Catalog Profiles"
      subtitle="Classify goods and services once, then let AptBooks determine the right Ghana tax treatment at transaction time."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => profilesQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <PermissionGate any={[PERMISSIONS.taxManage]} fallback={null}><Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New profile</Button></PermissionGate>
        </div>
      }
    >
      <ContentCard title={`Profiles (${rows.length})`}>
        {profilesQuery.isLoading ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading tax catalog profiles…</div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">No tax catalog profiles have been configured.</div>
        ) : (
          <Table
            rows={rows}
            columns={[
              { header: 'Profile', render: (row) => <div><div className="font-semibold text-slate-900">{row.code}</div><div className="text-xs text-slate-500">{row.name}</div></div> },
              { header: 'Supply', render: (row) => <div className="capitalize">{String(row.supply_type || '').replaceAll('_', ' ')}</div> },
              { header: 'Sales', render: (row) => <div><Badge tone={scopeTone(row.sales_tax_scope)}>{String(row.sales_tax_scope || '—').replaceAll('_', ' ')}</Badge><div className="mt-1 text-xs text-slate-500">{row.sales_tax_code ? `${row.sales_tax_code} — ${row.sales_tax_code_name}` : 'No default sales tax code'}</div></div> },
              { header: 'Purchases', render: (row) => <div><Badge tone={scopeTone(row.purchase_tax_scope)}>{String(row.purchase_tax_scope || '—').replaceAll('_', ' ')}</Badge><div className="mt-1 text-xs text-slate-500">{row.purchase_tax_code ? `${row.purchase_tax_code} — ${row.purchase_tax_code_name}` : 'No default purchase tax code'}</div></div> },
              { header: 'Recovery', render: (row) => <div className="capitalize">{String(row.purchase_recovery_mode || 'not_applicable').replaceAll('_', ' ')}</div> },
              { header: 'Items', render: (row) => row.item_count ?? 0 },
              { header: 'Status', render: (row) => <Badge tone={row.status === 'active' ? 'success' : 'muted'}>{row.status}</Badge> },
              { header: '', render: (row) => <PermissionGate any={[PERMISSIONS.taxManage]} fallback={null}><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => openEdit(row)} aria-label={`Edit ${row.name}`}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(row.id)} disabled={deleteMutation.isPending} aria-label={`Remove ${row.name}`}><Trash2 className="h-4 w-4 text-red-600" /></Button></div></PermissionGate> },
            ]}
          />
        )}
      </ContentCard>

      <Modal
        open={modalOpen}
        title={editing ? `Edit ${editing.name}` : 'New tax catalog profile'}
        onClose={() => setModalOpen(false)}
        footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.code.trim() || !form.name.trim()}>{editing ? 'Save changes' : 'Create profile'}</Button></div>}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Profile code" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value.toUpperCase() }))} placeholder="GH_STANDARD_GOODS" />
          <Input label="Profile name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          <Select label="Supply type" value={form.supplyType} onChange={(e) => setForm((s) => ({ ...s, supplyType: e.target.value }))} options={SUPPLY_TYPES} />
          <Select label="Tax category" value={form.taxCategory} onChange={(e) => setForm((s) => ({ ...s, taxCategory: e.target.value }))} options={TAX_CATEGORIES} />
          <Select label="Sales treatment" value={form.salesTaxScope} onChange={(e) => setForm((s) => ({ ...s, salesTaxScope: e.target.value }))} options={TAX_SCOPES} />
          <Select label="Default sales tax code" value={form.salesTaxCodeId} onChange={(e) => setForm((s) => ({ ...s, salesTaxCodeId: e.target.value }))} options={taxCodeOptions} />
          <Select label="Purchase treatment" value={form.purchaseTaxScope} onChange={(e) => setForm((s) => ({ ...s, purchaseTaxScope: e.target.value }))} options={TAX_SCOPES} />
          <Select label="Default purchase tax code" value={form.purchaseTaxCodeId} onChange={(e) => setForm((s) => ({ ...s, purchaseTaxCodeId: e.target.value }))} options={taxCodeOptions} />
          <Select label="Input recovery basis" value={form.purchaseRecoveryMode} onChange={(e) => setForm((s) => ({ ...s, purchaseRecoveryMode: e.target.value }))} options={RECOVERY_MODES} />
          <Input label="Default recoverable %" type="number" min="0" max="100" step="0.01" value={form.defaultRecoverablePercent} onChange={(e) => setForm((s) => ({ ...s, defaultRecoverablePercent: e.target.value }))} />
          <Input label="HS code" value={form.hsCode} onChange={(e) => setForm((s) => ({ ...s, hsCode: e.target.value }))} />
          <Input label="Fiscal classification" value={form.fiscalClassificationCode} onChange={(e) => setForm((s) => ({ ...s, fiscalClassificationCode: e.target.value }))} />
          <Input label="Exemption / relief code" value={form.exemptionReasonCode} onChange={(e) => setForm((s) => ({ ...s, exemptionReasonCode: e.target.value }))} />
          <Input label="Legal reference" value={form.legalReference} onChange={(e) => setForm((s) => ({ ...s, legalReference: e.target.value }))} />
          <Input label="Effective from" type="date" value={form.effectiveFrom} onChange={(e) => setForm((s) => ({ ...s, effectiveFrom: e.target.value }))} />
          <Input label="Effective to" type="date" value={form.effectiveTo} onChange={(e) => setForm((s) => ({ ...s, effectiveTo: e.target.value }))} />
          <Select label="Status" value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          <div />
          <Textarea className="md:col-span-2" label="Exemption / relief explanation" value={form.exemptionReason} onChange={(e) => setForm((s) => ({ ...s, exemptionReason: e.target.value }))} />
        </div>
      </Modal>
    </GhanaComplianceShell>
  );
}
