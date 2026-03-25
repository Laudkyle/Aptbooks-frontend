import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageHeader } from "../../../shared/components/layout/PageHeader.jsx";
import { ContentCard } from "../../../shared/components/layout/ContentCard.jsx";
import { Button } from "../../../shared/components/ui/Button.jsx";
import { Badge } from "../../../shared/components/ui/Badge.jsx";
import { Input } from "../../../shared/components/ui/Input.jsx";
import { Select } from "../../../shared/components/ui/Select.jsx";
import { Modal } from "../../../shared/components/ui/Modal.jsx";
import { useToast } from "../../../shared/components/ui/Toast.jsx";
import { Tabs } from "../../../shared/components/ui/Tabs.jsx";

import {
  ArrowLeft,
  RefreshCw,
  Plus,
  CheckCircle,
  AlertCircle,
  Calendar,
  FileText,
  Layers,
  DollarSign,
  Tag,
  Receipt,
  Clock,
  XCircle
} from "lucide-react";

import { useApi } from "../../../shared/hooks/useApi.js";
import { makeIfrs15Api } from "../api/ifrs15.api.js";
import { makePeriodsApi } from "../../accounting/periods/api/periods.api.js";
import { toOptions, NONE_OPTION } from "../../../shared/utils/options.js";

// If you already have these in shared utils, import them instead.
import {formatDate} from "../../../shared/utils/formatDate.js";
import {formatMoney} from "../../../shared/utils/formatMoney.js";

