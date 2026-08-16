import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';

function transactionLabel(txn) {
  const type = String(txn.txn_type || 'transaction').replaceAll('_', ' ');
  const date = txn.txn_date || 'No date';
  return txn.reference ? `${txn.reference} — ${type} — ${date}` : `${type} — ${date}`;
}

function lineLabel(line) {
  const item = line.sku ? `${line.sku} — ${line.name}` : line.name || 'Inventory item';
  return `${item} — Qty ${line.quantity}`;
}

export default function Traceability() {
  const { http } = useApi();
  const api = useMemo(() => makeInventoryApi(http), [http]);
  const toast = useToast();
  const qc = useQueryClient();
  const [batchForm, setBatchForm] = useState({ transactionId: '', lineId: '', rows: '[]' });
  const [serialForm, setSerialForm] = useState({ transactionId: '', lineId: '', values: '' });

  const batchesQ = useQuery({ queryKey: ['inventory.batches'], queryFn: () => api.listBatches() });
  const serialsQ = useQuery({ queryKey: ['inventory.serials'], queryFn: () => api.listSerials() });
  const transactionsQ = useQuery({
    queryKey: ['inventory.transactions', 'traceability-receipts'],
    queryFn: () => api.listTransactions({ status2: 'posted' }),
    staleTime: 30_000,
  });

  const batchTxnQ = useQuery({
    queryKey: ['inventory.transaction', batchForm.transactionId],
    queryFn: () => api.getTransaction(batchForm.transactionId),
    enabled: Boolean(batchForm.transactionId),
  });
  const serialTxnQ = useQuery({
    queryKey: ['inventory.transaction', serialForm.transactionId],
    queryFn: () => api.getTransaction(serialForm.transactionId),
    enabled: Boolean(serialForm.transactionId),
  });

  const batches = batchesQ.data ?? [];
  const serials = serialsQ.data ?? [];
  const receivableTransactions = (transactionsQ.data ?? []).filter((txn) => ['receipt', 'adjustment'].includes(txn.txn_type));
  const transactionOptions = [
    { value: '', label: 'Select a posted receipt or adjustment' },
    ...receivableTransactions.map((txn) => ({ value: txn.id, label: transactionLabel(txn) })),
  ];
  const batchLineOptions = [
    { value: '', label: batchForm.transactionId ? 'Select an inventory line' : 'Select a transaction first' },
    ...(batchTxnQ.data?.lines ?? []).map((line) => ({ value: line.id, label: lineLabel(line) })),
  ];
  const serialLineOptions = [
    { value: '', label: serialForm.transactionId ? 'Select an inventory line' : 'Select a transaction first' },
    ...(serialTxnQ.data?.lines ?? []).map((line) => ({ value: line.id, label: lineLabel(line) })),
  ];

  async function receiveBatches() {
    if (!batchForm.transactionId || !batchForm.lineId) {
      toast.error('Choose a posted transaction and inventory line first');
      return;
    }
    try {
      await api.receiveBatches({
        transactionId: batchForm.transactionId,
        lineId: batchForm.lineId,
        batches: JSON.parse(batchForm.rows || '[]'),
      });
      await qc.invalidateQueries({ queryKey: ['inventory.batches'] });
      toast.success('Batches received');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to receive batches');
    }
  }

  async function receiveSerials() {
    if (!serialForm.transactionId || !serialForm.lineId) {
      toast.error('Choose a posted transaction and inventory line first');
      return;
    }
    try {
      const serialNumbers = serialForm.values.split('\n').map((value) => value.trim()).filter(Boolean);
      await api.receiveSerials({
        transactionId: serialForm.transactionId,
        lineId: serialForm.lineId,
        serialNumbers,
      });
      await qc.invalidateQueries({ queryKey: ['inventory.serials'] });
      toast.success('Serials received');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to receive serials');
    }
  }

  return (
    <>
      <PageHeader title="Batch & Serial Traceability" subtitle="Review traceability records and register batch or serial receipts against posted inventory lines." />
      <Tabs
        tabs={[
          {
            value: 'batches',
            label: 'Batches',
            content: (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <ContentCard className="xl:col-span-2">
                  <Table rows={batches} columns={[
                    { header: 'Warehouse', accessorKey: 'warehouse_code' },
                    { header: 'Item', render: (row) => row.sku ? `${row.sku} — ${row.item_name}` : row.item_name },
                    { header: 'Batch No', accessorKey: 'batch_no' },
                    { header: 'Qty', accessorKey: 'qty_on_hand' },
                    { header: 'Expiry', accessorKey: 'expiry_date' },
                  ]} />
                </ContentCard>
                <ContentCard>
                  <div className="space-y-3">
                    <Select
                      label="Posted inventory transaction"
                      value={batchForm.transactionId}
                      options={transactionOptions}
                      onChange={(e) => setBatchForm((state) => ({ ...state, transactionId: e.target.value, lineId: '' }))}
                    />
                    <Select
                      label="Inventory line"
                      value={batchForm.lineId}
                      options={batchLineOptions}
                      disabled={!batchForm.transactionId || batchTxnQ.isLoading}
                      onChange={(e) => setBatchForm((state) => ({ ...state, lineId: e.target.value }))}
                    />
                    <Textarea label="Batches JSON" value={batchForm.rows} onChange={(e) => setBatchForm((state) => ({ ...state, rows: e.target.value }))} />
                    <Button onClick={receiveBatches}>Receive batches</Button>
                  </div>
                </ContentCard>
              </div>
            ),
          },
          {
            value: 'serials',
            label: 'Serials',
            content: (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <ContentCard className="xl:col-span-2">
                  <Table rows={serials} columns={[
                    { header: 'Warehouse', accessorKey: 'warehouse_code' },
                    { header: 'Item', render: (row) => row.sku ? `${row.sku} — ${row.item_name}` : row.item_name },
                    { header: 'Serial No', accessorKey: 'serial_no' },
                    { header: 'Status', accessorKey: 'status' },
                  ]} />
                </ContentCard>
                <ContentCard>
                  <div className="space-y-3">
                    <Select
                      label="Posted inventory transaction"
                      value={serialForm.transactionId}
                      options={transactionOptions}
                      onChange={(e) => setSerialForm((state) => ({ ...state, transactionId: e.target.value, lineId: '' }))}
                    />
                    <Select
                      label="Inventory line"
                      value={serialForm.lineId}
                      options={serialLineOptions}
                      disabled={!serialForm.transactionId || serialTxnQ.isLoading}
                      onChange={(e) => setSerialForm((state) => ({ ...state, lineId: e.target.value }))}
                    />
                    <Textarea label="Serial numbers (one per line)" value={serialForm.values} onChange={(e) => setSerialForm((state) => ({ ...state, values: e.target.value }))} />
                    <Button onClick={receiveSerials}>Receive serials</Button>
                  </div>
                </ContentCard>
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
