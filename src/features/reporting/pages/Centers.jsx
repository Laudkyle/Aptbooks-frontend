import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Layers, 
  Plus, 
  RefreshCw, 
  AlertCircle, 
  Building2,
  Calendar,
  CheckCircle2,
  Lock,
  XCircle,
  Edit2,
  Archive,
  ChevronDown,
  ChevronRight,
  FolderTree,
  DollarSign,
  TrendingUp,
  PieChart,
  Filter,
  Search,
  X
} from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makePlanningApi } from '../api/planning.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { formatDate } from '../../../shared/utils/formatDate.js';
import { generateUUID } from '../../../shared/utils/generateUUID.js';

function rowsFrom(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.data.data)) return data.data.data;
  if (Array.isArray(data.data.data.data)) return data.data.data.data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

// Helper to build hierarchical options for select dropdown
function buildHierarchicalOptions(centers, currentCenterId = null, level = 0) {
  if (!centers || centers.length === 0) return [];
  
  const options = [];
  const byParent = {};
  
  // Group centers by parentId
  centers.forEach(center => {
    const parentKey = center.parentId || 'root';
    if (!byParent[parentKey]) byParent[parentKey] = [];
    byParent[parentKey].push(center);
  });
  
  // Recursive function to add options with indentation
  function addChildren(parentId = null, depth = 0) {
    const children = byParent[parentId || 'root'] || [];
    children.sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name));
    
    children.forEach(center => {
      // Don't include current center as a parent of itself
      if (currentCenterId && center.id === currentCenterId) return;
      
      const prefix = '　'.repeat(depth) + (depth > 0 ? '↳ ' : '');
      options.push({
        value: center.id,
        label: `${prefix}${center.code ? `[${center.code}] ` : ''}${center.name}`
      });
      
      // Add children recursively
      addChildren(center.id, depth + 1);
    });
  }
  
  addChildren(null, 0);
  return options;
}

// Get icon for center type
function getCenterTypeIcon(type) {
  switch(type) {
    case 'cost': return DollarSign;
    case 'profit': return TrendingUp;
    case 'investment': return PieChart;
    default: return Building2;
  }
}

// Get color for center type
function getCenterTypeColor(type) {
  switch(type) {
    case 'cost': return 'text-blue-600 bg-blue-50';
    case 'profit': return 'text-green-600 bg-green-50';
    case 'investment': return 'text-purple-600 bg-purple-50';
    default: return 'text-slate-600 bg-slate-50';
  }
}

