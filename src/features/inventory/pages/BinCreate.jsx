import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';

export default function BinCreate() {
  const nav = useNavigate(); const qc = useQueryClient(); const toast = useToast();
  const { http } = useApi(); const api = useMemo(() => makeInventoryApi(http), [http]);
  const [form, setForm] = useState({ warehouseId: '', code: '', name: '', status: 'active', notes: '' });
  const { data: warehouses } = useQuery({ queryKey: ['inventory.warehouses'], queryFn: () => api.listWarehouses() });
  const warehouseRows = Array.isArray(warehouses?.items) ? warehouses.items : Array.isArray(warehouses) ? warehouses : warehouses?.rows ?? [];
  async function onSubmit(e){ e.preventDefault(); try { await api.createBin({ ...form, notes: form.notes || null }); await qc.invalidateQueries({ queryKey:['inventory.bins']}); toast.success('Bin created successfully'); nav(-1); } catch(err){ toast.error(err?.response?.data?.message || 'Failed to create bin'); } }
  return <>
    <PageHeader title="New Bin" subtitle="Create a warehouse bin or shelf location." actions={<div className="flex gap-2"><Button variant="ghost" onClick={()=>nav(-1)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button><Button onClick={onSubmit}><Save className="mr-2 h-4 w-4" />Create</Button></div>} />
    <ContentCard>
      <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <Select label="Warehouse" value={form.warehouseId} onChange={(e)=>setForm(s=>({...s, warehouseId:e.target.value}))} options={[{value:'',label:'Select warehouse'}, ...warehouseRows.map(w=>({value:w.id,label:`${w.code} - ${w.name}`}))]} required />
        <Select label="Status" value={form.status} onChange={(e)=>setForm(s=>({...s, status:e.target.value}))} options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'}]} />
        <Input label="Code" value={form.code} onChange={(e)=>setForm(s=>({...s, code:e.target.value}))} required />
        <Input label="Name" value={form.name} onChange={(e)=>setForm(s=>({...s, name:e.target.value}))} required />
        <Textarea className="md:col-span-2" label="Notes" value={form.notes} onChange={(e)=>setForm(s=>({...s, notes:e.target.value}))} />
      </form>
    </ContentCard>
  </>;
}
