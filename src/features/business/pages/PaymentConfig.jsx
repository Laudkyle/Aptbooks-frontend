import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Edit, Plus, Save, Trash2, Wallet, Clock, DollarSign, Settings, Eye } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makePaymentConfigApi } from '../api/paymentConfig.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { toOptions, NONE_OPTION } from '../../../shared/utils/options.js';

import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';

export default function PaymentConfig() {
  const { http } = useApi();
  const api = useMemo(() => makePaymentConfigApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  
  const [activeTab, setActiveTab] = useState('terms');

  const { data: terms, isLoading: termsLoading, isError: termsError } = useQuery({
    queryKey: qk.paymentTerms,
    queryFn: () => api.listPaymentTerms()
  });

  const { data: methods, isLoading: methodsLoading, isError: methodsError } = useQuery({
    queryKey: qk.paymentMethods,
    queryFn: () => api.listPaymentMethods()
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: qk.paymentSettings,
    queryFn: () => api.getPaymentSettings()
  });

  const { data: accountsRaw } = useQuery({
    queryKey: ['coa.accounts.list'],
    queryFn: async () => coaApi.list({ limit: 500 }),
    staleTime: 60_000
  });

  // Create a map of account ID to account object for quick lookup
  const accountsMap = useMemo(() => {
    if (!accountsRaw) return {};
    const accounts = Array.isArray(accountsRaw) ? accountsRaw : (accountsRaw.data || []);
    return accounts.reduce((map, account) => {
      if (account.id) {
        map[account.id] = account;
      }
      return map;
    }, {});
  }, [accountsRaw]);

  const accountOptions = useMemo(() => {
    const opts = toOptions(accountsRaw, {
      valueKey: 'id',
      label: (a) => `${a.code ?? ''} ${a.name ?? ''}`.trim() || a.id
    });
    return [NONE_OPTION, ...opts];
  }, [accountsRaw]);

  const { data: paymentMethodsRaw } = useQuery({
    queryKey: qk.paymentMethods,
    queryFn: () => api.listPaymentMethods(),
    staleTime: 60_000
  });

  // Create a map of payment method ID to payment method object
  const paymentMethodsMap = useMemo(() => {
    if (!paymentMethodsRaw) return {};
    const methods = Array.isArray(paymentMethodsRaw) ? paymentMethodsRaw : (paymentMethodsRaw.data || []);
    return methods.reduce((map, method) => {
      if (method.id) {
        map[method.id] = method;
      }
      return map;
    }, {});
  }, [paymentMethodsRaw]);

  const paymentMethodOptions = useMemo(() => {
    const opts = toOptions(paymentMethodsRaw, {
      valueKey: 'id',
      label: (m) => `${m.name ?? ''} (${m.code ?? ''})`.trim() || m.id
    });
    return [NONE_OPTION, ...opts];
  }, [paymentMethodsRaw]);

  const [termOpen, setTermOpen] = useState(false);
  const [termEditOpen, setTermEditOpen] = useState(false);
  const [methodEditOpen, setMethodEditOpen] = useState(false);
  const [editingTermId, setEditingTermId] = useState(null);
  const [editingMethodId, setEditingMethodId] = useState(null);
  
  const [term, setTerm] = useState({ 
    name: '', 
    net_days: 0, 
    discount_days: null, 
    discount_rate: null, 
    isDefault: false, 
    status: 'active' 
  });
  
  const [termEdit, setTermEdit] = useState({ 
    name: '', 
    net_days: 0, 
    discount_days: null, 
    discount_rate: null, 
    isDefault: false, 
    status: 'active' 
  });
  
  const [methodEdit, setMethodEdit] = useState({ 
    name: '', 
    code: '', 
    description: '', 
    status: 'active' 
  });

  const createTerm = useMutation({
    mutationFn: (body) => api.createPaymentTerm(body),
    onSuccess: () => {
      toast.success('Payment term created');
      qc.invalidateQueries({ queryKey: qk.paymentTerms });
      setTermOpen(false);
      setTerm({ 
        name: '', 
        net_days: 0, 
        discount_days: null, 
        discount_rate: null, 
        isDefault: false, 
        status: 'active' 
      });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to create')
  });

  const updateTerm = useMutation({
    mutationFn: ({ id, body }) => api.updatePaymentTerm(id, body),
    onSuccess: () => {
      toast.success('Payment term updated');
      qc.invalidateQueries({ queryKey: qk.paymentTerms });
      setTermEditOpen(false);
      setEditingTermId(null);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to update')
  });

  const deleteTerm = useMutation({
    mutationFn: (id) => api.deletePaymentTerm(id),
    onSuccess: () => {
      toast.success('Payment term deleted');
      qc.invalidateQueries({ queryKey: qk.paymentTerms });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to delete')
  });

  const updateMethod = useMutation({
    mutationFn: ({ id, body }) => api.updatePaymentMethod(id, body),
    onSuccess: () => {
      toast.success('Payment method updated');
      qc.invalidateQueries({ queryKey: qk.paymentMethods });
      setMethodEditOpen(false);
      setEditingMethodId(null);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to update')
  });

  const deleteMethod = useMutation({
    mutationFn: (id) => api.deletePaymentMethod(id),
    onSuccess: () => {
      toast.success('Payment method deleted');
      qc.invalidateQueries({ queryKey: qk.paymentMethods });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to delete')
  });

  const saveSettings = useMutation({
    mutationFn: (body) => api.setPaymentSettings(body),
    onSuccess: () => {
      toast.success('Payment settings saved');
      qc.invalidateQueries({ queryKey: qk.paymentSettings });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to save')
  });

  const [settingsDraft, setSettingsDraft] = useState({});
  React.useEffect(() => {
    if (settings) setSettingsDraft(settings);
  }, [settings]);

  // Helper function to get account display info
  const getAccountDisplay = (accountId) => {
    if (!accountId) return null;
    const account = accountsMap[accountId];
    if (!account) return null;
    return {
      code: account.code || 'N/A',
      name: account.name || 'Unknown Account',
      fullName: `${account.code || ''} ${account.name || ''}`.trim(),
      id: account.id
    };
  };

  // Helper function to get payment method display info
  const getPaymentMethodDisplay = (methodId) => {
    if (!methodId) return null;
    const method = paymentMethodsMap[methodId];
    if (!method) return null;
    return {
      name: method.name || 'Unknown Method',
      code: method.code || 'N/A',
      fullName: `${method.name || ''} (${method.code || ''})`.trim(),
      id: method.id
    };
  };

  const toIntOrNull = (v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (!s) return null;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(s)) return s.toLowerCase();
    const n = Number(s);
    if (Number.isFinite(n) && Number.isInteger(n)) return n;
    return null;
  };

  const settingsPayload = (draft) => ({
    arUnappliedAccountId: toIntOrNull(draft?.arUnappliedAccountId),
    arDiscountAccountId: toIntOrNull(draft?.arDiscountAccountId),
    apPrepaymentsAccountId: toIntOrNull(draft?.apPrepaymentsAccountId),
    apDiscountIncomeAccountId: toIntOrNull(draft?.apDiscountIncomeAccountId),
    onlineCashAccountId: toIntOrNull(draft?.onlineCashAccountId),
    onlinePaymentMethodId: toIntOrNull(draft?.onlinePaymentMethodId)
  });

  const termsRows = React.useMemo(() => {
    if (!terms) return [];
    if (Array.isArray(terms)) return terms;
    if (terms?.data && Array.isArray(terms.data)) return terms.data;
    return [];
  }, [terms]);

  const methodsRows = React.useMemo(() => {
    if (!methods) return [];
    if (Array.isArray(methods)) return methods;
    if (methods?.data && Array.isArray(methods.data)) return methods.data;
    return [];
  }, [methods]);

  const isLoading = termsLoading || methodsLoading || settingsLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* QuickBooks Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Payment Settings</h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Manage payment terms, methods, and accounting configurations
              </p>
            </div>
            {activeTab === 'terms' && (
              <button
                onClick={() => setTermOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Payment Term
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6">
            {[
              { key: 'terms', label: 'Payment Terms', icon: Clock },
              { key: 'methods', label: 'Payment Methods', icon: Wallet },
              { key: 'settings', label: 'Account Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors inline-flex items-center gap-2 ${
                    activeTab === tab.key
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-sm text-gray-600">Loading payment configuration...</div>
          </div>
        ) : (termsError || methodsError) ? (
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-12 text-center">
            <div className="text-sm text-red-600">
              {termsError ? 'Failed to load payment terms' : 'Failed to load payment methods'}
            </div>
          </div>
        ) : (
          <>
            {/* Payment Terms Tab */}
            {activeTab === 'terms' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">Payment Terms</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Define standard payment terms for invoices and bills
                  </p>
                </div>

                <div className="p-6">
                  {termsRows.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Terms</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Get started by creating your first payment term
                      </p>
                      <button
                        onClick={() => setTermOpen(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                      >
                        Create Payment Term
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Term Name
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Net Days
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Discount Days
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Discount Rate
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {termsRows.map((t) => (
                            <tr key={t.id ?? t.name} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                                  {t.isDefault && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      Default
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm text-gray-900">{t.net_days} days</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm text-gray-600">
                                  {t.discount_days ? `${t.discount_days} days` : '—'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm text-gray-900">
                                  {t.discount_rate != null ? `${Math.round(Number(t.discount_rate) * 100)}%` : '—'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  (t.status ?? 'active') === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {t.status ?? 'active'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingTermId(t.id);
                                      setTermEdit({
                                        name: t.name ?? '',
                                        net_days: t.net_days ?? 0,
                                        discount_days: t.discount_days ?? null,
                                        discount_rate: t.discount_rate ?? null,
                                        isDefault: !!t.isDefault,
                                        status: t.status ?? 'active'
                                      });
                                      setTermEditOpen(true);
                                    }}
                                    disabled={!t.id}
                                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!t.id) return;
                                      const ok = window.confirm(`Delete payment term "${t.name}"?`);
                                      if (ok) deleteTerm.mutate(t.id);
                                    }}
                                    disabled={!t.id || deleteTerm.isPending}
                                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Methods Tab */}
            {activeTab === 'methods' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Configure available payment methods for transactions
                  </p>
                </div>

                <div className="p-6">
                  {methodsRows.length === 0 ? (
                    <div className="text-center py-12">
                      <Wallet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Methods</h3>
                      <p className="text-sm text-gray-600">
                        Payment methods are managed by your system administrator
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {methodsRows.map((m) => (
                        <div key={m.id ?? m.code} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <Wallet className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{m.name}</div>
                                <div className="text-xs text-gray-500 font-mono">{m.code}</div>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              (m.status ?? 'active') === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {m.status ?? 'active'}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-4 min-h-[40px]">
                            {m.description || 'No description'}
                          </p>

                          <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                            <button
                              onClick={() => {
                                setEditingMethodId(m.id);
                                setMethodEdit({
                                  name: m.name ?? '',
                                  code: m.code ?? '',
                                  description: m.description ?? '',
                                  status: m.status ?? 'active'
                                });
                                setMethodEditOpen(true);
                              }}
                              disabled={!m.id}
                              className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (!m.id) return;
                                const ok = window.confirm(`Delete payment method "${m.name}"?`);
                                if (ok) deleteMethod.mutate(m.id);
                              }}
                              disabled={!m.id || deleteMethod.isPending}
                              className="px-3 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Account Settings Tab */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Account Mappings</h2>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Configure default accounts for payment transactions
                    </p>
                  </div>
                  <button
                    onClick={() => saveSettings.mutate(settingsPayload(settingsDraft))}
                    disabled={saveSettings.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saveSettings.isPending ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* AR Section */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <h3 className="text-sm font-semibold text-gray-900">Accounts Receivable</h3>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unapplied Receipts Account
                        </label>
                        <Select
                          value={settingsDraft?.arUnappliedAccountId ?? ''}
                          onChange={(e) => setSettingsDraft((s) => ({ ...s, arUnappliedAccountId: e.target.value || null }))}
                          options={accountOptions}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Default account for customer receipts not yet applied to invoices
                        </p>
                        
                        {/* Show currently selected account */}
                        {settingsDraft?.arUnappliedAccountId && (
                          <div className="mt-3 p-3 bg-white border border-gray-200 rounded-md">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {getAccountDisplay(settingsDraft.arUnappliedAccountId)?.fullName || 'Unknown Account'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Currently selected
                                </div>
                              </div>
                              <Eye className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Early Payment Discount Account
                        </label>
                        <Select
                          value={settingsDraft?.arDiscountAccountId ?? ''}
                          onChange={(e) => setSettingsDraft((s) => ({ ...s, arDiscountAccountId: e.target.value || null }))}
                          options={accountOptions}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Account for recording customer payment discounts
                        </p>
                        
                        {/* Show currently selected account */}
                        {settingsDraft?.arDiscountAccountId && (
                          <div className="mt-3 p-3 bg-white border border-gray-200 rounded-md">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {getAccountDisplay(settingsDraft.arDiscountAccountId)?.fullName || 'Unknown Account'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Currently selected
                                </div>
                              </div>
                              <Eye className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AP Section */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <h3 className="text-sm font-semibold text-gray-900">Accounts Payable</h3>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Prepayments Account
                        </label>
                        <Select
                          value={settingsDraft?.apPrepaymentsAccountId ?? ''}
                          onChange={(e) => setSettingsDraft((s) => ({ ...s, apPrepaymentsAccountId: e.target.value || null }))}
                          options={accountOptions}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Default account for vendor prepayments
                        </p>
                        
                        {/* Show currently selected account */}
                        {settingsDraft?.apPrepaymentsAccountId && (
                          <div className="mt-3 p-3 bg-white border border-gray-200 rounded-md">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {getAccountDisplay(settingsDraft.apPrepaymentsAccountId)?.fullName || 'Unknown Account'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Currently selected
                                </div>
                              </div>
                              <Eye className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Discount Income Account
                        </label>
                        <Select
                          value={settingsDraft?.apDiscountIncomeAccountId ?? ''}
                          onChange={(e) => setSettingsDraft((s) => ({ ...s, apDiscountIncomeAccountId: e.target.value || null }))}
                          options={accountOptions}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Account for recording vendor payment discounts received
                        </p>
                        
                        {/* Show currently selected account */}
                        {settingsDraft?.apDiscountIncomeAccountId && (
                          <div className="mt-3 p-3 bg-white border border-gray-200 rounded-md">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {getAccountDisplay(settingsDraft.apDiscountIncomeAccountId)?.fullName || 'Unknown Account'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Currently selected
                                </div>
                              </div>
                              <Eye className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Online Payments Section */}
                    <div className="md:col-span-2 space-y-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                        <Wallet className="h-5 w-5 text-purple-600" />
                        <h3 className="text-sm font-semibold text-gray-900">Online Payments</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Online Cash Account
                          </label>
                          <Select
                            value={settingsDraft?.onlineCashAccountId ?? ''}
                            onChange={(e) => setSettingsDraft((s) => ({ ...s, onlineCashAccountId: e.target.value || null }))}
                            options={accountOptions}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Bank account for online payment deposits
                          </p>
                          
                          {/* Show currently selected account */}
                          {settingsDraft?.onlineCashAccountId && (
                            <div className="mt-3 p-3 bg-white border border-gray-200 rounded-md">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {getAccountDisplay(settingsDraft.onlineCashAccountId)?.fullName || 'Unknown Account'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Currently selected
                                  </div>
                                </div>
                                <Eye className="h-4 w-4 text-gray-400" />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Default Online Payment Method
                          </label>
                          <Select
                            value={settingsDraft?.onlinePaymentMethodId ?? ''}
                            onChange={(e) => setSettingsDraft((s) => ({ ...s, onlinePaymentMethodId: e.target.value || null }))}
                            options={paymentMethodOptions}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Default method for online payment processing
                          </p>
                          
                          {/* Show currently selected payment method */}
                          {settingsDraft?.onlinePaymentMethodId && (
                            <div className="mt-3 p-3 bg-white border border-gray-200 rounded-md">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {getPaymentMethodDisplay(settingsDraft.onlinePaymentMethodId)?.fullName || 'Unknown Method'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Currently selected
                                  </div>
                                </div>
                                <Eye className="h-4 w-4 text-gray-400" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Summary Section */}
                    <div className="md:col-span-2 mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Current Configuration Summary</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* AR Summary */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Accounts Receivable</h4>
                            <div className="text-sm">
                              <div className="flex justify-between py-1">
                                <span className="text-gray-600">Unapplied Receipts:</span>
                                <span className="font-medium text-gray-900">
                                  {settingsDraft?.arUnappliedAccountId 
                                    ? getAccountDisplay(settingsDraft.arUnappliedAccountId)?.fullName || 'Not set'
                                    : 'Not set'}
                                </span>
                              </div>
                              <div className="flex justify-between py-1">
                                <span className="text-gray-600">Discount Account:</span>
                                <span className="font-medium text-gray-900">
                                  {settingsDraft?.arDiscountAccountId 
                                    ? getAccountDisplay(settingsDraft.arDiscountAccountId)?.fullName || 'Not set'
                                    : 'Not set'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* AP Summary */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Accounts Payable</h4>
                            <div className="text-sm">
                              <div className="flex justify-between py-1">
                                <span className="text-gray-600">Prepayments Account:</span>
                                <span className="font-medium text-gray-900">
                                  {settingsDraft?.apPrepaymentsAccountId 
                                    ? getAccountDisplay(settingsDraft.apPrepaymentsAccountId)?.fullName || 'Not set'
                                    : 'Not set'}
                                </span>
                              </div>
                              <div className="flex justify-between py-1">
                                <span className="text-gray-600">Discount Income:</span>
                                <span className="font-medium text-gray-900">
                                  {settingsDraft?.apDiscountIncomeAccountId 
                                    ? getAccountDisplay(settingsDraft.apDiscountIncomeAccountId)?.fullName || 'Not set'
                                    : 'Not set'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Online Payments Summary */}
                          <div className="md:col-span-2 space-y-2 pt-4 border-t border-gray-200">
                            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Online Payments</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="text-sm">
                                <div className="flex justify-between py-1">
                                  <span className="text-gray-600">Cash Account:</span>
                                  <span className="font-medium text-gray-900">
                                    {settingsDraft?.onlineCashAccountId 
                                      ? getAccountDisplay(settingsDraft.onlineCashAccountId)?.fullName || 'Not set'
                                      : 'Not set'}
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm">
                                <div className="flex justify-between py-1">
                                  <span className="text-gray-600">Payment Method:</span>
                                  <span className="font-medium text-gray-900">
                                    {settingsDraft?.onlinePaymentMethodId 
                                      ? getPaymentMethodDisplay(settingsDraft.onlinePaymentMethodId)?.fullName || 'Not set'
                                      : 'Not set'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Payment Term Modal */}
      <Modal open={termOpen} onClose={() => setTermOpen(false)} title="New Payment Term">
        <div className="space-y-4">
          <Input 
            label="Term Name" 
            placeholder="e.g., Net 30"
            value={term.name} 
            onChange={(e) => setTerm((s) => ({ ...s, name: e.target.value }))} 
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Net Days"
              type="number"
              placeholder="30"
              value={term.net_days}
              onChange={(e) => setTerm((s) => ({ ...s, net_days: Number(e.target.value) }))}
            />
            <Input
              label="Discount Days (Optional)"
              type="number"
              placeholder="10"
              value={term.discount_days ?? ''}
              onChange={(e) => setTerm((s) => ({ ...s, discount_days: e.target.value === '' ? null : Number(e.target.value) }))}
            />
          </div>

          <Input
            label="Discount Rate (Optional)"
            type="number"
            step="0.01"
            placeholder="0.02 (for 2%)"
            value={term.discount_rate ?? ''}
            onChange={(e) => setTerm((s) => ({ ...s, discount_rate: e.target.value === '' ? null : Number(e.target.value) }))}
          />

          <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
            <input 
              type="checkbox" 
              checked={term.isDefault} 
              onChange={(e) => setTerm((s) => ({ ...s, isDefault: e.target.checked }))}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">Set as default payment term</span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => setTermOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => createTerm.mutate(term)}
            disabled={createTerm.isPending || !term.name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {createTerm.isPending ? 'Creating...' : 'Create Term'}
          </button>
        </div>
      </Modal>

      {/* Edit Payment Term Modal */}
      <Modal
        open={termEditOpen}
        onClose={() => {
          setTermEditOpen(false);
          setEditingTermId(null);
        }}
        title="Edit Payment Term"
      >
        <div className="space-y-4">
          <Input 
            label="Term Name" 
            value={termEdit.name} 
            onChange={(e) => setTermEdit((s) => ({ ...s, name: e.target.value }))} 
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Net Days"
              type="number"
              value={termEdit.net_days}
              onChange={(e) => setTermEdit((s) => ({ ...s, net_days: Number(e.target.value || 0) }))}
            />
            <Input
              label="Discount Days (Optional)"
              type="number"
              value={termEdit.discount_days ?? ''}
              onChange={(e) => setTermEdit((s) => ({ ...s, discount_days: e.target.value === '' ? null : Number(e.target.value) }))}
            />
          </div>

          <Input
            label="Discount Rate (Optional)"
            type="number"
            step="0.01"
            value={termEdit.discount_rate ?? ''}
            onChange={(e) => setTermEdit((s) => ({ ...s, discount_rate: e.target.value === '' ? null : Number(e.target.value) }))}
          />

          <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={termEdit.isDefault}
              onChange={(e) => setTermEdit((s) => ({ ...s, isDefault: e.target.checked }))}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">Set as default payment term</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <Select
              value={termEdit.status}
              onChange={(e) => setTermEdit((s) => ({ ...s, status: e.target.value }))}
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' }
              ]}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => {
              setTermEditOpen(false);
              setEditingTermId(null);
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              updateTerm.mutate({
                id: editingTermId,
                body: {
                  name: termEdit.name || undefined,
                  net_days: typeof termEdit.net_days === 'number' ? termEdit.net_days : undefined,
                  discount_days: termEdit.discount_days,
                  discount_rate: termEdit.discount_rate,
                  isDefault: termEdit.isDefault,
                  status: termEdit.status || undefined
                }
              })
            }
            disabled={updateTerm.isPending || !editingTermId || !termEdit.name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {updateTerm.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      {/* Edit Payment Method Modal */}
      <Modal
        open={methodEditOpen}
        onClose={() => {
          setMethodEditOpen(false);
          setEditingMethodId(null);
        }}
        title="Edit Payment Method"
      >
        <div className="space-y-4">
          <Input 
            label="Method Name" 
            value={methodEdit.name} 
            onChange={(e) => setMethodEdit((s) => ({ ...s, name: e.target.value }))} 
          />
          
          <Input 
            label="Code" 
            value={methodEdit.code} 
            onChange={(e) => setMethodEdit((s) => ({ ...s, code: e.target.value }))} 
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={methodEdit.description}
              onChange={(e) => setMethodEdit((s) => ({ ...s, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Describe this payment method..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <Select
              value={methodEdit.status}
              onChange={(e) => setMethodEdit((s) => ({ ...s, status: e.target.value }))}
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' }
              ]}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => {
              setMethodEditOpen(false);
              setEditingMethodId(null);
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              updateMethod.mutate({
                id: editingMethodId,
                body: {
                  name: methodEdit.name || undefined,
                  code: methodEdit.code || undefined,
                  description: methodEdit.description || undefined,
                  status: methodEdit.status || undefined
                }
              })
            }
            disabled={updateMethod.isPending || !editingMethodId || !methodEdit.name.trim() || !methodEdit.code.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {updateMethod.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Modal>
    </div>
  );
}