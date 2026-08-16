import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, RefreshCw, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { useApi } from '../../../../../shared/hooks/useApi.js';
import { qk } from '../../../../../shared/query/keys.js';
import { makePartnersApi } from '../../../../business/api/partners.api.js';
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

const EMPTY_FORM = {
  partnerId: '',
  legalName: '',
  taxRegistrationNo: '',
  taxClass: 'standard',
  residencyStatus: 'unknown',
  economicActivityCode: '',
  registrationStatus: 'unregistered',
  isTaxRegistered: false,
  isTaxExempt: false,
  jurisdictionId: '',
  defaultTaxCodeId: '',
  purchaseTaxCodeId: '',
  salesTaxCodeId: '',
  withholdingApplicable: false,
  withholdingTaxCodeId: '',
  withholdingRateOverride: '',
  withholdingExempt: false,
  withholdingExemptionReference: '',
  withholdingExemptionExpiry: '',
  defaultWithholdingCategory: '',
  vatWithholdingEligible: false,
  inputTaxRecoveryMode: 'default',
  exemptionReasonCode: '',
  exemptionReason: '',
  reverseChargeApplicable: false,
  destinationCountryCode: 'GH',
  filingContactEmail: '',
};

function profileToForm(profile, partnerId) {
  if (!profile) return { ...EMPTY_FORM, partnerId };
  return {
    partnerId,
    legalName: profile.legal_name || '',
    taxRegistrationNo: profile.tax_registration_no || '',
    taxClass: profile.tax_class || 'standard',
    residencyStatus: profile.residency_status || 'unknown',
    economicActivityCode: profile.economic_activity_code || '',
    registrationStatus: profile.registration_status || 'unregistered',
    isTaxRegistered: profile.is_tax_registered === true,
    isTaxExempt: profile.is_tax_exempt === true,
    jurisdictionId: profile.jurisdiction_id || '',
    defaultTaxCodeId: profile.default_tax_code_id || '',
    purchaseTaxCodeId: profile.purchase_tax_code_id || '',
    salesTaxCodeId: profile.sales_tax_code_id || '',
    withholdingApplicable: profile.withholding_applicable === true,
    withholdingTaxCodeId: profile.withholding_tax_code_id || '',
    withholdingRateOverride: profile.withholding_rate_override == null ? '' : String(profile.withholding_rate_override),
    withholdingExempt: profile.withholding_exempt === true,
    withholdingExemptionReference: profile.withholding_exemption_reference || '',
    withholdingExemptionExpiry: profile.withholding_exemption_expiry || '',
    defaultWithholdingCategory: profile.default_withholding_category || '',
    vatWithholdingEligible: profile.vat_withholding_eligible === true,
    inputTaxRecoveryMode: profile.input_tax_recovery_mode || 'default',
    exemptionReasonCode: profile.exemption_reason_code || '',
    exemptionReason: profile.exemption_reason || '',
    reverseChargeApplicable: profile.reverse_charge_applicable === true,
    destinationCountryCode: profile.destination_country_code || 'GH',
    filingContactEmail: profile.filing_contact_email || '',
  };
}

function formToPayload(form) {
  return {
    partnerId: form.partnerId,
    legalName: form.legalName.trim() || null,
    taxRegistrationNo: form.taxRegistrationNo.trim() || null,
    taxClass: form.taxClass,
    residencyStatus: form.residencyStatus,
    economicActivityCode: form.economicActivityCode.trim() || null,
    registrationStatus: form.registrationStatus,
    isTaxRegistered: form.isTaxRegistered,
    isTaxExempt: form.isTaxExempt,
    jurisdictionId: form.jurisdictionId || null,
    defaultTaxCodeId: form.defaultTaxCodeId || null,
    purchaseTaxCodeId: form.purchaseTaxCodeId || null,
    salesTaxCodeId: form.salesTaxCodeId || null,
    withholdingApplicable: form.withholdingApplicable,
    withholdingTaxCodeId: form.withholdingTaxCodeId || null,
    withholdingRateOverride: form.withholdingRateOverride === '' ? null : Number(form.withholdingRateOverride),
    withholdingExempt: form.withholdingExempt,
    withholdingExemptionReference: form.withholdingExemptionReference.trim() || null,
    withholdingExemptionExpiry: form.withholdingExemptionExpiry || null,
    defaultWithholdingCategory: form.defaultWithholdingCategory || null,
    vatWithholdingEligible: form.vatWithholdingEligible,
    inputTaxRecoveryMode: form.inputTaxRecoveryMode,
    exemptionReasonCode: form.exemptionReasonCode.trim() || null,
    exemptionReason: form.exemptionReason.trim() || null,
    reverseChargeApplicable: form.reverseChargeApplicable,
    destinationCountryCode: form.destinationCountryCode.trim().toUpperCase() || null,
    filingContactEmail: form.filingContactEmail.trim() || null,
  };
}

