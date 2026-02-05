import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Shield, 
  ArrowLeft, 
  Save, 
  Trash2, 
  Check, 
  X, 
  Search,
  AlertCircle,
  Lock,
  Unlock,
  Calendar,
  Filter
} from 'lucide-react';

import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeRolesApi } from '../api/roles.api.js';
import { makePermissionsApi } from '../../permissions/api/permissions.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { ROUTES } from '../../../../app/constants/routes.js';

/**
 * RoleDetail Component
 * 
 * Displays and manages detailed information about a specific role with QuickBooks-style formatting.
 * Supports role editing, permission management, and bulk operations.
 * 
 * @component
 */
export default function RoleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const rolesApi = useMemo(() => makeRolesApi(http), [http]);
  const permsApi = useMemo(() => makePermissionsApi(http), [http]);
  const qc = useQueryClient();
const toast = useToast();
  // State
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(() => new Set());

  // Fetch all roles
  const rolesQuery = useQuery({ 
    queryKey: ['roles'], 
    queryFn: rolesApi.list, 
    staleTime: 30000,
    retry: 2
  });

  // Fetch all permissions
  const permissionsQuery = useQuery({ 
    queryKey: ['permissions'], 
    queryFn: permsApi.list, 
    staleTime: 30000,
    retry: 2
  });

  // Fetch role permissions
  const rolePermissionsQuery = useQuery({ 
    queryKey: ['rolePerms', id], 
    queryFn: () => rolesApi.getPermissions(id), 
    enabled: !!id,
    staleTime: 10000,
    retry: 2
  });

  // Extract data
  const roles = useMemo(() => {
    const data = rolesQuery.data;
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  }, [rolesQuery.data]);

  const permissions = useMemo(() => {
    const data = permissionsQuery.data;
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  }, [permissionsQuery.data]);

  const role = roles.find((r) => r.id === id);

  const attachedPermissions = useMemo(() => 
    new Set((rolePermissionsQuery.data?.permissions ?? []).map((p) => p.code)),
    [rolePermissionsQuery.data]
  );

  // Initialize role name when data loads
  useEffect(() => {
    if (role?.name) {
      setRoleName(role.name);
      setHasChanges(false);
    }
  }, [role?.name]);

  // Filter permissions
  const filteredPermissions = useMemo(() => {
    if (!filter.trim()) return permissions;
    const searchTerm = filter.trim().toLowerCase();
    return permissions.filter((p) => 
      p.code.toLowerCase().includes(searchTerm) || 
      (p.description ?? '').toLowerCase().includes(searchTerm)
    );
  }, [permissions, filter]);

  // Format date
  const formatDate = useCallback((dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch {
      return dateString;
    }
  }, []);

  // Handlers
  const handleRoleNameChange = useCallback((e) => {
    setRoleName(e.target.value);
    setHasChanges(true);
  }, []);

  const handleFilterChange = useCallback((e) => {
    setFilter(e.target.value);
  }, []);

  const handleBack = useCallback(() => {
    navigate(ROUTES.adminRoles);
  }, [navigate]);

  const handleTogglePermission = useCallback((code) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelected(new Set(filteredPermissions.map(p => p.code)));
  }, [filteredPermissions]);

  const handleDeselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  // Mutations
  const renameMutation = useMutation({
    mutationFn: () => rolesApi.update(id, { name: roleName.trim() }),
    onSuccess: () => {
      toast.success('Role updated successfully');
      setHasChanges(false);
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['roleMatrix'] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to update role';
      toast.error(message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => rolesApi.remove(id),
    onSuccess: () => {
      toast.success('Role deleted successfully');
      setConfirmDelete(false);
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['roleMatrix'] });
      navigate(ROUTES.adminRoles);
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to delete role';
      toast.error(message);
    }
  });

  const attachMutation = useMutation({
    mutationFn: (codes) => rolesApi.attachPermissions(id, codes),
    onSuccess: (_, codes) => {
      toast.success(`${codes.length} ${codes.length === 1 ? 'permission' : 'permissions'} attached`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['rolePerms', id] });
      qc.invalidateQueries({ queryKey: ['roleMatrix'] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to attach permissions';
      toast.error(message);
    }
  });

  const detachMutation = useMutation({
    mutationFn: (codes) => rolesApi.detachPermissions(id, codes),
    onSuccess: (_, codes) => {
      toast.success(`${codes.length} ${codes.length === 1 ? 'permission' : 'permissions'} detached`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['rolePerms', id] });
      qc.invalidateQueries({ queryKey: ['roleMatrix'] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to detach permissions';
      toast.error(message);
    }
  });

  const handleSave = useCallback(() => {
    renameMutation.mutate();
  }, [renameMutation]);

  const handleAttachSelected = useCallback(() => {
    const codes = Array.from(selected).filter((c) => !attachedPermissions.has(c));
    if (codes.length === 0) {
      toast.error('No unattached permissions selected');
      return;
    }
    attachMutation.mutate(codes);
  }, [selected, attachedPermissions, attachMutation]);

  const handleDetachSelected = useCallback(() => {
    const codes = Array.from(selected).filter((c) => attachedPermissions.has(c));
    if (codes.length === 0) {
      toast.error('No attached permissions selected');
      return;
    }
    detachMutation.mutate(codes);
  }, [selected, attachedPermissions, detachMutation]);

  const attachedCount = attachedPermissions.size;
  const selectedCount = selected.size;
  const selectedAttachedCount = Array.from(selected).filter(c => attachedPermissions.has(c)).length;
  const selectedUnattachedCount = selectedCount - selectedAttachedCount;

  // Loading state
  if (rolesQuery.isLoading || permissionsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Loading Role..."
          subtitle={`Role ID: ${id}`}
          icon={Shield}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={handleBack}>
              Back
            </Button>
          }
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading role details...</div>
          </div>
        </ContentCard>
      </div>
    );
  }

  // Error state
  if (rolesQuery.isError || permissionsQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Error Loading Role"
          subtitle={`Role ID: ${id}`}
          icon={Shield}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={handleBack}>
              Back
            </Button>
          }
        />
        <ContentCard>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-sm font-medium text-slate-900">Failed to load role</div>
            <div className="text-sm text-slate-500">
              {rolesQuery.error?.message ?? permissionsQuery.error?.message ?? 'An error occurred'}
            </div>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
              Retry
            </Button>
          </div>
        </ContentCard>
      </div>
    );
  }

  // Role not found
  if (!role) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Role Not Found"
          subtitle={`Role ID: ${id}`}
          icon={Shield}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={handleBack}>
              Back to Roles
            </Button>
          }
        />
        <ContentCard>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-amber-500" />
            <div className="text-sm font-medium text-slate-900">Role not found</div>
            <div className="text-sm text-slate-500">The requested role does not exist or has been deleted</div>
          </div>
        </ContentCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={role.name || 'Role Detail'}
        subtitle={`Role management • ${formatDate(role.created_at ?? role.createdAt)}`}
        icon={Shield}
        actions={
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              leftIcon={ArrowLeft} 
              onClick={handleBack}
            >
              Back
            </Button>
            <Button 
              leftIcon={Save}
              onClick={handleSave} 
              disabled={!hasChanges || !roleName.trim()}
              loading={renameMutation.isPending}
            >
              Save Changes
            </Button>
            <Button 
              variant="danger" 
              leftIcon={Trash2}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Role Information */}
          <ContentCard>
            <div className="mb-6">
              <div className="text-base font-semibold text-slate-900">Role Information</div>
              <div className="mt-1 text-sm text-slate-500">Basic details and identification</div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Input 
                  label="Role Name"
                  value={roleName} 
                  onChange={handleRoleNameChange}
                  leftIcon={Shield}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role ID
                </label>
                <div className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50">
                  <span className="font-mono text-xs text-slate-600">{id}</span>
                </div>
              </div>
            </div>

            {hasChanges && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-center gap-2 text-sm text-blue-900">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>You have unsaved changes. Click "Save Changes" to update.</span>
                </div>
              </div>
            )}
          </ContentCard>

          {/* Permissions Management */}
          <ContentCard>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-slate-900">Permission Management</div>
                <div className="mt-1 text-sm text-slate-500">
                  {attachedCount} {attachedCount === 1 ? 'permission' : 'permissions'} attached
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={Lock}
                  onClick={handleAttachSelected}
                  disabled={selectedUnattachedCount === 0 || attachMutation.isPending}
                  loading={attachMutation.isPending}
                >
                  Attach ({selectedUnattachedCount})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={Unlock}
                  onClick={handleDetachSelected}
                  disabled={selectedAttachedCount === 0 || detachMutation.isPending}
                  loading={detachMutation.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Detach ({selectedAttachedCount})
                </Button>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex-1">
                <Input 
                  label="Filter Permissions"
                  value={filter} 
                  onChange={handleFilterChange}
                  placeholder="Search by code or description..."
                  leftIcon={Search}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={filteredPermissions.length === 0}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  disabled={selectedCount === 0}
                >
                  Clear
                </Button>
              </div>
            </div>

            {selectedCount > 0 && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="text-sm text-blue-900">
                  <span className="font-medium">{selectedCount} selected:</span>{' '}
                  {selectedAttachedCount} attached, {selectedUnattachedCount} unattached
                </div>
              </div>
            )}

            {rolePermissionsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-slate-500">Loading permissions...</div>
              </div>
            ) : rolePermissionsQuery.isError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  Failed to load role permissions
                </div>
              </div>
            ) : filteredPermissions.length === 0 ? (
              <div className="text-center py-8">
                <Filter className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <div className="text-sm font-medium text-slate-700">No permissions found</div>
                <div className="text-sm text-slate-500 mt-1">
                  {filter ? 'Try adjusting your search' : 'No permissions available'}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <Table>
                  <THead>
                    <tr>
                      <TH className="w-12"></TH>
                      <TH>Permission Code</TH>
                      <TH>Description</TH>
                      <TH className="w-24 text-center">Status</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {filteredPermissions.map((permission) => {
                      const isAttached = attachedPermissions.has(permission.code);
                      const isSelected = selected.has(permission.code);
                      
                      return (
                        <tr 
                          key={permission.code}
                          className={`hover:bg-slate-50 transition-colors ${isAttached ? 'bg-green-50/30' : ''}`}
                        >
                          <TD className="text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTogglePermission(permission.code)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              aria-label={`Select ${permission.code}`}
                            />
                          </TD>
                          <TD>
                            <div className="flex items-center gap-2">
                              <Lock className="h-3.5 w-3.5 text-slate-400" />
                              <span className="font-mono text-xs text-slate-700">
                                {permission.code}
                              </span>
                            </div>
                          </TD>
                          <TD>
                            <span className="text-sm text-slate-600">
                              {permission.description || '—'}
                            </span>
                          </TD>
                          <TD className="text-center">
                            {isAttached ? (
                              <Badge tone="success" className="flex items-center gap-1 w-fit mx-auto">
                                <Check className="h-3 w-3" />
                                Attached
                              </Badge>
                            ) : (
                              <Badge tone="muted" className="flex items-center gap-1 w-fit mx-auto">
                                <X className="h-3 w-3" />
                                Not Attached
                              </Badge>
                            )}
                          </TD>
                        </tr>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            )}
          </ContentCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Statistics */}
          <ContentCard>
            <div className="text-sm font-semibold text-slate-900 mb-4">Statistics</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Total Permissions</span>
                <span className="font-semibold text-slate-900">{permissions.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Attached</span>
                <Badge tone="success">{attachedCount}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Not Attached</span>
                <Badge tone="muted">{permissions.length - attachedCount}</Badge>
              </div>
              {selectedCount > 0 && (
                <>
                  <div className="pt-3 border-t border-slate-200" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Selected</span>
                    <Badge tone="brand">{selectedCount}</Badge>
                  </div>
                </>
              )}
            </div>
          </ContentCard>

          {/* Role Metadata */}
          <ContentCard>
            <div className="text-sm font-semibold text-slate-900 mb-4">Role Details</div>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <Shield className="h-4 w-4 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-slate-600">Role Name</div>
                  <div className="font-medium text-slate-900 mt-0.5">{role.name}</div>
                </div>
              </div>
              {role.created_at && (
                <div className="flex items-start gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-slate-600">Created</div>
                    <div className="font-medium text-slate-900 mt-0.5">
                      {formatDate(role.created_at)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ContentCard>

          {/* Quick Actions */}
          <ContentCard>
            <div className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</div>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges}
                className="w-full justify-start"
                leftIcon={Save}
              >
                Save Changes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                leftIcon={Trash2}
              >
                Delete Role
              </Button>
            </div>
          </ContentCard>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Role"
        message={`Are you sure you want to delete the role "${role.name}"? This will remove all associated permissions and cannot be undone.`}
        confirmText="Delete Role"
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}