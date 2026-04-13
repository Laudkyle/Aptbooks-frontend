import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, FileCheck2, Landmark } from 'lucide-react';

import { useApi } from '../../../../shared/hooks/useApi.js';
import { qk } from '../../../../shared/query/keys.js';
import { makeTaxApi } from '../api/tax.api.js';
import { ROUTES } from '../../../../app/constants/routes.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { normalizeRows } from '../../../../shared/tax/frontendTax.js';

function money(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
}

function titleCase(value) {
  return String(value ?? '').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

export default function WithholdingOpenItemDetail() {
  const navigate = useNavigate();
  const { direction, sourceType, sourceId } = useParams();
  const { http } = useApi();
  const api = useMemo(() => makeTaxApi(http), [http]);

  const openItemsQ = useQuery({
    queryKey: qk.withholdingOpenItems({ direction }),
    queryFn: () => api.listWithholdingOpenItems({ direction }),
  });

  const row = useMemo(() => {
    const rows = normalizeRows(openItemsQ.data);
    return rows.find((item) => String(item.source_id || item.id) === String(sourceId) && String(item.source_type || '').toLowerCase() === String(sourceType || '').toLowerCase()) || null;
  }, [openItemsQ.data, sourceId, sourceType]);

  const sourceDetailRoute = row
    ? String(row.source_type || '').toLowerCase() === 'invoice'
      ? ROUTES.invoiceDetail(row.source_id || row.id)
      : String(row.source_type || '').toLowerCase() === 'bill'
        ? ROUTES.billDetail(row.source_id || row.id)
        : null
    : null;

  const launchState = row ? { preselectedOpenItem: row } : undefined;
  const launchRoute = String(direction || '').toLowerCase() === 'receivable'
    ? ROUTES.accountingTaxWithholdingCertificateNew
    : ROUTES.accountingTaxWithholdingRemittanceNew;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={row?.document_no || row?.source_document_no || 'Withholding open item'}
        subtitle="Review the open withholding balance and launch the correct processing flow."
        icon={String(direction || '').toLowerCase() === 'receivable' ? FileCheck2 : Landmark}
        actions={<Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.accountingTaxWithholding)}>Back to workspace</Button>}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <ContentCard title="Open item details" actions={<Badge tone={String(direction || '').toLowerCase() === 'receivable' ? 'success' : 'warning'}>{titleCase(direction)}</Badge>}>
          {!row ? (
            <div className="text-sm text-text-muted">This open item could not be found. Refresh the workspace and try again.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div><div className="text-xs text-text-muted">Source type</div><div className="font-semibold text-text-strong">{titleCase(row.source_type || sourceType)}</div></div>
              <div><div className="text-xs text-text-muted">Document</div><div className="font-semibold text-text-strong">{row.document_no || row.source_document_no || '—'}</div></div>
              <div><div className="text-xs text-text-muted">Partner</div><div className="font-semibold text-text-strong">{row.partner_name || row.customer_name || row.vendor_name || row.partner_id || '—'}</div></div>
              <div><div className="text-xs text-text-muted">Tax code</div><div className="font-semibold text-text-strong">{row.tax_code || row.tax_code_code || row.tax_code_id || '—'}</div></div>
              <div><div className="text-xs text-text-muted">Outstanding</div><div className="font-semibold text-text-strong">{money(row.outstanding_amount ?? row.available_amount ?? 0, row.currency_code || 'USD')}</div></div>
              <div><div className="text-xs text-text-muted">Jurisdiction</div><div className="font-semibold text-text-strong">{row.jurisdiction_code || row.jurisdiction_name || row.jurisdiction_id || '—'}</div></div>
              <div><div className="text-xs text-text-muted">Document date</div><div className="font-semibold text-text-strong">{row.document_date || row.source_document_date || '—'}</div></div>
              <div><div className="text-xs text-text-muted">Currency</div><div className="font-semibold text-text-strong">{row.currency_code || 'USD'}</div></div>
            </div>
          )}
        </ContentCard>

        <ContentCard title="Process this item">
          {!row ? (
            <div className="text-sm text-text-muted">Load the item first before processing.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border-subtle bg-slate-50 p-4 text-sm text-text-body">
                {String(direction || '').toLowerCase() === 'receivable'
                  ? 'This item needs customer-side certificate or reconciliation processing before the withholding receivable is cleared.'
                  : 'This item needs remittance processing before the withholding payable is cleared.'}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => navigate(launchRoute, { state: launchState })} rightIcon={ArrowRight}>
                  {String(direction || '').toLowerCase() === 'receivable' ? 'Create certificate draft' : 'Create remittance draft'}
                </Button>
                {sourceDetailRoute ? <Button variant="outline" onClick={() => navigate(sourceDetailRoute)}>Open source document</Button> : null}
              </div>
              <div className="text-xs text-text-muted">
                Submit, approve, post, and void actions happen on the resulting certificate or remittance document after you create the draft.
              </div>
            </div>
          )}
        </ContentCard>
      </div>
    </div>
  );
}
