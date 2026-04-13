import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  DollarSign,
  FileMinus2,
} from "lucide-react";

import { useApi } from "../../../shared/hooks/useApi.js";
import { qk } from "../../../shared/query/keys.js";
import { makeBillsApi } from "../api/bills.api.js";
import { makeDebitNotesApi } from "../api/debitNotes.api.js";
import { formatDate } from "../../../shared/utils/formatDate.js";
import { Button } from "../../../shared/components/ui/Button.jsx";
import { Modal } from "../../../shared/components/ui/Modal.jsx";
import { Input } from "../../../shared/components/ui/Input.jsx";
import { TransactionWorkflowActionBar } from "../components/TransactionWorkflowActionBar.jsx";
import { normalizeTransactionWorkflow } from "../workflow/normalizeTransactionWorkflow.js";
import { resolveTransactionActions } from "../workflow/resolveTransactionActions.js";
import { Textarea } from "../../../shared/components/ui/Textarea.jsx";
import { useToast } from "../../../shared/components/ui/Toast.jsx";
import { JsonPanel } from "../../../shared/components/data/JsonPanel.jsx";
import { ROUTES } from "../../../app/constants/routes.js";
import { getDocumentSettlementBasis, getDocumentWithholding } from "../utils/documentDisplay.js";

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeBillsApi(http), [http]);
  const debitNotesApi = useMemo(() => makeDebitNotesApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: qk.bill(id),
    queryFn: () => api.get(id),
  });
  
  const billData = data?.data ?? data;
  const bill = billData?.bill || billData;
  const lines = billData?.lines || [];
  
  // FIX: Get paid and outstanding from the correct locations
  // The backend returns paid, debitApplied, and outstanding at root level
  const paid = billData?.paid ?? billData?.allocations_summary?.paid ?? 0;
  const debitApplied = billData?.debitApplied ?? billData?.allocations_summary?.debit_applied ?? 0;
  const outstanding = billData?.outstanding ?? billData?.allocations_summary?.outstanding ?? bill?.total ?? 0;
  
  const vendorId = bill?.vendor_id || bill?.vendorId;

  const debitNotesQ = useQuery({
    queryKey: ["debitNotes", { vendorId }],
    queryFn: () => debitNotesApi.list({ vendorId, limit: 200 }),
    enabled: !!vendorId,
  });

  const einvoiceQ = useQuery({
    queryKey: ["bill", id, "einvoicePreview"],
    queryFn: () => api.getEinvoicePreview(id),
    enabled: !!id,
  });
  
  const filingStatusQ = useQuery({
    queryKey: ["bill", id, "filingStatus"],
    queryFn: () => api.getFilingStatus(id),
    enabled: !!id,
  });

  const [comment, setComment] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [action, setAction] = useState(null);
  const [noteAmounts, setNoteAmounts] = useState({});

  const run = useMutation({
    mutationFn: async () => {
      const idempotencyKey = generateUUID();
      if (action === "submit")
        return api.submitForApproval(id, { idempotencyKey });
      if (action === "approve")
        return api.approve(id, { comment }, { idempotencyKey });
      if (action === "reject")
        return api.reject(id, { comment }, { idempotencyKey });
      if (action === "issue") return api.issue(id, { idempotencyKey });
      if (action === "void")
        return api.void(id, { reason: voidReason }, { idempotencyKey });
      throw new Error("Unknown action");
    },
    onSuccess: () => {
      toast.success("Action completed successfully");
      qc.invalidateQueries({ queryKey: qk.bill(id) });
      setAction(null);
      setComment("");
      setVoidReason("");
    },
    onError: (e) => toast.error(e?.message ?? "Action failed"),
  });

  const applyDebitNote = useMutation({
    mutationFn: async ({ debitNoteId, amount }) => {
      const idempotencyKey = generateUUID();
      return debitNotesApi.apply(
        debitNoteId,
        { billId: id, amountApplied: amount },
        { idempotencyKey },
      );
    },
    onSuccess: () => {
      toast.success("Debit note applied successfully");
      // Invalidate all related queries to ensure fresh data
      qc.invalidateQueries({ queryKey: qk.bill(id) });
      qc.invalidateQueries({ queryKey: ["bill", id] });
      qc.invalidateQueries({ queryKey: qk.debitNotes() });
      qc.invalidateQueries({ queryKey: ["debitNotes", { vendorId }] });
      qc.invalidateQueries({ queryKey: ["debitNotes"] });
      // Reset the note amounts
      setNoteAmounts({});
    },
    onError: (e) =>
      toast.error(
        e?.response?.data?.error ?? e?.message ?? "Failed to apply debit note",
      ),
  });

  const workflowState = normalizeTransactionWorkflow({
    type: "bill",
    entity: bill,
    payload: billData,
  });
  const status =
    workflowState.businessStatus || bill?.workflow_status || "draft";
  const availableActions = resolveTransactionActions({
    type: "bill",
    state: workflowState,
  });

  const statusColors = {
    paid: "bg-green-100 text-green-800 border-green-200",
    issued: "bg-blue-100 text-blue-800 border-blue-200",
    voided: "bg-red-100 text-red-800 border-red-200",
    draft: "bg-amber-100 text-amber-800 border-amber-200",
    pending: "bg-purple-100 text-purple-800 border-purple-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    partial: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  const currency = bill?.currency_code || "GHS";
  const formatCurrency = (amount) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount || 0);
  };

  const subtotal = bill?.subtotal ? parseFloat(bill.subtotal) : 0;
  const taxTotal = bill?.tax_total ? parseFloat(bill.tax_total) : 0;
  const total = bill?.total ? parseFloat(bill.total) : 0;
  const withholdingTotal = getDocumentWithholding(bill, 'bill') ?? 0;
  const settlementBasisTotal = getDocumentSettlementBasis(bill, 'bill') ?? total;
  const paidAmount = typeof paid === "string" ? parseFloat(paid) : paid;
  const debitAppliedAmount = typeof debitApplied === "string" ? parseFloat(debitApplied) : debitApplied;
  const outstandingAmount = typeof outstanding === "string" ? parseFloat(outstanding) : outstanding;

  const debitNotesRaw = Array.isArray(debitNotesQ.data)
    ? debitNotesQ.data
    : (debitNotesQ.data?.data ?? []);
  
  const availableDebitNotes = debitNotesRaw.filter((note) => {
    const noteVendorId = note.vendor_id || note.vendorId;
    const noteStatus = (
      note.status ||
      note.workflow_status ||
      ""
    ).toLowerCase();
    const remainingRaw =
      note.balance?.remaining ??
      note.balance?.remaining_amount ??
      note.remaining_amount ??
      note.remaining ??
      note.unapplied_amount ??
      note.detail_meta?.totals?.unapplied_amount ??
      note.balance_remaining ??
      note.total;
    const remaining =
      typeof remainingRaw === "string"
        ? parseFloat(remainingRaw)
        : Number(remainingRaw || 0);
    return (
      (!vendorId || noteVendorId === vendorId) &&
      remaining > 0 &&
      !["draft", "voided", "rejected"].includes(noteStatus)
    );
  });
  
  const canApplyDebits =
    ["issued", "approved", "partial", "paid"].includes(
      String(status).toLowerCase(),
    ) && outstandingAmount > 0;

  // Debug logging to help troubleshoot
  console.log("Bill Data:", { paid, debitApplied, outstanding, total, status });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-7 w-7 text-gray-700" />
                <h1 className="text-2xl font-bold text-gray-900">
                  {bill?.bill_no || (isLoading ? "Loading..." : "Bill")}
                </h1>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusColors[status] || statusColors.draft}`}
                >
                  {status?.charAt(0).toUpperCase() + status?.slice(1) ||
                    "Draft"}
                </span>
              </div>
              <p className="text-sm text-gray-600">Bill ID: {id}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="border-gray-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>

        <TransactionWorkflowActionBar
          actions={availableActions}
          onAction={setAction}
          documentType="bill"
          documentId={id}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-5">
                Bill Summary
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">
                      Vendor ID
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {vendorId || "—"}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">
                      Dates
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatDate(bill?.bill_date)} → {formatDate(bill?.due_date)}
                  </div>
                </div>
                {bill?.memo && (
                  <div className="md:col-span-2 rounded-lg border border-gray-200 p-4">
                    <div className="text-xs font-medium text-gray-500 mb-2">
                      Memo
                    </div>
                    <div className="text-sm text-gray-700">{bill.memo}</div>
                  </div>
                )}
                <div className="md:col-span-2 rounded-lg border border-gray-200 p-4">
                  <div className="text-xs font-medium text-gray-500 mb-2">
                    Timeline
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>Created: {formatDate(bill?.created_at)}</div>
                    {bill?.submitted_at && (
                      <div>Submitted: {formatDate(bill.submitted_at)}</div>
                    )}
                    {bill?.approved_at && (
                      <div>Approved: {formatDate(bill.approved_at)}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">
                  Line Items
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Tax Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Tax Rate
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Tax Amount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {lines.map((line, idx) => {
                      const quantity = line.quantity
                        ? parseFloat(line.quantity)
                        : 1;
                      const unitPrice = line.unit_price
                        ? parseFloat(line.unit_price)
                        : 0;
                      const lineTotal = line.line_total
                        ? parseFloat(line.line_total)
                        : 0;
                      const taxAmount = line.tax_amount
                        ? parseFloat(line.tax_amount)
                        : 0;
                      const taxRate = line.taxes?.[0]?.tax_rate
                        ? parseFloat(line.taxes[0].tax_rate)
                        : 0;
                      return (
                        <tr key={line.id || idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {line.line_no || idx + 1}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {line.description || "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {quantity}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {formatCurrency(unitPrice)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs">
                              <div className="font-mono text-gray-600">
                                {line.account_code || "—"}
                              </div>
                              <div className="text-gray-500">
                                {line.account_name || "—"}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-700">
                            {line.tax_code_code || line.tax_code?.code || "—"}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-700">
                            {taxRate}%
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 text-right">
                            {formatCurrency(taxAmount)}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                            {formatCurrency(lineTotal + taxAmount)}
                          </td>
                        </tr>
                      );
                    })}
                    {!lines.length && (
                      <tr>
                        <td
                          className="px-6 py-12 text-center text-sm text-gray-500"
                          colSpan={9}
                        >
                          No line items
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {lines.length > 0 && (
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-4 text-right text-sm font-semibold text-gray-900"
                        >
                          Subtotal:
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(subtotal)}
                        </td>
                        <td className="px-6 py-4"></td>
                      </tr>
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-4 text-right text-sm font-semibold text-gray-900"
                        >
                          Tax Total:
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                          {formatCurrency(taxTotal)}
                        </td>
                        <td className="px-6 py-4"></td>
                      </tr>
                      <tr className="border-t border-gray-200">
                        <td
                          colSpan={7}
                          className="px-6 py-4 text-right text-base font-bold text-gray-900"
                        >
                          Total:
                        </td>
                        <td className="px-6 py-4 text-right text-lg font-bold text-gray-900">
                          {formatCurrency(total)}
                        </td>
                        <td className="px-6 py-4"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h3 className="text-base font-semibold text-gray-900">
                  Bill Total
                </h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-6">
                {formatCurrency(total)}
              </div>
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[status] || statusColors.draft}`}
                  >
                    {status?.charAt(0).toUpperCase() + status?.slice(1) ||
                      "Draft"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Currency</span>
                  <span className="font-medium text-gray-900">{currency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Line Items</span>
                  <span className="font-medium text-gray-900">
                    {lines.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Paid (Cash)</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Debit Notes Applied</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(debitAppliedAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                  <span className="text-gray-600 font-semibold">Total Paid</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(paidAmount + debitAppliedAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Outstanding</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(outstandingAmount)}
                  </span>
                </div>
              </div>
              {withholdingTotal > 0 ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Vendor payments settle the net payable only. The withheld portion should be remitted later from the withholding workspace.
                  <div className="mt-3">
                    <Button variant="outline" onClick={() => navigate(ROUTES.accountingTaxWithholding)}>Open withholding workspace</Button>
                  </div>
                </div>
              ) : null}
              <div className="mt-4 grid gap-2">
                <Button
                  onClick={() => navigate(ROUTES.vendorPaymentNew)}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={outstandingAmount <= 0}
                >
                  Pay Vendor
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(ROUTES.debitNoteNew)}
                  className="border-gray-300"
                >
                  New Debit Note
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileMinus2 className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-semibold text-gray-900">
                  Apply Debit Note
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Use issued debit notes to reduce this bill without creating a
                cash payment.
              </p>
              {!canApplyDebits ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                  Debit notes can be applied only when the bill is issued and
                  still has an outstanding balance.
                </div>
              ) : debitNotesQ.isLoading ? (
                <div className="text-sm text-gray-500">
                  Loading debit notes...
                </div>
              ) : availableDebitNotes.length === 0 ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                    No available debit notes for this vendor.
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate(ROUTES.debitNoteNew)}
                    className="border-gray-300 w-full"
                  >
                    Create Debit Note
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableDebitNotes.map((note) => {
                    const remaining = Number(
                      note.balance?.remaining ??
                        note.remaining_amount ??
                        note.remaining ??
                        note.unapplied_amount ??
                        note.balance_remaining ??
                        note.total ??
                        0,
                    );
                    const noteNo = note.debit_note_no || note.code || note.id;
                    const suggested = Math.min(
                      remaining,
                      Math.max(0, outstandingAmount),
                    );
                    const amount = noteAmounts[note.id] ?? suggested;
                    return (
                      <div
                        key={note.id}
                        className="rounded-lg border border-gray-200 p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {noteNo}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Remaining: {formatCurrency(remaining)}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(ROUTES.debitNoteDetail(note.id))
                            }
                            className="border-gray-300"
                          >
                            Open
                          </Button>
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={amount}
                          onChange={(e) =>
                            setNoteAmounts((prev) => ({
                              ...prev,
                              [note.id]: e.target.value,
                            }))
                          }
                        />
                        <Button
                          onClick={() =>
                            applyDebitNote.mutate({
                              debitNoteId: note.id,
                              amount: Number(amount) || 0,
                            })
                          }
                          disabled={
                            applyDebitNote.isPending ||
                            !(Number(amount) > 0) ||
                            Number(amount) > remaining ||
                            Number(amount) > outstandingAmount
                          }
                          className="bg-green-600 hover:bg-green-700 w-full"
                        >
                          Apply to Bill
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Tax Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax Total</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(taxTotal)}
                  </span>
                </div>
                {lines.map((line, idx) => {
                  const taxBreakdown = line.tax_breakdown;
                  if (taxBreakdown?.components?.length) {
                    return taxBreakdown.components.map((comp, compIdx) => (
                      <div
                        key={`${idx}-${compIdx}`}
                        className="flex justify-between pl-4 text-xs"
                      >
                        <span className="text-gray-500">
                          {comp.tax_code_meta?.code || comp.tax_type} (
                          {comp.tax_rate}%)
                        </span>
                        <span className="text-gray-600">
                          {formatCurrency(comp.tax_amount)}
                        </span>
                      </div>
                    ));
                  }
                  return null;
                })}
                <div className="flex justify-between">
                  <span className="text-gray-600">Withholding</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(withholdingTotal)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                  <span className="font-semibold text-gray-900">Gross total</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Settlement basis</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(settlementBasisTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                E-invoicing Status
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-medium text-gray-900">
                    {filingStatusQ.data?.status ??
                      filingStatusQ.data?.state ??
                      "Not available"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Scheme:</span>
                  <span className="font-medium text-gray-900">
                    {einvoiceQ.data?.scheme ??
                      einvoiceQ.data?.documentType ??
                      "—"}
                  </span>
                </div>
              </div>
              {einvoiceQ.data && Object.keys(einvoiceQ.data).length > 0 && (
                <div className="mt-4">
                  <JsonPanel title="E-invoice payload" value={einvoiceQ.data} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        title={
          action === "submit"
            ? "Submit for Approval"
            : action === "approve"
              ? "Approve Bill"
              : action === "reject"
                ? "Reject Bill"
                : action === "issue"
                  ? "Issue Bill"
                  : action === "void"
                    ? "Void Bill"
                    : "Action"
        }
      >
        <div className="space-y-4">
          {(action === "approve" || action === "reject") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment {action === "reject" ? "(recommended)" : "(optional)"}
              </label>
              <Textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={`Add a ${action === "reject" ? "reason for rejection" : "comment"}...`}
              />
            </div>
          )}
          {action === "void" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                rows={4}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Explain why this bill is being voided..."
              />
            </div>
          )}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This action will be processed with a unique
              idempotency key to prevent duplicate submissions.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setAction(null)}
            className="border-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={() => run.mutate()}
            disabled={
              run.isPending || (action === "void" && !voidReason.trim())
            }
            className={
              action === "void"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }
          >
            {run.isPending ? "Processing..." : "Confirm"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}