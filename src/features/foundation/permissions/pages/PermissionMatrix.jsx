import React, { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Shield, 
  Search, 
  Lock, 
  AlertCircle, 
  Grid3x3,
  CheckCircle2,
  XCircle
} from 'lucide-react';


import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeRolesApi } from '../../roles/api/roles.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';

/**
 * PermissionMatrix Component
 * 
 * Displays a read-only matrix of roles and their associated permissions with QuickBooks-style formatting.
 * Supports filtering by role name or permission code.
 * 
 * @component
 */
export default function PermissionMatrix() {
  const { http } = useApi();
  const rolesApi = useMemo(() => makeRolesApi(http), [http]);
  const [filter, setFilter] = useState('');

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

  // Filter rows
  const filteredRows = useMemo(() => {
    if (!filter.trim()) return rows;
    
    const searchTerm = filter.trim().toLowerCase();
    return rows.filter((role) => {
      const nameMatch = role.name.toLowerCase().includes(searchTerm);
      const permissionMatch = (role.permissions ?? []).some((p) => 
        p.toLowerCase().includes(searchTerm)
      );
      return nameMatch || permissionMatch;
    });
  }, [rows, filter]);

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
              placeholder="Search by role name or permission code..."
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
        <div className="mb-4">
          <div className="text-base font-semibold text-slate-900">Role-Permission Matrix</div>
          <div className="mt-1 text-sm text-slate-500">
            View which permissions are assigned to each role
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
          <div className="space-y-4">
            {filteredRows.map((role, index) => {
              const permissionCount = (role.permissions ?? []).length;
              
              return (
                <div 
                  key={role.id} 
                  className="rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2 flex-1">
                        <Shield className="h-5 w-5 text-slate-400 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-900">{role.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Role ID: {role.id}
                          </div>
                        </div>
                      </div>
                      
                      <Badge 
                        tone={permissionCount > 0 ? 'success' : 'muted'}
                        className="flex items-center gap-1.5"
                      >
                        {permissionCount > 0 ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {permissionCount} {permissionCount === 1 ? 'permission' : 'permissions'}
                      </Badge>
                    </div>
                    
                    {permissionCount > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {(role.permissions ?? []).map((permission) => (
                          <span 
                            key={permission} 
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            <Lock className="h-3 w-3" />
                            {permission}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                        <XCircle className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                        <div className="text-xs text-slate-500">No permissions assigned</div>
                      </div>
                    )}
                  </div>
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