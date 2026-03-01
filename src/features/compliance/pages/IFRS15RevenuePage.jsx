import React, { useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  RefreshCw,
  FileText,
  Search,
  Calendar,
  DollarSign,
  Percent,
  Clock,
  Landmark,
  CreditCard,
  Receipt,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { makeIfrs15Api } from '../api/ifrs15.api.js';
import { makePartnersApi } from '../../business/api/partners.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return data?.items ?? data?.rows ?? [];
}

function defaultContractForm() {
  return {
    code: '',
    name: '',
    customer_id: '',
    contract_date: '',
    start_date: '',
    end_date: '',
    currency: 'GHS',
    transaction_price: '',
    revenue_account_id: '',
    contract_asset_account_id: '',
    contract_liability_account_id: '',
    notes: ''
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IFRS15RevenuePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const toast = useToast();

  const api = useMemo(() => makeIfrs15Api(http), [http]);
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState(defaultContractForm());
  const [formErrors, setFormErrors] = useState({});

  // Queries
  const queryParams = useMemo(() => ({ 
    status: statusFilter || '' 
  }), [statusFilter]);

  const { 
    data, 
    isLoading, 
    isError, 
    error, 
    refetch,
    isFetching 
  } = useQuery({
    queryKey: qk.ifrs15Contracts(queryParams),
    queryFn: () => api.listContracts(queryParams),
    staleTime: 30000,
    retry: 2
  });
  
  // Currencies query
  const { data: currenciesData } = useQuery({
    queryKey: ['currencies.list'],
    queryFn: () => api.listCurrencies(),
    staleTime: 60000
  });

  const { data: customersData } = useQuery({
    queryKey: qk.partners({ type: 'customer', status: 'active' }),
    queryFn: () => partnersApi.list({ type: 'customer', status: 'active' }),
    staleTime: 60000
  });

  const { data: accountsData } = useQuery({
    queryKey: qk.coaAccounts({}),
    queryFn: () => coaApi.list({}),
    staleTime: 60000
  });

  const rows = useMemo(() => normalizeRows(data), [data]);
  const customerRows = useMemo(() => normalizeRows(customersData), [customersData]);
  const accountRows = useMemo(() => normalizeRows(accountsData), [accountsData]);
  const currencyRows = useMemo(() => normalizeRows(currenciesData), [currenciesData]);

  // Options for dropdowns
  const customerOptions = useMemo(
    () => [
      { value: '', label: '— Select customer —' },
      ...customerRows.map((c) => ({ 
        value: c.id, 
        label: c.name 
      }))
    ],
    [customerRows]
  );

  const accountOptions = useMemo(
    () => [
      { value: '', label: '— Select account —' },
      ...accountRows.map((a) => ({ 
        value: a.id, 
        label: `${a.code ?? ''} ${a.name ?? ''}`.trim() 
      }))
    ],
    [accountRows]
  );

  const currencyOptions = useMemo(
    () => [
      { value: 'GHS', label: 'GHS - Ghana Cedi' },
      ...currencyRows.map((c) => ({ 
        value: c.code || c, 
        label: c.code ? `${c.code} - ${c.name}` : c 
      }))
    ],
    [currencyRows]
  );

  // Filter contracts
  const filteredContracts = useMemo(() => {
    const searchLower = searchQuery.trim().toLowerCase();
    return rows.filter((contract) => {
      const matchesSearch = !searchLower || 
        (contract.name ?? '').toLowerCase().includes(searchLower) ||
        (contract.code ?? '').toLowerCase().includes(searchLower);
      const matchesStatus = !statusFilter || contract.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchQuery, statusFilter]);

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Contract name is required';
    }

    if (!formData.customer_id) {
      errors.customer_id = 'Customer is required';
    }

    if (!formData.contract_date) {
      errors.contract_date = 'Contract date is required';
    }

    if (!formData.start_date) {
      errors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      errors.end_date = 'End date is required';
    }

    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      errors.end_date = 'End date must be after start date';
    }

    const price = Number(formData.transaction_price);
    if (isNaN(price) || price < 0) {
      errors.transaction_price = 'Must be a non-negative number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Handlers
  const handleOpenCreateModal = useCallback(() => {
    setFormData(defaultContractForm());
    setFormErrors({});
    setCreateModalOpen(true);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    setFormData(defaultContractForm());
    setFormErrors({});
  }, []);

  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [formErrors]);

  const handleRefresh = useCallback(() => {
    refetch();
    toast.success('Contracts refreshed');
  }, [refetch, toast]);

  // Build submission payload
  const buildPayload = useCallback(() => ({
    code: formData.code.trim() || undefined,
    name: formData.name.trim(),
    customer_id: formData.customer_id || undefined,
    contract_date: formData.contract_date,
    start_date: formData.start_date,
    end_date: formData.end_date,
    currency: formData.currency,
    transaction_price: formData.transaction_price === '' ? undefined : Number(formData.transaction_price),
    revenue_account_id: formData.revenue_account_id || undefined,
    contract_asset_account_id: formData.contract_asset_account_id || undefined,
    contract_liability_account_id: formData.contract_liability_account_id || undefined,
    notes: formData.notes.trim() || undefined
  }), [formData]);

  // Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!validateForm()) throw new Error('Please fix validation errors');
      return api.createContract(buildPayload());
    },
    onSuccess: (created) => {
      toast.success('Contract created successfully');
      handleCloseCreateModal();
      qc.invalidateQueries({ queryKey: qk.ifrs15Contracts(queryParams) });
      const id = created?.id ?? created?.data?.id;
      if (id) navigate(ROUTES.complianceIFRS15ContractDetail(id));
    },
    onError: (err) => {
      const message = err?.response?.data?.error ?? err?.message ?? 'Failed to create contract';
      toast.error(message);
    }
  });

  const handleCreateContract = useCallback(() => createMutation.mutate(), [createMutation]);

  // Loading state
  if (isLoading && rows.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="IFRS 15 Revenue Contracts"
          subtitle="Contract register, performance obligations, schedules, and posting"
          icon={FileText}
          actions={
            <Button leftIcon={Plus} onClick={handleOpenCreateModal}>
              New Contract
            </Button>
          }
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading contracts...</div>
          </div>
        </ContentCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="IFRS 15 Revenue Contracts"
        subtitle="Contract register, performance obligations, schedules, and posting"
        icon={FileText}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={RefreshCw}
              onClick={handleRefresh}
              disabled={isFetching}
            >
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              leftIcon={Plus}
              onClick={handleOpenCreateModal}
            >
              New Contract
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <ContentCard>
        <div className="flex items-center gap-2 mb-4">
          <Search className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-900">Search & Filter</span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Search Contracts"
            placeholder="Search by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={Search}
          />
          <Select
            label="Status Filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'draft', label: 'Draft' },
              { value: 'active', label: 'Active' },
              { value: 'closed', label: 'Closed' }
            ]}
          />
          <div className="flex items-end">
            <div className="text-xs text-slate-500">
              {filteredContracts.length} of {rows.length} {rows.length === 1 ? 'contract' : 'contracts'}
            </div>
          </div>
        </div>
      </ContentCard>

      {/* Contracts Table */}
      <ContentCard>
        <div className="mb-4">
          <div className="text-base font-semibold text-slate-900">Contract Register</div>
          <div className="mt-1 text-sm text-slate-500">
            View and manage all IFRS 15 revenue contracts
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-sm font-medium text-slate-900">Failed to load contracts</div>
            <div className="text-sm text-slate-500">{error?.message ?? 'An error occurred'}</div>
            <Button variant="outline" onClick={handleRefresh} className="mt-2">
              Retry
            </Button>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <div className="text-sm font-medium text-slate-900 mb-1">
              {searchQuery || statusFilter ? 'No contracts match your filters' : 'No contracts yet'}
            </div>
            <div className="text-sm text-slate-500 mb-4">
              {searchQuery || statusFilter
                ? 'Try adjusting your search or filters'
                : 'Create your first revenue contract to begin scheduling and posting'
              }
            </div>
            <Button leftIcon={Plus} onClick={handleOpenCreateModal} size="sm">
              Create Contract
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contract</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contract Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">End Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <Link
                          to={ROUTES.complianceIFRS15ContractDetail(contract.id)}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {contract.name ?? '—'}
                        </Link>
                        {contract.code && (
                          <div className="text-xs text-slate-500 mt-1">{contract.code}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {contract.customer_name ?? contract.customer?.name ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        tone={
                          contract.status === 'active' ? 'success' :
                          contract.status === 'draft' ? 'warning' : 'muted'
                        }
                        className="inline-flex items-center gap-1.5"
                      >
                        {contract.status === 'active' ? <CheckCircle className="h-3 w-3" /> : 
                         contract.status === 'draft' ? <FileText className="h-3 w-3" /> : 
                         <XCircle className="h-3 w-3" />}
                        {contract.status ?? 'draft'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {contract.contract_date ? new Date(contract.contract_date).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {contract.start_date ? new Date(contract.start_date).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-mono text-sm text-slate-700">
                          {contract.transaction_price ? 
                            Number(contract.transaction_price).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            }) : '—'}
                        </span>
                        {contract.currency && (
                          <span className="text-xs text-slate-400 ml-1">{contract.currency}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={ROUTES.complianceIFRS15ContractDetail(contract.id)}>
                        <Button size="sm" variant="ghost" leftIcon={FileText}>
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>

      {/* Create Modal */}
      <Modal
        open={createModalOpen}
        onClose={handleCloseCreateModal}
        title="Create IFRS 15 Contract"
      >
        <div className="space-y-6">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <div className="font-medium mb-1">New Revenue Contract</div>
                <div className="text-blue-700">
                  Enter contract details and account mappings for IFRS 15 compliance
                </div>
              </div>
            </div>
          </div>

          {/* Contract Details */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              Contract Details
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Contract Code"
                value={formData.code}
                onChange={(e) => handleFieldChange('code', e.target.value)}
                placeholder="e.g., REV-001"
                leftIcon={FileText}
              />
              <Input
                label="Contract Name"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="e.g., Annual Service Agreement"
                required
                error={formErrors.name}
                leftIcon={FileText}
              />
              <Select
                label="Customer"
                value={formData.customer_id}
                onChange={(e) => handleFieldChange('customer_id', e.target.value)}
                options={customerOptions}
                required
                error={formErrors.customer_id}
                leftIcon={Users}
              />
              <Input
                label="Contract Date"
                type="date"
                value={formData.contract_date}
                onChange={(e) => handleFieldChange('contract_date', e.target.value)}
                required
                error={formErrors.contract_date}
                leftIcon={Calendar}
              />
              <Input
                label="Start Date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleFieldChange('start_date', e.target.value)}
                required
                error={formErrors.start_date}
                leftIcon={Calendar}
              />
              <Input
                label="End Date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleFieldChange('end_date', e.target.value)}
                required
                error={formErrors.end_date}
                leftIcon={Calendar}
              />
              <Select
                label="Currency"
                value={formData.currency}
                onChange={(e) => handleFieldChange('currency', e.target.value)}
                options={currencyOptions}
                leftIcon={DollarSign}
              />
              <Input
                label="Total Transaction Price"
                type="number"
                min="0"
                step="0.01"
                value={formData.transaction_price}
                onChange={(e) => handleFieldChange('transaction_price', e.target.value)}
                required
                error={formErrors.transaction_price}
                leftIcon={DollarSign}
                helperText="Total consideration from customer"
              />
            </div>
          </div>

          {/* Account Mappings */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-slate-500" />
              Account Mappings
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Revenue Account"
                value={formData.revenue_account_id}
                onChange={(e) => handleFieldChange('revenue_account_id', e.target.value)}
                options={accountOptions}
                leftIcon={Receipt}
              />
              <Select
                label="Contract Asset Account"
                value={formData.contract_asset_account_id}
                onChange={(e) => handleFieldChange('contract_asset_account_id', e.target.value)}
                options={accountOptions}
                leftIcon={CreditCard}
              />
              <Select
                label="Contract Liability Account"
                value={formData.contract_liability_account_id}
                onChange={(e) => handleFieldChange('contract_liability_account_id', e.target.value)}
                options={accountOptions}
                leftIcon={CreditCard}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              Notes
            </h3>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Internal description or audit context…"
              value={formData.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
            />
          </div>

          {/* Guidelines */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm text-amber-900">
              <div className="font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                IFRS 15 Guidelines
              </div>
              <ul className="text-xs space-y-1 text-amber-800">
                <li>• Revenue recognized when control transfers to customer</li>
                <li>• Identify separate performance obligations within the contract</li>
                <li>• Allocate transaction price based on standalone selling prices</li>
                <li>• Contract assets vs liabilities depend on timing of payment vs performance</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleCloseCreateModal}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateContract}
            loading={createMutation.isPending}
            disabled={!formData.name.trim() || !formData.customer_id || !formData.contract_date || !formData.start_date || !formData.end_date}
            leftIcon={Plus}
          >
            Create Contract
          </Button>
        </div>
      </Modal>
    </div>
  );
}