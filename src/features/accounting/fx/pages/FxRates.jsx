import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeFxApi } from '../api/fx.api.js';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Tabs } from '../../../../shared/components/ui/Tabs.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { DollarSign, TrendingUp, Calendar, Plus, RefreshCw, Search, ArrowRightLeft } from 'lucide-react';

export default function FxRates() {
  const { http } = useApi();
  const api = useMemo(() => makeFxApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [tab, setTab] = useState('types');

  const typesQ = useQuery({ 
    queryKey: ['fx-rate-types'], 
    queryFn: () => api.listRateTypes?.() || Promise.resolve([]), 
    staleTime: 10_000 
  });
  
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const createType = useMutation({
    mutationFn: () => api.createRateType({ code, name }),
    onSuccess: () => {
      toast.success('Rate type created.');
      setCode('');
      setName('');
      qc.invalidateQueries({ queryKey: ['fx-rate-types'] });
    },
    onError: (e) => toast.error(e.message ?? 'Create failed')
  });

  const [rateTypeCode, setRateTypeCode] = useState('');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('GHS');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [rate, setRate] = useState('');

  const ratesQ = useQuery({
    queryKey: ['fx-rates', { rateTypeCode, fromCurrency, toCurrency }],
    queryFn: () => {
      if (!api.listRates) return Promise.resolve([]);
      return api.listRates({ 
        rateTypeCode: rateTypeCode || undefined, 
        fromCurrency: fromCurrency || undefined, 
        toCurrency: toCurrency || undefined 
      });
    },
    staleTime: 5_000
  });

  const upsert = useMutation({
    mutationFn: () => api.upsertRate({ 
      rateTypeCode, 
      fromCurrency, 
      toCurrency, 
      effectiveDate, 
      rate: Number(rate) 
    }),
    onSuccess: () => {
      toast.success('Rate upserted.');
      setEffectiveDate('');
      setRate('');
      qc.invalidateQueries({ queryKey: ['fx-rates'] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Upsert failed')
  });

  const [asOfDate, setAsOfDate] = useState('');
  const effectiveQ = useQuery({
    queryKey: ['fx-effective', { rateTypeCode, fromCurrency, toCurrency, asOfDate }],
    queryFn: () => {
      if (!api.effectiveRate) return Promise.resolve(null);
      return api.effectiveRate({ rateTypeCode, fromCurrency, toCurrency, asOfDate });
    },
    enabled: !!rateTypeCode && !!fromCurrency && !!toCurrency && !!asOfDate
  });

  const typeOptions = [
    { value: '', label: 'Select rate type…' }
  ].concat(
    Array.isArray(typesQ.data) 
      ? typesQ.data.map((t) => ({ value: t.code, label: `${t.code} — ${t.name}` }))
      : Array.isArray(typesQ.data?.data)
      ? typesQ.data.data.map((t) => ({ value: t.code, label: `${t.code} — ${t.name}` }))
      : []
  );

  return (
    <div className="min-h-screen bg-bg-main">
      {/* Header */}
      <div className="bg-brand-deep text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">Foreign Exchange Rates</h1>
              <p className="text-brand-light mt-1">Manage FX rate types and effective rates</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="space-y-6">
          {/* Tabs */}
          <div className="bg-surface-1 rounded-lg shadow-soft border border-border-subtle p-1">
            <div className="flex gap-2">
              <button
                onClick={() => setTab('types')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === 'types'
                    ? 'bg-brand-primary text-white'
                    : 'text-text-body hover:bg-surface-2'
                }`}
              >
                Rate Types
              </button>
              <button
                onClick={() => setTab('rates')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === 'rates'
                    ? 'bg-brand-primary text-white'
                    : 'text-text-body hover:bg-surface-2'
                }`}
              >
                Exchange Rates
              </button>
              <button
                onClick={() => setTab('effective')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === 'effective'
                    ? 'bg-brand-primary text-white'
                    : 'text-text-body hover:bg-surface-2'
                }`}
              >
                Rate Lookup
              </button>
            </div>
          </div>

          {/* Rate Types Tab */}
          {tab === 'types' && (
            <>
              {/* Create Rate Type */}
              <div className="bg-surface-1 rounded-lg shadow-soft border border-border-subtle">
                <div className="px-6 py-4 border-b border-border-subtle">
                  <h2 className="text-lg font-semibold text-text-body flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Create Rate Type
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input 
                      label="Code *" 
                      value={code} 
                      onChange={(e) => setCode(e.target.value.toUpperCase())} 
                      placeholder="e.g., SPOT, FORWARD"
                    />
                    <Input 
                      label="Name *" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Spot Rate, Forward Rate"
                    />
                    <div className="flex items-end">
                      <Button 
                        onClick={() => createType.mutate()} 
                        disabled={createType.isLoading || !code || !name}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Type
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rate Types List */}
              <div className="bg-surface-1 rounded-lg shadow-soft border border-border-subtle overflow-hidden">
                <div className="px-6 py-4 border-b border-border-subtle bg-surface-2">
                  <h2 className="text-lg font-semibold text-text-body">Existing Rate Types</h2>
                  <p className="text-sm text-text-body/70 mt-1">
                    {(() => {
                      const types = Array.isArray(typesQ.data) ? typesQ.data : (typesQ.data?.data || []);
                      return types.length;
                    })()} rate type(s) configured
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-2 border-b border-border-subtle">
                      <tr>
                        <th className="py-3 px-6 text-left text-xs font-bold text-text-body uppercase tracking-wider">
                          Code
                        </th>
                        <th className="py-3 px-6 text-left text-xs font-bold text-text-body uppercase tracking-wider">
                          Name
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {typesQ.isLoading ? (
                        <tr>
                          <td colSpan="2" className="py-8 text-center text-text-body/70">
                            Loading rate types...
                          </td>
                        </tr>
                      ) : (() => {
                        const types = Array.isArray(typesQ.data) ? typesQ.data : (typesQ.data?.data || []);
                        return types.length === 0 ? (
                          <tr>
                            <td colSpan="2" className="py-8 text-center text-text-body/70">
                              No rate types created yet
                            </td>
                          </tr>
                        ) : (
                          types.map((t) => (
                            <tr key={t.code} className="hover:bg-surface-2 transition-colors">
                              <td className="py-3 px-6">
                                <div className="text-sm font-semibold text-text-body">
                                  {t.code}
                                </div>
                              </td>
                              <td className="py-3 px-6">
                                <div className="text-sm text-text-body">
                                  {t.name}
                                </div>
                              </td>
                            </tr>
                          ))
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Exchange Rates Tab */}
          {tab === 'rates' && (
            <>
              {/* Filters */}
              <div className="bg-surface-1 rounded-lg shadow-soft border border-border-subtle">
                <div className="px-6 py-4 border-b border-border-subtle">
                  <h2 className="text-lg font-semibold text-text-body flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Filter Rates
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Select 
                      value={rateTypeCode} 
                      onChange={(e) => setRateTypeCode(e.target.value)} 
                      options={typeOptions}
                      label="Rate Type"
                    />
                    <Input 
                      label="From Currency" 
                      value={fromCurrency} 
                      onChange={(e) => setFromCurrency(e.target.value.toUpperCase())}
                      placeholder="USD"
                    />
                    <Input 
                      label="To Currency" 
                      value={toCurrency} 
                      onChange={(e) => setToCurrency(e.target.value.toUpperCase())}
                      placeholder="GHS"
                    />
                    <div className="flex items-end">
                      <Button 
                        onClick={() => ratesQ.refetch()} 
                        variant="secondary"
                        className="w-full"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add New Rate */}
              <div className="bg-surface-1 rounded-lg shadow-soft border border-border-subtle">
                <div className="px-6 py-4 border-b border-border-subtle">
                  <h2 className="text-lg font-semibold text-text-body flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add/Update Rate
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Input 
                      label="Effective Date *" 
                      type="date" 
                      value={effectiveDate} 
                      onChange={(e) => setEffectiveDate(e.target.value)}
                    />
                    <Input 
                      label="Exchange Rate *" 
                      type="number" 
                      step="0.000001"
                      value={rate} 
                      onChange={(e) => setRate(e.target.value)}
                      placeholder="e.g., 15.5"
                    />
                    <div className="flex items-end">
                      <Button 
                        onClick={() => upsert.mutate()} 
                        disabled={upsert.isLoading || !rateTypeCode || !fromCurrency || !toCurrency || !effectiveDate || !rate}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Upsert Rate
                      </Button>
                    </div>
                    <div className="col-span-2 flex items-end">
                      <div className="text-xs text-text-body/60 bg-surface-2 px-3 py-2 rounded border border-border-subtle w-full">
                        <ArrowRightLeft className="w-3 h-3 inline mr-1" />
                        {fromCurrency || 'FROM'} → {toCurrency || 'TO'} @ {rateTypeCode || 'TYPE'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rates Table */}
              <div className="bg-surface-1 rounded-lg shadow-soft border border-border-subtle overflow-hidden">
                <div className="px-6 py-4 border-b border-border-subtle bg-surface-2">
                  <h2 className="text-lg font-semibold text-text-body">Exchange Rates</h2>
                  <p className="text-sm text-text-body/70 mt-1">
                    {(() => {
                      const rates = Array.isArray(ratesQ.data) ? ratesQ.data : (ratesQ.data?.data || []);
                      return rates.length;
                    })()} rate(s) found
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-2 border-b-2 border-border-subtle">
                      <tr>
                        <th className="py-3 px-6 text-left text-xs font-bold text-text-body uppercase tracking-wider">
                          Type
                        </th>
                        <th className="py-3 px-6 text-left text-xs font-bold text-text-body uppercase tracking-wider">
                          From
                        </th>
                        <th className="py-3 px-6 text-center text-xs font-bold text-text-body uppercase tracking-wider">
                          →
                        </th>
                        <th className="py-3 px-6 text-left text-xs font-bold text-text-body uppercase tracking-wider">
                          To
                        </th>
                        <th className="py-3 px-6 text-left text-xs font-bold text-text-body uppercase tracking-wider">
                          Effective Date
                        </th>
                        <th className="py-3 px-6 text-right text-xs font-bold text-text-body uppercase tracking-wider">
                          Exchange Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {ratesQ.isLoading ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-text-body/70">
                            Loading rates...
                          </td>
                        </tr>
                      ) : ratesQ.isError ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-red-600">
                            {ratesQ.error?.message ?? 'Failed to load rates'}
                          </td>
                        </tr>
                      ) : (() => {
                        const rates = Array.isArray(ratesQ.data) ? ratesQ.data : (ratesQ.data?.data || []);
                        return rates.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-text-body/70">
                              No rates found for selected filters
                            </td>
                          </tr>
                        ) : (
                          rates.map((r, idx) => (
                            <tr key={r.id ?? idx} className="hover:bg-surface-2 transition-colors">
                              <td className="py-3 px-6">
                                <div className="text-sm font-medium text-brand-primary">
                                  {r.rateTypeCode ?? r.rate_type_code ?? '—'}
                                </div>
                              </td>
                              <td className="py-3 px-6">
                                <div className="text-sm font-semibold text-text-body">
                                  {r.fromCurrency ?? r.from_currency ?? '—'}
                                </div>
                              </td>
                              <td className="py-3 px-6 text-center">
                                <ArrowRightLeft className="w-4 h-4 text-text-body/50 mx-auto" />
                              </td>
                              <td className="py-3 px-6">
                                <div className="text-sm font-semibold text-text-body">
                                  {r.toCurrency ?? r.to_currency ?? '—'}
                                </div>
                              </td>
                              <td className="py-3 px-6">
                                <div className="text-sm text-text-body flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-text-body/50" />
                                  {r.effectiveDate ?? r.effective_date ?? '—'}
                                </div>
                              </td>
                              <td className="py-3 px-6 text-right">
                                <div className="text-sm font-bold text-brand-deep">
                                  {r.rate ? Number(r.rate).toFixed(6) : '—'}
                                </div>
                              </td>
                            </tr>
                          ))
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Effective Rate Lookup Tab */}
          {tab === 'effective' && (
            <>
              {/* Lookup Form */}
              <div className="bg-surface-1 rounded-lg shadow-soft border border-border-subtle">
                <div className="px-6 py-4 border-b border-border-subtle">
                  <h2 className="text-lg font-semibold text-text-body flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Rate Lookup Parameters
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Select 
                      value={rateTypeCode} 
                      onChange={(e) => setRateTypeCode(e.target.value)} 
                      options={typeOptions}
                      label="Rate Type *"
                    />
                    <Input 
                      label="From Currency *" 
                      value={fromCurrency} 
                      onChange={(e) => setFromCurrency(e.target.value.toUpperCase())}
                      placeholder="USD"
                    />
                    <Input 
                      label="To Currency *" 
                      value={toCurrency} 
                      onChange={(e) => setToCurrency(e.target.value.toUpperCase())}
                      placeholder="GHS"
                    />
                    <Input 
                      label="As Of Date *" 
                      type="date" 
                      value={asOfDate} 
                      onChange={(e) => setAsOfDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Lookup Result */}
              <div className="bg-surface-1 rounded-lg shadow-soft border border-border-subtle">
                <div className="px-6 py-4 border-b border-border-subtle bg-surface-2">
                  <h2 className="text-lg font-semibold text-text-body">Effective Rate Result</h2>
                </div>
                <div className="p-6">
                  {effectiveQ.isLoading ? (
                    <div className="text-center py-8 text-text-body/70">Loading effective rate...</div>
                  ) : effectiveQ.isError ? (
                    <div className="text-center py-8 text-red-600">
                      {effectiveQ.error?.message ?? 'Failed to load effective rate'}
                    </div>
                  ) : !asOfDate || !rateTypeCode ? (
                    <div className="text-center py-8">
                      <TrendingUp className="w-12 h-12 text-text-body/30 mx-auto mb-3" />
                      <p className="text-text-body/70">Fill in all required fields to lookup the effective rate</p>
                    </div>
                  ) : effectiveQ.data ? (
                    <div className="space-y-4">
                      <div className="bg-brand-light/10 border-2 border-brand-primary rounded-lg p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                            <div className="text-xs font-medium text-text-body/60 uppercase tracking-wide mb-1">
                              Rate Type
                            </div>
                            <div className="text-lg font-bold text-brand-deep">
                              {effectiveQ.data.rateTypeCode ?? effectiveQ.data.rate_type_code}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-text-body/60 uppercase tracking-wide mb-1">
                              Currency Pair
                            </div>
                            <div className="text-lg font-bold text-text-body flex items-center gap-2">
                              {effectiveQ.data.fromCurrency ?? effectiveQ.data.from_currency}
                              <ArrowRightLeft className="w-4 h-4" />
                              {effectiveQ.data.toCurrency ?? effectiveQ.data.to_currency}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-text-body/60 uppercase tracking-wide mb-1">
                              Effective Date
                            </div>
                            <div className="text-lg font-bold text-text-body">
                              {effectiveQ.data.effectiveDate ?? effectiveQ.data.effective_date}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-text-body/60 uppercase tracking-wide mb-1">
                              Exchange Rate
                            </div>
                            <div className="text-2xl font-bold text-brand-primary">
                              {effectiveQ.data.rate ? Number(effectiveQ.data.rate).toFixed(6) : '—'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Debug JSON */}
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium text-text-body/70 hover:text-text-body">
                          View Raw Response
                        </summary>
                        <pre className="mt-2 max-h-80 overflow-auto rounded bg-surface-2 p-4 text-xs text-text-body border border-border-subtle">
                          {JSON.stringify(effectiveQ.data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}