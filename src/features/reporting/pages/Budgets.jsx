import React, { useMemo, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  PiggyBank,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  Info,
  Archive,
  PlayCircle,
  MoreVertical
} from "lucide-react";
import { Link } from "react-router-dom";

import { useApi } from "../../../shared/hooks/useApi.js";
import { makePlanningApi } from "../api/planning.api.js";
import { makeBankingApi } from "../../banking/api/banking.api.js";
import { PageHeader } from "../../../shared/components/layout/PageHeader.jsx";
import { ContentCard } from "../../../shared/components/layout/ContentCard.jsx";
import { DataTable } from "../../../shared/components/data/DataTable.jsx";
import { Button } from "../../../shared/components/ui/Button.jsx";
import { Modal } from "../../../shared/components/ui/Modal.jsx";
import { Input } from "../../../shared/components/ui/Input.jsx";
import { Select } from "../../../shared/components/ui/Select.jsx";
import { Badge } from "../../../shared/components/ui/Badge.jsx";
import { useToast } from "../../../shared/components/ui/Toast.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../shared/components/ui/DropdownMenu.jsx";

// Generate UUID v4 function (same as BillCreate)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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


export default function Budgets() {
  const { http } = useApi();
  const api = useMemo(() => makePlanningApi(http), [http]);
  const bankingApi = useMemo(() => makeBankingApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  // Modal and form state
  const [modalOpen, setModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [actionType, setActionType] = useState(null); // 'archive', 'activate'
  const [formData, setFormData] = useState({
    name: "",
    fiscalYear: new Date().getFullYear(),
    currencyCode: "GHS",
    status: "draft",
  });
  const [formErrors, setFormErrors] = useState({});
  const [showTopInfo, setShowTopInfo] = useState(false);
  const [showSetupInfo, setShowSetupInfo] = useState(false);

  // Fetch currencies from API
  const currenciesQuery = useQuery({
    queryKey: ["currencies.list"],
    queryFn: async () => bankingApi.listCurrencies(),
    staleTime: 30000,
    retry: 2,
  });

  // Get currency options from API response
  const currencyOptions = useMemo(() => {
    const options = [{ label: "Select currency", value: "" }];

    if (currenciesQuery.data) {
      const currencyRows = extractRows(currenciesQuery.data);

      currencyRows.forEach((c) => {
        options.push({
          value: c.code ?? c.currency_code,
          label:
            `${c.code ?? c.currency_code} — ${c.name ?? c.currency_name ?? ""}`.trim(),
        });
      });
    }

    if (options.length === 1) {
      options.push(
        { label: "GHS - Ghanaian Cedi", value: "GHS" },
        { label: "USD - US Dollar", value: "USD" },
        { label: "EUR - Euro", value: "EUR" },
        { label: "GBP - British Pound", value: "GBP" },
      );
    }

    return options;
  }, [currenciesQuery.data]);

  // Status options with all three statuses
  const statusOptions = useMemo(
    () => [
      { label: "Draft", value: "draft" },
      { label: "Active", value: "active" },
      { label: "Archived", value: "archived" },
    ],
    [],
  );

  // Fetch budgets
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["reporting", "budgets"],
    queryFn: () => api.budgets.list(),
    staleTime: 30000,
    retry: 2,
  });

  const rows = useMemo(() => extractRows(data), [data]);
  console.log("Budgets data:", data);
  console.log("Extracted rows:", rows);

  // Get status configuration
  const getStatusConfig = useCallback((status) => {
    const normalizedStatus = (status ?? "draft").toLowerCase();

    const configs = {
      active: { tone: "success", label: "Active", icon: PlayCircle },
      draft: { tone: "muted", label: "Draft", icon: FileText },
      archived: { tone: "warning", label: "Archived", icon: Archive },
    };

    return (
      configs[normalizedStatus] || { tone: "muted", label: status || "Draft", icon: FileText }
    );
  }, []);

  // Format fiscal year for display
  const formatFiscalYear = useCallback((year) => {
    if (!year) return "—";
    return `FY ${year}`;
  }, []);

  // Handle budget actions
  const handleActionClick = useCallback((budget, action) => {
    setSelectedBudget(budget);
    setActionType(action);
    setActionModalOpen(true);
  }, []);

  // Archive budget mutation
  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBudget) throw new Error("No budget selected");
      
      const idempotencyKey = generateUUID();
      
      const response = await api.budgets.archive(selectedBudget.id, { idempotencyKey });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Budget archived successfully");
      setActionModalOpen(false);
      setSelectedBudget(null);
      setActionType(null);
      qc.invalidateQueries({ queryKey: ["reporting", "budgets"] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? "Failed to archive budget";
      toast.error(message);
      console.error('Archive budget error:', err);
    },
  });

  // Activate budget mutation
  const activateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBudget) throw new Error("No budget selected");
      
      const idempotencyKey = generateUUID();
      console.log(`Activating budget ${selectedBudget.id} with key:`, idempotencyKey);
      
      const response = await api.budgets.activate(selectedBudget.id, { idempotencyKey });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Budget activated successfully");
      setActionModalOpen(false);
      setSelectedBudget(null);
      setActionType(null);
      qc.invalidateQueries({ queryKey: ["reporting", "budgets"] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? "Failed to activate budget";
      toast.error(message);
      console.error('Activate budget error:', err);
    },
  });

  // Table columns with actions
  const columns = useMemo(
    () => [
      {
        header: "Budget Name",
        accessor: "name",
        render: (row) => {
          const statusConfig = getStatusConfig(row.status);
          return (
            <Link
              to={`/planning/budgets/${row.id}`}
              className="group inline-flex items-center gap-2 font-medium text-brand-deep hover:text-brand-deep/80 transition-colors"
            >
              <PiggyBank className="h-4 w-4 text-slate-400" />
              <span>{row.name ?? row.id}</span>
              <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          );
        },
      },
      {
        header: "Fiscal Year",
        accessor: "fiscal_year",
        render: (row) => (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            {formatFiscalYear(row.fiscal_year ?? row.fiscalYear)}
          </div>
        ),
      },
      {
        header: "Currency",
        accessor: "currency_code",
        render: (row) => (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <DollarSign className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-mono">
              {row.currency_code ?? row.currencyCode ?? "—"}
            </span>
          </div>
        ),
      },
      {
        header: "Status",
        accessor: "status",
        render: (row) => {
          const statusConfig = getStatusConfig(row.status);
          return <Badge tone={statusConfig.tone}>{statusConfig.label}</Badge>;
        },
      },
      {
        header: "Actions",
        accessor: "id",
        render: (row) => {
          const statusConfig = getStatusConfig(row.status);
          
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {row.status === "draft" && (
                  <DropdownMenuItem onClick={() => handleActionClick(row, "activate")}>
                    <PlayCircle className="mr-2 h-4 w-4 text-green-600" />
                    <span>Activate Budget</span>
                  </DropdownMenuItem>
                )}
                {row.status !== "archived" && (
                  <DropdownMenuItem onClick={() => handleActionClick(row, "archive")}>
                    <Archive className="mr-2 h-4 w-4 text-amber-600" />
                    <span>Archive Budget</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to={`/planning/budgets/${row.id}`} className="flex items-center">
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
    [getStatusConfig, formatFiscalYear, handleActionClick],
  );

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Budget name is required";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Budget name must be at least 2 characters";
    }

    const year = Number(formData.fiscalYear);
    if (!year || isNaN(year)) {
      errors.fiscalYear = "Valid fiscal year is required";
    } else if (year < 2000 || year > 2100) {
      errors.fiscalYear = "Fiscal year must be between 2000 and 2100";
    }

    if (!formData.currencyCode.trim()) {
      errors.currencyCode = "Currency code is required";
    }

    if (!formData.status) {
      errors.status = "Status is required";
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
      name: "",
      fiscalYear: new Date().getFullYear(),
      currencyCode: currenciesQuery.data ? "" : "GHS",
      status: "draft",
    });
    setFormErrors({});
  }, [currenciesQuery.data]);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setFormData({
      name: "",
      fiscalYear: new Date().getFullYear(),
      currencyCode: currenciesQuery.data ? "" : "GHS",
      status: "draft",
    });
    setFormErrors({});
  }, [currenciesQuery.data]);

  const handleCloseActionModal = useCallback(() => {
    setActionModalOpen(false);
    setSelectedBudget(null);
    setActionType(null);
  }, []);

  // Create budget mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!validateForm()) {
        throw new Error("Please fix validation errors");
      }

      // Generate fresh idempotency key for each mutation attempt
      const idempotencyKey = generateUUID();
      console.log('Using idempotency key for budget creation:', idempotencyKey);

      // Call the API with idempotency key
      const response = await api.budgets.create({
        name: formData.name.trim(),
        fiscalYear: Number(formData.fiscalYear),
        currencyCode: formData.currencyCode.trim().toUpperCase(),
        status: formData.status,
      }, { idempotencyKey });

      // Return the full response data
      return response.data;
    },
    onSuccess: (responseData) => {
      toast.success("Budget created successfully");
      handleCloseModal();
      qc.invalidateQueries({ queryKey: ["reporting", "budgets"] });
    },
    onError: (err) => {
      const message = err?.response?.data?.message ?? err?.message ?? "Failed to create budget";
      toast.error(message);
      console.error('Create budget error:', err);
    },
  });

  const handleCreateBudget = useCallback(() => {
    // Validate required fields before submission
    if (!formData.name.trim()) {
      toast.error('Please enter a budget name');
      return;
    }
    
    if (!formData.fiscalYear) {
      toast.error('Please enter a fiscal year');
      return;
    }
    
    if (!formData.currencyCode) {
      toast.error('Please select a currency');
      return;
    }
    
    if (!formData.status) {
      toast.error('Please select a status');
      return;
    }

    // Submit with fresh idempotency key
    createMutation.mutate();
  }, [createMutation, formData, toast]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const isFormValid =
    formData.name.trim() &&
    formData.fiscalYear &&
    formData.currencyCode &&
    formData.status;

  // Get action modal content
  const getActionModalContent = useCallback(() => {
    if (!selectedBudget || !actionType) return null;

    const isArchiving = actionType === "archive";
    const isActivating = actionType === "activate";
    const isPending = isArchiving ? archiveMutation.isPending : activateMutation.isPending;

    return {
      title: isArchiving ? "Archive Budget" : "Activate Budget",
      description: isArchiving 
        ? `Are you sure you want to archive "${selectedBudget.name || selectedBudget.id}"?`
        : `Are you sure you want to activate "${selectedBudget.name || selectedBudget.id}"?`,
      warning: isArchiving 
        ? "Archived budgets become read-only and cannot be modified."
        : "Active budgets can be used for actual tracking and reporting.",
      confirmText: isArchiving ? "Archive" : "Activate",
      confirmVariant: isArchiving ? "warning" : "success",
      onConfirm: isArchiving ? archiveMutation.mutate : activateMutation.mutate,
      isPending,
    };
  }, [selectedBudget, actionType, archiveMutation, activateMutation]);

  const actionContent = getActionModalContent();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Budgets"
          subtitle="Create budgets, versions, and detailed period lines with dimensions"
          icon={PiggyBank}
          actions={
            <Button leftIcon={Plus} onClick={handleOpenModal}>
              New Budget
            </Button>
          }
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading budgets...</div>
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
          title="Budgets"
          subtitle="Create budgets, versions, and detailed period lines with dimensions"
          icon={PiggyBank}
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
                New Budget
              </Button>
            </div>
          }
        />
        <ContentCard>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-sm font-medium text-slate-900">
              Failed to load budgets
            </div>
            <div className="text-sm text-slate-500">
              {error?.message ?? "An error occurred"}
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
        title="Budgets"
        subtitle="Create budgets, versions, and detailed period lines with dimensions"
        icon={PiggyBank}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={RefreshCw}
              onClick={handleRefresh}
              loading={isFetching && !isLoading}
              aria-label="Refresh budgets"
            >
              Refresh
            </Button>
            <Button
              leftIcon={Plus}
              onClick={handleOpenModal}
              aria-label="Create new budget"
            >
              New Budget
            </Button>
          </div>
        }
      />
      <ContentCard>
        <div className="mb-4">
          <div className="text-base font-semibold text-slate-900">
            Budget List
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {rows.length} {rows.length === 1 ? "budget" : "budgets"} configured
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          empty={{
            title: "No budgets yet",
            description:
              "Create your first budget to begin financial planning and tracking.",
          }}
          aria-label="Budgets table"
        />
      </ContentCard>

      {/* Create Budget Modal */}
      <Modal
        open={modalOpen}
        title="Create New Budget"
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
              onClick={handleCreateBudget}
              disabled={
                createMutation.isPending ||
                !isFormValid ||
                currenciesQuery.isLoading
              }
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? "Creating..." : "Create Budget"}
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
              <span>Budget creation info</span>
              <ChevronRight className={`h-4 w-4 transition-transform ${showTopInfo ? 'rotate-90' : ''}`} />
            </button>
            
            {showTopInfo && (
              <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <PiggyBank className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <div className="font-medium mb-1">
                      Create a financial budget
                    </div>
                    <div className="text-blue-700">
                      Set up a budget for a fiscal year with detailed period
                      tracking and dimensional analysis.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Budget Name"
                placeholder="e.g., 2024 Annual Budget, Q1 Operating Budget"
                value={formData.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                error={formErrors.name}
                leftIcon={FileText}
                aria-label="Budget name"
              />
            </div>

            <div>
              <Input
                label="Fiscal Year"
                type="number"
                min="2000"
                max="2100"
                placeholder="e.g., 2024"
                value={formData.fiscalYear}
                onChange={(e) =>
                  handleFieldChange("fiscalYear", e.target.value)
                }
                error={formErrors.fiscalYear}
                leftIcon={Calendar}
                aria-label="Fiscal year"
              />
            </div>

            <div>
              <Select
                label="Currency"
                value={formData.currencyCode}
                onChange={(e) =>
                  handleFieldChange("currencyCode", e.target.value)
                }
                options={currencyOptions}
                error={formErrors.currencyCode}
                aria-label="Currency code"
                loading={currenciesQuery.isLoading}
                disabled={currenciesQuery.isLoading}
                helpText={
                  currenciesQuery.isLoading ? "Loading currencies..." : ""
                }
              />
            </div>

            <div className="md:col-span-2">
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) => handleFieldChange("status", e.target.value)}
                options={statusOptions}
                error={formErrors.status}
                aria-label="Budget status"
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
              <span>Budget setup details</span>
              <ChevronRight className={`h-4 w-4 transition-transform ${showSetupInfo ? 'rotate-90' : ''}`} />
            </button>
            
            {showSetupInfo && (
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-medium text-slate-700 mb-2">
                  Budget Setup
                </div>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    <span>
                      Budget will be created with the specified fiscal year and
                      currency
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    <span>
                      You can add versions and period lines after creation
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    <span>
                      <span className="font-medium">Draft:</span> Editable, can be activated
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    <span>
                      <span className="font-medium">Active:</span> Used for tracking, can be archived
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    <span>
                      <span className="font-medium">Archived:</span> Read-only, historical reference
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Action Confirmation Modal (Archive/Activate) */}
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
                  actionContent.confirmVariant === "warning"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {actionContent.isPending ? `${actionContent.confirmText}...` : actionContent.confirmText}
              </Button>
            </div>
          }
        >
          <div className="px-6 py-5">
            <div className="flex items-start gap-3">
              {actionType === "archive" ? (
                <Archive className="h-6 w-6 text-amber-600 flex-shrink-0" />
              ) : (
                <PlayCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              )}
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