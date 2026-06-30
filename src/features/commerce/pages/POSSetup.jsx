import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Plus, Settings, Smartphone } from 'lucide-react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { makeCommerceApi } from '../api/commerce.api.js';
import { makeInventoryApi } from '../../inventory/api/inventory.api.js';
import { Badge, Field, Panel, SimpleTable, dateish, rowsOf } from './_commerceUi.jsx';

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15';
const btnClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-deep disabled:opacity-50';
const softBtn = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50';

function compact(body) {
  return Object.fromEntries(Object.entries(body).filter(([, v]) => v !== '' && v !== null && v !== undefined));
}

export default function POSSetup() {
  const { http } = useApi();
  const api = useMemo(() => makeCommerceApi(http), [http]);
  const inventoryApi = useMemo(() => makeInventoryApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [storeForm, setStoreForm] = useState({ code: '', name: '', warehouseId: '' });
  const [registerForm, setRegisterForm] = useState({ storeId: '', code: '', name: '' });
  const [shiftForm, setShiftForm] = useState({ registerId: '', openingCashAmount: '0.00' });
  const [providerForm, setProviderForm] = useState({ provider: 'paystack', displayName: '', status: 'active' });
  const [deviceForm, setDeviceForm] = useState({ registerId: '', deviceName: '', deviceCode: '' });

  const storesQ = useQuery({ queryKey: ['commerce.stores'], queryFn: () => api.setup.stores() });
  const registersQ = useQuery({ queryKey: ['commerce.registers'], queryFn: () => api.setup.registers() });
  const shiftsQ = useQuery({ queryKey: ['commerce.shifts'], queryFn: () => api.shifts.list({ limit: 25 }) });
  const providersQ = useQuery({ queryKey: ['commerce.paymentProviders'], queryFn: () => api.setup.paymentProviders() });
  const devicesQ = useQuery({ queryKey: ['commerce.devices'], queryFn: () => api.setup.devices() });
  const warehousesQ = useQuery({ queryKey: ['inventory.warehouses'], queryFn: () => inventoryApi.listWarehouses() });

  const stores = rowsOf(storesQ.data);
  const registers = rowsOf(registersQ.data);
  const shifts = rowsOf(shiftsQ.data);
  const providers = rowsOf(providersQ.data);
  const devices = rowsOf(devicesQ.data);
  const warehouses = rowsOf(warehousesQ.data);

  const warehouseLabel = (warehouseId) => {
    const match = warehouses.find((w) => String(w.id) === String(warehouseId));
    if (!match) return warehouseId || '—';
    return [match.code, match.name].filter(Boolean).join(' — ') || match.id;
  };

  const createStore = useMutation({ mutationFn: () => api.setup.createStore(compact(storeForm)), onSuccess: () => { setStoreForm({ code: '', name: '', warehouseId: '' }); qc.invalidateQueries({ queryKey: ['commerce.stores'] }); toast.success?.('Store created.'); }, onError: (e) => toast.error?.(e?.message || 'Store could not be created.') });
  const createRegister = useMutation({ mutationFn: () => api.setup.createRegister(compact(registerForm)), onSuccess: () => { setRegisterForm({ storeId: '', code: '', name: '' }); qc.invalidateQueries({ queryKey: ['commerce.registers'] }); toast.success?.('Register created.'); }, onError: (e) => toast.error?.(e?.message || 'Register could not be created.') });
  const openShift = useMutation({ mutationFn: () => api.shifts.open(compact(shiftForm)), onSuccess: () => { setShiftForm({ registerId: '', openingCashAmount: '0.00' }); qc.invalidateQueries({ queryKey: ['commerce.shifts'] }); toast.success?.('Shift opened.'); }, onError: (e) => toast.error?.(e?.message || 'Shift could not be opened.') });
  const saveProvider = useMutation({ mutationFn: () => api.setup.savePaymentProvider(compact(providerForm)), onSuccess: () => { setProviderForm({ provider: 'paystack', displayName: '', status: 'active' }); qc.invalidateQueries({ queryKey: ['commerce.paymentProviders'] }); toast.success?.('Payment provider saved.'); }, onError: (e) => toast.error?.(e?.message || 'Provider could not be saved.') });
  const registerDevice = useMutation({ mutationFn: () => api.setup.registerDevice(compact(deviceForm)), onSuccess: () => { setDeviceForm({ registerId: '', deviceName: '', deviceCode: '' }); qc.invalidateQueries({ queryKey: ['commerce.devices'] }); toast.success?.('Device registered.'); }, onError: (e) => toast.error?.(e?.message || 'Device could not be registered.') });

  return (
    <div className="space-y-6">
      <PageHeader icon={Settings} title="POS setup" subtitle="Configure stores, registers, shifts, payment providers and cashier devices." />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Stores" subtitle="Stores link POS selling points to existing inventory warehouses." actions={<button className={btnClass} onClick={() => createStore.mutate()} disabled={createStore.isPending}><Plus className="h-4 w-4" /> Add store</button>}>
          <div className="mb-4 grid gap-3 md:grid-cols-3"><Field label="Code"><input className={inputClass} value={storeForm.code} onChange={(e) => setStoreForm((f) => ({ ...f, code: e.target.value }))} /></Field><Field label="Name"><input className={inputClass} value={storeForm.name} onChange={(e) => setStoreForm((f) => ({ ...f, name: e.target.value }))} /></Field><Field label="Warehouse"><select className={inputClass} value={storeForm.warehouseId} onChange={(e) => setStoreForm((f) => ({ ...f, warehouseId: e.target.value }))} disabled={warehousesQ.isLoading}><option value="">{warehousesQ.isLoading ? 'Loading warehouses…' : 'Select warehouse'}</option>{warehouses.map((w) => <option value={w.id} key={w.id}>{[w.code, w.name].filter(Boolean).join(' — ') || w.id}</option>)}</select></Field></div>
          <SimpleTable rows={stores} columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Store' }, { key: 'warehouseId', label: 'Warehouse', render: (r) => warehouseLabel(r.warehouseId) }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status || 'active'}</Badge> }]} />
        </Panel>

        <Panel title="Registers" subtitle="Registers identify tills, counters or mobile checkout points." actions={<button className={btnClass} onClick={() => createRegister.mutate()} disabled={createRegister.isPending}><Plus className="h-4 w-4" /> Add register</button>}>
          <div className="mb-4 grid gap-3 md:grid-cols-3"><Field label="Store"><select className={inputClass} value={registerForm.storeId} onChange={(e) => setRegisterForm((f) => ({ ...f, storeId: e.target.value }))}><option value="">Select store</option>{stores.map((s) => <option value={s.id} key={s.id}>{s.name || s.code}</option>)}</select></Field><Field label="Code"><input className={inputClass} value={registerForm.code} onChange={(e) => setRegisterForm((f) => ({ ...f, code: e.target.value }))} /></Field><Field label="Name"><input className={inputClass} value={registerForm.name} onChange={(e) => setRegisterForm((f) => ({ ...f, name: e.target.value }))} /></Field></div>
          <SimpleTable rows={registers} columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Register' }, { key: 'storeName', label: 'Store', render: (r) => r.storeName || r.storeCode || r.storeId || '—' }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status || 'active'}</Badge> }]} />
        </Panel>

        <Panel title="Shifts" subtitle="Open shifts before selling and close them with cash counts." actions={<button className={btnClass} onClick={() => openShift.mutate()} disabled={openShift.isPending}><Banknote className="h-4 w-4" /> Open shift</button>}>
          <div className="mb-4 grid gap-3 md:grid-cols-2"><Field label="Register"><select className={inputClass} value={shiftForm.registerId} onChange={(e) => setShiftForm((f) => ({ ...f, registerId: e.target.value }))}><option value="">Select register</option>{registers.map((r) => <option value={r.id} key={r.id}>{r.name || r.code}</option>)}</select></Field><Field label="Opening cash"><input className={inputClass} value={shiftForm.openingCashAmount} onChange={(e) => setShiftForm((f) => ({ ...f, openingCashAmount: e.target.value }))} /></Field></div>
          <SimpleTable rows={shifts} columns={[{ key: 'shiftNo', label: 'Shift' }, { key: 'registerName', label: 'Register', render: (r) => r.registerName || r.registerId }, { key: 'openedAt', label: 'Opened', render: (r) => dateish(r.openedAt || r.createdAt) }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }]} />
        </Panel>

        <Panel title="Devices & payments" subtitle="Register cashier devices and configure payment providers.">
          <div className="mb-4 grid gap-3 md:grid-cols-2"><Field label="Provider"><select className={inputClass} value={providerForm.provider} onChange={(e) => setProviderForm((f) => ({ ...f, provider: e.target.value }))}><option value="paystack">Paystack</option><option value="flutterwave">Flutterwave</option><option value="hubtel">Hubtel</option><option value="theteller">TheTeller</option><option value="manual_terminal">Manual terminal</option></select></Field><Field label="Display name"><input className={inputClass} value={providerForm.displayName} onChange={(e) => setProviderForm((f) => ({ ...f, displayName: e.target.value }))} /></Field></div>
          <button className={softBtn} onClick={() => saveProvider.mutate()}><Plus className="h-4 w-4" /> Save provider</button>
          <div className="mt-4"><SimpleTable rows={providers} columns={[{ key: 'provider', label: 'Provider' }, { key: 'displayName', label: 'Name' }, { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> }]} /></div>
          <div className="mt-6 grid gap-3 md:grid-cols-3"><Field label="Register"><select className={inputClass} value={deviceForm.registerId} onChange={(e) => setDeviceForm((f) => ({ ...f, registerId: e.target.value }))}><option value="">Select register</option>{registers.map((r) => <option value={r.id} key={r.id}>{r.name || r.code}</option>)}</select></Field><Field label="Device name"><input className={inputClass} value={deviceForm.deviceName} onChange={(e) => setDeviceForm((f) => ({ ...f, deviceName: e.target.value }))} /></Field><Field label="Device code"><input className={inputClass} value={deviceForm.deviceCode} onChange={(e) => setDeviceForm((f) => ({ ...f, deviceCode: e.target.value }))} /></Field></div>
          <button className={`${softBtn} mt-3`} onClick={() => registerDevice.mutate()}><Smartphone className="h-4 w-4" /> Register device</button>
          <div className="mt-4"><SimpleTable rows={devices} columns={[{ key: 'deviceCode', label: 'Code' }, { key: 'deviceName', label: 'Device' }, { key: 'registerId', label: 'Register' }, { key: 'lastSeenAt', label: 'Last seen', render: (r) => dateish(r.lastSeenAt) }]} /></div>
        </Panel>
      </div>
    </div>
  );
}
