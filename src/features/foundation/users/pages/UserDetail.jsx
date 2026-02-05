import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  User, 
  ArrowLeft, 
  Save, 
  UserCheck, 
  UserX, 
  Trash2, 
  Shield, 
  Mail, 
  Phone, 
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  History,
  Monitor,
  MapPin
} from 'lucide-react';

import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeUsersApi } from '../api/users.api.js';
import { makeRolesApi } from '../../roles/api/roles.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { ROUTES } from '../../../../app/constants/routes.js';


export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const usersApi = useMemo(() => makeUsersApi(http), [http]);
  const rolesApi = useMemo(() => makeRolesApi(http), [http]);
  const qc = useQueryClient();
const toast = useToast();
  // State
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    status: '',
    password: ''
  });
  const [rolePick, setRolePick] = useState('');

  // Fetch user details
  const userQuery = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.detail(id),
    enabled: !!id,
    staleTime: 30000,
    retry: 2
  });

  // Fetch available roles
  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.list,
    staleTime: 60000
  });

  const user = userQuery.data;
  const allRoles = useMemo(() => {
    const data = rolesQuery.data;
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  }, [rolesQuery.data]);

  const assignedRoleIds = useMemo(() => 
    new Set((user?.roles ?? []).map((r) => r.id)),
    [user?.roles]
  );

  // Initialize form when user data loads
  useEffect(() => {
    if (!user) return;
    setForm({
      email: user.email ?? '',
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      phone: user.phone ?? '',
      status: user.status ?? '',
      password: ''
    });
    setHasChanges(false);
  }, [user]);

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

  // Get status configuration
  const getStatusConfig = useCallback((status) => {
    const normalizedStatus = (status ?? 'pending').toLowerCase();
    
    const configs = {
      active: { tone: 'success', icon: CheckCircle2, label: 'Active' },
      disabled: { tone: 'warning', icon: UserX, label: 'Disabled' },
      pending: { tone: 'muted', icon: Clock, label: 'Pending' }
    };
    
    return configs[normalizedStatus] || { tone: 'muted', icon: User, label: status || 'Unknown' };
  }, []);

  const statusConfig = getStatusConfig(user?.status);
  const StatusIcon = statusConfig.icon;

  // Handle form changes
  const handleFieldChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  const handleBack = useCallback(() => {
    navigate(ROUTES.adminUsers);
  }, [navigate]);

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const body = {
        email: form.email || undefined,
        first_name: form.first_name === '' ? null : form.first_name,
        last_name: form.last_name === '' ? null : form.last_name,
        phone: form.phone === '' ? null : form.phone,
        status: form.status || undefined,
        password: form.password || undefined
      };
      return usersApi.update(id, body);
    },
    onSuccess: () => {
      toast.success('User updated successfully');
      setForm(prev => ({ ...prev, password: '' }));
      setHasChanges(false);
      qc.invalidateQueries({ queryKey: ['user', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to update user';
      toast.error(message);
    }
  });

  // Disable user mutation
  const disableMutation = useMutation({
    mutationFn: () => usersApi.disable(id),
    onSuccess: () => {
      toast.success('User disabled successfully');
      qc.invalidateQueries({ queryKey: ['user', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to disable user';
      toast.error(message);
    }
  });

  // Enable user mutation
  const enableMutation = useMutation({
    mutationFn: () => usersApi.enable(id),
    onSuccess: () => {
      toast.success('User enabled successfully');
      qc.invalidateQueries({ queryKey: ['user', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to enable user';
      toast.error(message);
    }
  });

  // Delete user mutation
  const removeMutation = useMutation({
    mutationFn: () => usersApi.remove(id),
    onSuccess: () => {
      toast.success('User deleted successfully');
      setConfirmDelete(false);
      qc.invalidateQueries({ queryKey: ['users'] });
      navigate(ROUTES.adminUsers);
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to delete user';
      toast.error(message);
    }
  });

  // Assign roles mutation
  const assignRolesMutation = useMutation({
    mutationFn: (roleIds) => usersApi.assignRoles(id, roleIds),
    onSuccess: () => {
      toast.success('Role assigned successfully');
      setRolePick('');
      qc.invalidateQueries({ queryKey: ['user', id] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to assign role';
      toast.error(message);
    }
  });

  // Remove roles mutation
  const removeRolesMutation = useMutation({
    mutationFn: (roleIds) => usersApi.removeRoles(id, roleIds),
    onSuccess: () => {
      toast.success('Role removed successfully');
      qc.invalidateQueries({ queryKey: ['user', id] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to remove role';
      toast.error(message);
    }
  });

  const handleSave = useCallback(() => {
    updateMutation.mutate();
  }, [updateMutation]);

  const handleToggleStatus = useCallback(() => {
    if (user?.status === 'disabled') {
      enableMutation.mutate();
    } else {
      disableMutation.mutate();
    }
  }, [user?.status, enableMutation, disableMutation]);

  const handleAssignRole = useCallback(() => {
    if (!rolePick) return;
    assignRolesMutation.mutate([rolePick]);
  }, [rolePick, assignRolesMutation]);

  const handleRemoveRole = useCallback((roleId) => {
    removeRolesMutation.mutate([roleId]);
  }, [removeRolesMutation]);

  // Loading state
  if (userQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Loading User..."
          subtitle={`User ID: ${id}`}
          icon={User}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={handleBack}>
              Back
            </Button>
          }
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading user details...</div>
          </div>
        </ContentCard>
      </div>
    );
  }

  // Error state
  if (userQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Error Loading User"
          subtitle={`User ID: ${id}`}
          icon={User}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={handleBack}>
              Back
            </Button>
          }
        />
        <ContentCard>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-sm font-medium text-slate-900">Failed to load user</div>
            <div className="text-sm text-slate-500">{userQuery.error?.message ?? 'An error occurred'}</div>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
              Retry
            </Button>
          </div>
        </ContentCard>
      </div>
    );
  }

  const isDisabled = user?.status === 'disabled';

  return (
    <div className="space-y-6">
      <PageHeader
        title={user?.email || 'User Detail'}
        subtitle={`User management • ${formatDate(user?.created_at ?? user?.createdAt)}`}
        icon={User}
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
              disabled={updateMutation.isPending || !hasChanges}
              loading={updateMutation.isPending}
            >
              Save Changes
            </Button>
            {isDisabled ? (
              <Button 
                leftIcon={UserCheck}
                onClick={handleToggleStatus} 
                loading={enableMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Enable User
              </Button>
            ) : (
              <Button 
                variant="outline"
                leftIcon={UserX}
                onClick={handleToggleStatus} 
                loading={disableMutation.isPending}
              >
                Disable User
              </Button>
            )}
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
          {/* Profile Card */}
          <ContentCard>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-slate-900">User Profile</div>
                <div className="mt-1 text-sm text-slate-500">Basic information and authentication</div>
              </div>
              <Badge tone={statusConfig.tone} className="flex items-center gap-1.5">
                <StatusIcon className="h-3.5 w-3.5" />
                {statusConfig.label}
              </Badge>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Input 
                  label="Email Address"
                  type="email"
                  value={form.email} 
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  leftIcon={Mail}
                  required
                />
              </div>

              <div>
                <Input 
                  label="Phone Number"
                  type="tel"
                  value={form.phone} 
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  leftIcon={Phone}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <Input 
                  label="First Name"
                  value={form.first_name} 
                  onChange={(e) => handleFieldChange('first_name', e.target.value)}
                  placeholder="John"
                />
              </div>

              <div>
                <Input 
                  label="Last Name"
                  value={form.last_name} 
                  onChange={(e) => handleFieldChange('last_name', e.target.value)}
                  placeholder="Doe"
                />
              </div>

              <div className="md:col-span-2">
                <Input 
                  label="New Password"
                  type="password"
                  value={form.password} 
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  leftIcon={Shield}
                  placeholder="Leave blank to keep current password"
                  helperText="Minimum 10 characters required"
                />
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

          {/* Roles Card */}
          <ContentCard>
            <div className="mb-6">
              <div className="text-base font-semibold text-slate-900">Role Management</div>
              <div className="mt-1 text-sm text-slate-500">Assign and manage user permissions</div>
            </div>

            <div className="flex flex-wrap items-end gap-3 mb-6">
              <div className="flex-1 min-w-[250px]">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Assign Role
                </label>
                {rolesQuery.isLoading ? (
                  <div className="text-sm text-slate-500">Loading roles...</div>
                ) : (
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                    value={rolePick}
                    onChange={(e) => setRolePick(e.target.value)}
                  >
                    <option value="">Select a role...</option>
                    {allRoles.map((role) => (
                      <option 
                        key={role.id} 
                        value={role.id} 
                        disabled={assignedRoleIds.has(role.id)}
                      >
                        {role.name}
                        {assignedRoleIds.has(role.id) ? ' (Already assigned)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <Button
                leftIcon={Shield}
                onClick={handleAssignRole}
                disabled={!rolePick || assignRolesMutation.isPending}
                loading={assignRolesMutation.isPending}
              >
                Assign Role
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200">
              {(user?.roles ?? []).length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <div className="text-sm font-medium text-slate-700">No roles assigned</div>
                  <div className="text-sm text-slate-500 mt-1">Assign a role to grant permissions</div>
                </div>
              ) : (
                <Table>
                  <THead>
                    <tr>
                      <TH>Role Name</TH>
                      <TH>Description</TH>
                      <TH className="text-right">Actions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {(user?.roles ?? []).map((role) => (
                      <tr key={role.id}>
                        <TD>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">{role.name}</span>
                          </div>
                        </TD>
                        <TD>
                          <span className="text-sm text-slate-600">
                            {role.description || '—'}
                          </span>
                        </TD>
                        <TD className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveRole(role.id)}
                            disabled={removeRolesMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </TD>
                      </tr>
                    ))}
                  </TBody>
                </Table>
              )}
            </div>
          </ContentCard>

          {/* Login History */}
          <ContentCard>
            <div className="mb-6">
              <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <History className="h-5 w-5" />
                Login History
              </div>
              <div className="mt-1 text-sm text-slate-500">Recent authentication attempts</div>
            </div>
            <AdminLoginHistory userId={id} />
          </ContentCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Status */}
          <ContentCard>
            <div className="text-sm font-semibold text-slate-900 mb-4">Account Status</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Status</span>
                <Badge tone={statusConfig.tone} className="flex items-center gap-1.5">
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">User ID</span>
                <span className="font-mono text-xs text-slate-900">{id}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Roles</span>
                <span className="font-medium text-slate-900">
                  {(user?.roles ?? []).length}
                </span>
              </div>
            </div>
          </ContentCard>

          {/* Timestamps */}
          <ContentCard>
            <div className="text-sm font-semibold text-slate-900 mb-4">Timestamps</div>
            <div className="space-y-3">
              {user?.created_at && (
                <div className="flex items-start gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-slate-600">Created</div>
                    <div className="font-medium text-slate-900 mt-0.5">
                      {formatDate(user.created_at)}
                    </div>
                  </div>
                </div>
              )}
              {user?.updated_at && (
                <div className="flex items-start gap-2 text-sm">
                  <Clock className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-slate-600">Last Updated</div>
                    <div className="font-medium text-slate-900 mt-0.5">
                      {formatDate(user.updated_at)}
                    </div>
                  </div>
                </div>
              )}
              {user?.last_login_at && (
                <div className="flex items-start gap-2 text-sm">
                  <History className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-slate-600">Last Login</div>
                    <div className="font-medium text-slate-900 mt-0.5">
                      {formatDate(user.last_login_at)}
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
                onClick={handleToggleStatus}
                className="w-full justify-start"
                leftIcon={isDisabled ? UserCheck : UserX}
              >
                {isDisabled ? 'Enable User' : 'Disable User'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                leftIcon={Trash2}
              >
                Delete User
              </Button>
            </div>
          </ContentCard>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete User"
        message="Are you sure you want to delete this user? This action performs a soft delete and can be reversed by an administrator."
        confirmText="Delete User"
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => removeMutation.mutate()}
        loading={removeMutation.isPending}
      />
    </div>
  );
}

/**
 * AdminLoginHistory Component
 * 
 * Displays login history for a specific user with filtering options
 */
function AdminLoginHistory({ userId }) {
  const { http } = useApi();
  const api = useMemo(() => makeUsersApi(http), [http]);
  const [limit, setLimit] = useState(50);
  const [email, setEmail] = useState('');

  const query = useQuery({
    queryKey: ['userLoginHistory', userId, limit, email],
    queryFn: () => api.loginHistory(userId, { 
      limit: String(limit), 
      email: email || undefined, 
      userId: userId 
    }),
    enabled: !!userId,
    staleTime: 10000
  });

  const rows = useMemo(() => {
    const data = query.data;
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  }, [query.data]);

  const formatDateTime = useCallback((dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(date);
    } catch {
      return dateString;
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Input 
            label="Limit" 
            type="number" 
            min={1} 
            max={200} 
            value={limit} 
            onChange={(e) => setLimit(Number(e.target.value) || 50)}
            className="w-28"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Input 
            label="Email Filter" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Filter by email..."
          />
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-slate-500">Loading login history...</div>
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {query.error?.message ?? 'Failed to load login history'}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8">
          <History className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <div className="text-sm font-medium text-slate-700">No login history</div>
          <div className="text-sm text-slate-500 mt-1">Login attempts will appear here</div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <Table>
            <THead>
              <tr>
                <TH>Timestamp</TH>
                <TH>Result</TH>
                <TH>IP Address</TH>
                <TH>Device</TH>
                <TH>Failure Reason</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <TD>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {formatDateTime(row.created_at)}
                    </div>
                  </TD>
                  <TD>
                    {row.success ? (
                      <Badge tone="success" className="flex items-center gap-1.5 w-fit">
                        <CheckCircle2 className="h-3 w-3" />
                        Success
                      </Badge>
                    ) : (
                      <Badge tone="error" className="flex items-center gap-1.5 w-fit">
                        <AlertCircle className="h-3 w-3" />
                        Failed
                      </Badge>
                    )}
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-mono text-xs">
                        {row.ip ?? '—'}
                      </span>
                    </div>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2 max-w-[300px]">
                      <Monitor className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-600 truncate" title={row.user_agent}>
                        {row.user_agent ?? '—'}
                      </span>
                    </div>
                  </TD>
                  <TD>
                    {row.failure_reason ? (
                      <span className="text-sm text-red-600">{row.failure_reason}</span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </TD>
                </tr>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}