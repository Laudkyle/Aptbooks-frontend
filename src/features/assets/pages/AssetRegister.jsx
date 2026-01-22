import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ArrowRight } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAssetsApi } from '../api/assets.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';

export default function AssetRegister() {
  const nav = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeAssetsApi(http), [http]);

  const { data } = useQuery({
    queryKey: ['assets.fixedAssets'],
    queryFn: async () => api.listFixedAssets()
  });

  const rows = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : data?.rows ?? [];

  return (
    <>
      <PageHeader
        title="Fixed Asset Register"
        subtitle="Create and manage fixed assets."
        actions={
          <Button onClick={() => nav(ROUTES.assetsRegisterNew)}>
            <Plus className="mr-2 h-4 w-4" />
            Register asset
          </Button>
        }
      />

      <ContentCard>
        <Table
          columns={[
            { header: 'Code', accessorKey: 'code' },
            { header: 'Name', accessorKey: 'name' },
            { header: 'Status', accessorKey: 'status', cell: ({ row }) => <Badge>{row.original.status}</Badge> },
            {
              header: '',
              accessorKey: 'id',
              cell: ({ row }) => (
                <Button variant="ghost" onClick={() => nav(ROUTES.assetsAssetDetail(row.original.id))}>
                  Open <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )
            }
          ]}
          rows={rows}
        />
      </ContentCard>
    </>
  );
}
