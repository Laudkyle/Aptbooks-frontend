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
  Filter,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Tag,
  Layers,
  Package,
  FileText,
  Users,
  CreditCard,
  Building2,
  ChartLine,
  Boxes,
  Briefcase,
  Landmark,
  Settings,
  Globe,
  Zap,
  Mail,
  FileCheck,
  Scale
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
 * Parse permission code into domain, entity, and action
 */
function parsePermission(permissionCode) {
  const parts = permissionCode.split('.');
  if (parts.length >= 2) {
    return {
      domain: parts[0],
      entity: parts.length >= 2 ? parts.slice(0, -1).join('.') : parts[0],
      action: parts[parts.length - 1],
      fullCode: permissionCode
    };
  }
  return {
    domain: 'other',
    entity: permissionCode,
    action: 'manage',
    fullCode: permissionCode
  };
}

/**
 * Group permissions by domain
 */
function groupPermissionsByDomain(permissions, attachedSet) {
  const grouped = new Map();
  
  permissions.forEach(permission => {
    const parsed = parsePermission(permission.code);
    
    if (!grouped.has(parsed.domain)) {
      grouped.set(parsed.domain, {
        domain: parsed.domain,
        displayName: getDomainDisplayName(parsed.domain),
        icon: getDomainIcon(parsed.domain),
        permissions: [],
        attachedCount: 0,
        totalCount: 0
      });
    }
    
    const domainGroup = grouped.get(parsed.domain);
    const isAttached = attachedSet.has(permission.code);
    
    domainGroup.permissions.push({
      ...permission,
      parsed,
      isAttached
    });
    domainGroup.totalCount++;
    if (isAttached) domainGroup.attachedCount++;
  });
  
  return Array.from(grouped.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Get domain display name
 */
function getDomainDisplayName(domain) {
  const domainNames = {
    'transactions': 'Transactions',
    'accounting': 'Accounting',
    'reporting': 'Reporting',
    'inventory': 'Inventory',
    'hr': 'Human Resources',
    'banking': 'Banking',
    'automation': 'Automation',
    'compliance': 'Compliance',
    'assets': 'Fixed Assets',
    'rbac': 'Security & Roles',
    'core': 'Core System',
    'settings': 'Settings',
    'utilities': 'Utilities',
    'integrations': 'Integrations',
    'payments': 'Payments',
    'tax': 'Tax',
    'taxforms': 'Tax Forms',
    'einvoicing': 'E-Invoicing',
    'documents': 'Documents',
    'webhooks': 'Webhooks',
    'notifications': 'Notifications',
    'approvals': 'Approvals',
    'collections': 'Collections',
    'disputes': 'Disputes',
    'writeoffs': 'Write-offs',
    'payment_plans': 'Payment Plans',
    'payment_config': 'Payment Configuration',
    'printing': 'Printing',
    'partners': 'Partners',
    'search': 'Search',
    'users': 'Users'
  };
  
  return domainNames[domain] || domain.charAt(0).toUpperCase() + domain.slice(1);
}

/**
 * Get domain icon
 */
function getDomainIcon(domain) {
  const icons = {
    'transactions': FileText,
    'accounting': ChartLine,
    'reporting': ChartLine,
    'inventory': Package,
    'hr': Users,
    'banking': Landmark,
    'automation': Zap,
    'compliance': Scale,
    'assets': Building2,
    'rbac': Shield,
    'core': Settings,
    'settings': Settings,
    'utilities': Settings,
    'integrations': Globe,
    'payments': CreditCard,
    'tax': FileCheck,
    'taxforms': FileCheck,
    'einvoicing': Mail,
    'documents': FileText,
    'webhooks': Zap,
    'notifications': Mail,
    'approvals': Check,
    'collections': Briefcase,
    'disputes': AlertCircle,
    'writeoffs': X,
    'payment_plans': Calendar,
    'payment_config': Settings,
    'printing': FileText,
    'partners': Users,
    'search': Search,
    'users': Users
  };
  
  return icons[domain] || FolderTree;
}

/**
 * Get action badge color
 */
function getActionColor(action) {
  const colors = {
    'read': 'bg-slate-100 text-slate-700 border-slate-200',
    'manage': 'bg-blue-100 text-blue-700 border-blue-200',
    'create': 'bg-green-100 text-green-700 border-green-200',
    'update': 'bg-amber-100 text-amber-700 border-amber-200',
    'delete': 'bg-red-100 text-red-700 border-red-200',
    'issue': 'bg-purple-100 text-purple-700 border-purple-200',
    'post': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'void': 'bg-orange-100 text-orange-700 border-orange-200',
    'run': 'bg-teal-100 text-teal-700 border-teal-200',
    'approve': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'import': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'export': 'bg-violet-100 text-violet-700 border-violet-200',
    'lock': 'bg-rose-100 text-rose-700 border-rose-200',
    'unlock': 'bg-lime-100 text-lime-700 border-lime-200',
    'close': 'bg-stone-100 text-stone-700 border-stone-200',
    'apply': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'reallocate': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'suggest': 'bg-sky-100 text-sky-700 border-sky-200',
    'execute': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'dispatch': 'bg-amber-100 text-amber-700 border-amber-200'
  };
  
  return colors[action] || 'bg-gray-100 text-gray-700 border-gray-200';
}

/**
 * RoleDetail Component
 * Displays role details with domain-grouped permissions management
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
  const [expandedDomains, setExpandedDomains] = useState(new Set());
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' or 'flat'

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

  // Group permissions by domain
  const groupedPermissions = useMemo(() => {
    return groupPermissionsByDomain(permissions, attachedPermissions);
  }, [permissions, attachedPermissions]);

  // Filter permissions based on search
  const filteredGroupedPermissions = useMemo(() => {
    if (!filter.trim()) return groupedPermissions;
    
    const searchTerm = filter.trim().toLowerCase();
    return groupedPermissions
      .map(domain => ({
        ...domain,
        permissions: domain.permissions.filter(p => 
          p.code.toLowerCase().includes(searchTerm) || 
          (p.description ?? '').toLowerCase().includes(searchTerm)
        )
      }))
      .filter(domain => domain.permissions.length > 0);
  }, [groupedPermissions, filter]);

  // Flat filtered permissions for flat view
  const flatFilteredPermissions = useMemo(() => {
    if (!filter.trim()) return permissions;
    const searchTerm = filter.trim().toLowerCase();
    return permissions.filter(p => 
      p.code.toLowerCase().includes(searchTerm) || 
      (p.description ?? '').toLowerCase().includes(searchTerm)
    );
  }, [permissions, filter]);

  // Initialize role name when data loads
  useEffect(() => {
    if (role?.name) {
      setRoleName(role.name);
      setHasChanges(false);
    }
  }, [role?.name]);

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

  const handleSelectAllInDomain = useCallback((domainPermissions) => {
    setSelected((prev) => {
      const next = new Set(prev);
      domainPermissions.forEach(p => next.add(p.code));
      return next;
    });
  }, []);

  const handleDeselectAllInDomain = useCallback((domainPermissions) => {
    setSelected((prev) => {
      const next = new Set(prev);
      domainPermissions.forEach(p => next.delete(p.code));
      return next;
    });
  }, []);

  const handleSelectAllFiltered = useCallback(() => {
    if (viewMode === 'grouped') {
      const allCodes = filteredGroupedPermissions.flatMap(d => d.permissions.map(p => p.code));
      setSelected(new Set(allCodes));
    } else {
      setSelected(new Set(flatFilteredPermissions.map(p => p.code)));
    }
  }, [viewMode, filteredGroupedPermissions, flatFilteredPermissions]);

  const handleDeselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const toggleDomain = useCallback((domain) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  }, []);

  const expandAllDomains = useCallback(() => {
    setExpandedDomains(new Set(filteredGroupedPermissions.map(d => d.domain)));
  }, [filteredGroupedPermissions]);

  const collapseAllDomains = useCallback(() => {
    setExpandedDomains(new Set());
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
            <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-base font-semibold text-slate-900">Permission Management</div>
                <div className="mt-1 text-sm text-slate-500">
                  {attachedCount} {attachedCount === 1 ? 'permission' : 'permissions'} attached
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 mr-2">
                  <button
                    onClick={() => setViewMode('grouped')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      viewMode === 'grouped' 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Grouped
                  </button>
                  <button
                    onClick={() => setViewMode('flat')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      viewMode === 'flat' 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Flat
                  </button>
                </div>
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

            <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Input 
                  value={filter} 
                  onChange={handleFilterChange}
                  placeholder="Search by code, description, or domain..."
                  leftIcon={Search}
                />
              </div>
              <div className="flex items-center gap-2">
                {viewMode === 'grouped' && filteredGroupedPermissions.length > 0 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={expandAllDomains}
                    >
                      Expand All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={collapseAllDomains}
                    >
                      Collapse All
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllFiltered}
                  disabled={(viewMode === 'grouped' ? filteredGroupedPermissions.length === 0 : flatFilteredPermissions.length === 0)}
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
            ) : viewMode === 'grouped' ? (
              // Grouped View - Permissions by Domain
              filteredGroupedPermissions.length === 0 ? (
                <div className="text-center py-12">
                  <Filter className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <div className="text-sm font-medium text-slate-900 mb-1">No permissions found</div>
                  <div className="text-sm text-slate-500">
                    {filter ? 'Try adjusting your search' : 'No permissions available'}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredGroupedPermissions.map((domain) => {
                    const DomainIcon = domain.icon;
                    const isExpanded = expandedDomains.has(domain.domain);
                    const domainSelectedCount = domain.permissions.filter(p => selected.has(p.code)).length;
                    const domainAttachedCount = domain.permissions.filter(p => p.isAttached).length;
                    
                    return (
                      <div key={domain.domain} className="rounded-xl border border-slate-200 overflow-hidden">
                        {/* Domain Header */}
                        <div 
                          className="flex items-center justify-between p-4 bg-slate-50/50 cursor-pointer hover:bg-slate-100/50 transition-colors"
                          onClick={() => toggleDomain(domain.domain)}
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            )}
                            <DomainIcon className="h-5 w-5 text-slate-500" />
                            <div>
                              <div className="font-medium text-slate-900">{domain.displayName}</div>
                              <div className="text-xs text-slate-500">
                                {domain.totalCount} total • {domain.attachedCount} attached
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {domainSelectedCount > 0 && (
                              <Badge tone="brand" className="text-xs">
                                {domainSelectedCount} selected
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSelectAllInDomain(domain.permissions)}
                              className="text-xs"
                            >
                              Select All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeselectAllInDomain(domain.permissions)}
                              className="text-xs"
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                        
                        {/* Domain Content */}
                        {isExpanded && (
                          <div className="border-t border-slate-200">
                            <table className="min-w-full divide-y divide-slate-200">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="w-12 px-4 py-2 text-left">
                                    <span className="sr-only">Select</span>
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Permission
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Description
                                  </th>
                                  <th className="w-24 px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-slate-100">
                                {domain.permissions.map((permission) => {
                                  const isAttached = permission.isAttached;
                                  const isSelected = selected.has(permission.code);
                                  const actionColor = getActionColor(permission.parsed.action);
                                  
                                  return (
                                    <tr key={permission.code} className={`hover:bg-slate-50 transition-colors ${isAttached ? 'bg-green-50/20' : ''}`}>
                                      <td className="px-4 py-2 text-center">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => handleTogglePermission(permission.code)}
                                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                          aria-label={`Select ${permission.code}`}
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <div className="flex items-center gap-2">
                                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${actionColor}`}>
                                            {permission.parsed.action}
                                          </span>
                                          <span className="font-mono text-xs text-slate-700">
                                            {permission.parsed.entity}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-2">
                                        <span className="text-sm text-slate-600">
                                          {permission.description || '—'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-center">
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
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              // Flat View - Original Table View
              flatFilteredPermissions.length === 0 ? (
                <div className="text-center py-12">
                  <Filter className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <div className="text-sm font-medium text-slate-900 mb-1">No permissions found</div>
                  <div className="text-sm text-slate-500">
                    {filter ? 'Try adjusting your search' : 'No permissions available'}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="w-12 px-4 py-3 text-left">
                          <span className="sr-only">Select</span>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Permission Code
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="w-24 px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {flatFilteredPermissions.map((permission) => {
                        const isAttached = attachedPermissions.has(permission.code);
                        const isSelected = selected.has(permission.code);
                        const parsed = parsePermission(permission.code);
                        const actionColor = getActionColor(parsed.action);
                        
                        return (
                          <tr 
                            key={permission.code}
                            className={`hover:bg-slate-50 transition-colors ${isAttached ? 'bg-green-50/20' : ''}`}
                          >
                            <td className="px-4 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleTogglePermission(permission.code)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                aria-label={`Select ${permission.code}`}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${actionColor}`}>
                                  {parsed.action}
                                </span>
                                <span className="font-mono text-xs text-slate-700">
                                  {parsed.entity}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <span className="text-sm text-slate-600">
                                {permission.description || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center">
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
                            </td>
                           </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
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

          {/* Domain Summary */}
          <ContentCard>
            <div className="text-sm font-semibold text-slate-900 mb-4">Permissions by Domain</div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {groupedPermissions.map(domain => {
                const DomainIcon = domain.icon;
                return (
                  <div key={domain.domain} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <DomainIcon className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-slate-600">{domain.displayName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">{domain.attachedCount}</span>
                      <span className="text-xs text-slate-300">/</span>
                      <span className="text-xs font-medium text-slate-600">{domain.totalCount}</span>
                    </div>
                  </div>
                );
              })}
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