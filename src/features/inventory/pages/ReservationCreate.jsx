import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, RefreshCcw } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';

export default function ReservationCreate(){
 const nav=useNavigate(); const qc=useQueryClient(); const toast=useToast(); const { http }=useApi(); const api=useMemo(()=>makeInventoryApi(http),[http]);
 const [form,setForm]=useState({ warehouseId:'', itemId:'', quantity:'', reference:'', notes:'' });
 const { data: warehouses }=useQuery({ queryKey:['inventory.warehouses'], queryFn:()=>api.listWarehouses() });
 const { data: items }=useQuery({ queryKey:['inventory.items'], queryFn:()=>api.listItems() });
 const { data: availability, refetch } = useQuery({ queryKey:['inventory.availability',form.warehouseId,form.itemId], enabled:!!form.warehouseId && !!form.itemId, queryFn:()=>api.getAvailability({ warehouseId: form.warehouseId, itemId: form.itemId }) });
 const whRows = Array.isArray(warehouses?.items) ? warehouses.items : Array.isArray(warehouses) ? warehouses : warehouses?.rows ?? [];
 const itemRows = Array.isArray(items?.items) ? items.items : Array.isArray(items) ? items : items?.rows ?? [];
 async function onSubmit(e){ e.preventDefault(); try { await api.createReservation({ ...form, quantity:Number(form.quantity||0), notes: form.notes || null, reference: form.reference || null }); await qc.invalidateQueries({ queryKey:['inventory.reservations']}); toast.success('Reservation created'); nav(-1);} catch(err){ toast.error(err?.response?.data?.message || 'Failed to create reservation'); } }
 return <><PageHeader title="New Reservation" subtitle="Reserve inventory against a warehouse and item." actions={<div className="flex gap-2"><Button variant="ghost" onClick={()=>nav(-1)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button><Button variant="secondary" onClick={()=>refetch()} disabled={!form.warehouseId || !form.itemId}><RefreshCcw className="mr-2 h-4 w-4" />Check availability</Button><Button onClick={onSubmit}><Save className="mr-2 h-4 w-4" />Create</Button></div>} />
 <div className="grid grid-cols-1 gap-4 xl:grid-cols-3"><ContentCard className="xl:col-span-2"><form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
 <Select label="Warehouse" value={form.warehouseId} onChange={(e)=>setForm(s=>({...s, warehouseId:e.target.value}))} options={[{value:'',label:'Select warehouse'}, ...whRows.map(w=>({value:w.id,label:`${w.code} - ${w.name}`}))]} required />
 <Select label="Item" value={form.itemId} onChange={(e)=>setForm(s=>({...s, itemId:e.target.value}))} options={[{value:'',label:'Select item'}, ...itemRows.map(i=>({value:i.id,label:`${i.sku || i.code || i.id} - ${i.name}`}))]} required />
 <Input label="Quantity" type="number" min="0" step="0.000001" value={form.quantity} onChange={(e)=>setForm(s=>({...s, quantity:e.target.value}))} required />
 <Input label="Reference" value={form.reference} onChange={(e)=>setForm(s=>({...s, reference:e.target.value}))} />
 <Textarea className="md:col-span-2" label="Notes" value={form.notes} onChange={(e)=>setForm(s=>({...s, notes:e.target.value}))} />
 </form></ContentCard>
 <ContentCard><div className="space-y-2 text-sm"><div className="font-semibold">Availability snapshot</div><div>On hand: {availability?.qtyOnHand ?? '—'}</div><div>Reserved: {availability?.qtyReserved ?? '—'}</div><div>Available: {availability?.qtyAvailable ?? '—'}</div></div></ContentCard></div></>;
}
