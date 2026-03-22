import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  Edit,
  Plus,
  Save,
  Trash2,
  Wallet,
  Clock,
  DollarSign,
  Settings,
  Eye,
} from "lucide-react";

import { useApi } from "../../../shared/hooks/useApi.js";
import { qk } from "../../../shared/query/keys.js";
import { makePaymentConfigApi } from "../api/paymentConfig.api.js";
import { makeCoaApi } from "../../accounting/chartOfAccounts/api/coa.api.js";
import { NONE_OPTION } from "../../../shared/utils/options.js";

import { Button } from "../../../shared/components/ui/Button.jsx";
import { Input } from "../../../shared/components/ui/Input.jsx";
import { Modal } from "../../../shared/components/ui/Modal.jsx";
import { useToast } from "../../../shared/components/ui/Toast.jsx";
import { Select } from "../../../shared/components/ui/Select.jsx";

export default function PaymentConfig() {
  const { http } = useApi();
  const api = useMemo(() => makePaymentConfigApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("terms");

  // ─── Queries ────────────────────────────────────────────────────────────────

  const {
    data: terms,
    isLoading: termsLoading,
    isError: termsError,
  } = useQuery({
    queryKey: qk.paymentTerms,
    queryFn: () => api.listPaymentTerms(),
  });

  const {
    data: methods,
    isLoading: methodsLoading,
    isError: methodsError,
  } = useQuery({
    queryKey: qk.paymentMethods,
    queryFn: () => api.listPaymentMethods(),
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: qk.paymentSettings,
    queryFn: () => api.getPaymentSettings(),
  });

  const { data: accountsRaw } = useQuery({
    queryKey: ["coa.accounts.list"],
    queryFn: async () => coaApi.list({ limit: 500 }),
    staleTime: 60_000,
  });

  const { data: paymentMethodsRaw } = useQuery({
    queryKey: qk.paymentMethods,
    queryFn: () => api.listPaymentMethods(),
    staleTime: 60_000,
  });

  // ─── Accounts map & options ─────────────────────────────────────────────────
  // Keys are indexed as strings since UUIDs are strings

  const accountsMap = useMemo(() => {
    if (!accountsRaw) return {};
    const accounts = Array.isArray(accountsRaw)
      ? accountsRaw
      : accountsRaw.data || [];
    return accounts.reduce((map, account) => {
      if (account.id) {
        map[account.id] = account;
      }
      return map;
    }, {});
  }, [accountsRaw]);

  const accountOptions = useMemo(() => {
    if (!accountsRaw) return [NONE_OPTION];
    const accounts = Array.isArray(accountsRaw)
      ? accountsRaw
      : accountsRaw.data || [];
    const opts = accounts.map((account) => ({
      value: account.id,
      label:
        `${account.code ?? ""} ${account.name ?? ""}`.trim() || account.id,
    }));
    return [NONE_OPTION, ...opts];
  }, [accountsRaw]);

  // ─── Payment methods map & options ──────────────────────────────────────────

  const paymentMethodsMap = useMemo(() => {
    if (!paymentMethodsRaw) return {};
    const list = Array.isArray(paymentMethodsRaw)
      ? paymentMethodsRaw
      : paymentMethodsRaw.data || [];
    return list.reduce((map, method) => {
      if (method.id) {
        map[method.id] = method;
      }
      return map;
    }, {});
  }, [paymentMethodsRaw]);

  const paymentMethodOptions = useMemo(() => {
    if (!paymentMethodsRaw) return [NONE_OPTION];
    const list = Array.isArray(paymentMethodsRaw)
      ? paymentMethodsRaw
      : paymentMethodsRaw.data || [];
    const opts = list.map((method) => ({
      value: method.id,
      label:
        `${method.name ?? ""} (${method.code ?? ""})`.trim() || method.id,
    }));
    return [NONE_OPTION, ...opts];
  }, [paymentMethodsRaw]);

  // ─── Modal / editing state ───────────────────────────────────────────────────

  const [termOpen, setTermOpen] = useState(false);
  const [termEditOpen, setTermEditOpen] = useState(false);
  const [methodEditOpen, setMethodEditOpen] = useState(false);
  const [editingTermId, setEditingTermId] = useState(null);
  const [editingMethodId, setEditingMethodId] = useState(null);

  const EMPTY_TERM = {
    name: "",
    net_days: 0,
    discount_days: null,
    discount_rate: null,
    isDefault: false,
    status: "active",
  };

  const [term, setTerm] = useState(EMPTY_TERM);
  const [termEdit, setTermEdit] = useState(EMPTY_TERM);
  const [methodEdit, setMethodEdit] = useState({
    name: "",
    code: "",
    description: "",
    status: "active",
  });

  // ─── Settings draft ──────────────────────────────────────────────────────────
  // The backend stores snake_case columns and returns them as-is from pg.
  // We map them to camelCase here so the rest of the UI is consistent.

  const normaliseSettings = (raw) => {
    if (!raw) return {};
    return {
      arUnappliedAccountId: raw.ar_unapplied_account_id || null,
      arDiscountAccountId: raw.ar_discount_account_id || null,
      apPrepaymentsAccountId: raw.ap_prepayments_account_id || null,
      apDiscountIncomeAccountId: raw.ap_discount_income_account_id || null,
      onlineCashAccountId: raw.online_cash_account_id || null,
      onlinePaymentMethodId: raw.online_payment_method_id || null,
    };
  };

  const [settingsDraft, setSettingsDraft] = useState({});
  React.useEffect(() => {
    if (settings) setSettingsDraft(normaliseSettings(settings));
  }, [settings]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const toNullIfEmpty = (v) => {
    if (v === null || v === undefined || String(v).trim() === "") return null;
    return v;
  };

  // Helper function for account select changes
  const handleAccountSelect = (field) => (e) => {
    const value = e.target.value;
    setSettingsDraft((s) => ({
      ...s,
      [field]: toNullIfEmpty(value),
    }));
  };

  // Helper function for payment method select changes
  const handlePaymentMethodSelect = (field) => (e) => {
    const value = e.target.value;
    setSettingsDraft((s) => ({
      ...s,
      [field]: toNullIfEmpty(value),
    }));
  };

  // Resolve an account regardless of whether the stored ID is a string or number
  const getAccountDisplay = (accountId) => {
    if (accountId == null || accountId === "") return null;
    const account = accountsMap[accountId];
    if (!account) return null;
    return {
      code: account.code || "N/A",
      name: account.name || "Unknown Account",
      fullName: `${account.code || ""} ${account.name || ""}`.trim(),
      id: account.id,
    };
  };

  const getPaymentMethodDisplay = (methodId) => {
    if (methodId == null || methodId === "") return null;
    const method = paymentMethodsMap[methodId];
    if (!method) return null;
    return {
      name: method.name || "Unknown Method",
      code: method.code || "N/A",
      fullName: `${method.name || ""} (${method.code || ""})`.trim(),
      id: method.id,
    };
  };

  // Build the payload sent to upsertPaymentSettings — must be UUID strings
  const settingsPayload = (draft) => ({
    arUnappliedAccountId: draft?.arUnappliedAccountId || null,
    arDiscountAccountId: draft?.arDiscountAccountId || null,
    apPrepaymentsAccountId: draft?.apPrepaymentsAccountId || null,
    apDiscountIncomeAccountId: draft?.apDiscountIncomeAccountId || null,
    onlineCashAccountId: draft?.onlineCashAccountId || null,
    onlinePaymentMethodId: draft?.onlinePaymentMethodId || null,
  });

  // ─── Normalise term rows from backend (snake_case → camelCase where needed) ──
  // The backend returns: is_default, net_days, discount_days, discount_rate
  // The frontend form uses: isDefault, net_days, discount_days, discount_rate

  const normaliseTerm = (t) => ({
    ...t,
    isDefault: t.is_default ?? t.isDefault ?? false,
    net_days: t.net_days ?? 0,
    discount_days: t.discount_days ?? null,
    discount_rate: t.discount_rate ?? null,
    status: t.status ?? "active",
  });

  const termsRows = React.useMemo(() => {
    if (!terms) return [];
    const arr = Array.isArray(terms) ? terms : (terms?.data ?? []);
    return arr.map(normaliseTerm);
  }, [terms]);

  const methodsRows = React.useMemo(() => {
    if (!methods) return [];
    return Array.isArray(methods) ? methods : (methods?.data ?? []);
  }, [methods]);

  // ─── Mutations ───────────────────────────────────────────────────────────────

  const createTerm = useMutation({
    mutationFn: (body) => api.createPaymentTerm(body),
    onSuccess: () => {
      toast.success("Payment term created");
      qc.invalidateQueries({ queryKey: qk.paymentTerms });
      setTermOpen(false);
      setTerm(EMPTY_TERM);
    },
    onError: (e) => toast.error(e?.message ?? "Failed to create"),
  });

  const updateTerm = useMutation({
    mutationFn: ({ id, body }) => api.updatePaymentTerm(id, body),
    onSuccess: () => {
      toast.success("Payment term updated");
      qc.invalidateQueries({ queryKey: qk.paymentTerms });
      setTermEditOpen(false);
      setEditingTermId(null);
    },
    onError: (e) => toast.error(e?.message ?? "Failed to update"),
  });

  const deleteTerm = useMutation({
    mutationFn: (id) => api.deletePaymentTerm(id),
    onSuccess: () => {
      toast.success("Payment term deleted");
      qc.invalidateQueries({ queryKey: qk.paymentTerms });
    },
    onError: (e) => toast.error(e?.message ?? "Failed to delete"),
  });

  const updateMethod = useMutation({
    mutationFn: ({ id, body }) => api.updatePaymentMethod(id, body),
    onSuccess: () => {
      toast.success("Payment method updated");
      qc.invalidateQueries({ queryKey: qk.paymentMethods });
      setMethodEditOpen(false);
      setEditingMethodId(null);
    },
    onError: (e) => toast.error(e?.message ?? "Failed to update"),
  });

  const deleteMethod = useMutation({
    mutationFn: (id) => api.deletePaymentMethod(id),
    onSuccess: () => {
      toast.success("Payment method deleted");
      qc.invalidateQueries({ queryKey: qk.paymentMethods });
    },
    onError: (e) => toast.error(e?.message ?? "Failed to delete"),
  });

  const saveSettings = useMutation({
    mutationFn: (body) => api.setPaymentSettings(body),
    onSuccess: () => {
      toast.success("Payment settings saved");
      qc.invalidateQueries({ queryKey: qk.paymentSettings });
    },
    onError: (e) => toast.error(e?.message ?? "Failed to save"),
  });

  const isLoading = termsLoading || methodsLoading || settingsLoading;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-surface-1 border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-text-strong">
                Payment Settings
              </h1>
              <p className="text-sm text-text-muted mt-0.5">
                Manage payment terms, methods, and accounting configurations
              </p>
            </div>
            {activeTab === "terms" && (
              <button
                onClick={() => setTermOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Payment Term
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-1 border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6">
            {[
              { key: "terms", label: "Payment Terms", icon: Clock },
              { key: "methods", label: "Payment Methods", icon: Wallet },
              { key: "settings", label: "Account Settings", icon: Settings },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors inline-flex items-center gap-2 ${
                  activeTab === key
                    ? "border-green-600 text-green-600"
                    : "border-transparent text-text-muted hover:text-text-strong hover:border-border-subtle"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle p-12 text-center">
            <div className="text-sm text-text-muted">
              Loading payment configuration...
            </div>
          </div>
        ) : termsError || methodsError ? (
          <div className="bg-surface-1 rounded-lg shadow-sm border border-red-200 p-12 text-center">
            <div className="text-sm text-red-600">
              {termsError
                ? "Failed to load payment terms"
                : "Failed to load payment methods"}
            </div>
          </div>
        ) : (
          <>
            {/* ── Payment Terms Tab ── */}
            {activeTab === "terms" && (
              <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle overflow-hidden">
                <div className="px-6 py-4 border-b border-border-subtle">
                  <h2 className="text-lg font-semibold text-text-strong">
                    Payment Terms
                  </h2>
                  <p className="text-sm text-text-muted mt-0.5">
                    Define standard payment terms for invoices and bills
                  </p>
                </div>

                <div className="p-6">
                  {termsRows.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="h-16 w-16 text-text-soft mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-text-strong mb-2">
                        No Payment Terms
                      </h3>
                      <p className="text-sm text-text-muted mb-4">
                        Get started by creating your first payment term
                      </p>
                      <button
                        onClick={() => setTermOpen(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                      >
                        Create Payment Term
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-border-subtle">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                              Term Name
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider">
                              Net Days
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider">
                              Discount Days
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider">
                              Discount Rate
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-text-muted uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                              Actions
                            </th>
                           </tr>
                        </thead>
                        <tbody className="bg-surface-1 divide-y divide-border-subtle">
                          {termsRows.map((t) => (
                            <tr
                              key={t.id ?? t.name}
                              className="hover:bg-surface-2 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-semibold text-text-strong">
                                    {t.name}
                                  </div>
                                  {t.isDefault && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      Default
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm text-text-strong">
                                  {t.net_days} days
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm text-text-muted">
                                  {t.discount_days
                                    ? `${t.discount_days} days`
                                    : "—"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm text-text-strong">
                                  {t.discount_rate != null
                                    ? `${Math.round(Number(t.discount_rate) * 100)}%`
                                    : "—"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                    t.status === "active"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-surface-2 text-text-strong"
                                  }`}
                                >
                                  {t.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingTermId(t.id);
                                      setTermEdit({
                                        name: t.name ?? "",
                                        net_days: t.net_days ?? 0,
                                        discount_days: t.discount_days ?? null,
                                        discount_rate: t.discount_rate ?? null,
                                        isDefault: t.isDefault ?? false,
                                        status: t.status ?? "active",
                                      });
                                      setTermEditOpen(true);
                                    }}
                                    disabled={!t.id}
                                    className="p-2 text-text-muted hover:text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!t.id) return;
                                      if (
                                        window.confirm(
                                          `Delete payment term "${t.name}"?`,
                                        )
                                      )
                                        deleteTerm.mutate(t.id);
                                    }}
                                    disabled={!t.id || deleteTerm.isPending}
                                    className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Payment Methods Tab ── */}
            {activeTab === "methods" && (
              <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle overflow-hidden">
                <div className="px-6 py-4 border-b border-border-subtle">
                  <h2 className="text-lg font-semibold text-text-strong">
                    Payment Methods
                  </h2>
                  <p className="text-sm text-text-muted mt-0.5">
                    Configure available payment methods for transactions
                  </p>
                </div>

                <div className="p-6">
                  {methodsRows.length === 0 ? (
                    <div className="text-center py-12">
                      <Wallet className="h-16 w-16 text-text-soft mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-text-strong mb-2">
                        No Payment Methods
                      </h3>
                      <p className="text-sm text-text-muted">
                        Payment methods are managed by your system administrator
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {methodsRows.map((m) => (
                        <div
                          key={m.id ?? m.code}
                          className="border border-border-subtle rounded-lg p-5 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <Wallet className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-text-strong">
                                  {m.name}
                                </div>
                                <div className="text-xs text-text-muted font-mono">
                                  {m.code}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                (m.status ?? "active") === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-surface-2 text-text-strong"
                              }`}
                            >
                              {m.status ?? "active"}
                            </span>
                          </div>

                          <p className="text-sm text-text-muted mb-4 min-h-[40px]">
                            {m.description || "No description"}
                          </p>

                          <div className="flex items-center gap-2 pt-3 border-t border-border-subtle">
                            <button
                              onClick={() => {
                                setEditingMethodId(m.id);
                                setMethodEdit({
                                  name: m.name ?? "",
                                  code: m.code ?? "",
                                  description: m.description ?? "",
                                  status: m.status ?? "active",
                                });
                                setMethodEditOpen(true);
                              }}
                              disabled={!m.id}
                              className="flex-1 px-3 py-2 text-sm font-medium text-text-body bg-surface-1 border border-border-subtle rounded-md hover:bg-surface-2 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (!m.id) return;
                                if (
                                  window.confirm(
                                    `Delete payment method "${m.name}"?`,
                                  )
                                )
                                  deleteMethod.mutate(m.id);
                              }}
                              disabled={!m.id || deleteMethod.isPending}
                              className="px-3 py-2 text-sm font-medium text-red-700 bg-surface-1 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Account Settings Tab ── */}
            {activeTab === "settings" && (
              <div className="bg-surface-1 rounded-lg shadow-sm border border-border-subtle overflow-hidden">
                <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-text-strong">
                      Account Mappings
                    </h2>
                    <p className="text-sm text-text-muted mt-0.5">
                      Configure default accounts for payment transactions
                    </p>
                  </div>
                  <Button
                    onClick={() =>
                      saveSettings.mutate(settingsPayload(settingsDraft))
                    }
                    disabled={saveSettings.isPending}
                    leftIcon={Save}
                  >
                    {saveSettings.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* AR Section */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <h3 className="text-sm font-semibold text-text-strong">
                          Accounts Receivable
                        </h3>
                      </div>

                      {/* AR Unapplied */}
                      <div className="p-4 rounded-lg">
                        <label className="block text-sm font-medium text-text-body mb-2">
                          Unapplied Receipts Account
                        </label>
                        <Select
                          value={settingsDraft?.arUnappliedAccountId ?? ""}
                          onChange={handleAccountSelect("arUnappliedAccountId")}
                          options={accountOptions}
                        />
                        <p className="text-xs text-text-muted mt-1">
                          Default account for customer receipts not yet applied
                          to invoices
                        </p>
                        {settingsDraft?.arUnappliedAccountId && (
                          <SelectedAccountPreview
                            label={
                              getAccountDisplay(
                                settingsDraft.arUnappliedAccountId,
                              )?.fullName
                            }
                          />
                        )}
                      </div>

                      {/* AR Discount */}
                      <div className="p-4 rounded-lg">
                        <label className="block text-sm font-medium text-text-body mb-2">
                          Early Payment Discount Account
                        </label>
                        <Select
                          value={settingsDraft?.arDiscountAccountId ?? ""}
                          onChange={handleAccountSelect("arDiscountAccountId")}
                          options={accountOptions}
                        />
                        <p className="text-xs text-text-muted mt-1">
                          Account for recording customer payment discounts
                        </p>
                        {settingsDraft?.arDiscountAccountId && (
                          <SelectedAccountPreview
                            label={
                              getAccountDisplay(
                                settingsDraft.arDiscountAccountId,
                              )?.fullName
                            }
                          />
                        )}
                      </div>
                    </div>

                    {/* AP Section */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <h3 className="text-sm font-semibold text-text-strong">
                          Accounts Payable
                        </h3>
                      </div>

                      {/* AP Prepayments */}
                      <div className="p-4 rounded-lg">
                        <label className="block text-sm font-medium text-text-body mb-2">
                          Prepayments Account
                        </label>
                        <Select
                          value={settingsDraft?.apPrepaymentsAccountId ?? ""}
                          onChange={handleAccountSelect("apPrepaymentsAccountId")}
                          options={accountOptions}
                        />
                        <p className="text-xs text-text-muted mt-1">
                          Default account for vendor prepayments
                        </p>
                        {settingsDraft?.apPrepaymentsAccountId && (
                          <SelectedAccountPreview
                            label={
                              getAccountDisplay(
                                settingsDraft.apPrepaymentsAccountId,
                              )?.fullName
                            }
                          />
                        )}
                      </div>

                      {/* AP Discount Income */}
                      <div className="p-4 rounded-lg">
                        <label className="block text-sm font-medium text-text-body mb-2">
                          Discount Income Account
                        </label>
                        <Select
                          value={settingsDraft?.apDiscountIncomeAccountId ?? ""}
                          onChange={handleAccountSelect("apDiscountIncomeAccountId")}
                          options={accountOptions}
                        />
                        <p className="text-xs text-text-muted mt-1">
                          Account for recording vendor payment discounts
                          received
                        </p>
                        {settingsDraft?.apDiscountIncomeAccountId && (
                          <SelectedAccountPreview
                            label={
                              getAccountDisplay(
                                settingsDraft.apDiscountIncomeAccountId,
                              )?.fullName
                            }
                          />
                        )}
                      </div>
                    </div>

                    {/* Online Payments Section */}
                    <div className="md:col-span-2 space-y-6 pt-6 border-t border-border-subtle">
                      <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                        <Wallet className="h-5 w-5 text-purple-600" />
                        <h3 className="text-sm font-semibold text-text-strong">
                          Online Payments
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Online Cash Account */}
                        <div className="p-4 rounded-lg">
                          <label className="block text-sm font-medium text-text-body mb-2">
                            Online Cash Account
                          </label>
                          <Select
                            value={settingsDraft?.onlineCashAccountId ?? ""}
                            onChange={handleAccountSelect("onlineCashAccountId")}
                            options={accountOptions}
                          />
                          <p className="text-xs text-text-muted mt-1">
                            Bank account for online payment deposits
                          </p>
                          {settingsDraft?.onlineCashAccountId && (
                            <SelectedAccountPreview
                              label={
                                getAccountDisplay(
                                  settingsDraft.onlineCashAccountId,
                                )?.fullName
                              }
                            />
                          )}
                        </div>

                        {/* Online Payment Method */}
                        <div className="p-4 rounded-lg">
                          <label className="block text-sm font-medium text-text-body mb-2">
                            Default Online Payment Method
                          </label>
                          <Select
                            value={settingsDraft?.onlinePaymentMethodId ?? ""}
                            onChange={handlePaymentMethodSelect("onlinePaymentMethodId")}
                            options={paymentMethodOptions}
                          />
                          <p className="text-xs text-text-muted mt-1">
                            Default method for online payment processing
                          </p>
                          {settingsDraft?.onlinePaymentMethodId && (
                            <SelectedAccountPreview
                              label={
                                getPaymentMethodDisplay(
                                  settingsDraft.onlinePaymentMethodId,
                                )?.fullName
                              }
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="md:col-span-2 mt-6 pt-6 border-t border-border-subtle">
                      <h3 className="text-sm font-semibold text-text-strong mb-4">
                        Current Configuration Summary
                      </h3>
                      <div className="rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <SummarySection
                            title="Accounts Receivable"
                            rows={[
                              {
                                label: "Unapplied Receipts",
                                value: getAccountDisplay(
                                  settingsDraft?.arUnappliedAccountId,
                                )?.fullName,
                              },
                              {
                                label: "Discount Account",
                                value: getAccountDisplay(
                                  settingsDraft?.arDiscountAccountId,
                                )?.fullName,
                              },
                            ]}
                          />
                          <SummarySection
                            title="Accounts Payable"
                            rows={[
                              {
                                label: "Prepayments Account",
                                value: getAccountDisplay(
                                  settingsDraft?.apPrepaymentsAccountId,
                                )?.fullName,
                              },
                              {
                                label: "Discount Income",
                                value: getAccountDisplay(
                                  settingsDraft?.apDiscountIncomeAccountId,
                                )?.fullName,
                              },
                            ]}
                          />
                          <div className="md:col-span-2 pt-4 border-t border-border-subtle">
                            <SummarySection
                              title="Online Payments"
                              rows={[
                                {
                                  label: "Cash Account",
                                  value: getAccountDisplay(
                                    settingsDraft?.onlineCashAccountId,
                                  )?.fullName,
                                },
                                {
                                  label: "Payment Method",
                                  value: getPaymentMethodDisplay(
                                    settingsDraft?.onlinePaymentMethodId,
                                  )?.fullName,
                                },
                              ]}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Create Payment Term Modal ── */}
      <Modal
        open={termOpen}
        onClose={() => setTermOpen(false)}
        title="New Payment Term"
      >
        <div className="space-y-4">
          <Input
            label="Term Name"
            placeholder="e.g., Net 30"
            value={term.name}
            onChange={(e) => setTerm((s) => ({ ...s, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Net Days"
              type="number"
              placeholder="30"
              value={term.net_days}
              onChange={(e) =>
                setTerm((s) => ({ ...s, net_days: Number(e.target.value) }))
              }
            />
            <Input
              label="Discount Days (Optional)"
              type="number"
              placeholder="10"
              value={term.discount_days ?? ""}
              onChange={(e) =>
                setTerm((s) => ({
                  ...s,
                  discount_days:
                    e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            />
          </div>
          <Input
            label="Discount Rate (Optional)"
            type="number"
            step="0.01"
            min="0"
            max="1"
            placeholder="0.02 (for 2%)"
            value={term.discount_rate ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "") {
                setTerm((s) => ({ ...s, discount_rate: null }));
                return;
              }

              let numValue = Number(value);

              // Clamp value between 0 and 1
              if (numValue < 0) numValue = 0;
              if (numValue > 1) numValue = 1;

              setTerm((s) => ({ ...s, discount_rate: numValue }));
            }}
            onBlur={(e) => {
              const value = e.target.value;
              if (value !== "") {
                let numValue = Number(value);
                // Round to 2 decimal places on blur
                numValue = Math.round(numValue * 100) / 100;
                // Clamp between 0 and 1
                if (numValue < 0) numValue = 0;
                if (numValue > 1) numValue = 1;
                setTerm((s) => ({ ...s, discount_rate: numValue }));
              }
            }}
            helperText="Enter a value between 0 and 1 (e.g., 0.02 for 2%)"
          />
          <label className="flex items-center gap-2 p-3 border border-border-subtle rounded-md cursor-pointer hover:bg-surface-2">
            <input
              type="checkbox"
              checked={term.isDefault}
              onChange={(e) =>
                setTerm((s) => ({ ...s, isDefault: e.target.checked }))
              }
              className="rounded border-border-subtle text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-text-body">
              Set as default payment term
            </span>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => setTermOpen(false)}
            className="px-4 py-2 text-sm font-medium text-text-body bg-surface-1 border border-border-subtle rounded-md hover:bg-surface-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              createTerm.mutate({
                name: term.name,
                netDays: term.net_days,
                discountDays: term.discount_days,
                discountRate: term.discount_rate,
                isDefault: term.isDefault,
                status: term.status,
              })
            }
            disabled={createTerm.isPending || !term.name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {createTerm.isPending ? "Creating..." : "Create Term"}
          </button>
        </div>
      </Modal>

      {/* ── Edit Payment Term Modal ── */}
      <Modal
        open={termEditOpen}
        onClose={() => {
          setTermEditOpen(false);
          setEditingTermId(null);
        }}
        title="Edit Payment Term"
      >
        <div className="space-y-4">
          <Input
            label="Term Name"
            value={termEdit.name}
            onChange={(e) =>
              setTermEdit((s) => ({ ...s, name: e.target.value }))
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Net Days"
              type="number"
              value={termEdit.net_days}
              onChange={(e) =>
                setTermEdit((s) => ({
                  ...s,
                  net_days: Number(e.target.value || 0),
                }))
              }
            />
            <Input
              label="Discount Days (Optional)"
              type="number"
              value={termEdit.discount_days ?? ""}
              onChange={(e) =>
                setTermEdit((s) => ({
                  ...s,
                  discount_days:
                    e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            />
          </div>
          <Input
            label="Discount Rate (Optional)"
            type="number"
            step="0.01"
            min="0"
            max="1"
            placeholder="0.02 (for 2%)"
            value={termEdit.discount_rate ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "") {
                setTermEdit((s) => ({ ...s, discount_rate: null }));
                return;
              }

              let numValue = Number(value);

              // Clamp value between 0 and 1
              if (numValue < 0) numValue = 0;
              if (numValue > 1) numValue = 1;

              setTermEdit((s) => ({ ...s, discount_rate: numValue }));
            }}
            onBlur={(e) => {
              const value = e.target.value;
              if (value !== "") {
                let numValue = Number(value);
                // Round to 2 decimal places on blur
                numValue = Math.round(numValue * 100) / 100;
                // Clamp between 0 and 1
                if (numValue < 0) numValue = 0;
                if (numValue > 1) numValue = 1;
                setTermEdit((s) => ({ ...s, discount_rate: numValue }));
              }
            }}
            helperText="Enter a value between 0 and 1 (e.g., 0.02 for 2%)"
          />
          <label className="flex items-center gap-2 p-3 border border-border-subtle rounded-md cursor-pointer hover:bg-surface-2">
            <input
              type="checkbox"
              checked={termEdit.isDefault}
              onChange={(e) =>
                setTermEdit((s) => ({ ...s, isDefault: e.target.checked }))
              }
              className="rounded border-border-subtle text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-text-body">
              Set as default payment term
            </span>
          </label>
          <div>
            <label className="block text-sm font-medium text-text-body mb-2">
              Status
            </label>
            <Select
              value={termEdit.status}
              onChange={(e) =>
                setTermEdit((s) => ({ ...s, status: e.target.value }))
              }
              options={[
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ]}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => {
              setTermEditOpen(false);
              setEditingTermId(null);
            }}
            className="px-4 py-2 text-sm font-medium text-text-body bg-surface-1 border border-border-subtle rounded-md hover:bg-surface-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              updateTerm.mutate({
                id: editingTermId,
                body: {
                  name: termEdit.name || undefined,
                  netDays: termEdit.net_days,
                  discountDays: termEdit.discount_days,
                  discountRate: termEdit.discount_rate,
                  isDefault: termEdit.isDefault,
                  status: termEdit.status || undefined,
                },
              })
            }
            disabled={
              updateTerm.isPending || !editingTermId || !termEdit.name.trim()
            }
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {updateTerm.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </Modal>

      {/* ── Edit Payment Method Modal ── */}
      <Modal
        open={methodEditOpen}
        onClose={() => {
          setMethodEditOpen(false);
          setEditingMethodId(null);
        }}
        title="Edit Payment Method"
      >
        <div className="space-y-4">
          <Input
            label="Method Name"
            value={methodEdit.name}
            onChange={(e) =>
              setMethodEdit((s) => ({ ...s, name: e.target.value }))
            }
          />
          <Input
            label="Code"
            value={methodEdit.code}
            onChange={(e) =>
              setMethodEdit((s) => ({ ...s, code: e.target.value }))
            }
          />
          <div>
            <label className="block text-sm font-medium text-text-body mb-2">
              Description
            </label>
            <textarea
              value={methodEdit.description}
              onChange={(e) =>
                setMethodEdit((s) => ({ ...s, description: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Describe this payment method..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-2">
              Status
            </label>
            <Select
              value={methodEdit.status}
              onChange={(e) =>
                setMethodEdit((s) => ({ ...s, status: e.target.value }))
              }
              options={[
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ]}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => {
              setMethodEditOpen(false);
              setEditingMethodId(null);
            }}
            className="px-4 py-2 text-sm font-medium text-text-body bg-surface-1 border border-border-subtle rounded-md hover:bg-surface-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              updateMethod.mutate({
                id: editingMethodId,
                body: {
                  name: methodEdit.name || undefined,
                  code: methodEdit.code || undefined,
                  description: methodEdit.description || undefined,
                  status: methodEdit.status || undefined,
                },
              })
            }
            disabled={
              updateMethod.isPending ||
              !editingMethodId ||
              !methodEdit.name.trim() ||
              !methodEdit.code.trim()
            }
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {updateMethod.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Small helper components ───────────────────────────────────────────────────

function SelectedAccountPreview({ label }) {
  return (
    <div className="mt-3 p-3 bg-surface-1 border border-border-subtle rounded-md">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-text-strong">
            {label || "Unknown Account"}
          </div>
          <div className="text-xs text-text-muted">Currently selected</div>
        </div>
        <Eye className="h-4 w-4 text-text-soft" />
      </div>
    </div>
  );
}

function SummarySection({ title, rows }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-text-body uppercase tracking-wider">
        {title}
      </h4>
      <div className="text-sm">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between py-1">
            <span className="text-text-muted">{label}:</span>
            <span className="font-medium text-text-strong">
              {value || "Not set"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}