function partnerLabel(partner) {
  if (partner.code) return `${partner.name} — ${partner.code}`;
  return partner.name;
}

export default function PartnerTaxProfiles() {
  const { http } = useApi();
  const api = useMemo(() => makeGhanaComplianceApi(http), [http]);
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const partnersQuery = useQuery({
    queryKey: qk.partners({}),
    queryFn: () => partnersApi.list({}),
    staleTime: 60_000,
  });
  const profilesQuery = useQuery({
    queryKey: qk.partnerTaxProfiles({}),
    queryFn: () => api.listPartnerProfiles({}),
  });
  const taxCodesQuery = useQuery({
    queryKey: qk.taxCodes({ status: 'active' }),
    queryFn: () => api.listTaxCodes({ status: 'active' }),
    staleTime: 60_000,
  });
  const jurisdictionsQuery = useQuery({
    queryKey: qk.taxJurisdictions,
    queryFn: () => api.listJurisdictions(),
    staleTime: 60_000,
  });
  const withholdingRatesQuery = useQuery({
    queryKey: qk.ghanaWithholdingRates,
    queryFn: () => api.listWithholdingRates(),
    staleTime: 60_000,
  });

  const partners = partnersQuery.data ?? [];
  const profiles = profilesQuery.data ?? [];
  const profileByPartner = useMemo(() => new Map(profiles.map((profile) => [profile.partner_id, profile])), [profiles]);

  const taxCodeOptions = [{ value: '', label: 'No default tax code' }, ...(taxCodesQuery.data ?? []).map((code) => ({ value: code.id, label: code.code && code.name ? `${code.code} — ${code.name}` : code.name || code.code || 'Unnamed tax code' }))];
  const jurisdictionOptions = [{ value: '', label: 'No jurisdiction selected' }, ...(jurisdictionsQuery.data ?? []).map((jurisdiction) => ({ value: jurisdiction.id, label: jurisdiction.code && jurisdiction.name ? `${jurisdiction.code} — ${jurisdiction.name}` : jurisdiction.name || jurisdiction.code || 'Unnamed jurisdiction' }))];
  const withholdingCategoryOptions = [{ value: '', label: 'No default withholding category' }, ...(withholdingRatesQuery.data ?? []).filter((row) => row.withholding_regime === 'income_wht').map((row) => ({ value: row.reporting_group || row.code, label: `${row.name} — ${row.rate}%` }))];

  const saveMutation = useMutation({
    mutationFn: async () => editingProfile
      ? api.updatePartnerProfile(editingProfile.id, formToPayload(form))
      : api.createPartnerProfile(formToPayload(form)),
    onSuccess: async () => {
      toast.success('Partner tax profile saved');
      await qc.invalidateQueries({ queryKey: ['tax', 'partnerProfiles'] });
      setModalOpen(false);
    },
    onError: (error) => toast.error(error?.message || 'Unable to save partner tax profile'),
  });

  function openPartner(partner) {
    const profile = profileByPartner.get(partner.id) || null;
    setEditingProfile(profile);
    setForm(profileToForm(profile, partner.id));
    setModalOpen(true);
  }

  useEffect(() => {
    const requestedPartnerId = searchParams.get('partner');
    if (!requestedPartnerId || !partnersQuery.isSuccess || !profilesQuery.isSuccess) return;
    const partner = partners.find((row) => row.id === requestedPartnerId);
    if (partner) openPartner(partner);
    // Open only after both exact partner and tax-profile datasets are available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, partnersQuery.isSuccess, profilesQuery.isSuccess]);

  return (
    <GhanaComplianceShell
      title="Partner Tax Profiles"
      subtitle="Keep customer and vendor tax identity, residency and withholding treatment ready for Ghana tax workflows."
      actions={<Button variant="outline" onClick={() => profilesQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}
    >
      <ContentCard title="Customers and vendors">
        {partnersQuery.isLoading || profilesQuery.isLoading ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading business partners…</div>
        ) : (
          <Table
            rows={partners}
            columns={[
              { header: 'Partner', render: (row) => <div><div className="font-semibold text-slate-900">{row.name}</div><div className="text-xs text-slate-500">{row.code || 'No partner code'}</div></div> },
              { header: 'Type', render: (row) => <span className="capitalize">{row.type}</span> },
              { header: 'Tax status', render: (row) => { const profile = profileByPartner.get(row.id); if (!profile) return <Badge tone="warning">Not configured</Badge>; return <div className="flex flex-wrap gap-1"><Badge tone={profile.is_tax_registered ? 'success' : 'muted'}>{profile.registration_status || 'unregistered'}</Badge>{profile.is_tax_exempt ? <Badge tone="warning">Exempt</Badge> : null}</div>; } },
              { header: 'TIN / VAT identity', render: (row) => profileByPartner.get(row.id)?.tax_registration_no || '—' },
              { header: 'Residency', render: (row) => String(profileByPartner.get(row.id)?.residency_status || 'unknown').replaceAll('_', ' ') },
              { header: 'Withholding', render: (row) => { const profile = profileByPartner.get(row.id); if (!profile) return '—'; if (profile.withholding_exempt) return <Badge tone="warning">Exempt</Badge>; if (profile.withholding_applicable) return <Badge tone="info">Applicable</Badge>; return <Badge tone="muted">Not set</Badge>; } },
              { header: '', render: (row) => <PermissionGate any={[PERMISSIONS.taxManage]} fallback={null}><Button variant="ghost" size="sm" onClick={() => openPartner(row)}><Pencil className="mr-2 h-4 w-4" />Configure</Button></PermissionGate> },
            ]}
          />
        )}
      </ContentCard>

      <Modal
        open={modalOpen}
        title={`Tax profile — ${partners.find((partner) => partner.id === form.partnerId)?.name || 'Partner'}`}
        onClose={() => setModalOpen(false)}
        footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.partnerId}>Save tax profile</Button></div>}
      >
        <div className="mb-4 rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-4 text-sm text-slate-600">
          <div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-brand-primary" /><span>Choose the readable records you need; AptBooks links them internally.</span></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Legal / registered name" value={form.legalName} onChange={(e) => setForm((s) => ({ ...s, legalName: e.target.value }))} />
          <Input label="TIN / tax registration number" value={form.taxRegistrationNo} onChange={(e) => setForm((s) => ({ ...s, taxRegistrationNo: e.target.value }))} />
          <Select label="Tax class" value={form.taxClass} onChange={(e) => setForm((s) => ({ ...s, taxClass: e.target.value }))} options={[{ value: 'standard', label: 'Standard' }, { value: 'small_business', label: 'Small business' }, { value: 'non_profit', label: 'Non-profit' }, { value: 'government', label: 'Government' }]} />
          <Select label="Residency" value={form.residencyStatus} onChange={(e) => setForm((s) => ({ ...s, residencyStatus: e.target.value }))} options={[{ value: 'resident', label: 'Resident' }, { value: 'non_resident', label: 'Non-resident' }, { value: 'unknown', label: 'Unknown / review required' }]} />
          <Input label="Economic activity code" value={form.economicActivityCode} onChange={(e) => setForm((s) => ({ ...s, economicActivityCode: e.target.value }))} />
          <Select label="Registration status" value={form.registrationStatus} onChange={(e) => setForm((s) => ({ ...s, registrationStatus: e.target.value }))} options={[{ value: 'registered', label: 'Registered' }, { value: 'unregistered', label: 'Unregistered' }, { value: 'pending', label: 'Pending' }, { value: 'suspended', label: 'Suspended' }]} />
          <Select label="Jurisdiction" value={form.jurisdictionId} onChange={(e) => setForm((s) => ({ ...s, jurisdictionId: e.target.value }))} options={jurisdictionOptions} />
          <Select label="Default tax code" value={form.defaultTaxCodeId} onChange={(e) => setForm((s) => ({ ...s, defaultTaxCodeId: e.target.value }))} options={taxCodeOptions} />
          <Select label="Purchase tax code" value={form.purchaseTaxCodeId} onChange={(e) => setForm((s) => ({ ...s, purchaseTaxCodeId: e.target.value }))} options={taxCodeOptions} />
          <Select label="Sales tax code" value={form.salesTaxCodeId} onChange={(e) => setForm((s) => ({ ...s, salesTaxCodeId: e.target.value }))} options={taxCodeOptions} />
          <Select label="Input tax recovery" value={form.inputTaxRecoveryMode} onChange={(e) => setForm((s) => ({ ...s, inputTaxRecoveryMode: e.target.value }))} options={[{ value: 'default', label: 'Use transaction/default rules' }, { value: 'fully_recoverable', label: 'Fully recoverable' }, { value: 'partially_recoverable', label: 'Partially recoverable' }, { value: 'non_recoverable', label: 'Non-recoverable' }]} />
          <Input label="Filing contact email" type="email" value={form.filingContactEmail} onChange={(e) => setForm((s) => ({ ...s, filingContactEmail: e.target.value }))} />
          <label className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm"><input type="checkbox" checked={form.isTaxRegistered} onChange={(e) => setForm((s) => ({ ...s, isTaxRegistered: e.target.checked }))} /> Tax registered</label>
          <label className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm"><input type="checkbox" checked={form.isTaxExempt} onChange={(e) => setForm((s) => ({ ...s, isTaxExempt: e.target.checked }))} /> Tax exempt</label>
          <label className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm"><input type="checkbox" checked={form.reverseChargeApplicable} onChange={(e) => setForm((s) => ({ ...s, reverseChargeApplicable: e.target.checked }))} /> Reverse charge applicable</label>
          <label className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm"><input type="checkbox" checked={form.withholdingApplicable} onChange={(e) => setForm((s) => ({ ...s, withholdingApplicable: e.target.checked }))} /> Income WHT applicable</label>
          <Select label="Default withholding category" value={form.defaultWithholdingCategory} onChange={(e) => setForm((s) => ({ ...s, defaultWithholdingCategory: e.target.value }))} options={withholdingCategoryOptions} />
          <Select label="Withholding tax code" value={form.withholdingTaxCodeId} onChange={(e) => setForm((s) => ({ ...s, withholdingTaxCodeId: e.target.value }))} options={taxCodeOptions} />
          <Input label="Withholding rate override (%)" type="number" min="0" max="100" step="0.01" value={form.withholdingRateOverride} onChange={(e) => setForm((s) => ({ ...s, withholdingRateOverride: e.target.value }))} />
          <label className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm"><input type="checkbox" checked={form.withholdingExempt} onChange={(e) => setForm((s) => ({ ...s, withholdingExempt: e.target.checked }))} /> WHT exempt</label>
          <Input label="WHT exemption reference" value={form.withholdingExemptionReference} onChange={(e) => setForm((s) => ({ ...s, withholdingExemptionReference: e.target.value }))} />
          <Input label="WHT exemption expiry" type="date" value={form.withholdingExemptionExpiry} onChange={(e) => setForm((s) => ({ ...s, withholdingExemptionExpiry: e.target.value }))} />
          <label className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm"><input type="checkbox" checked={form.vatWithholdingEligible} onChange={(e) => setForm((s) => ({ ...s, vatWithholdingEligible: e.target.checked }))} /> Eligible for VAT withholding treatment</label>
          <Input label="Destination country code" maxLength={2} value={form.destinationCountryCode} onChange={(e) => setForm((s) => ({ ...s, destinationCountryCode: e.target.value.toUpperCase() }))} />
          <Input label="Exemption / relief code" value={form.exemptionReasonCode} onChange={(e) => setForm((s) => ({ ...s, exemptionReasonCode: e.target.value }))} />
          <Textarea className="md:col-span-2" label="Exemption / relief explanation" value={form.exemptionReason} onChange={(e) => setForm((s) => ({ ...s, exemptionReason: e.target.value }))} />
        </div>
      </Modal>
    </GhanaComplianceShell>
  );
}
