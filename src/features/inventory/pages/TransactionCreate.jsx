import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js';
import { toOptions, NONE_OPTION } from '../../../shared/utils/options.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';

export default function TransactionCreate() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const invApi = useMemo(() => makeInventoryApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  const { data: periodsRaw } = useQuery({
    queryKey: ['accounting.periods.list'],
    queryFn: async () => periodsApi.list(),
    staleTime: 60_000
  });
  const { data: warehousesRaw } = useQuery({
    queryKey: ['inventory.warehouses'],
    queryFn: async () => invApi.listWarehouses(),
    staleTime: 60_000
  });
  const { data: itemsRaw } = useQuery({
    queryKey: ['inventory.items'],
    queryFn: async () => invApi.listItems(),
    staleTime: 60_000
  });

  const periodOptions = useMemo(() => [NONE_OPTION, ...toOptions(periodsRaw, { valueKey: 'id', label: (p) => p.name ?? p.id })], [periodsRaw]);
  const warehouseOptions = useMemo(() => [NONE_OPTION, ...toOptions(warehousesRaw, { valueKey: 'id', label: (w) => `${w.code ?? ''} ${w.name ?? ''}`.trim() || w.id })], [warehousesRaw]);
  const itemOptions = useMemo(() => [NONE_OPTION, ...toOptions(itemsRaw, { valueKey: 'id', label: (i) => `${i.sku ?? ''} ${i.name ?? ''}`.trim() || i.id })], [itemsRaw]);

  const [form, setForm] = useState({
    periodId: '',
    txnDate: '',
    txnType: 'receipt',
    sourceWarehouseId: '',
    destWarehouseId: '',
    reference: '',
    memo: '',
    lines: [{ itemId: '', quantity: '', unitCost: '', direction: 'increase' }]
  });

  const [saving, setSaving] = useState(false);

  function requiredSource() {
    return ['issue', 'transfer', 'adjustment'].includes(form.txnType);
  }
  function requiredDest() {
    return ['receipt', 'transfer'].includes(form.txnType);
  }
  function requiresUnitCost() {
    return form.txnType === 'receipt';
  }
  function requiresDirection() {
    return form.txnType === 'adjustment';
  }

  function addLine() {
    setForm((s) => ({ ...s, lines: [...s.lines, { itemId: '', quantity: '', unitCost: '', direction: 'increase' }] }));
  }
  function removeLine(idx) {
    setForm((s) => ({ ...s, lines: s.lines.filter((_, i) => i !== idx) }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        periodId: form.periodId,
        txnDate: form.txnDate,
        txnType: form.txnType,
        sourceWarehouseId: requiredSource() ? (form.sourceWarehouseId || null) : (form.sourceWarehouseId || null),
        destWarehouseId: requiredDest() ? (form.destWarehouseId || null) : (form.destWarehouseId || null),
        reference: form.reference ? form.reference : null,
        memo: form.memo ? form.memo : null,
        lines: form.lines.map((l) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
          unitCost: requiresUnitCost() ? Number(l.unitCost) : (l.unitCost ? Number(l.unitCost) : undefined),
          direction: requiresDirection() ? l.direction : undefined
        }))
      };

      await invApi.createTransaction(payload);
      await qc.invalidateQueries({ queryKey: ['inventory.transactions'] });
      nav(-1);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="New Inventory Transaction"
        subtitle="Create a draft inventory transaction."
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
        <form className="grid grid-cols-1 gap-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Select label="Period" value={form.periodId} onChange={(e) => setForm((s) => ({ ...s, periodId: e.target.value }))} options={periodOptions} required />
            <Input label="Transaction date" type="date" value={form.txnDate} onChange={(e) => setForm((s) => ({ ...s, txnDate: e.target.value }))} required />
            <Select
              label="Type"
              value={form.txnType}
              onChange={(e) => setForm((s) => ({ ...s, txnType: e.target.value }))}
              options={[
                { value: 'receipt', label: 'Receipt' },
                { value: 'issue', label: 'Issue' },
                { value: 'transfer', label: 'Transfer' },
                { value: 'adjustment', label: 'Adjustment' }
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Source warehouse"
              value={form.sourceWarehouseId}
              onChange={(e) => setForm((s) => ({ ...s, sourceWarehouseId: e.target.value }))}
              options={warehouseOptions}
              required={requiredSource()}
            />
            <Select
              label="Destination warehouse"
              value={form.destWarehouseId}
              onChange={(e) => setForm((s) => ({ ...s, destWarehouseId: e.target.value }))}
              options={warehouseOptions}
              required={requiredDest()}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Reference (optional)" value={form.reference} onChange={(e) => setForm((s) => ({ ...s, reference: e.target.value }))} />
            <Textarea label="Memo (optional)" value={form.memo} onChange={(e) => setForm((s) => ({ ...s, memo: e.target.value }))} />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Lines</div>
            <Button type="button" variant="secondary" onClick={addLine}>
              <Plus className="mr-2 h-4 w-4" />
              Add line
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {form.lines.map((line, idx) => (
              <div key={idx} className="rounded-lg border p-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <Select
                    label="Item"
                    value={line.itemId}
                    onChange={(e) => setForm((s) => ({ ...s, lines: s.lines.map((l, i) => (i === idx ? { ...l, itemId: e.target.value } : l)) }))}
                    options={itemOptions}
                    required
                  />
                  <Input
                    label="Quantity"
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) => setForm((s) => ({ ...s, lines: s.lines.map((l, i) => (i === idx ? { ...l, quantity: e.target.value } : l)) }))}
                    required
                  />
                  <Input
                    label={`Unit cost${requiresUnitCost() ? '' : ' (optional)'}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitCost}
                    onChange={(e) => setForm((s) => ({ ...s, lines: s.lines.map((l, i) => (i === idx ? { ...l, unitCost: e.target.value } : l)) }))}
                    required={requiresUnitCost()}
                    disabled={!requiresUnitCost()}
                  />
                  {requiresDirection() ? (
                    <Select
                      label="Direction"
                      value={line.direction}
                      onChange={(e) => setForm((s) => ({ ...s, lines: s.lines.map((l, i) => (i === idx ? { ...l, direction: e.target.value } : l)) }))}
                      options={[
                        { value: 'increase', label: 'Increase' },
                        { value: 'decrease', label: 'Decrease' }
                      ]}
                      required
                    />
                  ) : (
                    <div className="flex items-end justify-end">
                      <Button type="button" variant="ghost" onClick={() => removeLine(idx)} disabled={form.lines.length === 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {requiresDirection() ? (
                  <div className="mt-2 flex justify-end">
                    <Button type="button" variant="ghost" onClick={() => removeLine(idx)} disabled={form.lines.length === 1}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove line
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => nav(-1)}>Cancel</Button>
            <Button type="submit" disabled={saving}>Create transaction</Button>
          </div>
        </form>
      </ContentCard>
    </>
  );
}
