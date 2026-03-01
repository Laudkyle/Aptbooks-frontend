import React, { useMemo, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Calendar,
  DollarSign,
  Percent,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Receipt,
  Tag,
  BookOpen,
  Landmark,
  Edit2,
  TrendingUp,
  Banknote,
  PieChart,
  Scale
} from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { ROUTES } from '../../../app/constants/routes.js';
import { makeIfrs15Api } from '../api/ifrs15.api.js';
import { makePeriodsApi } from '../../accounting/periods/api/periods.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { formatDate } from '../../../shared/utils/formatDate.js';
import { formatMoney } from '../../../shared/utils/formatMoney.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return data?.items ?? data?.rows ?? [];
}

function asDateOnly(dateStr) {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IFRS15ContractDetailPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const toast = useToast();

  const api = useMemo(() => makeIfrs15Api(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  // State
  const [activeTab, setActiveTab] = useState('obligations');
  
  // Modal states
  const [obligationModalOpen, setObligationModalOpen] = useState(false);
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [modificationModalOpen, setModificationModalOpen] = useState(false);
  const [variableConsiderationModalOpen, setVariableConsiderationModalOpen] = useState(false);
  const [financingModalOpen, setFinancingModalOpen] = useState(false);
  const [confirmActivateOpen, setConfirmActivateOpen] = useState(false);
  const [confirmGenScheduleOpen, setConfirmGenScheduleOpen] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Form states
  const [obligationForm, setObligationForm] = useState({
    description: '',
    obligation_type: 'OVER_TIME',
    satisfaction_method: 'TIME',
    standalone_selling_price: '',
    start_date: '',
    end_date: '',
    satisfaction_date: ''
  });

  const [costForm, setCostForm] = useState({
    cost_type: 'ACQUISITION',
    description: '',
    amount: '',
    asset_account_id: '',
    amort_expense_account_id: '',
    amort_start_date: '',
    amort_end_date: ''
  });

  const [postForm, setPostForm] = useState({
    period_id: '',
    entry_date: '',
    dry_run: true,
    memo: ''
  });

  const [modificationForm, setModificationForm] = useState({
    modification_date: '',
    modification_type: 'PRICE_CHANGE',
    new_base_transaction_price: '',
    notes: '',
    adds_distinct_goods_services: false,
    price_increase_commensurate_with_ssp: false,
    remaining_goods_services_distinct: true
  });

  const [variableConsiderationForm, setVariableConsiderationForm] = useState({
    effective_date: '',
    method: 'ESTIMATED',
    estimate_amount: '',
    highly_probable_no_reversal: false,
    constraint_basis: '',
    rationale: ''
  });

  const [financingForm, setFinancingForm] = useState({
    annual_rate: '',
    effective_from: '',
    effective_to: ''
  });

  // Queries
  const { 
    data: contractData, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery({
    queryKey: qk.ifrs15Contract(contractId),
    queryFn: () => api.getContract(contractId),
    staleTime: 30000,
    retry: 2
  });

  const { 
    data: scheduleData, 
    isLoading: scheduleLoading,
    refetch: refetchSchedule 
  } = useQuery({
    queryKey: qk.ifrs15ContractSchedule(contractId),
    queryFn: () => api.getSchedule(contractId),
    enabled: !!contractId,
    staleTime: 30000
  });

  const { 
    data: costsData, 
    isLoading: costsLoading,
    refetch: refetchCosts 
  } = useQuery({
    queryKey: qk.ifrs15ContractCosts(contractId),
    queryFn: () => api.listCosts(contractId),
    enabled: !!contractId,
    staleTime: 30000
  });

  const { data: periodsData } = useQuery({
    queryKey: ['periods'],
    queryFn: () => periodsApi.list(),
    staleTime: 60000
  });

  // Extract data from response
  const contract = contractData?.contract ?? contractData;
  const obligations = contractData?.obligations ?? contract?.obligations ?? [];
  const balances = contractData?.balances ?? { scheduled_total: 0, recognized_total: 0 };
  
  const scheduleRows = useMemo(() => {
    if (scheduleData?.lines && Array.isArray(scheduleData.lines)) return scheduleData.lines;
    return normalizeRows(scheduleData);
  }, [scheduleData]);

  const costRows = useMemo(() => {
    if (costsData?.costs && Array.isArray(costsData.costs)) return costsData.costs;
    return normalizeRows(costsData);
  }, [costsData]);

  const periods = useMemo(() => normalizeRows(periodsData), [periodsData]);

  // Options
  const periodOptions = useMemo(
    () => [
      { value: '', label: '— Select period —' },
      ...periods.map((p) => ({ 
        value: p.id, 
        label: `${p.code ?? p.name ?? p.id} (${formatDate(p.start_date)} - ${formatDate(p.end_date)})` 
      }))
    ],
    [periods]
  );

  const obligationTypeOptions = [
    { value: 'POINT_IN_TIME', label: 'Point in Time' },
    { value: 'OVER_TIME', label: 'Over Time' }
  ];

  const satisfactionMethodOptions = [
    { value: 'TIME', label: 'Time-based' },
    { value: 'OUTPUT', label: 'Output-based' },
    { value: 'INPUT', label: 'Input-based' }
  ];

  const costTypeOptions = [
    { value: 'ACQUISITION', label: 'Acquisition Cost' },
    { value: 'FULFILMENT', label: 'Fulfilment Cost' }
  ];

  const modificationTypeOptions = [
    { value: 'PRICE_CHANGE', label: 'Price Change' },
    { value: 'SCOPE_CHANGE', label: 'Scope Change' },
    { value: 'TERM_CHANGE', label: 'Term Change' },
    { value: 'CANCELLATION', label: 'Cancellation' }
  ];

  const variableMethodOptions = [
    { value: 'ESTIMATED', label: 'Estimated' },
    { value: 'MOST_LIKELY', label: 'Most Likely Amount' },
    { value: 'EXPECTED_VALUE', label: 'Expected Value' }
  ];

  const status = contract?.status ?? 'draft';

  // Form validation
  const validateObligationForm = useCallback(() => {
    const errors = {};
    if (!obligationForm.description.trim()) {
      errors.description = 'Obligation description is required';
    }
    const price = Number(obligationForm.standalone_selling_price);
    if (isNaN(price) || price < 0) {
      errors.standalone_selling_price = 'Must be a non-negative number';
    }
    if (obligationForm.obligation_type === 'POINT_IN_TIME' && !obligationForm.satisfaction_date) {
      errors.satisfaction_date = 'Satisfaction date is required for point-in-time obligations';
    }
    if (obligationForm.obligation_type === 'OVER_TIME') {
      if (!obligationForm.start_date) errors.start_date = 'Start date is required';
      if (!obligationForm.end_date) errors.end_date = 'End date is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [obligationForm]);

  const validateCostForm = useCallback(() => {
    const errors = {};
    if (!costForm.description.trim()) {
      errors.description = 'Cost description is required';
    }
    const amount = Number(costForm.amount);
    if (isNaN(amount) || amount < 0) {
      errors.amount = 'Must be a non-negative number';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [costForm]);

  const validatePostForm = useCallback(() => {
    const errors = {};
    if (!postForm.entry_date) {
      errors.entry_date = 'Entry date is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [postForm]);

  const validateModificationForm = useCallback(() => {
    const errors = {};
    if (!modificationForm.modification_date) {
      errors.modification_date = 'Modification date is required';
    }
    const price = Number(modificationForm.new_base_transaction_price);
    if (isNaN(price) || price < 0) {
      errors.new_base_transaction_price = 'Must be a non-negative number';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [modificationForm]);

  const validateVariableConsiderationForm = useCallback(() => {
    const errors = {};
    if (!variableConsiderationForm.effective_date) {
      errors.effective_date = 'Effective date is required';
    }
    const amount = Number(variableConsiderationForm.estimate_amount);
    if (isNaN(amount) || amount < 0) {
      errors.estimate_amount = 'Must be a non-negative number';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [variableConsiderationForm]);

  const validateFinancingForm = useCallback(() => {
    const errors = {};
    const rate = Number(financingForm.annual_rate);
    if (isNaN(rate) || rate < 0 || rate > 1) {
      errors.annual_rate = 'Must be between 0 and 1';
    }
    if (!financingForm.effective_from) {
      errors.effective_from = 'Effective from date is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [financingForm]);

  // Handlers
  const handleRefresh = useCallback(() => {
    refetch();
    refetchSchedule();
    refetchCosts();
    toast.success('Contract data refreshed');
  }, [refetch, refetchSchedule, refetchCosts, toast]);

  const handleFieldChange = useCallback((form, field, value) => {
    const setters = {
      obligation: setObligationForm,
      cost: setCostForm,
      post: setPostForm,
      modification: setModificationForm,
      variable: setVariableConsiderationForm,
      financing: setFinancingForm
    };
    const setter = setters[form];
    if (setter) {
      setter(prev => ({ ...prev, [field]: value }));
    }
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [formErrors]);

  // Mutations
  const activateMutation = useMutation({
    mutationFn: (payload) => api.activateContract(contractId, payload || {}),
    onSuccess: async () => {
      toast.success('Contract activated successfully');
      setConfirmActivateOpen(false);
      await qc.invalidateQueries({ queryKey: qk.ifrs15Contract(contractId) });
    },
    onError: (err) => {
      const message = err?.response?.data?.error ?? err?.message ?? 'Failed to activate contract';
      toast.error(message);
    }
  });

  const genScheduleMutation = useMutation({
    mutationFn: (payload) => api.generateSchedule(contractId, payload || {}),
    onSuccess: async () => {
      toast.success('Schedule generated successfully');
      setConfirmGenScheduleOpen(false);
      await qc.invalidateQueries({ queryKey: qk.ifrs15ContractSchedule(contractId) });
    },
    onError: (err) => {
      const message = err?.response?.data?.error ?? err?.message ?? 'Failed to generate schedule';
      toast.error(message);
    }
  });

  const addObligationMutation = useMutation({
    mutationFn: async () => {
      if (!validateObligationForm()) throw new Error('Please fix validation errors');
      return api.addObligation(contractId, obligationForm);
    },
    onSuccess: async () => {
      toast.success('Obligation added successfully');
      setObligationModalOpen(false);
      setObligationForm({
        description: '',
        obligation_type: 'OVER_TIME',
        satisfaction_method: 'TIME',
        standalone_selling_price: '',
        start_date: '',
        end_date: '',
        satisfaction_date: ''
      });
      setFormErrors({});
      await qc.invalidateQueries({ queryKey: qk.ifrs15Contract(contractId) });
    },
    onError: (err) => {
      const message = err?.response?.data?.error ?? err?.message ?? 'Failed to add obligation';
      toast.error(message);
    }
  });

  const addCostMutation = useMutation({
    mutationFn: async () => {
      if (!validateCostForm()) throw new Error('Please fix validation errors');
      return api.createCost(contractId, costForm);
    },
    onSuccess: async () => {
      toast.success('Cost added successfully');
      setCostModalOpen(false);
      setCostForm({
        cost_type: 'ACQUISITION',
        description: '',
        amount: '',
        asset_account_id: '',
        amort_expense_account_id: '',
        amort_start_date: '',
        amort_end_date: ''
      });
      setFormErrors({});
      await qc.invalidateQueries({ queryKey: qk.ifrs15ContractCosts(contractId) });
    },
    onError: (err) => {
      const message = err?.response?.data?.error ?? err?.message ?? 'Failed to add cost';
      toast.error(message);
    }
  });

  const postRevenueMutation = useMutation({
    mutationFn: async () => {
      if (!validatePostForm()) throw new Error('Please fix validation errors');
      return api.postRevenueForPeriod(contractId, postForm);
    },
    onSuccess: async () => {
      toast.success(postForm.dry_run ? 'Preview generated' : 'Revenue posted successfully');
      setPostModalOpen(false);
      setPostForm({ period_id: '', entry_date: '', dry_run: true, memo: '' });
      setFormErrors({});
      await qc.invalidateQueries({ queryKey: qk.ifrs15Contract(contractId) });
      await qc.invalidateQueries({ queryKey: qk.ifrs15ContractSchedule(contractId) });
    },
    onError: (err) => {
      const message = err?.response?.data?.error ?? err?.message ?? 'Failed to post revenue';
      toast.error(message);
    }
  });

  const createModificationMutation = useMutation({
    mutationFn: async () => {
      if (!validateModificationForm()) throw new Error('Please fix validation errors');
      return api.createModification(contractId, modificationForm);
    },
    onSuccess: async () => {
      toast.success('Modification created successfully');
      setModificationModalOpen(false);
      setModificationForm({
        modification_date: '',
        modification_type: 'PRICE_CHANGE',
        new_base_transaction_price: '',
        notes: '',
        adds_distinct_goods_services: false,
        price_increase_commensurate_with_ssp: false,
        remaining_goods_services_distinct: true
      });
      setFormErrors({});
      await qc.invalidateQueries({ queryKey: qk.ifrs15Contract(contractId) });
    },
    onError: (err) => {
      const message = err?.response?.data?.error ?? err?.message ?? 'Failed to create modification';
      toast.error(message);
    }
  });

  const createVariableConsiderationMutation = useMutation({
    mutationFn: async () => {
      if (!validateVariableConsiderationForm()) throw new Error('Please fix validation errors');
      return api.createVariableConsideration(contractId, variableConsiderationForm);
    },
    onSuccess: async () => {
      toast.success('Variable consideration added successfully');
      setVariableConsiderationModalOpen(false);
      setVariableConsiderationForm({
        effective_date: '',
        method: 'ESTIMATED',
        estimate_amount: '',
        highly_probable_no_reversal: false,
        constraint_basis: '',
        rationale: ''
      });
      setFormErrors({});
      await qc.invalidateQueries({ queryKey: qk.ifrs15Contract(contractId) });
    },
    onError: (err) => {
      const message = err?.response?.data?.error ?? err?.message ?? 'Failed to add variable consideration';
      toast.error(message);
    }
  });

  const setFinancingTermsMutation = useMutation({
    mutationFn: async () => {
      if (!validateFinancingForm()) throw new Error('Please fix validation errors');
      return api.setFinancingTerms(contractId, financingForm);
    },
    onSuccess: async () => {
      toast.success('Financing terms set successfully');
      setFinancingModalOpen(false);
      setFinancingForm({
        annual_rate: '',
        effective_from: '',
        effective_to: ''
      });
      setFormErrors({});
      await qc.invalidateQueries({ queryKey: qk.ifrs15Contract(contractId) });
    },
    onError: (err) => {
      const message = err?.response?.data?.error ?? err?.message ?? 'Failed to set financing terms';
      toast.error(message);
    }
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Loading Contract..."
          subtitle="Please wait while we load the contract details"
          icon={FileText}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.complianceIfrs15)}>
              Back to Contracts
            </Button>
          }
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading contract details...</div>
          </div>
        </ContentCard>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Error Loading Contract"
          subtitle="There was a problem loading the contract details"
          icon={FileText}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(ROUTES.complianceIfrs15)}>
              Back to Contracts
            </Button>
          }
        />
        <ContentCard>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-sm font-medium text-slate-900">Failed to load contract</div>
            <div className="text-sm text-slate-500">{error?.message ?? 'An error occurred'}</div>
            <Button variant="outline" onClick={handleRefresh} className="mt-2">
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
        title={contract?.name ?? 'Contract Details'}
        subtitle={
          <div className="flex items-center gap-2 flex-wrap">
            {contract?.code && <Badge tone="muted">{contract.code}</Badge>}
            {contract?.contract_date && (
              <>
                <span>·</span>
                <span>Signed {formatDate(contract.contract_date)}</span>
              </>
            )}
            {contract?.business_partner_id && (
              <>
                <span>·</span>
                <span>Customer ID: {contract.business_partner_id}</span>
              </>
            )}
          </div>
        }
        icon={FileText}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={ArrowLeft}
              onClick={() => navigate(ROUTES.complianceIfrs15)}
            >
              Back
            </Button>
            <Button
              variant="outline"
              leftIcon={RefreshCw}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            {status === 'draft' && (
              <Button
                onClick={() => setConfirmActivateOpen(true)}
              >
                Activate Contract
              </Button>
            )}
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <ContentCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <Badge
                tone={status === 'active' ? 'success' : status === 'draft' ? 'warning' : 'muted'}
                className="mt-1"
              >
                {status === 'active' ? <CheckCircle className="h-3 w-3 mr-1" /> : 
                 status === 'draft' ? <FileText className="h-3 w-3 mr-1" /> : 
                 <XCircle className="h-3 w-3 mr-1" />}
                {status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </ContentCard>

        <ContentCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Transaction Price</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatMoney(contract?.transaction_price ?? 0, contract?.currency_code)}
              </p>
            </div>
          </div>
        </ContentCard>

        <ContentCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Calendar className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Contract Period</p>
              <p className="text-sm font-medium text-slate-900">
                {contract?.start_date ? formatDate(contract.start_date) : '—'} - {contract?.end_date ? formatDate(contract.end_date) : '—'}
              </p>
            </div>
          </div>
        </ContentCard>

        <ContentCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <PieChart className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Recognition Progress</p>
              <p className="text-sm font-medium text-slate-900">
                {formatMoney(balances?.recognized_total ?? 0, contract?.currency_code)} / {formatMoney(balances?.scheduled_total ?? 0, contract?.currency_code)}
              </p>
            </div>
          </div>
        </ContentCard>
      </div>

      {/* Action Cards - Stage 2 Features */}
      <div className="grid gap-4 md:grid-cols-4">
        <ContentCard 
          className="p-4 hover:shadow-md transition-shadow cursor-pointer" 
          onClick={() => setObligationModalOpen(true)}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Plus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Add Obligation</h3>
              <p className="text-xs text-slate-500 mt-1">
                Performance obligations
              </p>
            </div>
          </div>
        </ContentCard>

        <ContentCard 
          className="p-4 hover:shadow-md transition-shadow cursor-pointer" 
          onClick={() => setCostModalOpen(true)}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Receipt className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Add Cost</h3>
              <p className="text-xs text-slate-500 mt-1">
                Acquisition/fulfilment costs
              </p>
            </div>
          </div>
        </ContentCard>

        <ContentCard 
          className="p-4 hover:shadow-md transition-shadow cursor-pointer" 
          onClick={() => setModificationModalOpen(true)}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Edit2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Modify Contract</h3>
              <p className="text-xs text-slate-500 mt-1">
                Stage 2: Contract modifications
              </p>
            </div>
          </div>
        </ContentCard>

        <ContentCard 
          className="p-4 hover:shadow-md transition-shadow cursor-pointer" 
          onClick={() => setVariableConsiderationModalOpen(true)}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Variable Consideration</h3>
              <p className="text-xs text-slate-500 mt-1">
                Constraint & estimates
              </p>
            </div>
          </div>
        </ContentCard>

        <ContentCard 
          className="p-4 hover:shadow-md transition-shadow cursor-pointer" 
          onClick={() => setFinancingModalOpen(true)}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Banknote className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Financing Component</h3>
              <p className="text-xs text-slate-500 mt-1">
                Time value of money
              </p>
            </div>
          </div>
        </ContentCard>

        <ContentCard 
          className="p-4 hover:shadow-md transition-shadow cursor-pointer" 
          onClick={() => setPostModalOpen(true)}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-50 rounded-lg">
              <BookOpen className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Post Revenue</h3>
              <p className="text-xs text-slate-500 mt-1">
                Recognize revenue
              </p>
            </div>
          </div>
        </ContentCard>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            value: 'obligations',
            label: 'Performance Obligations',
            icon: Tag,
            content: (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <div className="text-sm text-slate-500">
                      Revenue will be allocated across these obligations
                    </div>
                  </div>
                  <Button
                    size="sm"
                    leftIcon={Plus}
                    onClick={() => setObligationModalOpen(true)}
                  >
                    Add Obligation
                  </Button>
                </div>

                {obligations.length === 0 ? (
                  <div className="text-center py-12">
                    <Tag className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <div className="text-sm font-medium text-slate-900 mb-1">No obligations</div>
                    <div className="text-sm text-slate-500 mb-4">
                      Add performance obligations to allocate revenue
                    </div>
                    <Button 
                      size="sm" 
                      leftIcon={Plus} 
                      onClick={() => setObligationModalOpen(true)}
                    >
                      Add Obligation
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Method</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">SSP</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Period</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {obligations.map((obligation) => (
                          <tr key={obligation.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4 text-slate-400" />
                                <span className="font-medium text-slate-900">{obligation.description}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge tone="muted" className="text-xs">
                                {obligation.obligation_type === 'POINT_IN_TIME' ? 'Point in Time' : 'Over Time'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-700">
                                {obligation.satisfaction_method === 'TIME' ? 'Time-based' :
                                 obligation.satisfaction_method === 'OUTPUT' ? 'Output-based' : 'Input-based'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-mono text-sm text-slate-700">
                                  {formatMoney(obligation.standalone_selling_price ?? 0, contract?.currency_code)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-700">
                                {obligation.obligation_type === 'POINT_IN_TIME' 
                                  ? formatDate(obligation.satisfaction_date)
                                  : `${formatDate(obligation.start_date)} - ${formatDate(obligation.end_date)}`}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          },
          {
            value: 'schedule',
            label: 'Recognition Schedule',
            icon: Calendar,
            content: (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <div className="text-sm text-slate-500">
                      Revenue recognition timeline and posting status
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={RefreshCw}
                      onClick={() => setConfirmGenScheduleOpen(true)}
                    >
                      Generate Schedule
                    </Button>
                    <Button
                      size="sm"
                      leftIcon={BookOpen}
                      onClick={() => setPostModalOpen(true)}
                    >
                      Post / Preview
                    </Button>
                  </div>
                </div>

                {scheduleLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-sm text-slate-500">Loading schedule...</div>
                  </div>
                ) : scheduleRows.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <div className="text-sm font-medium text-slate-900 mb-1">No schedule generated</div>
                    <div className="text-sm text-slate-500 mb-4">
                      Generate the revenue recognition schedule
                    </div>
                    <Button 
                      size="sm" 
                      leftIcon={RefreshCw} 
                      onClick={() => setConfirmGenScheduleOpen(true)}
                    >
                      Generate Schedule
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Scheduled</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Recognized</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {scheduleRows.map((row, idx) => (
                          <tr key={row?.id ?? idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <span className="text-sm text-slate-700">
                                  {formatDate(row.recognition_date)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-mono text-sm text-slate-700">
                                  {formatMoney(row.scheduled_amount ?? 0, contract?.currency_code)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-mono text-sm text-slate-700">
                                  {formatMoney(row.recognized_amount ?? 0, contract?.currency_code)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                tone={row.status === 'posted' ? 'success' : 'muted'}
                                className="inline-flex items-center gap-1.5"
                              >
                                {row.status === 'posted' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                {row.status ?? 'scheduled'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          },
          {
            value: 'costs',
            label: 'Contract Costs',
            icon: Receipt,
            content: (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <div className="text-sm text-slate-500">
                      Track incremental and fulfilment costs
                    </div>
                  </div>
                  <Button
                    size="sm"
                    leftIcon={Plus}
                    onClick={() => setCostModalOpen(true)}
                  >
                    Add Cost
                  </Button>
                </div>

                {costsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-sm text-slate-500">Loading costs...</div>
                  </div>
                ) : costRows.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <div className="text-sm font-medium text-slate-900 mb-1">No costs</div>
                    <div className="text-sm text-slate-500 mb-4">
                      Track incremental and fulfilment costs
                    </div>
                    <Button 
                      size="sm" 
                      leftIcon={Plus} 
                      onClick={() => setCostModalOpen(true)}
                    >
                      Add Cost
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Amortization Period</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {costRows.map((cost) => (
                          <tr key={cost.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-slate-400" />
                                <span className="font-medium text-slate-900">{cost.description}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge tone="muted" className="text-xs">
                                {cost.cost_type === 'ACQUISITION' ? 'Acquisition' : 'Fulfilment'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-mono text-sm text-slate-700">
                                  {formatMoney(cost.amount ?? 0, contract?.currency_code)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-700">
                                {cost.amort_start_date && cost.amort_end_date 
                                  ? `${formatDate(cost.amort_start_date)} - ${formatDate(cost.amort_end_date)}`
                                  : '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Activate Confirmation Modal */}
      <Modal
        open={confirmActivateOpen}
        onClose={() => setConfirmActivateOpen(false)}
        title="Activate Contract"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <div className="font-medium mb-1">Confirm Contract Activation</div>
                <div className="text-amber-700">
                  Activate this contract? You should have obligations configured.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setConfirmActivateOpen(false)}
            disabled={activateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => activateMutation.mutate()}
            loading={activateMutation.isPending}
          >
            Activate Contract
          </Button>
        </div>
      </Modal>

      {/* Generate Schedule Confirmation Modal */}
      <Modal
        open={confirmGenScheduleOpen}
        onClose={() => setConfirmGenScheduleOpen(false)}
        title="Generate Schedule"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <div className="font-medium mb-1">Confirm Schedule Generation</div>
                <div className="text-amber-700">
                  Generate the recognition schedule based on obligations
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setConfirmGenScheduleOpen(false)}
            disabled={genScheduleMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => genScheduleMutation.mutate({ replace: true })}
            loading={genScheduleMutation.isPending}
            leftIcon={RefreshCw}
          >
            Generate Schedule
          </Button>
        </div>
      </Modal>

      {/* Add Obligation Modal */}
      <Modal
        open={obligationModalOpen}
        onClose={() => setObligationModalOpen(false)}
        title="Add Performance Obligation"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Tag className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <div className="font-medium mb-1">Performance Obligation</div>
                <div className="text-blue-700">
                  Define a distinct good or service promised to the customer
                </div>
              </div>
            </div>
          </div>

          <Input
            label="Description"
            value={obligationForm.description}
            onChange={(e) => handleFieldChange('obligation', 'description', e.target.value)}
            placeholder="e.g., Software License, Support Services"
            required
            error={formErrors.description}
            leftIcon={Tag}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Obligation Type"
              value={obligationForm.obligation_type}
              onChange={(e) => handleFieldChange('obligation', 'obligation_type', e.target.value)}
              options={obligationTypeOptions}
              leftIcon={Clock}
            />
            <Select
              label="Satisfaction Method"
              value={obligationForm.satisfaction_method}
              onChange={(e) => handleFieldChange('obligation', 'satisfaction_method', e.target.value)}
              options={satisfactionMethodOptions}
              leftIcon={Scale}
            />
          </div>

          <Input
            label="Standalone Selling Price"
            type="number"
            min="0"
            step="0.01"
            value={obligationForm.standalone_selling_price}
            onChange={(e) => handleFieldChange('obligation', 'standalone_selling_price', e.target.value)}
            placeholder="0.00"
            required
            error={formErrors.standalone_selling_price}
            leftIcon={DollarSign}
          />

          {obligationForm.obligation_type === 'POINT_IN_TIME' ? (
            <Input
              label="Satisfaction Date"
              type="date"
              value={obligationForm.satisfaction_date}
              onChange={(e) => handleFieldChange('obligation', 'satisfaction_date', e.target.value)}
              required
              error={formErrors.satisfaction_date}
              leftIcon={Calendar}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Start Date"
                type="date"
                value={obligationForm.start_date}
                onChange={(e) => handleFieldChange('obligation', 'start_date', e.target.value)}
                required
                error={formErrors.start_date}
                leftIcon={Calendar}
              />
              <Input
                label="End Date"
                type="date"
                value={obligationForm.end_date}
                onChange={(e) => handleFieldChange('obligation', 'end_date', e.target.value)}
                required
                error={formErrors.end_date}
                leftIcon={Calendar}
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setObligationModalOpen(false)}
            disabled={addObligationMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => addObligationMutation.mutate()}
            loading={addObligationMutation.isPending}
            disabled={!obligationForm.description.trim() || !obligationForm.standalone_selling_price}
            leftIcon={Plus}
          >
            Add Obligation
          </Button>
        </div>
      </Modal>

      {/* Add Cost Modal */}
      <Modal
        open={costModalOpen}
        onClose={() => setCostModalOpen(false)}
        title="Add Contract Cost"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <Receipt className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-900">
                <div className="font-medium mb-1">Contract Cost</div>
                <div className="text-emerald-700">
                  Track incremental costs of obtaining a contract or fulfilment costs
                </div>
              </div>
            </div>
          </div>

          <Select
            label="Cost Type"
            value={costForm.cost_type}
            onChange={(e) => handleFieldChange('cost', 'cost_type', e.target.value)}
            options={costTypeOptions}
            leftIcon={Tag}
          />

          <Input
            label="Description"
            value={costForm.description}
            onChange={(e) => handleFieldChange('cost', 'description', e.target.value)}
            placeholder="e.g., Sales Commission, Setup Costs"
            required
            error={formErrors.description}
            leftIcon={Receipt}
          />

          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={costForm.amount}
            onChange={(e) => handleFieldChange('cost', 'amount', e.target.value)}
            required
            error={formErrors.amount}
            leftIcon={DollarSign}
          />

          <Input
            label="Asset Account ID"
            value={costForm.asset_account_id}
            onChange={(e) => handleFieldChange('cost', 'asset_account_id', e.target.value)}
            placeholder="Chart of accounts ID"
            leftIcon={BookOpen}
          />

          <Input
            label="Amortization Expense Account ID"
            value={costForm.amort_expense_account_id}
            onChange={(e) => handleFieldChange('cost', 'amort_expense_account_id', e.target.value)}
            placeholder="Chart of accounts ID"
            leftIcon={Receipt}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Amortization Start Date"
              type="date"
              value={costForm.amort_start_date}
              onChange={(e) => handleFieldChange('cost', 'amort_start_date', e.target.value)}
              leftIcon={Calendar}
            />
            <Input
              label="Amortization End Date"
              type="date"
              value={costForm.amort_end_date}
              onChange={(e) => handleFieldChange('cost', 'amort_end_date', e.target.value)}
              leftIcon={Calendar}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setCostModalOpen(false)}
            disabled={addCostMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => addCostMutation.mutate()}
            loading={addCostMutation.isPending}
            disabled={!costForm.description.trim() || !costForm.amount}
            leftIcon={Plus}
          >
            Add Cost
          </Button>
        </div>
      </Modal>

      {/* Post Revenue Modal */}
      <Modal
        open={postModalOpen}
        onClose={() => setPostModalOpen(false)}
        title="Post Revenue"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-purple-900">
                <div className="font-medium mb-1">Revenue Recognition</div>
                <div className="text-purple-700">
                  Post revenue for recognized amounts or preview before posting
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Entry Date"
              type="date"
              value={postForm.entry_date}
              onChange={(e) => handleFieldChange('post', 'entry_date', e.target.value)}
              required
              error={formErrors.entry_date}
              leftIcon={Calendar}
            />
            <Select
              label="Period"
              value={postForm.period_id}
              onChange={(e) => handleFieldChange('post', 'period_id', e.target.value)}
              options={periodOptions}
              leftIcon={Calendar}
            />
          </div>

          <Select
            label="Mode"
            value={postForm.dry_run ? 'true' : 'false'}
            onChange={(e) => handleFieldChange('post', 'dry_run', e.target.value === 'true')}
            options={[
              { value: 'true', label: 'Preview (dry run) - Validate only' },
              { value: 'false', label: 'Post for real - Create journals' }
            ]}
            leftIcon={BookOpen}
          />

          <Input
            label="Memo (Optional)"
            value={postForm.memo}
            onChange={(e) => handleFieldChange('post', 'memo', e.target.value)}
            placeholder="Audit reference or description…"
            leftIcon={FileText}
          />

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>Tip: Always run a preview first to validate before posting for real.</span>
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setPostModalOpen(false)}
            disabled={postRevenueMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => postRevenueMutation.mutate()}
            loading={postRevenueMutation.isPending}
            disabled={!postForm.entry_date}
            leftIcon={BookOpen}
          >
            {postForm.dry_run ? 'Preview' : 'Post Revenue'}
          </Button>
        </div>
      </Modal>

      {/* Modification Modal */}
      <Modal
        open={modificationModalOpen}
        onClose={() => setModificationModalOpen(false)}
        title="Contract Modification"
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
            <div className="flex items-start gap-3">
              <Edit2 className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-purple-900">
                <div className="font-medium mb-1">IFRS 15 Contract Modification</div>
                <div className="text-purple-700">
                  Changes to scope or price are evaluated under IFRS 15.20-21
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Modification Date"
              type="date"
              value={modificationForm.modification_date}
              onChange={(e) => handleFieldChange('modification', 'modification_date', e.target.value)}
              required
              error={formErrors.modification_date}
              leftIcon={Calendar}
            />
            <Select
              label="Modification Type"
              value={modificationForm.modification_type}
              onChange={(e) => handleFieldChange('modification', 'modification_type', e.target.value)}
              options={modificationTypeOptions}
              leftIcon={Edit2}
            />
          </div>

          <Input
            label="New Base Transaction Price"
            type="number"
            min="0"
            step="0.01"
            value={modificationForm.new_base_transaction_price}
            onChange={(e) => handleFieldChange('modification', 'new_base_transaction_price', e.target.value)}
            placeholder="0.00"
            error={formErrors.new_base_transaction_price}
            leftIcon={DollarSign}
          />

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={modificationForm.adds_distinct_goods_services}
                onChange={(e) => handleFieldChange('modification', 'adds_distinct_goods_services', e.target.checked)}
                className="rounded border-slate-300"
              />
              Adds distinct goods/services
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={modificationForm.price_increase_commensurate_with_ssp}
                onChange={(e) => handleFieldChange('modification', 'price_increase_commensurate_with_ssp', e.target.checked)}
                className="rounded border-slate-300"
              />
              Price increase commensurate with SSP
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={modificationForm.remaining_goods_services_distinct}
                onChange={(e) => handleFieldChange('modification', 'remaining_goods_services_distinct', e.target.checked)}
                className="rounded border-slate-300"
              />
              Remaining goods/services distinct
            </label>
          </div>

          <Input
            label="Notes (Optional)"
            value={modificationForm.notes}
            onChange={(e) => handleFieldChange('modification', 'notes', e.target.value)}
            placeholder="Additional context for the modification"
            leftIcon={FileText}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setModificationModalOpen(false)}
            disabled={createModificationMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => createModificationMutation.mutate()}
            loading={createModificationMutation.isPending}
            disabled={!modificationForm.modification_date}
            leftIcon={Plus}
          >
            Create Modification
          </Button>
        </div>
      </Modal>

      {/* Variable Consideration Modal */}
      <Modal
        open={variableConsiderationModalOpen}
        onClose={() => setVariableConsiderationModalOpen(false)}
        title="Variable Consideration"
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <div className="font-medium mb-1">Variable Consideration</div>
                <div className="text-amber-700">
                  Estimate and apply constraint under IFRS 15.56-58
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Effective Date"
              type="date"
              value={variableConsiderationForm.effective_date}
              onChange={(e) => handleFieldChange('variable', 'effective_date', e.target.value)}
              required
              error={formErrors.effective_date}
              leftIcon={Calendar}
            />
            <Select
              label="Estimation Method"
              value={variableConsiderationForm.method}
              onChange={(e) => handleFieldChange('variable', 'method', e.target.value)}
              options={variableMethodOptions}
              leftIcon={Scale}
            />
          </div>

          <Input
            label="Estimate Amount"
            type="number"
            min="0"
            step="0.01"
            value={variableConsiderationForm.estimate_amount}
            onChange={(e) => handleFieldChange('variable', 'estimate_amount', e.target.value)}
            required
            error={formErrors.estimate_amount}
            leftIcon={DollarSign}
          />

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={variableConsiderationForm.highly_probable_no_reversal}
              onChange={(e) => handleFieldChange('variable', 'highly_probable_no_reversal', e.target.checked)}
              className="rounded border-slate-300"
            />
            Highly probable no significant reversal
          </label>

          <Input
            label="Constraint Basis"
            value={variableConsiderationForm.constraint_basis}
            onChange={(e) => handleFieldChange('variable', 'constraint_basis', e.target.value)}
            placeholder="Basis for applying constraint"
            leftIcon={FileText}
          />

          <Input
            label="Rationale"
            value={variableConsiderationForm.rationale}
            onChange={(e) => handleFieldChange('variable', 'rationale', e.target.value)}
            placeholder="Supporting rationale for estimate"
            leftIcon={FileText}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setVariableConsiderationModalOpen(false)}
            disabled={createVariableConsiderationMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => createVariableConsiderationMutation.mutate()}
            loading={createVariableConsiderationMutation.isPending}
            disabled={!variableConsiderationForm.effective_date || !variableConsiderationForm.estimate_amount}
            leftIcon={Plus}
          >
            Add Variable Consideration
          </Button>
        </div>
      </Modal>

      {/* Financing Component Modal */}
      <Modal
        open={financingModalOpen}
        onClose={() => setFinancingModalOpen(false)}
        title="Financing Component"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <div className="flex items-start gap-3">
              <Banknote className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-indigo-900">
                <div className="font-medium mb-1">Significant Financing Component</div>
                <div className="text-indigo-700">
                  Account for time value of money (IFRS 15.60-65)
                </div>
              </div>
            </div>
          </div>

          <Input
            label="Annual Interest Rate"
            type="number"
            min="0"
            max="1"
            step="0.001"
            value={financingForm.annual_rate}
            onChange={(e) => handleFieldChange('financing', 'annual_rate', e.target.value)}
            placeholder="e.g., 0.05 for 5%"
            required
            error={formErrors.annual_rate}
            leftIcon={Percent}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Effective From"
              type="date"
              value={financingForm.effective_from}
              onChange={(e) => handleFieldChange('financing', 'effective_from', e.target.value)}
              required
              error={formErrors.effective_from}
              leftIcon={Calendar}
            />
            <Input
              label="Effective To (Optional)"
              type="date"
              value={financingForm.effective_to}
              onChange={(e) => handleFieldChange('financing', 'effective_to', e.target.value)}
              leftIcon={Calendar}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setFinancingModalOpen(false)}
            disabled={setFinancingTermsMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => setFinancingTermsMutation.mutate()}
            loading={setFinancingTermsMutation.isPending}
            disabled={!financingForm.annual_rate || !financingForm.effective_from}
            leftIcon={Plus}
          >
            Set Financing Terms
          </Button>
        </div>
      </Modal>
    </div>
  );
}