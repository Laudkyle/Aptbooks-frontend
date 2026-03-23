import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  RefreshCw,
  FileText,
  Search,
  X,
  AlertCircle,
  Calendar,
  DollarSign,
  Percent,
  Clock,
  FileSignature,
  Landmark,
  BookOpen,
  CreditCard,
  Receipt,
  PiggyBank,
  Edit2
} from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { makeIfrs16Api } from '../api/ifrs16.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeRows(data) {
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return data?.data ?? [];
}

function defaultLeaseForm() {
  return {
    code: '',
    name: '',
    commencement_date: '',
    term_months: '12',
    payment_amount: '',
    payments_per_year: '12',
    annual_discount_rate: '',
    payment_timing: 'arrears',
    rou_asset_account_id: '',
    lease_liability_account_id: '',
    interest_expense_account_id: '',
    depreciation_expense_account_id: '',
    accumulated_depreciation_account_id: '',
    cash_account_id: '',
    notes: ''
  };
}

// ─── Timing options ───────────────────────────────────────────────────────
const timingOptions = [
  { value: 'arrears', label: 'Arrears (end of period)' },
  { value: 'advance', label: 'Advance (start of period)' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function IFRS16LeasesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();

  const api = useMemo(() => makeIfrs16Api(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState(defaultLeaseForm());
  const [formErrors, setFormErrors] = useState({});

  /* Accounts for dropdowns */
  const { data: accountsRaw } = useQuery({
    queryKey: qk.coaAccounts({}),
    queryFn: () => coaApi.list({}),
    staleTime: 60_000,
  });

  const accounts = useMemo(() => {
    if (Array.isArray(accountsRaw)) return accountsRaw;
    return accountsRaw?.data ?? [];
  }, [accountsRaw]);

  const accountOptions = useMemo(
    () => accounts.map((a) => ({
      value: a.id,
      label: `${a.code ?? ''} ${a.name ?? ''}`.trim(),
    })),
    [accounts]
  );

  /* Leases list */
  const listQs = useMemo(() => ({ status: statusFilter || '' }), [statusFilter]);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: qk.ifrs16Leases(listQs),
    queryFn: () => api.listLeases(listQs),
    staleTime: 30000,
    retry: 2
  });

  const rows = useMemo(() => normalizeRows(data), [data]);

  // Filter leases
  const filteredLeases = useMemo(() => {
    const searchLower = searchQuery.trim().toLowerCase();
    return rows.filter((lease) => {
      const matchesSearch = !searchLower || 
        (lease.name ?? '').toLowerCase().includes(searchLower) ||
        (lease.code ?? '').toLowerCase().includes(searchLower);
      const matchesStatus = !statusFilter || lease.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchQuery, statusFilter]);

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Lease name is required';
    }

    if (!formData.commencement_date) {
      errors.commencement_date = 'Commencement date is required';
    }

    const term = Number(formData.term_months);
    if (isNaN(term) || term < 1 || !Number.isInteger(term)) {
      errors.term_months = 'Must be a positive integer';
    }

    const payment = Number(formData.payment_amount);
    if (isNaN(payment) || payment < 0) {
      errors.payment_amount = 'Must be a non-negative number';
    }

    const paymentsPerYear = Number(formData.payments_per_year);
    if (isNaN(paymentsPerYear) || paymentsPerYear < 1 || paymentsPerYear > 52) {
      errors.payments_per_year = 'Must be between 1 and 52';
    }

    const rate = Number(formData.annual_discount_rate);
    if (isNaN(rate) || rate < 0 || rate > 1) {
      errors.annual_discount_rate = 'Must be between 0 and 1';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Handlers
  const handleOpenCreateModal = useCallback(() => {
    setFormData(defaultLeaseForm());
    setFormErrors({});
    setCreateModalOpen(true);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    setFormData(defaultLeaseForm());
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
  }, [refetch]);

  // Build submission payload
  const buildPayload = useCallback(() => ({
    code: formData.code.trim() || undefined,
    name: formData.name.trim(),
    commencement_date: formData.commencement_date,
    term_months: Number(formData.term_months),
    payment_amount: Number(formData.payment_amount),
    payments_per_year: Number(formData.payments_per_year),
    annual_discount_rate: Number(formData.annual_discount_rate),
    payment_timing: formData.payment_timing,
    rou_asset_account_id: formData.rou_asset_account_id || undefined,
    lease_liability_account_id: formData.lease_liability_account_id || undefined,
    interest_expense_account_id: formData.interest_expense_account_id || undefined,
    depreciation_expense_account_id: formData.depreciation_expense_account_id || undefined,
    accumulated_depreciation_account_id: formData.accumulated_depreciation_account_id || undefined,
    cash_account_id: formData.cash_account_id || undefined,
    notes: formData.notes.trim() || undefined
  }), [formData]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!validateForm()) throw new Error('Please fix validation errors');
      return api.createLease(buildPayload());
    },
    onSuccess: (created) => {
      handleCloseCreateModal();
      qc.invalidateQueries({ queryKey: qk.ifrs16Leases(listQs) });
      if (created?.id) navigate(ROUTES.complianceIFRS16LeaseDetail(created.id));
    },
    onError: (err) => {
      const message = err?.response?.data?.error ?? err?.message ?? 'Failed to create lease';
      alert(message); // In production, use proper toast
    }
  });

  const handleCreateLease = useCallback(() => createMutation.mutate(), [createMutation]);

  // Keyboard close
  useEffect(() => {
    if (!createModalOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !createMutation.isPending) handleCloseCreateModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [createModalOpen, createMutation.isPending, handleCloseCreateModal]);

  // Loading state
  if (isLoading && rows.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="IFRS 16 Leases"
          subtitle="Lease register and amortization schedules"
          icon={FileText}
          actions={
            <Button leftIcon={Plus} onClick={handleOpenCreateModal}>
              New Lease
            </Button>
          }
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading leases...</div>
          </div>
        </ContentCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="IFRS 16 Leases"
        subtitle="Maintain lease register · Generate amortisation schedules · Post journals"
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
              New Lease
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
            label="Search Leases"
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
              { value: 'inactive', label: 'Inactive' }
            ]}
          />
          <div className="flex items-end">
            <div className="text-xs text-slate-500">
              {filteredLeases.length} of {rows.length} {rows.length === 1 ? 'lease' : 'leases'}
            </div>
          </div>
        </div>
      </ContentCard>

      {/* Leases Table */}
      <ContentCard>
        <div className="mb-4">
          <div className="text-base font-semibold text-slate-900">Lease Register</div>
          <div className="mt-1 text-sm text-slate-500">
            View and manage all IFRS 16 leases
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-sm font-medium text-slate-900">Failed to load leases</div>
            <div className="text-sm text-slate-500">{error?.message ?? 'An error occurred'}</div>
            <Button variant="outline" onClick={handleRefresh} className="mt-2">
              Retry
            </Button>
          </div>
        ) : filteredLeases.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <div className="text-sm font-medium text-slate-900 mb-1">
              {searchQuery || statusFilter ? 'No leases match your filters' : 'No leases yet'}
            </div>
            <div className="text-sm text-slate-500 mb-4">
              {searchQuery || statusFilter
                ? 'Try adjusting your search or filters'
                : 'Create your first lease to generate schedules and post initial recognition'
              }
            </div>
            <Button leftIcon={Plus} onClick={handleOpenCreateModal} size="sm">
              Create Lease
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Lease</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Commencement</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Term</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLeases.map((lease) => (
                  <tr
                    key={lease.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <Link
                          to={ROUTES.complianceIFRS16LeaseDetail(lease.id)}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {lease.name ?? '—'}
                        </Link>
                        {lease.code && (
                          <div className="text-xs text-slate-500 mt-1">{lease.code}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        tone={
                          lease.status === 'active' ? 'success' :
                          lease.status === 'draft' ? 'warning' : 'muted'
                        }
                        className="inline-flex items-center gap-1.5"
                      >
                        {lease.status ?? 'draft'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {lease.commencement_date ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {lease.term_months ?? '—'} months
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {lease.payment_amount ? Number(lease.payment_amount).toFixed(2) : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={ROUTES.complianceIFRS16LeaseDetail(lease.id)}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={Edit2}
                        >
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
        title="Create IFRS 16 Lease"
      >
        <div className="space-y-6">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <div className="font-medium mb-1">New Lease Configuration</div>
                <div className="text-blue-700">
                  Enter lease details and account mappings for IFRS 16 compliance
                </div>
              </div>
            </div>
          </div>

          {/* Lease Details Section */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-slate-500" />
              Lease Details
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Lease Code"
                value={formData.code}
                onChange={(e) => handleFieldChange('code', e.target.value)}
                placeholder="e.g., LSE-001"
                leftIcon={FileText}
              />
              <Input
                label="Lease Name"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="e.g., Head Office Lease"
                required
                error={formErrors.name}
                leftIcon={FileSignature}
              />
              <Input
                label="Commencement Date"
                type="date"
                value={formData.commencement_date}
                onChange={(e) => handleFieldChange('commencement_date', e.target.value)}
                required
                error={formErrors.commencement_date}
                leftIcon={Calendar}
              />
              <Input
                label="Term (months)"
                type="number"
                min="1"
                value={formData.term_months}
                onChange={(e) => handleFieldChange('term_months', e.target.value)}
                required
                error={formErrors.term_months}
                leftIcon={Clock}
              />
              <Input
                label="Payment Amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.payment_amount}
                onChange={(e) => handleFieldChange('payment_amount', e.target.value)}
                required
                error={formErrors.payment_amount}
                leftIcon={DollarSign}
              />
              <Input
                label="Payments per Year"
                type="number"
                min="1"
                max="52"
                value={formData.payments_per_year}
                onChange={(e) => handleFieldChange('payments_per_year', e.target.value)}
                required
                error={formErrors.payments_per_year}
                helperText="Monthly = 12, Quarterly = 4"
                leftIcon={Receipt}
              />
              <Input
                label="Annual Discount Rate"
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={formData.annual_discount_rate}
                onChange={(e) => handleFieldChange('annual_discount_rate', e.target.value)}
                required
                error={formErrors.annual_discount_rate}
                helperText="e.g., 0.05 for 5%"
                leftIcon={Percent}
              />
              <Select
                label="Payment Timing"
                value={formData.payment_timing}
                onChange={(e) => handleFieldChange('payment_timing', e.target.value)}
                options={timingOptions}
                leftIcon={Clock}
              />
            </div>
          </div>

          {/* Account Mappings Section */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-slate-500" />
              Account Mappings
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="ROU Asset Account"
                value={formData.rou_asset_account_id}
                onChange={(e) => handleFieldChange('rou_asset_account_id', e.target.value)}
                options={[
                  { value: '', label: '— Select account —' },
                  ...accountOptions
                ]}
                leftIcon={BookOpen}
              />
              <Select
                label="Lease Liability Account"
                value={formData.lease_liability_account_id}
                onChange={(e) => handleFieldChange('lease_liability_account_id', e.target.value)}
                options={[
                  { value: '', label: '— Select account —' },
                  ...accountOptions
                ]}
                leftIcon={CreditCard}
              />
              <Select
                label="Interest Expense Account"
                value={formData.interest_expense_account_id}
                onChange={(e) => handleFieldChange('interest_expense_account_id', e.target.value)}
                options={[
                  { value: '', label: '— Select account —' },
                  ...accountOptions
                ]}
                leftIcon={Percent}
              />
              <Select
                label="Depreciation Expense Account"
                value={formData.depreciation_expense_account_id}
                onChange={(e) => handleFieldChange('depreciation_expense_account_id', e.target.value)}
                options={[
                  { value: '', label: '— Select account —' },
                  ...accountOptions
                ]}
                leftIcon={Receipt}
              />
              <Select
                label="Accumulated Depreciation Account"
                value={formData.accumulated_depreciation_account_id}
                onChange={(e) => handleFieldChange('accumulated_depreciation_account_id', e.target.value)}
                options={[
                  { value: '', label: '— Select account —' },
                  ...accountOptions
                ]}
                leftIcon={BookOpen}
              />
              <Select
                label="Cash / Bank Account"
                value={formData.cash_account_id}
                onChange={(e) => handleFieldChange('cash_account_id', e.target.value)}
                options={[
                  { value: '', label: '— Select account —' },
                  ...accountOptions
                ]}
                leftIcon={PiggyBank}
              />
            </div>
          </div>

          {/* Notes Section */}
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

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-sm text-amber-900">
              <div className="font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                IFRS 16 Guidelines
              </div>
              <ul className="text-xs space-y-1 text-amber-800">
                <li>• All leases with term &gt; 12 months must be recognized on balance sheet</li>
                <li>• Discount rate should be incremental borrowing rate if implicit rate not available</li>
                <li>• Payment timing affects present value calculation (advance vs arrears)</li>
                <li>• Account mappings determine posting of journals during amortization</li>
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
            onClick={handleCreateLease}
            loading={createMutation.isPending}
            disabled={!formData.name.trim() || !formData.commencement_date}
            leftIcon={Plus}
          >
            Create Lease
          </Button>
        </div>
      </Modal>
    </div>
  );
}

