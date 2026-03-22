import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeTaxApi } from '../api/tax.api.js';
import { makeCoaApi } from '../../../../features/accounting/chartOfAccounts/api/coa.api.js';

import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { PERMISSIONS } from '../../../../app/constants/permissions.js';
import { PermissionGate } from '../../../../app/routes/route-guards.jsx';

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
  
  // Fetch accounts for settings dropdown
  const accountsQ = useQuery({
    queryKey: ['coa', 'false'],
    queryFn: () => coaApi.list({ includeArchived: 'false' }),
    staleTime: 10_000
  });

  // Jurisdictions create
  const [jCode, setJCode] = useState('');
  const [jName, setJName] = useState('');
  const [countryCode, setCountryCode] = useState('');

  const createJ = useMutation({
    mutationFn: () => api.createJurisdiction({ code: jCode, name: jName, countryCode: countryCode || undefined }),
    onSuccess: () => {
      toast.success('Jurisdiction created.');
      setJCode('');setJName('');setCountryCode('');
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
      setTCode('');setTName('');setRate('');
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

  // Fix the error by ensuring data is always an array
  const jurisdictions = Array.isArray(jurisQ.data?.data) ? jurisQ.data?.data : [];
  const taxCodes = Array.isArray(codesQ.data?.data) ? codesQ.data?.data : [];
  const accounts = Array.isArray(accountsQ.data) ? accountsQ.data : [];

  const jurisOptions = [{ value: '', label: 'No jurisdiction' }].concat(
    jurisdictions.map((j) => ({ value: j.id, label: `${j.code} — ${j.name}` }))
  );

  const taxCodeOptions = [{ value: '', label: 'None' }].concat(
    taxCodes.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))
  );

  // Create account options from COA data
  const accountOptions = [{ value: '', label: 'Select account' }].concat(
    accounts.map((a) => ({ 
      value: a.id, 
      label: `${a.code ? a.code + ' — ' : ''}${a.name}` 
    }))
  );

  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* QuickBooks-style Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text-strong">Taxes</h1>
          <p className="mt-1 text-sm text-text-muted">Manage jurisdictions, tax codes, and settings</p>
        </div>

        <PermissionGate any={[PERMISSIONS.taxRead]}>
          {/* QuickBooks-style Tabs */}
          <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle overflow-hidden">
            <div className="border-b border-border-subtle">
              <nav className="flex -mb-px">
                {[
                  { value: 'codes', label: 'Tax Codes' },
                  { value: 'juris', label: 'Jurisdictions' },
                  { value: 'settings', label: 'Settings' }
                ].map((tabItem) => (
                  <Button
                    key={tabItem.value}
                    variant={tab === tabItem.value ? 'primary' : 'ghost'}
                    onClick={() => setTab(tabItem.value)}
                    className="rounded-none border-b-2 border-transparent px-6 py-4 shadow-none ring-0"
                  >
                    {tabItem.label}
                  </Button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {tab === 'codes' && (
                <div className="space-y-6">
                  <PermissionGate any={[PERMISSIONS.taxManage]}>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                      <h3 className="text-sm font-semibold text-text-strong mb-4">New Tax Code</h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <Select 
                          label="Jurisdiction" 
                          value={jurisdictionId} 
                          onChange={(e) => setJurisdictionId(e.target.value)} 
                          options={jurisOptions} 
                        />
                        <Select 
                          label="Type" 
                          value={taxType} 
                          onChange={(e) => setTaxType(e.target.value)} 
                          options={[
                            {value:'VAT',label:'VAT'},
                            {value:'GST',label:'GST'},
                            {value:'SALES',label:'Sales Tax'}
                          ]} 
                        />
                        <Select 
                          label="Direction" 
                          value={direction} 
                          onChange={(e) => setDirection(e.target.value)} 
                          options={[
                            {value:'',label:'(optional)'},
                            {value:'output',label:'Output'},
                            {value:'input',label:'Input'}
                          ]} 
                        />
                        <Input 
                          label="Code" 
                          value={tCode} 
                          onChange={(e) => setTCode(e.target.value)}
                          placeholder="e.g., VAT20"
                        />
                        <Input 
                          label="Name" 
                          value={tName} 
                          onChange={(e) => setTName(e.target.value)}
                          placeholder="e.g., Standard VAT"
                        />
                        <Input 
                          label="Rate (%)" 
                          type="number" 
                          value={rate} 
                          onChange={(e) => setRate(e.target.value)}
                          placeholder="20"
                        />
                        <div className="md:col-span-3 flex justify-end">
                          <Button 
                            onClick={() => createCode.mutate()} 
                            disabled={createCode.isLoading || !tCode || !tName || !rate}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                          >
                            {createCode.isLoading ? 'Creating...' : 'Create Tax Code'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PermissionGate>

                  <div>
                    <h3 className="text-sm font-semibold text-text-strong mb-3">Tax Code List</h3>
                    <div className="border border-border-subtle rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border-subtle">
                          <thead className="">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-text-body uppercase tracking-wider">Code</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-text-body uppercase tracking-wider">Name</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-text-body uppercase tracking-wider">Type</th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-text-body uppercase tracking-wider">Rate (%)</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-text-body uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-surface-1 divide-y divide-border-subtle">
                            {taxCodes.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-sm text-text-muted">
                                  No tax codes found. Create your first tax code above.
                                </td>
                              </tr>
                            ) : (
                              taxCodes.map((c) => (
                                <tr key={c.id} className="hover:bg-surface-2 transition-colors">
                                  <td className="px-6 py-4 text-sm font-medium text-text-strong">{c.code}</td>
                                  <td className="px-6 py-4 text-sm text-text-body">{c.name}</td>
                                  <td className="px-6 py-4 text-sm text-text-body">{c.tax_type}</td>
                                  <td className="px-6 py-4 text-sm text-text-body text-right">{c.rate}%</td>
                                  <td className="px-6 py-4 text-sm">
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                      c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-surface-2 text-text-strong'
                                    }`}>
                                      {c.status || 'Active'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'juris' && (
                <div className="space-y-6">
                  <PermissionGate any={[PERMISSIONS.taxManage]}>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                      <h3 className="text-sm font-semibold text-text-strong mb-4">New Jurisdiction</h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <Input 
                          label="Code" 
                          value={jCode} 
                          onChange={(e) => setJCode(e.target.value)}
                          placeholder="e.g., UK"
                        />
                        <Input 
                          label="Name" 
                          value={jName} 
                          onChange={(e) => setJName(e.target.value)}
                          placeholder="e.g., United Kingdom"
                        />
                        <Input 
                          label="Country Code (optional)" 
                          value={countryCode} 
                          onChange={(e) => setCountryCode(e.target.value)} 
                          placeholder="GH" 
                        />
                        <div className="md:col-span-3 flex justify-end">
                          <Button 
                            onClick={() => createJ.mutate()} 
                            disabled={createJ.isLoading || !jCode || !jName}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                          >
                            {createJ.isLoading ? 'Creating...' : 'Create Jurisdiction'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PermissionGate>

                  <div>
                    <h3 className="text-sm font-semibold text-text-strong mb-3">Jurisdiction List</h3>
                    <div className="border border-border-subtle rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border-subtle">
                          <thead className="">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-text-body uppercase tracking-wider">Code</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-text-body uppercase tracking-wider">Name</th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-text-body uppercase tracking-wider">Country Code</th>
                            </tr>
                          </thead>
                          <tbody className="bg-surface-1 divide-y divide-border-subtle">
                            {jurisdictions.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="px-6 py-8 text-center text-sm text-text-muted">
                                  No jurisdictions found. Create your first jurisdiction above.
                                </td>
                              </tr>
                            ) : (
                              jurisdictions.map((j) => (
                                <tr key={j.id} className="hover:bg-surface-2 transition-colors">
                                  <td className="px-6 py-4 text-sm font-medium text-text-strong">{j.code}</td>
                                  <td className="px-6 py-4 text-sm text-text-body">{j.name}</td>
                                  <td className="px-6 py-4 text-sm text-text-body">{j.country_code || '—'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'settings' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                    <h3 className="text-sm font-semibold text-text-strong mb-4">Tax Account Settings</h3>
                    <p className="text-sm text-text-muted mb-4">
                      Configure which accounts should be used for tax transactions
                    </p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Select
                        label="Output Tax Account"
                        value={outputTaxAccountId}
                        onChange={(e) => setOutputTaxAccountId(e.target.value)}
                        options={accountOptions}
                      />
                      <Select
                        label="Input Tax Account"
                        value={inputTaxAccountId}
                        onChange={(e) => setInputTaxAccountId(e.target.value)}
                        options={accountOptions}
                      />
                      <Select 
                        label="Default Tax Code" 
                        value={defaultTaxCodeId} 
                        onChange={(e) => setDefaultTaxCodeId(e.target.value)} 
                        options={taxCodeOptions} 
                      />
                      <div className="md:col-span-2 flex justify-end">
                        <PermissionGate any={[PERMISSIONS.taxManage]}>
                          <Button 
                            onClick={() => saveSettings.mutate()} 
                            disabled={saveSettings.isLoading}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                          >
                            {saveSettings.isLoading ? 'Saving...' : 'Save Settings'}
                          </Button>
                        </PermissionGate>
                      </div>
                    </div>
                  </div>

                  <div className=" border border-border-subtle rounded-lg p-4">
                    <p className="text-xs text-text-muted">
                      <span className="font-semibold">API Endpoint:</span> PUT /core/accounting/tax/settings
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </PermissionGate>
      </div>
    </div>
  );
}