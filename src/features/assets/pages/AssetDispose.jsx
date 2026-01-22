import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAssetsApi } from '../api/assets.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js';
import { toOptions, NONE_OPTION } from '../../../shared/utils/options.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';

export default function AssetDispose() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const assetsApi = useMemo(() => makeAssetsApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  const { data: accountsRaw } = useQuery({
    queryKey: ['coa.accounts.list'],
    queryFn: async () => coaApi.list({ limit: 500 }),
    staleTime: 60_000
  });

  const { data: periodsRaw } = useQuery({
    queryKey: ['accounting.periods.list'],
    queryFn: async () => periodsApi.list(),
    staleTime: 60_000
  });

  const accountOptions = useMemo(() => [NONE_OPTION, ...toOptions(accountsRaw, {
    valueKey: 'id',
    label: (a) => `${a.code ?? ''} ${a.name ?? ''}`.trim() || a.id
  })], [accountsRaw]);

  const periodOptions = useMemo(() => [NONE_OPTION, ...toOptions(periodsRaw, {
    valueKey: 'id',
    label: (p) => p.name ?? `${p.startDate ?? ''} → ${p.endDate ?? ''}`.trim() || p.id
  })], [periodsRaw]);

  const [form, setForm] = useState({"periodId": "", "entryDate": "", "proceeds": 0, "proceedsAccountId": "", "memo": ""});
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { periodId: form.periodId, entryDate: form.entryDate, proceeds: Number(form.proceeds||0), proceedsAccountId: form.proceedsAccountId, memo: form.memo || undefined };
      await assetsApi.disposeFixedAsset(id, payload);
      await qc.invalidateQueries({ queryKey: ['assets.fixedAsset', id] });
      await qc.invalidateQueries({ queryKey: ['assets.fixedAssets'] });
      nav(-1);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Dispose Fixed Asset"
        subtitle="Dispose the asset and recognise gain/loss."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => nav(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={onSubmit} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Submit
            </Button>
          </div>
        }
      />

      <ContentCard>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Select label="Period" value={form.periodId} onChange={(e)=>setForm(s=>({...s, periodId:e.target.value}))} options={periodOptions} required />
<Input label="Entry date" type="date" value={form.entryDate} onChange={(e)=>setForm(s=>({...s, entryDate:e.target.value}))} required />
<Input label="Proceeds" type="number" min="0" step="0.01" value={form.proceeds} onChange={(e)=>setForm(s=>({...s, proceeds:e.target.value}))} />
<Select label="Proceeds account" value={form.proceedsAccountId} onChange={(e)=>setForm(s=>({...s, proceedsAccountId:e.target.value}))} options={accountOptions} required />
<Textarea className="md:col-span-2" label="Memo (optional)" value={form.memo} onChange={(e)=>setForm(s=>({...s, memo:e.target.value}))} />
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => nav(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              Submit
            </Button>
          </div>
        </form>
      </ContentCard>
    </>
  );
}
