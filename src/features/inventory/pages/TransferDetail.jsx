import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, CheckCircle2, Ban, XCircle } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';

export default function TransferDetail(){
 const { id }=useParams(); const nav=useNavigate(); const qc=useQueryClient(); const toast=useToast(); const { http }=useApi(); const api=useMemo(()=>makeInventoryApi(http),[http]); const [comment,setComment]=useState('');
 const { data } = useQuery({ queryKey:['inventory.transfer',id], queryFn:()=>api.getTransfer(id), enabled:!!id });
 const header = data?.header || data; const lines = data?.lines || header?.lines || [];
 async function run(fn,msg){ try{ await fn(); await qc.invalidateQueries({ queryKey:['inventory.transfer',id]}); await qc.invalidateQueries({ queryKey:['inventory.transfers']}); toast.success(msg); } catch(err){ toast.error(err?.response?.data?.message || 'Action failed'); } }
 if(!header) return null;
 return <><PageHeader title={header.reference || 'Transfer Request'} subtitle={`Date: ${header.requestDate || header.request_date || '—'}`} actions={<div className='flex gap-2 flex-wrap'><Button variant='ghost' onClick={()=>nav(-1)}><ArrowLeft className='mr-2 h-4 w-4' />Back</Button><Button variant='secondary' onClick={()=>run(()=>api.submitTransfer(id),'Transfer submitted')}><Send className='mr-2 h-4 w-4' />Submit</Button><Button variant='secondary' onClick={()=>run(()=>api.approveTransfer(id),'Transfer approved')}><CheckCircle2 className='mr-2 h-4 w-4' />Approve</Button><Button onClick={()=>run(()=>api.postTransfer(id),'Transfer posted')}><Send className='mr-2 h-4 w-4' />Post</Button><Button variant='danger' onClick={()=>run(()=>api.cancelTransfer(id),'Transfer cancelled')}><Ban className='mr-2 h-4 w-4' />Cancel</Button></div>} />
 <div className='grid grid-cols-1 gap-4 xl:grid-cols-3'><ContentCard className='xl:col-span-1'><div className='space-y-2 text-sm'><div>Status</div><Badge>{header.status || 'draft'}</Badge><div className='pt-2'>Source: {header.sourceWarehouseName || header.source_warehouse_name || '—'}</div><div>Destination: {header.destWarehouseName || header.dest_warehouse_name || '—'}</div><div>Memo: {header.memo || '—'}</div></div><div className='mt-4'><Textarea label='Reject comment' value={comment} onChange={(e)=>setComment(e.target.value)} /><Button className='mt-2' variant='secondary' onClick={()=>run(()=>api.rejectTransfer(id,{ comment }), 'Transfer rejected')}><XCircle className='mr-2 h-4 w-4' />Reject</Button></div></ContentCard>
 <ContentCard className='xl:col-span-2'><div className='mb-2 text-sm font-semibold'>Lines</div><Table rows={lines} columns={[{header:'Item',accessorKey:'itemName'},{header:'Qty',accessorKey:'quantity'},{header:'Notes',accessorKey:'notes'}]} /></ContentCard></div></>;
}