// ---------------------------
// Helpers
// ---------------------------
function rowsFrom(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function statusBadge(status) {
  const s = (status ?? "").toLowerCase();
  if (s === "draft") return <Badge tone="warning">Draft</Badge>;
  if (s === "active") return <Badge tone="success">Active</Badge>;
  if (s === "closed") return <Badge tone="muted">Closed</Badge>;
  return <Badge tone="muted">{status ?? "—"}</Badge>;
}

function toDateOnly(v) {
  // expects YYYY-MM-DD input from <input type="date" />
  return v || "";
}

// ---------------------------
// Page
// ---------------------------
export default function IFRS15ContractDetailPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeIfrs15Api(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  const qc = useQueryClient();
  const periodsQ = useQuery({ queryKey: ["periods", "ifrs15-post-revenue"], queryFn: () => periodsApi.list({ limit: 500, offset: 0 }), staleTime: 60_000 });
  const toast = useToast();

  // ---------------------------
  // Local UI state
  // ---------------------------
  const [activeTab, setActiveTab] = useState("overview");

  // Activate modal
  const [activateOpen, setActivateOpen] = useState(false);
  const [activateForm, setActivateForm] = useState({ entry_date: "", memo: "" });

  // Add obligation modal
  const [obligationOpen, setObligationOpen] = useState(false);
  const [obligationForm, setObligationForm] = useState({
    code: "",
    description: "",
    standalone_selling_price: "",
    satisfaction_type: "OVER_TIME", // OVER_TIME | POINT_IN_TIME
    satisfaction_date: "",
    start_date: "",
    end_date: "",
  });

  // Generate schedule modal
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    mode: "FROM_DATE", // FROM_DATE | REPLACE_ALL
    from_date: "",
    replace_confirm: false,
  });

  // Post revenue modal
  const [postOpen, setPostOpen] = useState(false);
  const [postForm, setPostForm] = useState({
    period_id: "",
    entry_date: "", // optional
    memo: "",
  });

  // Add cost modal
  const [costOpen, setCostOpen] = useState(false);
  const [costForm, setCostForm] = useState({
    description: "",
    amount: "",
    amort_start_date: "",
    amort_end_date: "",
    asset_account_id: "",
    amort_expense_account_id: "",
  });

  const [formErrors, setFormErrors] = useState({});

  // ---------------------------
  // Queries
  // ---------------------------
  const contractQuery = useQuery({
    queryKey: ["ifrs15", "contract", contractId],
    queryFn: () => api.getContract(contractId),
    enabled: !!contractId,
    staleTime: 10000,
    retry: 2,
  });

  const scheduleQuery = useQuery({
    queryKey: ["ifrs15", "contract", contractId, "schedule"],
    queryFn: () => api.getSchedule(contractId),
    enabled: !!contractId,
    staleTime: 10000,
    retry: 2,
  });

  const costsQuery = useQuery({
    queryKey: ["ifrs15", "contract", contractId, "costs"],
    queryFn: () => api.listCosts(contractId),
    enabled: !!contractId,
    staleTime: 10000,
    retry: 2,
  });

  const contract = contractQuery.data ?? null;
  const status = (contract?.status ?? "").toLowerCase();
  const canActivate = status === "draft";
  const canAddObligation = status === "draft";
  const canGenerateSchedule = status === "active";
  const canPostRevenue = status === "active";
  const canManageCosts = true; // backend did not indicate status constraint; keep enabled but your backend may enforce.

  // ---------------------------
  // Mutations
  // ---------------------------
  const activateMutation = useMutation({
    mutationFn: (body) => api.activateContract(contractId, body),
    onSuccess: async () => {
      toast.success("Contract activated");
      setActivateOpen(false);
      setActivateForm({ entry_date: "", memo: "" });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["ifrs15", "contract", contractId] }),
        qc.invalidateQueries({ queryKey: ["ifrs15", "contract", contractId, "schedule"] }),
      ]);
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Activation failed"),
  });

  const addObligationMutation = useMutation({
    mutationFn: (body) => api.addObligation(contractId, body),
    onSuccess: async () => {
      toast.success("Obligation added");
      setObligationOpen(false);
      setObligationForm({
        code: "",
        description: "",
        standalone_selling_price: "",
        satisfaction_type: "OVER_TIME",
        satisfaction_date: "",
        start_date: "",
        end_date: "",
      });
      await qc.invalidateQueries({ queryKey: ["ifrs15", "contract", contractId] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Failed to add obligation"),
  });

  const generateScheduleMutation = useMutation({
    mutationFn: (body) => api.generateSchedule(contractId, body),
    onSuccess: async () => {
      toast.success("Schedule generated");
      setScheduleOpen(false);
      setScheduleForm({ mode: "FROM_DATE", from_date: "", replace_confirm: false });
      await qc.invalidateQueries({ queryKey: ["ifrs15", "contract", contractId, "schedule"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Failed to generate schedule"),
  });

  const postRevenueMutation = useMutation({
    mutationFn: (body) => api.postRevenueForPeriod(contractId, body),
    onSuccess: async () => {
      toast.success("Revenue posted successfully");
      setPostOpen(false);
      setPostForm({ period_id: "", entry_date: "", memo: "" });
      await qc.invalidateQueries({ queryKey: ["ifrs15", "contract", contractId, "schedule"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Posting failed"),
  });

  const createCostMutation = useMutation({
    mutationFn: (body) => api.createCost(contractId, body),
    onSuccess: async () => {
      toast.success("Cost added");
      setCostOpen(false);
      setCostForm({
        description: "",
        amount: "",
        amort_start_date: "",
        amort_end_date: "",
        asset_account_id: "",
        amort_expense_account_id: "",
      });
      await qc.invalidateQueries({ queryKey: ["ifrs15", "contract", contractId, "costs"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Failed to add cost"),
  });

  const genCostScheduleMutation = useMutation({
    mutationFn: ({ costId, body }) => api.generateCostSchedule(contractId, costId, body),
    onSuccess: async () => {
      toast.success("Cost schedule generated");
      await qc.invalidateQueries({ queryKey: ["ifrs15", "contract", contractId, "costs"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Failed to generate cost schedule"),
  });

  const postCostMutation = useMutation({
    mutationFn: ({ costId, body }) => api.postCost(contractId, costId, body),
    onSuccess: async () => {
      toast.success("Cost posted");
      await qc.invalidateQueries({ queryKey: ["ifrs15", "contract", contractId, "costs"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message ?? "Failed to post cost"),
  });

  // ---------------------------
  // Validations
  // ---------------------------
  const validateObligationForm = useCallback(() => {
    const errors = {};
    if (!obligationForm.code?.trim()) errors.code = "Code is required";
    if (!obligationForm.description?.trim()) errors.description = "Description is required";

    const ssp = Number(obligationForm.standalone_selling_price);
    if (Number.isNaN(ssp) || ssp <= 0) errors.standalone_selling_price = "Standalone selling price must be > 0";

    if (obligationForm.satisfaction_type === "POINT_IN_TIME") {
      if (!obligationForm.satisfaction_date) errors.satisfaction_date = "Satisfaction date is required";
    } else {
      if (!obligationForm.start_date) errors.start_date = "Start date is required";
      if (!obligationForm.end_date) errors.end_date = "End date is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [obligationForm]);

  const validateScheduleForm = useCallback(() => {
    const errors = {};
    if (scheduleForm.mode === "FROM_DATE") {
      if (!scheduleForm.from_date) errors.from_date = "From date is required";
    } else {
      if (!scheduleForm.replace_confirm) errors.replace_confirm = "Confirm replace-all to continue";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [scheduleForm]);

  const validatePostForm = useCallback(() => {
    const errors = {};
    if (!postForm.period_id) errors.period_id = "Accounting period is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [postForm]);

  const validateCostForm = useCallback(() => {
    const errors = {};
    if (!costForm.description?.trim()) errors.description = "Description is required";

    const amt = Number(costForm.amount);
    if (Number.isNaN(amt) || amt <= 0) errors.amount = "Amount must be > 0";

    if (!costForm.amort_start_date) errors.amort_start_date = "Amort start date is required";
    if (!costForm.amort_end_date) errors.amort_end_date = "Amort end date is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [costForm]);

  // ---------------------------
  // Action handlers
  // ---------------------------
  const onActivate = () => {
    activateMutation.mutate({
      entry_date: activateForm.entry_date || undefined,
      memo: activateForm.memo || undefined,
    });
  };

  const onAddObligation = () => {
    if (!validateObligationForm()) return;

    addObligationMutation.mutate({
      code: obligationForm.code.trim(),
      description: obligationForm.description.trim(),
      standalone_selling_price: Number(obligationForm.standalone_selling_price),
      satisfaction_type: obligationForm.satisfaction_type,
      satisfaction_date:
        obligationForm.satisfaction_type === "POINT_IN_TIME" ? toDateOnly(obligationForm.satisfaction_date) : null,
      start_date: obligationForm.satisfaction_type === "OVER_TIME" ? toDateOnly(obligationForm.start_date) : null,
      end_date: obligationForm.satisfaction_type === "OVER_TIME" ? toDateOnly(obligationForm.end_date) : null,
    });
  };

  const onGenerateSchedule = () => {
    if (!validateScheduleForm()) return;

    if (scheduleForm.mode === "FROM_DATE") {
      generateScheduleMutation.mutate({ replace: false, from_date: toDateOnly(scheduleForm.from_date) });
    } else {
      generateScheduleMutation.mutate({ replace: true });
    }
  };

  const onPostRevenue = () => {
    if (!validatePostForm()) return;

    postRevenueMutation.mutate({
      period_id: postForm.period_id,
      entry_date: postForm.entry_date || undefined,
      memo: postForm.memo || undefined,
    });
  };

  const onCreateCost = () => {
    if (!validateCostForm()) return;

    createCostMutation.mutate({
      description: costForm.description.trim(),
      amount: Number(costForm.amount),
      amort_start_date: toDateOnly(costForm.amort_start_date),
      amort_end_date: toDateOnly(costForm.amort_end_date),
      asset_account_id: costForm.asset_account_id || null,
      amort_expense_account_id: costForm.amort_expense_account_id || null,
    });
  };

  // ---------------------------
  // Render states
  // ---------------------------
  if (contractQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Loading Contract..."
          subtitle="Please wait while we load the contract details"
          icon={FileText}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(-1)}>
              Back
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

  if (contractQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Error Loading Contract"
          subtitle="There was a problem loading the contract details"
          icon={FileText}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(-1)}>
              Back
            </Button>
          }
        />
        <ContentCard>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-sm font-medium text-slate-900">Failed to load contract</div>
            <div className="text-sm text-slate-500">{contractQuery.error?.response?.data?.message ?? "Unknown error"}</div>
            <Button variant="outline" onClick={() => contractQuery.refetch()} className="mt-2">
              Retry
            </Button>
          </div>
        </ContentCard>
      </div>
    );
  }

  // Data shaping: obligations might come embedded on contract
  const obligations = contract?.obligations ?? contract?.performance_obligations ?? [];
  const scheduleLines = scheduleQuery.data?.lines ?? scheduleQuery.data ?? [];
  const costs = costsQuery.data?.costs ?? costsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={contract?.code ?? "IFRS15 Contract"}
        subtitle={
          <div className="flex items-center gap-2 flex-wrap">
            {contract?.contract_date && (
              <>
                <Calendar className="h-4 w-4" />
                <span>Signed {formatDate(contract.contract_date)}</span>
              </>
            )}
            {contract?.transaction_price != null && (
              <>
                <span>·</span>
                <DollarSign className="h-4 w-4" />
                <span>{formatMoney(contract.transaction_price)}</span>
              </>
            )}
            {contract?.billing_policy && (
              <>
                <span>·</span>
                <FileText className="h-4 w-4" />
                <span>Billing: {contract.billing_policy}</span>
              </>
            )}
          </div>
        }
        icon={FileText}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button
              variant="outline"
              leftIcon={RefreshCw}
              onClick={() => {
                contractQuery.refetch();
                scheduleQuery.refetch();
                costsQuery.refetch();
              }}
            >
              Refresh
            </Button>
            {canActivate && (
              <Button
                onClick={() => setActivateOpen(true)}
                disabled={activateMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Activate
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
              <Badge
                tone={status === 'active' ? 'success' : status === 'draft' ? 'warning' : 'muted'}
                className="text-xs"
              >
                {status === 'active' ? <CheckCircle className="h-3 w-3 mr-1" /> : 
                 status === 'draft' ? <FileText className="h-3 w-3 mr-1" /> : 
                 <XCircle className="h-3 w-3 mr-1" />}
                {status.toUpperCase()}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className="text-sm font-medium text-slate-900 capitalize">{status}</p>
            </div>
          </div>
        </ContentCard>

        <ContentCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Tag className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Obligations</p>
              <p className="text-sm font-medium text-slate-900">{obligations.length}</p>
            </div>
          </div>
        </ContentCard>

        <ContentCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Layers className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Schedule Lines</p>
              <p className="text-sm font-medium text-slate-900">{scheduleLines.length}</p>
            </div>
          </div>
        </ContentCard>

        <ContentCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Receipt className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Costs</p>
              <p className="text-sm font-medium text-slate-900">{costs.length}</p>
            </div>
          </div>
        </ContentCard>
      </div>

      {/* Action Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {canAddObligation && (
          <ContentCard 
            className="p-4 hover:shadow-md transition-shadow cursor-pointer" 
            onClick={() => {
              setObligationOpen(true);
              setFormErrors({});
            }}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Plus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Add Obligation</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Add performance obligations
                </p>
              </div>
            </div>
          </ContentCard>
        )}

        {canGenerateSchedule && (
          <ContentCard 
            className="p-4 hover:shadow-md transition-shadow cursor-pointer" 
            onClick={() => {
              setScheduleOpen(true);
              setScheduleForm((s) => ({
                ...s,
                mode: "FROM_DATE",
                from_date: s.from_date || (contract?.contract_date ? String(contract.contract_date).slice(0, 10) : ""),
              }));
              setFormErrors({});
            }}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <RefreshCw className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Generate Schedule</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Create recognition schedule
                </p>
              </div>
            </div>
          </ContentCard>
        )}

        {canPostRevenue && (
          <ContentCard 
            className="p-4 hover:shadow-md transition-shadow cursor-pointer" 
            onClick={() => {
              setPostOpen(true);
              setFormErrors({});
            }}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Post Revenue</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Recognize revenue for period
                </p>
              </div>
            </div>
          </ContentCard>
        )}

        {canManageCosts && (
          <ContentCard 
            className="p-4 hover:shadow-md transition-shadow cursor-pointer" 
            onClick={() => {
              setCostOpen(true);
              setFormErrors({});
            }}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Receipt className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Add Cost</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Track contract costs
                </p>
              </div>
            </div>
          </ContentCard>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { value: 'overview', label: 'Overview', icon: Layers },
          { value: 'obligations', label: `Obligations (${obligations.length})`, icon: Tag },
          { value: 'schedule', label: `Schedule (${scheduleLines.length})`, icon: Calendar },
          { value: 'costs', label: `Costs (${costs.length})`, icon: Receipt },
        ]}
      />

      {/* Tab Content */}
      <ContentCard>
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Contract Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Customer/Partner</span>
                    <span className="font-medium text-slate-900">
                      {contract?.business_partner_name ?? contract?.customer_name ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Currency</span>
                    <span className="font-medium text-slate-900">{contract?.currency_code ?? "—"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Start Date</span>
                    <span className="font-medium text-slate-900">
                      {contract?.start_date ? formatDate(contract.start_date) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">End Date</span>
                    <span className="font-medium text-slate-900">
                      {contract?.end_date ? formatDate(contract.end_date) : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Obligations Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Count</span>
                    <span className="font-medium text-slate-900">{obligations.length}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Total SSP</span>
                    <span className="font-medium text-slate-900">
                      {formatMoney(
                        obligations.reduce((sum, o) => sum + Number(o?.standalone_selling_price ?? 0), 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Tip:</span> Use the tabs above to manage obligations, generate schedules, and post revenue.
              </p>
            </div>
          </div>
        )}

        {/* Obligations Tab */}
        {activeTab === "obligations" && (
          <div>
            <div className="mb-4 flex justify-end">
              {canAddObligation && (
                <Button
                  size="sm"
                  leftIcon={Plus}
                  onClick={() => {
                    setObligationOpen(true);
                    setFormErrors({});
                  }}
                >
                  Add Obligation
                </Button>
              )}
            </div>

            {obligations.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <div className="text-sm font-medium text-slate-900 mb-1">No obligations</div>
                <div className="text-sm text-slate-500 mb-4">
                  Add performance obligations to allocate revenue
                </div>
                {canAddObligation && (
                  <Button 
                    size="sm" 
                    leftIcon={Plus} 
                    onClick={() => {
                      setObligationOpen(true);
                      setFormErrors({});
                    }}
                  >
                    Add Obligation
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">SSP</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Timing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {obligations.map((obligation) => (
                      <tr key={obligation.id ?? obligation.code} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-900">{obligation.code ?? "—"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">{obligation.description ?? "—"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge tone="muted" className="text-xs">
                            {obligation.satisfaction_type === "POINT_IN_TIME" ? "Point in Time" : "Over Time"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-mono text-sm text-slate-700">
                              {obligation.standalone_selling_price != null 
                                ? formatMoney(obligation.standalone_selling_price) 
                                : "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">
                            {obligation.satisfaction_type === "POINT_IN_TIME" && obligation.satisfaction_date
                              ? `On ${formatDate(obligation.satisfaction_date)}`
                              : obligation.start_date || obligation.end_date
                                ? `${obligation.start_date ? formatDate(obligation.start_date) : "—"} → ${obligation.end_date ? formatDate(obligation.end_date) : "—"}`
                                : "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === "schedule" && (
          <div>
            <div className="mb-4 flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                leftIcon={RefreshCw}
                onClick={() => scheduleQuery.refetch()}
                disabled={scheduleQuery.isFetching}
              >
                Refresh
              </Button>
              {canGenerateSchedule && (
                <Button
                  size="sm"
                  leftIcon={RefreshCw}
                  onClick={() => {
                    setScheduleOpen(true);
                    setScheduleForm((s) => ({
                      ...s,
                      mode: "FROM_DATE",
                      from_date: s.from_date || (contract?.contract_date ? String(contract.contract_date).slice(0, 10) : ""),
                    }));
                    setFormErrors({});
                  }}
                >
                  Generate Schedule
                </Button>
              )}
            </div>

            {scheduleQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm text-slate-500">Loading schedule...</div>
              </div>
            ) : scheduleLines.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <div className="text-sm font-medium text-slate-900 mb-1">No schedule generated</div>
                <div className="text-sm text-slate-500 mb-4">
                  Activate the contract and generate schedule
                </div>
                {canGenerateSchedule && (
                  <Button 
                    size="sm" 
                    leftIcon={RefreshCw} 
                    onClick={() => {
                      setScheduleOpen(true);
                      setFormErrors({});
                    }}
                  >
                    Generate Schedule
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Recognition Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Period</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {scheduleLines.map((line, idx) => (
                      <tr key={line.id ?? idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-700">
                              {line.recognition_date ? formatDate(line.recognition_date) : "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">{line.period_id ?? "—"}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-mono text-sm text-slate-700">
                              {line.amount != null ? formatMoney(line.amount) : "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            tone={line.status === 'posted' ? 'success' : 'muted'}
                            className="inline-flex items-center gap-1.5"
                          >
                            {line.status === 'posted' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {line.status ?? 'scheduled'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Costs Tab */}
        {activeTab === "costs" && (
          <div>
            <div className="mb-4 flex justify-end">
              {canManageCosts && (
                <Button
                  size="sm"
                  leftIcon={Plus}
                  onClick={() => {
                    setCostOpen(true);
                    setFormErrors({});
                  }}
                >
                  Add Cost
                </Button>
              )}
            </div>

            {costsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm text-slate-500">Loading costs...</div>
              </div>
            ) : costs.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <div className="text-sm font-medium text-slate-900 mb-1">No costs</div>
                <div className="text-sm text-slate-500 mb-4">
                  Track contract costs
                </div>
                {canManageCosts && (
                  <Button 
                    size="sm" 
                    leftIcon={Plus} 
                    onClick={() => {
                      setCostOpen(true);
                      setFormErrors({});
                    }}
                  >
                    Add Cost
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Amort Period</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {costs.map((cost) => (
                      <tr key={cost.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-900">{cost.description ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-mono text-sm text-slate-700">
                              {cost.amount != null ? formatMoney(cost.amount) : "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">
                            {cost.amort_start_date && cost.amort_end_date
                              ? `${formatDate(cost.amort_start_date)} → ${formatDate(cost.amort_end_date)}`
                              : "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => genCostScheduleMutation.mutate({ costId: cost.id, body: {} })}
                              disabled={genCostScheduleMutation.isPending}
                            >
                              Generate Schedule
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                postCostMutation.mutate({
                                  costId: cost.id,
                                  body: { period_id: postForm.period_id || undefined, memo: postForm.memo || undefined },
                                })
                              }
                              disabled={postCostMutation.isPending}
                            >
                              Post
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </ContentCard>

      {/* Activate Modal */}
      <Modal
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
        title="Activate Contract"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Entry Date (Optional)"
              type="date"
              value={activateForm.entry_date}
              onChange={(e) => setActivateForm((s) => ({ ...s, entry_date: e.target.value }))}
              helperText="If blank, backend uses contract date"
              leftIcon={Calendar}
            />
            <Input
              label="Memo (Optional)"
              value={activateForm.memo}
              onChange={(e) => setActivateForm((s) => ({ ...s, memo: e.target.value }))}
              placeholder="Activation memo…"
              leftIcon={FileText}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setActivateOpen(false)}
            disabled={activateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={onActivate}
            loading={activateMutation.isPending}
            disabled={!canActivate}
          >
            Activate Contract
          </Button>
        </div>
      </Modal>

      {/* Add Obligation Modal */}
      <Modal
        open={obligationOpen}
        onClose={() => setObligationOpen(false)}
        title="Add Performance Obligation"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Code"
              value={obligationForm.code}
              onChange={(e) => setObligationForm((s) => ({ ...s, code: e.target.value }))}
              placeholder="e.g., PO-001"
              required
              error={formErrors.code}
              leftIcon={Tag}
            />
            <Input
              label="Standalone Selling Price"
              type="number"
              min="0"
              step="0.01"
              value={obligationForm.standalone_selling_price}
              onChange={(e) => setObligationForm((s) => ({ ...s, standalone_selling_price: e.target.value }))}
              placeholder="e.g., 1500"
              required
              error={formErrors.standalone_selling_price}
              leftIcon={DollarSign}
            />
          </div>

          <Input
            label="Description"
            value={obligationForm.description}
            onChange={(e) => setObligationForm((s) => ({ ...s, description: e.target.value }))}
            placeholder="Describe the promised good/service…"
            required
            error={formErrors.description}
            leftIcon={FileText}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Satisfaction Type"
              value={obligationForm.satisfaction_type}
              onChange={(e) => setObligationForm((s) => ({ ...s, satisfaction_type: e.target.value }))}
              options={[
                { value: "OVER_TIME", label: "Over Time" },
                { value: "POINT_IN_TIME", label: "Point in Time" }
              ]}
              leftIcon={Clock}
            />

            {obligationForm.satisfaction_type === "POINT_IN_TIME" ? (
              <Input
                label="Satisfaction Date"
                type="date"
                value={obligationForm.satisfaction_date}
                onChange={(e) => setObligationForm((s) => ({ ...s, satisfaction_date: e.target.value }))}
                required
                error={formErrors.satisfaction_date}
                leftIcon={Calendar}
              />
            ) : (
              <>
                <Input
                  label="Start Date"
                  type="date"
                  value={obligationForm.start_date}
                  onChange={(e) => setObligationForm((s) => ({ ...s, start_date: e.target.value }))}
                  required
                  error={formErrors.start_date}
                  leftIcon={Calendar}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={obligationForm.end_date}
                  onChange={(e) => setObligationForm((s) => ({ ...s, end_date: e.target.value }))}
                  required
                  error={formErrors.end_date}
                  leftIcon={Calendar}
                />
              </>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setObligationOpen(false)}
            disabled={addObligationMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={onAddObligation}
            loading={addObligationMutation.isPending}
            disabled={!canAddObligation}
            leftIcon={Plus}
          >
            Add Obligation
          </Button>
        </div>
      </Modal>

      {/* Generate Schedule Modal */}
      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Generate Schedule"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              Default option rebuilds only <span className="font-medium">unposted</span> lines forward from a date (safer). 
              Use Replace All only if you know what you're doing.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={scheduleForm.mode === "FROM_DATE"}
                onChange={() => setScheduleForm((s) => ({ ...s, mode: "FROM_DATE" }))}
                className="rounded border-slate-300"
              />
              Rebuild from date (recommended)
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={scheduleForm.mode === "REPLACE_ALL"}
                onChange={() => setScheduleForm((s) => ({ ...s, mode: "REPLACE_ALL" }))}
                className="rounded border-slate-300"
              />
              Replace all (danger)
            </label>
          </div>

          {scheduleForm.mode === "FROM_DATE" ? (
            <Input
              label="From Date"
              type="date"
              value={scheduleForm.from_date}
              onChange={(e) => setScheduleForm((s) => ({ ...s, from_date: e.target.value }))}
              error={formErrors.from_date}
              leftIcon={Calendar}
            />
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-red-600">
                Replace all can delete schedule history. Use only if you must rebuild everything.
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={scheduleForm.replace_confirm}
                  onChange={(e) => setScheduleForm((s) => ({ ...s, replace_confirm: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                I understand and want to replace all schedule lines
              </label>
              {formErrors.replace_confirm && (
                <p className="text-xs text-red-600">{formErrors.replace_confirm}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setScheduleOpen(false)}
            disabled={generateScheduleMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={onGenerateSchedule}
            loading={generateScheduleMutation.isPending}
            disabled={!canGenerateSchedule}
            leftIcon={RefreshCw}
          >
            Generate
          </Button>
        </div>
      </Modal>

      {/* Post Revenue Modal */}
      <Modal
        open={postOpen}
        onClose={() => setPostOpen(false)}
        title="Post Revenue"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Period"
              value={postForm.period_id}
              onChange={(e) => setPostForm((s) => ({ ...s, period_id: e.target.value }))}
              options={periodOptions}
              required
              error={formErrors.period_id}
              helperText="Accounting period"
            />
            <Input
              label="Entry Date (Optional)"
              type="date"
              value={postForm.entry_date}
              onChange={(e) => setPostForm((s) => ({ ...s, entry_date: e.target.value }))}
              helperText="If blank, defaults to period end"
              leftIcon={Calendar}
            />
          </div>

          <Input
            label="Memo (Optional)"
            value={postForm.memo}
            onChange={(e) => setPostForm((s) => ({ ...s, memo: e.target.value }))}
            placeholder="Posting memo…"
            leftIcon={FileText}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setPostOpen(false)}
            disabled={postRevenueMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={onPostRevenue}
            loading={postRevenueMutation.isPending}
            disabled={!canPostRevenue}
            leftIcon={DollarSign}
          >
            Post Revenue
          </Button>
        </div>
      </Modal>

      {/* Add Cost Modal */}
      <Modal
        open={costOpen}
        onClose={() => setCostOpen(false)}
        title="Add Contract Cost"
      >
        <div className="space-y-4">
          <Input
            label="Description"
            value={costForm.description}
            onChange={(e) => setCostForm((s) => ({ ...s, description: e.target.value }))}
            placeholder="e.g., Sales commission"
            required
            error={formErrors.description}
            leftIcon={Receipt}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Amount"
              type="number"
              min="0"
              step="0.01"
              value={costForm.amount}
              onChange={(e) => setCostForm((s) => ({ ...s, amount: e.target.value }))}
              placeholder="e.g., 250"
              required
              error={formErrors.amount}
              leftIcon={DollarSign}
            />
            <div className="text-xs text-slate-500 flex items-end pb-2">
              Leave account fields blank to use defaults (if configured in settings)
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Amort Start Date"
              type="date"
              value={costForm.amort_start_date}
              onChange={(e) => setCostForm((s) => ({ ...s, amort_start_date: e.target.value }))}
              required
              error={formErrors.amort_start_date}
              leftIcon={Calendar}
            />
            <Input
              label="Amort End Date"
              type="date"
              value={costForm.amort_end_date}
              onChange={(e) => setCostForm((s) => ({ ...s, amort_end_date: e.target.value }))}
              required
              error={formErrors.amort_end_date}
              leftIcon={Calendar}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Asset Account ID (Optional)"
              value={costForm.asset_account_id}
              onChange={(e) => setCostForm((s) => ({ ...s, asset_account_id: e.target.value }))}
              placeholder="Account id…"
              leftIcon={Layers}
            />
            <Input
              label="Amort Expense Account ID (Optional)"
              value={costForm.amort_expense_account_id}
              onChange={(e) => setCostForm((s) => ({ ...s, amort_expense_account_id: e.target.value }))}
              placeholder="Account id…"
              leftIcon={Receipt}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setCostOpen(false)}
            disabled={createCostMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={onCreateCost}
            loading={createCostMutation.isPending}
            leftIcon={Plus}
          >
            Add Cost
          </Button>
        </div>
      </Modal>
    </div>
  );
}