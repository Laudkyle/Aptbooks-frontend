import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Save, User, Mail, Phone, FileText } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makePartnersApi } from '../api/partners.api.js';
import { makePaymentConfigApi } from '../api/paymentConfig.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

export default function PartnerCreate() {
  const { http } = useApi();
  const api = useMemo(() => makePartnersApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const paymentConfigApi = useMemo(() => makePaymentConfigApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialType = searchParams.get('type') === 'vendor' ? 'vendor' : 'customer';

  const [form, setForm] = useState({
    type: initialType,
    name: '',
    code: '',
    email: '',
    phone: '',
    status: 'active',
    defaultReceivableAccountId: '',
    defaultPayableAccountId: '',
    paymentTermsId: '',
    notes: ''
  });

  // Load chart of accounts
  const coaQuery = useQuery({
    queryKey: ['coa'],
    queryFn: () => coaApi.list()
  });

  // Load payment terms
  const paymentTermsQuery = useQuery({
    queryKey: ['paymentTerms'],
    queryFn: () => paymentConfigApi.listPaymentTerms()
  });

  const accounts = Array.isArray(coaQuery.data) ? coaQuery.data : coaQuery.data?.data ?? [];
  const paymentTerms = Array.isArray(paymentTermsQuery.data) ? paymentTermsQuery.data : paymentTermsQuery.data?.data ?? [];
  
  // Filter accounts by type
  const receivableAccounts = accounts.filter(acc => 
    acc.type?.toLowerCase().includes('receivable') || 
    acc.accountType?.toLowerCase().includes('receivable') ||
    acc.category?.toLowerCase().includes('receivable') ||
    acc.name?.toLowerCase().includes('receivable')
  );

  const payableAccounts = accounts.filter(acc => 
    acc.type?.toLowerCase().includes('payable') || 
    acc.accountType?.toLowerCase().includes('payable') ||
    acc.category?.toLowerCase().includes('payable') ||
    acc.name?.toLowerCase().includes('payable')
  );

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  // Handle type change - clear inappropriate account when switching
  const handleTypeChange = (newType) => {
    set('type', newType);
    if (newType === 'customer') {
      // Clear payable account when switching to customer
      set('defaultPayableAccountId', '');
    } else if (newType === 'vendor') {
      // Clear receivable account when switching to vendor
      set('defaultReceivableAccountId', '');
    }
  };

  const create = useMutation({
    mutationFn: async () => {
      // Backend validator expects uuid fields either omitted or valid UUID strings.
      const body = {
        type: form.type,
        name: form.name,
        code: form.code || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        status: form.status || undefined,
        defaultReceivableAccountId: form.defaultReceivableAccountId || undefined,
        defaultPayableAccountId: form.defaultPayableAccountId || undefined,
        paymentTermsId: form.paymentTermsId || undefined,
        notes: form.notes || undefined
      };
      return api.create(body);
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: qk.partners() });
      toast.success('Partner created successfully');
      const id = created?.id ?? created?.data?.id;
      if (id) navigate(ROUTES.businessPartnerDetail(id));
      else navigate(form.type === 'vendor' ? ROUTES.businessVendors : ROUTES.businessCustomers);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to create partner')
  });

  const isCustomer = form.type === 'customer';
  const isVendor = form.type === 'vendor';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="h-7 w-7 text-gray-700" />
                <h1 className="text-2xl font-bold text-gray-900">
                  New {isVendor ? 'Vendor' : 'Customer'}
                </h1>
              </div>
              <p className="text-sm text-gray-600">
                Create a new business partner profile
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                onClick={() => navigate(-1)}
                className="border-gray-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={() => create.mutate()}
                disabled={create.isPending || !form.name.trim()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {create.isPending ? 'Creating...' : 'Create Partner'}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="space-y-6">
          {/* Type and Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-5">Partner Type</h3>
            
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                >
                  <option value="customer">Customer</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-5">Basic Information</h3>
            
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    value={form.name} 
                    onChange={(e) => set('name', e.target.value)} 
                    placeholder="e.g., Acme Trading Ltd."
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">Minimum 2 characters required</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partner Code
                </label>
                <Input 
                  value={form.code} 
                  onChange={(e) => set('code', e.target.value)} 
                  placeholder="Optional identifier"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    type="email"
                    value={form.email} 
                    onChange={(e) => set('email', e.target.value)} 
                    placeholder="contact@example.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    type="tel"
                    value={form.phone} 
                    onChange={(e) => set('phone', e.target.value)} 
                    placeholder="+1 (555) 000-0000"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </label>
                {paymentTermsQuery.isLoading ? (
                  <div className="text-sm text-gray-500 py-2">Loading payment terms...</div>
                ) : (
                  <select
                    value={form.paymentTermsId}
                    onChange={(e) => set('paymentTermsId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                  >
                    <option value="">Select payment terms (optional)</option>
                    {paymentTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name || term.description || `Net ${term.netDays || term.net_days || 0}`}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-500 mt-1.5">Default payment terms for this partner</p>
              </div>
            </div>
          </div>

          {/* Accounting Defaults - Conditional based on type */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-5">Accounting Defaults</h3>
            
            <div className="grid gap-5 md:grid-cols-2">
              {/* Show Receivable Account only for Customers */}
              {isCustomer && (
                <div className={isCustomer ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Receivable Account
                  </label>
                  {coaQuery.isLoading ? (
                    <div className="text-sm text-gray-500 py-2">Loading accounts...</div>
                  ) : (
                    <select
                      value={form.defaultReceivableAccountId}
                      onChange={(e) => set('defaultReceivableAccountId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                    >
                      <option value="">Select an account (optional)</option>
                      {receivableAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code ? `${account.code} - ` : ''}{account.name || account.accountName || account.id}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">Used for customer invoices and receivables</p>
                </div>
              )}

              {/* Show Payable Account only for Vendors */}
              {isVendor && (
                <div className={isVendor ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Payable Account
                  </label>
                  {coaQuery.isLoading ? (
                    <div className="text-sm text-gray-500 py-2">Loading accounts...</div>
                  ) : (
                    <select
                      value={form.defaultPayableAccountId}
                      onChange={(e) => set('defaultPayableAccountId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                    >
                      <option value="">Select an account (optional)</option>
                      {payableAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code ? `${account.code} - ` : ''}{account.name || account.accountName || account.id}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">Used for vendor bills and payables</p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-5">Additional Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Textarea 
                  value={form.notes} 
                  onChange={(e) => set('notes', e.target.value)} 
                  placeholder="Add any additional notes or information about this partner..."
                  rows={4}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}