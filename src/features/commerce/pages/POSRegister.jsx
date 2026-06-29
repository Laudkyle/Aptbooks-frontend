import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Barcode, CreditCard, DollarSign, Minus, Plus, Printer, ReceiptText, RotateCcw, Search, ShoppingCart, X } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { makeCommerceApi } from '../api/commerce.api.js';
import { Badge, Empty, Field, Panel, SimpleTable, firstValue, money, rowsOf } from './_commerceUi.jsx';

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15';
const btnClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50';
const softBtn = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const dangerBtn = 'inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50';

function productId(product) {
  return firstValue(product, ['id', 'item_id', 'inventory_item_id']);
}
function productName(product) {
  return firstValue(product, ['name', 'item_name', 'description'], 'Unnamed item');
}
function productSku(product) {
  return firstValue(product, ['sku', 'code', 'item_code'], '');
}
function productPrice(product) {
  return firstValue(product, ['price', 'unit_price', 'selling_price', 'default_price', 'amount'], '0');
}

export default function POSRegister() {
  const { http } = useApi();
  const api = useMemo(() => makeCommerceApi(http), [http]);
  const toast = useToast();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [storeId, setStoreId] = useState('');
  const [registerId, setRegisterId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [lastSale, setLastSale] = useState(null);

  const productsQ = useQuery({ queryKey: ['commerce.products', query], queryFn: () => api.catalog.products({ q: query || undefined, limit: 25 }), staleTime: 30_000 });
  const storesQ = useQuery({ queryKey: ['commerce.stores'], queryFn: () => api.setup.stores(), staleTime: 60_000 });
  const registersQ = useQuery({ queryKey: ['commerce.registers', storeId], queryFn: () => api.setup.registers({ store_id: storeId || undefined }), staleTime: 60_000 });
  const shiftsQ = useQuery({ queryKey: ['commerce.shifts', registerId], queryFn: () => api.shifts.list({ register_id: registerId || undefined, status: 'open' }), staleTime: 20_000 });

  const products = rowsOf(productsQ.data);
  const stores = rowsOf(storesQ.data);
  const registers = rowsOf(registersQ.data);
  const shifts = rowsOf(shiftsQ.data);

  const subtotal = cart.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_price || 0), 0);
  const total = subtotal;
  const changeDue = Number(amountTendered || 0) - total;

  const addToCart = (product) => {
    const id = productId(product);
    if (!id) return;
    setCart((rows) => {
      const existing = rows.find((row) => row.item_id === id);
      if (existing) return rows.map((row) => row.item_id === id ? { ...row, quantity: Number(row.quantity) + 1 } : row);
      return [...rows, { item_id: id, sku: productSku(product), name: productName(product), quantity: 1, unit_price: String(productPrice(product) || '0'), tax_code_id: product.tax_code_id || product.default_tax_code_id || '' }];
    });
  };

  const setQty = (itemId, qty) => {
    const next = Math.max(0, Number(qty || 0));
    setCart((rows) => next === 0 ? rows.filter((row) => row.item_id !== itemId) : rows.map((row) => row.item_id === itemId ? { ...row, quantity: next } : row));
  };

  const createSale = useMutation({
    mutationFn: async () => {
      if (!registerId) throw new Error('Select a register before completing a sale.');
      if (!shiftId) throw new Error('Open or select a shift before completing a sale.');
      if (!cart.length) throw new Error('Add at least one item to the cart.');
      const payload = {
        store_id: storeId || undefined,
        register_id: registerId,
        shift_id: shiftId,
        customer_id: customerId || undefined,
        price_mode: 'tax_inclusive',
        lines: cart.map((line) => ({ item_id: line.item_id, quantity: String(line.quantity), unit_price: String(line.unit_price), tax_code_id: line.tax_code_id || undefined })),
        payments: [{ method: paymentMethod, amount: String(total) }],
      };
      const sale = await api.pos.createSale(payload);
      const saleId = sale?.id || sale?.data?.id || sale?.sale?.id;
      if (saleId) {
        try { await api.pos.completeSale(saleId, {}); } catch { /* backend may complete during create */ }
      }
      return sale;
    },
    onSuccess: (data) => {
      setLastSale(data?.data ?? data);
      setCart([]);
      setAmountTendered('');
      qc.invalidateQueries({ queryKey: ['commerce.sales'] });
      toast.success?.('Sale completed.');
    },
    onError: (e) => toast.error?.(e?.message || 'Sale could not be completed.'),
  });

  const postSale = useMutation({
    mutationFn: (id) => api.pos.postSale(id, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commerce.sales'] }); toast.success?.('Sale posted to accounting.'); },
    onError: (e) => toast.error?.(e?.message || 'Sale could not be posted.'),
  });

  const receiptQ = useQuery({ queryKey: ['commerce.receipt', lastSale?.id], queryFn: () => api.pos.receipt(lastSale.id), enabled: Boolean(lastSale?.id) });

  return (
    <div className="space-y-6">
      <PageHeader icon={ShoppingCart} title="POS register" subtitle="Fast retail checkout connected to inventory, tax, payments and accounting." />

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-4">
          <Panel title="Register context" subtitle="Select store, register and open shift before selling.">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Store"><select className={inputClass} value={storeId} onChange={(e) => { setStoreId(e.target.value); setRegisterId(''); setShiftId(''); }}><option value="">Select store</option>{stores.map((s) => <option key={s.id} value={s.id}>{s.name || s.code || s.id}</option>)}</select></Field>
              <Field label="Register"><select className={inputClass} value={registerId} onChange={(e) => { setRegisterId(e.target.value); setShiftId(''); }}><option value="">Select register</option>{registers.map((r) => <option key={r.id} value={r.id}>{r.name || r.code || r.id}</option>)}</select></Field>
              <Field label="Open shift"><select className={inputClass} value={shiftId} onChange={(e) => setShiftId(e.target.value)}><option value="">Select shift</option>{shifts.map((s) => <option key={s.id} value={s.id}>{s.shift_no || s.code || s.id}</option>)}</select></Field>
            </div>
          </Panel>

          <Panel title="Product search" subtitle="Search by item name, SKU or barcode.">
            <div className="mb-3 flex gap-2">
              <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className={`${inputClass} pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search item, SKU or barcode" /></div>
              <button className={softBtn} type="button"><Barcode className="h-4 w-4" /> Scan</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <button key={productId(product)} type="button" onClick={() => addToCart(product)} className="rounded-2xl border border-slate-200 bg-white p-3 text-left hover:border-brand-primary hover:shadow-sm">
                  <div className="font-medium text-slate-900">{productName(product)}</div>
                  <div className="mt-1 text-xs text-slate-500">{productSku(product) || 'No SKU'}</div>
                  <div className="mt-3 flex items-center justify-between"><span className="text-sm font-semibold text-brand-deep">{money(productPrice(product))}</span><Plus className="h-4 w-4 text-brand-primary" /></div>
                </button>
              ))}
            </div>
            {!products.length ? <Empty>No products found. Add items under Inventory or refine your search.</Empty> : null}
          </Panel>
        </div>

        <Panel title="Cart" subtitle="Review quantities, payment and receipt." actions={cart.length ? <button className={softBtn} onClick={() => setCart([])}><X className="h-4 w-4" /> Clear</button> : null}>
          <div className="space-y-3">
            {cart.length ? cart.map((line) => (
              <div key={line.item_id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3"><div><div className="font-medium text-slate-900">{line.name}</div><div className="text-xs text-slate-500">{line.sku || line.item_id}</div></div><button type="button" onClick={() => setQty(line.item_id, 0)} className="text-slate-400 hover:text-rose-600"><X className="h-4 w-4" /></button></div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1"><button className={softBtn} onClick={() => setQty(line.item_id, Number(line.quantity) - 1)}><Minus className="h-3 w-3" /></button><input className="w-16 rounded-xl border border-slate-200 px-2 py-2 text-center text-sm" value={line.quantity} onChange={(e) => setQty(line.item_id, e.target.value)} /><button className={softBtn} onClick={() => setQty(line.item_id, Number(line.quantity) + 1)}><Plus className="h-3 w-3" /></button></div>
                  <div className="text-right"><div className="text-xs text-slate-500">Line total</div><div className="font-semibold text-slate-900">{money(Number(line.quantity) * Number(line.unit_price))}</div></div>
                </div>
              </div>
            )) : <Empty>Cart is empty.</Empty>}

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              <div className="mt-2 flex justify-between text-lg font-semibold"><span>Total</span><span>{money(total)}</span></div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Payment method"><select className={inputClass} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="cash">Cash</option><option value="card">Card</option><option value="momo">Mobile money</option><option value="bank_transfer">Bank transfer</option><option value="store_credit">Store credit</option></select></Field>
              <Field label="Amount tendered"><input className={inputClass} value={amountTendered} onChange={(e) => setAmountTendered(e.target.value)} placeholder="0.00" /></Field>
            </div>
            <div className="flex justify-between rounded-xl border border-slate-200 p-3 text-sm"><span>Change due</span><span className="font-semibold">{money(Math.max(0, changeDue))}</span></div>
            <button className={btnClass} type="button" disabled={createSale.isPending || !cart.length} onClick={() => createSale.mutate()}><CreditCard className="h-4 w-4" /> Complete sale</button>
          </div>

          {lastSale ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between"><div><div className="font-semibold text-emerald-900">Last sale completed</div><div className="text-xs text-emerald-700">{lastSale.receipt_no || lastSale.sale_no || lastSale.id}</div></div><Badge>{lastSale.status || 'completed'}</Badge></div>
              <div className="mt-3 flex flex-wrap gap-2"><button className={softBtn} onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</button>{lastSale.id ? <button className={softBtn} onClick={() => postSale.mutate(lastSale.id)}><DollarSign className="h-4 w-4" /> Post</button> : null}</div>
              {receiptQ.data ? <pre className="mt-3 max-h-40 overflow-auto rounded-xl bg-white p-3 text-xs text-slate-600">{JSON.stringify(receiptQ.data, null, 2)}</pre> : null}
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
