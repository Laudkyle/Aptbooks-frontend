import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { PERMISSIONS } from '../../../app/constants/permissions.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Table } from '../../../shared/components/ui/Table.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { TaxCatalogProfileSelect } from '../../../shared/components/forms/TaxCatalogProfileSelect.jsx';
import { PermissionGate } from '../../../app/routes/route-guards.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

function treatmentTone(scope) {
  if (scope === 'taxable') return 'success';
  if (scope === 'exempt') return 'warning';
  if (scope === 'zero_rated') return 'info';
  if (scope === 'relieved') return 'primary';
  return 'muted';
}

export default function Items() {
  const nav = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeInventoryApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [selectedItem, setSelectedItem] = useState(null);
  const [taxProfileId, setTaxProfileId] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['inventory.items'],
    queryFn: () => api.listItems(),
  });

  const classifyMutation = useMutation({
    mutationFn: () => api.updateItem(selectedItem.id, { taxProfileId: taxProfileId || null }),
    onSuccess: async () => {
      toast.success('Item tax profile updated');
      await qc.invalidateQueries({ queryKey: ['inventory.items'] });
      await qc.invalidateQueries({ queryKey: ['tax', 'catalogProfiles'] });
      await qc.invalidateQueries({ queryKey: ['tax', 'ghana', 'readiness'] });
      setSelectedItem(null);
    },
    onError: (error) => toast.error(error?.message || 'Unable to update item tax profile'),
  });

  function openClassification(item) {
    setSelectedItem(item);
    setTaxProfileId(item.tax_profile_id || '');
  }

  return (
    <>
      <PageHeader
        title="Items"
        subtitle="Manage inventory items and keep Ghana tax classification complete."
        actions={
          <PermissionGate any={[PERMISSIONS.inventoryItemsManage]} fallback={null}>
            <Button onClick={() => nav(ROUTES.inventoryItemsNew)}>
              <Plus className="mr-2 h-4 w-4" />
              New item
            </Button>
          </PermissionGate>
        }
      />
      <ContentCard>
        {isLoading ? (
          <div className="py-10 text-center text-sm text-slate-500">Loading inventory items…</div>
        ) : (
          <Table
            rows={rows}
            columns={[
              { header: 'SKU', render: (row) => <span className="font-semibold text-slate-900">{row.sku}</span> },
              { header: 'Name', render: (row) => row.name },
              { header: 'Tax profile', render: (row) => row.tax_profile_name ? <div><div className="font-medium">{row.tax_profile_name}</div><div className="text-xs text-slate-500">{row.tax_profile_code}</div></div> : <Badge tone="warning">Unclassified</Badge> },
              { header: 'Sales treatment', render: (row) => row.sales_tax_scope ? <Badge tone={treatmentTone(row.sales_tax_scope)}>{String(row.sales_tax_scope).replaceAll('_', ' ')}</Badge> : '—' },
              { header: 'Purchase treatment', render: (row) => row.purchase_tax_scope ? <Badge tone={treatmentTone(row.purchase_tax_scope)}>{String(row.purchase_tax_scope).replaceAll('_', ' ')}</Badge> : '—' },
              { header: 'Status', render: (row) => <Badge tone={row.status === 'active' ? 'success' : 'muted'}>{row.status}</Badge> },
              { header: '', render: (row) => <PermissionGate any={[PERMISSIONS.inventoryItemsManage]} fallback={null}><Button variant="ghost" size="sm" onClick={() => openClassification(row)}><Pencil className="mr-2 h-4 w-4" />Tax profile</Button></PermissionGate> },
            ]}
          />
        )}
      </ContentCard>

      <Modal
        open={Boolean(selectedItem)}
        title={selectedItem ? `Tax profile — ${selectedItem.name}` : 'Tax profile'}
        onClose={() => setSelectedItem(null)}
        footer={<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setSelectedItem(null)}>Cancel</Button><Button onClick={() => classifyMutation.mutate()} disabled={classifyMutation.isPending}>Save classification</Button></div>}
      >
        <TaxCatalogProfileSelect
          label="Ghana tax profile"
          value={taxProfileId}
          onChange={(e) => setTaxProfileId(e.target.value)}
          emptyLabel="Unclassified"
        />
        <p className="mt-3 text-sm leading-6 text-slate-500">
          The selected profile controls the item's sales and purchase tax treatment. AptBooks links the profile automatically.
        </p>
      </Modal>
    </>
  );
}
