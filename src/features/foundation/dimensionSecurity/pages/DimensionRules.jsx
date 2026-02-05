import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeDimensionSecurityApi } from '../api/dimensionSecurity.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';

export default function DimensionRules() {
  const { http } = useApi();
  const api = useMemo(() => makeDimensionSecurityApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const pageSize = 50;

  const q = useQuery({
    queryKey: ['dimensionRules', page, pageSize],
    queryFn: () => api.list({ limit: pageSize, offset: (page - 1) * pageSize }),
    staleTime: 30_000
  });

  const rows = q.data?.data ?? [];
  const totalCount = q.data?.total ?? rows.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const openCreateModal = () => {
    setEditingRule(null);
    setModalOpen(true);
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRule(null);
  };

  const remove = useMutation({
    mutationFn: (id) => api.remove(id),
    onSuccess: () => {
      toast.success('Security rule deleted successfully');
      qc.invalidateQueries({ queryKey: ['dimensionRules'] });
      setDeleteConfirm(null);
    },
    onError: (e) => toast.error(e.message || 'Failed to delete rule')
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      <PageHeader
        title="Dimension Security"
        subtitle="Control access to dimensions based on user roles and permissions"
        actions={
          <Button onClick={openCreateModal}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Security Rule
          </Button>
        }
      />

      <ContentCard>
        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">About Dimension Security</h4>
              <p className="text-sm text-blue-800">
                Security rules control which users or roles can access specific dimensions. Rules are evaluated in order, and the system enforces access based on principal type and effect.
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        {q.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-slate-600">Loading security rules...</p>
            </div>
          </div>
        ) : q.isError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Rules</h3>
            <p className="text-sm text-red-700 mb-4">{q.error?.message || 'An error occurred'}</p>
            <Button variant="secondary" onClick={() => qc.invalidateQueries({ queryKey: ['dimensionRules'] })}>
              Try Again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Security Rules</h3>
            <p className="text-sm text-slate-600 mb-6">Get started by creating your first dimension security rule</p>
            <Button onClick={openCreateModal}>Create Security Rule</Button>
          </div>
        ) : (
          <>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <THead>
                  <tr>
                    <TH>Rule ID</TH>
                    <TH>Applied To</TH>
                    <TH>Principal</TH>
                    <TH>Access</TH>
                    <TH>Description</TH>
                    <TH className="text-right">Actions</TH>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50">
                      <TD className="font-mono text-xs text-slate-600">
                        #{rule.id}
                      </TD>
                      <TD>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (rule.principal_type || rule.principalType) === 'user' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {(rule.principal_type || rule.principalType) === 'user' ? (
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                            </svg>
                          )}
                          {(rule.principal_type || rule.principalType) === 'user' ? 'User' : 'Role'}
                        </span>
                      </TD>
                      <TD className="font-mono text-xs text-slate-900">
                        {rule.principal_id || rule.principalId}
                      </TD>
                      <TD>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          rule.effect === 'allow' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {rule.effect === 'allow' ? (
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                          {rule.effect === 'allow' ? 'Allow' : 'Deny'}
                        </span>
                      </TD>
                      <TD className="text-slate-600">
                        {rule.note || <span className="text-slate-400">No description</span>}
                      </TD>
                      <TD>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(rule)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteConfirm(rule)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        </div>
                      </TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} rules
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-3 py-1 text-sm rounded ${
                            page === pageNum
                              ? 'bg-brand-500 text-white font-medium'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </ContentCard>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <RuleFormModal
          rule={editingRule}
          onClose={closeModal}
          api={api}
          qc={qc}
          toast={toast}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Security Rule"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 mb-1">Confirm Deletion</h4>
                  <p className="text-sm text-red-800">
                    Are you sure you want to delete this security rule? This action cannot be undone and may affect user access to dimensions.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Rule ID:</span>
                <span className="font-mono text-slate-900">#{deleteConfirm.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Applied To:</span>
                <span className="font-medium text-slate-900">
                  {(deleteConfirm.principal_type || deleteConfirm.principalType) === 'user' ? 'User' : 'Role'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Principal:</span>
                <span className="font-mono text-slate-900">{deleteConfirm.principal_id || deleteConfirm.principalId}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => remove.mutate(deleteConfirm.id)}
                disabled={remove.isLoading}
              >
                {remove.isLoading ? 'Deleting...' : 'Delete Rule'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RuleFormModal({ rule, onClose, api, qc, toast }) {
  const isEditing = !!rule;

  const [form, setForm] = useState({
    principalType: rule?.principal_type || rule?.principalType || 'user',
    principalId: rule?.principal_id || rule?.principalId || '',
    effect: rule?.effect || 'allow',
    note: rule?.note || '',
    // Parse rule_json for specific dimension rules
    departments: [],
    locations: [],
    costCenters: []
  });

  const [errors, setErrors] = useState({});

  // Parse existing rule JSON if editing
  React.useEffect(() => {
    if (rule) {
      const ruleJson = rule.rule_json || rule.ruleJson || {};
      setForm(prev => ({
        ...prev,
        departments: ruleJson.departments || [],
        locations: ruleJson.locations || [],
        costCenters: ruleJson.costCenters || []
      }));
    }
  }, [rule]);

  const validateForm = () => {
    const newErrors = {};

    if (!form.principalId.trim()) {
      newErrors.principalId = 'Principal ID is required';
    }

    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (form.principalId && !uuidRegex.test(form.principalId)) {
      newErrors.principalId = 'Please enter a valid UUID';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!validateForm()) {
        throw new Error('Please fix validation errors');
      }

      const body = {
        principalType: form.principalType,
        principalId: form.principalId.trim(),
        effect: form.effect,
        ruleJson: {
          departments: form.departments.filter(Boolean),
          locations: form.locations.filter(Boolean),
          costCenters: form.costCenters.filter(Boolean)
        },
        note: form.note.trim() || null
      };

      if (isEditing) {
        return api.update(rule.id, body);
      }
      return api.create(body);
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Security rule updated successfully' : 'Security rule created successfully');
      qc.invalidateQueries({ queryKey: ['dimensionRules'] });
      onClose();
    },
    onError: (e) => {
      if (e.message !== 'Please fix validation errors') {
        toast.error(e.message || `Failed to ${isEditing ? 'update' : 'create'} rule`);
      }
    }
  });

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? 'Edit Security Rule' : 'Create Security Rule'}
    >
      <div className="space-y-6">
        {/* Principal Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Principal Configuration</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Applied To
              </label>
              <Select
                value={form.principalType}
                onChange={(e) => handleInputChange('principalType', e.target.value)}
              >
                <option value="user">Individual User</option>
                <option value="role">User Role</option>
              </Select>
              <p className="mt-1.5 text-xs text-slate-600">
                Choose whether this rule applies to a specific user or role
              </p>
            </div>

            <div>
              <Input
                label="Principal ID"
                value={form.principalId}
                onChange={(e) => handleInputChange('principalId', e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                error={errors.principalId}
                required
              />
              <p className="mt-1.5 text-xs text-slate-600">
                Enter the UUID of the {form.principalType}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Access Level
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleInputChange('effect', 'allow')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  form.effect === 'allow'
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg className={`w-5 h-5 ${form.effect === 'allow' ? 'text-green-600' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className={`font-medium ${form.effect === 'allow' ? 'text-green-900' : 'text-slate-700'}`}>
                    Allow Access
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Grant access to specified dimensions
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleInputChange('effect', 'deny')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  form.effect === 'deny'
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg className={`w-5 h-5 ${form.effect === 'deny' ? 'text-red-600' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className={`font-medium ${form.effect === 'deny' ? 'text-red-900' : 'text-slate-700'}`}>
                    Deny Access
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Restrict access to specified dimensions
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Dimension Restrictions */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Dimension Restrictions (Optional)</h3>
          <p className="text-sm text-slate-600">
            Leave blank to apply to all dimensions, or specify particular dimensions to restrict access.
          </p>

          <DimensionListInput
            label="Departments"
            values={form.departments}
            onChange={(values) => handleInputChange('departments', values)}
            placeholder="Enter department IDs"
          />

          <DimensionListInput
            label="Locations"
            values={form.locations}
            onChange={(values) => handleInputChange('locations', values)}
            placeholder="Enter location IDs"
          />

          <DimensionListInput
            label="Cost Centers"
            values={form.costCenters}
            onChange={(values) => handleInputChange('costCenters', values)}
            placeholder="Enter cost center IDs"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm focus:border-brand-light focus:ring-2 focus:ring-brand-light"
            rows={3}
            value={form.note}
            onChange={(e) => handleInputChange('note', e.target.value)}
            placeholder="Add notes about this security rule..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isLoading}>
            {save.isLoading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Rule' : 'Create Rule')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DimensionListInput({ label, values, onChange, placeholder }) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInputValue('');
    }
  };

  const handleRemove = (value) => {
    onChange(values.filter(v => v !== value));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-light focus:ring-2 focus:ring-brand-light"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={handleAdd}
            disabled={!inputValue.trim()}
          >
            Add
          </Button>
        </div>
        {values.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {values.map((value, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full"
              >
                <span className="font-mono text-xs">{value}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(value)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}