export default function Centers() {
  const { http } = useApi();
  const api = useMemo(() => makePlanningApi(http), [http]);
  const qc = useQueryClient();

  // View mode: 'cost', 'profit', 'investment', or 'all'
  const [viewMode, setViewMode] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [formData, setFormData] = useState({
    type: 'cost',
    code: '', 
    name: '', 
    status: 'active', 
    parentId: '',
    validFrom: '', 
    validTo: '', 
    isBlocked: false, 
    blockedReason: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const toast = useToast();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const queryParams = useMemo(() => ({ 
    status: statusFilter || undefined 
  }), [statusFilter]);

  // Main query for centers
  const { 
    data, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery({
    queryKey: viewMode === 'all' 
      ? ['reporting', 'centers', 'all', { status: statusFilter, type: typeFilter, search: debouncedSearch }]
      : qk.reportingCenters 
        ? qk.reportingCenters(viewMode, queryParams)
        : ['reporting', 'centers', viewMode, queryParams],
    queryFn: () => {
      if (viewMode === 'all') {
        return api.centers.getAll({ 
          status: statusFilter || undefined,
          includeArchived: statusFilter === 'archived' ? true : undefined
        });
      } else {
        return api.centers.list(viewMode, queryParams);
      }
    },
    staleTime: 30000,
    retry: 2
  });

  // Compute stats from the data we already have
  const stats = useMemo(() => {
    if (!data) {
      return {
        total: 0,
        byType: { cost: 0, profit: 0, investment: 0 },
        byStatus: { active: 0, inactive: 0, archived: 0 }
      };
    }

    const allRows = rowsFrom(data);
    
    return {
      total: allRows.length,
      byType: {
        cost: allRows.filter(c => c.centerType === 'cost').length,
        profit: allRows.filter(c => c.centerType === 'profit').length,
        investment: allRows.filter(c => c.centerType === 'investment').length
      },
      byStatus: {
        active: allRows.filter(c => c.status === 'active').length,
        inactive: allRows.filter(c => c.status === 'inactive').length,
        archived: allRows.filter(c => c.status === 'archived').length
      }
    };
  }, [data]);

  // Query for parent dropdown (needs all centers of the selected type)
  const { data: allCentersData } = useQuery({
    queryKey: ['reporting', 'centers', formData.type, 'all'],
    queryFn: () => api.centers.list(formData.type, {}),
    staleTime: 60000,
    enabled: createModalOpen || editModalOpen,
  });

  const rows = useMemo(() => {
    const allRows = rowsFrom(data);
    
    // Apply client-side filtering for all view
    if (viewMode === 'all' && allRows.length > 0) {
      let filtered = [...allRows];
      
      // Filter by type
      if (typeFilter) {
        filtered = filtered.filter(c => c.centerType === typeFilter);
      }
      
      // Filter by search
      if (debouncedSearch) {
        const search = debouncedSearch.toLowerCase();
        filtered = filtered.filter(c => 
          c.name?.toLowerCase().includes(search) ||
          c.code?.toLowerCase().includes(search)
        );
      }
      
      return filtered;
    }
    
    return allRows;
  }, [data, viewMode, typeFilter, debouncedSearch]);

  const allCenters = useMemo(() => rowsFrom(allCentersData), [allCentersData]);

  // Build parent options for select dropdown
  const parentOptions = useMemo(() => {
    const options = [{ value: '', label: '— No Parent —' }];
    if (allCenters.length > 0) {
      const hierarchicalOptions = buildHierarchicalOptions(
        allCenters.filter(c => c.status !== 'archived'),
        selectedCenter?.id
      );
      options.push(...hierarchicalOptions);
    }
    return options;
  }, [allCenters, selectedCenter?.id]);

  const getStatusConfig = useCallback((status) => {
    const s = (status ?? '').toLowerCase();
    const configs = {
      active:   { tone: 'success', icon: CheckCircle2, label: 'Active' },
      inactive: { tone: 'warning', icon: XCircle, label: 'Inactive' },
      archived: { tone: 'muted', icon: Lock, label: 'Archived' }
    };
    return configs[s] || { tone: 'muted', icon: CheckCircle2, label: status || '—' };
  }, []);

  const getCenterTypeLabel = useCallback((type) => {
    const labels = { cost: 'Cost Center', profit: 'Profit Center', investment: 'Investment Center' };
    return labels[type] || type;
  }, []);

  const columns = useMemo(() => {
    const baseColumns = [];
    
    // For all view, show type column
    if (viewMode === 'all') {
      baseColumns.push({
        header: 'Type',
        render: (r) => {
          const TypeIcon = getCenterTypeIcon(r.centerType);
          const colorClass = getCenterTypeColor(r.centerType);
          return (
            <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
              <TypeIcon className="h-3 w-3" />
              <span>{getCenterTypeLabel(r.centerType)}</span>
            </div>
          );
        }
      });
    }
    
    // Add parent column
    baseColumns.push({
      header: 'Parent',
      render: (r) => {
        if (!r.parentId) return <span className="text-sm text-slate-400">—</span>;
        const parent = viewMode === 'all' ? rows.find(c => c.id === r.parentId) : allCenters.find(c => c.id === r.parentId);
        return (
          <div className="flex items-center gap-1 text-sm text-slate-600">
            <FolderTree className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate max-w-[150px]" title={parent?.name}>
              {parent?.name || 'Unknown'}
            </span>
          </div>
        );
      }
    });
    
    // Code column
    baseColumns.push({
      header: 'Code',
      render: (r) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-mono text-sm text-slate-900">{r.code ?? '—'}</span>
        </div>
      )
    });
    
    // Name column
    baseColumns.push({
      header: 'Name',
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm text-slate-900">{r.name}</span>
          {r.code && <span className="text-xs text-slate-500">{r.code}</span>}
        </div>
      )
    });
    
    // Status column
    baseColumns.push({
      header: 'Status',
      render: (r) => {
        const config = getStatusConfig(r.status);
        const StatusIcon = config.icon;
        return (
          <Badge tone={config.tone} className="inline-flex items-center gap-1.5">
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      }
    });
    
    // Valid From/To columns
    baseColumns.push({
      header: 'Valid From',
      render: (r) => (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          {formatDate(r.validFrom)}
        </div>
      )
    });
    
    baseColumns.push({
      header: 'Valid To',
      render: (r) => (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          {formatDate(r.validTo)}
        </div>
      )
    });
    
    // Blocked column
    baseColumns.push({
      header: 'Blocked',
      render: (r) => r.isBlocked ? (
        <Badge tone="error" className="inline-flex items-center gap-1.5">
          <Lock className="h-3 w-3" />Yes
        </Badge>
      ) : (
        <span className="text-sm text-slate-500">—</span>
      )
    });

    // Actions column
    baseColumns.push({
      header: 'Actions',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            leftIcon={Edit2}
            onClick={() => handleOpenEditModal(r)}
            disabled={r.status === 'archived'}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={Archive}
            onClick={() => handleOpenArchiveConfirm(r)}
            disabled={r.status === 'archived'}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Archive
          </Button>
        </div>
      )
    });

    return baseColumns;
  }, [viewMode, rows, allCenters, getStatusConfig, formatDate, getCenterTypeLabel]);

  const validateForm = useCallback(() => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (formData.isBlocked && !formData.blockedReason.trim()) errors.blockedReason = 'Blocked reason is required when center is blocked';
    if (formData.validFrom && formData.validTo) {
      const from = new Date(formData.validFrom);
      const to = new Date(formData.validTo);
      if (to < from) errors.validTo = 'Valid To must be after Valid From';
    }
    
    if (selectedCenter && formData.parentId === selectedCenter.id) {
      errors.parentId = 'A center cannot be its own parent';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, selectedCenter]);

  const handleOpenCreateModal = useCallback(() => {
    setCreateModalOpen(true);
    setFormData({ 
      type: viewMode !== 'all' ? viewMode : 'cost',
      code: '', 
      name: '', 
      status: 'active', 
      parentId: '', 
      validFrom: '', 
      validTo: '', 
      isBlocked: false, 
      blockedReason: '' 
    });
    setFormErrors({});
  }, [viewMode]);

  const handleCloseCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    setFormData({ 
      type: 'cost',
      code: '', 
      name: '', 
      status: 'active', 
      parentId: '', 
      validFrom: '', 
      validTo: '', 
      isBlocked: false, 
      blockedReason: '' 
    });
    setFormErrors({});
  }, []);

  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => { const newErrors = { ...prev }; delete newErrors[field]; return newErrors; });
    }
  }, [formErrors]);

  const handleRefresh = useCallback(() => { 
    refetch(); 
    toast.success('Centers data refreshed'); 
  }, [refetch, toast]);

  const handleOpenEditModal = useCallback((center) => {
    setSelectedCenter(center);
    setFormData({
      type: center.centerType || viewMode,
      code: center.code || '',
      name: center.name || '',
      status: center.status || 'active',
      parentId: center.parentId || '',
      validFrom: center.validFrom || '',
      validTo: center.validTo || '',
      isBlocked: center.isBlocked || false,
      blockedReason: center.blockedReason || ''
    });
    setFormErrors({});
    setEditModalOpen(true);
  }, [viewMode]);

  const handleCloseEditModal = useCallback(() => {
    setEditModalOpen(false);
    setSelectedCenter(null);
    setFormData({ 
      type: 'cost',
      code: '', 
      name: '', 
      status: 'active', 
      parentId: '', 
      validFrom: '', 
      validTo: '', 
      isBlocked: false, 
      blockedReason: '' 
    });
    setFormErrors({});
  }, []);

  const handleOpenArchiveConfirm = useCallback((center) => {
    setSelectedCenter(center);
    setArchiveConfirmOpen(true);
  }, []);

  const handleCloseArchiveConfirm = useCallback(() => {
    setArchiveConfirmOpen(false);
    setSelectedCenter(null);
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter('');
    setTypeFilter('');
    setSearchQuery('');
    setDebouncedSearch('');
  }, []);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!validateForm()) throw new Error('Please fix validation errors');
      
      const idempotencyKey = generateUUID();
      
      const body = {
        code: formData.code.trim() || null, 
        name: formData.name.trim(), 
        status: formData.status,
        parentId: formData.parentId || null, 
        validFrom: formData.validFrom || null,
        validTo: formData.validTo || null, 
        isBlocked: formData.isBlocked,
        blockedReason: formData.isBlocked ? formData.blockedReason.trim() : null
      };
      
      return api.centers.create(formData.type, body, {
        headers: { 'idempotency-key': idempotencyKey }
      });
    },
    onSuccess: () => {
      toast.success('Center created successfully');
      handleCloseCreateModal();
      // Invalidate all center queries
      qc.invalidateQueries({ queryKey: ['reporting', 'centers'] });
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? err?.message ?? 'Failed to create center')
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCenter) throw new Error('No center selected');
      if (!validateForm()) throw new Error('Please fix validation errors');
      
      const idempotencyKey = generateUUID();
      
      const body = {
        code: formData.code.trim() || null,
        name: formData.name.trim(),
        status: formData.status,
        parentId: formData.parentId || null,
        validFrom: formData.validFrom || null,
        validTo: formData.validTo || null,
        isBlocked: formData.isBlocked,
        blockedReason: formData.isBlocked ? formData.blockedReason.trim() : null
      };
      
      return api.centers.update(formData.type, selectedCenter.id, body, {
        headers: { 'idempotency-key': idempotencyKey }
      });
    },
    onSuccess: () => {
      toast.success('Center updated successfully');
      handleCloseEditModal();
      qc.invalidateQueries({ queryKey: ['reporting', 'centers'] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to update center';
      toast.error(message);
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCenter) throw new Error('No center selected');
      
      const idempotencyKey = generateUUID();
      const centerType = selectedCenter.centerType || viewMode;
      
      return api.centers.archive(centerType, selectedCenter.id, {
        headers: { 'idempotency-key': idempotencyKey }
      });
    },
    onSuccess: () => {
      toast.success('Center archived successfully');
      handleCloseArchiveConfirm();
      qc.invalidateQueries({ queryKey: ['reporting', 'centers'] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to archive center';
      toast.error(message);
      if (err?.response?.status === 409) {
        toast.error('This center is referenced by existing records. Use Inactive or Block instead.');
      }
    }
  });

  const handleCreateCenter = useCallback(() => createMutation.mutate(), [createMutation]);
  const handleUpdateCenter = useCallback(() => updateMutation.mutate(), [updateMutation]);
  const handleArchiveCenter = useCallback(() => archiveMutation.mutate(), [archiveMutation]);

  const getCenterTypeLabelPlural = useCallback((type) => {
    const labels = { 
      cost: 'Cost Centers', 
      profit: 'Profit Centers', 
      investment: 'Investment Centers',
      all: 'All Centers'
    };
    return labels[type] || type;
  }, []);

  if (isLoading && rows.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Centers" 
          subtitle="Manage cost, profit, and investment centers (dimension master data)" 
          icon={Layers} 
          actions={<Button leftIcon={Plus} onClick={handleOpenCreateModal}>New Center</Button>} 
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading centers...</div>
          </div>
        </ContentCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centers"
        subtitle="Manage cost, profit, and investment centers (dimension master data)"
        icon={Layers}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" leftIcon={RefreshCw} onClick={handleRefresh}>Refresh</Button>
            <Button leftIcon={Plus} onClick={handleOpenCreateModal}>New Center</Button>
          </div>
        }
      />

      {/* Stats Cards - Now computed from the data */}
      {viewMode === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Total Centers</div>
            <div className="text-2xl font-semibold text-slate-900">{stats.total}</div>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <DollarSign className="h-4 w-4" />
              <span>Cost Centers</span>
            </div>
            <div className="text-2xl font-semibold text-blue-900">{stats.byType.cost}</div>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <TrendingUp className="h-4 w-4" />
              <span>Profit Centers</span>
            </div>
            <div className="text-2xl font-semibold text-green-900">{stats.byType.profit}</div>
          </div>
          <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
            <div className="flex items-center gap-2 text-sm text-purple-700">
              <PieChart className="h-4 w-4" />
              <span>Investment Centers</span>
            </div>
            <div className="text-2xl font-semibold text-purple-900">{stats.byType.investment}</div>
          </div>
        </div>
      )}

      <ContentCard>
        <div className="mb-6 space-y-4">
          {/* Tabs and Filters Toggle */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Tabs
                value={viewMode}
                onValueChange={setViewMode}
                items={[
                  { value: 'cost', label: 'Cost Centers', icon: DollarSign },
                  { value: 'profit', label: 'Profit Centers', icon: TrendingUp },
                  { value: 'investment', label: 'Investment Centers', icon: PieChart },
                  { value: 'all', label: 'All Centers', icon: Layers }
                ]}
              />
              <Button
                variant="ghost"
                size="sm"
                leftIcon={Filter}
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-slate-100' : ''}
              >
                Filters
                {(statusFilter || typeFilter || searchQuery) && (
                  <Badge tone="primary" className="ml-2 px-1.5 py-0.5 text-xs">
                    {(statusFilter ? 1 : 0) + (typeFilter ? 1 : 0) + (searchQuery ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </div>
            
            {/* Quick Stats */}
            <div className="text-sm text-slate-500">
              {rows.length} {rows.length === 1 ? 'center' : 'centers'} found
              {(statusFilter || typeFilter || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="ml-2 text-xs"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                    </button>
                  )}
                </div>
              </div>
              
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { label: 'All Statuses', value: '' },
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' },
                  { label: 'Archived', value: 'archived' }
                ]}
              />
              
              {viewMode === 'all' && (
                <Select
                  label="Center Type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  options={[
                    { label: 'All Types', value: '' },
                    { label: 'Cost Centers', value: 'cost' },
                    { label: 'Profit Centers', value: 'profit' },
                    { label: 'Investment Centers', value: 'investment' }
                  ]}
                />
              )}
            </div>
          )}
        </div>

        {/* Error State */}
        {isError ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-sm font-medium text-slate-900">Failed to load centers</div>
            <div className="text-sm text-slate-500">{error?.message ?? 'An error occurred'}</div>
            <Button variant="outline" onClick={handleRefresh} className="mt-2">Retry</Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <div className="text-sm font-medium text-slate-900 mb-1">No centers found</div>
            <div className="text-sm text-slate-500 mb-4">
              {statusFilter || typeFilter || searchQuery 
                ? 'No centers match your filters. Try adjusting your search criteria.'
                : 'Create a center to begin tracking dimension performance.'}
            </div>
            <Button leftIcon={Plus} onClick={handleOpenCreateModal} size="sm">Create Center</Button>
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            rows={rows} 
            isLoading={isLoading} 
            empty={{ 
              title: 'No centers', 
              description: 'Create a center to begin tracking dimension performance.' 
            }}
          />
        )}
      </ContentCard>

      {/* Create Modal */}
      <Modal open={createModalOpen} onClose={handleCloseCreateModal} title="Create New Center">
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <div className="font-medium mb-1">Center Information</div>
                <div className="text-blue-700">Create a new center for tracking financial performance and allocations.</div>
              </div>
            </div>
          </div>

          <Select
            label="Center Type"
            value={formData.type}
            onChange={(e) => handleFieldChange('type', e.target.value)}
            options={[
              { value: 'cost', label: 'Cost Center' },
              { value: 'profit', label: 'Profit Center' },
              { value: 'investment', label: 'Investment Center' }
            ]}
            leftIcon={getCenterTypeIcon(formData.type)}
            helperText="Select the type of center to create"
          />

          <Input 
            label="Name" 
            value={formData.name} 
            onChange={(e) => handleFieldChange('name', e.target.value)} 
            placeholder="e.g., Admin Department, Sales Division" 
            required 
            error={formErrors.name} 
            leftIcon={Building2} 
          />
          
          <Input 
            label="Code" 
            value={formData.code} 
            onChange={(e) => handleFieldChange('code', e.target.value)} 
            placeholder="Optional unique identifier" 
          />
          
          <Select 
            label="Status" 
            value={formData.status} 
            onChange={(e) => handleFieldChange('status', e.target.value)} 
            options={[
              { label: 'Active', value: 'active' }, 
              { label: 'Inactive', value: 'inactive' }, 
              { label: 'Archived', value: 'archived' }
            ]} 
          />
          
          <Select
            label="Parent Center"
            value={formData.parentId}
            onChange={(e) => handleFieldChange('parentId', e.target.value)}
            options={parentOptions}
            helperText="Select a parent center to create a hierarchical relationship"
            leftIcon={FolderTree}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input 
              label="Valid From" 
              type="date" 
              value={formData.validFrom} 
              onChange={(e) => handleFieldChange('validFrom', e.target.value)} 
              leftIcon={Calendar} 
            />
            <Input 
              label="Valid To" 
              type="date" 
              value={formData.validTo} 
              onChange={(e) => handleFieldChange('validTo', e.target.value)} 
              error={formErrors.validTo} 
              leftIcon={Calendar} 
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900 mb-1">
                  <Lock className="h-4 w-4" />Block Center
                </div>
                <div className="text-xs text-slate-600">Prevent transactions from being posted to this center</div>
              </div>
              <input 
                type="checkbox" 
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                checked={formData.isBlocked} 
                onChange={(e) => handleFieldChange('isBlocked', e.target.checked)} 
              />
            </div>
            {formData.isBlocked && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <Input 
                  label="Blocked Reason" 
                  value={formData.blockedReason} 
                  onChange={(e) => handleFieldChange('blockedReason', e.target.value)} 
                  placeholder="Explain why this center is blocked..." 
                  required 
                  error={formErrors.blockedReason} 
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={handleCloseCreateModal} disabled={createMutation.isPending}>Cancel</Button>
          <Button 
            onClick={handleCreateCenter} 
            loading={createMutation.isPending} 
            disabled={!formData.name.trim() || (formData.isBlocked && !formData.blockedReason.trim())} 
            leftIcon={Plus}
          >
            Create Center
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editModalOpen} onClose={handleCloseEditModal} title={`Edit ${selectedCenter?.name || 'Center'}`}>
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Edit2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <div className="font-medium mb-1">Update Center</div>
                <div className="text-blue-700">Modify center details. Archived centers cannot be edited.</div>
              </div>
            </div>
          </div>

          <Input 
            label="Center Type" 
            value={getCenterTypeLabel(formData.type)} 
            leftIcon={getCenterTypeIcon(formData.type)}
            disabled
            helperText="Center type cannot be changed after creation"
          />

          <Input 
            label="Name" 
            value={formData.name} 
            onChange={(e) => handleFieldChange('name', e.target.value)} 
            placeholder="e.g., Admin Department, Sales Division" 
            required 
            error={formErrors.name} 
            leftIcon={Building2} 
          />
          
          <Input 
            label="Code" 
            value={formData.code} 
            onChange={(e) => handleFieldChange('code', e.target.value)} 
            placeholder="Optional unique identifier" 
          />
          
          <Select 
            label="Status" 
            value={formData.status} 
            onChange={(e) => handleFieldChange('status', e.target.value)} 
            options={[
              { label: 'Active', value: 'active' }, 
              { label: 'Inactive', value: 'inactive' }, 
              { label: 'Archived', value: 'archived' }
            ]} 
          />
          
          <Select
            label="Parent Center"
            value={formData.parentId}
            onChange={(e) => handleFieldChange('parentId', e.target.value)}
            options={parentOptions}
            helperText="Select a parent center to create a hierarchical relationship"
            leftIcon={FolderTree}
            error={formErrors.parentId}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input 
              label="Valid From" 
              type="date" 
              value={formData.validFrom} 
              onChange={(e) => handleFieldChange('validFrom', e.target.value)} 
              leftIcon={Calendar} 
            />
            <Input 
              label="Valid To" 
              type="date" 
              value={formData.validTo} 
              onChange={(e) => handleFieldChange('validTo', e.target.value)} 
              error={formErrors.validTo} 
              leftIcon={Calendar} 
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900 mb-1">
                  <Lock className="h-4 w-4" />Block Center
                </div>
                <div className="text-xs text-slate-600">Prevent transactions from being posted to this center</div>
              </div>
              <input 
                type="checkbox" 
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                checked={formData.isBlocked} 
                onChange={(e) => handleFieldChange('isBlocked', e.target.checked)} 
              />
            </div>
            {formData.isBlocked && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <Input 
                  label="Blocked Reason" 
                  value={formData.blockedReason} 
                  onChange={(e) => handleFieldChange('blockedReason', e.target.value)} 
                  placeholder="Explain why this center is blocked..." 
                  required 
                  error={formErrors.blockedReason} 
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={handleCloseEditModal} disabled={updateMutation.isPending}>Cancel</Button>
          <Button 
            onClick={handleUpdateCenter} 
            loading={updateMutation.isPending} 
            disabled={!formData.name.trim() || (formData.isBlocked && !formData.blockedReason.trim())} 
            leftIcon={Edit2}
          >
            Update Center
          </Button>
        </div>
      </Modal>

      {/* Archive Confirmation */}
      <ConfirmDialog
        open={archiveConfirmOpen}
        onClose={handleCloseArchiveConfirm}
        onConfirm={handleArchiveCenter}
        title="Archive Center"
        message={`Are you sure you want to archive "${selectedCenter?.name}"? This center will be marked as archived and cannot be modified. If the center is referenced by existing records, this operation will fail.`}
        confirmText="Archive Center"
        danger
        loading={archiveMutation.isPending}
      />
    </div>
  );
}