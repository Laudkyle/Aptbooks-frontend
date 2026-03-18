import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ArrowRight } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';

export default function Transfers(){
 const nav=useNavigate(); const { http }=useApi(); const api=useMemo(()=>makeInventoryApi(http),[http]);
 const { data }=useQuery({ queryKey:['inventory.transfers'], queryFn:()=>api.listTransfers() });
 const rows = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : data?.rows ?? [];
 return <><PageHeader title="Transfer Requests" subtitle="Approve and post warehouse-to-warehouse transfer requests." actions={<Button onClick={()=>nav(ROUTES.inventoryTransfersNew)}><Plus className="mr-2 h-4 w-4" />New Transfer</Button>} />
 <ContentCard><Table rows={rows} columns={[
  { header:'Date', accessorKey:'requestDate' },
  { header:'Reference', accessorKey:'reference' },
  { header:'From', accessorKey:'sourceWarehouseName' },
  { header:'To', accessorKey:'destWarehouseName' },
  { header:'Status', accessorKey:'status' },
  { header:'', accessorKey:'id', cell: ({row}) => <Button variant='ghost' onClick={()=>nav(ROUTES.inventoryTransferDetail(row.original.id))}>Open <ArrowRight className='ml-2 h-4 w-4' /></Button> },
 ]} /></ContentCard></>;
}
