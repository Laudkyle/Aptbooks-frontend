import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeFxApi } from '../api/fx.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../../shared/components/data/FilterBar.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Tabs } from '../../../../shared/components/ui/Tabs.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';

export default function FxRates() {
  const { http } = useApi();
  const api = useMemo(() => makeFxApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [tab, setTab] = useState('types');

  const typesQ = useQuery({ queryKey: ['fx-rate-types'], queryFn: api.listRateTypes, staleTime: 10_000 });
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
    queryFn: () => api.listRates({ rateTypeCode: rateTypeCode || undefined, fromCurrency: fromCurrency || undefined, toCurrency: toCurrency || undefined }),
    staleTime: 5_000
  });

  const upsert = useMutation({
    mutationFn: () => api.upsertRate({ rateTypeCode, fromCurrency, toCurrency, effectiveDate, rate: Number(rate) }),
    onSuccess: () => {
      toast.success('Rate upserted.');
      qc.invalidateQueries({ queryKey: ['fx-rates'] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Upsert failed')
  });

  const [asOfDate, setAsOfDate] = useState('');
  const effectiveQ = useQuery({
    queryKey: ['fx-effective', { rateTypeCode, fromCurrency, toCurrency, asOfDate }],
    queryFn: () => api.effectiveRate({ rateTypeCode, fromCurrency, toCurrency, asOfDate }),
    enabled: !!rateTypeCode && !!fromCurrency && !!toCurrency && !!asOfDate
  });

  const typeOptions = [{ value: '', label: 'Select rate type…' }].concat((typesQ.data ?? []).map((t) => ({ value: t.code, label: `${t.code} — ${t.name}` })));

  return (
    <div className="space-y-4">
      <PageHeader title="FX" subtitle="Manage FX rate types and effective rates." />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'types', label: 'Rate Types' },
          { value: 'rates', label: 'Rates' },
          { value: 'effective', label: 'Effective Rate' }
        ]}
      />

      {tab === 'types' ? (
        <ContentCard title="Rate types">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} />
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex items-end">
              <Button onClick={() => createType.mutate()} disabled={createType.isLoading || !code || !name}>
                Create
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-auto">
            <Table>
              <THead>
                <tr>
                  <TH>Code</TH>
                  <TH>Name</TH>
                </tr>
              </THead>
              <TBody>
                {(typesQ.data ?? []).map((t) => (
                  <tr key={t.code}>
                    <TD>{t.code}</TD>
                    <TD>{t.name}</TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          </div>
        </ContentCard>
      ) : null}

      {tab === 'rates' ? (
        <ContentCard title="Rates">
          <FilterBar right={<Button onClick={() => ratesQ.refetch()} variant="secondary">Refresh</Button>}>
            <Select value={rateTypeCode} onChange={(e) => setRateTypeCode(e.target.value)} options={typeOptions} />
            <Input label="From" value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)} />
            <Input label="To" value={toCurrency} onChange={(e) => setToCurrency(e.target.value)} />
          </FilterBar>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input label="Effective date" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            <Input label="Rate" type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
            <div className="flex items-end">
              <Button onClick={() => upsert.mutate()} disabled={upsert.isLoading || !rateTypeCode || !fromCurrency || !toCurrency || !effectiveDate || !rate}>
                Upsert
              </Button>
            </div>
            <div className="text-xs text-slate-600 flex items-end">PUT /fx/rates</div>
          </div>

          <div className="mt-4 overflow-auto">
            <Table>
              <THead>
                <tr>
                  <TH>Type</TH>
                  <TH>From</TH>
                  <TH>To</TH>
                  <TH>Effective</TH>
                  <TH className="text-right">Rate</TH>
                </tr>
              </THead>
              <TBody>
                {(ratesQ.data ?? []).map((r, idx) => (
                  <tr key={r.id ?? idx}>
                    <TD>{r.rateTypeCode ?? r.rate_type_code ?? '—'}</TD>
                    <TD>{r.fromCurrency ?? r.from_currency ?? '—'}</TD>
                    <TD>{r.toCurrency ?? r.to_currency ?? '—'}</TD>
                    <TD>{r.effectiveDate ?? r.effective_date ?? '—'}</TD>
                    <TD className="text-right">{r.rate ?? '—'}</TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          </div>
        </ContentCard>
      ) : null}

      {tab === 'effective' ? (
        <ContentCard title="Effective rate lookup">
          <FilterBar>
            <Select value={rateTypeCode} onChange={(e) => setRateTypeCode(e.target.value)} options={typeOptions} />
            <Input label="From" value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)} />
            <Input label="To" value={toCurrency} onChange={(e) => setToCurrency(e.target.value)} />
            <Input label="As of" type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
          </FilterBar>

          <div className="mt-3">
            {effectiveQ.isLoading ? (
              <div className="text-sm text-slate-700">Loading…</div>
            ) : effectiveQ.isError ? (
              <div className="text-sm text-red-700">{effectiveQ.error?.message ?? 'Failed to load.'}</div>
            ) : !asOfDate || !rateTypeCode ? (
              <div className="text-sm text-slate-700">Select inputs to fetch effective rate.</div>
            ) : (
              <pre className="max-h-80 overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-800">{JSON.stringify(effectiveQ.data, null, 2)}</pre>
            )}
          </div>
        </ContentCard>
      ) : null}
    </div>
  );
}
