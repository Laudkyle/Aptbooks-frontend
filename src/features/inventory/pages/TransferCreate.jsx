import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';

export default function TransferCreate(){
 const nav=useNavigate(); const qc=useQueryClient(); const toast=useToast(); const { http }=useApi(); const api=useMemo(()=>makeInventoryApi(http),[http]); const periodsApi=useMemo(()=>makePeriodsApi(http), [http]);
 const [form,setForm]=useState({ periodId:'', requestDate:'', sourceWarehouseId:'', destWarehouseId:'', reference:'', memo:'', lines:[{ itemId:'', quantity:'', notes:'' }] });
 const { data: periods } = useQuery({ queryKey:['accounting.periods.transfer'], queryFn:()=> periodsApi.list({ status:'open', pageSize:100 }) });
 const { data: warehouses }=useQuery({ queryKey:['inventory.warehouses'], queryFn:()=>api.listWarehouses() });
 const { data: items }=useQuery({ queryKey:['inventory.items'], queryFn:()=>api.listItems() });
 const periodRows = Array.isArray(periods?.items) ? periods.items : Array.isArray(periods) ? periods : periods?.rows ?? [];
 const whRows = Array.isArray(warehouses?.items) ? warehouses.items : Array.isArray(warehouses) ? warehouses : warehouses?.rows ?? [];
 const itemRows = Array.isArray(items?.items) ? items.items : Array.isArray(items) ? items : items?.rows ?? [];
 const updateLine=(idx, patch)=> setForm(s=>({...s, lines:s.lines.map((line,i)=> i===idx ? {...line, ...patch} : line)}));
 const addLine=()=> setForm(s=>({...s, lines:[...s.lines,{ itemId:'', quantity:'', notes:'' }]}));
 const removeLine=(idx)=> setForm(s=>({...s, lines:s.lines.filter((_,i)=>i!==idx)}));
 async function onSubmit(e){ e.preventDefault(); try{ await api.createTransfer({ ...form, memo: form.memo || null, reference: form.reference || null, lines: form.lines.map(l=>({ ...l, quantity:Number(l.quantity||0), notes:l.notes||null })) }); await qc.invalidateQueries({ queryKey:['inventory.transfers']}); toast.success('Transfer request created'); nav(-1);} catch(err){ toast.error(err?.response?.data?.message || 'Failed to create transfer request'); } }
 return <><PageHeader title="New Transfer Request" subtitle="Create an internal stock transfer between warehouses." actions={<div className='flex gap-2'><Button variant='ghost' onClick={()=>nav(-1)}><ArrowLeft className='mr-2 h-4 w-4' />Back</Button><Button onClick={onSubmit}><Save className='mr-2 h-4 w-4' />Create</Button></div>} />
 <div className='grid grid-cols-1 gap-4'><ContentCard><form className='grid grid-cols-1 gap-4 md:grid-cols-2' onSubmit={onSubmit}>
 <Select label='Open Period' value={form.periodId} onChange={(e)=>setForm(s=>({...s, periodId:e.target.value}))} options={[{value:'',label:'Select period'}, ...periodRows.map(p=>({value:p.id,label:`${p.code || p.name || p.period_code || p.id}`}))]} required />
 <Input label='Request Date' type='date' value={form.requestDate} onChange={(e)=>setForm(s=>({...s, requestDate:e.target.value}))} required />
 <Select label='Source Warehouse' value={form.sourceWarehouseId} onChange={(e)=>setForm(s=>({...s, sourceWarehouseId:e.target.value}))} options={[{value:'',label:'Select warehouse'}, ...whRows.map(w=>({value:w.id,label:`${w.code} - ${w.name}`}))]} required />
 <Select label='Destination Warehouse' value={form.destWarehouseId} onChange={(e)=>setForm(s=>({...s, destWarehouseId:e.target.value}))} options={[{value:'',label:'Select warehouse'}, ...whRows.map(w=>({value:w.id,label:`${w.code} - ${w.name}`}))]} required />
 <Input label='Reference' value={form.reference} onChange={(e)=>setForm(s=>({...s, reference:e.target.value}))} />
 <Textarea className='md:col-span-2' label='Memo' value={form.memo} onChange={(e)=>setForm(s=>({...s, memo:e.target.value}))} />
 </form></ContentCard>
 <ContentCard><div className='mb-3 flex items-center justify-between'><div className='font-semibold text-sm'>Lines</div><Button variant='secondary' onClick={addLine}><Plus className='mr-2 h-4 w-4' />Add line</Button></div>
 <Table rows={form.lines.map((l,idx)=>({...l,_idx:idx}))} columns={[
  { header:'Item', accessorKey:'itemId', cell:({row})=><select className='w-full rounded-xl border px-3 py-2 text-sm' value={row.original.itemId} onChange={(e)=>updateLine(row.original._idx,{ itemId:e.target.value })}><option value=''>Select item</option>{itemRows.map(i=><option key={i.id} value={i.id}>{`${i.sku || i.code || i.id} - ${i.name}`}</option>)}</select> },
  { header:'Quantity', accessorKey:'quantity', cell:({row})=><input className='w-32 rounded-xl border px-3 py-2 text-sm' type='number' min='0' step='0.000001' value={row.original.quantity} onChange={(e)=>updateLine(row.original._idx,{ quantity:e.target.value })} /> },
  { header:'Notes', accessorKey:'notes', cell:({row})=><input className='w-full rounded-xl border px-3 py-2 text-sm' value={row.original.notes} onChange={(e)=>updateLine(row.original._idx,{ notes:e.target.value })} /> },
  { header:'', accessorKey:'_idx', cell:({row})=><Button variant='ghost' onClick={()=>removeLine(row.original._idx)} disabled={form.lines.length===1}><Trash2 className='h-4 w-4' /></Button> },
 ]} />
 </ContentCard></div></>;
}
