import React, { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Shield, 
  Search, 
  Lock, 
  AlertCircle, 
  Grid3x3,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Tag,
  Layers
} from 'lucide-react';

import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeRolesApi } from '../../roles/api/roles.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';

/**
 * Parse permission code into domain, entity, and action
 * Example: "transactions.invoice.issue" -> { domain: "transactions", entity: "invoice", action: "issue" }
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
 * Group permissions by domain and entity
 */
function groupPermissions(permissions) {
  const grouped = new Map();
  
  permissions.forEach(permission => {
    const parsed = parsePermission(permission);
    
    if (!grouped.has(parsed.domain)) {
      grouped.set(parsed.domain, new Map());
    }
    
    const domainGroup = grouped.get(parsed.domain);
    if (!domainGroup.has(parsed.entity)) {
      domainGroup.set(parsed.entity, []);
    }
    
    domainGroup.get(parsed.entity).push(parsed);
  });
  
  return grouped;
}

/**
 * Get display name for domain
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
    'close': 'bg-stone-100 text-stone-700 border-stone-200'
  };
  
  return colors[action] || 'bg-gray-100 text-gray-700 border-gray-200';
}

/**
 * PermissionMatrix Component
 * Displays a read-only matrix of roles and their associated permissions with domain grouping.
 */
