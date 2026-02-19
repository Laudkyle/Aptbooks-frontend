import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from 'react-router-dom';

// Import necessary icons
import {
  PiggyBank,
  Upload,
  Shuffle,
  CheckCircle2,
  Plus,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  Layers,
  Edit,
  ListPlus,
  Search,
  Building2,
  FolderTree,
  Hash,
  Settings,
  Copy,
  Download,
  Filter,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  BarChart3,
  PieChart,
  TrendingUp,
  AlertTriangle,
  Info,
  X,
  ChevronDown,
  ChevronRight,
  Grid,
  Table as TableIcon,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Send,
  ThumbsUp,
  ThumbsDown,
  Archive,
  Clock,
  UserCheck,
  XCircle
} from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makePlanningApi } from '../api/planning.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { ROUTES } from '../../../app/constants/routes.js';

// Generate UUID v4 function for idempotency keys
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * BudgetDetail Component
 * 
 * Manages budgets, versions, and lines based on the nested API structure:
 * - Budget object contains versions array
 * - Each version contains lines array
 * - All data comes from a single API call
 */
export default function BudgetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makePlanningApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  // UI State
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [expandedVersions, setExpandedVersions] = useState(new Set());
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [showFilters, setShowFilters] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedVersionForRejection, setSelectedVersionForRejection] = useState(null);
  const [filters, setFilters] = useState({
    account: '',
    period: '',
    amountRange: { min: '', max: '' }
  });

  // Modal States
  const [modals, setModals] = useState({
    createVersion: false,
    editVersion: false,
    importCsv: false,
    distribute: false,
    addLines: false,
    upsertAnnual: false,
    versionDimensions: false,
    copyVersion: false,
    compareVersions: false
  });

  // Selected version for editing
  const [editingVersion, setEditingVersion] = useState(null);

  // Form States
  const [versionForm, setVersionForm] = useState({
    versionNo: 1,
    name: '',
    status: 'draft',
    dimensionJson: {}
  });

  const [addLinesForm, setAddLinesForm] = useState({
    versionId: '',
    lines: [{ accountId: '', periodId: '', amount: '' }]
  });

  const [upsertAnnualForm, setUpsertAnnualForm] = useState({
    versionId: '',
    items: [{ accountId: '', annualAmount: '', method: 'even', dimensionJson: {} }]
  });

  const [distributeForm, setDistributeForm] = useState({
    versionId: '',
    accountId: '',
    annualAmount: '',
    method: 'even',
    periodIds: []
  });

  const [csvForm, setCsvForm] = useState({
    versionId: '',
    data: ''
  });

  // ============================
  // Data Fetching
  // ============================

  // Fetch Budget with all nested data
  const { 
    data: budgetData, 
    isLoading: budgetLoading, 
    error: budgetError,
    refetch: refetchBudget 
  } = useQuery({
    queryKey: ['budget', id],
    queryFn: () => api.budgets.get(id),
    enabled: !!id,
    staleTime: 30000
  });

  // Extract budget data based on your actual API response structure
  const budget = useMemo(() => {
    if (!budgetData) return null;
    
    // Handle { data: { ... } } structure from your console log
    if (budgetData.data && budgetData.data.data) {
      return budgetData.data.data;
    }
    if (budgetData.data) {
      return budgetData.data;
    }
    
    return budgetData;
  }, [budgetData]);

  // Extract versions from budget
  const versions = useMemo(() => {
    if (!budget) return [];
    
    // Versions are directly on the budget object
    if (budget.versions && Array.isArray(budget.versions)) {
      return budget.versions;
    }
    
    return [];
  }, [budget]);

  // Get lines for a specific version
  const getLinesForVersion = useCallback((versionId) => {
    const version = versions.find(v => v.id === versionId);
    return version?.lines && Array.isArray(version.lines) ? version.lines : [];
  }, [versions]);

  // Get currently selected version's lines
  const currentLines = useMemo(() => {
    return getLinesForVersion(selectedVersionId);
  }, [selectedVersionId, getLinesForVersion]);

  // Fetch Accounts
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => coaApi.list({ includeArchived: false }),
    staleTime: 60000
  });

  const accounts = useMemo(() => {
    if (!accountsData) return [];
    if (Array.isArray(accountsData)) return accountsData;
    if (accountsData.data && Array.isArray(accountsData.data)) return accountsData.data;
    return [];
  }, [accountsData]);

  const accountsMap = useMemo(() => {
    const map = new Map();
    accounts.forEach(acc => map.set(acc.id, acc));
    return map;
  }, [accounts]);

  // Fetch Periods for budget's fiscal year
  const { data: periodsData } = useQuery({
    queryKey: ['periods', budget?.fiscal_year],
    queryFn: () => periodsApi.list({ 
      fiscalYear: budget?.fiscal_year,
      status: 'open' 
    }),
    enabled: !!budget?.fiscal_year,
    staleTime: 60000
  });

  const periods = useMemo(() => {
    if (!periodsData) return [];
    if (Array.isArray(periodsData)) return periodsData;
    if (periodsData.data && Array.isArray(periodsData.data)) return periodsData.data;
    return [];
  }, [periodsData]);

  const periodsMap = useMemo(() => {
    const map = new Map();
    periods.forEach(p => map.set(p.id, p));
    return map;
  }, [periods]);

  // Set initial selected version
  useEffect(() => {
    if (versions.length > 0 && !selectedVersionId) {
      setSelectedVersionId(versions[0].id);
      // Auto-expand first version
      setExpandedVersions(new Set([versions[0].id]));
    }
  }, [versions, selectedVersionId]);

  // ============================
  // Mutations
  // ============================

  const createVersionMutation = useMutation({
    mutationFn: async () => {
      const idempotencyKey = generateUUID();
      const payload = {
        versionNo: Number(versionForm.versionNo),
        name: versionForm.name || null,
        status: versionForm.status,
        dimensionJson: versionForm.dimensionJson
      };
      return api.budgets.versions.create(id, payload, { idempotencyKey });
    },
    onSuccess: (data) => {
      toast.success('Version created successfully');
      closeModal('createVersion');
      resetVersionForm();
      refetchBudget();
      
      // Select the new version
      const newVersion = data?.data || data;
      if (newVersion?.id) {
        setSelectedVersionId(newVersion.id);
        setExpandedVersions(prev => new Set([...prev, newVersion.id]));
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to create version');
    }
  });

  const updateVersionMutation = useMutation({
    mutationFn: async ({ versionId, data }) => {
      const idempotencyKey = generateUUID();
      return api.budgets.versions.update(id, versionId, data, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Version updated successfully');
      closeModal('editVersion');
      refetchBudget();
      setEditingVersion(null);
      resetVersionForm();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update version');
    }
  });

  const addLinesMutation = useMutation({
    mutationFn: async () => {
      const idempotencyKey = generateUUID();
      const validLines = addLinesForm.lines
        .filter(l => l.accountId && l.periodId && l.amount)
        .map(l => ({
          accountId: l.accountId,
          periodId: l.periodId,
          amount: Number(l.amount)
        }));

      if (validLines.length === 0) {
        throw new Error('No valid lines to add');
      }

      return api.budgets.versions.addLines(
        id, 
        addLinesForm.versionId || selectedVersionId, 
        { lines: validLines },
        { idempotencyKey }
      );
    },
    onSuccess: () => {
      toast.success('Budget lines added successfully');
      closeModal('addLines');
      resetAddLinesForm();
      refetchBudget();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to add lines');
    }
  });

  const upsertAnnualMutation = useMutation({
    mutationFn: async () => {
      const idempotencyKey = generateUUID();
      const validItems = upsertAnnualForm.items
        .filter(i => i.accountId && i.annualAmount)
        .map(i => ({
          accountId: i.accountId,
          annualAmount: Number(i.annualAmount),
          method: i.method,
          dimensionJson: i.dimensionJson
        }));

      if (validItems.length === 0) {
        throw new Error('No valid items to upsert');
      }

      return api.budgets.versions.upsertAmount(
        id,
        upsertAnnualForm.versionId || selectedVersionId,
        { items: validItems },
        { idempotencyKey }
      );
    },
    onSuccess: () => {
      toast.success('Annual amounts upserted successfully');
      closeModal('upsertAnnual');
      resetUpsertAnnualForm();
      refetchBudget();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to upsert annual amounts');
    }
  });

  const distributeMutation = useMutation({
    mutationFn: async () => {
      const idempotencyKey = generateUUID();
      const payload = {
        accountId: distributeForm.accountId,
        annualAmount: Number(distributeForm.annualAmount),
        method: distributeForm.method,
        periodIds: distributeForm.periodIds.filter(Boolean)
      };

      return api.budgets.versions.distribute(
        id,
        distributeForm.versionId || selectedVersionId,
        payload,
        { idempotencyKey }
      );
    },
    onSuccess: () => {
      toast.success('Amount distributed successfully');
      closeModal('distribute');
      resetDistributeForm();
      refetchBudget();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to distribute amount');
    }
  });

  const importCsvMutation = useMutation({
    mutationFn: async () => {
      const idempotencyKey = generateUUID();
      return api.budgets.versions.importCsv(
        id,
        csvForm.versionId || selectedVersionId,
        csvForm.data,
        { idempotencyKey }
      );
    },
    onSuccess: () => {
      toast.success('CSV imported successfully');
      closeModal('importCsv');
      resetCsvForm();
      refetchBudget();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to import CSV');
    }
  });

  const finalizeVersionMutation = useMutation({
    mutationFn: async (versionId) => {
      const idempotencyKey = generateUUID();
      return api.budgets.versions.finalize(id, versionId, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Version finalized successfully');
      refetchBudget();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to finalize version');
    }
  });

  const submitVersionMutation = useMutation({
    mutationFn: async (versionId) => {
      const idempotencyKey = generateUUID();
      return api.budgets.versions.submit(id, versionId, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Version submitted for approval');
      refetchBudget();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to submit version');
    }
  });

  const approveVersionMutation = useMutation({
    mutationFn: async (versionId) => {
      const idempotencyKey = generateUUID();
      return api.budgets.versions.approve(id, versionId, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Version approved successfully');
      refetchBudget();
      setRejectionModalOpen(false);
      setRejectionReason('');
      setSelectedVersionForRejection(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to approve version');
    }
  });

  const rejectVersionMutation = useMutation({
    mutationFn: async ({ versionId, reason }) => {
      const idempotencyKey = generateUUID();
      return api.budgets.versions.reject(id, versionId, { reason }, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Version rejected');
      refetchBudget();
      setRejectionModalOpen(false);
      setRejectionReason('');
      setSelectedVersionForRejection(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to reject version');
    }
  });

  // ============================
  // Utility Functions
  // ============================

  const formatCurrency = (amount, currency = budget?.currency_code || 'USD') => {
    if (amount == null || amount === '') return '—';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '—';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status, workflowStatus = null) => {
    // First check workflow status if available
    if (workflowStatus) {
      const workflowConfig = {
        draft: { tone: 'muted', label: 'Draft' },
        submitted: { tone: 'info', label: 'Submitted' },
        approved: { tone: 'success', label: 'Approved' },
        rejected: { tone: 'danger', label: 'Rejected' },
        finalized: { tone: 'success', label: 'Finalized' }
      };
      const normalized = workflowStatus.toLowerCase();
      if (workflowConfig[normalized]) {
        return workflowConfig[normalized];
      }
    }
    
    // Fallback to simple status
    const config = {
      draft: { tone: 'muted', label: 'Draft' },
      final: { tone: 'success', label: 'Final' },
      archived: { tone: 'warning', label: 'Archived' }
    };
    const normalized = (status || 'draft').toLowerCase();
    return config[normalized] || config.draft;
  };

  const formatAccountDisplay = (account) => {
    if (!account) return '';
    return `${account.code || ''} ${account.name || account.accountName || ''}`.trim();
  };

  const formatPeriodDisplay = (period) => {
    if (!period) return '';
    if (period.name) return period.name;
    if (period.code) return period.code;
    return `${period.start_date || ''} - ${period.end_date || ''}`;
  };

  const openModal = (modalName, versionId = null) => {
    if (versionId) {
      // Set the version ID in the form when opening modal for a specific version
      switch(modalName) {
        case 'addLines':
          setAddLinesForm(prev => ({ ...prev, versionId }));
          break;
        case 'upsertAnnual':
          setUpsertAnnualForm(prev => ({ ...prev, versionId }));
          break;
        case 'distribute':
          setDistributeForm(prev => ({ ...prev, versionId }));
          break;
        case 'importCsv':
          setCsvForm(prev => ({ ...prev, versionId }));
          break;
      }
    }
    setModals(prev => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
  };

  const resetVersionForm = () => {
    setVersionForm({
      versionNo: versions.length + 1,
      name: '',
      status: 'draft',
      dimensionJson: {}
    });
  };

  const resetAddLinesForm = () => {
    setAddLinesForm({
      versionId: '',
      lines: [{ accountId: '', periodId: '', amount: '' }]
    });
  };

  const resetUpsertAnnualForm = () => {
    setUpsertAnnualForm({
      versionId: '',
      items: [{ accountId: '', annualAmount: '', method: 'even', dimensionJson: {} }]
    });
  };

  const resetDistributeForm = () => {
    setDistributeForm({
      versionId: '',
      accountId: '',
      annualAmount: '',
      method: 'even',
      periodIds: []
    });
  };

  const resetCsvForm = () => {
    setCsvForm({
      versionId: '',
      data: ''
    });
  };

  const handleEditVersion = (version) => {
    setEditingVersion(version);
    setVersionForm({
      versionNo: version.version_no || version.versionNo,
      name: version.name || '',
      status: version.status,
      dimensionJson: version.dimension_json || version.dimensionJson || {}
    });
    openModal('editVersion');
  };

  const handleFinalizeVersion = (versionId) => {
    if (window.confirm('Are you sure you want to finalize this version? This action cannot be undone.')) {
      finalizeVersionMutation.mutate(versionId);
    }
  };

  const handleSubmitVersion = (versionId) => {
    if (window.confirm('Submit this version for approval?')) {
      submitVersionMutation.mutate(versionId);
    }
  };

  const handleApproveVersion = (versionId) => {
    if (window.confirm('Approve this version?')) {
      approveVersionMutation.mutate(versionId);
    }
  };

  const handleRejectVersion = (versionId) => {
    setSelectedVersionForRejection(versionId);
    setRejectionModalOpen(true);
  };

  const confirmRejectVersion = () => {
    if (selectedVersionForRejection && rejectionReason.trim()) {
      rejectVersionMutation.mutate({ 
        versionId: selectedVersionForRejection, 
        reason: rejectionReason 
      });
    }
  };

  const toggleVersionExpand = (versionId) => {
    setExpandedVersions(prev => {
      const next = new Set(prev);
      if (next.has(versionId)) {
        next.delete(versionId);
      } else {
        next.add(versionId);
      }
      return next;
    });
  };

  // Get available actions for a version based on its status
  const getVersionActions = (version) => {
    const status = version.status?.toLowerCase();
    const workflowStatus = version.workflow_status?.toLowerCase();
    
    const actions = {
      canEdit: status === 'draft' || workflowStatus === 'draft' || workflowStatus === 'rejected',
      canSubmit: workflowStatus === 'draft' || workflowStatus === 'rejected',
      canApprove: workflowStatus === 'submitted',
      canReject: workflowStatus === 'submitted',
      canFinalize: workflowStatus === 'approved' && status !== 'final',
      canAddLines: workflowStatus === 'draft' || workflowStatus === 'rejected',
      canDistribute: workflowStatus === 'draft' || workflowStatus === 'rejected',
      canUpsertAnnual: workflowStatus === 'draft' || workflowStatus === 'rejected',
      canImportCsv: workflowStatus === 'draft' || workflowStatus === 'rejected'
    };
    
    return actions;
  };

  // ============================
  // Table Columns
  // ============================

  const versionColumns = [
    {
      header: 'Version',
      accessor: 'version_no',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleVersionExpand(row.id)}
            className="p-1 hover:bg-slate-100 rounded"
          >
            {expandedVersions.has(row.id) ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-slate-400" />
            )}
          </button>
          <Layers className="h-4 w-4 text-slate-400" />
          <span className="font-medium">v{row.version_no || row.versionNo}</span>
        </div>
      )
    },
    {
      header: 'Name',
      accessor: 'name',
      render: (row) => row.name || '—'
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const badge = getStatusBadge(row.status, row.workflow_status);
        return <Badge tone={badge.tone}>{badge.label}</Badge>;
      }
    },
    {
      header: 'Lines',
      render: (row) => {
        const lineCount = row.lines?.length || 0;
        return <Badge tone={lineCount > 0 ? 'info' : 'muted'}>{lineCount}</Badge>;
      }
    },
    {
      header: 'Created',
      accessor: 'created_at',
      render: (row) => formatDate(row.created_at || row.createdAt)
    },
    {
      header: '',
      render: (row) => {
        const actions = getVersionActions(row);
        return (
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedVersionId(row.id)}
              leftIcon={row.id === selectedVersionId ? Eye  : EyeOff }
            >
              {row.id === selectedVersionId ? 'Viewing' : 'View'}
            </Button>
            
            {actions.canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditVersion(row)}
                leftIcon={Edit }
              >
                Edit
              </Button>
            )}
            
            {actions.canSubmit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSubmitVersion(row.id)}
                leftIcon={Send }
                loading={submitVersionMutation.isPending}
              >
                Submit
              </Button>
            )}
            
            {actions.canApprove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApproveVersion(row.id)}
                leftIcon={ThumbsUp }
                loading={approveVersionMutation.isPending}
                className="text-green-600 hover:text-green-700"
              >
                Approve
              </Button>
            )}
            
            {actions.canReject && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRejectVersion(row.id)}
                leftIcon={ThumbsDown }
                className="text-red-600 hover:text-red-700"
              >
                Reject
              </Button>
            )}
            
            {actions.canFinalize && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFinalizeVersion(row.id)}
                leftIcon={CheckCircle2 }
                loading={finalizeVersionMutation.isPending}
              >
                Finalize
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  const lineColumns = [
    {
      header: 'Account',
      accessor: 'accountId',
      render: (row) => {
        const account = accountsMap.get(row.accountId || row.account_id);
        return account ? (
          <div className="flex flex-col">
            <span className="font-medium">{account.name || account.accountName}</span>
            <span className="text-xs text-slate-500">{account.code}</span>
          </div>
        ) : (
          row.accountId || row.account_id
        );
      }
    },
    {
      header: 'Period',
      accessor: 'periodId',
      render: (row) => {
        const period = periodsMap.get(row.periodId || row.period_id);
        return period ? formatPeriodDisplay(period) : (row.periodId || row.period_id);
      }
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (row) => (
        <span className="font-semibold">{formatCurrency(row.amount)}</span>
      ),
      align: 'right'
    }
  ];

  // ============================
  // Loading & Error States
  // ============================

  if (budgetLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Loading Budget..."
          icon={PiggyBank}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.budgets)}>
              Back
            </Button>
          }
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-500">Loading budget details...</div>
          </div>
        </ContentCard>
      </div>
    );
  }

  if (budgetError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Error"
          icon={PiggyBank}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.budgets)}>
              Back
            </Button>
          }
        />
        <ContentCard>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-lg font-medium text-slate-900">Failed to load budget</div>
            <div className="text-slate-500">{budgetError.message}</div>
            <Button onClick={() => refetchBudget()}>Retry</Button>
          </div>
        </ContentCard>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Budget Not Found"
          icon={PiggyBank}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.budgets)}>
              Back
            </Button>
          }
        />
        <ContentCard>
          <div className="py-12 text-center text-slate-500">
            The requested budget could not be found.
          </div>
        </ContentCard>
      </div>
    );
  }

  // ============================
  // Main Render
  // ============================

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={budget.name || 'Untitled Budget'}
        subtitle={
          <div className="flex items-center gap-3 mt-1">
            <Badge tone={budget.status === 'final' ? 'success' : 'muted'}>
              {budget.status || 'draft'}
            </Badge>
            <span>FY {budget.fiscal_year}</span>
            <span>{budget.currency_code}</span>
          </div>
        }
        icon={PiggyBank}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={ArrowLeft}
              onClick={() => navigate(ROUTES.budgets)}
            >
              Back
            </Button>
            <Button
              variant="outline"
              leftIcon={RefreshCw}
              onClick={() => {
                refetchBudget();
                toast.success('Data refreshed');
              }}
            >
              Refresh
            </Button>
            <Button
              leftIcon={Plus}
              onClick={() => {
                resetVersionForm();
                openModal('createVersion');
              }}
            >
              New Version
            </Button>
          </div>
        }
      />

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Budget Info */}
          <ContentCard>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Budget Information</h3>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-slate-500">Name</div>
                <div className="text-sm font-medium">{budget.name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Fiscal Year</div>
                <div className="text-sm font-medium">{budget.fiscal_year || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Currency</div>
                <div className="text-sm font-medium">{budget.currency_code || 'USD'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Status</div>
                <Badge tone={budget.status === 'final' ? 'success' : 'muted'} size="sm">
                  {budget.status || 'draft'}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-slate-500">Created</div>
                <div className="text-sm">{formatDate(budget.created_at)}</div>
              </div>
            </div>
          </ContentCard>

          {/* Quick Stats */}
          <ContentCard>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Total Versions</span>
                <Badge tone="brand">{versions.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Total Lines</span>
                <Badge tone="info">
                  {versions.reduce((sum, v) => sum + (v.lines?.length || 0), 0)}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Draft Versions</span>
                <Badge tone="muted">
                  {versions.filter(v => v.status === 'draft' || v.workflow_status === 'draft').length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Submitted</span>
                <Badge tone="info">
                  {versions.filter(v => v.workflow_status === 'submitted').length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Approved</span>
                <Badge tone="success">
                  {versions.filter(v => v.workflow_status === 'approved').length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Final</span>
                <Badge tone="success">
                  {versions.filter(v => v.status === 'final').length}
                </Badge>
              </div>
            </div>
          </ContentCard>

          {/* Help */}
          <ContentCard>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Tips</h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5" />
                <span>Click on a version to view its lines</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5" />
                <span>Use workflow: Draft → Submit → Approve → Finalize</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5" />
                <span>Only draft/rejected versions can be edited</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5" />
                <span>Lines are nested inside each version</span>
              </div>
            </div>
          </ContentCard>
        </div>

        {/* Main Area - Versions List */}
        <div className="lg:col-span-3 space-y-4">
          <ContentCard>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Budget Versions</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {versions.length} version{versions.length !== 1 ? 's' : ''} • Click to expand and view lines
                </p>
              </div>
              {versions.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={expandedVersions.size === versions.length ? Minimize2  : Maximize2 }
                    onClick={() => {
                      if (expandedVersions.size === versions.length) {
                        setExpandedVersions(new Set());
                      } else {
                        setExpandedVersions(new Set(versions.map(v => v.id)));
                      }
                    }}
                  >
                    {expandedVersions.size === versions.length ? 'Collapse All' : 'Expand All'}
                  </Button>
                </div>
              )}
            </div>

            {versions.length === 0 ? (
              <div className="py-12 text-center">
                <Layers className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-slate-900 mb-1">No versions yet</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Create your first version to start building the budget
                </p>
                <Button
                  onClick={() => {
                    resetVersionForm();
                    openModal('createVersion');
                  }}
                >
                  Create Version
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version) => {
                  const isSelected = selectedVersionId === version.id;
                  const isExpanded = expandedVersions.has(version.id);
                  const versionLines = version.lines || [];
                  const actions = getVersionActions(version);
                  const badge = getStatusBadge(version.status, version.workflow_status);
                  
                  return (
                    <div
                      key={version.id}
                      className={`border rounded-lg overflow-hidden ${
                        isSelected ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200'
                      }`}
                    >
                      {/* Version Header */}
                      <div
                        className={`flex items-center justify-between p-4 cursor-pointer ${
                          isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                        }`}
                        onClick={() => {
                          setSelectedVersionId(version.id);
                          if (!isExpanded) {
                            toggleVersionExpand(version.id);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleVersionExpand(version.id);
                            }}
                            className="p-1 hover:bg-slate-200 rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4 text-slate-500" />
                            )}
                          </button>
                          <Layers className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                                Version {version.version_no || version.versionNo}
                              </span>
                              {version.name && (
                                <span className="text-sm text-slate-600">• {version.name}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                              <Badge tone={badge.tone} size="sm">
                                {badge.label}
                              </Badge>
                              <span>{versionLines.length} line{versionLines.length !== 1 ? 's' : ''}</span>
                              <span>Created {formatDate(version.created_at)}</span>
                            </div>
                            
                            {/* Workflow metadata */}
                            {version.submitted_at && (
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                                <Clock className="h-3 w-3" />
                                <span>Submitted {formatDateTime(version.submitted_at)}</span>
                              </div>
                            )}
                            {version.approved_at && (
                              <div className="flex items-center gap-2 mt-1 text-xs text-green-600">
                                <UserCheck className="h-3 w-3" />
                                <span>Approved {formatDateTime(version.approved_at)}</span>
                              </div>
                            )}
                            {version.rejected_at && (
                              <div className="flex items-center gap-2 mt-1 text-xs text-red-600">
                                <XCircle className="h-3 w-3" />
                                <span>Rejected {formatDateTime(version.rejected_at)}</span>
                                {version.rejection_reason && (
                                  <span className="italic">: {version.rejection_reason}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Version Actions */}
                       {/* Version Actions */}
<div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
  {/* Workflow Actions - Always show based on status */}
  {actions.canSubmit && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSubmitVersion(version.id)}
      leftIcon={Send}
      loading={submitVersionMutation.isPending}
      className="text-blue-600 hover:text-blue-700"
    >
      Submit
    </Button>
  )}
  
  {actions.canApprove && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleApproveVersion(version.id)}
      leftIcon={ThumbsUp}
      loading={approveVersionMutation.isPending}
      className="text-green-600 hover:text-green-700"
    >
      Approve
    </Button>
  )}
  
  {actions.canReject && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleRejectVersion(version.id)}
      leftIcon={ThumbsDown}
      className="text-red-600 hover:text-red-700"
    >
      Reject
    </Button>
  )}
  
  {actions.canFinalize && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleFinalizeVersion(version.id)}
      leftIcon={CheckCircle2}
      loading={finalizeVersionMutation.isPending}
      className="text-purple-600 hover:text-purple-700"
    >
      Finalize
    </Button>
  )}

  {/* Divider for visual separation */}
  {(actions.canSubmit || actions.canApprove || actions.canReject || actions.canFinalize) && (
    <div className="w-px h-6 bg-slate-200 mx-1" />
  )}

  {/* Data Entry Actions */}
  {actions.canAddLines && (
    <Button
      variant="ghost"
      size="sm"
      leftIcon={ListPlus}
      onClick={() => openModal('addLines', version.id)}
    >
      Add Lines
    </Button>
  )}
  
  {actions.canDistribute && (
    <Button
      variant="ghost"
      size="sm"
      leftIcon={Shuffle}
      onClick={() => openModal('distribute', version.id)}
    >
      Distribute
    </Button>
  )}
  
  {actions.canImportCsv && (
    <Button
      variant="ghost"
      size="sm"
      leftIcon={Upload}
      onClick={() => openModal('importCsv', version.id)}
    >
      CSV
    </Button>
  )}

  {/* Edit Button */}
  {actions.canEdit && (
    <>
      <div className="w-px h-6 bg-slate-200 mx-1" />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleEditVersion(version)}
        leftIcon={Edit}
      >
        Edit
      </Button>
    </>
  )}
</div>
                      </div>

                      {/* Expanded Lines */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 bg-slate-50/50 p-4">
                          {versionLines.length === 0 ? (
                            <div className="text-center py-6">
                              <p className="text-sm text-slate-500 mb-3">No budget lines in this version</p>
                              {actions.canAddLines && (
                                <div className="flex justify-center gap-2">
                                  <Button
                                    size="sm"
                                    leftIcon={ListPlus }
                                    onClick={() => openModal('addLines', version.id)}
                                  >
                                    Add Lines
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    leftIcon={Upload }
                                    onClick={() => openModal('importCsv', version.id)}
                                  >
                                    Import CSV
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-medium text-slate-700">Budget Lines</h4>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    leftIcon={Filter }
                                    onClick={() => setShowFilters(!showFilters)}
                                  >
                                    Filter
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    leftIcon={viewMode === 'table' ? Grid  : TableIcon }
                                    onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
                                  >
                                    {viewMode === 'table' ? 'Grid' : 'Table'}
                                  </Button>
                                </div>
                              </div>

                              {/* Filters */}
                              {showFilters && (
                                <div className="mb-4 p-3 bg-white rounded-lg border border-slate-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-slate-700">Filters</span>
                                    <button
                                      onClick={() => setFilters({ account: '', period: '', amountRange: { min: '', max: '' } })}
                                      className="text-xs text-blue-600 hover:text-blue-700"
                                    >
                                      Clear all
                                    </button>
                                  </div>
                                  <div className="grid gap-3 md:grid-cols-3">
                                    <Select
                                      size="sm"
                                      value={filters.account}
                                      onChange={(e) => setFilters(f => ({ ...f, account: e.target.value }))}
                                      options={[
                                        { label: 'All Accounts', value: '' },
                                        ...accounts.map(a => ({ 
                                          label: formatAccountDisplay(a), 
                                          value: a.id 
                                        }))
                                      ]}
                                    />
                                    <Select
                                      size="sm"
                                      value={filters.period}
                                      onChange={(e) => setFilters(f => ({ ...f, period: e.target.value }))}
                                      options={[
                                        { label: 'All Periods', value: '' },
                                        ...periods.map(p => ({ 
                                          label: formatPeriodDisplay(p), 
                                          value: p.id 
                                        }))
                                      ]}
                                    />
                                    <div className="flex gap-2">
                                      <Input
                                        size="sm"
                                        type="number"
                                        placeholder="Min"
                                        value={filters.amountRange.min}
                                        onChange={(e) => setFilters(f => ({ 
                                          ...f, 
                                          amountRange: { ...f.amountRange, min: e.target.value }
                                        }))}
                                      />
                                      <Input
                                        size="sm"
                                        type="number"
                                        placeholder="Max"
                                        value={filters.amountRange.max}
                                        onChange={(e) => setFilters(f => ({ 
                                          ...f, 
                                          amountRange: { ...f.amountRange, max: e.target.value }
                                        }))}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Lines Display */}
                              {viewMode === 'table' ? (
                                <DataTable
                                  columns={lineColumns}
                                  rows={versionLines.filter(line => {
                                    if (filters.account && line.accountId !== filters.account && line.account_id !== filters.account) return false;
                                    if (filters.period && line.periodId !== filters.period && line.period_id !== filters.period) return false;
                                    if (filters.amountRange.min && line.amount < parseFloat(filters.amountRange.min)) return false;
                                    if (filters.amountRange.max && line.amount > parseFloat(filters.amountRange.max)) return false;
                                    return true;
                                  })}
                                  empty={{
                                    title: 'No matching lines',
                                    description: 'Try adjusting your filters'
                                  }}
                                />
                              ) : (
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                  {versionLines.filter(line => {
                                    if (filters.account && line.accountId !== filters.account && line.account_id !== filters.account) return false;
                                    if (filters.period && line.periodId !== filters.period && line.period_id !== filters.period) return false;
                                    if (filters.amountRange.min && line.amount < parseFloat(filters.amountRange.min)) return false;
                                    if (filters.amountRange.max && line.amount > parseFloat(filters.amountRange.max)) return false;
                                    return true;
                                  }).map((line, idx) => {
                                    const account = accountsMap.get(line.accountId || line.account_id);
                                    const period = periodsMap.get(line.periodId || line.period_id);
                                    return (
                                      <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                                        <div className="flex items-start justify-between mb-2">
                                          <Badge tone="info" size="sm">{account?.code || '—'}</Badge>
                                          <span className="text-xs text-slate-500">{period?.name || period?.code || '—'}</span>
                                        </div>
                                        <div className="font-medium text-sm text-slate-900 mb-1">
                                          {account?.name || account?.accountName || '—'}
                                        </div>
                                        <div className="text-base font-semibold text-slate-900">
                                          {formatCurrency(line.amount)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ContentCard>
        </div>
      </div>

      {/* ============================ */}
      {/* Modals */}
      {/* ============================ */}

      {/* Create Version Modal */}
      <Modal
        open={modals.createVersion}
        onClose={() => closeModal('createVersion')}
        title="Create Budget Version"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Layers className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">New Version for FY {budget.fiscal_year}</p>
                <p className="text-xs text-blue-700 mt-1">
                  Create a new version to track different budget scenarios
                </p>
              </div>
            </div>
          </div>

          <Input
            label="Version Number"
            type="number"
            min="1"
            value={versionForm.versionNo}
            onChange={(e) => setVersionForm(f => ({ ...f, versionNo: parseInt(e.target.value) || 1 }))}
            required
            helperText="Unique version number within this budget"
          />

          <Input
            label="Version Name (Optional)"
            value={versionForm.name}
            onChange={(e) => setVersionForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g., Base Version, Revised Forecast"
          />

          <Select
            label="Status"
            value={versionForm.status}
            onChange={(e) => setVersionForm(f => ({ ...f, status: e.target.value }))}
            options={[
              { label: 'Draft', value: 'draft' },
              { label: 'Final', value: 'final' },
              { label: 'Archived', value: 'archived' }
            ]}
          />

          <div className="border-t border-slate-200 pt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Management Dimensions (Optional)
            </label>
            <textarea
              className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={JSON.stringify(versionForm.dimensionJson, null, 2)}
              onChange={(e) => {
                try {
                  setVersionForm(f => ({ ...f, dimensionJson: JSON.parse(e.target.value) }));
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              placeholder='{
  "costCenter": "IT",
  "project": "Q2-2026",
  "department": "Engineering"
}'
            />
            <p className="text-xs text-slate-500 mt-1">
              JSON object of dimensions that apply to all lines in this version
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => closeModal('createVersion')}
            disabled={createVersionMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => createVersionMutation.mutate()}
            loading={createVersionMutation.isPending}
            leftIcon={Plus}
          >
            Create Version
          </Button>
        </div>
      </Modal>

      {/* Edit Version Modal */}
      <Modal
        open={modals.editVersion}
        onClose={() => {
          closeModal('editVersion');
          setEditingVersion(null);
          resetVersionForm();
        }}
        title="Edit Budget Version"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Edit className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Edit Version {editingVersion?.version_no || editingVersion?.versionNo}</p>
                <p className="text-xs text-blue-700 mt-1">
                  Update version details, status, or management dimensions
                </p>
              </div>
            </div>
          </div>

          <Input
            label="Version Number"
            type="number"
            min="1"
            value={versionForm.versionNo}
            onChange={(e) => setVersionForm(f => ({ ...f, versionNo: parseInt(e.target.value) || 1 }))}
            required
            helperText="Unique version number within this budget"
          />

          <Input
            label="Version Name (Optional)"
            value={versionForm.name}
            onChange={(e) => setVersionForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g., Base Version, Revised Forecast"
          />

          <Select
            label="Status"
            value={versionForm.status}
            onChange={(e) => setVersionForm(f => ({ ...f, status: e.target.value }))}
            options={[
              { label: 'Draft', value: 'draft' },
              { label: 'Final', value: 'final' },
              { label: 'Archived', value: 'archived' }
            ]}
            helperText={
              versionForm.status === 'final' 
                ? "Final versions cannot be edited further" 
                : versionForm.status === 'archived'
                ? "Archived versions are hidden from most views"
                : ""
            }
          />

          {/* Status Change Warning */}
          {editingVersion?.status === 'final' && versionForm.status !== 'final' && (
            <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Changing a final version back to draft will allow edits but may affect reporting.
              </p>
            </div>
          )}

          {editingVersion?.status === 'archived' && versionForm.status !== 'archived' && (
            <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Unarchiving this version will make it visible again in budget views.
              </p>
            </div>
          )}

          <div className="border-t border-slate-200 pt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Management Dimensions
            </label>
            <textarea
              className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={JSON.stringify(versionForm.dimensionJson, null, 2)}
              onChange={(e) => {
                try {
                  setVersionForm(f => ({ ...f, dimensionJson: JSON.parse(e.target.value) }));
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              placeholder='{
  "costCenter": "IT",
  "project": "Q2-2026",
  "department": "Engineering"
}'
            />
            <p className="text-xs text-slate-500 mt-1">
              JSON object of dimensions that apply to all lines in this version
            </p>
            {editingVersion?.dimension_json || editingVersion?.dimensionJson ? (
              <p className="text-xs text-blue-600 mt-2">
                Current dimensions: {Object.keys(editingVersion.dimension_json || editingVersion.dimensionJson || {}).length} dimension(s) defined
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-2">No dimensions currently set</p>
            )}
          </div>

          {/* Version Metadata */}
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium">Created:</span> {formatDateTime(editingVersion?.created_at)}
              </div>
              {editingVersion?.submitted_at && (
                <div>
                  <span className="font-medium">Submitted:</span> {formatDateTime(editingVersion.submitted_at)}
                </div>
              )}
              {editingVersion?.approved_at && (
                <div>
                  <span className="font-medium">Approved:</span> {formatDateTime(editingVersion.approved_at)}
                </div>
              )}
              {editingVersion?.rejected_at && (
                <div>
                  <span className="font-medium">Rejected:</span> {formatDateTime(editingVersion.rejected_at)}
                </div>
              )}
              {editingVersion?.finalized_at && (
                <div>
                  <span className="font-medium">Finalized:</span> {formatDateTime(editingVersion.finalized_at)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              closeModal('editVersion');
              setEditingVersion(null);
              resetVersionForm();
            }}
            disabled={updateVersionMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (editingVersion) {
                updateVersionMutation.mutate({
                  versionId: editingVersion.id,
                  data: {
                    versionNo: versionForm.versionNo,
                    name: versionForm.name || null,
                    status: versionForm.status,
                    dimensionJson: versionForm.dimensionJson
                  }
                });
              }
            }}
            loading={updateVersionMutation.isPending}
            leftIcon={Edit}
          >
            Update Version
          </Button>
        </div>
      </Modal>

      {/* Add Lines Modal */}
      <Modal
        open={modals.addLines}
        onClose={() => {
          closeModal('addLines');
          resetAddLinesForm();
        }}
        title="Add Budget Lines"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <ListPlus className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Add or update budget lines</p>
                <p className="text-xs text-blue-700 mt-1">
                  Each line requires an account, period, and amount
                </p>
                {addLinesForm.versionId && (
                  <p className="text-xs text-blue-600 mt-2">
                    Adding to Version {versions.find(v => v.id === addLinesForm.versionId)?.version_no}
                  </p>
                )}
              </div>
            </div>
          </div>

          {addLinesForm.versionId && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {addLinesForm.lines.map((line, index) => (
                <div key={index} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-700">Line {index + 1}</span>
                    {addLinesForm.lines.length > 1 && (
                      <button
                        onClick={() => {
                          const newLines = [...addLinesForm.lines];
                          newLines.splice(index, 1);
                          setAddLinesForm(f => ({ ...f, lines: newLines }));
                        }}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Select
                      label="Account"
                      value={line.accountId}
                      onChange={(e) => {
                        const newLines = [...addLinesForm.lines];
                        newLines[index] = { ...newLines[index], accountId: e.target.value };
                        setAddLinesForm(f => ({ ...f, lines: newLines }));
                      }}
                      options={[
                        { label: 'Select Account', value: '' },
                        ...accounts.map(a => ({ 
                          label: formatAccountDisplay(a), 
                          value: a.id 
                        }))
                      ]}
                      required
                    />

                    <Select
                      label="Period"
                      value={line.periodId}
                      onChange={(e) => {
                        const newLines = [...addLinesForm.lines];
                        newLines[index] = { ...newLines[index], periodId: e.target.value };
                        setAddLinesForm(f => ({ ...f, lines: newLines }));
                      }}
                      options={[
                        { label: periods.length === 0 ? `No periods for FY ${budget.fiscal_year}` : 'Select Period', value: '' },
                        ...periods.map(p => ({ 
                          label: formatPeriodDisplay(p), 
                          value: p.id 
                        }))
                      ]}
                      required
                      disabled={periods.length === 0}
                    />

                    <div className="md:col-span-2">
                      <Input
                        label="Amount"
                        type="number"
                        step="0.01"
                        value={line.amount}
                        onChange={(e) => {
                          const newLines = [...addLinesForm.lines];
                          newLines[index] = { ...newLines[index], amount: e.target.value };
                          setAddLinesForm(f => ({ ...f, lines: newLines }));
                        }}
                        leftIcon={DollarSign}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {addLinesForm.versionId && (
            <Button
              variant="outline"
              onClick={() => setAddLinesForm(f => ({ 
                ...f, 
                lines: [...f.lines, { accountId: '', periodId: '', amount: '' }] 
              }))}
              leftIcon={Plus }
              className="w-full"
            >
              Add Another Line
            </Button>
          )}

          {periods.length === 0 && (
            <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                No open periods found for fiscal year {budget.fiscal_year}. 
                Please create or open periods first.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              closeModal('addLines');
              resetAddLinesForm();
            }}
            disabled={addLinesMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => addLinesMutation.mutate()}
            loading={addLinesMutation.isPending}
            disabled={!addLinesForm.lines.some(l => l.accountId && l.periodId && l.amount) || periods.length === 0}
            leftIcon={ListPlus }
          >
            Add Lines
          </Button>
        </div>
      </Modal>

      {/* Upsert Annual Amount Modal */}
      <Modal
        open={modals.upsertAnnual}
        onClose={() => {
          closeModal('upsertAnnual');
          resetUpsertAnnualForm();
        }}
        title="Upsert Annual Amount"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Edit className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Set or update annual amounts</p>
                <p className="text-xs text-blue-700 mt-1">
                  Annual amounts will be distributed across periods in this version
                </p>
                {upsertAnnualForm.versionId && (
                  <p className="text-xs text-blue-600 mt-2">
                    Updating Version {versions.find(v => v.id === upsertAnnualForm.versionId)?.version_no}
                  </p>
                )}
              </div>
            </div>
          </div>

          {upsertAnnualForm.versionId && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {upsertAnnualForm.items.map((item, index) => (
                <div key={index} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-700">Item {index + 1}</span>
                    {upsertAnnualForm.items.length > 1 && (
                      <button
                        onClick={() => {
                          const newItems = [...upsertAnnualForm.items];
                          newItems.splice(index, 1);
                          setUpsertAnnualForm(f => ({ ...f, items: newItems }));
                        }}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Select
                      label="Account"
                      value={item.accountId}
                      onChange={(e) => {
                        const newItems = [...upsertAnnualForm.items];
                        newItems[index] = { ...newItems[index], accountId: e.target.value };
                        setUpsertAnnualForm(f => ({ ...f, items: newItems }));
                      }}
                      options={[
                        { label: 'Select Account', value: '' },
                        ...accounts.map(a => ({ 
                          label: formatAccountDisplay(a), 
                          value: a.id 
                        }))
                      ]}
                      required
                    />

                    <Input
                      label="Annual Amount"
                      type="number"
                      step="0.01"
                      value={item.annualAmount}
                      onChange={(e) => {
                        const newItems = [...upsertAnnualForm.items];
                        newItems[index] = { ...newItems[index], annualAmount: e.target.value };
                        setUpsertAnnualForm(f => ({ ...f, items: newItems }));
                      }}
                      leftIcon={DollarSign}
                      required
                    />

                    <Select
                      label="Distribution Method"
                      value={item.method}
                      onChange={(e) => {
                        const newItems = [...upsertAnnualForm.items];
                        newItems[index] = { ...newItems[index], method: e.target.value };
                        setUpsertAnnualForm(f => ({ ...f, items: newItems }));
                      }}
                      options={[
                        { label: 'Even - Equal per period', value: 'even' },
                        { label: 'Weighted - Based on period weights', value: 'weighted' },
                        { label: 'Custom - Manual allocation', value: 'custom' }
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {upsertAnnualForm.versionId && (
            <Button
              variant="outline"
              onClick={() => setUpsertAnnualForm(f => ({ 
                ...f, 
                items: [...f.items, { accountId: '', annualAmount: '', method: 'even', dimensionJson: {} }] 
              }))}
              leftIcon={Plus }
              className="w-full"
            >
              Add Another Item
            </Button>
          )}

          {periods.length === 0 && (
            <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                No periods available for distribution. Please create or open periods first.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              closeModal('upsertAnnual');
              resetUpsertAnnualForm();
            }}
            disabled={upsertAnnualMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => upsertAnnualMutation.mutate()}
            loading={upsertAnnualMutation.isPending}
            disabled={!upsertAnnualForm.items.some(i => i.accountId && i.annualAmount) || periods.length === 0}
            leftIcon={Edit }
          >
            Upsert Amount
          </Button>
        </div>
      </Modal>

      {/* Distribute Amount Modal */}
      <Modal
        open={modals.distribute}
        onClose={() => {
          closeModal('distribute');
          resetDistributeForm();
        }}
        title="Distribute Annual Amount"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shuffle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Distribute amount across periods</p>
                <p className="text-xs text-blue-700 mt-1">
                  Spread an annual amount across multiple periods in this version
                </p>
                {distributeForm.versionId && (
                  <p className="text-xs text-blue-600 mt-2">
                    Distributing to Version {versions.find(v => v.id === distributeForm.versionId)?.version_no}
                  </p>
                )}
              </div>
            </div>
          </div>

          {distributeForm.versionId && (
            <>
              <Select
                label="Account"
                value={distributeForm.accountId}
                onChange={(e) => setDistributeForm(f => ({ ...f, accountId: e.target.value }))}
                options={[
                  { label: 'Select Account', value: '' },
                  ...accounts.map(a => ({ 
                    label: formatAccountDisplay(a), 
                    value: a.id 
                  }))
                ]}
                required
              />

              <Input
                label="Annual Amount"
                type="number"
                step="0.01"
                value={distributeForm.annualAmount}
                onChange={(e) => setDistributeForm(f => ({ ...f, annualAmount: e.target.value }))}
                leftIcon={DollarSign}
                required
              />

              <Select
                label="Distribution Method"
                value={distributeForm.method}
                onChange={(e) => setDistributeForm(f => ({ ...f, method: e.target.value }))}
                options={[
                  { label: 'Even - Equal per period', value: 'even' },
                  { label: 'Weighted - Based on period weights', value: 'weighted' },
                  { label: 'Custom - Manual allocation', value: 'custom' }
                ]}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Periods <span className="text-red-500">*</span>
                </label>
                <div className="text-xs text-blue-600 mb-2 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {periods.length} periods available for FY {budget.fiscal_year}
                </div>
                <select
                  multiple
                  value={distributeForm.periodIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
                    setDistributeForm(f => ({ ...f, periodIds: selected }));
                  }}
                  className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={periods.length === 0}
                >
                  {periods.map(period => (
                    <option key={period.id} value={period.id}>
                      {formatPeriodDisplay(period)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Hold Ctrl/Cmd to select multiple periods
                </p>
              </div>
            </>
          )}

          {periods.length === 0 && (
            <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                No periods available for distribution. Please create or open periods first.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              closeModal('distribute');
              resetDistributeForm();
            }}
            disabled={distributeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => distributeMutation.mutate()}
            loading={distributeMutation.isPending}
            disabled={
              !distributeForm.accountId ||
              !distributeForm.annualAmount ||
              distributeForm.periodIds.length === 0 ||
              periods.length === 0
            }
            leftIcon={Shuffle }
          >
            Distribute
          </Button>
        </div>
      </Modal>

      {/* Import CSV Modal */}
      <Modal
        open={modals.importCsv}
        onClose={() => {
          closeModal('importCsv');
          resetCsvForm();
        }}
        title="Import Budget Lines (CSV)"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Upload className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">CSV Import</p>
                <p className="text-xs text-blue-700 mt-1">
                  Required columns: <span className="font-mono">accountId, periodId, amount</span>
                </p>
                {csvForm.versionId && (
                  <p className="text-xs text-blue-600 mt-2">
                    Importing to Version {versions.find(v => v.id === csvForm.versionId)?.version_no}
                  </p>
                )}
                <p className="text-xs text-blue-600 mt-2">
                  Example:
                </p>
                <pre className="text-xs bg-blue-100 p-2 rounded mt-1">
                  accountId,periodId,amount{'\n'}
                  uuid-1,uuid-2,1000{'\n'}
                  uuid-3,uuid-4,2000
                </pre>
              </div>
            </div>
          </div>

          {csvForm.versionId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                CSV Data
              </label>
              <textarea
                className="w-full h-48 px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={csvForm.data}
                onChange={(e) => setCsvForm(f => ({ ...f, data: e.target.value }))}
                placeholder="accountId,periodId,amount&#10;..."
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              closeModal('importCsv');
              resetCsvForm();
            }}
            disabled={importCsvMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => importCsvMutation.mutate()}
            loading={importCsvMutation.isPending}
            disabled={!csvForm.data.trim()}
            leftIcon={Upload }
          >
            Import CSV
          </Button>
        </div>
      </Modal>

      {/* Rejection Reason Modal */}
      <Modal
        open={rejectionModalOpen}
        onClose={() => {
          setRejectionModalOpen(false);
          setRejectionReason('');
          setSelectedVersionForRejection(null);
        }}
        title="Reject Version"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <ThumbsDown className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">Provide Rejection Reason</p>
                <p className="text-xs text-amber-700 mt-1">
                  Please explain why this version is being rejected
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              required
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setRejectionModalOpen(false);
              setRejectionReason('');
              setSelectedVersionForRejection(null);
            }}
            disabled={rejectVersionMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmRejectVersion}
            loading={rejectVersionMutation.isPending}
            disabled={!rejectionReason.trim()}
            leftIcon={ThumbsDown }
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Reject Version
          </Button>
        </div>
      </Modal>
    </div>
  );
}