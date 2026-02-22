import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from 'react-router-dom';
import {
  CloudSun,
  Plus,
  Copy,
  CheckCircle2,
  TrendingUp,
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
  Download,
  Filter,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  BarChart3,
  PieChart,
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
  XCircle,
  Upload,
  Shuffle,
  PlayCircle,
  MoreVertical,
  GitBranch,
  GitCompare,
  Activity,
  Target,
  Zap,
  Scale,
  LineChart,
  Gauge
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
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../shared/components/ui/DropdownMenu.jsx";
import { ROUTES } from '../../../app/constants/routes.js';
import { generateUUID } from "../../../shared/utils/generateUUID.js";

/**
 * Helper function to safely extract data from various API response formats
 */
function extractData(data) {
  if (!data) return null;
  
  // Handle { data: { ... } } structure
  if (data.data && data.data.data) {
    return data.data.data;
  }
  if (data.data) {
    return data.data;
  }
  
  return data;
}

/**
 * Helper function to safely extract rows from various API response formats
 */
function extractRows(data) {
  if (!data) return [];
  
  if (Array.isArray(data)) return data;
  if (data.data && Array.isArray(data.data.data)) return data.data.data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  
  return [];
}

export default function ForecastDetail() {
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
  const [viewMode, setViewMode] = useState('table');
  const [showFilters, setShowFilters] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedVersionForRejection, setSelectedVersionForRejection] = useState(null);
  const [activeTab, setActiveTab] = useState('versions');
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareResults, setCompareResults] = useState(null);
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
    addLines: false,
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
    scenarioKey: null,
    probabilityWeight: 1,
    dimensionJson: {}
  });

  const [copyForm, setCopyForm] = useState({
    baseVersionId: '',
    compareVersionId: '',
    periodId: '',
    newVersionNo: 2,
    name: '',
    scenarioKey: null,
    probabilityWeight: 1
  });

  const [addLinesForm, setAddLinesForm] = useState({
    versionId: '',
    lines: [{ accountId: '', periodId: '', amount: '' }]
  });

  
  const [csvForm, setCsvForm] = useState({
    versionId: '',
    data: ''
  });

  // ============================
  // Data Fetching
  // ============================

  // Fetch Forecast with all nested data
  const { 
    data: forecastData, 
    isLoading: forecastLoading, 
    error: forecastError,
    refetch: refetchForecast 
  } = useQuery({
    queryKey: ['forecast', id],
    queryFn: () => api.forecasts.get(id, { includeLines: true }),
    enabled: !!id,
    staleTime: 30000
  });

  // Extract forecast data
  const forecast = useMemo(() => extractData(forecastData), [forecastData]);

  // Extract versions from forecast
  const versions = useMemo(() => {
    if (!forecast) return [];
    if (forecast.versions && Array.isArray(forecast.versions)) return forecast.versions;
    return [];
  }, [forecast]);

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

  const accounts = useMemo(() => extractRows(accountsData), [accountsData]);

  const accountsMap = useMemo(() => {
    const map = new Map();
    accounts.forEach(acc => map.set(acc.id, acc));
    return map;
  }, [accounts]);

  const { data: periodsData } = useQuery({
    queryKey: ['periods'],
    queryFn: () => periodsApi.list({ 
      status: 'open' 
    }),
    staleTime: 60000
  });

  const periods = useMemo(() => extractRows(periodsData), [periodsData]);
  const periodsMap = useMemo(() => {
    const map = new Map();
    periods.forEach(p => map.set(p.id, p));
    return map;
  }, [periods]);

  // Set initial selected version
  useEffect(() => {
    if (versions.length > 0 && !selectedVersionId) {
      setSelectedVersionId(versions[0].id);
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
        scenarioKey: versionForm.scenarioKey,
        probabilityWeight: Number(versionForm.probabilityWeight),
        dimensionJson: versionForm.dimensionJson
      };
      return api.forecasts.versions.create(id, payload, { idempotencyKey });
    },
    onSuccess: (data) => {
      toast.success('Version created successfully');
      closeModal('createVersion');
      resetVersionForm();
      refetchForecast();
      
      const newVersion = extractData(data);
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
      return api.forecasts.updateVersion(id, versionId, data, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Version updated successfully');
      closeModal('editVersion');
      refetchForecast();
      setEditingVersion(null);
      resetVersionForm();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update version');
    }
  });

  const copyVersionMutation = useMutation({
    mutationFn: async (versionId) => {
      const idempotencyKey = generateUUID();
      const payload = {
        newVersionNo: Number(copyForm.newVersionNo),
        name: copyForm.name || `${copyForm.name || 'Copy'} (v${copyForm.newVersionNo})`,
        scenarioKey: copyForm.scenarioKey,
        probabilityWeight: Number(copyForm.probabilityWeight)
      };
      return api.forecasts.versions.copy(id, versionId, payload, { idempotencyKey });
    },
    onSuccess: (data) => {
      toast.success('Version copied successfully');
      closeModal('copyVersion');
      resetCopyForm();
      refetchForecast();
      
      const newVersion = extractData(data);
      if (newVersion?.id) {
        setSelectedVersionId(newVersion.id);
        setExpandedVersions(prev => new Set([...prev, newVersion.id]));
      }
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to copy version');
    }
  });

  const compareVersionsMutation = useMutation({
    mutationFn: async () => {
      const idempotencyKey = generateUUID();
      const payload = {
        baseVersionId: copyForm.baseVersionId,
        compareVersionId: copyForm.compareVersionId,
        periodId: copyForm.periodId || undefined
      };
      return api.forecasts.compare(id, payload, { idempotencyKey });
    },
    onSuccess: (data) => {
      toast.success('Comparison completed');
      setCompareResults(extractData(data));
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to compare versions');
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

      return api.forecasts.versions.lines.addLines(
        id, 
        addLinesForm.versionId || selectedVersionId, 
        { lines: validLines },
        { idempotencyKey }
      );
    },
    onSuccess: () => {
      toast.success('Forecast lines added successfully');
      closeModal('addLines');
      resetAddLinesForm();
      refetchForecast();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to add lines');
    }
  });


  const importCsvMutation = useMutation({
    mutationFn: async () => {
      const idempotencyKey = generateUUID();
      return api.forecasts.importCsvToVersion(
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
      refetchForecast();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to import CSV');
    }
  });

  const finalizeVersionMutation = useMutation({
    mutationFn: async (versionId) => {
      const idempotencyKey = generateUUID();
      return api.forecasts.versions.finalize(id, versionId, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Version finalized successfully');
      refetchForecast();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to finalize version');
    }
  });

  const submitVersionMutation = useMutation({
    mutationFn: async (versionId) => {
      const idempotencyKey = generateUUID();
      return api.forecasts.versions.submit(id, versionId, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Version submitted for approval');
      refetchForecast();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to submit version');
    }
  });

  const approveVersionMutation = useMutation({
    mutationFn: async (versionId) => {
      const idempotencyKey = generateUUID();
      return api.forecasts.versions.approve(id, versionId, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Version approved successfully');
      refetchForecast();
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
      return api.forecasts.versions.reject(id, versionId, { reason }, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Version rejected');
      refetchForecast();
      setRejectionModalOpen(false);
      setRejectionReason('');
      setSelectedVersionForRejection(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to reject version');
    }
  });

  const archiveVersionMutation = useMutation({
    mutationFn: async (versionId) => {
      const idempotencyKey = generateUUID();
      return api.forecasts.versions.archive(id, versionId, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Version archived successfully');
      refetchForecast();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to archive version');
    }
  });

  // ============================
  // Utility Functions
  // ============================

  const formatCurrency = (amount, currency = forecast?.currency_code || 'USD') => {
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
      active: { tone: 'success', label: 'Active' },
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
      switch(modalName) {
        case 'addLines':
          setAddLinesForm(prev => ({ ...prev, versionId }));
          break;
       
        case 'importCsvToVersion':
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
      scenarioKey: null,
      probabilityWeight: 1,
      dimensionJson: {}
    });
  };

  const resetCopyForm = () => {
    setCopyForm({
      baseVersionId: '',
      compareVersionId: '',
      periodId: '',
      newVersionNo: versions.length + 2,
      name: '',
      scenarioKey: null,
      probabilityWeight: 1
    });
  };

  const resetAddLinesForm = () => {
    setAddLinesForm({
      versionId: '',
      lines: [{ accountId: '', periodId: '', amount: '' }]
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
      scenarioKey: version.scenario_key || version.scenarioKey,
      probabilityWeight: version.probability_weight || version.probabilityWeight || 1,
      dimensionJson: version.dimension_json || version.dimensionJson || {}
    });
    openModal('editVersion');
  };

  const handleCopyVersion = (version) => {
    setCopyForm({
      baseVersionId: version.id,
      compareVersionId: '',
      periodId: '',
      newVersionNo: (version.version_no || version.versionNo) + 1,
      name: `${version.name || 'Copy'} (v${(version.version_no || version.versionNo) + 1})`,
      scenarioKey: version.scenario_key || version.scenarioKey,
      probabilityWeight: version.probability_weight || version.probabilityWeight || 1
    });
    openModal('copyVersion');
  };

  const handleFinalizeVersion = (versionId) => {
    if (window.confirm('Are you sure you want to finalize this version? This action cannot be undone.')) {
      finalizeVersionMutation.mutate(versionId);
    }
  };

  const handleArchiveVersion = (versionId) => {
    if (window.confirm('Archive this version? It will be hidden from most views.')) {
      archiveVersionMutation.mutate(versionId);
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
    const workflowStatus = version.status?.toLowerCase();
    
    const actions = {
      canEdit: status === 'draft' || workflowStatus === 'draft' || workflowStatus === 'rejected',
      canSubmit: workflowStatus === 'draft' || workflowStatus === 'rejected',
      canApprove: workflowStatus === 'submitted',
      canReject: workflowStatus === 'submitted',
      canFinalize: workflowStatus === 'approved' && status !== 'finalized',
      canArchive: status !== 'archived' && workflowStatus !== 'submitted' && workflowStatus !== 'approved',
      canCopy: true,
      canAddLines: workflowStatus === 'draft' || workflowStatus === 'rejected',
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
          <GitBranch className="h-4 w-4 text-slate-400" />
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
      header: 'Scenario',
      accessor: 'scenario_key',
      render: (row) => {
        const scenario = row.scenario_key || row.scenarioKey;
        return scenario ? (
          <Badge tone="info" size="sm">{scenario}</Badge>
        ) : '—';
      }
    },
    {
      header: 'Probability',
      accessor: 'probability_weight',
      render: (row) => {
        const weight = row.probability_weight || row.probabilityWeight;
        return weight ? `${weight * 100}%` : '—';
      }
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
              leftIcon={row.id === selectedVersionId ? Eye : EyeOff}
            >
              {row.id === selectedVersionId ? 'Viewing' : 'View'}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.canEdit && (
                  <DropdownMenuItem onClick={() => handleEditVersion(row)}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Edit Details</span>
                  </DropdownMenuItem>
                )}
                
                {actions.canCopy && (
                  <DropdownMenuItem onClick={() => handleCopyVersion(row)}>
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Copy Version</span>
                  </DropdownMenuItem>
                )}
                
                {actions.canSubmit && (
                  <DropdownMenuItem onClick={() => handleSubmitVersion(row.id)}>
                    <Send className="mr-2 h-4 w-4 text-blue-600" />
                    <span>Submit for Approval</span>
                  </DropdownMenuItem>
                )}
                
                {actions.canApprove && (
                  <DropdownMenuItem onClick={() => handleApproveVersion(row.id)}>
                    <ThumbsUp className="mr-2 h-4 w-4 text-green-600" />
                    <span>Approve</span>
                  </DropdownMenuItem>
                )}
                
                {actions.canReject && (
                  <DropdownMenuItem onClick={() => handleRejectVersion(row.id)}>
                    <ThumbsDown className="mr-2 h-4 w-4 text-red-600" />
                    <span>Reject</span>
                  </DropdownMenuItem>
                )}
                
                {actions.canFinalize && (
                  <DropdownMenuItem onClick={() => handleFinalizeVersion(row.id)}>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-purple-600" />
                    <span>Finalize</span>
                  </DropdownMenuItem>
                )}
                
                {actions.canArchive && (
                  <DropdownMenuItem onClick={() => handleArchiveVersion(row.id)}>
                    <Archive className="mr-2 h-4 w-4 text-amber-600" />
                    <span>Archive</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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

  if (forecastLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Loading Forecast..."
          icon={CloudSun}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.forecasts)}>
              Back
            </Button>
          }
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-500">Loading forecast details...</div>
          </div>
        </ContentCard>
      </div>
    );
  }

  if (forecastError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Error"
          icon={CloudSun}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.forecasts)}>
              Back
            </Button>
          }
        />
        <ContentCard>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-lg font-medium text-slate-900">Failed to load forecast</div>
            <div className="text-slate-500">{forecastError.message}</div>
            <Button onClick={() => refetchForecast()}>Retry</Button>
          </div>
        </ContentCard>
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Forecast Not Found"
          icon={CloudSun}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.forecasts)}>
              Back
            </Button>
          }
        />
        <ContentCard>
          <div className="py-12 text-center text-slate-500">
            The requested forecast could not be found.
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
        title={forecast.name || 'Untitled Forecast'}
        subtitle={
          <div className="flex items-center gap-3 mt-1">
            <Badge tone={forecast.status === 'active' ? 'success' : 'muted'}>
              {forecast.status || 'draft'}
            </Badge>
            <span>FY {forecast.fiscal_year}</span>
            <span>{forecast.currency_code}</span>
          </div>
        }
        icon={CloudSun}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={ArrowLeft}
              onClick={() => navigate(ROUTES.forecasts)}
            >
              Back
            </Button>
            <Button
              variant="outline"
              leftIcon={RefreshCw}
              onClick={() => {
                refetchForecast();
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

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'versions', label: 'Versions', icon: Layers },
          { id: 'compare', label: 'Compare', icon: GitCompare },
          { id: 'scenarios', label: 'Scenarios', icon: Target },
          { id: 'metrics', label: 'Metrics', icon: Gauge }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Main Content */}
      {activeTab === 'versions' && (
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Forecast Info */}
            <ContentCard>
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Forecast Information</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-500">Name</div>
                  <div className="text-sm font-medium">{forecast.name || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Fiscal Year</div>
                  <div className="text-sm font-medium">{forecast.fiscal_year || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Currency</div>
                  <div className="text-sm font-medium">{forecast.currency_code || 'USD'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Status</div>
                  <Badge tone={forecast.status === 'active' ? 'success' : 'muted'} size="sm">
                    {forecast.status || 'draft'}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Created</div>
                  <div className="text-sm">{formatDate(forecast.created_at)}</div>
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
                  <span className="text-sm text-slate-600">Finalized</span>
                  <Badge tone="success">
                    {versions.filter(v => v.status === 'finalized').length}
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
                  <span>Create multiple versions for scenario planning</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <span>Use probability weights for weighted forecasts</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <span>Compare versions to analyze variances</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5" />
                  <span>Finalized versions are locked from edits</span>
                </div>
              </div>
            </ContentCard>
          </div>

          {/* Main Area - Versions List */}
          <div className="lg:col-span-3 space-y-4">
            <ContentCard>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Forecast Versions</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {versions.length} version{versions.length !== 1 ? 's' : ''} • Click to expand and view lines
                  </p>
                </div>
                {versions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={expandedVersions.size === versions.length ? Minimize2 : Maximize2}
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
                    Create your first version to start building the forecast
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
                            <GitBranch className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                                  Version {version.version_no || version.versionNo}
                                </span>
                                {version.name && (
                                  <span className="text-sm text-slate-600">• {version.name}</span>
                                )}
                                {version.scenario_key && (
                                  <Badge tone="info" size="sm">{version.scenario_key}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                <Badge tone={badge.tone} size="sm">
                                  {badge.label}
                                </Badge>
                                <span>{versionLines.length} line{versionLines.length !== 1 ? 's' : ''}</span>
                                {version.probability_weight && (
                                  <span>{(version.probability_weight * 100)}% probability</span>
                                )}
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

                          {/* Quick Actions */}
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={Copy}
                              onClick={() => handleCopyVersion(version)}
                            >
                              Copy
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {actions.canEdit && (
                                  <DropdownMenuItem onClick={() => handleEditVersion(version)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Edit Details</span>
                                  </DropdownMenuItem>
                                )}
                                
                                                           
                                {actions.canImportCsv && (
                                  <DropdownMenuItem onClick={() => openModal('importCsv', version.id)}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    <span>Import CSV</span>
                                  </DropdownMenuItem>
                                )}
                                
                                {actions.canSubmit && (
                                  <DropdownMenuItem onClick={() => handleSubmitVersion(version.id)}>
                                    <Send className="mr-2 h-4 w-4 text-blue-600" />
                                    <span>Submit for Approval</span>
                                  </DropdownMenuItem>
                                )}
                                
                                {actions.canApprove && (
                                  <DropdownMenuItem onClick={() => handleApproveVersion(version.id)}>
                                    <ThumbsUp className="mr-2 h-4 w-4 text-green-600" />
                                    <span>Approve</span>
                                  </DropdownMenuItem>
                                )}
                                
                                {actions.canReject && (
                                  <DropdownMenuItem onClick={() => handleRejectVersion(version.id)}>
                                    <ThumbsDown className="mr-2 h-4 w-4 text-red-600" />
                                    <span>Reject</span>
                                  </DropdownMenuItem>
                                )}
                                
                                {actions.canFinalize && (
                                  <DropdownMenuItem onClick={() => handleFinalizeVersion(version.id)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-purple-600" />
                                    <span>Finalize</span>
                                  </DropdownMenuItem>
                                )}
                                
                                {actions.canArchive && (
                                  <DropdownMenuItem onClick={() => handleArchiveVersion(version.id)}>
                                    <Archive className="mr-2 h-4 w-4 text-amber-600" />
                                    <span>Archive</span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Expanded Lines */}
                        {isExpanded && (
                          <div className="border-t border-slate-200 bg-slate-50/50 p-4">
                            {versionLines.length === 0 ? (
                              <div className="text-center py-6">
                                <p className="text-sm text-slate-500 mb-3">No forecast lines in this version</p>
                                {actions.canAddLines && (
                                  <div className="flex justify-center gap-2">
                                    <Button
                                      size="sm"
                                      leftIcon={ListPlus}
                                      onClick={() => openModal('addLines', version.id)}
                                    >
                                      Add Lines
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      leftIcon={Upload}
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
                                  <h4 className="text-sm font-medium text-slate-700">Forecast Lines</h4>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      leftIcon={Filter}
                                      onClick={() => setShowFilters(!showFilters)}
                                    >
                                      Filter
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      leftIcon={viewMode === 'table' ? Grid : TableIcon}
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
      )}

      {/* Compare Tab */}
      {activeTab === 'compare' && (
        <ContentCard>
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <GitCompare className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Compare Forecast Versions</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Analyze variances between two versions for specific periods or accounts
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Select
                label="Base Version"
                value={copyForm.baseVersionId}
                onChange={(e) => setCopyForm(f => ({ ...f, baseVersionId: e.target.value }))}
                options={[
                  { label: 'Select Base Version', value: '' },
                  ...versions.map(v => ({
                    label: `v${v.version_no || v.versionNo}${v.name ? ` - ${v.name}` : ''}`,
                    value: v.id
                  }))
                ]}
                required
              />

              <Select
                label="Compare Version"
                value={copyForm.compareVersionId}
                onChange={(e) => setCopyForm(f => ({ ...f, compareVersionId: e.target.value }))}
                options={[
                  { label: 'Select Compare Version', value: '' },
                  ...versions.map(v => ({
                    label: `v${v.version_no || v.versionNo}${v.name ? ` - ${v.name}` : ''}`,
                    value: v.id
                  }))
                ]}
                required
              />

              <Select
                label="Period (Optional)"
                value={copyForm.periodId}
                onChange={(e) => setCopyForm(f => ({ ...f, periodId: e.target.value }))}
                options={[
                  { label: 'All Periods', value: '' },
                  ...periods.map(p => ({
                    label: formatPeriodDisplay(p),
                    value: p.id
                  }))
                ]}
              />
            </div>

            <div className="flex justify-end">
              <Button
                leftIcon={TrendingUp}
                onClick={() => compareVersionsMutation.mutate()}
                loading={compareVersionsMutation.isPending}
                disabled={!copyForm.baseVersionId || !copyForm.compareVersionId}
              >
                Compare Versions
              </Button>
            </div>

            {/* Comparison Results */}
            {compareResults && (
              <div className="mt-6 border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Comparison Results</h3>
                
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-xs text-slate-500 mb-1">Total Variance</div>
                    <div className={`text-lg font-semibold ${
                      compareResults.totalVariance > 0 ? 'text-green-600' : 
                      compareResults.totalVariance < 0 ? 'text-red-600' : 'text-slate-900'
                    }`}>
                      {formatCurrency(compareResults.totalVariance)}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-xs text-slate-500 mb-1">Variance Percentage</div>
                    <div className={`text-lg font-semibold ${
                      compareResults.variancePercentage > 0 ? 'text-green-600' : 
                      compareResults.variancePercentage < 0 ? 'text-red-600' : 'text-slate-900'
                    }`}>
                      {compareResults.variancePercentage?.toFixed(2)}%
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-xs text-slate-500 mb-1">Periods Compared</div>
                    <div className="text-lg font-semibold text-slate-900">
                      {compareResults.periodsCompared || 'All'}
                    </div>
                  </div>
                </div>

                {compareResults.details && (
                  <DataTable
                    columns={[
                      { header: 'Account', accessor: 'account' },
                      { header: 'Base Amount', render: (r) => formatCurrency(r.baseAmount) },
                      { header: 'Compare Amount', render: (r) => formatCurrency(r.compareAmount) },
                      { header: 'Variance', render: (r) => (
                        <span className={r.variance > 0 ? 'text-green-600' : r.variance < 0 ? 'text-red-600' : ''}>
                          {formatCurrency(r.variance)}
                        </span>
                      )},
                      { header: 'Variance %', render: (r) => (
                        <span className={r.variancePercent > 0 ? 'text-green-600' : r.variancePercent < 0 ? 'text-red-600' : ''}>
                          {r.variancePercent?.toFixed(2)}%
                        </span>
                      )}
                    ]}
                    rows={compareResults.details}
                  />
                )}
              </div>
            )}
          </div>
        </ContentCard>
      )}

      {/* Scenarios Tab */}
      {activeTab === 'scenarios' && (
        <ContentCard>
          <div className="space-y-6">
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-purple-900">Scenario Analysis</p>
                  <p className="text-xs text-purple-700 mt-1">
                    View and manage forecast scenarios with probability weights
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {versions.filter(v => v.scenario_key).length === 0 ? (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No scenarios defined yet</p>
                </div>
              ) : (
                versions.filter(v => v.scenario_key).map(version => (
                  <div key={version.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge tone="purple">{version.scenario_key}</Badge>
                        <span className="font-medium">v{version.version_no || version.versionNo}</span>
                        {version.name && <span className="text-sm text-slate-600">• {version.name}</span>}
                      </div>
                      <Badge tone={version.probability_weight ? 'success' : 'muted'}>
                        {(version.probability_weight * 100)}% probability
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-600">{version.lines?.length || 0} lines</span>
                      <span className="text-slate-600">
                        Total: {formatCurrency(version.lines?.reduce((sum, l) => sum + (l.amount || 0), 0) || 0)}
                      </span>
                      <Badge tone={version.workflow_status === 'approved' ? 'success' : 'muted'}>
                        {version.workflow_status || version.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </ContentCard>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <ContentCard>
          <div className="space-y-6">
            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Gauge className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">Forecast Metrics</p>
                  <p className="text-xs text-green-700 mt-1">
                    Key performance indicators and forecast accuracy metrics
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-1">Total Forecast Value</div>
                <div className="text-xl font-semibold text-slate-900">
                  {formatCurrency(versions.reduce((sum, v) => {
                    if (v.workflow_status === 'approved' || v.status === 'active') {
                      return sum + (v.lines?.reduce((s, l) => s + (l.amount || 0), 0) || 0);
                    }
                    return sum;
                  }, 0))}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-1">Active Scenarios</div>
                <div className="text-xl font-semibold text-slate-900">
                  {versions.filter(v => v.scenario_key).length}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-1">Weighted Forecast</div>
                <div className="text-xl font-semibold text-slate-900">
                  {formatCurrency(versions.reduce((sum, v) => {
                    const weight = v.probability_weight || 0;
                    const value = v.lines?.reduce((s, l) => s + (l.amount || 0), 0) || 0;
                    return sum + (value * weight);
                  }, 0))}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-1">Approval Rate</div>
                <div className="text-xl font-semibold text-slate-900">
                  {versions.length > 0 
                    ? Math.round((versions.filter(v => v.workflow_status === 'approved').length / versions.length) * 100)
                    : 0}%
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-medium text-slate-900 mb-3">Version Distribution</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-20 text-sm text-slate-600">Draft:</div>
                  <div className="flex-1">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-400 rounded-full"
                        style={{ width: `${(versions.filter(v => v.workflow_status === 'draft').length / Math.max(versions.length, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium">{versions.filter(v => v.workflow_status === 'draft').length}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 text-sm text-slate-600">Submitted:</div>
                  <div className="flex-1">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-400 rounded-full"
                        style={{ width: `${(versions.filter(v => v.workflow_status === 'submitted').length / Math.max(versions.length, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium">{versions.filter(v => v.workflow_status === 'submitted').length}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 text-sm text-slate-600">Approved:</div>
                  <div className="flex-1">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-400 rounded-full"
                        style={{ width: `${(versions.filter(v => v.workflow_status === 'approved').length / Math.max(versions.length, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium">{versions.filter(v => v.workflow_status === 'approved').length}</div>
                </div>
              </div>
            </div>
          </div>
        </ContentCard>
      )}

      {/* ============================ */}
      {/* Modals */}
      {/* ============================ */}

      {/* Create Version Modal */}
      <Modal
        open={modals.createVersion}
        onClose={() => closeModal('createVersion')}
        title="Create Forecast Version"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <GitBranch className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">New Version for FY {forecast.fiscal_year}</p>
                <p className="text-xs text-blue-700 mt-1">
                  Create a new version for scenario planning and forecasting
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Version Number"
              type="number"
              min="1"
              value={versionForm.versionNo}
              onChange={(e) => setVersionForm(f => ({ ...f, versionNo: parseInt(e.target.value) || 1 }))}
              required
              helperText="Unique version number within this forecast"
            />

            <Select
              label="Scenario Key (Optional)"
              value={versionForm.scenarioKey || ''}
              onChange={(e) => setVersionForm(f => ({ ...f, scenarioKey: e.target.value || null }))}
              options={[
                { label: 'No Scenario', value: '' },
                { label: 'Base Case', value: 'base' },
                { label: 'Optimistic', value: 'optimistic' },
                { label: 'Pessimistic', value: 'pessimistic' },
                { label: 'Best Case', value: 'best_case' },
                { label: 'Worst Case', value: 'worst_case' },
                { label: 'Conservative', value: 'conservative' },
                { label: 'Aggressive', value: 'aggressive' }
              ]}
            />
          </div>

          <Input
            label="Version Name (Optional)"
            value={versionForm.name}
            onChange={(e) => setVersionForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g., Base Forecast, Optimistic Scenario"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Initial Status"
              value={versionForm.status}
              onChange={(e) => setVersionForm(f => ({ ...f, status: e.target.value }))}
              options={[
                { label: 'Draft', value: 'draft' },
                { label: 'Active', value: 'active' },
                { label: 'Archived', value: 'archived' }
              ]}
            />

            <Input
              label="Probability Weight"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={versionForm.probabilityWeight}
              onChange={(e) => setVersionForm(f => ({ ...f, probabilityWeight: parseFloat(e.target.value) || 0 }))}
              helperText="0-1 scale for weighted forecasts"
            />
          </div>

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
        title="Edit Forecast Version"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Edit className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Edit Version {editingVersion?.version_no || editingVersion?.versionNo}</p>
                <p className="text-xs text-blue-700 mt-1">
                  Update version details, scenario, or management dimensions
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Version Number"
              type="number"
              min="1"
              value={versionForm.versionNo}
              onChange={(e) => setVersionForm(f => ({ ...f, versionNo: parseInt(e.target.value) || 1 }))}
              required
              helperText="Unique version number within this forecast"
            />

            <Select
              label="Scenario Key"
              value={versionForm.scenarioKey || ''}
              onChange={(e) => setVersionForm(f => ({ ...f, scenarioKey: e.target.value || null }))}
              options={[
                { label: 'None', value: '' },
                { label: 'Base Case', value: 'base' },
                { label: 'Optimistic', value: 'optimistic' },
                { label: 'Pessimistic', value: 'pessimistic' },
                { label: 'Best Case', value: 'best_case' },
                { label: 'Worst Case', value: 'worst_case' },
                { label: 'Conservative', value: 'conservative' },
                { label: 'Aggressive', value: 'aggressive' }
              ]}
            />
          </div>

          <Input
            label="Version Name"
            value={versionForm.name}
            onChange={(e) => setVersionForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g., Base Forecast, Optimistic Scenario"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Status"
              value={versionForm.status}
              onChange={(e) => setVersionForm(f => ({ ...f, status: e.target.value }))}
              options={[
                { label: 'Draft', value: 'draft' },
                { label: 'Active', value: 'active' },
                { label: 'Archived', value: 'archived' }
              ]}
            />

            <Input
              label="Probability Weight"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={versionForm.probabilityWeight}
              onChange={(e) => setVersionForm(f => ({ ...f, probabilityWeight: parseFloat(e.target.value) || 0 }))}
              helperText="0-1 scale for weighted forecasts"
            />
          </div>

          {/* Status Change Warning */}
          {editingVersion?.status === 'finalized' && versionForm.status !== 'finalized' && (
            <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Changing a finalized version back to draft will allow edits but may affect reporting.
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
                    scenarioKey: versionForm.scenarioKey,
                    probabilityWeight: versionForm.probabilityWeight,
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

      {/* Copy Version Modal */}
      <Modal
        open={modals.copyVersion}
        onClose={() => {
          closeModal('copyVersion');
          resetCopyForm();
        }}
        title="Copy Forecast Version"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Copy className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Copy Version to New Scenario</p>
                <p className="text-xs text-blue-700 mt-1">
                  Create a new version based on an existing one
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="New Version Number"
              type="number"
              min="1"
              value={copyForm.newVersionNo}
              onChange={(e) => setCopyForm(f => ({ ...f, newVersionNo: parseInt(e.target.value) || 1 }))}
              required
            />

            <Select
              label="Scenario Key"
              value={copyForm.scenarioKey || ''}
              onChange={(e) => setCopyForm(f => ({ ...f, scenarioKey: e.target.value || null }))}
              options={[
                { label: 'Same as Source', value: '' },
                { label: 'Base Case', value: 'base' },
                { label: 'Optimistic', value: 'optimistic' },
                { label: 'Pessimistic', value: 'pessimistic' },
                { label: 'Best Case', value: 'best_case' },
                { label: 'Worst Case', value: 'worst_case' }
              ]}
            />
          </div>

          <Input
            label="New Version Name"
            value={copyForm.name}
            onChange={(e) => setCopyForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g., Optimistic Scenario v2"
          />

          <Input
            label="Probability Weight"
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={copyForm.probabilityWeight}
            onChange={(e) => setCopyForm(f => ({ ...f, probabilityWeight: parseFloat(e.target.value) || 0 }))}
            helperText="0-1 scale for weighted forecasts"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              closeModal('copyVersion');
              resetCopyForm();
            }}
            disabled={copyVersionMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => copyVersionMutation.mutate(copyForm.baseVersionId)}
            loading={copyVersionMutation.isPending}
            disabled={!copyForm.baseVersionId}
            leftIcon={Copy}
          >
            Copy Version
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
        title="Add Forecast Lines"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <ListPlus className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Add or update forecast lines</p>
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
                        { label: periods.length === 0 ? `No periods for FY ${forecast.fiscal_year}` : 'Select Period', value: '' },
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
              leftIcon={Plus}
              className="w-full"
            >
              Add Another Line
            </Button>
          )}

          {periods.length === 0 && (
            <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                No open periods found for fiscal year {forecast.fiscal_year}. 
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
            leftIcon={ListPlus}
          >
            Add Lines
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
        title="Import Forecast Lines (CSV)"
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
            leftIcon={Upload}
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
            leftIcon={ThumbsDown}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Reject Version
          </Button>
        </div>
      </Modal>
    </div>
  );
}