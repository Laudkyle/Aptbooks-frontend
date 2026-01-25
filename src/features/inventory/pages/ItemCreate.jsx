import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';
import { toOptions, NONE_OPTION } from '../../../shared/utils/options.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';

export default function ItemCreate() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const invApi = useMemo(() => makeInventoryApi(http), [http]);

  const { data: categoriesRaw } = useQuery({
    queryKey: ['inventory.categories'],
    queryFn: async () => invApi.listCategories(),
    staleTime: 60_000
  });
  const { data: unitsRaw } = useQuery({
    queryKey: ['inventory.units'],
    queryFn: async () => invApi.listUnits(),
    staleTime: 60_000
  });

  const categoryOptions = useMemo(() => [NONE_OPTION, ...toOptions(categoriesRaw, { valueKey: 'id', label: (c) => `${c.code ?? ''} ${c.name ?? ''}`.trim() || c.id })], [categoriesRaw]);
  const unitOptions = useMemo(() => [NONE_OPTION, ...toOptions(unitsRaw, { valueKey: 'id', label: (u) => `${u.code ?? ''} ${u.name ?? ''}`.trim() || u.id })], [unitsRaw]);

  const [form, setForm] = useState({
    categoryId: '',
    unitId: '',
    sku: '',
    name: '',
    description: '',
    status: ''
  });
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        categoryId: form.categoryId,
        unitId: form.unitId,
        sku: form.sku,
        name: form.name,
        description: form.description ? form.description : null,
        status: form.status ? form.status : null
      };
      await invApi.createItem(payload);
      await qc.invalidateQueries({ queryKey: ['inventory.items'] });
      nav(-1);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="New Item"
        subtitle="Create an inventory item."
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
          <Select label="Category" value={form.categoryId} onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))} options={categoryOptions} required />
          <Select label="Unit" value={form.unitId} onChange={(e) => setForm((s) => ({ ...s, unitId: e.target.value }))} options={unitOptions} required />

          <Input label="SKU" value={form.sku} onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))} required />
          <Input label="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />

          <Textarea className="md:col-span-2" label="Description (optional)" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
          <Input label="Status (optional)" value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))} />

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => nav(-1)}>Cancel</Button>
            <Button type="submit" disabled={saving}>Create item</Button>
          </div>
        </form>
      </ContentCard>
    </>
  );
}