export default function PermissionMatrix() {
  const { http } = useApi();
  const rolesApi = useMemo(() => makeRolesApi(http), [http]);
  const [filter, setFilter] = useState('');
  const [expandedDomains, setExpandedDomains] = useState(new Set());

  // Fetch permission matrix
  const { 
    data, 
    isLoading, 
    isError, 
    error 
  } = useQuery({ 
    queryKey: ['roleMatrix'], 
    queryFn: rolesApi.matrix, 
    staleTime: 30000,
    retry: 2
  });

  // Extract rows safely
  const rows = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  }, [data]);

  // Build domain stats and grouped permissions for each role
  const enrichedRows = useMemo(() => {
    return rows.map(role => {
      const permissions = role.permissions ?? [];
      const grouped = groupPermissions(permissions);
      const domainStats = Array.from(grouped.entries()).map(([domain, entities]) => ({
        domain,
        displayName: getDomainDisplayName(domain),
        entityCount: entities.size,
        permissionCount: Array.from(entities.values()).reduce((sum, perms) => sum + perms.length, 0)
      }));
      
      return {
        ...role,
        groupedPermissions: grouped,
        domainStats,
        totalPermissions: permissions.length
      };
    });
  }, [rows]);

  // Filter rows
  const filteredRows = useMemo(() => {
    if (!filter.trim()) return enrichedRows;
    
    const searchTerm = filter.trim().toLowerCase();
    return enrichedRows.filter((role) => {
      const nameMatch = role.name.toLowerCase().includes(searchTerm);
      const permissionMatch = (role.permissions ?? []).some((p) => 
        p.toLowerCase().includes(searchTerm)
      );
      const domainMatch = role.domainStats.some(stat => 
        stat.displayName.toLowerCase().includes(searchTerm) ||
        stat.domain.toLowerCase().includes(searchTerm)
      );
      return nameMatch || permissionMatch || domainMatch;
    });
  }, [enrichedRows, filter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRoles = rows.length;
    const totalPermissions = rows.reduce((sum, role) => 
      sum + (role.permissions ?? []).length, 0
    );
    const rolesWithPermissions = rows.filter(role => 
      (role.permissions ?? []).length > 0
    ).length;
    const rolesWithoutPermissions = totalRoles - rolesWithPermissions;
    
    return {
      totalRoles,
      totalPermissions,
      rolesWithPermissions,
      rolesWithoutPermissions,
      averagePermissionsPerRole: totalRoles > 0 
        ? (totalPermissions / totalRoles).toFixed(1) 
        : '0'
    };
  }, [rows]);

  const handleFilterChange = useCallback((e) => {
    setFilter(e.target.value);
  }, []);

  const handleClearFilter = useCallback(() => {
    setFilter('');
  }, []);

  const toggleDomain = useCallback((roleId, domain) => {
    setExpandedDomains(prev => {
      const key = `${roleId}:${domain}`;
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const expandAllDomains = useCallback((roleId) => {
    const role = filteredRows.find(r => r.id === roleId);
    if (role) {
      setExpandedDomains(prev => {
        const next = new Set(prev);
        role.domainStats.forEach(stat => {
          next.add(`${roleId}:${stat.domain}`);
        });
        return next;
      });
    }
  }, [filteredRows]);

  const collapseAllDomains = useCallback((roleId) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      Array.from(next).forEach(key => {
        if (key.startsWith(`${roleId}:`)) {
          next.delete(key);
        }
      });
      return next;
    });
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Permission Matrix"
          subtitle="Role and permission mapping overview"
          icon={Grid3x3}
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading permission matrix...</div>
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
          title="Permission Matrix"
          subtitle="Role and permission mapping overview"
          icon={Grid3x3}
        />
        <ContentCard>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-sm font-medium text-slate-900">Failed to load permission matrix</div>
            <div className="text-sm text-slate-500">{error?.message ?? 'An error occurred'}</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </ContentCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permission Matrix"
        subtitle="Read-only overview of role and permission assignments"
        icon={Grid3x3}
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ContentCard>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Total Roles</div>
              <div className="text-xl font-bold text-slate-900">{stats.totalRoles}</div>
            </div>
          </div>
        </ContentCard>

        <ContentCard>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Lock className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Total Permissions</div>
              <div className="text-xl font-bold text-slate-900">{stats.totalPermissions}</div>
            </div>
          </div>
        </ContentCard>

        <ContentCard>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Configured Roles</div>
              <div className="text-xl font-bold text-slate-900">{stats.rolesWithPermissions}</div>
            </div>
          </div>
        </ContentCard>

        <ContentCard>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100">
              <Grid3x3 className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Avg per Role</div>
              <div className="text-xl font-bold text-slate-900">{stats.averagePermissionsPerRole}</div>
            </div>
          </div>
        </ContentCard>
      </div>

      {/* Filter Section */}
      <ContentCard>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <Input 
              value={filter} 
              onChange={handleFilterChange}
              placeholder="Search by role name, domain, or permission code..."
              leftIcon={Search}
              aria-label="Filter roles and permissions"
            />
          </div>
          {filter && (
            <button
              onClick={handleClearFilter}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        
        {filter && (
          <div className="mt-3 text-sm text-slate-600">
            Showing {filteredRows.length} of {rows.length} {filteredRows.length === 1 ? 'role' : 'roles'}
          </div>
        )}
      </ContentCard>

      {/* Matrix Content */}
      <ContentCard>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-slate-900">Role-Permission Matrix</div>
            <div className="mt-1 text-sm text-slate-500">
              Permissions grouped by functional domain for easier browsing
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Manage</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Create</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-purple-500" />
              <span>Issue</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-slate-500" />
              <span>Read</span>
            </div>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="text-center py-12">
            {filter ? (
              <>
                <Search className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <div className="text-sm font-medium text-slate-900 mb-1">No matches found</div>
                <div className="text-sm text-slate-500 mb-4">
                  Try adjusting your search terms
                </div>
                <button
                  onClick={handleClearFilter}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Clear Filter
                </button>
              </>
            ) : (
              <>
                <Shield className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <div className="text-sm font-medium text-slate-900 mb-1">No roles configured</div>
                <div className="text-sm text-slate-500">Create roles to see them here</div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredRows.map((role) => {
              const hasPermissions = role.totalPermissions > 0;
              
              return (
                <div 
                  key={role.id} 
                  className="rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors overflow-hidden"
                >
                  {/* Role Header */}
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <Shield className="h-5 w-5 text-slate-400 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-base font-semibold text-slate-900">{role.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Role ID: {role.id}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          tone={hasPermissions ? 'success' : 'muted'}
                          className="flex items-center gap-1.5"
                        >
                          {hasPermissions ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {role.totalPermissions} {role.totalPermissions === 1 ? 'permission' : 'permissions'}
                        </Badge>
                        
                        {hasPermissions && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => expandAllDomains(role.id)}
                              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Expand all domains"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => collapseAllDomains(role.id)}
                              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Collapse all domains"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Domain Summary Chips */}
                    {hasPermissions && role.domainStats.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {role.domainStats.map(stat => (
                          <button
                            key={stat.domain}
                            onClick={() => toggleDomain(role.id, stat.domain)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <FolderTree className="h-3 w-3" />
                            {stat.displayName}
                            <span className="ml-0.5 text-slate-400">({stat.permissionCount})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Permissions by Domain */}
                  {hasPermissions && (
                    <div className="p-4">
                      {role.domainStats.map(stat => {
                        const isExpanded = expandedDomains.has(`${role.id}:${stat.domain}`);
                        const entities = role.groupedPermissions.get(stat.domain);
                        
                        if (!entities) return null;
                        
                        return (
                          <div key={stat.domain} className="mb-4 last:mb-0">
                            <button
                              onClick={() => toggleDomain(role.id, stat.domain)}
                              className="flex items-center gap-2 w-full text-left mb-2 group"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                              )}
                              <Layers className="h-4 w-4 text-slate-500" />
                              <span className="text-sm font-medium text-slate-700">
                                {stat.displayName}
                              </span>
                              <span className="text-xs text-slate-400">
                                ({stat.permissionCount} permissions)
                              </span>
                            </button>
                            
                            {isExpanded && (
                              <div className="ml-6 mt-2 space-y-3">
                                {Array.from(entities.entries()).map(([entity, permissions]) => (
                                  <div key={entity}>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Tag className="h-3 w-3 text-slate-400" />
                                      <span className="text-xs font-medium text-slate-600">
                                        {entity.split('.').pop()}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 ml-5">
                                      {permissions.map(perm => (
                                        <span 
                                          key={perm.fullCode} 
                                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${getActionColor(perm.action)}`}
                                          title={perm.fullCode}
                                        >
                                          <Lock className="h-3 w-3" />
                                          {perm.action}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {!hasPermissions && (
                    <div className="p-6">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                        <XCircle className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                        <div className="text-sm text-slate-500">No permissions assigned to this role</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ContentCard>

      {/* Summary Footer */}
      {filteredRows.length > 0 && (
        <ContentCard>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Grid3x3 className="h-4 w-4" />
              <span>
                Displaying {filteredRows.length} {filteredRows.length === 1 ? 'role' : 'roles'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-600">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>{stats.rolesWithPermissions} configured</span>
              </div>
              {stats.rolesWithoutPermissions > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-slate-300" />
                  <span>{stats.rolesWithoutPermissions} empty</span>
                </div>
              )}
            </div>
          </div>
        </ContentCard>
      )}
    </div>
  );
}