import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Send, RotateCcw, Ban, Save } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';

export default function TransactionDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const api = useMemo(() => makeInventoryApi(http), [http]);

  const { data: txn } = useQuery({
    queryKey: ['inventory.transaction', id],
    queryFn: async () => api.getTransaction(id),
    enabled: !!id
  });

  const [mode, setMode] = useState('view');// view | void
  const [voidReason, setVoidReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ['inventory.transaction', id] });
    await qc.invalidateQueries({ queryKey: ['inventory.transactions'] });
  }

  async function approve() {
    setSaving(true);
    try {
      await api.approveTransaction(id);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function post() {
    setSaving(true);
    try {
      await api.postTransaction(id);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function reverse() {
    setSaving(true);
    try {
      await api.reverseTransaction(id);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onVoidSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.voidTransaction(id, { reason: voidReason || null });
      await refresh();
      setMode('view');
    } finally {
      setSaving(false);
    }
  }

  if (!txn) return null;

  if (mode === 'void') {
    return (
      <>
        <PageHeader
          title="Void Transaction"
          subtitle="Provide an optional reason, then submit."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setMode('view')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={onVoidSubmit} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                Void
              </Button>
            </div>
          }
        />
        <ContentCard>
          <form className="grid grid-cols-1 gap-4" onSubmit={onVoidSubmit}>
            <Textarea label="Reason (optional)" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setMode('view')}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                Void transaction
              </Button>
            </div>
          </form>
        </ContentCard>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Transaction ${txn.reference ?? ''}`.trim() || 'Inventory Transaction'}
        subtitle={`Type: ${txn.txnType ?? '—'} • Date: ${txn.txnDate ?? '—'}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => nav(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button variant="secondary" onClick={approve} disabled={saving}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button onClick={post} disabled={saving}>
              <Send className="mr-2 h-4 w-4" />
              Post
            </Button>
            <Button variant="secondary" onClick={reverse} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reverse
            </Button>
            <Button variant="danger" onClick={() => setMode('void')} disabled={saving}>
              <Ban className="mr-2 h-4 w-4" />
              Void
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ContentCard className="xl:col-span-1">
          <div className="grid gap-2">
            <div className="text-sm text-muted-foreground">Status</div>
            <Badge>{txn.status ?? 'draft'}</Badge>
            <div className="text-sm text-muted-foreground mt-3">Memo</div>
            <div className="text-sm">{txn.memo ?? '—'}</div>
          </div>
        </ContentCard>

        <ContentCard className="xl:col-span-2">
          <div className="text-sm font-semibold mb-2">Lines</div>
          <Table
            columns={[
              { header: 'Item', accessorKey: 'itemName' },
              { header: 'Qty', accessorKey: 'quantity' },
              { header: 'Unit cost', accessorKey: 'unitCost' },
              { header: 'Direction', accessorKey: 'direction' }
            ]}
            data={txn.lines ?? []}
          />
        </ContentCard>
      </div>
    </>
  );
}
