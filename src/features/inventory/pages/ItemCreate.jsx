import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { TaxCatalogProfileSelect } from '../../../shared/components/forms/TaxCatalogProfileSelect.jsx';

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

function readableOption(row) {
  if (row.code && row.name) return `${row.code} — ${row.name}`;
  if (row.name) return row.name;
  if (row.code) return row.code;
  return 'Unnamed option';
}

export default function ItemCreate() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const invApi = useMemo(() => makeInventoryApi(http), [http]);

  const { data: categories = [] } = useQuery({
    queryKey: ['inventory.categories'],
    queryFn: () => invApi.listCategories(),
    staleTime: 60_000,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['inventory.units'],
    queryFn: () => invApi.listUnits(),
    staleTime: 60_000,
  });

  const categoryOptions = useMemo(
    () => [{ value: '', label: 'Select category' }, ...categories.map((row) => ({ value: row.id, label: readableOption(row) }))],
    [categories],
  );

  const unitOptions = useMemo(
    () => [{ value: '', label: 'Select unit' }, ...units.map((row) => ({ value: row.id, label: readableOption(row) }))],
    [units],
  );

  const [form, setForm] = useState({
    categoryId: '',
    unitId: '',
    taxProfileId: '',
    sku: '',
    name: '',
    barcode: '',
    isActive: 'true',
    reorderPoint: '0',
    reorderQty: '0',
  });

  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      await invApi.createItem({
        categoryId: form.categoryId,
        unitId: form.unitId,
        taxProfileId: form.taxProfileId || null,
        sku: form.sku.trim(),
        name: form.name.trim(),
        barcode: form.barcode.trim() || null,
        isActive: form.isActive === 'true',
        reorderPoint: form.reorderPoint === '' ? 0 : Number(form.reorderPoint),
        reorderQty: form.reorderQty === '' ? 0 : Number(form.reorderQty),
      });
      await qc.invalidateQueries({ queryKey: ['inventory.items'] });
      await qc.invalidateQueries({ queryKey: ['tax', 'catalogProfiles'] });
      await qc.invalidateQueries({ queryKey: ['tax', 'ghana', 'readiness'] });
      nav(ROUTES.inventoryItems);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="New Item"
        subtitle="Create an inventory item and assign its Ghana tax treatment at source."
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => nav(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="button" onClick={onSubmit} disabled={saving}>
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

          <Select
            label="Unit"
            value={form.unitId}
            onChange={(e) => setForm((s) => ({ ...s, unitId: e.target.value }))}
            options={unitOptions}
            required
          />

          <Input
            label="SKU"
            value={form.sku}
            onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))}
            required
          />

          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            required
          />

          <Input
            label="Barcode"
            value={form.barcode}
            onChange={(e) => setForm((s) => ({ ...s, barcode: e.target.value }))}
          />

          <Select
            label="Status"
            value={form.isActive}
            onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.value }))}
            options={ACTIVE_OPTIONS}
          />

          <div className="md:col-span-2 rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-4">
            <TaxCatalogProfileSelect
              label="Ghana tax profile"
              value={form.taxProfileId}
              onChange={(e) => setForm((s) => ({ ...s, taxProfileId: e.target.value }))}
              emptyLabel="Select the item's Ghana tax profile"
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Choose the tax profile by name; AptBooks links it to the item automatically.
            </p>
          </div>

          <Input
            label="Reorder Point"
            type="number"
            min="0"
            step="0.01"
            value={form.reorderPoint}
            onChange={(e) => setForm((s) => ({ ...s, reorderPoint: e.target.value }))}
          />

          <Input
            label="Reorder Quantity"
            type="number"
            min="0"
            step="0.01"
            value={form.reorderQty}
            onChange={(e) => setForm((s) => ({ ...s, reorderQty: e.target.value }))}
          />

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => nav(-1)}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.categoryId || !form.unitId || !form.sku.trim() || !form.name.trim()}>Create item</Button>
          </div>
        </form>
      </ContentCard>
    </>
  );
}
