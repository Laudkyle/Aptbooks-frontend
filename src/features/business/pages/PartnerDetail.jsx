import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, CreditCard, MapPin, Phone, Plus, Save, ShieldCheck } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makePartnersApi } from '../api/partners.api.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { AccountSelect } from '../../../shared/components/forms/AccountSelect.jsx';
import { CurrencySelect } from '../../../shared/components/forms/CurrencySelect.jsx';
import { PaymentTermsSelect } from '../../../shared/components/forms/PaymentTermsSelect.jsx';
import { TaxCodeSelect } from '../../../shared/components/forms/TaxCodeSelect.jsx';
import { JurisdictionSelect } from '../../../shared/components/forms/JurisdictionSelect.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { PARTNER_TAX_TREATMENT_OPTIONS, buildPartnerTaxProfilePayload, getPartnerTaxFormVisibility, normalizePartnerTaxFormForSubmit, normalizePartnerTaxFormState, normalizeTaxProfile } from '../../../shared/tax/frontendTax.js';

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-2xl bg-brand-primary/10 p-2 ring-1 ring-brand-primary/20">
        <Icon className="h-5 w-5 text-brand-deep" />
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
      </div>
    </div>
  );
}

export default function PartnerDetail() {
  const { id } = useParams();
  const { http } = useApi();
  const api = useMemo(() => makePartnersApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState('contacts');

  const { data: partner, isLoading } = useQuery({ queryKey: qk.partner(id), queryFn: () => api.get(id) });
  const { data: taxProfile } = useQuery({ queryKey: ['partners', id, 'taxProfile'], queryFn: () => api.getTaxProfile(id), enabled: !!id });
  const { data: creditPolicy } = useQuery({ queryKey: qk.partnerCreditPolicy(id), queryFn: () => api.getCreditPolicy(id), enabled: !!id });

  const [editOpen, setEditOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [taxOpen, setTaxOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);

  const [edit, setEdit] = useState({ name: '', code: '', email: '', phone: '', status: 'active', notes: '', defaultReceivableAccountId: '', defaultPayableAccountId: '', paymentTermsId: '' });
  const [cp, setCp] = useState({ creditLimit: '', creditDays: '', holdIfOver: false, notes: '' });
  const [tax, setTax] = useState({
    taxIdNumber: '', vatRegistrationNumber: '', taxRegistrationStatus: 'registered', taxTreatment: '', defaultTaxCodeId: '', purchaseTaxCodeId: '', salesTaxCodeId: '', jurisdictionId: '',
    withholdingEnabled: false, withholdingTaxCodeId: '', withholdingRate: '', recoverabilityPercent: '', exemptionReasonCode: '', exemptionCertificateNumber: '', exemptionExpiryDate: '', reverseChargeEligible: false,
    taxCountryCode: '', taxRegionCode: '', placeOfSupplyBasis: '', eInvoiceScheme: '', buyerReference: '', filingCurrency: ''
  });
  const [contact, setContact] = useState({ name: '', email: '', phone: '', role: '', isPrimary: false });
  const [address, setAddress] = useState({ label: '', line1: '', line2: '', city: '', region: '', postalCode: '', country: '', isPrimary: false });

  React.useEffect(() => {
    const p = partner?.partner ?? partner ?? {};
    setEdit({ name: p.name ?? '', code: p.code ?? '', email: p.email ?? '', phone: p.phone ?? '', status: p.status ?? 'active', notes: p.notes ?? '', defaultReceivableAccountId: p.defaultReceivableAccountId ?? p.default_receivable_account_id ?? '', defaultPayableAccountId: p.defaultPayableAccountId ?? p.default_payable_account_id ?? '', paymentTermsId: p.paymentTermsId ?? p.payment_terms_id ?? '' });
  }, [partner]);
  React.useEffect(() => {
    setCp({ creditLimit: creditPolicy?.credit_limit ?? '', creditDays: creditPolicy?.credit_days ?? '', holdIfOver: !!creditPolicy?.hold_if_over, notes: creditPolicy?.notes ?? '' });
  }, [creditPolicy]);
  React.useEffect(() => {
    setTax((current) => normalizePartnerTaxFormState({ ...current, ...normalizeTaxProfile(taxProfile), type: (partner?.partner ?? partner ?? {}).type ?? 'customer' }));
  }, [taxProfile, partner]);

  const updatePartner = useMutation({ mutationFn: (body) => api.update(id, body), onSuccess: () => { toast.success('Saved partner'); qc.invalidateQueries({ queryKey: qk.partner(id) }); setEditOpen(false); }, onError: (e) => toast.error(e?.message ?? 'Failed to save') });
  const saveCredit = useMutation({ mutationFn: (body) => api.setCreditPolicy(id, body), onSuccess: () => { toast.success('Saved credit policy'); qc.invalidateQueries({ queryKey: qk.partnerCreditPolicy(id) }); setCreditOpen(false); }, onError: (e) => toast.error(e?.message ?? 'Failed to save') });
  const saveTax = useMutation({ mutationFn: (body) => api.setTaxProfile(id, body), onSuccess: () => { toast.success('Saved tax profile'); qc.invalidateQueries({ queryKey: ['partners', id, 'taxProfile'] }); qc.invalidateQueries({ queryKey: qk.partner(id) }); setTaxOpen(false); }, onError: (e) => toast.error(e?.message ?? 'Failed to save') });
  const addContact = useMutation({ mutationFn: (body) => api.addContact(id, body), onSuccess: () => { toast.success('Added contact'); qc.invalidateQueries({ queryKey: qk.partner(id) }); setContactOpen(false); setContact({ name: '', email: '', phone: '', role: '', isPrimary: false }); }, onError: (e) => toast.error(e?.message ?? 'Failed to add') });
  const addAddress = useMutation({ mutationFn: (body) => api.addAddress(id, body), onSuccess: () => { toast.success('Added address'); qc.invalidateQueries({ queryKey: qk.partner(id) }); setAddressOpen(false); setAddress({ label: '', line1: '', line2: '', city: '', region: '', postalCode: '', country: '', isPrimary: false }); }, onError: (e) => toast.error(e?.message ?? 'Failed to add') });

  const contacts = partner?.contacts ?? [];
  const addresses = partner?.addresses ?? [];
  const p = partner?.partner ?? partner ?? {};
  const taxVisibility = getPartnerTaxFormVisibility({ ...tax, type: p.type ?? 'customer' });

  return (
    <div className="space-y-4 pb-8">
      <PageHeader title={p.name ?? (isLoading ? 'Loading partner…' : 'Partner')} subtitle={`Partner ID: ${id}`} icon={Building2} actions={<div className="flex items-center gap-2"><Button variant="outline" leftIcon={ArrowLeft} onClick={() => window.history.back()}>Back</Button><Button variant="primary" leftIcon={Save} onClick={() => setEditOpen(true)}>Edit</Button></div>} crumbs={[{ label: 'Customers', href: ROUTES.businessCustomers }, { label: p.name ?? 'Partner' }]} />
      <div className="grid gap-4 lg:grid-cols-3">
        <ContentCard className="lg:col-span-2">
          <div className="flex items-center justify-between"><SectionTitle icon={Building2} title="Profile" subtitle="Core partner information and defaults." /><Badge tone={(p.status ?? 'active') === 'active' ? 'success' : 'muted'}>{p.status ?? 'active'}</Badge></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4"><div className="text-xs text-slate-500">Code</div><div className="mt-1 text-sm font-semibold text-slate-900">{p.code ?? '—'}</div></div>
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4"><div className="text-xs text-slate-500">Type</div><div className="mt-1 text-sm font-semibold text-slate-900">{p.type ?? '—'}</div></div>
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4"><div className="text-xs text-slate-500">Email</div><div className="mt-1 text-sm font-semibold text-slate-900">{p.email ?? '—'}</div></div>
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4"><div className="text-xs text-slate-500">Phone</div><div className="mt-1 text-sm font-semibold text-slate-900">{p.phone ?? '—'}</div></div>
          </div>
          <div className="mt-4 rounded-2xl border border-border-subtle bg-white/70 p-4 text-sm text-slate-700">{p.notes ? p.notes : <span className="text-slate-400">No notes recorded.</span>}</div>
        </ContentCard>
        <div className="space-y-4">
          <ContentCard actions={<Button variant="outline" size="sm" onClick={() => setCreditOpen(true)}>Edit</Button>}><SectionTitle icon={CreditCard} title="Credit policy" subtitle="Limit, days and hold rules." /><div className="mt-4 grid gap-3 text-sm"><div><div className="text-xs text-slate-500">Credit limit</div><div className="mt-1 font-semibold text-slate-900">{creditPolicy?.credit_limit ?? '—'}</div></div><div><div className="text-xs text-slate-500">Credit days</div><div className="mt-1 font-semibold text-slate-900">{creditPolicy?.credit_days ?? '—'}</div></div><div><div className="text-xs text-slate-500">Hold if over limit</div><div className="mt-1 font-semibold text-slate-900">{creditPolicy?.hold_if_over ? 'Yes' : 'No'}</div></div></div></ContentCard>
          <ContentCard actions={<Button variant="outline" size="sm" onClick={() => setTaxOpen(true)}>Edit</Button>}><SectionTitle icon={ShieldCheck} title="Tax profile" subtitle="Used by tax determination and filing." /><div className="mt-4 grid gap-3 text-sm"><div><div className="text-xs text-slate-500">Tax registration</div><div className="mt-1 font-semibold text-slate-900">{tax.vatRegistrationNumber || tax.taxIdNumber || '—'}</div></div><div><div className="text-xs text-slate-500">Treatment</div><div className="mt-1 font-semibold text-slate-900">{tax.taxTreatment || '—'}</div></div><div><div className="text-xs text-slate-500">Withholding</div><div className="mt-1 font-semibold text-slate-900">{tax.withholdingEnabled ? `${tax.withholdingRate || 0}%` : 'Disabled'}</div></div><div><div className="text-xs text-slate-500">Recoverability</div><div className="mt-1 font-semibold text-slate-900">{tax.recoverabilityPercent || '—'}</div></div></div></ContentCard>
        </div>
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'contacts', label: `Contacts (${contacts.length})` }, { value: 'addresses', label: `Addresses (${addresses.length})` }, { value: 'tax', label: 'Raw tax profile' }]} />
      {tab === 'contacts' ? <ContentCard title="Contacts" actions={<Button leftIcon={Plus} onClick={() => setContactOpen(true)}>Add contact</Button>}>{contacts.length ? <div className="grid gap-3 md:grid-cols-2">{contacts.map((c) => <div key={c.id} className="rounded-2xl border border-border-subtle bg-white/70 p-4"><div className="text-sm font-semibold text-slate-900">{c.name}</div><div className="mt-1 text-sm text-slate-600">{c.email || '—'}</div><div className="text-sm text-slate-600">{c.phone || '—'}</div><div className="mt-2 text-xs text-slate-500">{c.role || '—'} {c.isPrimary ? '• Primary' : ''}</div></div>)}</div> : <div className="text-sm text-slate-500">No contacts yet.</div>}</ContentCard> : null}
      {tab === 'addresses' ? <ContentCard title="Addresses" actions={<Button leftIcon={Plus} onClick={() => setAddressOpen(true)}>Add address</Button>}>{addresses.length ? <div className="grid gap-3 md:grid-cols-2">{addresses.map((a) => <div key={a.id} className="rounded-2xl border border-border-subtle bg-white/70 p-4"><div className="text-sm font-semibold text-slate-900">{a.label || 'Address'}</div><div className="mt-1 text-sm text-slate-600">{[a.line1, a.line2, a.city, a.region, a.postalCode, a.country].filter(Boolean).join(', ') || '—'}</div><div className="mt-2 text-xs text-slate-500">{a.isPrimary ? 'Primary' : ''}</div></div>)}</div> : <div className="text-sm text-slate-500">No addresses yet.</div>}</ContentCard> : null}
      {tab === 'tax' ? <ContentCard title="Tax profile payload"><JsonPanel title="Partner tax profile" value={taxProfile ?? {}} /></ContentCard> : null}

      <Modal open={editOpen} title="Edit partner" onClose={() => setEditOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={() => updatePartner.mutate(edit)}>Save</Button></div>}><div className="grid gap-4 md:grid-cols-2"><Input label="Name" value={edit.name} onChange={(e) => setEdit((s) => ({ ...s, name: e.target.value }))} /><Input label="Code" value={edit.code} onChange={(e) => setEdit((s) => ({ ...s, code: e.target.value }))} /><Input label="Email" value={edit.email} onChange={(e) => setEdit((s) => ({ ...s, email: e.target.value }))} /><Input label="Phone" value={edit.phone} onChange={(e) => setEdit((s) => ({ ...s, phone: e.target.value }))} /><Select label="Status" value={edit.status} onChange={(e) => setEdit((s) => ({ ...s, status: e.target.value }))} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /><PaymentTermsSelect label="Payment terms" value={edit.paymentTermsId} onChange={(e) => setEdit((s) => ({ ...s, paymentTermsId: e.target.value }))} allowEmpty />{(p.type ?? 'customer') === 'customer' ? <AccountSelect label="Default receivable account" value={edit.defaultReceivableAccountId} onChange={(e) => setEdit((s) => ({ ...s, defaultReceivableAccountId: e.target.value, defaultPayableAccountId: '' }))} filters={{ accountTypeCodes: ['ASSET'] }} allowEmpty /> : null}{(p.type ?? 'customer') === 'vendor' ? <AccountSelect label="Default payable account" value={edit.defaultPayableAccountId} onChange={(e) => setEdit((s) => ({ ...s, defaultPayableAccountId: e.target.value, defaultReceivableAccountId: '' }))} filters={{ accountTypeCodes: ['LIABILITY'] }} allowEmpty /> : null}<div className="md:col-span-2"><Textarea label="Notes" rows={4} value={edit.notes} onChange={(e) => setEdit((s) => ({ ...s, notes: e.target.value }))} /></div></div></Modal>
      <Modal open={creditOpen} title="Edit credit policy" onClose={() => setCreditOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCreditOpen(false)}>Cancel</Button><Button onClick={() => saveCredit.mutate({ creditLimit: cp.creditLimit === '' ? null : Number(cp.creditLimit), creditDays: cp.creditDays === '' ? null : Number(cp.creditDays), holdIfOver: cp.holdIfOver, notes: cp.notes || null })}>Save</Button></div>}><div className="grid gap-4 md:grid-cols-2"><Input label="Credit limit" type="number" value={cp.creditLimit} onChange={(e) => setCp((s) => ({ ...s, creditLimit: e.target.value }))} /><Input label="Credit days" type="number" value={cp.creditDays} onChange={(e) => setCp((s) => ({ ...s, creditDays: e.target.value }))} /><label className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm"><input type="checkbox" checked={cp.holdIfOver} onChange={(e) => setCp((s) => ({ ...s, holdIfOver: e.target.checked }))} /> Hold new invoices if over limit</label><div className="md:col-span-2"><Textarea label="Notes" rows={3} value={cp.notes} onChange={(e) => setCp((s) => ({ ...s, notes: e.target.value }))} /></div></div></Modal>
      <Modal open={taxOpen} title="Edit tax profile" onClose={() => setTaxOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setTaxOpen(false)}>Cancel</Button><Button onClick={() => saveTax.mutate(buildPartnerTaxProfilePayload({ ...normalizePartnerTaxFormForSubmit({ ...tax, type: p.type ?? 'customer' }), name: partner?.name }))}>Save</Button></div>}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Input label="Tax ID number" value={tax.taxIdNumber} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', taxIdNumber: e.target.value }))} /><Input label="VAT registration" value={tax.vatRegistrationNumber} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', vatRegistrationNumber: e.target.value }))} /><Select label="Registration status" value={tax.taxRegistrationStatus} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', taxRegistrationStatus: e.target.value }))} options={[{ value: 'registered', label: 'Registered' }, { value: 'unregistered', label: 'Unregistered' }, { value: 'pending', label: 'Pending' }, { value: 'suspended', label: 'Suspended' }]} /><Select label="Tax treatment" value={tax.taxTreatment} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', taxTreatment: e.target.value }))} options={PARTNER_TAX_TREATMENT_OPTIONS[p.type ?? 'customer']} />{taxVisibility.showDefaultTaxCode ? <TaxCodeSelect label="Default tax code" value={tax.defaultTaxCodeId} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', defaultTaxCodeId: e.target.value }))} allowEmpty /> : null}<JurisdictionSelect label="Jurisdiction" value={tax.jurisdictionId} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', jurisdictionId: e.target.value }))} allowEmpty />{taxVisibility.showPurchaseTaxCode ? <TaxCodeSelect label="Purchase tax code" value={tax.purchaseTaxCodeId} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', purchaseTaxCodeId: e.target.value }))} allowEmpty /> : null}{taxVisibility.showSalesTaxCode ? <TaxCodeSelect label="Sales tax code" value={tax.salesTaxCodeId} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', salesTaxCodeId: e.target.value }))} allowEmpty /> : null}<label className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm"><input type="checkbox" checked={tax.withholdingEnabled} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', withholdingEnabled: e.target.checked }))} /> Withholding enabled</label>{taxVisibility.showWithholdingSection ? <><TaxCodeSelect label="Withholding tax code" value={tax.withholdingTaxCodeId} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', withholdingTaxCodeId: e.target.value }))} allowEmpty /><Input label="Withholding rate" type="number" value={tax.withholdingRate} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', withholdingRate: e.target.value }))} /></> : null}{taxVisibility.showRecoverability ? <Input label="Recoverability (%)" type="number" value={tax.recoverabilityPercent} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', recoverabilityPercent: e.target.value }))} /> : null}{taxVisibility.showExemptionFields ? <><Input label="Exemption reason" value={tax.exemptionReasonCode} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', exemptionReasonCode: e.target.value }))} /><Input label="Exemption certificate" value={tax.exemptionCertificateNumber} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', exemptionCertificateNumber: e.target.value }))} /><Input label="Exemption expiry" type="date" value={tax.exemptionExpiryDate} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', exemptionExpiryDate: e.target.value }))} /></> : null}<Input label="Country code" value={tax.taxCountryCode} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', taxCountryCode: e.target.value.toUpperCase() }))} maxLength={2} /><Input label="Region code" value={tax.taxRegionCode} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', taxRegionCode: e.target.value }))} /><Input label="Place of supply basis" value={tax.placeOfSupplyBasis} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', placeOfSupplyBasis: e.target.value }))} /><Input label="E-invoice scheme" value={tax.eInvoiceScheme} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', eInvoiceScheme: e.target.value }))} /><CurrencySelect label="Filing currency" value={tax.filingCurrency} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', filingCurrency: e.target.value }))} allowEmpty />{taxVisibility.showBuyerReference ? <Input label="Buyer reference" value={tax.buyerReference} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', buyerReference: e.target.value }))} /> : null}{taxVisibility.showReverseChargeEligible ? <label className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm"><input type="checkbox" checked={tax.reverseChargeEligible} onChange={(e) => setTax((s) => normalizePartnerTaxFormState({ ...s, type: p.type ?? 'customer', reverseChargeEligible: e.target.checked }))} /> Reverse charge eligible</label> : null}</div></Modal>
      <Modal open={contactOpen} title="Add contact" onClose={() => setContactOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setContactOpen(false)}>Cancel</Button><Button onClick={() => addContact.mutate(contact)}>Add</Button></div>}><div className="grid gap-4 md:grid-cols-2"><Input label="Name" value={contact.name} onChange={(e) => setContact((s) => ({ ...s, name: e.target.value }))} /><Input label="Email" value={contact.email} onChange={(e) => setContact((s) => ({ ...s, email: e.target.value }))} /><Input label="Phone" value={contact.phone} onChange={(e) => setContact((s) => ({ ...s, phone: e.target.value }))} /><Input label="Role" value={contact.role} onChange={(e) => setContact((s) => ({ ...s, role: e.target.value }))} /><label className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm"><input type="checkbox" checked={contact.isPrimary} onChange={(e) => setContact((s) => ({ ...s, isPrimary: e.target.checked }))} /> Primary</label></div></Modal>
      <Modal open={addressOpen} title="Add address" onClose={() => setAddressOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setAddressOpen(false)}>Cancel</Button><Button onClick={() => addAddress.mutate(address)}>Add</Button></div>}><div className="grid gap-4 md:grid-cols-2"><Input label="Label" value={address.label} onChange={(e) => setAddress((s) => ({ ...s, label: e.target.value }))} /><Input label="Line 1" value={address.line1} onChange={(e) => setAddress((s) => ({ ...s, line1: e.target.value }))} /><Input label="Line 2" value={address.line2} onChange={(e) => setAddress((s) => ({ ...s, line2: e.target.value }))} /><Input label="City" value={address.city} onChange={(e) => setAddress((s) => ({ ...s, city: e.target.value }))} /><Input label="Region" value={address.region} onChange={(e) => setAddress((s) => ({ ...s, region: e.target.value }))} /><Input label="Postal code" value={address.postalCode} onChange={(e) => setAddress((s) => ({ ...s, postalCode: e.target.value }))} /><Input label="Country" value={address.country} onChange={(e) => setAddress((s) => ({ ...s, country: e.target.value }))} /><label className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm"><input type="checkbox" checked={address.isPrimary} onChange={(e) => setAddress((s) => ({ ...s, isPrimary: e.target.checked }))} /> Primary</label></div></Modal>
    </div>
  );
}
