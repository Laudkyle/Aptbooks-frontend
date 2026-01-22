import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAssetsApi } from '../api/assets.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { toOptions, NONE_OPTION } from '../../../shared/utils/options.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
export default function AssetCategoryCreate() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const assetsApi = useMemo(() => makeAssetsApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);

    const [form, setForm] = useState({
    code: '',
    name: '',
    assetAccountId: '',
    accumDeprAccountId: '',
    deprExpenseAccountId: '',
    disposalGainAccountId: '',
    disposalLossAccountId: ''
  });
  const [saving, setSaving] = useState(false);

  const { data: accountsRaw } = useQuery({
    queryKey: ['coa.accounts.list'],
    queryFn: async () => coaApi.list({ limit: 500 }),
    staleTime: 60_000
  });

  const accountOptions = useMemo(() => {
    const opts = toOptions(accountsRaw, {
      valueKey: 'id',
      label: (a) => `${a.code ?? ''} ${a.name ?? ''}`.trim() || a.id
    });
    return [NONE_OPTION, ...opts];
  }, [accountsRaw]);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await assetsApi.createCategory(form);
      await qc.invalidateQueries({ queryKey: ['assets.categories'] });
      nav(-1);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="New Asset Category"
        subtitle="Create a category and map the required GL accounts."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => nav(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={onSubmit} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Create
            </Button>
          </div>
        }
      />

      <ContentCard>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Input
            label="Code"
            value={form.code}
            onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
            required
          />
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            required
          />

          <Select
            label="Asset account"
            value={form.assetAccountId}
            onChange={(e) => setForm((s) => ({ ...s, assetAccountId: e.target.value }))}
            options={accountOptions}
            required
          />
          <Select
            label="Accumulated depreciation account"
            value={form.accumDeprAccountId}
            onChange={(e) => setForm((s) => ({ ...s, accumDeprAccountId: e.target.value }))}
            options={accountOptions}
            required
          />
          <Select
            label="Depreciation expense account"
            value={form.deprExpenseAccountId}
            onChange={(e) => setForm((s) => ({ ...s, deprExpenseAccountId: e.target.value }))}
            options={accountOptions}
            required
          />
          <Select
            label="Disposal gain account"
            value={form.disposalGainAccountId}
            onChange={(e) => setForm((s) => ({ ...s, disposalGainAccountId: e.target.value }))}
            options={accountOptions}
            required
          />
          <Select
            label="Disposal loss account"
            value={form.disposalLossAccountId}
            onChange={(e) => setForm((s) => ({ ...s, disposalLossAccountId: e.target.value }))}
            options={accountOptions}
            required
          />

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => nav(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              Create category
            </Button>
          </div>
        </form>
      </ContentCard>
    </>
  );
}
