import React, { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, Zap, AlertCircle, CheckCircle2, Calendar, Users } from 'lucide-react';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeRolesApi } from '../api/roles.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { ROUTES } from '../../../../app/constants/routes.js';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';


export default function RoleList() {
  const { http } = useApi();
  const api = useMemo(() => makeRolesApi(http), [http]);
  const qc = useQueryClient();
const toast = useToast();
  // State
  const [createOpen, setCreateOpen] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Fetch roles
  const { 
    data, 
    isLoading, 
    isError, 
    error 
  } = useQuery({ 
    queryKey: ['roles'], 
    queryFn: api.list, 
    staleTime: 30000,
    retry: 2
  });

  const roles = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  }, [data]);

  // Template options with descriptions
  const templates = useMemo(() => [
    { 
      value: 'admin', 
      label: 'Administrator', 
      description: 'Full system access and management',
      icon: '👑'
    },
    { 
      value: 'accountant', 
      label: 'Accountant', 
      description: 'Financial records and reporting access',
      icon: '📊'
    },
    { 
      value: 'clerk', 
      label: 'Clerk', 
      description: 'Basic data entry and viewing',
      icon: '📝'
    },
    { 
      value: 'viewer', 
      label: 'Viewer', 
      description: 'Read-only access to records',
      icon: '👁️'
    }
  ], []);

  const selectedTemplateInfo = templates.find(t => t.value === selectedTemplate);

  // Format date
  const formatDate = useCallback((dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch {
      return dateString;
    }
  }, []);

  // Form validation
  const validateRoleName = useCallback(() => {
    const errors = {};
    
    if (!roleName.trim()) {
      errors.roleName = 'Role name is required';
    } else if (roleName.trim().length < 2) {
      errors.roleName = 'Role name must be at least 2 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [roleName]);

  // Handle modal open/close
  const handleOpenCreateModal = useCallback(() => {
    setCreateOpen(true);
    setRoleName('');
    setFormErrors({});
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setCreateOpen(false);
    setRoleName('');
    setFormErrors({});
  }, []);

  const handleRoleNameChange = useCallback((e) => {
    setRoleName(e.target.value);
    if (formErrors.roleName) {
      setFormErrors({});
    }
  }, [formErrors.roleName]);

  const handleTemplateChange = useCallback((e) => {
    setSelectedTemplate(e.target.value);
  }, []);

  // Create role mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!validateRoleName()) {
        throw new Error('Please fix validation errors');
      }
      return api.create({ name: roleName.trim() });
    },
    onSuccess: () => {
      toast.success('Role created successfully');
      handleCloseCreateModal();
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['roleMatrix'] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to create role';
      toast.error(message);
    }
  });

  // Apply template mutation
  const applyTemplateMutation = useMutation({
    mutationFn: () => api.applyTemplate(selectedTemplate),
    onSuccess: () => {
      toast.success(`${selectedTemplateInfo?.label || 'Template'} applied successfully`);
      setSelectedTemplate('');
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['roleMatrix'] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to apply template';
      toast.error(message);
    }
  });

  const handleCreateRole = useCallback(() => {
    createMutation.mutate();
  }, [createMutation]);

  const handleApplyTemplate = useCallback(() => {
    if (!selectedTemplate) return;
    applyTemplateMutation.mutate();
  }, [selectedTemplate, applyTemplateMutation]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Roles"
          subtitle="Create roles and manage permissions"
          icon={Shield}
          actions={
            <Button leftIcon={Plus} onClick={handleOpenCreateModal}>
              New Role
            </Button>
          }
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading roles...</div>
          </div>
        </ContentCard>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Roles"
          subtitle="Create roles and manage permissions"
          icon={Shield}
          actions={
            <Button leftIcon={Plus} onClick={handleOpenCreateModal}>
              New Role
            </Button>
          }
        />
        <ContentCard>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-sm font-medium text-slate-900">Failed to load roles</div>
            <div className="text-sm text-slate-500">{error?.message ?? 'An error occurred'}</div>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
              Retry
            </Button>
          </div>
        </ContentCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        subtitle="Create roles and manage permissions"
        icon={Shield}
        actions={
          <Button 
            leftIcon={Plus} 
            onClick={handleOpenCreateModal}
            aria-label="Create new role"
          >
            New Role
          </Button>
        }
      />

      {/* Template Quick Setup Card */}
      <ContentCard>
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <div className="text-base font-semibold text-slate-900">Quick Setup</div>
            </div>
            <div className="text-sm text-slate-500 mb-4">
              Apply a pre-configured role template to quickly set up common permission sets
            </div>
            
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[250px]">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Template
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
                  value={selectedTemplate}
                  onChange={handleTemplateChange}
                >
                  <option value="">Choose a role template...</option>
                  {templates.map((template) => (
                    <option key={template.value} value={template.value}>
                      {template.icon} {template.label} - {template.description}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                leftIcon={Zap}
                onClick={handleApplyTemplate}
                disabled={!selectedTemplate || applyTemplateMutation.isPending}
                loading={applyTemplateMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Apply Template
              </Button>
            </div>

            {selectedTemplateInfo && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2 text-sm text-amber-900">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">{selectedTemplateInfo.label}:</span> {selectedTemplateInfo.description}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ContentCard>

      {/* Roles List */}
      <ContentCard>
        <div className="mb-4">
          <div className="text-base font-semibold text-slate-900">Role Directory</div>
          <div className="mt-1 text-sm text-slate-500">
            {roles.length} {roles.length === 1 ? 'role' : 'roles'} configured
          </div>
        </div>

        {roles.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <div className="text-sm font-medium text-slate-900 mb-1">No roles yet</div>
            <div className="text-sm text-slate-500 mb-4">
              Create a role or apply a template to get started
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button 
                leftIcon={Plus} 
                onClick={handleOpenCreateModal}
                size="sm"
              >
                Create Role
              </Button>
              <Button 
                variant="outline"
                leftIcon={Zap} 
                onClick={() => {
                  // Scroll to template section
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                size="sm"
              >
                Use Template
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Role Name</TH>
                <TH>Created Date</TH>
                <TH className="">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-slate-50 transition-colors">
                  <TD>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-slate-400" />
                      <Link 
                        className="font-medium text-brand-deep hover:text-brand-deep/80 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-deep focus:ring-offset-1 rounded"
                        to={ROUTES.adminRoleDetail(role.id)}
                        aria-label={`View details for ${role.name}`}
                      >
                        {role.name}
                      </Link>
                    </div>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {formatDate(role.created_at ?? role.createdAt)}
                    </div>
                  </TD>
                  <TD>
                    <Link to={ROUTES.adminRoleDetail(role.id)}>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        aria-label={`Manage ${role.name}`}
                      >
                        Manage
                      </Button>
                    </Link>
                  </TD>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </ContentCard>

      {/* Create Role Modal */}
      <Modal
        open={createOpen}
        title="Create New Role"
        onClose={handleCloseCreateModal}
        footer={
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={handleCloseCreateModal}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateRole} 
              loading={createMutation.isPending}
              disabled={!roleName.trim()}
              leftIcon={Plus}
            >
              Create Role
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <div className="font-medium mb-1">Create a custom role</div>
                <div className="text-blue-700">
                  After creating the role, you can assign specific permissions and manage user access.
                </div>
              </div>
            </div>
          </div>

          <div>
            <Input 
              label="Role Name"
              value={roleName} 
              onChange={handleRoleNameChange}
              placeholder="e.g., Manager, Supervisor, Auditor"
              required
              error={formErrors.roleName}
              leftIcon={Shield}
              aria-label="Role name"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-700 mb-2">Next Steps</div>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                <span>Role will be created with no permissions by default</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                <span>You can configure permissions on the role detail page</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                <span>Assign the role to users to grant access</span>
              </li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
}