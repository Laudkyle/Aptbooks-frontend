import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';

export default function Reorder(){
 const { http }=useApi(); const api=useMemo(()=>makeInventoryApi(http),[http]); const toast=useToast(); const qc=useQueryClient();
 const [form,setForm]=useState({ warehouseId:'', itemId:'', reorderPoint:'', reorderQuantity:'', safetyStock:'', leadTimeDays:'', date:'' });
 const { data: settings } = useQuery({ queryKey:['inventory.reorder.settings'], queryFn:()=>api.listReorderSettings() });
 const { data: suggestions } = useQuery({ queryKey:['inventory.reorder.suggestions'], queryFn:()=>api.listReorderSuggestions() });
 const { data: warehouses }=useQuery({ queryKey:['inventory.warehouses'], queryFn:()=>api.listWarehouses() });
 const { data: items }=useQuery({ queryKey:['inventory.items'], queryFn:()=>api.listItems() });
 const settingsRows = Array.isArray(settings?.items) ? settings.items : Array.isArray(settings) ? settings : settings?.rows ?? [];
 const suggestionRows = Array.isArray(suggestions?.items) ? suggestions.items : Array.isArray(suggestions) ? suggestions : suggestions?.rows ?? [];
 const whRows = Array.isArray(warehouses?.items) ? warehouses.items : Array.isArray(warehouses) ? warehouses : warehouses?.rows ?? [];
 const itemRows = Array.isArray(items?.items) ? items.items : Array.isArray(items) ? items : items?.rows ?? [];
 async function saveSetting(){ try{ await api.upsertReorderSetting({ ...form, reorderPoint:Number(form.reorderPoint||0), reorderQuantity:Number(form.reorderQuantity||0), safetyStock:Number(form.safetyStock||0), leadTimeDays:Number(form.leadTimeDays||0) }); await qc.invalidateQueries({ queryKey:['inventory.reorder.settings']}); toast.success('Reorder setting saved'); } catch(err){ toast.error(err?.response?.data?.message || 'Failed to save setting'); } }
 async function createReq(){ try{ await api.createPurchaseRequisitionFromSuggestions({ date: form.date, lines: suggestionRows.map(s=>({ warehouseId: s.warehouseId || s.warehouse_id, itemId: s.itemId || s.item_id, recommendedQty: s.recommendedQty || s.recommended_qty })) }); toast.success('Purchase requisition created from suggestions'); } catch(err){ toast.error(err?.response?.data?.message || 'Failed to create purchase requisition'); } }
 return <><PageHeader title='Reorder & Procurement Automation' subtitle='Maintain reorder levels and generate purchase requisitions from low-stock suggestions.' actions={<div className='flex gap-2'><Input type='date' value={form.date} onChange={(e)=>setForm(s=>({...s, date:e.target.value}))} /><Button onClick={createReq}>Create PR from suggestions</Button></div>} />
 <div className='grid grid-cols-1 gap-4 xl:grid-cols-3'><ContentCard className='xl:col-span-1'><div className='space-y-3'><Select label='Warehouse' value={form.warehouseId} onChange={(e)=>setForm(s=>({...s, warehouseId:e.target.value}))} options={[{value:'',label:'Select warehouse'}, ...whRows.map(w=>({value:w.id,label:`${w.code} - ${w.name}`}))]} /><Select label='Item' value={form.itemId} onChange={(e)=>setForm(s=>({...s, itemId:e.target.value}))} options={[{value:'',label:'Select item'}, ...itemRows.map(i=>({value:i.id,label:`${i.sku || i.code || i.id} - ${i.name}`}))]} /><Input label='Reorder point' type='number' value={form.reorderPoint} onChange={(e)=>setForm(s=>({...s, reorderPoint:e.target.value}))} /><Input label='Reorder quantity' type='number' value={form.reorderQuantity} onChange={(e)=>setForm(s=>({...s, reorderQuantity:e.target.value}))} /><Input label='Safety stock' type='number' value={form.safetyStock} onChange={(e)=>setForm(s=>({...s, safetyStock:e.target.value}))} /><Input label='Lead time (days)' type='number' value={form.leadTimeDays} onChange={(e)=>setForm(s=>({...s, leadTimeDays:e.target.value}))} /><Button onClick={saveSetting}>Save setting</Button></div></ContentCard>
 <ContentCard className='xl:col-span-2'><div className='mb-2 text-sm font-semibold'>Reorder suggestions</div><Table rows={suggestionRows} columns={[{header:'Warehouse',accessorKey:'warehouseName'},{header:'Item',accessorKey:'itemName'},{header:'On hand',accessorKey:'qtyOnHand'},{header:'Available',accessorKey:'qtyAvailable'},{header:'Recommended',accessorKey:'recommendedQty'}]} /><div className='mt-6 mb-2 text-sm font-semibold'>Saved settings</div><Table rows={settingsRows} columns={[{header:'Warehouse',accessorKey:'warehouseName'},{header:'Item',accessorKey:'itemName'},{header:'Reorder point',accessorKey:'reorderPoint'},{header:'Qty',accessorKey:'reorderQuantity'},{header:'Safety stock',accessorKey:'safetyStock'}]} /></ContentCard></div></>;
}
