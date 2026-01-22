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

export default function Categories() {
  const nav = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeInventoryApi(http), [http]);

  const { data } = useQuery({
    queryKey: ['inventory.categories'],
    queryFn: async () => api.listCategories()
  });

  const rows = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : data?.rows ?? [];

  return (
    <>
      <PageHeader
        title="Item Categories"
        subtitle="Manage inventory item categories."
        actions={
          <Button onClick={() => nav(ROUTES.inventoryCategoriesNew)}>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        }
      />
      <ContentCard>
        <Table columns={[{ header:'Code', accessorKey:'code' },          { header:'Name', accessorKey:'name' }]} rows={rows} />
      </ContentCard>
    </>
  );
}
