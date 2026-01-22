import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

export default function AssetCategoryEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const assetsApi = useMemo(() => makeAssetsApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);

  const { data: category } = useQuery({
    queryKey: ['assets.category', id],
    queryFn: async () => assetsApi.getCategory(id),
    enabled: !!id
  });

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

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!category) return;
    setForm({
      code: category.code ?? '',
      name: category.name ?? '',
      assetAccountId: category.assetAccountId ?? '',
      accumDeprAccountId: category.accumDeprAccountId ?? '',
      deprExpenseAccountId: category.deprExpenseAccountId ?? '',
      disposalGainAccountId: category.disposalGainAccountId ?? '',
      disposalLossAccountId: category.disposalLossAccountId ?? '',
      status: category.status ?? 'active'
    });
  }, [category]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      await assetsApi.updateCategory(id, form);
      await qc.invalidateQueries({ queryKey: ['assets.categories'] });
      await qc.invalidateQueries({ queryKey: ['assets.category', id] });
      nav(-1);
    } finally {
      setSaving(false);
    }
  }

  if (!form) return null;

  return (
    <>
      <PageHeader
        title="Edit Asset Category"
        subtitle={category?.name ? `Update: ${category.name}` : 'Update category'}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => nav(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={onSubmit} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Save
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
          />
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          />

          <Select
            label="Asset account"
            value={form.assetAccountId}
            onChange={(e) => setForm((s) => ({ ...s, assetAccountId: e.target.value }))}
            options={accountOptions}
          />
          <Select
            label="Accumulated depreciation account"
            value={form.accumDeprAccountId}
            onChange={(e) => setForm((s) => ({ ...s, accumDeprAccountId: e.target.value }))}
            options={accountOptions}
          />
          <Select
            label="Depreciation expense account"
            value={form.deprExpenseAccountId}
            onChange={(e) => setForm((s) => ({ ...s, deprExpenseAccountId: e.target.value }))}
            options={accountOptions}
          />
          <Select
            label="Disposal gain account"
            value={form.disposalGainAccountId}
            onChange={(e) => setForm((s) => ({ ...s, disposalGainAccountId: e.target.value }))}
            options={accountOptions}
          />
          <Select
            label="Disposal loss account"
            value={form.disposalLossAccountId}
            onChange={(e) => setForm((s) => ({ ...s, disposalLossAccountId: e.target.value }))}
            options={accountOptions}
          />

          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
          />

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => nav(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </ContentCard>
    </>
  );
}
