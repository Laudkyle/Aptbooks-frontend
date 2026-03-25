import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Globe2, Percent, Plus, ReceiptText, Settings2, ShieldCheck, WalletCards } from 'lucide-react';

import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeTaxApi } from '../api/tax.api.js';
import { makeCoaApi } from '../../../../features/accounting/chartOfAccounts/api/coa.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { AccountSelect } from '../../../../shared/components/forms/AccountSelect.jsx';
import { Textarea } from '../../../../shared/components/ui/Textarea.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';
import { Tabs } from '../../../../shared/components/ui/Tabs.jsx';
import { DataTable } from '../../../../shared/components/data/DataTable.jsx';
import { JsonPanel } from '../../../../shared/components/data/JsonPanel.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { qk } from '../../../../shared/query/keys.js';
import { normalizeRows } from '../../../../shared/tax/frontendTax.js';

function formatLabel(value) {
  return String(value ?? '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
}
function statusTone(value) {
  const v = String(value ?? '').toLowerCase();
  if (['posted', 'active', 'ready', 'enabled'].includes(v)) return 'success';
  if (['draft', 'pending'].includes(v)) return 'warning';
  if (['voided', 'inactive', 'disabled'].includes(v)) return 'danger';
  return 'muted';
}

export default function TaxAdmin() {
  const { http } = useApi();
  const api = useMemo(() => makeTaxApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState('codes');

  const jurisQ = useQuery({ queryKey: ['tax-juris'], queryFn: api.listJurisdictions, staleTime: 10000 });
  const codesQ = useQuery({ queryKey: ['tax-codes-admin'], queryFn: () => api.listCodes({}), staleTime: 10000 });
  const settingsQ = useQuery({ queryKey: ['tax-settings'], queryFn: api.getSettings, staleTime: 10000 });
  const adjustmentsQ = useQuery({ queryKey: qk.taxAdjustments({}), queryFn: () => api.listAdjustments({}), staleTime: 10000 });
  const accountsQ = useQuery({ queryKey: ['coa', 'tax-admin'], queryFn: () => coaApi.list({ includeArchived: 'false' }), staleTime: 10000 });
  const registrationsQ = useQuery({ queryKey: ['tax-registrations'], queryFn: () => api.listRegistrations({}), staleTime: 10000 });
  const rulesQ = useQuery({ queryKey: ['tax-rules'], queryFn: () => api.listRules({}), staleTime: 10000 });
  const profilesQ = useQuery({ queryKey: ['tax-profiles'], queryFn: () => api.listPartnerProfiles({}), staleTime: 10000 });
  const einvoiceQ = useQuery({ queryKey: ['tax-einvoice-settings'], queryFn: api.getEinvoicingSettings, staleTime: 10000 });
  const returnTemplatesQ = useQuery({ queryKey: ['tax-return-templates'], queryFn: () => api.listReturnTemplates({}), staleTime: 10000 });
  const returnConfigsQ = useQuery({ queryKey: ['tax-return-configs'], queryFn: () => api.listReturnConfigs({}), staleTime: 10000 });
  const countryPacksQ = useQuery({ queryKey: ['tax-country-packs'], queryFn: () => api.listCountryPacks({}), staleTime: 10000 });
  const automationRulesQ = useQuery({ queryKey: ['tax-automation-rules'], queryFn: () => api.listAutomationRules({}), staleTime: 10000 });
  const filingAdaptersQ = useQuery({ queryKey: ['tax-filing-adapters'], queryFn: () => api.listFilingAdapters({}), staleTime: 10000 });

  const jurisdictions = normalizeRows(jurisQ.data);
  const taxCodes = normalizeRows(codesQ.data);
  const adjustments = normalizeRows(adjustmentsQ.data);
  const accounts = normalizeRows(accountsQ.data);
  const registrations = normalizeRows(registrationsQ.data);
  const rules = normalizeRows(rulesQ.data);
  const profiles = normalizeRows(profilesQ.data);
  const returnTemplates = normalizeRows(returnTemplatesQ.data);
  const returnConfigs = normalizeRows(returnConfigsQ.data);
  const countryPacks = normalizeRows(countryPacksQ.data);
  const automationRules = normalizeRows(automationRulesQ.data);
  const filingAdapters = normalizeRows(filingAdaptersQ.data);

  const accountOptions = [{ value: '', label: 'Select account' }].concat(accounts.map((a) => ({ value: a.id, label: `${a.code ? `${a.code} — ` : ''}${a.name}` })));
  const jurisOptions = [{ value: '', label: 'No jurisdiction' }].concat(jurisdictions.map((j) => ({ value: j.id, label: `${j.code} — ${j.name}` })));
  const taxCodeOptions = [{ value: '', label: 'None' }].concat(taxCodes.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })));

  const [jCode, setJCode] = useState('');
  const [jName, setJName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const createJ = useMutation({ mutationFn: () => api.createJurisdiction({ code: jCode, name: jName, countryCode: countryCode || undefined }), onSuccess: () => { toast.success('Jurisdiction created.'); setJCode(''); setJName(''); setCountryCode(''); qc.invalidateQueries({ queryKey: ['tax-juris'] }); }, onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Create failed') });

  const [jurisdictionId, setJurisdictionId] = useState('');
  const [taxType, setTaxType] = useState('VAT');
  const [tCode, setTCode] = useState('');
  const [tName, setTName] = useState('');
  const [rate, setRate] = useState('');
  const [direction, setDirection] = useState('');
  const [taxCategory, setTaxCategory] = useState('standard');
  const createCode = useMutation({ mutationFn: () => api.createCode({ jurisdictionId: jurisdictionId || null, code: tCode, name: tName, taxType, taxCategory, rate: Number(rate), direction: direction || null }), onSuccess: () => { toast.success('Tax code created.'); setTCode(''); setTName(''); setRate(''); setDirection(''); qc.invalidateQueries({ queryKey: ['tax-codes-admin'] }); }, onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Create failed') });

  const [outputTaxAccountId, setOutputTaxAccountId] = useState('');
  const [inputTaxAccountId, setInputTaxAccountId] = useState('');
  const [defaultTaxCodeId, setDefaultTaxCodeId] = useState('');
  const [withholdingPayableAccountId, setWithholdingPayableAccountId] = useState('');
  const [nonRecoverableTaxAccountId, setNonRecoverableTaxAccountId] = useState('');
  useEffect(() => {
    if (!settingsQ.data) return;
    setOutputTaxAccountId(settingsQ.data.outputTaxAccountId ?? '');
    setInputTaxAccountId(settingsQ.data.inputTaxAccountId ?? '');
    setDefaultTaxCodeId(settingsQ.data.defaultTaxCodeId ?? '');
    setWithholdingPayableAccountId(settingsQ.data.withholdingPayableAccountId ?? '');
    setNonRecoverableTaxAccountId(settingsQ.data.nonRecoverableTaxAccountId ?? '');
  }, [settingsQ.data]);
  const saveSettings = useMutation({ mutationFn: () => api.setSettings({ outputTaxAccountId: outputTaxAccountId || null, inputTaxAccountId: inputTaxAccountId || null, defaultTaxCodeId: defaultTaxCodeId || null, withholdingPayableAccountId: withholdingPayableAccountId || null, nonRecoverableTaxAccountId: nonRecoverableTaxAccountId || null }), onSuccess: () => { toast.success('Settings saved.'); qc.invalidateQueries({ queryKey: ['tax-settings'] }); }, onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Save failed') });

  const [reg, setReg] = useState({ jurisdictionId: '', registrationNumber: '', legalEntityName: '', filingFrequency: 'monthly', effectiveFrom: '', effectiveTo: '' });
  const createRegistration = useMutation({ mutationFn: () => api.createRegistration(reg), onSuccess: () => { toast.success('Registration created.'); setReg({ jurisdictionId: '', registrationNumber: '', legalEntityName: '', filingFrequency: 'monthly', effectiveFrom: '', effectiveTo: '' }); qc.invalidateQueries({ queryKey: ['tax-registrations'] }); }, onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Create failed') });

  const [rule, setRule] = useState({ code: '', name: '', documentType: 'invoice', supplyType: 'goods', placeOfSupplyBasis: 'customer_location', taxCodeId: '', priority: 100 });
  const createRule = useMutation({ mutationFn: () => api.createRule(rule), onSuccess: () => { toast.success('Rule created.'); setRule({ code: '', name: '', documentType: 'invoice', supplyType: 'goods', placeOfSupplyBasis: 'customer_location', taxCodeId: '', priority: 100 }); qc.invalidateQueries({ queryKey: ['tax-rules'] }); }, onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Create failed') });

  const [einvoice, setEinvoice] = useState({ defaultScheme: '', sellerEndpointId: '', sellerSchemeId: '', transportProfile: '', realtimeFilingEnabled: false });
  useEffect(() => { if (einvoiceQ.data) setEinvoice((s) => ({ ...s, ...einvoiceQ.data })); }, [einvoiceQ.data]);
  const saveEinvoice = useMutation({ mutationFn: () => api.saveEinvoicingSettings(einvoice), onSuccess: () => { toast.success('E-invoicing settings saved.'); qc.invalidateQueries({ queryKey: ['tax-einvoice-settings'] }); }, onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Save failed') });

  const codeColumns = [
    { header: 'Code', accessorKey: 'code', render: (row) => <span className="font-medium text-text-strong">{row.code}</span> },
    { header: 'Name', accessorKey: 'name' },
    { header: 'Type', accessorKey: 'tax_type', render: (row) => row.tax_type ?? row.taxType ?? '—' },
    { header: 'Category', accessorKey: 'tax_category', render: (row) => <Badge tone="muted">{formatLabel(row.tax_category ?? row.taxCategory ?? 'standard')}</Badge> },
    { header: 'Direction', accessorKey: 'direction', render: (row) => row.direction ? <Badge tone="muted">{formatLabel(row.direction)}</Badge> : '—' },
    { header: 'Rate (%)', accessorKey: 'rate', className: 'text-right', render: (row) => Number(row.rate ?? 0).toFixed(2) }
  ];
  const simpleColumns = (fields) => fields.map((field) => ({ header: formatLabel(field), accessorKey: field, render: (row) => /status|state|enabled/i.test(field) ? <Badge tone={statusTone(row[field])}>{String(row[field] ?? '—')}</Badge> : String(row[field] ?? '—') }));

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Tax administration" subtitle="Wave 1–3 frontend coverage for tax domain redesign, determination controls, partner tax profiles, e-invoicing, filing adapters, automation, and country packs." icon={ShieldCheck} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'codes', label: 'Codes', icon: Percent }, { value: 'registrations', label: 'Registrations', icon: Globe2 }, { value: 'rules', label: 'Rules', icon: WalletCards }, { value: 'settings', label: 'Settings', icon: Settings2 }, { value: 'profiles', label: 'Partner profiles', icon: ShieldCheck }, { value: 'compliance', label: 'E-invoicing & returns', icon: ReceiptText }, { value: 'automation', label: 'Automation & packs', icon: Bot }]} />

      {tab === 'codes' ? <div className="space-y-6"><ContentCard title="New jurisdiction"><div className="grid gap-4 md:grid-cols-4"><Input label="Code" value={jCode} onChange={(e) => setJCode(e.target.value)} /><Input label="Name" value={jName} onChange={(e) => setJName(e.target.value)} /><Input label="Country code" value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} /><div className="flex items-end"><Button leftIcon={Plus} onClick={() => createJ.mutate()} disabled={!jCode || !jName}>Create jurisdiction</Button></div></div></ContentCard><ContentCard title="New tax code"><div className="grid gap-4 md:grid-cols-3"><Select label="Jurisdiction" value={jurisdictionId} onChange={(e) => setJurisdictionId(e.target.value)} options={jurisOptions} /><Select label="Type" value={taxType} onChange={(e) => setTaxType(e.target.value)} options={[{ value: 'VAT', label: 'VAT' }, { value: 'GST', label: 'GST' }, { value: 'SALES', label: 'Sales tax' }, { value: 'WHT', label: 'Withholding' }]} /><Select label="Direction" value={direction} onChange={(e) => setDirection(e.target.value)} options={[{ value: '', label: '(optional)' }, { value: 'output', label: 'Output' }, { value: 'input', label: 'Input' }]} /><Select label="Category" value={taxCategory} onChange={(e) => setTaxCategory(e.target.value)} options={[{ value: 'standard', label: 'Standard' }, { value: 'zero_rated', label: 'Zero rated' }, { value: 'exempt', label: 'Exempt' }, { value: 'reverse_charge', label: 'Reverse charge' }, { value: 'withholding', label: 'Withholding' }]} /><Input label="Code" value={tCode} onChange={(e) => setTCode(e.target.value)} /><Input label="Name" value={tName} onChange={(e) => setTName(e.target.value)} /><Input label="Rate (%)" type="number" value={rate} onChange={(e) => setRate(e.target.value)} /><div className="md:col-span-3 flex justify-end"><Button leftIcon={Plus} onClick={() => createCode.mutate()} disabled={!tCode || !tName || rate === ''}>Create tax code</Button></div></div></ContentCard><ContentCard title="Tax codes register"><DataTable columns={codeColumns} rows={taxCodes} /></ContentCard><ContentCard title="Jurisdictions"><DataTable columns={simpleColumns(['code', 'name', 'country_code'])} rows={jurisdictions} /></ContentCard></div> : null}

      {tab === 'registrations' ? <div className="space-y-6"><ContentCard title="New tax registration"><div className="grid gap-4 md:grid-cols-3"><Select label="Jurisdiction" value={reg.jurisdictionId} onChange={(e) => setReg((s) => ({ ...s, jurisdictionId: e.target.value }))} options={jurisOptions} /><Input label="Registration number" value={reg.registrationNumber} onChange={(e) => setReg((s) => ({ ...s, registrationNumber: e.target.value }))} /><Input label="Legal entity" value={reg.legalEntityName} onChange={(e) => setReg((s) => ({ ...s, legalEntityName: e.target.value }))} /><Select label="Filing frequency" value={reg.filingFrequency} onChange={(e) => setReg((s) => ({ ...s, filingFrequency: e.target.value }))} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'annual', label: 'Annual' }]} /><Input label="Effective from" type="date" value={reg.effectiveFrom} onChange={(e) => setReg((s) => ({ ...s, effectiveFrom: e.target.value }))} /><Input label="Effective to" type="date" value={reg.effectiveTo} onChange={(e) => setReg((s) => ({ ...s, effectiveTo: e.target.value }))} /><div className="md:col-span-3 flex justify-end"><Button leftIcon={Plus} onClick={() => createRegistration.mutate()} disabled={!reg.registrationNumber}>Create registration</Button></div></div></ContentCard><ContentCard title="Registrations"><DataTable columns={simpleColumns(['registrationNumber', 'legalEntityName', 'filingFrequency', 'effectiveFrom', 'effectiveTo', 'status'])} rows={registrations} /></ContentCard></div> : null}

      {tab === 'rules' ? <div className="space-y-6"><ContentCard title="New determination rule"><div className="grid gap-4 md:grid-cols-3"><Input label="Code" value={rule.code} onChange={(e) => setRule((s) => ({ ...s, code: e.target.value }))} /><Input label="Name" value={rule.name} onChange={(e) => setRule((s) => ({ ...s, name: e.target.value }))} /><Select label="Document type" value={rule.documentType} onChange={(e) => setRule((s) => ({ ...s, documentType: e.target.value }))} options={[{ value: 'invoice', label: 'Invoice' }, { value: 'bill', label: 'Bill' }, { value: 'credit_note', label: 'Credit note' }, { value: 'debit_note', label: 'Debit note' }]} /><Select label="Supply type" value={rule.supplyType} onChange={(e) => setRule((s) => ({ ...s, supplyType: e.target.value }))} options={[{ value: 'goods', label: 'Goods' }, { value: 'services', label: 'Services' }, { value: 'mixed', label: 'Mixed' }, { value: 'import', label: 'Import' }, { value: 'export', label: 'Export' }]} /><Select label="Place of supply basis" value={rule.placeOfSupplyBasis} onChange={(e) => setRule((s) => ({ ...s, placeOfSupplyBasis: e.target.value }))} options={[{ value: 'customer_location', label: 'Customer location' }, { value: 'supplier_location', label: 'Supplier location' }, { value: 'ship_to', label: 'Ship-to' }, { value: 'service_performance', label: 'Service performance' }]} /><Select label="Tax code" value={rule.taxCodeId} onChange={(e) => setRule((s) => ({ ...s, taxCodeId: e.target.value }))} options={taxCodeOptions} /><Input label="Priority" type="number" value={rule.priority} onChange={(e) => setRule((s) => ({ ...s, priority: Number(e.target.value) }))} /><div className="md:col-span-3 flex justify-end"><Button leftIcon={Plus} onClick={() => createRule.mutate()} disabled={!rule.code || !rule.name}>Create rule</Button></div></div></ContentCard><ContentCard title="Determination rules"><DataTable columns={simpleColumns(['code', 'name', 'documentType', 'supplyType', 'placeOfSupplyBasis', 'taxCodeId', 'priority', 'status'])} rows={rules} /></ContentCard></div> : null}

      {tab === 'settings' ? <ContentCard title="Posting and control settings"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><AccountSelect label="Output tax account" value={outputTaxAccountId} onChange={(e) => setOutputTaxAccountId(e.target.value)} allowEmpty /><AccountSelect label="Input tax account" value={inputTaxAccountId} onChange={(e) => setInputTaxAccountId(e.target.value)} allowEmpty /><Select label="Default tax code" value={defaultTaxCodeId} onChange={(e) => setDefaultTaxCodeId(e.target.value)} options={taxCodeOptions} /><AccountSelect label="Withholding payable account" value={withholdingPayableAccountId} onChange={(e) => setWithholdingPayableAccountId(e.target.value)} allowEmpty /><AccountSelect label="Non-recoverable tax account" value={nonRecoverableTaxAccountId} onChange={(e) => setNonRecoverableTaxAccountId(e.target.value)} allowEmpty /><div className="flex items-end"><Button onClick={() => saveSettings.mutate()} loading={saveSettings.isPending}>Save settings</Button></div></div><div className="mt-6"><JsonPanel title="Current settings payload" value={settingsQ.data} /></div></ContentCard> : null}

      {tab === 'profiles' ? <ContentCard title="Partner tax profiles"><DataTable columns={simpleColumns(['partnerName', 'taxTreatment', 'taxRegistrationStatus', 'withholdingRate', 'recoverabilityPercent', 'countryCode'])} rows={profiles} /></ContentCard> : null}

      {tab === 'compliance' ? <div className="space-y-6"><ContentCard title="E-invoicing settings"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Input label="Default scheme" value={einvoice.defaultScheme ?? ''} onChange={(e) => setEinvoice((s) => ({ ...s, defaultScheme: e.target.value }))} /><Input label="Seller endpoint ID" value={einvoice.sellerEndpointId ?? ''} onChange={(e) => setEinvoice((s) => ({ ...s, sellerEndpointId: e.target.value }))} /><Input label="Seller scheme ID" value={einvoice.sellerSchemeId ?? ''} onChange={(e) => setEinvoice((s) => ({ ...s, sellerSchemeId: e.target.value }))} /><Input label="Transport profile" value={einvoice.transportProfile ?? ''} onChange={(e) => setEinvoice((s) => ({ ...s, transportProfile: e.target.value }))} /><label className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm"><input type="checkbox" checked={!!einvoice.realtimeFilingEnabled} onChange={(e) => setEinvoice((s) => ({ ...s, realtimeFilingEnabled: e.target.checked }))} /> Enable real-time filing</label><div className="flex items-end"><Button onClick={() => saveEinvoice.mutate()} loading={saveEinvoice.isPending}>Save e-invoicing</Button></div></div></ContentCard><ContentCard title="Return templates"><DataTable columns={simpleColumns(['templateCode', 'name', 'jurisdictionCode', 'taxType', 'status'])} rows={returnTemplates} /></ContentCard><ContentCard title="Jurisdiction return configs"><DataTable columns={simpleColumns(['jurisdictionCode', 'filingFrequency', 'basis', 'status'])} rows={returnConfigs} /></ContentCard><ContentCard title="Manual tax adjustments"><DataTable columns={simpleColumns(['reference', 'direction', 'taxAmount', 'status'])} rows={adjustments} /></ContentCard></div> : null}

      {tab === 'automation' ? <div className="space-y-6"><ContentCard title="Automation rules"><DataTable columns={simpleColumns(['code', 'name', 'triggerType', 'status'])} rows={automationRules} /></ContentCard><ContentCard title="Near-real-time filing adapters"><DataTable columns={simpleColumns(['adapterCode', 'name', 'jurisdictionCode', 'status'])} rows={filingAdapters} /></ContentCard><ContentCard title="Country packs"><DataTable columns={simpleColumns(['countryCode', 'name', 'version', 'status'])} rows={countryPacks} /></ContentCard></div> : null}
    </div>
  );
}