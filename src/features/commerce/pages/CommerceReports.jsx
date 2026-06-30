import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, CalendarDays, CreditCard, Package, Percent, ReceiptText, RefreshCw, TrendingUp } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { makeCommerceApi } from '../api/commerce.api.js';
import { Field, Panel, SimpleTable, dateish, money, rowsOf } from './_commerceUi.jsx';

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15';
const btnClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-deep disabled:opacity-50';
const softBtn = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50';

function kpiValue(data, keys) {
  const obj = data?.summary || data?.data?.summary || data?.totals || data?.data?.totals || data || {};
  for (const key of keys) if (obj?.[key] !== undefined) return obj[key];
  const rows = rowsOf(data);
  if (rows.length) {
    return rows.reduce((sum, row) => sum + Number(row[keys[0]] || row.amount || row.totalAmount || 0), 0);
  }
  return 0;
}

function Kpi({ title, value, icon: Icon }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{title}</span><Icon className="h-4 w-4 text-brand-primary" /></div><div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div></div>;
}

export default function CommerceReports() {
  const { http } = useApi();
  const api = useMemo(() => makeCommerceApi(http), [http]);
  const [filters, setFilters] = useState({ from: '', to: '', storeId: '' });
  const [active, setActive] = useState('daily');
  const params = useMemo(() => ({ from: filters.from || undefined, to: filters.to || undefined, storeId: filters.storeId || undefined }), [filters]);

  const dailyQ = useQuery({ queryKey: ['commerce.report.daily', params], queryFn: () => api.reports.dailySales(params) });
  const productQ = useQuery({ queryKey: ['commerce.report.product', params], queryFn: () => api.reports.productSales(params), enabled: active === 'products' });
  const marginQ = useQuery({ queryKey: ['commerce.report.margin', params], queryFn: () => api.reports.grossMargin(params), enabled: active === 'margin' });
  const taxQ = useQuery({ queryKey: ['commerce.report.tax', params], queryFn: () => api.reports.taxSummary(params), enabled: active === 'tax' });
  const paymentsQ = useQuery({ queryKey: ['commerce.report.payments', params], queryFn: () => api.reports.paymentReconciliation(params), enabled: active === 'payments' });
  const returnsQ = useQuery({ queryKey: ['commerce.report.returns', params], queryFn: () => api.reports.refundsReturns(params), enabled: active === 'returns' });
  const discountsQ = useQuery({ queryKey: ['commerce.report.discounts', params], queryFn: () => api.reports.discounts(params), enabled: active === 'discounts' });
  const ordersQ = useQuery({ queryKey: ['commerce.report.orders', params], queryFn: () => api.reports.ecommerceOrders(params), enabled: active === 'orders' });

  const activeData = { daily: dailyQ.data, products: productQ.data, margin: marginQ.data, tax: taxQ.data, payments: paymentsQ.data, returns: returnsQ.data, discounts: discountsQ.data, orders: ordersQ.data }[active];
  const activeRows = rowsOf(activeData);

  const columns = {
    daily: [{ key: 'date', label: 'Date', render: (r) => dateish(r.date || r.saleDate) }, { key: 'storeName', label: 'Store' }, { key: 'salesCount', label: 'Sales' }, { key: 'grossSales', label: 'Gross', render: (r) => money(r.grossSales || r.totalSales) }, { key: 'netSales', label: 'Net', render: (r) => money(r.netSales || r.totalAmount) }],
    products: [{ key: 'sku', label: 'SKU' }, { key: 'name', label: 'Product', render: (r) => r.name || r.itemName }, { key: 'quantity', label: 'Qty' }, { key: 'netSales', label: 'Sales', render: (r) => money(r.netSales || r.totalSales) }],
    margin: [{ key: 'name', label: 'Product/category', render: (r) => r.name || r.itemName || r.categoryName }, { key: 'revenue', label: 'Revenue', render: (r) => money(r.revenue || r.netSales) }, { key: 'cogs', label: 'COGS', render: (r) => money(r.cogs || r.costAmount) }, { key: 'grossMargin', label: 'Margin', render: (r) => money(r.grossMargin || r.marginAmount) }, { key: 'grossMarginPercent', label: 'Margin %' }],
    tax: [{ key: 'taxCode', label: 'Tax code' }, { key: 'taxName', label: 'Tax' }, { key: 'taxableAmount', label: 'Taxable', render: (r) => money(r.taxableAmount) }, { key: 'taxAmount', label: 'Tax', render: (r) => money(r.taxAmount) }],
    payments: [{ key: 'method', label: 'Method' }, { key: 'provider', label: 'Provider' }, { key: 'expectedAmount', label: 'Expected', render: (r) => money(r.expectedAmount || r.amount) }, { key: 'confirmedAmount', label: 'Confirmed', render: (r) => money(r.confirmedAmount) }, { key: 'difference', label: 'Difference', render: (r) => money(r.difference) }],
    returns: [{ key: 'date', label: 'Date', render: (r) => dateish(r.date || r.createdAt) }, { key: 'type', label: 'Type' }, { key: 'referenceNo', label: 'Reference' }, { key: 'amount', label: 'Amount', render: (r) => money(r.amount || r.refundAmount) }, { key: 'status', label: 'Status' }],
    discounts: [{ key: 'promotionName', label: 'Promotion' }, { key: 'couponCode', label: 'Coupon' }, { key: 'redemptions', label: 'Uses' }, { key: 'discountAmount', label: 'Discount', render: (r) => money(r.discountAmount) }],
    orders: [{ key: 'date', label: 'Date', render: (r) => dateish(r.date || r.orderDate) }, { key: 'channel', label: 'Channel' }, { key: 'ordersCount', label: 'Orders' }, { key: 'paidAmount', label: 'Paid', render: (r) => money(r.paidAmount) }, { key: 'fulfilledCount', label: 'Fulfilled' }],
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={BarChart3} title="Commerce reports" subtitle="Retail, POS and e-commerce reporting for sales, tax, margins, payments and returns." />
      <Panel title="Filters" subtitle="Apply the same period and store filter across reports." actions={<button className={softBtn} onClick={() => window.print()}><ReceiptText className="h-4 w-4" /> Print</button>}>
        <div className="grid gap-3 md:grid-cols-3"><Field label="From"><input type="date" className={inputClass} value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} /></Field><Field label="To"><input type="date" className={inputClass} value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} /></Field><Field label="Store ID"><input className={inputClass} value={filters.storeId} onChange={(e) => setFilters((f) => ({ ...f, storeId: e.target.value }))} placeholder="Optional" /></Field></div>
      </Panel>
      <div className="grid gap-4 md:grid-cols-4"><Kpi title="Sales" value={money(kpiValue(dailyQ.data, ['netSales', 'totalSales']))} icon={TrendingUp} /><Kpi title="Payments" value={money(kpiValue(paymentsQ.data, ['confirmedAmount', 'amount']))} icon={CreditCard} /><Kpi title="Tax" value={money(kpiValue(taxQ.data, ['taxAmount']))} icon={Percent} /><Kpi title="Returns" value={money(kpiValue(returnsQ.data, ['amount']))} icon={RefreshCw} /></div>
      <div className="flex flex-wrap gap-2">{[{ id: 'daily', label: 'Daily sales' }, { id: 'products', label: 'Products' }, { id: 'margin', label: 'Gross margin' }, { id: 'tax', label: 'Tax' }, { id: 'payments', label: 'Payments' }, { id: 'returns', label: 'Returns/refunds' }, { id: 'discounts', label: 'Discounts' }, { id: 'orders', label: 'E-commerce' }].map((tab) => <button key={tab.id} className={active === tab.id ? btnClass : softBtn} onClick={() => setActive(tab.id)}>{tab.label}</button>)}</div>
      <Panel title="Report detail" subtitle="Drill-down rows returned by the backend reporting endpoint."><SimpleTable rows={activeRows} columns={columns[active] || columns.daily} /></Panel>
    </div>
  );
}
