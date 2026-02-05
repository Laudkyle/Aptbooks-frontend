import React, { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Mail, Lock, AlertCircle, CheckCircle2, UserCheck, UserX, Clock } from 'lucide-react';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeUsersApi } from '../api/users.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';
import { ROUTES } from '../../../../app/constants/routes.js';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';

/**
 * UserList Component
 * 
 * Displays and manages users in the current organization with QuickBooks-style formatting.
 * Supports user creation, status display, and navigation to user details.
 * 
 * @component
 */
export default function UserList() {
  const { http } = useApi();
  const api = useMemo(() => makeUsersApi(http), [http]);
  const qc = useQueryClient();
const toast = useToast();

  // Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch users
  const { 
    data, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['users'],
    queryFn: api.list,
    staleTime: 30000, // 30 seconds
    retry: 2
  });

  const users = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  }, [data]);

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 10) {
      errors.password = 'Password must be at least 10 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Format date
  const formatDate = useCallback((dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return dateString;
    }
  }, []);

  // Get status configuration
  const getStatusConfig = useCallback((status) => {
    const normalizedStatus = (status ?? 'pending').toLowerCase();
    
    const configs = {
      active: { 
        variant: 'success', 
        tone: 'success',
        icon: CheckCircle2,
        label: 'Active' 
      },
      disabled: { 
        variant: 'warning', 
        tone: 'warning',
        icon: UserX,
        label: 'Disabled' 
      },
      pending: { 
        variant: 'default', 
        tone: 'muted',
        icon: Clock,
        label: 'Pending' 
      },
      invited: { 
        variant: 'default', 
        tone: 'brand',
        icon: Mail,
        label: 'Invited' 
      }
    };
    
    return configs[normalizedStatus] || { 
      variant: 'default', 
      tone: 'muted',
      icon: UserCheck,
      label: status || 'Unknown' 
    };
  }, []);

  // Handle form field changes
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [formErrors]);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setCreateOpen(false);
    setFormData({ email: '', password: '' });
    setFormErrors({});
  }, []);

  // Handle modal open
  const handleOpenModal = useCallback(() => {
    setCreateOpen(true);
    setFormData({ email: '', password: '' });
    setFormErrors({});
  }, []);

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!validateForm()) {
        throw new Error('Please fix validation errors');
      }
      return api.create({ 
        email: formData.email.trim(), 
        password: formData.password 
      });
    },
    onSuccess: () => {
      toast.success('User created successfully');
      handleCloseModal();
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to create user';
      toast.error(message);
    }
  });

  const handleCreateUser = useCallback(() => {
    createMutation.mutate();
  }, [createMutation]);

  const isFormValid = formData.email.trim() && formData.password && !Object.keys(formErrors).length;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Users"
          subtitle="Create and manage users in the current organization"
          icon={Users}
          actions={
            <Button leftIcon={Plus} onClick={handleOpenModal}>
              New User
            </Button>
          }
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading users...</div>
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
          title="Users"
          subtitle="Create and manage users in the current organization"
          icon={Users}
          actions={
            <Button leftIcon={Plus} onClick={handleOpenModal}>
              New User
            </Button>
          }
        />
        <ContentCard>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-sm font-medium text-slate-900">Failed to load users</div>
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
        title="Users"
        subtitle="Create and manage users in the current organization"
        icon={Users}
        actions={
          <Button 
            leftIcon={Plus} 
            onClick={handleOpenModal}
            aria-label="Create new user"
          >
            New User
          </Button>
        }
      />

      <ContentCard>
        <div className="mb-4">
          <div className="text-base font-semibold text-slate-900">User Directory</div>
          <div className="mt-1 text-sm text-slate-500">
            {users.length} {users.length === 1 ? 'user' : 'users'} in this organization
          </div>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <div className="text-sm font-medium text-slate-900 mb-1">No users yet</div>
            <div className="text-sm text-slate-500 mb-4">Create your first user to get started</div>
            <Button 
              leftIcon={Plus} 
              onClick={handleOpenModal}
              size="sm"
            >
              Create User
            </Button>
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Email</TH>
                <TH>Status</TH>
                <TH>Created</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {users.map((user) => {
                const statusConfig = getStatusConfig(user.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <TD>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <Link 
                          className="font-medium text-brand-deep hover:text-brand-deep/80 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-deep focus:ring-offset-1 rounded"
                          to={ROUTES.adminUserDetail(user.id)}
                          aria-label={`View details for ${user.email}`}
                        >
                          {user.email}
                        </Link>
                      </div>
                    </TD>
                    <TD>
                      <Badge 
                        variant={statusConfig.variant}
                        tone={statusConfig.tone}
                        className="inline-flex items-center gap-1.5"
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {formatDate(user.created_at ?? user.createdAt)}
                      </div>
                    </TD>
                    <TD className="text-right">
                      <Link to={ROUTES.adminUserDetail(user.id)}>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          aria-label={`View ${user.email}`}
                        >
                          View
                        </Button>
                      </Link>
                    </TD>
                  </tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </ContentCard>

      {/* Create User Modal */}
      <Modal
        open={createOpen}
        title="Create New User"
        onClose={handleCloseModal}
        footer={
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={handleCloseModal}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser} 
              loading={createMutation.isPending}
              disabled={!isFormValid}
              leftIcon={Plus}
            >
              Create User
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <UserCheck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <div className="font-medium mb-1">Add a new user to your organization</div>
                <div className="text-blue-700">
                  The user will receive login credentials and can access the system immediately.
                </div>
              </div>
            </div>
          </div>

          <div>
            <Input 
              label="Email Address"
              type="email"
              value={formData.email} 
              onChange={(e) => handleFieldChange('email', e.target.value)}
              placeholder="user@example.com"
              required
              error={formErrors.email}
              leftIcon={Mail}
              aria-label="User email address"
            />
          </div>

          <div>
            <Input 
              label="Password"
              type="password"
              value={formData.password} 
              onChange={(e) => handleFieldChange('password', e.target.value)}
              placeholder="Enter secure password"
              required
              error={formErrors.password}
              leftIcon={Lock}
              aria-label="User password"
              helperText="Minimum 10 characters required"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-700 mb-2">Password Requirements</div>
            <ul className="text-xs text-slate-600 space-y-1">
              <li className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${formData.password.length >= 10 ? 'bg-green-500' : 'bg-slate-300'}`} />
                At least 10 characters long
              </li>
              <li className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${formData.password ? 'bg-green-500' : 'bg-slate-300'}`} />
                Cannot be empty
              </li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
}