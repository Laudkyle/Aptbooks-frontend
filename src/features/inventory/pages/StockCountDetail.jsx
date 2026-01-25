import React, { useMemo, useState } from 'react'; 
import { useNavigate, useParams } from 'react-router-dom'; 
import { useQuery, useQueryClient } from '@tanstack/react-query'; 
import { ArrowLeft, Save, CheckCircle2, Send } from 'lucide-react'; 

import { useApi } from '../../../shared/hooks/useApi.js'; 
import { makeInventoryApi } from '../api/inventory.api.js'; 
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js'; 
import { toOptions, NONE_OPTION } from '../../../shared/utils/options.js'; 

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx'; 
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx'; 
import { Button } from '../../../shared/components/ui/Button.jsx'; 
import { Badge } from '../../../shared/components/ui/Badge.jsx'; 
import { Table } from '../../../shared/components/ui/Table.jsx'; 
import { Select } from '../../../shared/components/ui/Select.jsx'; 
import { Input } from '../../../shared/components/ui/Input.jsx'; 
import { Textarea } from '../../../shared/components/ui/Textarea.jsx'; 

export default function StockCountDetail() {
  const { id } = useParams(); 
  const nav = useNavigate(); 
  const qc = useQueryClient(); 
  const { http } = useApi(); 
  const api = useMemo(() => makeInventoryApi(http), [http]); 
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]); 

  const { data: sc } = useQuery({
    queryKey: ['inventory.stockCount', id],
    queryFn: async () => api.getStockCount(id),
    enabled: !!id
  }); 

  const { data: itemsRaw } = useQuery({
    queryKey: ['inventory.items'],
    queryFn: async () => api.listItems(),
    staleTime: 60_000
  }); 

  const { data: periodsRaw } = useQuery({
    queryKey: ['accounting.periods.list'],
    queryFn: async () => periodsApi.list(),
    staleTime: 60_000
  }); 

  const itemOptions = useMemo(() => [NONE_OPTION, ...toOptions(itemsRaw, { valueKey: 'id', label: (i) => `${i.sku ?? ''} ${i.name ?? ''}`.trim() || i.id })], [itemsRaw]); 
  const periodOptions = useMemo(() => [NONE_OPTION, ...toOptions(periodsRaw, { valueKey: 'id', label: (p) => p.name ?? p.id })], [periodsRaw]); 

  const [mode, setMode] = useState('view');  // view | lines | post
  const [saving, setSaving] = useState(false); 

  const [linesForm, setLinesForm] = useState([{ itemId: '', countedQty: '', unitCost: '' }]); 

  const [postForm, setPostForm] = useState({ periodId: '', txnDate: '', reference: '', memo: '' }); 

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ['inventory.stockCount', id] }); 
    await qc.invalidateQueries({ queryKey: ['inventory.stockCounts'] }); 
  }

  async function submit() {
    setSaving(true); 
    try {
      await api.submitStockCount(id); 
      await refresh(); 
    } finally {
      setSaving(false); 
    }
  }

  async function approve() {
    setSaving(true); 
    try {
      await api.approveStockCount(id); 
      await refresh(); 
    } finally {
      setSaving(false); 
    }
  }

  async function saveLines(e) {
    e.preventDefault(); 
    setSaving(true); 
    try {
      const payload = {
        lines: linesForm.map((l) => ({
          itemId: l.itemId,
          countedQty: Number(l.countedQty),
          unitCost: l.unitCost === '' ? null : Number(l.unitCost)
        }))
      }; 
      await api.upsertStockCountLines(id, payload); 
      await refresh(); 
      setMode('view'); 
    } finally {
      setSaving(false); 
    }
  }

  async function postAdjustments(e) {
    e.preventDefault(); 
    setSaving(true); 
    try {
      const payload = {
        periodId: postForm.periodId,
        txnDate: postForm.txnDate,
        reference: postForm.reference ? postForm.reference : null,
        memo: postForm.memo ? postForm.memo : null
      }; 
      await api.postStockCount(id, payload); 
      await refresh(); 
      setMode('view'); 
    } finally {
      setSaving(false); 
    }
  }

  if (!sc) return null; 

  if (mode === 'lines') {
    return (
      <>
        <PageHeader
          title="Record Count Lines"
          subtitle="Add or update counted quantities."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setMode('view')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={saveLines} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          }
        />
        <ContentCard>
          <form className="grid grid-cols-1 gap-3" onSubmit={saveLines}>
            {linesForm.map((l, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-3 md:grid-cols-3 border rounded-lg p-3">
                <Select
                  label="Item"
                  value={l.itemId}
                  onChange={(e) => setLinesForm((s) => s.map((x, i) => (i === idx ? { ...x, itemId: e.target.value } : x)))}
                  options={itemOptions}
                  required
                />
                <Input
                  label="Counted qty"
                  type="number"
                  step="0.01"
                  value={l.countedQty}
                  onChange={(e) => setLinesForm((s) => s.map((x, i) => (i === idx ? { ...x, countedQty: e.target.value } : x)))}
                  required
                />
                <Input
                  label="Unit cost (optional)"
                  type="number"
                  step="0.01"
                  value={l.unitCost}
                  onChange={(e) => setLinesForm((s) => s.map((x, i) => (i === idx ? { ...x, unitCost: e.target.value } : x)))}
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setLinesForm((s) => [...s, { itemId: '', countedQty: '', unitCost: '' }])}>
                Add line
              </Button>
              <Button type="submit" disabled={saving}>Save lines</Button>
            </div>
          </form>
        </ContentCard>
      </>
    ); 
  }

  if (mode === 'post') {
    return (
      <>
        <PageHeader
          title="Post Stock Count Adjustments"
          subtitle="Create adjustment transactions for variances."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setMode('view')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={postAdjustments} disabled={saving}>
                <Send className="mr-2 h-4 w-4" />
                Post
              </Button>
            </div>
          }
        />
        <ContentCard>
          <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={postAdjustments}>
            <Select label="Period" value={postForm.periodId} onChange={(e) => setPostForm((s) => ({ ...s, periodId: e.target.value }))} options={periodOptions} required />
            <Input label="Transaction date" type="date" value={postForm.txnDate} onChange={(e) => setPostForm((s) => ({ ...s, txnDate: e.target.value }))} required />
            <Input label="Reference (optional)" value={postForm.reference} onChange={(e) => setPostForm((s) => ({ ...s, reference: e.target.value }))} />
            <Textarea label="Memo (optional)" value={postForm.memo} onChange={(e) => setPostForm((s) => ({ ...s, memo: e.target.value }))} />

            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setMode('view')}>Cancel</Button>
              <Button type="submit" disabled={saving}>Post adjustments</Button>
            </div>
          </form>
        </ContentCard>
      </>
    ); 
  }

  return (
    <>
      <PageHeader
        title="Stock Count"
        subtitle={`Date: ${sc.countDate ?? '—'}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => nav(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button variant="secondary" onClick={() => setMode('lines')} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Record lines
            </Button>
            <Button variant="secondary" onClick={submit} disabled={saving}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Submit
            </Button>
            <Button variant="secondary" onClick={approve} disabled={saving}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button onClick={() => setMode('post')} disabled={saving}>
              <Send className="mr-2 h-4 w-4" />
              Post
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ContentCard className="xl:col-span-1">
          <div className="grid gap-2">
            <div className="text-sm text-muted-foreground">Status</div>
            <Badge>{sc.status ?? 'draft'}</Badge>
            <div className="text-sm text-muted-foreground mt-3">Reference</div>
            <div className="text-sm">{sc.reference ?? '—'}</div>
            <div className="text-sm text-muted-foreground mt-3">Memo</div>
            <div className="text-sm">{sc.memo ?? '—'}</div>
          </div>
        </ContentCard>

        <ContentCard className="xl:col-span-2">
          <div className="text-sm font-semibold mb-2">Lines</div>
          <Table
            columns={[
              { header: 'Item', accessorKey: 'itemName' },
              { header: 'Counted', accessorKey: 'countedQty' },
              { header: 'Unit cost', accessorKey: 'unitCost' }
            ]}
            data={sc.lines ?? []}
          />
        </ContentCard>
      </div>
    </>
  ); 
}
