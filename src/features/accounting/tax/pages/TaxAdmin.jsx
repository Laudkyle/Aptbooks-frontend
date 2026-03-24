import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, Settings2, ShieldCheck } from 'lucide-react';

import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeTaxApi } from '../api/tax.api.js';
import { makeCoaApi } from '../../../../features/accounting/chartOfAccounts/api/coa.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';
import { Tabs } from '../../../../shared/components/ui/Tabs.jsx';
import { DataTable } from '../../../../shared/components/data/DataTable.jsx';
import { JsonPanel } from '../../../../shared/components/data/JsonPanel.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { PERMISSIONS } from '../../../../app/constants/permissions.js';
import { PermissionGate } from '../../../../app/routes/route-guards.jsx';
import { qk } from '../../../../shared/query/keys.js';

function formatLabel(value) {
  return String(value ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function statusTone(value) {
  const v = String(value ?? '').toLowerCase();
  if (['posted', 'active', 'ready'].includes(v)) return 'success';
  if (['draft', 'pending'].includes(v)) return 'warning';
  if (['voided', 'inactive', 'cancelled'].includes(v)) return 'danger';
  return 'muted';
}

function toRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export default function TaxAdmin() {
  const { http } = useApi();
  const api = useMemo(() => makeTaxApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [tab, setTab] = useState('codes');

  const jurisQ = useQuery({ queryKey: ['tax-juris'], queryFn: api.listJurisdictions, staleTime: 10_000 });
  const codesQ = useQuery({ queryKey: ['tax-codes'], queryFn: () => api.listCodes({}), staleTime: 10_000 });
  const settingsQ = useQuery({ queryKey: ['tax-settings'], queryFn: api.getSettings, staleTime: 10_000 });
  const adjustmentsQ = useQuery({ queryKey: qk.taxAdjustments({}), queryFn: () => api.listAdjustments({}), staleTime: 10_000 });
  const accountsQ = useQuery({ queryKey: ['coa', 'false'], queryFn: () => coaApi.list({ includeArchived: 'false' }), staleTime: 10_000 });

  const jurisdictions = toRows(jurisQ.data);
  const taxCodes = toRows(codesQ.data);
  const adjustments = toRows(adjustmentsQ.data);
  const accounts = Array.isArray(accountsQ.data) ? accountsQ.data : [];

  const jurisOptions = [{ value: '', label: 'No jurisdiction' }].concat(jurisdictions.map((j) => ({ value: j.id, label: `${j.code} — ${j.name}` })));
  const taxCodeOptions = [{ value: '', label: 'None' }].concat(taxCodes.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })));
  const accountOptions = [{ value: '', label: 'Select account' }].concat(accounts.map((a) => ({ value: a.id, label: `${a.code ? `${a.code} — ` : ''}${a.name}` })));

  const [jCode, setJCode] = useState('');
  const [jName, setJName] = useState('');
  const [countryCode, setCountryCode] = useState('');

  const createJ = useMutation({
    mutationFn: () => api.createJurisdiction({ code: jCode, name: jName, countryCode: countryCode || undefined }),
    onSuccess: () => {
      toast.success('Jurisdiction created.');
      setJCode('');
      setJName('');
      setCountryCode('');
      qc.invalidateQueries({ queryKey: ['tax-juris'] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Create failed')
  });

  const [jurisdictionId, setJurisdictionId] = useState('');
  const [taxType, setTaxType] = useState('VAT');
  const [tCode, setTCode] = useState('');
  const [tName, setTName] = useState('');
  const [rate, setRate] = useState('');
  const [direction, setDirection] = useState('');

  const createCode = useMutation({
    mutationFn: () => api.createCode({
      jurisdictionId: jurisdictionId || null,
      code: tCode,
      name: tName,
      taxType,
      rate: Number(rate),
      direction: direction || null
    }),
    onSuccess: () => {
      toast.success('Tax code created.');
      setTCode('');
      setTName('');
      setRate('');
      setDirection('');
      qc.invalidateQueries({ queryKey: ['tax-codes'] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Create failed')
  });

  const [outputTaxAccountId, setOutputTaxAccountId] = useState('');
  const [inputTaxAccountId, setInputTaxAccountId] = useState('');
  const [defaultTaxCodeId, setDefaultTaxCodeId] = useState('');

  useEffect(() => {
    if (!settingsQ.data) return;
    setOutputTaxAccountId(settingsQ.data.outputTaxAccountId ?? '');
    setInputTaxAccountId(settingsQ.data.inputTaxAccountId ?? '');
    setDefaultTaxCodeId(settingsQ.data.defaultTaxCodeId ?? '');
  }, [settingsQ.data]);

  const saveSettings = useMutation({
    mutationFn: () => api.setSettings({
      outputTaxAccountId: outputTaxAccountId || null,
      inputTaxAccountId: inputTaxAccountId || null,
      defaultTaxCodeId: defaultTaxCodeId || null
    }),
    onSuccess: () => {
      toast.success('Settings saved.');
      qc.invalidateQueries({ queryKey: ['tax-settings'] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Save failed')
  });

  const [adjDirection, setAdjDirection] = useState('output');
  const [adjTaxCodeId, setAdjTaxCodeId] = useState('');
  const [adjReference, setAdjReference] = useState('');
  const [adjDescription, setAdjDescription] = useState('');
  const [adjEffectiveDate, setAdjEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [adjTaxableAmount, setAdjTaxableAmount] = useState('');
  const [adjTaxAmount, setAdjTaxAmount] = useState('');

  const createAdjustment = useMutation({
    mutationFn: () => api.createAdjustment({
      direction: adjDirection,
      taxCodeId: adjTaxCodeId || null,
      reference: adjReference || undefined,
      description: adjDescription || undefined,
      effectiveDate: adjEffectiveDate || undefined,
      taxableAmount: adjTaxableAmount === '' ? undefined : Number(adjTaxableAmount),
      taxAmount: adjTaxAmount === '' ? undefined : Number(adjTaxAmount)
    }),
    onSuccess: () => {
      toast.success('Tax adjustment created.');
      setAdjReference('');
      setAdjDescription('');
      setAdjTaxCodeId('');
      setAdjTaxableAmount('');
      setAdjTaxAmount('');
      qc.invalidateQueries({ queryKey: qk.taxAdjustments({}) });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Create failed')
  });

  const postAdjustment = useMutation({
    mutationFn: (id) => api.postAdjustment(id),
    onSuccess: () => {
      toast.success('Tax adjustment posted.');
      qc.invalidateQueries({ queryKey: qk.taxAdjustments({}) });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Post failed')
  });

  const voidAdjustment = useMutation({
    mutationFn: (id) => api.voidAdjustment(id),
    onSuccess: () => {
      toast.success('Tax adjustment voided.');
      qc.invalidateQueries({ queryKey: qk.taxAdjustments({}) });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Void failed')
  });

  const codeColumns = [
    { header: 'Code', accessorKey: 'code', render: (row) => <span className="font-medium text-text-strong">{row.code}</span> },
    { header: 'Name', accessorKey: 'name' },
    { header: 'Type', accessorKey: 'tax_type', render: (row) => row.tax_type ?? row.taxType ?? '—' },
    { header: 'Direction', accessorKey: 'direction', render: (row) => row.direction ? <Badge tone="muted">{formatLabel(row.direction)}</Badge> : '—' },
    { header: 'Rate (%)', accessorKey: 'rate', className: 'text-right', render: (row) => Number(row.rate ?? 0).toFixed(2) },
    { header: 'Status', accessorKey: 'status', render: (row) => <Badge tone={statusTone(row.status)}>{formatLabel(row.status ?? 'active')}</Badge> }
  ];

  const jurisdictionColumns = [
    { header: 'Code', accessorKey: 'code', render: (row) => <span className="font-medium text-text-strong">{row.code}</span> },
    { header: 'Name', accessorKey: 'name' },
    { header: 'Country code', accessorKey: 'country_code', render: (row) => row.country_code ?? row.countryCode ?? '—' }
  ];

  const adjustmentColumns = [
    { header: 'Reference', accessorKey: 'reference', render: (row) => <span className="font-medium text-text-strong">{row.reference ?? row.id}</span> },
    { header: 'Direction', accessorKey: 'direction', render: (row) => <Badge tone="muted">{formatLabel(row.direction)}</Badge> },
    { header: 'Tax code', accessorKey: 'tax_code_code', render: (row) => row.tax_code_code ?? row.taxCodeCode ?? row.tax_code_id ?? row.taxCodeId ?? '—' },
    { header: 'Effective date', accessorKey: 'effective_date', render: (row) => row.effective_date ?? row.effectiveDate ?? '—' },
    { header: 'Taxable amount', accessorKey: 'taxable_amount', className: 'text-right', render: (row) => Number(row.taxable_amount ?? row.taxableAmount ?? 0).toFixed(2) },
    { header: 'Tax amount', accessorKey: 'tax_amount', className: 'text-right', render: (row) => Number(row.tax_amount ?? row.taxAmount ?? 0).toFixed(2) },
    { header: 'Status', accessorKey: 'status', render: (row) => <Badge tone={statusTone(row.status)}>{formatLabel(row.status ?? 'draft')}</Badge> },
    {
      header: 'Actions',
      accessorKey: 'id',
      render: (row) => (
        <div className="flex gap-2 justify-end">
          {String(row.status ?? '').toLowerCase() !== 'posted' ? (
            <Button size="sm" variant="outline" onClick={() => postAdjustment.mutate(row.id)} disabled={postAdjustment.isLoading}>Post</Button>
          ) : null}
          {String(row.status ?? '').toLowerCase() !== 'voided' ? (
            <Button size="sm" variant="outline" onClick={() => voidAdjustment.mutate(row.id)} disabled={voidAdjustment.isLoading}>Void</Button>
          ) : null}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Tax Administration"
        subtitle="Manage tax master data, tax control settings, and manual tax adjustments from one operational workspace."
        icon={ShieldCheck}
      />

      <PermissionGate any={[PERMISSIONS.taxRead]}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'codes', label: 'Tax Codes' },
            { value: 'juris', label: 'Jurisdictions' },
            { value: 'settings', label: 'Settings' },
            { value: 'adjustments', label: 'Adjustments' }
          ]}
        />

        {tab === 'codes' ? (
          <div className="space-y-6">
            <PermissionGate any={[PERMISSIONS.taxManage]}>
              <ContentCard title="New tax code" actions={<Badge tone="primary">Tax setup</Badge>}>
                <div className="grid gap-4 md:grid-cols-3">
                  <Select label="Jurisdiction" value={jurisdictionId} onChange={(e) => setJurisdictionId(e.target.value)} options={jurisOptions} />
                  <Select label="Type" value={taxType} onChange={(e) => setTaxType(e.target.value)} options={[{ value: 'VAT', label: 'VAT' }, { value: 'GST', label: 'GST' }, { value: 'SALES', label: 'Sales tax' }]} />
                  <Select label="Direction" value={direction} onChange={(e) => setDirection(e.target.value)} options={[{ value: '', label: '(optional)' }, { value: 'output', label: 'Output' }, { value: 'input', label: 'Input' }]} />
                  <Input label="Code" value={tCode} onChange={(e) => setTCode(e.target.value)} placeholder="e.g. VAT-STD" />
                  <Input label="Name" value={tName} onChange={(e) => setTName(e.target.value)} placeholder="e.g. Standard VAT" />
                  <Input label="Rate (%)" type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="15" />
                  <div className="md:col-span-3 flex justify-end">
                    <Button leftIcon={Plus} onClick={() => createCode.mutate()} disabled={createCode.isLoading || !tCode || !tName || rate === ''}>
                      {createCode.isLoading ? 'Creating…' : 'Create tax code'}
                    </Button>
                  </div>
                </div>
              </ContentCard>
            </PermissionGate>

            <ContentCard title="Tax code list">
              <DataTable columns={codeColumns} rows={taxCodes} isLoading={codesQ.isLoading} emptyTitle="No tax codes" emptyDescription="Create your first tax code above." />
            </ContentCard>
          </div>
        ) : null}

        {tab === 'juris' ? (
          <div className="space-y-6">
            <PermissionGate any={[PERMISSIONS.taxManage]}>
              <ContentCard title="New jurisdiction" actions={<Badge tone="primary">Master data</Badge>}>
                <div className="grid gap-4 md:grid-cols-3">
                  <Input label="Code" value={jCode} onChange={(e) => setJCode(e.target.value)} placeholder="e.g. GH" />
                  <Input label="Name" value={jName} onChange={(e) => setJName(e.target.value)} placeholder="e.g. Ghana" />
                  <Input label="Country code" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} placeholder="GH" />
                  <div className="md:col-span-3 flex justify-end">
                    <Button leftIcon={Plus} onClick={() => createJ.mutate()} disabled={createJ.isLoading || !jCode || !jName}>
                      {createJ.isLoading ? 'Creating…' : 'Create jurisdiction'}
                    </Button>
                  </div>
                </div>
              </ContentCard>
            </PermissionGate>

            <ContentCard title="Jurisdiction list">
              <DataTable columns={jurisdictionColumns} rows={jurisdictions} isLoading={jurisQ.isLoading} emptyTitle="No jurisdictions" emptyDescription="Create your first jurisdiction above." />
            </ContentCard>
          </div>
        ) : null}

        {tab === 'settings' ? (
          <div className="space-y-6">
            <ContentCard title="Tax control settings" actions={<Badge tone="primary">Configuration</Badge>}>
              <div className="grid gap-4 md:grid-cols-3">
                <Select label="Output tax account" value={outputTaxAccountId} onChange={(e) => setOutputTaxAccountId(e.target.value)} options={accountOptions} />
                <Select label="Input tax account" value={inputTaxAccountId} onChange={(e) => setInputTaxAccountId(e.target.value)} options={accountOptions} />
                <Select label="Default tax code" value={defaultTaxCodeId} onChange={(e) => setDefaultTaxCodeId(e.target.value)} options={taxCodeOptions} />
              </div>
              <div className="mt-4 flex justify-end">
                <PermissionGate any={[PERMISSIONS.taxManage]}>
                  <Button leftIcon={Settings2} onClick={() => saveSettings.mutate()} disabled={saveSettings.isLoading}>
                    {saveSettings.isLoading ? 'Saving…' : 'Save settings'}
                  </Button>
                </PermissionGate>
              </div>
            </ContentCard>

            <ContentCard title="Current settings payload">
              <JsonPanel title="Settings" value={settingsQ.data ?? {}} />
            </ContentCard>
          </div>
        ) : null}

        {tab === 'adjustments' ? (
          <div className="space-y-6">
            <PermissionGate any={[PERMISSIONS.taxManage]}>
              <ContentCard title="Manual tax adjustment" actions={<Badge tone="warning">Operational adjustment</Badge>}>
                <div className="grid gap-4 md:grid-cols-3">
                  <Select label="Direction" value={adjDirection} onChange={(e) => setAdjDirection(e.target.value)} options={[{ value: 'output', label: 'Output' }, { value: 'input', label: 'Input' }]} />
                  <Select label="Tax code" value={adjTaxCodeId} onChange={(e) => setAdjTaxCodeId(e.target.value)} options={taxCodeOptions} />
                  <Input label="Effective date" type="date" value={adjEffectiveDate} onChange={(e) => setAdjEffectiveDate(e.target.value)} />
                  <Input label="Reference" value={adjReference} onChange={(e) => setAdjReference(e.target.value)} placeholder="e.g. TAX-ADJ-0001" />
                  <Input label="Taxable amount" type="number" value={adjTaxableAmount} onChange={(e) => setAdjTaxableAmount(e.target.value)} placeholder="0.00" />
                  <Input label="Tax amount" type="number" value={adjTaxAmount} onChange={(e) => setAdjTaxAmount(e.target.value)} placeholder="0.00" />
                  <div className="md:col-span-3">
                    <Input label="Description" value={adjDescription} onChange={(e) => setAdjDescription(e.target.value)} placeholder="Reason for adjustment" />
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <Button leftIcon={Plus} onClick={() => createAdjustment.mutate()} disabled={createAdjustment.isLoading || !adjDirection || !adjTaxAmount}>
                      {createAdjustment.isLoading ? 'Creating…' : 'Create adjustment'}
                    </Button>
                  </div>
                </div>
              </ContentCard>
            </PermissionGate>

            <ContentCard title="Tax adjustments register" actions={<Badge tone={adjustments.length ? 'success' : 'muted'}>{adjustments.length} item{adjustments.length === 1 ? '' : 's'}</Badge>}>
              <DataTable columns={adjustmentColumns} rows={adjustments} isLoading={adjustmentsQ.isLoading} emptyTitle="No adjustments" emptyDescription="Manual tax adjustments will appear here once created." />
            </ContentCard>

            <ContentCard title="Why this matters">
              <div className="space-y-3 text-sm text-text-body">
                <div className="flex gap-3 rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                  <p>Use manual tax adjustments for filing corrections, audit corrections, and tax-only reclassifications that should flow into tax reporting.</p>
                </div>
                <div className="flex gap-3 rounded-2xl border border-border-subtle bg-surface-2 px-4 py-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <p>Posted adjustments should now be visible in downstream tax reporting where the backend includes tax adjustment sources.</p>
                </div>
              </div>
            </ContentCard>
          </div>
        ) : null}
      </PermissionGate>
    </div>
  );
}
