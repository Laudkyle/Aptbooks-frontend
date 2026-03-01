import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Percent,
  Plus,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  FileText,
  Info,
  MoreVertical,
  PlayCircle,
  Archive,
  Edit,
  Copy,
  Trash2,
  Calendar,
  DollarSign,
  Layers,
  Target,
  Split,
  Calculator,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Save,
  Download,
  Upload,
  Filter,
  Search,
  ListTodo,
  Hash,
  Tag,
  Users,
  Briefcase,
  BarChart3,
  PieChart,
  TrendingUp,
  ChevronDown,
  PlusCircle,
  X
} from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makePlanningApi } from '../api/planning.api.js';
import { makeCoaApi } from '../../accounting/chartOfAccounts/api/coa.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { JsonEditor } from '../../../shared/components/data/JsonEditor.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../shared/components/ui/DropdownMenu.jsx';
import { ROUTES } from '../../../app/constants/routes.js';
import { generateUUID } from "../../../shared/utils/generateUUID.js";

/**
 * Helper function to safely extract rows from various API response formats
 */
function extractRows(data) {
  if (!data) return [];
  
  if (data.data && Array.isArray(data.data.data)) {
    return data.data.data;
  }
  
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  
  if (data.data && typeof data.data === 'object') {
    const nestedData = data.data;
    if (Array.isArray(nestedData.records)) return nestedData.records;
    if (Array.isArray(nestedData.results)) return nestedData.results;
    if (Array.isArray(nestedData.list)) return nestedData.list;
  }
  
  return [];
}

