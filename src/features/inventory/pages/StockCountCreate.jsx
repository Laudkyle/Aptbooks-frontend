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

export default function StockCountCreate() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const invApi = useMemo(() => makeInventoryApi(http), [http]);

  const { data: warehousesRaw } = useQuery({
    queryKey: ['inventory.warehouses'],
    queryFn: async () => invApi.listWarehouses(),
    staleTime: 60_000
  });

  const warehouseOptions = useMemo(
    () => [NONE_OPTION, ...toOptions(warehousesRaw, { valueKey: 'id', label: (w) => `${w.code ?? ''} ${w.name ?? ''}`.trim() || w.id })],
    [warehousesRaw]
  );

  const [form, setForm] = useState({
    warehouseId: '',
    countDate: '',
    reference: '',
    memo: ''
  });
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await invApi.createStockCount({
        warehouseId: form.warehouseId,
        countDate: form.countDate,
        reference: form.reference ? form.reference : null,
        memo: form.memo ? form.memo : null
      });
      await qc.invalidateQueries({ queryKey: ['inventory.stockCounts'] });
      nav(-1);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="New Stock Count"
        subtitle="Create a stock count sheet for a warehouse."
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
          <Select label="Warehouse" value={form.warehouseId} onChange={(e) => setForm((s) => ({ ...s, warehouseId: e.target.value }))} options={warehouseOptions} required />
          <Input label="Count date" type="date" value={form.countDate} onChange={(e) => setForm((s) => ({ ...s, countDate: e.target.value }))} required />

          <Input label="Reference (optional)" value={form.reference} onChange={(e) => setForm((s) => ({ ...s, reference: e.target.value }))} />
          <Textarea label="Memo (optional)" value={form.memo} onChange={(e) => setForm((s) => ({ ...s, memo: e.target.value }))} />

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => nav(-1)}>Cancel</Button>
            <Button type="submit" disabled={saving}>Create stock count</Button>
          </div>
        </form>
      </ContentCard>
    </>
  );
}
