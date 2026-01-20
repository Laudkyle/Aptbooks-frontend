import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeTaxApi } from '../api/tax.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Tabs } from '../../../../shared/components/ui/Tabs.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { PERMISSIONS } from '../../../../app/constants/permissions.js';
import { PermissionGate } from '../../../../app/routes/route-guards.jsx';

export default function TaxAdmin() {
  const { http } = useApi();
  const api = useMemo(() => makeTaxApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [tab, setTab] = useState('codes');

  const jurisQ = useQuery({ queryKey: ['tax-juris'], queryFn: api.listJurisdictions, staleTime: 10_000 });
  const codesQ = useQuery({ queryKey: ['tax-codes'], queryFn: () => api.listCodes({}), staleTime: 10_000 });
  const settingsQ = useQuery({ queryKey: ['tax-settings'], queryFn: api.getSettings, staleTime: 10_000 });

  // Jurisdictions create
  const [jCode, setJCode] = useState('');
  const [jName, setJName] = useState('');
  const [countryCode, setCountryCode] = useState('');

  const createJ = useMutation({
    mutationFn: () => api.createJurisdiction({ code: jCode, name: jName, countryCode: countryCode || undefined }),
    onSuccess: () => {
      toast.success('Jurisdiction created.');
      setJCode(''); setJName(''); setCountryCode('');
      qc.invalidateQueries({ queryKey: ['tax-juris'] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Create failed')
  });

  // Tax code create
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
      setTCode(''); setTName(''); setRate('');
      qc.invalidateQueries({ queryKey: ['tax-codes'] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Create failed')
  });

  // Settings
  const [outputTaxAccountId, setOutputTaxAccountId] = useState('');
  const [inputTaxAccountId, setInputTaxAccountId] = useState('');
  const [defaultTaxCodeId, setDefaultTaxCodeId] = useState('');

  React.useEffect(() => {
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

  const jurisOptions = [{ value: '', label: 'No jurisdiction' }].concat(
    (jurisQ.data ?? []).map((j) => ({ value: j.id, label: `${j.code} — ${j.name}` }))
  );

  const taxCodeOptions = [{ value: '', label: 'None' }].concat(
    (codesQ.data ?? []).map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Tax" subtitle="Jurisdictions, tax codes, and tax settings." />

      <PermissionGate any={[PERMISSIONS.taxRead]}>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'codes', label: 'Tax Codes' },
            { value: 'juris', label: 'Jurisdictions' },
            { value: 'settings', label: 'Settings' }
          ]}
        />

        {tab === 'codes' ? (
          <ContentCard title="Tax codes">
            <PermissionGate any={[PERMISSIONS.taxManage]}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Select label="Jurisdiction" value={jurisdictionId} onChange={(e) => setJurisdictionId(e.target.value)} options={jurisOptions} />
                <Select label="Type" value={taxType} onChange={(e) => setTaxType(e.target.value)} options={[{value:'VAT',label:'VAT'},{value:'GST',label:'GST'},{value:'SALES',label:'SALES'}]} />
                <Select label="Direction" value={direction} onChange={(e) => setDirection(e.target.value)} options={[{value:'',label:'(optional)'},{value:'output',label:'output'},{value:'input',label:'input'}]} />
                <Input label="Code" value={tCode} onChange={(e) => setTCode(e.target.value)} />
                <Input label="Name" value={tName} onChange={(e) => setTName(e.target.value)} />
                <Input label="Rate" type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
                <div className="md:col-span-3 flex justify-end">
                  <Button onClick={() => createCode.mutate()} disabled={createCode.isLoading || !tCode || !tName || !rate}>
                    Create tax code
                  </Button>
                </div>
              </div>
            </PermissionGate>

            <div className="mt-4 overflow-auto">
              <Table>
                <THead>
                  <tr>
                    <TH>Code</TH>
                    <TH>Name</TH>
                    <TH>Type</TH>
                    <TH className="text-right">Rate</TH>
                    <TH>Status</TH>
                  </tr>
                </THead>
                <TBody>
                  {(codesQ.data ?? []).map((c) => (
                    <tr key={c.id}>
                      <TD>{c.code}</TD>
                      <TD>{c.name}</TD>
                      <TD>{c.taxType}</TD>
                      <TD className="text-right">{c.rate}</TD>
                      <TD>{c.status ?? '—'}</TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
          </ContentCard>
        ) : null}

        {tab === 'juris' ? (
          <ContentCard title="Jurisdictions">
            <PermissionGate any={[PERMISSIONS.taxManage]}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Input label="Code" value={jCode} onChange={(e) => setJCode(e.target.value)} />
                <Input label="Name" value={jName} onChange={(e) => setJName(e.target.value)} />
                <Input label="Country (optional)" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} placeholder="GH" />
                <div className="md:col-span-3 flex justify-end">
                  <Button onClick={() => createJ.mutate()} disabled={createJ.isLoading || !jCode || !jName}>
                    Create jurisdiction
                  </Button>
                </div>
              </div>
            </PermissionGate>

            <div className="mt-4 overflow-auto">
              <Table>
                <THead>
                  <tr>
                    <TH>Code</TH>
                    <TH>Name</TH>
                    <TH>Country</TH>
                  </tr>
                </THead>
                <TBody>
                  {(jurisQ.data ?? []).map((j) => (
                    <tr key={j.id}>
                      <TD>{j.code}</TD>
                      <TD>{j.name}</TD>
                      <TD>{j.countryCode ?? '—'}</TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
          </ContentCard>
        ) : null}

        {tab === 'settings' ? (
          <ContentCard title="Tax settings">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input label="Output tax accountId (optional)" value={outputTaxAccountId} onChange={(e) => setOutputTaxAccountId(e.target.value)} />
              <Input label="Input tax accountId (optional)" value={inputTaxAccountId} onChange={(e) => setInputTaxAccountId(e.target.value)} />
              <Select label="Default tax code (optional)" value={defaultTaxCodeId} onChange={(e) => setDefaultTaxCodeId(e.target.value)} options={taxCodeOptions} />
              <div className="md:col-span-3 flex justify-end">
                <PermissionGate any={[PERMISSIONS.taxManage]}>
                  <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isLoading}>
                    Save settings
                  </Button>
                </PermissionGate>
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-600">Settings endpoint: PUT /core/accounting/tax/settings</div>
          </ContentCard>
        ) : null}
      </PermissionGate>
    </div>
  );
}
