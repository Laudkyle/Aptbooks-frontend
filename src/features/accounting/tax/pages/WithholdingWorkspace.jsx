import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Banknote, FileCheck2, Landmark, ReceiptText } from 'lucide-react';

import { useApi } from '../../../../shared/hooks/useApi.js';
import { qk } from '../../../../shared/query/keys.js';
import { makeTaxApi } from '../api/tax.api.js';
import { ROUTES } from '../../../../app/constants/routes.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Tabs } from '../../../../shared/components/ui/Tabs.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';
import { DataTable } from '../../../../shared/components/data/DataTable.jsx';
import { normalizeRows } from '../../../../shared/tax/frontendTax.js';

function money(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
}

function formatLabel(value) {
  return String(value ?? '').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function rowStatusBadge(value) {
  const v = String(value ?? 'draft').toLowerCase();
  const tone = v === 'posted' ? 'success' : v === 'voided' ? 'danger' : v === 'draft' ? 'warning' : 'muted';
  return <Badge tone={tone}>{formatLabel(v)}</Badge>;
}

export default function WithholdingWorkspace() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeTaxApi(http), [http]);

  const [tab, setTab] = useState('openItems');
  const [direction, setDirection] = useState('');
  const [status, setStatus] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [runToken, setRunToken] = useState(1);

  const qs = useMemo(() => ({
    direction: direction || "",
    status: status || "",
    periodStart: periodStart || "",
    periodEnd: periodEnd || "",
  }), [direction, status, periodStart, periodEnd]);

  const dashboardQ = useQuery({
    queryKey: qk.withholdingDashboard(qs),
    queryFn: () => api.getWithholdingDashboard(qs),
    enabled: runToken > 0,
  });

  const openItemsQ = useQuery({
    queryKey: qk.withholdingOpenItems(qs),
    queryFn: () => api.listWithholdingOpenItems(qs),
    enabled: runToken > 0 && tab === 'openItems',
  });

  const remittancesQ = useQuery({
    queryKey: qk.withholdingRemittances(qs),
    queryFn: () => api.listWithholdingRemittances(qs),
    enabled: runToken > 0 && tab === 'remittances',
  });

  const certificatesQ = useQuery({
    queryKey: qk.withholdingCertificates(qs),
    queryFn: () => api.listWithholdingCertificates(qs),
    enabled: runToken > 0 && tab === 'certificates',
  });

  const openItems = normalizeRows(openItemsQ.data);
  const remittances = normalizeRows(remittancesQ.data);
  const certificates = normalizeRows(certificatesQ.data);

  const payableOpen = openItems.filter((row) => String(row.direction || '').toLowerCase() === 'payable');
  const receivableOpen = openItems.filter((row) => String(row.direction || '').toLowerCase() === 'receivable');
  const payableOutstanding = payableOpen.reduce((sum, row) => sum + Number(row.outstanding_amount ?? row.available_amount ?? 0), 0);
  const receivableOutstanding = receivableOpen.reduce((sum, row) => sum + Number(row.outstanding_amount ?? row.available_amount ?? 0), 0);

  const openItemColumns = [
    { header: 'Direction', accessorKey: 'direction', render: (row) => rowStatusBadge(row.direction || '—') },
    { header: 'Source', accessorKey: 'source_type', render: (row) => formatLabel(row.source_type || 'document') },
    { header: 'Document', accessorKey: 'document_no', render: (row) => row.document_no || row.source_document_no || '—' },
    { header: 'Partner', accessorKey: 'partner_name', render: (row) => row.partner_name || row.customer_name || row.vendor_name || '—' },
    { header: 'Tax code', accessorKey: 'tax_code', render: (row) => row.tax_code || row.tax_code_code || '—' },
    { header: 'Outstanding', accessorKey: 'outstanding_amount', render: (row) => money(row.outstanding_amount ?? row.available_amount ?? 0, row.currency_code || 'USD') },
  ];

  const remittanceColumns = [
    { header: 'Remittance No', accessorKey: 'remittance_no', render: (row) => row.remittance_no || '—' },
    { header: 'Direction', accessorKey: 'direction', render: (row) => rowStatusBadge(row.direction || 'payable') },
    { header: 'Authority', accessorKey: 'authority_name', render: (row) => row.authority_name || row.authority_partner_name || row.authority_partner_id || '—' },
    { header: 'Period', accessorKey: 'period_start', render: (row) => [row.period_start, row.period_end].filter(Boolean).join(' → ') || '—' },
    { header: 'Status', accessorKey: 'status', render: (row) => rowStatusBadge(row.status) },
    { header: 'Amount', accessorKey: 'total_amount', render: (row) => money(row.total_amount, row.currency_code || 'USD') },
  ];

  const certificateColumns = [
    { header: 'Certificate No', accessorKey: 'certificate_no', render: (row) => row.certificate_no || '—' },
    { header: 'Customer', accessorKey: 'customer_name', render: (row) => row.customer_name || row.customer_id || '—' },
    { header: 'Tax code', accessorKey: 'tax_code', render: (row) => row.tax_code || '—' },
    { header: 'Status', accessorKey: 'status', render: (row) => rowStatusBadge(row.status) },
    { header: 'Date', accessorKey: 'certificate_date', render: (row) => row.certificate_date || '—' },
    { header: 'Amount', accessorKey: 'total_amount', render: (row) => money(row.total_amount, row.currency_code || 'USD') },
  ];

  const dashboard = dashboardQ.data || {};

  const cards = [
    { label: 'Vendor withholding open', value: money(dashboard.open_payable_amount ?? payableOutstanding), icon: Landmark },
    { label: 'Customer withholding open', value: money(dashboard.open_receivable_amount ?? receivableOutstanding), icon: ReceiptText },
    { label: 'Posted remittances', value: String(dashboard.remittance_posted_count ?? remittances.filter((row) => String(row.status || '').toLowerCase() === 'posted').length), icon: Banknote },
    { label: 'Posted certificates', value: String(dashboard.certificate_posted_count ?? certificates.filter((row) => String(row.status || '').toLowerCase() === 'posted').length), icon: FileCheck2 },
  ];

  const activeRows = tab === 'openItems' ? openItems : tab === 'remittances' ? remittances : certificates;
  const activeLoading = tab === 'openItems' ? openItemsQ.isLoading : tab === 'remittances' ? remittancesQ.isLoading : certificatesQ.isLoading;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Withholding workspace"
        subtitle="Operate vendor remittances and customer certificates without leaving the tax workspace."
        icon={Landmark}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(ROUTES.accountingTax)}>Back to tax</Button>
            <Button variant="outline" onClick={() => navigate(ROUTES.accountingTaxWithholdingCertificateNew)}>New certificate</Button>
            <Button onClick={() => navigate(ROUTES.accountingTaxWithholdingRemittanceNew)}>New remittance</Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <ContentCard key={card.label}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase text-text-muted">{card.label}</div>
                <div className="mt-1 text-2xl font-semibold text-text-strong">{card.value}</div>
              </div>
              <card.icon className="h-5 w-5 text-brand-deep" />
            </div>
          </ContentCard>
        ))}
      </div>

      <ContentCard title="Filters">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Select label="Direction" value={direction} onChange={(e) => setDirection(e.target.value)} options={[{ value: '', label: 'All' }, { value: 'payable', label: 'Payable' }, { value: 'receivable', label: 'Receivable' }]} />
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: '', label: 'All' }, { value: 'draft', label: 'Draft' }, { value: 'posted', label: 'Posted' }, { value: 'voided', label: 'Voided' }]} />
          <Input label="Period start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          <Input label="Period end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          <div className="flex items-end gap-2">
            <Button variant="outline" className="w-full" onClick={() => { setDirection(''); setStatus(''); setPeriodStart(''); setPeriodEnd(''); }}>Clear</Button>
            <Button className="w-full" onClick={() => setRunToken((v) => v + 1)}>Refresh</Button>
          </div>
        </div>
      </ContentCard>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'openItems', label: 'Open items' },
          { value: 'remittances', label: 'Remittances' },
          { value: 'certificates', label: 'Certificates' },
        ]}
      />

      {tab === 'openItems' ? (
        <ContentCard title="Open withholding items" actions={<Badge tone="success">{openItems.length} rows</Badge>}>
          <DataTable columns={openItemColumns} rows={activeRows} isLoading={activeLoading} emptyTitle="No open withholding items" emptyDescription="Open items appear here until you create and complete the remittance or certificate workflow." onRowClick={(row) => navigate(ROUTES.accountingTaxWithholdingOpenItemDetail(String(row.direction || 'payable').toLowerCase(), String(row.source_type || 'document').toLowerCase(), row.source_id || row.id))} />
        </ContentCard>
      ) : null}

      {tab === 'remittances' ? (
        <ContentCard title="Withholding remittances" actions={<Badge tone="success">{remittances.length} rows</Badge>}>
          <DataTable
            columns={remittanceColumns}
            rows={activeRows}
            isLoading={activeLoading}
            emptyTitle="No remittances found"
            emptyDescription="Create a draft remittance from open payable withholding items."
            onRowClick={(row) => navigate(ROUTES.accountingTaxWithholdingRemittanceDetail(row.id))}
          />
        </ContentCard>
      ) : null}

      {tab === 'certificates' ? (
        <ContentCard title="Withholding certificates" actions={<Badge tone="success">{certificates.length} rows</Badge>}>
          <DataTable
            columns={certificateColumns}
            rows={activeRows}
            isLoading={activeLoading}
            emptyTitle="No certificates found"
            emptyDescription="Create a customer withholding certificate from open receivable withholding items."
            onRowClick={(row) => navigate(ROUTES.accountingTaxWithholdingCertificateDetail(row.id))}
          />
        </ContentCard>
      ) : null}

      <ContentCard title="What this workspace controls">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border-subtle p-4 text-sm text-text-body">
            Vendor-side withholding is remitted separately from vendor payments, so the payable clears only when a remittance is posted.
          </div>
          <div className="rounded-2xl border border-border-subtle p-4 text-sm text-text-body">
            Customer-side withholding is reconciled through certificates, so receipts settle only the net collectible and the certificate clears the receivable.
          </div>
        </div>
      </ContentCard>
    </div>
  );
}
