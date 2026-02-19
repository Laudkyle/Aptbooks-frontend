import React, { useMemo, useState, useCallback } from 'react';
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
  PieChart
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

// Generate UUID v4 function (same as BillCreate)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function rowsFrom(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.data.data)) return data.data.data;
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

export default function Centers() {
  const { http } = useApi();
  const api = useMemo(() => makePlanningApi(http), [http]);
  const qc = useQueryClient();

  const [centerType, setCenterType] = useState('cost');
  const [statusFilter, setStatusFilter] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [formData, setFormData] = useState({
    type: 'cost', // Add type to form data
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
  
  const queryParams = useMemo(() => ({ status: statusFilter || undefined }), [statusFilter]);

  // Query for centers list (for the table) - uses centerType from state
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: qk.reportingCenters 
      ? qk.reportingCenters(centerType, queryParams)
      : ['reporting', 'centers', centerType, queryParams],
    queryFn: () => api.centers.list(centerType, queryParams),
    staleTime: 30000,
    retry: 2
  });

  // Separate query for parent dropdown - needs to fetch based on selected form type
  const { data: allCentersData } = useQuery({
    queryKey: qk.reportingCenters 
      ? qk.reportingCenters(formData.type, {})
      : ['reporting', 'centers', formData.type, 'all'],
    queryFn: () => api.centers.list(formData.type, {}), // Use formData.type for parent dropdown
    staleTime: 60000, // Cache longer since this is reference data
    enabled: createModalOpen || editModalOpen, // Only fetch when modal is open
  });

  const rows = useMemo(() => rowsFrom(data), [data]);
  const allCenters = useMemo(() => rowsFrom(allCentersData), [allCentersData]);

  // Build parent options for select dropdown
  const parentOptions = useMemo(() => {
    const options = [{ value: '', label: '— No Parent —' }];
    if (allCenters.length > 0) {
      const hierarchicalOptions = buildHierarchicalOptions(
        allCenters.filter(c => c.status !== 'archived'), // Exclude archived from parent selection
        selectedCenter?.id // Pass current center ID to prevent self-parenting
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

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      }).format(date);
    } catch {
      return dateString;
    }
  }, []);

  const getCenterTypeLabel = useCallback((type) => {
    const labels = { cost: 'Cost Center', profit: 'Profit Center', investment: 'Investment Center' };
    return labels[type] || type;
  }, []);

  const columns = useMemo(() => {
    const baseColumns = [];
    
    // Add Type column
    baseColumns.push({
      header: 'Type',
      render: (r) => {
        // Infer type from the current tab or from the data if available
        // Since the API might not return type, we use the current tab context
        const TypeIcon = getCenterTypeIcon(centerType);
        return (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <TypeIcon className="h-3.5 w-3.5 text-slate-400" />
            <span>{getCenterTypeLabel(centerType)}</span>
          </div>
        );
      }
    });
    
    // Add parent column to show hierarchy
    baseColumns.push({
      header: 'Parent',
      render: (r) => {
        if (!r.parentId) return <span className="text-sm text-slate-400">—</span>;
        const parent = allCenters.find(c => c.id === r.parentId);
        return (
          <div className="flex items-center gap-1 text-sm text-slate-600">
            <FolderTree className="h-3.5 w-3.5 text-slate-400" />
            <span>{parent?.name || 'Unknown'}</span>
          </div>
        );
      }
    });
    
    if (rows.length === 0) {
      baseColumns.push(
        { header: 'Code', render: (r) => <span className="font-mono text-sm">{r.code ?? '—'}</span> },
        { header: 'Name', render: (r) => <span className="font-medium text-sm">{r.name ?? '—'}</span> },
        { header: 'Status', render: (r) => {
          const config = getStatusConfig(r.status);
          const StatusIcon = config.icon;
          return <Badge tone={config.tone} className="inline-flex items-center gap-1.5"><StatusIcon className="h-3 w-3" />{config.label}</Badge>;
        }}
      );
    } else {
      const keys = Object.keys(rows[0]);
      const excludeKeys = ['layoutJson', 'payloadJson', 'positionJson', 'id', 'parentId'];
      const displayKeys = keys.filter(k => !excludeKeys.includes(k)).slice(0, 5);

      displayKeys.forEach(key => {
        if (key === 'status') {
          baseColumns.push({
            header: 'Status',
            render: (r) => {
              const config = getStatusConfig(r.status);
              const StatusIcon = config.icon;
              return <Badge tone={config.tone} className="inline-flex items-center gap-1.5"><StatusIcon className="h-3 w-3" />{config.label}</Badge>;
            }
          });
        } else if (key === 'code') {
          baseColumns.push({
            header: 'Code',
            render: (r) => (
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-mono text-sm text-slate-900">{r.code ?? '—'}</span>
              </div>
            )
          });
        } else if (key === 'name') {
          baseColumns.push({ header: 'Name', render: (r) => <span className="font-medium text-sm text-slate-900">{r.name ?? '—'}</span> });
        } else if (key.toLowerCase().includes('date') || key === 'validFrom' || key === 'validTo') {
          baseColumns.push({
            header: key.replace(/([A-Z])/g, ' $1').trim().replace(/^./, s => s.toUpperCase()),
            render: (r) => (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {formatDate(r[key])}
              </div>
            )
          });
        } else if (key === 'isBlocked') {
          baseColumns.push({
            header: 'Blocked',
            render: (r) => r.isBlocked ? <Badge tone="error" className="inline-flex items-center gap-1.5"><Lock className="h-3 w-3" />Yes</Badge> : <span className="text-sm text-slate-500">—</span>
          });
        } else {
          baseColumns.push({
            header: key.replace(/([A-Z])/g, ' $1').trim().replace(/^./, s => s.toUpperCase()),
            render: (r) => <span className="text-sm text-slate-700">{String(r[key] ?? '—')}</span>
          });
        }
      });
    }

    // Add Actions column
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
  }, [rows, allCenters, centerType, getStatusConfig, formatDate, getCenterTypeLabel]);

  const validateForm = useCallback(() => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (formData.isBlocked && !formData.blockedReason.trim()) errors.blockedReason = 'Blocked reason is required when center is blocked';
    if (formData.validFrom && formData.validTo) {
      const from = new Date(formData.validFrom);
      const to = new Date(formData.validTo);
      if (to < from) errors.validTo = 'Valid To must be after Valid From';
    }
    
    // Prevent self-parenting
    if (selectedCenter && formData.parentId === selectedCenter.id) {
      errors.parentId = 'A center cannot be its own parent';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, selectedCenter]);

  const handleOpenCreateModal = useCallback(() => {
    setCreateModalOpen(true);
    setFormData({ 
      type: centerType, // Use current tab as default type
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
  }, [centerType]);

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

  const handleRefresh = useCallback(() => { refetch(); toast.success('Centers data refreshed'); }, [refetch, toast]);

  const handleOpenEditModal = useCallback((center) => {
    setSelectedCenter(center);
    setFormData({
      type: centerType, // Use current tab as type, or could infer from center if API returns it
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
  }, [centerType]);

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

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!validateForm()) throw new Error('Please fix validation errors');
      
      // Generate idempotency key
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
      
      // Add idempotency key to headers - use formData.type for the API call
      return api.centers.create(formData.type, body, {
        headers: {
          'idempotency-key': idempotencyKey
        }
      });
    },
    onSuccess: () => {
      toast.success('Center created successfully');
      handleCloseCreateModal();
      // Invalidate queries for all center types since we don't know which one was affected
      ['cost', 'profit', 'investment'].forEach(type => {
        qc.invalidateQueries({ 
          queryKey: qk.reportingCenters 
            ? qk.reportingCenters(type) 
            : ['reporting', 'centers', type] 
        });
      });
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? err?.message ?? 'Failed to create center')
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCenter) throw new Error('No center selected');
      if (!validateForm()) throw new Error('Please fix validation errors');
      
      // Generate idempotency key
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
      
      // Add idempotency key to headers - use formData.type for the API call
      return api.centers.update(formData.type, selectedCenter.id, body, {
        headers: {
          'idempotency-key': idempotencyKey
        }
      });
    },
    onSuccess: () => {
      toast.success('Center updated successfully');
      handleCloseEditModal();
      // Invalidate queries for all center types
      ['cost', 'profit', 'investment'].forEach(type => {
        qc.invalidateQueries({ 
          queryKey: qk.reportingCenters 
            ? qk.reportingCenters(type) 
            : ['reporting', 'centers', type] 
        });
      });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to update center';
      toast.error(message);
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCenter) throw new Error('No center selected');
      
      // Generate idempotency key
      const idempotencyKey = generateUUID();
      
      // Add idempotency key to headers - use centerType from tab since we're archiving from current view
      return api.centers.archive(centerType, selectedCenter.id, {
        headers: {
          'idempotency-key': idempotencyKey
        }
      });
    },
    onSuccess: () => {
      toast.success('Center archived successfully');
      handleCloseArchiveConfirm();
      qc.invalidateQueries({ 
        queryKey: qk.reportingCenters 
          ? qk.reportingCenters(centerType) 
          : ['reporting', 'centers', centerType] 
      });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to archive center';
      toast.error(message);
      // Backend returns 409 if center is referenced - show helpful message
      if (err?.response?.status === 409) {
        toast.error('This center is referenced by existing records. Use Inactive or Block instead.');
      }
    }
  });

  const handleCreateCenter = useCallback(() => createMutation.mutate(), [createMutation]);
  const handleUpdateCenter = useCallback(() => updateMutation.mutate(), [updateMutation]);
  const handleArchiveCenter = useCallback(() => archiveMutation.mutate(), [archiveMutation]);

  const getCenterTypeLabelPlural = useCallback((type) => {
    const labels = { cost: 'Cost Centers', profit: 'Profit Centers', investment: 'Investment Centers' };
    return labels[type] || type;
  }, []);

  if (isLoading && rows.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Centers" subtitle="Manage cost, profit, and investment centers (dimension master data)" icon={Layers} actions={<Button leftIcon={Plus} onClick={handleOpenCreateModal}>New Center</Button>} />
        <ContentCard><div className="flex items-center justify-center py-12"><div className="text-sm text-slate-500">Loading centers...</div></div></ContentCard>
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

      <ContentCard>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Tabs
              value={centerType}
              onValueChange={setCenterType}
              items={[
                { value: 'cost', label: 'Cost Centers', icon: DollarSign },
                { value: 'profit', label: 'Profit Centers', icon: TrendingUp },
                { value: 'investment', label: 'Investment Centers', icon: PieChart }
              ]}
            />
          </div>
          <div className="w-full max-w-xs">
            <Select
              label="Status Filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { label: 'All Statuses', value: '' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
                { label: 'Archived', value: 'archived' }
              ]}
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="text-base font-semibold text-slate-900">{getCenterTypeLabelPlural(centerType)}</div>
          <div className="mt-1 text-sm text-slate-500">
            {rows.length} {rows.length === 1 ? 'center' : 'centers'}
            {statusFilter && ` • filtered by ${statusFilter}`}
          </div>
        </div>

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
              {statusFilter ? `No ${statusFilter} centers found. Try changing the filter.` : 'Create a center to begin tracking dimension performance.'}
            </div>
            <Button leftIcon={Plus} onClick={handleOpenCreateModal} size="sm">Create Center</Button>
          </div>
        ) : (
          <DataTable columns={columns} rows={rows} isLoading={isLoading} empty={{ title: 'No centers', description: 'Create a center to begin tracking dimension performance.' }} />
        )}
      </ContentCard>

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

          {/* Center Type Select */}
          <Select
            label="Center Type"
            value={formData.type}
            onChange={(e) => handleFieldChange('type', e.target.value)}
            options={[
              { value: 'cost', label: 'Cost Center', icon: DollarSign },
              { value: 'profit', label: 'Profit Center', icon: TrendingUp },
              { value: 'investment', label: 'Investment Center', icon: PieChart }
            ]}
            leftIcon={getCenterTypeIcon(formData.type)}
            helperText="Select the type of center to create"
          />

          <Input label="Name" value={formData.name} onChange={(e) => handleFieldChange('name', e.target.value)} placeholder="e.g., Admin Department, Sales Division" required error={formErrors.name} leftIcon={Building2} />
          <Input label="Code" value={formData.code} onChange={(e) => handleFieldChange('code', e.target.value)} placeholder="Optional unique identifier" />
          <Select label="Status" value={formData.status} onChange={(e) => handleFieldChange('status', e.target.value)} options={[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }, { label: 'Archived', value: 'archived' }]} />
          
          {/* Parent Center Select Dropdown */}
          <Select
            label="Parent Center"
            value={formData.parentId}
            onChange={(e) => handleFieldChange('parentId', e.target.value)}
            options={parentOptions}
            helperText="Select a parent center to create a hierarchical relationship"
            leftIcon={FolderTree}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Valid From" type="date" value={formData.validFrom} onChange={(e) => handleFieldChange('validFrom', e.target.value)} leftIcon={Calendar} />
            <Input label="Valid To" type="date" value={formData.validTo} onChange={(e) => handleFieldChange('validTo', e.target.value)} error={formErrors.validTo} leftIcon={Calendar} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900 mb-1">
                  <Lock className="h-4 w-4" />Block Center
                </div>
                <div className="text-xs text-slate-600">Prevent transactions from being posted to this center</div>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" checked={formData.isBlocked} onChange={(e) => handleFieldChange('isBlocked', e.target.checked)} />
            </div>
            {formData.isBlocked && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <Input label="Blocked Reason" value={formData.blockedReason} onChange={(e) => handleFieldChange('blockedReason', e.target.value)} placeholder="Explain why this center is blocked..." required error={formErrors.blockedReason} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={handleCloseCreateModal} disabled={createMutation.isPending}>Cancel</Button>
          <Button onClick={handleCreateCenter} loading={createMutation.isPending} disabled={!formData.name.trim() || (formData.isBlocked && !formData.blockedReason.trim())} leftIcon={Plus}>Create Center</Button>
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

          {/* Center Type Display (read-only in edit mode) */}
          <Input 
            label="Center Type" 
            value={getCenterTypeLabel(formData.type)} 
            leftIcon={getCenterTypeIcon(formData.type)}
            disabled
            helperText="Center type cannot be changed after creation"
          />

          <Input label="Name" value={formData.name} onChange={(e) => handleFieldChange('name', e.target.value)} placeholder="e.g., Admin Department, Sales Division" required error={formErrors.name} leftIcon={Building2} />
          <Input label="Code" value={formData.code} onChange={(e) => handleFieldChange('code', e.target.value)} placeholder="Optional unique identifier" />
          <Select label="Status" value={formData.status} onChange={(e) => handleFieldChange('status', e.target.value)} options={[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }, { label: 'Archived', value: 'archived' }]} />
          
          {/* Parent Center Select Dropdown */}
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
            <Input label="Valid From" type="date" value={formData.validFrom} onChange={(e) => handleFieldChange('validFrom', e.target.value)} leftIcon={Calendar} />
            <Input label="Valid To" type="date" value={formData.validTo} onChange={(e) => handleFieldChange('validTo', e.target.value)} error={formErrors.validTo} leftIcon={Calendar} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900 mb-1">
                  <Lock className="h-4 w-4" />Block Center
                </div>
                <div className="text-xs text-slate-600">Prevent transactions from being posted to this center</div>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" checked={formData.isBlocked} onChange={(e) => handleFieldChange('isBlocked', e.target.checked)} />
            </div>
            {formData.isBlocked && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <Input label="Blocked Reason" value={formData.blockedReason} onChange={(e) => handleFieldChange('blockedReason', e.target.value)} placeholder="Explain why this center is blocked..." required error={formErrors.blockedReason} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={handleCloseEditModal} disabled={updateMutation.isPending}>Cancel</Button>
          <Button onClick={handleUpdateCenter} loading={updateMutation.isPending} disabled={!formData.name.trim() || (formData.isBlocked && !formData.blockedReason.trim())} leftIcon={Edit2}>Update Center</Button>
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