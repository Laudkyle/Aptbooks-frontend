import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, FilePlus2, Plus, ReceiptText, RefreshCw, Trash2 } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInvoicesApi } from '../api/invoices.api.js';
import { makePartnersApi } from '../../../features/business/api/partners.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { makeTaxApi } from '../../accounting/tax/api/tax.api.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { CurrencySelect } from '../../../shared/components/forms/CurrencySelect.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { computeDocumentSummary, normalizeRows } from '../../../shared/tax/frontendTax.js';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function emptyLine() {
  return {
    description: '',
    quantity: 1,
    unitPrice: 0,
    revenueAccountId: '',
    taxCodeId: '',
    taxRate: 0,
    withholdingRate: 0,
    recoverablePercent: 100,
    exemptionReasonCode: ''
  };
}

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const { http } = useApi();
  const invoicesApi = useMemo(() => makeInvoicesApi(http), [http]);
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const taxApi = useMemo(() => makeTaxApi(http), [http]);
  const toast = useToast();

  const [payload, setPayload] = useState({
    customerId: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    memo: '',
    currencyCode: 'USD',
    taxDate: new Date().toISOString().slice(0, 10),
    pricingMode: 'exclusive',
    supplyType: 'goods',
    placeOfSupplyCountryCode: '',
    buyerReference: '',
    jurisdictionId: '',
    lines: [emptyLine()]
  });
  const [taxPreview, setTaxPreview] = useState(null);

  const partnersQuery = useQuery({ queryKey: ['partners', 'customers', 'tax'], queryFn: () => partnersApi.list({ type: 'customer' }) });
  const coaQuery = useQuery({ queryKey: ['coa', 'invoice-tax'], queryFn: () => coaApi.list() });
  const taxCodesQuery = useQuery({ queryKey: ['tax-codes', 'invoice-create'], queryFn: () => taxApi.listCodes({ status: 'active' }) });
  const jurisdictionsQuery = useQuery({ queryKey: ['tax-jurisdictions', 'invoice-create'], queryFn: () => taxApi.listJurisdictions() });

  const partners = normalizeRows(partnersQuery.data).filter((p) => String(p.type ?? '').toLowerCase() === 'customer');
  const accounts = normalizeRows(coaQuery.data);
  const taxCodes = normalizeRows(taxCodesQuery.data);
  const jurisdictions = normalizeRows(jurisdictionsQuery.data);
  const revenueAccounts = accounts.filter((acc) =>
    String(acc.account_type_code ?? acc.accountType ?? acc.category ?? '').toLowerCase().includes('revenue')
  );

  const summary = useMemo(() => computeDocumentSummary({ lines: payload.lines, taxCodes, pricingMode: payload.pricingMode }), [payload.lines, payload.pricingMode, taxCodes]);
  const selectedCustomer = partners.find((p) => p.id === payload.customerId);

  const create = useMutation({
    mutationFn: () => invoicesApi.create(payload, { idempotencyKey: generateUUID() }),
    onSuccess: (res) => {
      toast.success('Invoice created successfully');
      const id = res?.id ?? res?.data?.id;
      navigate(id ? ROUTES.invoiceDetail(id) : ROUTES.invoices);
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? e?.message ?? 'Failed to create invoice')
  });

  const previewTaxes = useMutation({
    mutationFn: () => invoicesApi.determineTaxes(payload, { idempotencyKey: generateUUID() }),
    onSuccess: (res) => {
      setTaxPreview(res);
      toast.success('Tax determination refreshed');
    },
    onError: (e) => {
      setTaxPreview({ fallbackSummary: summary, error: e?.response?.data ?? e?.message });
      toast.error('Preview endpoint unavailable. Local calculation shown instead.');
    }
  });

  const setField = (key, value) => setPayload((s) => ({ ...s, [key]: value }));
  const updateLine = (index, key, value) => {
    setPayload((s) => {
      const lines = [...s.lines];
      lines[index] = { ...lines[index], [key]: value };
      if (key === 'taxCodeId') {
        const code = taxCodes.find((item) => item.id === value);
        if (code) lines[index].taxRate = Number(code.rate ?? code.tax_rate ?? 0);
      }
      return { ...s, lines };
    });
  };
  const addLine = () => setPayload((s) => ({ ...s, lines: [...s.lines, emptyLine()] }));
  const removeLine = (index) => setPayload((s) => ({ ...s, lines: s.lines.filter((_, i) => i !== index) }));

  const handleSubmit = () => {
    if (!payload.customerId) return toast.error('Select a customer');
    if (!payload.invoiceDate || !payload.dueDate) return toast.error('Invoice date and due date are required');
    if (payload.lines.some((line) => !line.description || !line.revenueAccountId)) return toast.error('Complete all invoice lines');
    create.mutate();
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Create invoice" subtitle="International-grade invoice capture with tax determination, withholding overlays, recoverability, and e-invoicing metadata." icon={FilePlus2} />
      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-6">
          <ContentCard title="Commercial details" actions={<Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(-1)}>Back</Button>}>
            <div className="grid gap-4 md:grid-cols-2">
              <Select label="Customer" value={payload.customerId} onChange={(e) => setField('customerId', e.target.value)} options={[{ value: '', label: 'Select customer' }, ...partners.map((p) => ({ value: p.id, label: p.name || p.businessName || p.id }))]} />
              <Select label="Jurisdiction" value={payload.jurisdictionId} onChange={(e) => setField('jurisdictionId', e.target.value)} options={[{ value: '', label: 'Auto determine' }, ...jurisdictions.map((j) => ({ value: j.id, label: `${j.code} — ${j.name}` }))]} />
              <Input label="Invoice date" type="date" value={payload.invoiceDate} onChange={(e) => setField('invoiceDate', e.target.value)} />
              <Input label="Due date" type="date" value={payload.dueDate} onChange={(e) => setField('dueDate', e.target.value)} />
              <Input label="Tax point date" type="date" value={payload.taxDate} onChange={(e) => setField('taxDate', e.target.value)} />
              <Input label="Place of supply country" value={payload.placeOfSupplyCountryCode} onChange={(e) => setField('placeOfSupplyCountryCode', e.target.value.toUpperCase())} placeholder="e.g. GH" />
              <Select label="Pricing mode" value={payload.pricingMode} onChange={(e) => setField('pricingMode', e.target.value)} options={[{ value: 'exclusive', label: 'Tax exclusive' }, { value: 'inclusive', label: 'Tax inclusive' }]} />
              <Select label="Supply type" value={payload.supplyType} onChange={(e) => setField('supplyType', e.target.value)} options={[{ value: 'goods', label: 'Goods' }, { value: 'services', label: 'Services' }, { value: 'mixed', label: 'Mixed supply' }, { value: 'export', label: 'Export' }]} />
              <CurrencySelect label="Currency" value={payload.currencyCode} onChange={(e) => setField('currencyCode', e.target.value)} />
              <Input label="Buyer reference" value={payload.buyerReference} onChange={(e) => setField('buyerReference', e.target.value)} placeholder="Needed for e-invoicing" />
              <div className="md:col-span-2">
                <Textarea label="Memo" rows={3} value={payload.memo} onChange={(e) => setField('memo', e.target.value)} placeholder="Commercial memo, supply notes, or filing references" />
              </div>
            </div>
          </ContentCard>

          <ContentCard title="Invoice lines" actions={<Button leftIcon={Plus} onClick={addLine}>Add line</Button>}>
            <div className="space-y-4">
              {payload.lines.map((line, index) => {
                const calc = summary.lines[index]?._calc;
                return (
                  <div key={index} className="rounded-2xl border border-border-subtle bg-surface-2 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-text-strong">Line {index + 1}</div>
                      {payload.lines.length > 1 ? <Button variant="outline" size="sm" leftIcon={Trash2} onClick={() => removeLine(index)}>Remove</Button> : null}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <Input label="Description" value={line.description} onChange={(e) => updateLine(index, 'description', e.target.value)} />
                      <Select label="Revenue account" value={line.revenueAccountId} onChange={(e) => updateLine(index, 'revenueAccountId', e.target.value)} options={[{ value: '', label: 'Select account' }, ...revenueAccounts.map((a) => ({ value: a.id, label: `${a.code ? `${a.code} — ` : ''}${a.name}` }))]} />
                      <Select label="Tax code" value={line.taxCodeId} onChange={(e) => updateLine(index, 'taxCodeId', e.target.value)} options={[{ value: '', label: 'No tax code' }, ...taxCodes.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))]} />
                      <Input label="Quantity" type="number" value={line.quantity} onChange={(e) => updateLine(index, 'quantity', Number(e.target.value))} />
                      <Input label="Unit price" type="number" value={line.unitPrice} onChange={(e) => updateLine(index, 'unitPrice', Number(e.target.value))} />
                      <Input label="Tax rate (%)" type="number" value={line.taxRate} onChange={(e) => updateLine(index, 'taxRate', Number(e.target.value))} />
                      <Input label="Withholding rate (%)" type="number" value={line.withholdingRate} onChange={(e) => updateLine(index, 'withholdingRate', Number(e.target.value))} />
                      <Input label="Recoverable tax (%)" type="number" value={line.recoverablePercent} onChange={(e) => updateLine(index, 'recoverablePercent', Number(e.target.value))} />
                      <Input label="Exemption reason" value={line.exemptionReasonCode} onChange={(e) => updateLine(index, 'exemptionReasonCode', e.target.value)} placeholder="optional" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-5 text-xs">
                      <div className="rounded-xl bg-white p-3 border border-border-subtle"><div className="text-text-muted">Taxable base</div><div className="mt-1 font-semibold text-text-strong">{calc ? calc.taxableBase.toFixed(2) : '0.00'}</div></div>
                      <div className="rounded-xl bg-white p-3 border border-border-subtle"><div className="text-text-muted">Tax</div><div className="mt-1 font-semibold text-text-strong">{calc ? calc.taxAmount.toFixed(2) : '0.00'}</div></div>
                      <div className="rounded-xl bg-white p-3 border border-border-subtle"><div className="text-text-muted">Withholding</div><div className="mt-1 font-semibold text-text-strong">{calc ? calc.withholdingAmount.toFixed(2) : '0.00'}</div></div>
                      <div className="rounded-xl bg-white p-3 border border-border-subtle"><div className="text-text-muted">Non-recoverable tax</div><div className="mt-1 font-semibold text-text-strong">{calc ? calc.nonRecoverableTaxAmount.toFixed(2) : '0.00'}</div></div>
                      <div className="rounded-xl bg-white p-3 border border-border-subtle"><div className="text-text-muted">Line total</div><div className="mt-1 font-semibold text-text-strong">{calc ? calc.total.toFixed(2) : '0.00'}</div></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ContentCard>
        </div>

        <div className="space-y-6">
          <ContentCard title="Tax and posting summary" actions={<Button variant="outline" leftIcon={RefreshCw} onClick={() => previewTaxes.mutate()} loading={previewTaxes.isPending}>Determine</Button>}>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-text-muted">Customer</span><span className="font-medium text-text-strong">{selectedCustomer?.name || 'Not selected'}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Subtotal</span><span className="font-medium text-text-strong">{summary.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Output tax</span><span className="font-medium text-text-strong">{summary.taxTotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Withholding</span><span className="font-medium text-text-strong">{summary.withholdingTotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Recoverable tax</span><span className="font-medium text-text-strong">{summary.recoverableTaxTotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Non-recoverable tax</span><span className="font-medium text-text-strong">{summary.nonRecoverableTaxTotal.toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-border-subtle pt-3"><span className="font-semibold text-text-strong">Grand total</span><span className="font-semibold text-text-strong">{summary.grandTotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="font-semibold text-text-strong">Expected collectible</span><span className="font-semibold text-text-strong">{summary.payableTotal.toFixed(2)}</span></div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button leftIcon={ReceiptText} onClick={handleSubmit} loading={create.isPending}>Create invoice</Button>
            </div>
          </ContentCard>

          <ContentCard title="E-invoicing readiness">
            <div className="space-y-2 text-sm text-text-body">
              <p>Buyer reference: <span className="font-medium text-text-strong">{payload.buyerReference || 'Missing'}</span></p>
              <p>Tax point date: <span className="font-medium text-text-strong">{payload.taxDate || 'Missing'}</span></p>
              <p>Jurisdiction: <span className="font-medium text-text-strong">{jurisdictions.find((j) => j.id === payload.jurisdictionId)?.name || 'Auto'}</span></p>
              <p>Pricing mode: <span className="font-medium text-text-strong">{payload.pricingMode}</span></p>
            </div>
          </ContentCard>

          <ContentCard title="Tax preview payload">
            <JsonPanel title="Preview response" value={taxPreview ?? { localFallback: summary }} />
          </ContentCard>
        </div>
      </div>
    </div>
  );
}
