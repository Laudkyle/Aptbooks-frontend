import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';

export default function Reservations(){
 const nav=useNavigate(); const { http }=useApi(); const api=useMemo(()=>makeInventoryApi(http),[http]);
 const { data }=useQuery({ queryKey:['inventory.reservations'], queryFn:()=>api.listReservations() });
 const rows = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : data?.rows ?? [];
 return <><PageHeader title="Stock Reservations" subtitle="Reserve stock before issue, picking, or transfer." actions={<Button onClick={()=>nav(ROUTES.inventoryReservationsNew)}><Plus className="mr-2 h-4 w-4" />New Reservation</Button>} />
 <ContentCard><Table rows={rows} columns={[
  { header:'Warehouse', accessorKey:'warehouseName' },
  { header:'Item', accessorKey:'itemName' },
  { header:'Quantity', accessorKey:'quantity' },
  { header:'Status', accessorKey:'status' },
  { header:'Reference', accessorKey:'reference' },
 ]} /></ContentCard></>;
}
