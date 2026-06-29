import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgePercent, Plus, TicketCheck } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { makeCommerceApi } from '../api/commerce.api.js';
import { Badge, Field, Panel, SimpleTable, dateish, money, rowsOf } from './_commerceUi.jsx';

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15';
const btnClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-deep disabled:opacity-50';
function compact(body) { return Object.fromEntries(Object.entries(body).filter(([, v]) => v !== '' && v !== null && v !== undefined)); }

export default function CommercePromotions() {
  const { http } = useApi();
  const api = useMemo(() => makeCommerceApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [promotionForm, setPromotionForm] = useState({ name: '', type: 'percentage', value: '', starts_at: '', ends_at: '', status: 'active' });
  const [couponForm, setCouponForm] = useState({ code: '', promotion_id: '', max_redemptions: '', status: 'active' });

  const promotionsQ = useQuery({ queryKey: ['commerce.promotions'], queryFn: () => api.promotions.list() });
  const couponsQ = useQuery({ queryKey: ['commerce.coupons'], queryFn: () => api.promotions.coupons() });
  const promotions = rowsOf(promotionsQ.data);
  const coupons = rowsOf(couponsQ.data);

  const createPromotion = useMutation({ mutationFn: () => api.promotions.create(compact(promotionForm)), onSuccess: () => { setPromotionForm({ name: '', type: 'percentage', value: '', starts_at: '', ends_at: '', status: 'active' }); qc.invalidateQueries({ queryKey: ['commerce.promotions'] }); toast.success?.('Promotion created.'); }, onError: (e) => toast.error?.(e?.message || 'Promotion could not be created.') });
  const createCoupon = useMutation({ mutationFn: () => api.promotions.createCoupon(compact(couponForm)), onSuccess: () => { setCouponForm({ code: '', promotion_id: '', max_redemptions: '', status: 'active' }); qc.invalidateQueries({ queryKey: ['commerce.coupons'] }); toast.success?.('Coupon created.'); }, onError: (e) => toast.error?.(e?.message || 'Coupon could not be created.') });

  return (
    <div className="space-y-6">
      <PageHeader icon={BadgePercent} title="Promotions and coupons" subtitle="Create controlled discounts, coupon codes, usage limits and time-bound offers." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="New promotion" subtitle="Keep high-risk manual discounts subject to manager approval." actions={<button className={btnClass} onClick={() => createPromotion.mutate()}><Plus className="h-4 w-4" /> Create promotion</button>}>
          <div className="grid gap-3 md:grid-cols-2"><Field label="Name"><input className={inputClass} value={promotionForm.name} onChange={(e) => setPromotionForm((f) => ({ ...f, name: e.target.value }))} /></Field><Field label="Type"><select className={inputClass} value={promotionForm.type} onChange={(e) => setPromotionForm((f) => ({ ...f, type: e.target.value }))}><option value="percentage">Percentage</option><option value="fixed_amount">Fixed amount</option><option value="bogo">Buy X get Y</option><option value="customer_group">Customer group</option></select></Field><Field label="Value"><input className={inputClass} value={promotionForm.value} onChange={(e) => setPromotionForm((f) => ({ ...f, value: e.target.value }))} /></Field><Field label="Status"><select className={inputClass} value={promotionForm.status} onChange={(e) => setPromotionForm((f) => ({ ...f, status: e.target.value }))}><option value="active">Active</option><option value="draft">Draft</option><option value="paused">Paused</option></select></Field><Field label="Starts"><input type="datetime-local" className={inputClass} value={promotionForm.starts_at} onChange={(e) => setPromotionForm((f) => ({ ...f, starts_at: e.target.value }))} /></Field><Field label="Ends"><input type="datetime-local" className={inputClass} value={promotionForm.ends_at} onChange={(e) => setPromotionForm((f) => ({ ...f, ends_at: e.target.value }))} /></Field></div>
        </Panel>
        <Panel title="New coupon" subtitle="Coupons can be validated at checkout and tied to promotion limits." actions={<button className={btnClass} onClick={() => createCoupon.mutate()}><TicketCheck className="h-4 w-4" /> Create coupon</button>}>
          <div className="grid gap-3 md:grid-cols-2"><Field label="Code"><input className={inputClass} value={couponForm.code} onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} /></Field><Field label="Promotion"><select className={inputClass} value={couponForm.promotion_id} onChange={(e) => setCouponForm((f) => ({ ...f, promotion_id: e.target.value }))}><option value="">Select promotion</option>{promotions.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></Field><Field label="Max redemptions"><input className={inputClass} value={couponForm.max_redemptions} onChange={(e) => setCouponForm((f) => ({ ...f, max_redemptions: e.target.value }))} /></Field><Field label="Status"><select className={inputClass} value={couponForm.status} onChange={(e) => setCouponForm((f) => ({ ...f, status: e.target.value }))}><option value="active">Active</option><option value="paused">Paused</option></select></Field></div>
        </Panel>
      </div>
      <Panel title="Promotion rules"><SimpleTable rows={promotions} columns={[{ key: 'name', label: 'Promotion' }, { key: 'type', label: 'Type' }, { key: 'value', label: 'Value', render: (r) => r.type === 'fixed_amount' ? money(r.value) : `${r.value ?? '—'}%` }, { key: 'starts_at', label: 'Starts', render: (r) => dateish(r.starts_at) }, { key: 'ends_at', label: 'Ends', render: (r) => dateish(r.ends_at) }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }]} /></Panel>
      <Panel title="Coupons"><SimpleTable rows={coupons} columns={[{ key: 'code', label: 'Code' }, { key: 'promotion_name', label: 'Promotion', render: (r) => r.promotion_name || r.promotion_id }, { key: 'redemptions', label: 'Used' }, { key: 'max_redemptions', label: 'Limit' }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }]} /></Panel>
    </div>
  );
}
