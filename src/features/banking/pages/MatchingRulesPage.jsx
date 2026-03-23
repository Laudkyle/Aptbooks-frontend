import React, { useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sliders,
  Plus,
  RefreshCw,
  AlertCircle,
  Edit2,
  CheckCircle2,
  XCircle,
  Search,
  Target,
  Calendar,
  DollarSign,
  Zap
} from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeBankingApi } from '../api/banking.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Table, THead, TBody, TH, TD } from '../../../shared/components/ui/Table.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeRows(data) {
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return data?.rows ?? [];
}

function defaultRuleForm() {
  return {
    name: '',
    is_active: true,
    amount_tolerance: '0',
    date_window_days: '3',
    description_similarity_min: '0.3',
    priority: '100'
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MatchingRulesPage() {
  const qc = useQueryClient();
  const { http } = useApi();
  const api = useMemo(() => makeBankingApi(http), [http]);
const  toast = useToast();
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formData, setFormData] = useState(defaultRuleForm());
  const [formErrors, setFormErrors] = useState({});
  const [editingRuleId, setEditingRuleId] = useState(null);

  // Fetch rules
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['banking.matching.rules'],
    queryFn: () => api.listRules(),
    staleTime: 30000,
    retry: 2
  });

  const rows = useMemo(() => normalizeRows(data), [data]);

  // Filter rules
  const filteredRules = useMemo(() => {
    const searchLower = searchQuery.trim().toLowerCase();
    return rows.filter((rule) => {
      const matchesSearch = !searchLower || (rule.name ?? '').toLowerCase().includes(searchLower);
      const isActive = rule.is_active ?? rule.isActive;
      const matchesStatus =
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? !!isActive :
        !isActive;
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchQuery, statusFilter]);

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Rule name is required';
    }

    const tolerance = Number(formData.amount_tolerance);
    if (isNaN(tolerance) || tolerance < 0) {
      errors.amount_tolerance = 'Must be a non-negative number';
    }

    const days = Number(formData.date_window_days);
    if (isNaN(days) || days < 0 || !Number.isInteger(days)) {
      errors.date_window_days = 'Must be a positive integer';
    }

    const similarity = Number(formData.description_similarity_min);
    if (isNaN(similarity) || similarity < 0 || similarity > 1) {
      errors.description_similarity_min = 'Must be between 0 and 1';
    }

    const priority = Number(formData.priority);
    if (isNaN(priority) || !Number.isInteger(priority)) {
      errors.priority = 'Must be an integer';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Handlers
  const handleOpenCreateModal = useCallback(() => {
    setFormData(defaultRuleForm());
    setFormErrors({});
    setCreateModalOpen(true);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    setFormData(defaultRuleForm());
    setFormErrors({});
  }, []);

  const handleOpenEditModal = useCallback((rule) => {
    setEditingRuleId(rule.id);
    setFormData({
      name: rule.name ?? '',
      is_active: !!(rule.is_active ?? rule.isActive ?? true),
      amount_tolerance: String(rule.amount_tolerance ?? 0),
      date_window_days: String(rule.date_window_days ?? 3),
      description_similarity_min: String(rule.description_similarity_min ?? 0.3),
      priority: String(rule.priority ?? 100)
    });
    setFormErrors({});
    setEditModalOpen(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditingRuleId(null);
    setFormData(defaultRuleForm());
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
    toast.success('Rules refreshed');
  }, [refetch]);

  // Build submission payload
  const buildPayload = useCallback(() => ({
    name: formData.name.trim(),
    is_active: formData.is_active,
    amount_tolerance: Number(formData.amount_tolerance),
    date_window_days: Number(formData.date_window_days),
    description_similarity_min: Number(formData.description_similarity_min),
    priority: Number(formData.priority)
  }), [formData]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!validateForm()) throw new Error('Please fix validation errors');
      return api.createRule(buildPayload());
    },
    onSuccess: () => {
      toast.success('Matching rule created successfully');
      handleCloseCreateModal();
      qc.invalidateQueries({ queryKey: ['banking.matching.rules'] });
    },
    onError: (err) => {
      const message = err?.response?.data?.error ?? err?.message ?? 'Failed to create rule';
      toast.error(message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingRuleId) throw new Error('No rule selected');
      if (!validateForm()) throw new Error('Please fix validation errors');
      return api.updateRule(editingRuleId, buildPayload());
    },
    onSuccess: () => {
      toast.success('Matching rule updated successfully');
      handleCloseEditModal();
      qc.invalidateQueries({ queryKey: ['banking.matching.rules'] });
    },
    onError: (err) => {
      const message = err?.response?.data?.error ?? err?.message ?? 'Failed to update rule';
      toast.error(message);
    }
  });

  const handleCreateRule = useCallback(() => createMutation.mutate(), [createMutation]);
  const handleUpdateRule = useCallback(() => updateMutation.mutate(), [updateMutation]);

  // Loading state
  if (isLoading && rows.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Matching Rules"
          subtitle="Automated matching configuration"
          icon={Sliders}
          actions={
            <Button leftIcon={Plus} onClick={handleOpenCreateModal}>
              New Rule
            </Button>
          }
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading rules...</div>
          </div>
        </ContentCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matching Rules"
        subtitle="Control automated matching tolerance, date windows, similarity threshold, and priority"
        icon={Sliders}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={RefreshCw}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            <Button
              leftIcon={Plus}
              onClick={handleOpenCreateModal}
            >
              New Rule
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
            label="Search Rules"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={Search}
          />
          <Select
            label="Status Filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active Only' },
              { value: 'inactive', label: 'Inactive Only' }
            ]}
          />
          <div className="flex items-end">
            <div className="text-xs text-slate-500">
              {filteredRules.length} of {rows.length} {rows.length === 1 ? 'rule' : 'rules'}
            </div>
          </div>
        </div>
      </ContentCard>

      {/* Rules Table */}
      <ContentCard>
        <div className="mb-4">
          <div className="text-base font-semibold text-slate-900">Matching Rules</div>
          <div className="mt-1 text-sm text-slate-500">
            Configure how transactions are automatically matched
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-sm font-medium text-slate-900">Failed to load rules</div>
            <div className="text-sm text-slate-500">{error?.message ?? 'An error occurred'}</div>
            <Button variant="outline" onClick={handleRefresh} className="mt-2">
              Retry
            </Button>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="text-center py-12">
            <Sliders className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <div className="text-sm font-medium text-slate-900 mb-1">
              {searchQuery || statusFilter !== 'all' ? 'No rules match your filters' : 'No matching rules'}
            </div>
            <div className="text-sm text-slate-500 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create a rule to automate transaction matching'
              }
            </div>
            <Button leftIcon={Plus} onClick={handleOpenCreateModal} size="sm">
              Create Rule
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <Table>
              <THead>
                <tr>
                  <TH>Rule Name</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Tolerance</TH>
                  <TH className="text-right">Date Window</TH>
                  <TH className="text-right">Similarity</TH>
                  <TH className="text-right">Priority</TH>
                  <TH className="text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {filteredRules.map((rule) => {
                  const isActive = rule.is_active ?? rule.isActive;
                  return (
                    <tr
                      key={rule.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <TD>
                        <div className="flex items-center gap-2">
                          <Sliders className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900">{rule.name}</span>
                        </div>
                      </TD>
                      <TD>
                        <Badge
                          tone={isActive ? 'success' : 'muted'}
                          className="inline-flex items-center gap-1.5"
                        >
                          {isActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TD>
                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-mono text-sm text-slate-700">
                            {rule.amount_tolerance ?? 0}
                          </span>
                        </div>
                      </TD>
                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-mono text-sm text-slate-700">
                            {rule.date_window_days ?? 3} days
                          </span>
                        </div>
                      </TD>
                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Target className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-mono text-sm text-slate-700">
                            {rule.description_similarity_min ?? 0.3}
                          </span>
                        </div>
                      </TD>
                      <TD className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-mono text-sm text-slate-700">
                            {rule.priority ?? 100}
                          </span>
                        </div>
                      </TD>
                      <TD className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={Edit2}
                          onClick={() => handleOpenEditModal(rule)}
                        >
                          Edit
                        </Button>
                      </TD>
                    </tr>
                  );
                })}
              </TBody>
            </Table>
          </div>
        )}
      </ContentCard>

      {/* Create Modal */}
      <Modal
        open={createModalOpen}
        onClose={handleCloseCreateModal}
        title="Create Matching Rule"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Sliders className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <div className="font-medium mb-1">Matching Rule Configuration</div>
                <div className="text-blue-700">
                  Define tolerance levels and matching criteria for automated transaction reconciliation
                </div>
              </div>
            </div>
          </div>

          <RuleFormFields
            formData={formData}
            formErrors={formErrors}
            onFieldChange={handleFieldChange}
          />
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
            onClick={handleCreateRule}
            loading={createMutation.isPending}
            disabled={!formData.name.trim()}
            leftIcon={Plus}
          >
            Create Rule
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editModalOpen}
        onClose={handleCloseEditModal}
        title="Edit Matching Rule"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Edit2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <div className="font-medium mb-1">Update Rule Settings</div>
                <div className="text-blue-700">
                  Modify tolerance levels and criteria. Changes take effect immediately.
                </div>
              </div>
            </div>
          </div>

          <RuleFormFields
            formData={formData}
            formErrors={formErrors}
            onFieldChange={handleFieldChange}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleCloseEditModal}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateRule}
            loading={updateMutation.isPending}
            disabled={!formData.name.trim()}
            leftIcon={Edit2}
          >
            Update Rule
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Form Fields Component ────────────────────────────────────────────────────

