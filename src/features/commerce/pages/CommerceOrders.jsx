import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, PackageCheck, ShoppingBag, XCircle } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { makeCommerceApi } from '../api/commerce.api.js';
import { Badge, Field, Panel, SimpleTable, dateish, money, rowsOf } from './_commerceUi.jsx';

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15';
const btnClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-deep disabled:opacity-50';
const softBtn = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const dangerBtn = 'inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50';

export default function CommerceOrders() {
  const { http } = useApi();
  const api = useMemo(() => makeCommerceApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');

  const ordersQ = useQuery({ queryKey: ['commerce.orders', status, channel], queryFn: () => api.orders.list({ status: status || undefined, channel: channel || undefined }) });
  const orders = rowsOf(ordersQ.data);

  const action = useMutation({
    mutationFn: async ({ type, id }) => {
      if (type === 'pay') return api.orders.pay(id, {});
      if (type === 'fulfill') return api.orders.fulfill(id, {});
      if (type === 'cancel') return api.orders.cancel(id, { reason: 'Cancelled from order workspace' });
      if (type === 'refund') return api.orders.refund(id, { reason: 'Refund requested from order workspace' });
      return null;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commerce.orders'] }); toast.success?.('Order updated.'); },
    onError: (e) => toast.error?.(e?.message || 'Order action failed.'),
  });

  return (
    <div className="space-y-6">
      <PageHeader icon={ShoppingBag} title="E-commerce orders" subtitle="Track website, WhatsApp, marketplace and manual online orders through payment and fulfilment." />
      <Panel title="Order filters" subtitle="Use these controls for the order operations queue.">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Status"><select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="pending_payment">Pending payment</option><option value="paid">Paid</option><option value="processing">Processing</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option></select></Field>
          <Field label="Channel"><select className={inputClass} value={channel} onChange={(e) => setChannel(e.target.value)}><option value="">All</option><option value="website">Website</option><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="manual">Manual</option><option value="marketplace">Marketplace</option></select></Field>
        </div>
      </Panel>
      <Panel title="Orders" subtitle="Only valid lifecycle actions should be used after backend validation.">
        <SimpleTable rows={orders} columns={[
          { key: 'order_no', label: 'Order', render: (r) => r.order_no || r.code || r.id },
          { key: 'channel', label: 'Channel' },
          { key: 'customer_name', label: 'Customer', render: (r) => r.customer_name || r.partner_name || r.customer_id || 'Walk-in/guest' },
          { key: 'total_amount', label: 'Total', render: (r) => money(r.total_amount || r.grand_total) },
          { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          { key: 'created_at', label: 'Date', render: (r) => dateish(r.created_at || r.order_date) },
          { key: 'actions', label: 'Actions', render: (r) => <div className="flex flex-wrap gap-2">{['pending_payment', 'cart'].includes(String(r.status)) ? <button className={softBtn} onClick={() => action.mutate({ type: 'pay', id: r.id })}><CheckCircle2 className="h-4 w-4" /> Mark paid</button> : null}{['paid', 'processing'].includes(String(r.status)) ? <button className={btnClass} onClick={() => action.mutate({ type: 'fulfill', id: r.id })}><PackageCheck className="h-4 w-4" /> Fulfil</button> : null}{!['cancelled', 'fulfilled', 'refunded'].includes(String(r.status)) ? <button className={dangerBtn} onClick={() => action.mutate({ type: 'cancel', id: r.id })}><XCircle className="h-4 w-4" /> Cancel</button> : null}{['paid', 'fulfilled'].includes(String(r.status)) ? <button className={softBtn} onClick={() => action.mutate({ type: 'refund', id: r.id })}>Refund</button> : null}</div> },
        ]} />
      </Panel>
    </div>
  );
}
