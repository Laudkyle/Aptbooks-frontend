import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';

export default function Traceability(){
 const { http }=useApi(); const api=useMemo(()=>makeInventoryApi(http),[http]); const toast=useToast(); const qc=useQueryClient();
 const [batchForm,setBatchForm]=useState({ transactionId:'', lineId:'', rows:'[]' });
 const [serialForm,setSerialForm]=useState({ transactionId:'', lineId:'', values:'' });
 const { data: batches } = useQuery({ queryKey:['inventory.batches'], queryFn:()=>api.listBatches() });
 const { data: serials } = useQuery({ queryKey:['inventory.serials'], queryFn:()=>api.listSerials() });
 const batchRows = Array.isArray(batches?.items) ? batches.items : Array.isArray(batches) ? batches : batches?.rows ?? [];
 const serialRows = Array.isArray(serials?.items) ? serials.items : Array.isArray(serials) ? serials : serials?.rows ?? [];
 async function receiveBatches(){ try{ await api.receiveBatches({ transactionId: batchForm.transactionId, lineId: batchForm.lineId, batches: JSON.parse(batchForm.rows || '[]') }); await qc.invalidateQueries({ queryKey:['inventory.batches']}); toast.success('Batches received'); } catch(err){ toast.error(err?.response?.data?.message || 'Failed to receive batches'); } }
 async function receiveSerials(){ try{ const values = serialForm.values.split('\n').map(x=>x.trim()).filter(Boolean); await api.receiveSerials({ transactionId: serialForm.transactionId, lineId: serialForm.lineId, serialNumbers: values }); await qc.invalidateQueries({ queryKey:['inventory.serials']}); toast.success('Serials received'); } catch(err){ toast.error(err?.response?.data?.message || 'Failed to receive serials'); } }
 return <><PageHeader title='Batch & Serial Traceability' subtitle='Review traceability records and register batch or serial receipts against posted inventory lines.' />
 <Tabs tabs={[{ value:'batches', label:'Batches', content:<div className='grid grid-cols-1 gap-4 xl:grid-cols-3'><ContentCard className='xl:col-span-2'><Table rows={batchRows} columns={[{header:'Warehouse',accessorKey:'warehouseName'},{header:'Item',accessorKey:'itemName'},{header:'Batch No',accessorKey:'batchNo'},{header:'Qty',accessorKey:'qtyOnHand'},{header:'Expiry',accessorKey:'expiryDate'}]} /></ContentCard><ContentCard><div className='space-y-3'><Input label='Transaction ID' value={batchForm.transactionId} onChange={(e)=>setBatchForm(s=>({...s, transactionId:e.target.value}))} /><Input label='Line ID' value={batchForm.lineId} onChange={(e)=>setBatchForm(s=>({...s, lineId:e.target.value}))} /><Textarea label='Batches JSON' value={batchForm.rows} onChange={(e)=>setBatchForm(s=>({...s, rows:e.target.value}))} /><Button onClick={receiveBatches}>Receive batches</Button></div></ContentCard></div>},{ value:'serials', label:'Serials', content:<div className='grid grid-cols-1 gap-4 xl:grid-cols-3'><ContentCard className='xl:col-span-2'><Table rows={serialRows} columns={[{header:'Warehouse',accessorKey:'warehouseName'},{header:'Item',accessorKey:'itemName'},{header:'Serial No',accessorKey:'serialNo'},{header:'Status',accessorKey:'status'}]} /></ContentCard><ContentCard><div className='space-y-3'><Input label='Transaction ID' value={serialForm.transactionId} onChange={(e)=>setSerialForm(s=>({...s, transactionId:e.target.value}))} /><Input label='Line ID' value={serialForm.lineId} onChange={(e)=>setSerialForm(s=>({...s, lineId:e.target.value}))} /><Textarea label='Serial numbers (one per line)' value={serialForm.values} onChange={(e)=>setSerialForm(s=>({...s, values:e.target.value}))} /><Button onClick={receiveSerials}>Receive serials</Button></div></ContentCard></div>}]} />
 </>;
}