function RuleFormFields({ formData, formErrors, onFieldChange }) {
  return (
    <div className="space-y-4">
      <Input
        label="Rule Name"
        value={formData.name}
        onChange={(e) => onFieldChange('name', e.target.value)}
        placeholder="e.g., Standard Matching, High Precision"
        required
        error={formErrors.name}
        leftIcon={Sliders}
      />

      <Select
        label="Status"
        value={formData.is_active ? 'true' : 'false'}
        onChange={(e) => onFieldChange('is_active', e.target.value === 'true')}
        options={[
          { value: 'true', label: 'Active - Rule is applied' },
          { value: 'false', label: 'Inactive - Rule is disabled' }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Amount Tolerance"
          type="number"
          step="0.01"
          min="0"
          value={formData.amount_tolerance}
          onChange={(e) => onFieldChange('amount_tolerance', e.target.value)}
          placeholder="0.00"
          helperText="Allowed difference in transaction amounts"
          error={formErrors.amount_tolerance}
          leftIcon={DollarSign}
        />

        <Input
          label="Date Window (Days)"
          type="number"
          min="0"
          value={formData.date_window_days}
          onChange={(e) => onFieldChange('date_window_days', e.target.value)}
          placeholder="3"
          helperText="Days before/after to search for matches"
          error={formErrors.date_window_days}
          leftIcon={Calendar}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Description Similarity"
          type="number"
          step="0.01"
          min="0"
          max="1"
          value={formData.description_similarity_min}
          onChange={(e) => onFieldChange('description_similarity_min', e.target.value)}
          placeholder="0.3"
          helperText="Minimum similarity score (0-1)"
          error={formErrors.description_similarity_min}
          leftIcon={Target}
        />

        <Input
          label="Priority"
          type="number"
          value={formData.priority}
          onChange={(e) => onFieldChange('priority', e.target.value)}
          placeholder="100"
          helperText="Higher values processed first"
          error={formErrors.priority}
          leftIcon={Zap}
        />
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="text-sm text-amber-900">
          <div className="font-medium mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Matching Guidelines
          </div>
          <ul className="text-xs space-y-1 text-amber-800">
            <li>• Higher priority rules are evaluated first</li>
            <li>• Lower tolerance = stricter matching = fewer false positives</li>
            <li>• Similarity range: 0 (no match) to 1 (perfect match)</li>
            <li>• Larger date windows find more matches but may reduce precision</li>
          </ul>
        </div>
      </div>
    </div>
  );
}