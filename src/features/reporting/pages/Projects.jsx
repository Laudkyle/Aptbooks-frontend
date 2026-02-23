import React, { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FolderKanban,
  Plus,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Calendar,
  FileText,
  Info,
  Archive,
  PlayCircle,
  MoreVertical,
  Tag,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makePlanningApi } from '../api/planning.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../shared/components/ui/DropdownMenu.jsx';
import { generateUUID } from '../../../shared/utils/generateUUID.js';

/**
 * Helper function to safely extract rows from various API response formats
 */
function extractRows(data) {
  if (!data) return [];
  
  // Handle the specific structure from your console log: { data: { data: [...] } }
  if (data.data && Array.isArray(data.data.data)) {
    return data.data.data;
  }
  
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  
  // Try to extract from nested structure
  if (data.data && typeof data.data === 'object') {
    // Check common nested patterns
    const nestedData = data.data;
    if (Array.isArray(nestedData.records)) return nestedData.records;
    if (Array.isArray(nestedData.results)) return nestedData.results;
    if (Array.isArray(nestedData.list)) return nestedData.list;
  }
  
  return [];
}

export default function Projects() {
  const { http } = useApi();
  const api = useMemo(() => makePlanningApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  // Filter state
  const [statusFilter, setStatusFilter] = useState('');

  // Modal and form state
  const [modalOpen, setModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [actionType, setActionType] = useState(null); // 'archive', 'activate', 'close'
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState({});
  const [showTopInfo, setShowTopInfo] = useState(false);
  const [showSetupInfo, setShowSetupInfo] = useState(false);

  // Status options
  const statusOptions = useMemo(
    () => [
      { label: 'All', value: '' },
      { label: 'Active', value: 'active' },
      { label: 'Closed', value: 'closed' },
      { label: 'Archived', value: 'archived' }
    ],
    []
  );

  // Form status options (without "All")
  const formStatusOptions = useMemo(
    () => [
      { label: 'Active', value: 'active' },
      { label: 'Closed', value: 'closed' },
      { label: 'Archived', value: 'archived' }
    ],
    []
  );

  // Fetch projects with filters
  const queryParams = useMemo(
    () => ({
      status: statusFilter || undefined,
      limit: 100,
      offset: 0
    }),
    [statusFilter]
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['reporting', 'projects', queryParams],
    queryFn: () => api.projects.list(queryParams),
    staleTime: 30000,
    retry: 2,
  });

  const rows = useMemo(() => extractRows(data), [data]);
  console.log('Projects data:', data);
  console.log('Extracted rows:', rows);

  // Get status configuration
  const getStatusConfig = useCallback((status) => {
    const normalizedStatus = (status ?? 'active').toLowerCase();

    const configs = {
      active: { tone: 'success', label: 'Active', icon: PlayCircle },
      closed: { tone: 'warning', label: 'Closed', icon: Archive },
      archived: { tone: 'muted', label: 'Archived', icon: Archive },
    };

    return (
      configs[normalizedStatus] || { tone: 'muted', label: status || 'Active', icon: FileText }
    );
  }, []);

  // Format date for display
  const formatDate = useCallback((date) => {
    if (!date) return '—';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(date);
    }
  }, []);

  // Handle project actions
  const handleActionClick = useCallback((project, action) => {
    setSelectedProject(project);
    setActionType(action);
    setActionModalOpen(true);
  }, []);

  // Archive project mutation
  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProject) throw new Error('No project selected');
      
      const idempotencyKey = generateUUID();
      
      // Assuming you have an archive endpoint - adjust as needed
      const response = await api.projects.update(selectedProject.id, {
        status: 'archived'
      }, { idempotencyKey });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Project archived successfully');
      setActionModalOpen(false);
      setSelectedProject(null);
      setActionType(null);
      qc.invalidateQueries({ queryKey: ['reporting', 'projects'] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to archive project';
      toast.error(message);
      console.error('Archive project error:', err);
    },
  });

  // Activate project mutation
  const activateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProject) throw new Error('No project selected');
      
      const idempotencyKey = generateUUID();
      
      const response = await api.projects.update(selectedProject.id, {
        status: 'active'
      }, { idempotencyKey });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Project activated successfully');
      setActionModalOpen(false);
      setSelectedProject(null);
      setActionType(null);
      qc.invalidateQueries({ queryKey: ['reporting', 'projects'] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to activate project';
      toast.error(message);
      console.error('Activate project error:', err);
    },
  });

  // Close project mutation
  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProject) throw new Error('No project selected');
      
      const idempotencyKey = generateUUID();
      
      const response = await api.projects.update(selectedProject.id, {
        status: 'closed'
      }, { idempotencyKey });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Project closed successfully');
      setActionModalOpen(false);
      setSelectedProject(null);
      setActionType(null);
      qc.invalidateQueries({ queryKey: ['reporting', 'projects'] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to close project';
      toast.error(message);
      console.error('Close project error:', err);
    },
  });

  // Table columns with actions
  const columns = useMemo(
    () => [
      {
        header: 'Project',
        accessor: 'name',
        render: (row) => {
          const statusConfig = getStatusConfig(row.status);
          return (
            <Link
              to={`/planning/projects/${row.id}`}
              className="group inline-flex items-center gap-2 font-medium text-brand-deep hover:text-brand-deep/80 transition-colors"
            >
              <FolderKanban className="h-4 w-4 text-slate-400" />
              <span>{row.name ?? row.id}</span>
              <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          );
        },
      },
      {
        header: 'Code',
        accessor: 'code',
        render: (row) => (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Tag className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-mono">{row.code ?? '—'}</span>
          </div>
        ),
      },
      {
        header: 'Status',
        accessor: 'status',
        render: (row) => {
          const statusConfig = getStatusConfig(row.status);
          return <Badge tone={statusConfig.tone}>{statusConfig.label}</Badge>;
        },
      },
      {
        header: 'Last Updated',
        accessor: 'updated_at',
        render: (row) => (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            {formatDate(row.updated_at ?? row.updatedAt)}
          </div>
        ),
      },
      {
        header: 'Actions',
        accessor: 'id',
        render: (row) => {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {row.status === 'active' && (
                  <DropdownMenuItem onClick={() => handleActionClick(row, 'close')}>
                    <Archive className="mr-2 h-4 w-4 text-amber-600" />
                    <span>Close Project</span>
                  </DropdownMenuItem>
                )}
                {row.status === 'closed' && (
                  <DropdownMenuItem onClick={() => handleActionClick(row, 'activate')}>
                    <PlayCircle className="mr-2 h-4 w-4 text-green-600" />
                    <span>Reopen Project</span>
                  </DropdownMenuItem>
                )}
                {row.status !== 'archived' && row.status !== 'closed' && (
                  <DropdownMenuItem onClick={() => handleActionClick(row, 'archive')}>
                    <Archive className="mr-2 h-4 w-4 text-amber-600" />
                    <span>Archive Project</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to={`/planning/projects/${row.id}`} className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Edit Details</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [getStatusConfig, formatDate, handleActionClick],
  );

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Project name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Project name must be at least 2 characters';
    }

    if (formData.code && formData.code.length > 20) {
      errors.code = 'Project code must be 20 characters or less';
    }

    if (!formData.status) {
      errors.status = 'Status is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Handle form changes
  const handleFieldChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error for this field
      if (formErrors[field]) {
        setFormErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [formErrors],
  );

  // Modal handlers
  const handleOpenModal = useCallback(() => {
    setModalOpen(true);
    setFormData({
      code: '',
      name: '',
      status: 'active',
    });
    setFormErrors({});
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setFormData({
      code: '',
      name: '',
      status: 'active',
    });
    setFormErrors({});
  }, []);

  const handleCloseActionModal = useCallback(() => {
    setActionModalOpen(false);
    setSelectedProject(null);
    setActionType(null);
  }, []);

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!validateForm()) {
        throw new Error('Please fix validation errors');
      }

      // Generate fresh idempotency key for each mutation attempt
      const idempotencyKey = generateUUID();
      console.log('Using idempotency key for project creation:', idempotencyKey);

      // Call the API with idempotency key
      const response = await api.projects.create({
        code: formData.code.trim() || null,
        name: formData.name.trim(),
        status: formData.status,
      }, { idempotencyKey });

      return response.data;
    },
    onSuccess: () => {
      toast.success('Project created successfully');
      handleCloseModal();
      qc.invalidateQueries({ queryKey: ['reporting', 'projects'] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to create project';
      toast.error(message);
      console.error('Create project error:', err);
    },
  });

  const handleCreateProject = useCallback(() => {
    // Validate required fields before submission
    if (!formData.name.trim()) {
      toast.error('Please enter a project name');
      return;
    }
    
    if (!formData.status) {
      toast.error('Please select a status');
      return;
    }

    createMutation.mutate();
  }, [createMutation, formData, toast]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleFilterChange = useCallback((value) => {
    setStatusFilter(value);
  }, []);

  const isFormValid = formData.name.trim() && formData.status;

  // Get action modal content
  const getActionModalContent = useCallback(() => {
    if (!selectedProject || !actionType) return null;

    const isArchiving = actionType === 'archive';
    const isActivating = actionType === 'activate';
    const isClosing = actionType === 'close';
    
    let isPending = false;
    if (isArchiving) isPending = archiveMutation.isPending;
    if (isActivating) isPending = activateMutation.isPending;
    if (isClosing) isPending = closeMutation.isPending;

    let title = '';
    let description = '';
    let warning = '';
    let confirmText = '';
    let confirmVariant = 'warning';
    let onConfirm = null;

    if (isArchiving) {
      title = 'Archive Project';
      description = `Are you sure you want to archive "${selectedProject.name || selectedProject.id}"?`;
      warning = 'Archived projects become read-only and cannot be modified.';
      confirmText = 'Archive';
      confirmVariant = 'warning';
      onConfirm = archiveMutation.mutate;
    } else if (isActivating) {
      title = 'Reopen Project';
      description = `Are you sure you want to reopen "${selectedProject.name || selectedProject.id}"?`;
      warning = 'Reopened projects can be used for active planning and tracking.';
      confirmText = 'Reopen';
      confirmVariant = 'success';
      onConfirm = activateMutation.mutate;
    } else if (isClosing) {
      title = 'Close Project';
      description = `Are you sure you want to close "${selectedProject.name || selectedProject.id}"?`;
      warning = 'Closed projects are marked as completed but remain viewable.';
      confirmText = 'Close';
      confirmVariant = 'warning';
      onConfirm = closeMutation.mutate;
    }

    return {
      title,
      description,
      warning,
      confirmText,
      confirmVariant,
      onConfirm,
      isPending,
    };
  }, [selectedProject, actionType, archiveMutation, activateMutation, closeMutation]);

  const actionContent = getActionModalContent();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Projects"
          subtitle="Create projects, phases, and tasks for planning and dimension-aware reporting."
          icon={FolderKanban}
          actions={
            <Button leftIcon={Plus} onClick={handleOpenModal}>
              New Project
            </Button>
          }
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading projects...</div>
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
          title="Projects"
          subtitle="Create projects, phases, and tasks for planning and dimension-aware reporting."
          icon={FolderKanban}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                leftIcon={RefreshCw}
                onClick={handleRefresh}
              >
                Retry
              </Button>
              <Button leftIcon={Plus} onClick={handleOpenModal}>
                New Project
              </Button>
            </div>
          }
        />
        <ContentCard>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-sm font-medium text-slate-900">
              Failed to load projects
            </div>
            <div className="text-sm text-slate-500">
              {error?.message ?? 'An error occurred'}
            </div>
            <Button variant="outline" onClick={handleRefresh} className="mt-2">
              Try Again
            </Button>
          </div>
        </ContentCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Projects"
        subtitle="Create projects, phases, and tasks for planning and dimension-aware reporting."
        icon={FolderKanban}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={RefreshCw}
              onClick={handleRefresh}
              loading={isFetching && !isLoading}
              aria-label="Refresh projects"
            >
              Refresh
            </Button>
            <Button
              leftIcon={Plus}
              onClick={handleOpenModal}
              aria-label="Create new project"
            >
              New Project
            </Button>
          </div>
        }
      />

      <ContentCard>
        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xs">
            <Select
              label="Filter by Status"
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              options={statusOptions}
              aria-label="Filter projects by status"
            />
          </div>
          <div className="text-sm text-slate-500">
            {rows.length} {rows.length === 1 ? 'project' : 'projects'} found
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          empty={{
            title: 'No projects yet',
            description:
              'Create your first project to begin planning and tracking.',
          }}
          aria-label="Projects table"
        />
      </ContentCard>

      {/* Create Project Modal */}
      <Modal
        open={modalOpen}
        title="Create New Project"
        onClose={() => (createMutation.isPending ? null : handleCloseModal())}
        footer={
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
            <Button
              onClick={handleCloseModal}
              disabled={createMutation.isPending}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={createMutation.isPending || !isFormValid}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        }
      >
        <div className="px-6 py-5">
          {/* Top Info Section - Collapsible */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowTopInfo(!showTopInfo)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <Info className="h-4 w-4" />
              <span>Project creation info</span>
              <ChevronRight className={`h-4 w-4 transition-transform ${showTopInfo ? 'rotate-90' : ''}`} />
            </button>
            
            {showTopInfo && (
              <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <FolderKanban className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <div className="font-medium mb-1">
                      Create a new project
                    </div>
                    <div className="text-blue-700">
                      Projects help organize your planning activities. You can add phases, 
                      tasks, and track progress against budgets.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Project Name"
                placeholder="e.g., Q1 Marketing Campaign, Branch Renovation"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                error={formErrors.name}
                leftIcon={FolderKanban}
                aria-label="Project name"
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Project Code (Optional)"
                placeholder="e.g., PROJ-2024-001"
                value={formData.code}
                onChange={(e) => handleFieldChange('code', e.target.value)}
                error={formErrors.code}
                leftIcon={Tag}
                aria-label="Project code"
                helpText="A unique identifier for the project (max 20 characters)"
              />
            </div>

            <div className="md:col-span-2">
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                options={formStatusOptions}
                error={formErrors.status}
                aria-label="Project status"
              />
            </div>
          </div>

          {/* Bottom Info Section - Collapsible */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowSetupInfo(!showSetupInfo)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <Info className="h-4 w-4" />
              <span>Project lifecycle details</span>
              <ChevronRight className={`h-4 w-4 transition-transform ${showSetupInfo ? 'rotate-90' : ''}`} />
            </button>
            
            {showSetupInfo && (
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-medium text-slate-700 mb-2">
                  Project Status Lifecycle
                </div>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    <span>
                      <span className="font-medium">Active:</span> In-progress projects that can be linked to budgets and actuals
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    <span>
                      <span className="font-medium">Closed:</span> Completed projects, viewable but not editable
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    <span>
                      <span className="font-medium">Archived:</span> Historical records, read-only for reporting
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Action Confirmation Modal (Archive/Activate/Close) */}
      {actionContent && (
        <Modal
          open={actionModalOpen}
          title={actionContent.title}
          onClose={actionContent.isPending ? null : handleCloseActionModal}
          footer={
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
              <Button
                onClick={handleCloseActionModal}
                disabled={actionContent.isPending}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </Button>
              <Button
                onClick={actionContent.onConfirm}
                disabled={actionContent.isPending}
                className={`px-5 py-2.5 text-white rounded-md font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed ${
                  actionContent.confirmVariant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {actionContent.isPending ? `${actionContent.confirmText}...` : actionContent.confirmText}
              </Button>
            </div>
          }
        >
          <div className="px-6 py-5">
            <div className="flex items-start gap-3">
              {actionType === 'archive' && <Archive className="h-6 w-6 text-amber-600 flex-shrink-0" />}
              {actionType === 'activate' && <PlayCircle className="h-6 w-6 text-green-600 flex-shrink-0" />}
              {actionType === 'close' && <Archive className="h-6 w-6 text-amber-600 flex-shrink-0" />}
              <div>
                <p className="text-sm text-slate-600 mb-2">
                  {actionContent.description}
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {actionContent.warning}
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}