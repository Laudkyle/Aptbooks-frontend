import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAssetsApi } from '../api/assets.api.js';
import { toOptions, NONE_OPTION } from '../../../shared/utils/options.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';

export default function FixedAssetCreate() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const assetsApi = useMemo(() => makeAssetsApi(http), [http]);

  const { data: categoriesRaw } = useQuery({
    queryKey: ['assets.categories'],
    queryFn: async () => assetsApi.listCategories(),
    staleTime: 60_000
  });

  const { data: dimensionsRaw } = useQuery({
    queryKey: ['assets.dimensionOptions'],
    queryFn: () => assetsApi.listDimensionOptions(),
    staleTime: 60_000
  });
  const dimensions = dimensionsRaw?.data ?? dimensionsRaw ?? {};
  const dimensionOptions = (key) => [NONE_OPTION, ...toOptions(dimensions[key] ?? [], {
    valueKey: 'id',
    label: (row) => `${row.code ?? ''} ${row.name ?? ''}`.trim() || 'Unnamed'
  })];

  const categoryOptions = useMemo(() => {
    const opts = toOptions(categoriesRaw, { valueKey: 'id', label: (c) => `${c.code ?? ''} ${c.name ?? ''}`.trim() || 'Unnamed category' });
    return [NONE_OPTION, ...opts];
  }, [categoriesRaw]);

  const [form, setForm] = useState({
    categoryId: '',
    code: '',
    name: '',
    acquisitionDate: '',
    cost: '',
    salvageValue: 0,
    locationId: '',
    departmentId: '',
    costCenterId: ''
  });

  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        categoryId: form.categoryId,
        code: form.code,
        name: form.name,
        acquisitionDate: form.acquisitionDate,
        cost: String(form.cost || '0').trim(),
        salvageValue: String(form.salvageValue || '0').trim(),
        locationId: form.locationId ? form.locationId : null,
        departmentId: form.departmentId ? form.departmentId : null,
        costCenterId: form.costCenterId ? form.costCenterId : null
      };
      await assetsApi.createFixedAsset(payload);
      await qc.invalidateQueries({ queryKey: ['assets.fixedAssets'] });
      nav(-1);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Register Fixed Asset"
        subtitle="Create a draft fixed asset record."
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
          <Select
            label="Category"
            value={form.categoryId}
            onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}
            options={categoryOptions}
            required
          />

          <Input label="Asset code" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} required />
          <Input label="Asset name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />

          <Input
            label="Acquisition date"
            type="date"
            value={form.acquisitionDate}
            onChange={(e) => setForm((s) => ({ ...s, acquisitionDate: e.target.value }))}
            required
          />

          <Input
            label="Cost"
            type="number"
            min="0"
            step="0.01"
            value={form.cost}
            onChange={(e) => setForm((s) => ({ ...s, cost: e.target.value }))}
            required
          />

          <Input
            label="Salvage value"
            type="number"
            min="0"
            step="0.01"
            value={form.salvageValue}
            onChange={(e) => setForm((s) => ({ ...s, salvageValue: e.target.value }))}
          />

          <Select
            label="Location"
            value={form.locationId}
            onChange={(e) => setForm((s) => ({ ...s, locationId: e.target.value }))}
            options={dimensionOptions('locations')}
          />
          <Select
            label="Department"
            value={form.departmentId}
            onChange={(e) => setForm((s) => ({ ...s, departmentId: e.target.value }))}
            options={dimensionOptions('departments')}
          />
          <Select
            label="Cost center"
            value={form.costCenterId}
            onChange={(e) => setForm((s) => ({ ...s, costCenterId: e.target.value }))}
            options={dimensionOptions('costCenters')}
          />

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => nav(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              Create asset
            </Button>
          </div>
        </form>
      </ContentCard>
    </>
  );
}