// Format currency helper
const formatCurrency = (amount, currency = 'USD') => {
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

// Status configuration (matches backend: active, inactive, archived)
const getStatusConfig = (status) => {
  const normalized = (status || 'active').toLowerCase();
  const config = {
    active: { tone: 'success', label: 'Active', icon: PlayCircle },
    inactive: { tone: 'muted', label: 'Inactive', icon: EyeOff },
    archived: { tone: 'warning', label: 'Archived', icon: Archive }
  };
  return config[normalized] || config.active;
};

// Unit options for allocation bases
const UNIT_OPTIONS = [
  { label: 'Hours', value: 'hours' },
  { label: 'Headcount', value: 'headcount' },
  { label: 'Square Footage', value: 'sqft' },
  { label: 'Revenue', value: 'revenue' },
  { label: 'Units', value: 'units' },
  { label: 'Percentage', value: 'percentage' },
  { label: 'Custom', value: 'custom' }
];

// Dimension options - value goes to targetDimension (database), dimensionKey goes to dimensionJson (backend validation)
const DIMENSION_OPTIONS = [
  { 
    label: 'Cost Center', 
    value: 'cost_center', // For database constraint
    dimensionKey: 'costCenterId' // For backend validation
  },
  { 
    label: 'Profit Center', 
    value: 'profit_center',
    dimensionKey: 'profitCenterId'
  },
  { 
    label: 'Investment Center', 
    value: 'investment_center',
    dimensionKey: 'investmentCenterId'
  },
  { 
    label: 'Project', 
    value: 'project',
    dimensionKey: 'projectId'
  },
  { 
    label: 'Custom', 
    value: 'custom',
    dimensionKey: 'customId'
  }
];

export default function Allocations() {
  const { http } = useApi();
  const api = useMemo(() => makePlanningApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  // UI State
  const [tab, setTab] = useState('bases');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });

  // Modal States
  const [modals, setModals] = useState({
    createRule: false,
    editRule: false,
    createBase: false,
    editBase: false,
    addTarget: false,
    archiveConfirm: false,
    activateConfirm: false,
    deleteConfirm: false,
    postConfirm: false
  });

  // Form States
  const [ruleForm, setRuleForm] = useState({
    code: '',
    name: '',
    baseId: '',
    sourceAccountId: '',
    targetDimension: 'cost_center', // For database constraint
    dimensionKey: 'costCenterId', // For dimensionJson validation
    status: 'active',
    payloadJson: { targets: [] }
  });

  const [baseForm, setBaseForm] = useState({
    code: '',
    name: '',
    status: 'active',
    payloadJson: { unit: 'hours' } // Default unit
  });

  // Target entry form for dynamic adding
  const [targetForm, setTargetForm] = useState({
    toAccountId: '',
    weight: '',
    notes: '',
    centerId: '', // The actual center ID that will go into dimensionJson
    dimensionJson: {} // For additional dimensions
  });

  const [selectedRule, setSelectedRule] = useState(null);
  const [selectedBase, setSelectedBase] = useState(null);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [editingTargetIndex, setEditingTargetIndex] = useState(null);

  // Compute/Preview State
  const [previewState, setPreviewState] = useState({
    periodId: '',
    ruleIds: [],
    loading: false,
    result: null
  });

  const [computeState, setComputeState] = useState({
    periodId: '',
    ruleIds: [],
    memo: '',
    replace: true,
    loading: false,
    result: null
  });

  const [postState, setPostState] = useState({
    allocationId: null,
    entryDate: new Date().toISOString().split('T')[0],
    memo: '',
    loading: false
  });

  const [formErrors, setFormErrors] = useState({});
  const [showRuleInfo, setShowRuleInfo] = useState(false);
  const [showBaseInfo, setShowBaseInfo] = useState(false);

  // ============================
  // Data Fetching
  // ============================

  // Fetch Bases
  const { 
    data: basesData, 
    isLoading: basesLoading, 
    error: basesError,
    refetch: refetchBases 
  } = useQuery({
    queryKey: ['allocations', 'bases'],
    queryFn: () => api.allocations.bases.list(),
    staleTime: 30000,
    retry: 2
  });

  const bases = useMemo(() => extractRows(basesData), [basesData]);
  const baseOptions = useMemo(() => {
    return [
      { label: 'Select allocation base', value: '' },
      ...bases.map(base => ({
        label: `${base.code} - ${base.name} (${base.payloadJson?.unit || 'hours'})`,
        value: base.id
      }))
    ];
  }, [bases]);

  // Fetch Rules
  const { 
    data: rulesData, 
    isLoading: rulesLoading, 
    error: rulesError,
    refetch: refetchRules 
  } = useQuery({
    queryKey: ['allocations', 'rules'],
    queryFn: () => api.allocations.rules.list(),
    staleTime: 30000,
    retry: 2
  });

  const rules = useMemo(() => extractRows(rulesData), [rulesData]);

  // Fetch Accounts for dropdowns
  const { data: accountsData } = useQuery({
    queryKey: ['accounts', 'active'],
    queryFn: () => coaApi.list({ status: 'active', limit: 1000 }),
    staleTime: 60000
  });

  const accounts = useMemo(() => extractRows(accountsData), [accountsData]);
  const accountOptions = useMemo(() => {
    return [
      { label: 'Select account', value: '' },
      ...accounts.map(acc => ({
        label: `${acc.code} - ${acc.name}`,
        value: acc.id
      }))
    ];
  }, [accounts]);

  // Fetch Centers for target center dropdown
  const { data: centersData } = useQuery({
    queryKey: ['centers', 'all'],
    queryFn: () => api.centers.getAll({ status: 'active' }),
    staleTime: 60000
  });

  const centers = useMemo(() => extractRows(centersData), [centersData]);
  
  // Group centers by type for better UX
  const centerOptions = useMemo(() => {
    const options = [{ label: 'Select target center', value: '' }];
    
    // Group by center type
    const byType = {
      cost: [],
      profit: [],
      investment: []
    };
    
    centers.forEach(center => {
      if (center.centerType === 'cost') {
        byType.cost.push({ label: `${center.code} - ${center.name}`, value: center.id });
      } else if (center.centerType === 'profit') {
        byType.profit.push({ label: `${center.code} - ${center.name}`, value: center.id });
      } else if (center.centerType === 'investment') {
        byType.investment.push({ label: `${center.code} - ${center.name}`, value: center.id });
      }
    });
    
    // Add grouped options
    if (byType.cost.length > 0) {
      options.push({ label: '--- Cost Centers ---', value: '', disabled: true });
      options.push(...byType.cost);
    }
    if (byType.profit.length > 0) {
      options.push({ label: '--- Profit Centers ---', value: '', disabled: true });
      options.push(...byType.profit);
    }
    if (byType.investment.length > 0) {
      options.push({ label: '--- Investment Centers ---', value: '', disabled: true });
      options.push(...byType.investment);
    }
    
    return options;
  }, [centers]);

  // Fetch Periods for dropdown
  const { data: periodsData } = useQuery({
    queryKey: ['periods', 'open'],
    queryFn: () => api.periods.list({ status: 'open', limit: 100 }),
    staleTime: 60000
  });

  const periods = useMemo(() => extractRows(periodsData), [periodsData]);
  
  const periodOptions = useMemo(() => {
    return [
      { label: 'Select period', value: '' },
      ...periods.map(period => ({
        label: `${period.name} (${period.start_date} to ${period.end_date})`,
        value: period.id
      }))
    ];
  }, [periods]);

  // ============================
  // Mutations - Rules
  // ============================

  const createRuleMutation = useMutation({
    mutationFn: async () => {
      if (!validateRuleForm()) {
        throw new Error('Please fix validation errors');
      }
      
      const idempotencyKey = generateUUID();
      const payload = {
        code: ruleForm.code.trim().toUpperCase(),
        name: ruleForm.name.trim(),
        baseId: ruleForm.baseId,
        sourceAccountId: ruleForm.sourceAccountId,
        targetDimension: ruleForm.targetDimension, // This is 'cost_center', 'profit_center', etc.
        status: ruleForm.status,
        payloadJson: ruleForm.payloadJson // Contains targets with dimensionJson using dimensionKey
      };
      
      console.log('📤 Sending payload:', JSON.stringify(payload, null, 2));
      
      return api.allocations.rules.create(payload, { idempotencyKey });
    },
    onSuccess: (data) => {
      toast.success('Allocation rule created successfully');
      closeModal('createRule');
      resetRuleForm();
      refetchRules();
    },
    onError: (err) => {
      console.error('❌ Full error:', err);
      console.error('❌ Error response:', err?.response);
      console.error('❌ Error data:', err?.response?.data);
      
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to create rule';
      toast.error(message);
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRule) throw new Error('No rule selected');
      if (!validateRuleForm()) {
        throw new Error('Please fix validation errors');
      }
      
      const idempotencyKey = generateUUID();
      const payload = {
        code: ruleForm.code.trim().toUpperCase(),
        name: ruleForm.name.trim(),
        baseId: ruleForm.baseId,
        sourceAccountId: ruleForm.sourceAccountId,
        targetDimension: ruleForm.targetDimension,
        status: ruleForm.status,
        payloadJson: ruleForm.payloadJson
      };
      
      return api.allocations.rules.update(selectedRule.id, payload, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Allocation rule updated successfully');
      closeModal('editRule');
      resetRuleForm();
      setSelectedRule(null);
      refetchRules();
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to update rule';
      toast.error(message);
    }
  });

  const archiveRuleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRule) throw new Error('No rule selected');
      const idempotencyKey = generateUUID();
      return api.allocations.rules.update(selectedRule.id, 
        { status: 'archived' }, 
        { idempotencyKey }
      );
    },
    onSuccess: () => {
      toast.success('Rule archived successfully');
      closeActionModal();
      refetchRules();
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to archive rule';
      toast.error(message);
    }
  });

  const activateRuleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRule) throw new Error('No rule selected');
      const idempotencyKey = generateUUID();
      return api.allocations.rules.update(selectedRule.id, 
        { status: 'active' }, 
        { idempotencyKey }
      );
    },
    onSuccess: () => {
      toast.success('Rule activated successfully');
      closeActionModal();
      refetchRules();
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to activate rule';
      toast.error(message);
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRule) throw new Error('No rule selected');
      const idempotencyKey = generateUUID();
      return api.allocations.rules.delete(selectedRule.id, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Rule deleted successfully');
      closeActionModal();
      refetchRules();
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to delete rule';
      toast.error(message);
    }
  });

  // ============================
  // Mutations - Bases
  // ============================

  const createBaseMutation = useMutation({
    mutationFn: async () => {
      if (!validateBaseForm()) {
        throw new Error('Please fix validation errors');
      }
      
      const idempotencyKey = generateUUID();
      const payload = {
        code: baseForm.code.trim().toUpperCase(),
        name: baseForm.name.trim(),
        status: baseForm.status,
        payloadJson: baseForm.payloadJson // Contains { unit: 'hours' } etc.
      };
      
      return api.allocations.bases.create(payload, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Allocation base created successfully');
      closeModal('createBase');
      resetBaseForm();
      refetchBases();
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to create base';
      toast.error(message);
    }
  });

  const updateBaseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBase) throw new Error('No base selected');
      if (!validateBaseForm()) {
        throw new Error('Please fix validation errors');
      }
      
      const idempotencyKey = generateUUID();
      const payload = {
        code: baseForm.code.trim().toUpperCase(),
        name: baseForm.name.trim(),
        status: baseForm.status,
        payloadJson: baseForm.payloadJson
      };
      
      return api.allocations.bases.update(selectedBase.id, payload, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Allocation base updated successfully');
      closeModal('editBase');
      resetBaseForm();
      setSelectedBase(null);
      refetchBases();
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to update base';
      toast.error(message);
    }
  });

  // ============================
  // Compute/Post Mutations
  // ============================

  const computeMutation = useMutation({
    mutationFn: async () => {
      if (!computeState.periodId) throw new Error('Period is required');
      
      const ruleIds = computeState.ruleIds.length > 0 
        ? computeState.ruleIds 
        : rules.filter(r => r.status === 'active').map(r => r.id).slice(0, 10);
      
      if (ruleIds.length === 0) throw new Error('No active rules to compute');
      
      return api.allocations.compute({
        periodId: computeState.periodId,
        ruleIds,
        memo: computeState.memo || null,
        replace: computeState.replace
      });
    },
    onSuccess: (data) => {
      toast.success(`Computed ${data.length} allocations successfully`);
      setComputeState(prev => ({ ...prev, result: data, loading: false }));
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to compute allocations';
      toast.error(message);
      setComputeState(prev => ({ ...prev, loading: false }));
    }
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!previewState.periodId) throw new Error('Period is required');
      
      const ruleIds = previewState.ruleIds.length > 0 
        ? previewState.ruleIds 
        : rules.filter(r => r.status === 'active').map(r => r.id).slice(0, 5);
      
      if (ruleIds.length === 0) throw new Error('No active rules to preview');
      
      return api.allocations.preview({
        periodId: previewState.periodId,
        ruleIds
      });
    },
    onSuccess: (data) => {
      toast.success('Preview generated successfully');
      setPreviewState(prev => ({ ...prev, result: data, loading: false }));
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to generate preview';
      toast.error(message);
      setPreviewState(prev => ({ ...prev, loading: false }));
    }
  });

  const postAllocationMutation = useMutation({
    mutationFn: async () => {
      if (!postState.allocationId) throw new Error('No allocation selected');
      if (!postState.entryDate) throw new Error('Entry date is required');
      
      return api.allocations.post({
        allocationId: postState.allocationId,
        entryDate: postState.entryDate,
        memo: postState.memo || null
      });
    },
    onSuccess: (data) => {
      toast.success(data.journalEntryId 
        ? `Allocation posted with journal entry ${data.journalEntryId}`
        : 'Allocation posted successfully (zero amount)'
      );
      setModals(prev => ({ ...prev, postConfirm: false }));
      setPostState({
        allocationId: null,
        entryDate: new Date().toISOString().split('T')[0],
        memo: '',
        loading: false
      });
      // Refresh rules to show updated status
      refetchRules();
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? 'Failed to post allocation';
      toast.error(message);
      setPostState(prev => ({ ...prev, loading: false }));
    }
  });

  // ============================
  // Target Management Functions
  // ============================

  const addTarget = () => {
    if (!targetForm.toAccountId || !targetForm.weight || !targetForm.centerId) {
      toast.error('Account, weight, and center are required');
      return;
    }

    const weight = parseFloat(targetForm.weight);
    if (isNaN(weight) || weight <= 0) {
      toast.error('Weight must be a positive number');
      return;
    }

    // Create dimensionJson with the camelCase dimension key (e.g., 'costCenterId')
    const dimensionJson = {
      ...targetForm.dimensionJson,
      [ruleForm.dimensionKey]: targetForm.centerId // Use dimensionKey for JSON keys
    };

    console.log('📦 Creating dimensionJson with key:', ruleForm.dimensionKey);
    console.log('📦 dimensionJson:', dimensionJson);

    const newTarget = {
      toAccountId: targetForm.toAccountId,
      weight,
      notes: targetForm.notes || null,
      dimensionJson
    };

    const updatedTargets = [...(ruleForm.payloadJson.targets || [])];
    
    if (editingTargetIndex !== null) {
      updatedTargets[editingTargetIndex] = newTarget;
      setEditingTargetIndex(null);
    } else {
      updatedTargets.push(newTarget);
    }

    setRuleForm({
      ...ruleForm,
      payloadJson: {
        ...ruleForm.payloadJson,
        targets: updatedTargets
      }
    });

    // Reset target form
    setTargetForm({
      toAccountId: '',
      weight: '',
      notes: '',
      centerId: '',
      dimensionJson: {}
    });

    setModals(prev => ({ ...prev, addTarget: false }));
  };

  const editTarget = (index) => {
    const target = ruleForm.payloadJson.targets[index];
    // Extract the center ID from dimensionJson using dimensionKey
    const centerId = target.dimensionJson?.[ruleForm.dimensionKey] || '';
    
    // Create a copy of dimensionJson without the main dimension
    const dimensionJson = { ...target.dimensionJson };
    delete dimensionJson[ruleForm.dimensionKey];
    
    setTargetForm({
      toAccountId: target.toAccountId,
      weight: target.weight.toString(),
      notes: target.notes || '',
      centerId: centerId,
      dimensionJson: dimensionJson
    });
    setEditingTargetIndex(index);
    setModals(prev => ({ ...prev, addTarget: true }));
  };

  const removeTarget = (index) => {
    const updatedTargets = [...ruleForm.payloadJson.targets];
    updatedTargets.splice(index, 1);
    setRuleForm({
      ...ruleForm,
      payloadJson: {
        ...ruleForm.payloadJson,
        targets: updatedTargets
      }
    });
  };

  // ============================
  // Utility Functions
  // ============================

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

  // Form Validation
  const validateRuleForm = useCallback(() => {
    const errors = {};

    if (!ruleForm.code.trim()) {
      errors.code = 'Rule code is required';
    } else if (ruleForm.code.trim().length < 2) {
      errors.code = 'Rule code must be at least 2 characters';
    }

    if (!ruleForm.name.trim()) {
      errors.name = 'Rule name is required';
    } else if (ruleForm.name.trim().length < 2) {
      errors.name = 'Rule name must be at least 2 characters';
    }

    if (!ruleForm.baseId) {
      errors.baseId = 'Allocation base is required';
    }

    if (!ruleForm.sourceAccountId) {
      errors.sourceAccountId = 'Source account is required';
    }

    if (!ruleForm.targetDimension) {
      errors.targetDimension = 'Target dimension type is required';
    }

    const targets = ruleForm.payloadJson?.targets || [];
    if (targets.length === 0) {
      errors.targets = 'At least one target is required';
    } else {
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        if (!t.toAccountId) {
          errors[`target_${i}`] = `Target ${i + 1}: Account is required`;
          break;
        }
        if (!t.weight || t.weight <= 0) {
          errors[`target_${i}`] = `Target ${i + 1}: Weight must be > 0`;
          break;
        }
        // Check that the dimensionJson contains the dimensionKey (camelCase)
        if (!t.dimensionJson?.[ruleForm.dimensionKey]) {
          errors[`target_${i}`] = `Target ${i + 1}: Center ID is required`;
          break;
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [ruleForm]);

  const validateBaseForm = useCallback(() => {
    const errors = {};

    if (!baseForm.code.trim()) {
      errors.code = 'Base code is required';
    } else if (baseForm.code.trim().length < 2) {
      errors.code = 'Base code must be at least 2 characters';
    }

    if (!baseForm.name.trim()) {
      errors.name = 'Base name is required';
    } else if (baseForm.name.trim().length < 2) {
      errors.name = 'Base name must be at least 2 characters';
    }

    // Validate unit is present in payloadJson
    if (!baseForm.payloadJson?.unit) {
      errors.unit = 'Unit is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [baseForm]);

  // Modal handlers
  const openModal = (modalName, item = null) => {
    if (modalName === 'editRule' && item) {
      setSelectedRule(item);
      const targetDim = item.targetDimension || item.target_dimension || 'cost_center';
      const selectedOption = DIMENSION_OPTIONS.find(opt => opt.value === targetDim);
      
      setRuleForm({
        code: item.code || '',
        name: item.name || '',
        baseId: item.baseId || item.allocation_base_id || '',
        sourceAccountId: item.sourceAccountId || item.source_account_id || '',
        targetDimension: targetDim,
        dimensionKey: selectedOption?.dimensionKey || 'costCenterId',
        status: item.status || 'active',
        payloadJson: item.payloadJson || item.payload_json || { targets: [] }
      });
    } else if (modalName === 'editBase' && item) {
      setSelectedBase(item);
      setBaseForm({
        code: item.code || '',
        name: item.name || '',
        status: item.status || 'active',
        payloadJson: item.payloadJson || item.payload_json || { unit: 'hours' }
      });
    } else if (modalName === 'createRule') {
      resetRuleForm();
    } else if (modalName === 'createBase') {
      resetBaseForm();
    } else if (modalName === 'addTarget') {
      setTargetForm({
        toAccountId: '',
        weight: '',
        notes: '',
        centerId: '',
        dimensionJson: {}
      });
      setEditingTargetIndex(null);
    }
    setModals(prev => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
    setFormErrors({});
    if (modalName === 'editRule') setSelectedRule(null);
    if (modalName === 'editBase') setSelectedBase(null);
    if (modalName === 'addTarget') {
      setTargetForm({
        toAccountId: '',
        weight: '',
        notes: '',
        centerId: '',
        dimensionJson: {}
      });
      setEditingTargetIndex(null);
    }
  };

  const openActionModal = (type, item, isRule = true) => {
    setActionType(type);
    if (isRule) {
      setSelectedRule(item);
    } else {
      setSelectedBase(item);
    }
    
    let modalName = '';
    if (type === 'archive') modalName = 'archiveConfirm';
    else if (type === 'activate') modalName = 'activateConfirm';
    else if (type === 'delete') modalName = 'deleteConfirm';
    
    setModals(prev => ({ ...prev, [modalName]: true }));
  };

  const openPostModal = (allocation) => {
    setSelectedAllocation(allocation);
    setPostState({
      allocationId: allocation.id,
      entryDate: new Date().toISOString().split('T')[0],
      memo: '',
      loading: false
    });
    setModals(prev => ({ ...prev, postConfirm: true }));
  };

  const closeActionModal = () => {
    setActionType(null);
    setSelectedRule(null);
    setSelectedBase(null);
    setSelectedAllocation(null);
    setModals(prev => ({ 
      ...prev, 
      archiveConfirm: false, 
      activateConfirm: false,
      deleteConfirm: false,
      postConfirm: false
    }));
  };

  const resetRuleForm = () => {
    setRuleForm({
      code: '',
      name: '',
      baseId: '',
      sourceAccountId: '',
      targetDimension: 'cost_center',
      dimensionKey: 'costCenterId',
      status: 'active',
      payloadJson: { targets: [] }
    });
    setFormErrors({});
  };

  const resetBaseForm = () => {
    setBaseForm({
      code: '',
      name: '',
      status: 'active',
      payloadJson: { unit: 'hours' }
    });
    setFormErrors({});
  };

  const handleRefresh = useCallback(() => {
    refetchBases();
    refetchRules();
    toast.success('Data refreshed');
  }, [refetchBases, refetchRules, toast]);

  const runPreview = useCallback(() => {
    setPreviewState(prev => ({ ...prev, loading: true }));
    previewMutation.mutate();
  }, [previewMutation]);

  const runCompute = useCallback(() => {
    setComputeState(prev => ({ ...prev, loading: true }));
    computeMutation.mutate();
  }, [computeMutation]);

  const handleSubmitRule = () => {
    console.log('📝 Current ruleForm state:', ruleForm);
    console.log('📝 targetDimension value:', ruleForm.targetDimension);
    console.log('📝 dimensionKey value:', ruleForm.dimensionKey);
    console.log('📝 payloadJson.targets:', ruleForm.payloadJson.targets);
    
    if (modals.editRule) {
      updateRuleMutation.mutate();
    } else {
      createRuleMutation.mutate();
    }
  };

  // Filter rules
  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      if (filters.status && rule.status !== filters.status) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          (rule.name?.toLowerCase().includes(searchLower)) ||
          (rule.code?.toLowerCase().includes(searchLower))
        );
      }
      return true;
    });
  }, [rules, filters]);

  // Filter bases
  const filteredBases = useMemo(() => {
    return bases.filter(base => {
      if (filters.status && base.status !== filters.status) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          (base.name?.toLowerCase().includes(searchLower)) ||
          (base.code?.toLowerCase().includes(searchLower))
        );
      }
      return true;
    });
  }, [bases, filters]);

  // Table columns for Bases
  const baseColumns = useMemo(() => [
    {
      header: 'Code',
      accessor: 'code',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-slate-400" />
          <span className="font-mono font-medium">{row.code}</span>
        </div>
      )
    },
    {
      header: 'Name',
      accessor: 'name',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-slate-400" />
          <span>{row.name}</span>
        </div>
      )
    },
    {
      header: 'Unit',
      accessor: 'payloadJson.unit',
      render: (row) => (
        <Badge tone="info" size="sm">
          {row.payloadJson?.unit || 'hours'}
        </Badge>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const config = getStatusConfig(row.status);
        return <Badge tone={config.tone}>{config.label}</Badge>;
      }
    },
    {
      header: 'Created',
      accessor: 'created_at',
      render: (row) => (
        <div className="flex items-center gap-1 text-xs text-slate-600">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          {formatDate(row.created_at)}
        </div>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openModal('editBase', row)}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit Base</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(row, null, 2));
              toast.success('Copied to clipboard');
            }}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy JSON</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ], [toast]);

  // Table columns for Rules
  const ruleColumns = useMemo(() => [
    {
      header: 'Code',
      accessor: 'code',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-slate-400" />
          <span className="font-mono font-medium">{row.code}</span>
        </div>
      )
    },
    {
      header: 'Name',
      accessor: 'name',
      render: (row) => {
        const config = getStatusConfig(row.status);
        return (
          <div className="flex items-center gap-2">
            <Split className="h-4 w-4 text-slate-400" />
            <div>
              <span className="font-medium">{row.name}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Base',
      render: (row) => {
        const base = bases.find(b => b.id === (row.baseId || row.allocation_base_id));
        return base ? (
          <div className="flex items-center gap-1 text-sm">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <span>{base.code}</span>
            <span className="text-xs text-slate-400">({base.payloadJson?.unit})</span>
          </div>
        ) : (
          <span className="text-sm text-slate-500">—</span>
        );
      }
    },
    {
      header: 'Source Account',
      render: (row) => {
        const account = accounts.find(a => a.id === (row.sourceAccountId || row.source_account_id));
        return account ? (
          <div className="flex items-center gap-1 text-sm">
            <DollarSign className="h-3.5 w-3.5 text-slate-400" />
            <span>{account.code}</span>
          </div>
        ) : (
          <span className="text-sm text-slate-500">—</span>
        );
      }
    },
    {
      header: 'Target Dimension',
      render: (row) => {
        const dimension = row.targetDimension || row.target_dimension;
        const option = DIMENSION_OPTIONS.find(opt => opt.value === dimension);
        return dimension ? (
          <div className="flex flex-col">
            <Badge tone="info" size="sm">
              {option?.label || dimension}
            </Badge>
            <span className="text-xs text-slate-400 mt-1">Key: {option?.dimensionKey || 'costCenterId'}</span>
          </div>
        ) : (
          <Badge tone="muted" size="sm">—</Badge>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const config = getStatusConfig(row.status);
        return <Badge tone={config.tone}>{config.label}</Badge>;
      }
    },
    {
      header: 'Targets',
      render: (row) => {
        const count = row.payloadJson?.targets?.length || 0;
        return <Badge tone={count > 0 ? 'info' : 'muted'}>{count}</Badge>;
      }
    },
    {
      header: 'Actions',
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openModal('editRule', row)}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit Rule</span>
            </DropdownMenuItem>
            
            {row.status === 'active' && (
              <DropdownMenuItem onClick={() => openActionModal('archive', row, true)}>
                <Archive className="mr-2 h-4 w-4 text-amber-600" />
                <span>Archive Rule</span>
              </DropdownMenuItem>
            )}
            
            {row.status === 'inactive' && (
              <DropdownMenuItem onClick={() => openActionModal('activate', row, true)}>
                <PlayCircle className="mr-2 h-4 w-4 text-green-600" />
                <span>Activate Rule</span>
              </DropdownMenuItem>
            )}
            
            {row.status === 'archived' && (
              <DropdownMenuItem onClick={() => openActionModal('delete', row, true)}>
                <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                <span>Delete Rule</span>
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(row, null, 2));
              toast.success('Copied to clipboard');
            }}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy JSON</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ], [bases, accounts, centers, toast]);

  // ============================
  // Loading & Error States
  // ============================

  if (basesLoading && rulesLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Allocations"
          subtitle="Define allocation bases and rules, preview computed allocations, then post to journals."
          icon={Percent}
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-500">Loading allocations...</div>
          </div>
        </ContentCard>
      </div>
    );
  }

  if (basesError || rulesError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Allocations"
          subtitle="Define allocation bases and rules, preview computed allocations, then post to journals."
          icon={Percent}
          actions={
            <Button variant="outline" leftIcon={RefreshCw} onClick={handleRefresh}>
              Retry
            </Button>
          }
        />
        <ContentCard>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-lg font-medium text-slate-900">Failed to load allocations</div>
            <div className="text-slate-500">{basesError?.message || rulesError?.message}</div>
            <Button onClick={handleRefresh} className="mt-2">Try Again</Button>
          </div>
        </ContentCard>
      </div>
    );
  }

  // ============================
  // Main Render
  // ============================

  return (
    <div className="min-h-screen bg-gray-50 space-y-6">
      {/* Header */}
      <PageHeader
        title="Allocations"
        subtitle="Define allocation bases and rules, preview computed allocations, then post to journals."
        icon={Percent}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={RefreshCw}
              onClick={handleRefresh}
              loading={basesLoading || rulesLoading}
            >
              Refresh
            </Button>
            <Button
              leftIcon={Plus}
              onClick={() => openModal('createRule')}
            >
              New Rule
            </Button>
          </div>
        }
      />

      {/* Main Content */}
      <ContentCard>
        {/* Tabs */}
        <div className="mb-6">
          <Tabs
            value={tab}
            onValueChange={setTab}
            items={[
              { value: 'bases', label: 'Allocation Bases' },
              { value: 'rules', label: 'Allocation Rules' },
              { value: 'compute', label: 'Compute & Preview' }
            ]}
          />
        </div>

        {/* Filters (for bases/rules tabs) */}
        {(tab === 'bases' || tab === 'rules') && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={Filter}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filter
              </Button>
              <Select
                size="sm"
                value={filters.status}
                onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                options={[
                  { label: 'All Statuses', value: '' },
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' },
                  { label: 'Archived', value: 'archived' }
                ]}
                className="w-40"
              />
            </div>
            <div className="text-sm text-slate-500">
              {tab === 'bases' ? filteredBases.length : filteredRules.length} items
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (tab === 'bases' || tab === 'rules') && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-700">Search</span>
              <button
                onClick={() => setFilters({ status: '', search: '' })}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Clear all
              </button>
            </div>
            <Input
              size="sm"
              placeholder="Search by code or name..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              leftIcon={Search}
            />
          </div>
        )}

        {/* Tab Content */}
        {tab === 'bases' && (
          <div>
            <DataTable
              columns={baseColumns}
              rows={filteredBases}
              isLoading={basesLoading}
              empty={{
                title: 'No allocation bases',
                description: 'Create your first allocation base to define allocation factors.',
                action: (
                  <Button
                    leftIcon={Plus}
                    onClick={() => openModal('createBase')}
                    size="sm"
                  >
                    Create Base
                  </Button>
                )
              }}
            />
          </div>
        )}

        {tab === 'rules' && (
          <div>
            <DataTable
              columns={ruleColumns}
              rows={filteredRules}
              isLoading={rulesLoading}
              empty={{
                title: 'No allocation rules',
                description: 'Create your first allocation rule to define how costs are allocated.',
                action: (
                  <Button
                    leftIcon={Plus}
                    onClick={() => openModal('createRule')}
                    size="sm"
                  >
                    Create Rule
                  </Button>
                )
              }}
            />
          </div>
        )}

        {tab === 'compute' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Preview Panel */}
            <div className="border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-semibold text-slate-900">Preview Allocation</h3>
              </div>
              
              <div className="space-y-4">
                <Select
                  label="Period"
                  value={previewState.periodId}
                  onChange={(e) => setPreviewState(prev => ({ ...prev, periodId: e.target.value }))}
                  options={periodOptions}
                  required
                />

                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800">
                      Preview will run against the first 5 active rules. This shows you 
                      what journal entries would be generated without posting them.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={runPreview}
                  disabled={!previewState.periodId || previewMutation.isPending}
                  loading={previewMutation.isPending}
                  leftIcon={Eye}
                  className="w-full"
                >
                  Generate Preview
                </Button>

                {previewMutation.isSuccess && previewState.result && (
                  <div className="mt-4 space-y-4">
                    {previewState.result.map((preview, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">{preview.ruleName}</h4>
                            <p className="text-xs text-slate-500">Code: {preview.ruleCode}</p>
                          </div>
                          <Badge tone="info">Preview</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                          <div>
                            <span className="text-xs text-slate-500">Base Amount</span>
                            <div className="font-medium">{formatCurrency(preview.baseAmount)}</div>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500">Total Weight</span>
                            <div className="font-medium">{preview.totalWeight}</div>
                          </div>
                        </div>

                        <div>
                          <h5 className="text-xs font-medium text-slate-700 mb-2">Allocation Lines</h5>
                          <div className="space-y-2">
                            {preview.lines.map((line, lineIdx) => {
                              const account = accounts.find(a => a.id === line.toAccountId);
                              return (
                                <div key={lineIdx} className="flex justify-between text-sm bg-slate-50 p-2 rounded">
                                  <div>
                                    <span className="font-mono text-xs">{account?.code || line.toAccountId.substring(0, 8)}...</span>
                                    {line.notes && <span className="text-xs text-slate-500 ml-2">({line.notes})</span>}
                                  </div>
                                  <div className="flex gap-4">
                                    <span className="text-xs text-slate-500">w:{line.weight}</span>
                                    <span className="font-medium">{formatCurrency(line.amount)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Compute Panel */}
            <div className="border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-5 w-5 text-green-600" />
                <h3 className="text-base font-semibold text-slate-900">Compute Allocation</h3>
              </div>
              
              <div className="space-y-4">
                <Select
                  label="Period"
                  value={computeState.periodId}
                  onChange={(e) => setComputeState(prev => ({ ...prev, periodId: e.target.value }))}
                  options={periodOptions}
                  required
                />

                <Input
                  label="Memo (Optional)"
                  placeholder="Enter memo for journal entries"
                  value={computeState.memo}
                  onChange={(e) => setComputeState(prev => ({ ...prev, memo: e.target.value }))}
                  leftIcon={FileText}
                />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="replace"
                    checked={computeState.replace}
                    onChange={(e) => setComputeState(prev => ({ ...prev, replace: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 rounded border-slate-300"
                  />
                  <label htmlFor="replace" className="text-sm text-slate-700">
                    Replace existing allocations for this period
                  </label>
                </div>

                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">
                      This will generate actual journal entries. The operation cannot be 
                      undone automatically.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={runCompute}
                  disabled={!computeState.periodId || computeMutation.isPending}
                  loading={computeMutation.isPending}
                  leftIcon={Calculator}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Run Computation
                </Button>

                {computeMutation.isSuccess && computeState.result && (
                  <div className="mt-4 space-y-3">
                    <h4 className="text-sm font-medium">Computation Results</h4>
                    {computeState.result.map((allocation, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge tone={allocation.status === 'computed' ? 'info' : 'success'}>
                              {allocation.status}
                            </Badge>
                            {allocation.reused && (
                              <Badge tone="muted" size="sm" className="ml-2">Reused</Badge>
                            )}
                          </div>
                          {allocation.status === 'computed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={DollarSign}
                              onClick={() => openPostModal(allocation)}
                            >
                              Post
                            </Button>
                          )}
                        </div>
                        {allocation.journalEntryId && (
                          <div className="mt-2 text-xs text-slate-600">
                            Journal Entry: {allocation.journalEntryId}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </ContentCard>

      {/* ============================ */}
      {/* Modals */}
      {/* ============================ */}

      {/* Create/Edit Rule Modal */}
      <Modal
        open={modals.createRule || modals.editRule}
        onClose={() => closeModal(modals.createRule ? 'createRule' : 'editRule')}
        title={modals.editRule ? 'Edit Allocation Rule' : 'Create New Allocation Rule'}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          {/* Info Section */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowRuleInfo(!showRuleInfo)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <Info className="h-4 w-4" />
              <span>Allocation rule info</span>
              <ChevronRight className={`h-4 w-4 transition-transform ${showRuleInfo ? 'rotate-90' : ''}`} />
            </button>
            
            {showRuleInfo && (
              <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <Split className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <div className="font-medium mb-1">
                      {modals.editRule ? 'Edit allocation rule' : 'Create a new allocation rule'}
                    </div>
                    <div className="text-blue-700">
                      Rules define how amounts from source accounts are allocated to target centers
                      based on allocation bases. The target dimension type determines which dimension
                      the allocation will be applied to (e.g., cost_center for database, costCenterId for JSON).
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Input
                label="Rule Code"
                placeholder="e.g., IT-ALLOC-001"
                value={ruleForm.code}
                onChange={(e) => setRuleForm(f => ({ ...f, code: e.target.value }))}
                error={formErrors.code}
                leftIcon={Tag}
                required
                helperText="Unique code, will be normalized to uppercase"
              />
            </div>

            <div>
              <Input
                label="Rule Name"
                placeholder="e.g., IT Cost Allocation"
                value={ruleForm.name}
                onChange={(e) => setRuleForm(f => ({ ...f, name: e.target.value }))}
                error={formErrors.name}
                leftIcon={Split}
                required
              />
            </div>

            <div>
              <Select
                label="Allocation Base"
                value={ruleForm.baseId}
                onChange={(e) => setRuleForm(f => ({ ...f, baseId: e.target.value }))}
                options={baseOptions}
                error={formErrors.baseId}
                required
              />
            </div>

            <div>
              <Select
                label="Source Account"
                value={ruleForm.sourceAccountId}
                onChange={(e) => setRuleForm(f => ({ ...f, sourceAccountId: e.target.value }))}
                options={accountOptions}
                error={formErrors.sourceAccountId}
                required
              />
            </div>

            <div>
              <Select
                label="Target Dimension Type"
                value={ruleForm.targetDimension}
                onChange={(e) => {
                  const selectedOption = DIMENSION_OPTIONS.find(opt => opt.value === e.target.value);
                  setRuleForm(f => ({ 
                    ...f, 
                    targetDimension: e.target.value,
                    dimensionKey: selectedOption?.dimensionKey || 'costCenterId'
                  }));
                }}
                options={DIMENSION_OPTIONS}
                error={formErrors.targetDimension}
                required
                helperText="Select the dimension type for allocation"
              />
              {ruleForm.dimensionKey && (
                <p className="text-xs text-slate-500 mt-1">
                  JSON key: <code className="bg-slate-100 px-1 rounded">{ruleForm.dimensionKey}</code>
                </p>
              )}
            </div>

            <div>
              <Select
                label="Status"
                value={ruleForm.status}
                onChange={(e) => setRuleForm(f => ({ ...f, status: e.target.value }))}
                options={[
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' },
                  { label: 'Archived', value: 'archived' }
                ]}
              />
            </div>
          </div>

          {/* Targets Section */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-700">
                Target Accounts <span className="text-red-500">*</span>
              </label>
              <Button
                size="sm"
                variant="outline"
                leftIcon={PlusCircle}
                onClick={() => openModal('addTarget')}
              >
                Add Target Account
              </Button>
            </div>

            {formErrors.targets && (
              <p className="text-sm text-red-600 mb-2">{formErrors.targets}</p>
            )}

            {ruleForm.payloadJson.targets?.length > 0 ? (
              <div className="space-y-2">
                {ruleForm.payloadJson.targets.map((target, index) => {
                  const account = accounts.find(a => a.id === target.toAccountId);
                  const centerId = target.dimensionJson?.[ruleForm.dimensionKey];
                  const center = centers.find(c => c.id === centerId);
                  
                  return (
                    <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge tone="info" size="sm">{index + 1}</Badge>
                          <span className="font-medium text-sm">{account?.code || target.toAccountId.substring(0, 8)}...</span>
                          <span className="text-xs text-slate-500">Weight: {target.weight}</span>
                          {center && (
                            <Badge tone="primary" size="sm">
                              {center.code}
                            </Badge>
                          )}
                          {target.notes && (
                            <span className="text-xs text-slate-400">({target.notes})</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Dimension: {ruleForm.targetDimension} → Key: {ruleForm.dimensionKey}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => editTarget(index)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          onClick={() => removeTarget(index)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <Target className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No target accounts added yet</p>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={Plus}
                  onClick={() => openModal('addTarget')}
                  className="mt-2"
                >
                  Add First Target Account
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => closeModal(modals.createRule ? 'createRule' : 'editRule')}
            disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitRule}
            loading={modals.editRule ? updateRuleMutation.isPending : createRuleMutation.isPending}
            leftIcon={modals.editRule ? Edit : Plus}
          >
            {modals.editRule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </div>
      </Modal>

      {/* Add Target Modal */}
      <Modal
        open={modals.addTarget}
        onClose={() => closeModal('addTarget')}
        title={editingTargetIndex !== null ? 'Edit Target Account' : 'Add Target Account'}
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Target Account"
            value={targetForm.toAccountId}
            onChange={(e) => setTargetForm(f => ({ ...f, toAccountId: e.target.value }))}
            options={accountOptions}
            required
          />

          <Input
            label="Weight"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="e.g., 1.5"
            value={targetForm.weight}
            onChange={(e) => setTargetForm(f => ({ ...f, weight: e.target.value }))}
            leftIcon={Hash}
            required
            helperText="Weight determines allocation proportion (must be > 0)"
          />

          <Select
            label={`Target ${ruleForm.dimensionKey.replace(/([A-Z])/g, ' $1').trim()}`}
            value={targetForm.centerId}
            onChange={(e) => setTargetForm(f => ({ ...f, centerId: e.target.value }))}
            options={centerOptions}
            required
            helperText={`Select the specific ${ruleForm.dimensionKey.replace(/([A-Z])/g, ' $1').toLowerCase()} for this allocation`}
          />

          <Input
            label="Notes (Optional)"
            placeholder="e.g., Department overhead"
            value={targetForm.notes}
            onChange={(e) => setTargetForm(f => ({ ...f, notes: e.target.value }))}
            leftIcon={FileText}
          />

          <div className="border-t border-slate-200 pt-4">
            <details className="text-sm">
              <summary className="text-slate-600 cursor-pointer hover:text-slate-800">
                Additional dimensions (optional)
              </summary>
              <div className="mt-2">
                <JsonEditor
                  value={targetForm.dimensionJson}
                  onChange={(v) => setTargetForm(f => ({ ...f, dimensionJson: v }))}
                  height={150}
                  compact={true}
                  placeholder='{ "projectId": "uuid", "locationId": "uuid" }'
                />
                <p className="text-xs text-slate-500 mt-1">
                  Add additional dimension values. The main dimension ({ruleForm.dimensionKey}) will be 
                  automatically added from the selected center.
                </p>
              </div>
            </details>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => closeModal('addTarget')}>
            Cancel
          </Button>
          <Button onClick={addTarget} leftIcon={PlusCircle}>
            {editingTargetIndex !== null ? 'Update Target' : 'Add Target'}
          </Button>
        </div>
      </Modal>

      {/* Create/Edit Base Modal */}
      <Modal
        open={modals.createBase || modals.editBase}
        onClose={() => closeModal(modals.createBase ? 'createBase' : 'editBase')}
        title={modals.editBase ? 'Edit Allocation Base' : 'Create New Allocation Base'}
        size="lg"
      >
        <div className="space-y-4">
          {/* Info Section */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowBaseInfo(!showBaseInfo)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <Info className="h-4 w-4" />
              <span>Allocation base info</span>
              <ChevronRight className={`h-4 w-4 transition-transform ${showBaseInfo ? 'rotate-90' : ''}`} />
            </button>
            
            {showBaseInfo && (
              <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <Layers className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <div className="font-medium mb-1">
                      {modals.editBase ? 'Edit allocation base' : 'Create a new allocation base'}
                    </div>
                    <div className="text-blue-700">
                      Bases define the unit of measure used for allocation (e.g., hours, headcount, sq ft).
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Input
                label="Base Code"
                placeholder="e.g., LABOUR-HRS"
                value={baseForm.code}
                onChange={(e) => setBaseForm(f => ({ ...f, code: e.target.value }))}
                error={formErrors.code}
                leftIcon={Tag}
                required
                helperText="Unique code, will be normalized to uppercase"
              />
            </div>

            <div>
              <Input
                label="Base Name"
                placeholder="e.g., Labour Hours"
                value={baseForm.name}
                onChange={(e) => setBaseForm(f => ({ ...f, name: e.target.value }))}
                error={formErrors.name}
                leftIcon={Layers}
                required
              />
            </div>

            <div>
              <Select
                label="Unit"
                value={baseForm.payloadJson?.unit || 'hours'}
                onChange={(e) => setBaseForm(f => ({ 
                  ...f, 
                  payloadJson: { ...f.payloadJson, unit: e.target.value }
                }))}
                options={UNIT_OPTIONS}
                error={formErrors.unit}
                required
                helperText="Unit of measure for this allocation base"
              />
            </div>

            <div>
              <Select
                label="Status"
                value={baseForm.status}
                onChange={(e) => setBaseForm(f => ({ ...f, status: e.target.value }))}
                options={[
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' },
                  { label: 'Archived', value: 'archived' }
                ]}
              />
            </div>
          </div>

          {/* JSON Configuration */}
          <div className="border-t border-slate-200 pt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Additional Configuration (JSON)
            </label>
            <JsonEditor
              value={baseForm.payloadJson}
              onChange={(v) => setBaseForm(f => ({ ...f, payloadJson: v }))}
              height={200}
              placeholder='{ "unit": "hours", "description": "Based on actual labour hours" }'
            />
            <p className="text-xs text-slate-500 mt-1">
              Configure additional properties in JSON format. The 'unit' field is required.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => closeModal(modals.createBase ? 'createBase' : 'editBase')}
            disabled={createBaseMutation.isPending || updateBaseMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => modals.editBase ? updateBaseMutation.mutate() : createBaseMutation.mutate()}
            loading={modals.editBase ? updateBaseMutation.isPending : createBaseMutation.isPending}
            leftIcon={modals.editBase ? Edit : Plus}
          >
            {modals.editBase ? 'Update Base' : 'Create Base'}
          </Button>
        </div>
      </Modal>

      {/* Post Allocation Modal */}
      <Modal
        open={modals.postConfirm}
        onClose={closeActionModal}
        title="Post Allocation to Journal"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              This will create a journal entry debiting the target accounts and crediting the source account.
            </p>
          </div>

          <Input
            label="Entry Date"
            type="date"
            value={postState.entryDate}
            onChange={(e) => setPostState(prev => ({ ...prev, entryDate: e.target.value }))}
            leftIcon={Calendar}
            required
          />

          <Input
            label="Memo (Optional)"
            placeholder="Enter memo for journal entry"
            value={postState.memo}
            onChange={(e) => setPostState(prev => ({ ...prev, memo: e.target.value }))}
            leftIcon={FileText}
          />

          <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Once posted, the allocation cannot be modified. You can only reverse it with a manual journal entry.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={closeActionModal}>
            Cancel
          </Button>
          <Button
            onClick={() => postAllocationMutation.mutate()}
            loading={postAllocationMutation.isPending}
            leftIcon={DollarSign}
            className="bg-green-600 hover:bg-green-700"
          >
            Post to Journal
          </Button>
        </div>
      </Modal>

      {/* Action Confirmation Modal (Archive/Activate/Delete) */}
      <Modal
        open={modals.archiveConfirm || modals.activateConfirm || modals.deleteConfirm}
        onClose={closeActionModal}
        title={
          modals.archiveConfirm ? 'Archive Item' : 
          modals.activateConfirm ? 'Activate Item' : 
          'Delete Item'
        }
        size="md"
      >
        <div className="px-6 py-5">
          <div className="flex items-start gap-3">
            {modals.archiveConfirm && <Archive className="h-6 w-6 text-amber-600 flex-shrink-0" />}
            {modals.activateConfirm && <PlayCircle className="h-6 w-6 text-green-600 flex-shrink-0" />}
            {modals.deleteConfirm && <Trash2 className="h-6 w-6 text-red-600 flex-shrink-0" />}
            
            <div>
              <p className="text-sm text-slate-600 mb-2">
                {modals.archiveConfirm && `Are you sure you want to archive "${selectedRule?.name || selectedBase?.name || 'this item'}"?`}
                {modals.activateConfirm && `Are you sure you want to activate "${selectedRule?.name || selectedBase?.name || 'this item'}"?`}
                {modals.deleteConfirm && `Are you sure you want to permanently delete "${selectedRule?.name || 'this rule'}"?`}
              </p>
              <p className="text-sm font-medium text-slate-900">
                {modals.archiveConfirm && 'Archived items become read-only and are hidden from most views.'}
                {modals.activateConfirm && 'Activated items become available for allocation computations.'}
                {modals.deleteConfirm && 'This action cannot be undone. The rule will be permanently removed.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={closeActionModal}
            disabled={
              archiveRuleMutation.isPending || activateRuleMutation.isPending || deleteRuleMutation.isPending
            }
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (selectedRule) {
                if (modals.archiveConfirm) archiveRuleMutation.mutate();
                else if (modals.activateConfirm) activateRuleMutation.mutate();
                else if (modals.deleteConfirm) deleteRuleMutation.mutate();
              }
            }}
            loading={
              archiveRuleMutation.isPending || activateRuleMutation.isPending || deleteRuleMutation.isPending
            }
            className={
              modals.archiveConfirm ? 'bg-amber-600 hover:bg-amber-700 text-white' :
              modals.activateConfirm ? 'bg-green-600 hover:bg-green-700 text-white' :
              'bg-red-600 hover:bg-red-700 text-white'
            }
          >
            {modals.archiveConfirm ? 'Archive' : 
             modals.activateConfirm ? 'Activate' : 
             'Delete'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}