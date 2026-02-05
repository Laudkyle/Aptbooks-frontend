import React, { useMemo, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FilePlus2, Plus, AlertCircle } from "lucide-react";
import { useApi } from "../../../shared/hooks/useApi.js";
import { qk } from "../../../shared/query/keys.js";
import { makeDebitNotesApi } from "../api/debitNotes.api.js";
import { ROUTES } from "../../../app/constants/routes.js";
import { PageHeader } from "../../../shared/components/layout/PageHeader.jsx";
import { ContentCard } from "../../../shared/components/layout/ContentCard.jsx";
import { FilterBar } from "../../../shared/components/data/FilterBar.jsx";
import { DataTable } from "../../../shared/components/data/DataTable.jsx";
import { Button } from "../../../shared/components/ui/Button.jsx";
import { Input } from "../../../shared/components/ui/Input.jsx";
import { Badge } from "../../../shared/components/ui/Badge.jsx";
import { useToast } from "../../../shared/components/ui/Toast.jsx";
/**
 * DebitNoteList Component
 *
 * Displays a filterable list of debit notes (vendor credits) with QuickBooks-style formatting.
 * Supports filtering by vendor ID and navigation to debit note details and creation.
 *
 * Note: In accounting, "debit notes" are sent to vendors (AP adjustments), while "credit notes"
 * are received from customers (AR adjustments). The UI uses "credit note" terminology for clarity.
 *
 * @component
 */
export default function DebitNoteList() {
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeDebitNotesApi(http), [http]);
  const toast = useToast();

  // Filter state
  const [vendorId, setVendorId] = useState("");

  // Memoized query string to prevent unnecessary re-renders
  const queryString = useMemo(
    () => (vendorId.trim() ? { vendor_id: vendorId.trim() } : {}),
    [vendorId],
  );

  // Fetch debit notes
  const { data, isLoading, error, isError } = useQuery({
    queryKey: qk.debitNotes(queryString),
    queryFn: () => api.list(queryString),
    staleTime: 30000, // Consider data fresh for 30 seconds
    retry: 2,
    refetchOnWindowFocus: true,
  });

  // Extract rows safely with fallback - handle nested structure
  const rows = useMemo(() => {
    // Check if data is an array
    if (Array.isArray(data)) return data;

    // Check if data has a data property that's an array
    if (data?.data && Array.isArray(data.data)) return data.data;

    // Handle the case where debit notes might be in debitNotes property
    if (data?.debitNotes && Array.isArray(data.debitNotes))
      return data.debitNotes;

    return [];
  }, [data]);
  console.log("DebitNoteList rows:", rows);
  // Navigation handlers
  const handleCreateDebitNote = useCallback(() => {
    navigate(ROUTES.debitNoteNew);
  }, [navigate]);

  const handleVendorIdChange = useCallback((e) => {
    setVendorId(e.target.value);
  }, []);

  // Clear filter
  const handleClearFilter = useCallback(() => {
    setVendorId("");
  }, []);

  // Format currency
  const formatCurrency = useCallback((amount, currencyCode = "USD") => {
    if (amount == null || amount === "") return "—";
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return "—";

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  }, []);

  // Format date
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
    } catch {
      return dateString;
    }
  }, []);

  // Get status badge configuration
  const getStatusBadge = useCallback((status) => {
    const normalizedStatus = (status ?? "draft").toLowerCase();

    const statusConfig = {
      issued: { tone: "brand", label: "Issued" },
      applied: { tone: "success", label: "Applied" },
      draft: { tone: "muted", label: "Draft" },
      voided: { tone: "error", label: "Voided" },
      partial: { tone: "warning", label: "Partially Applied" },
    };

    const config = statusConfig[normalizedStatus] || {
      tone: "muted",
      label: status || "Draft",
    };

    return <Badge tone={config.tone}>{config.label}</Badge>;
  }, []);

  // Table columns configuration with snake_case properties
  const columns = useMemo(
    () => [
      {
        header: "Debit Note",
        accessor: "debit_note_number",
        render: (row) => (
          <div className="flex flex-col gap-0.5">
            <Link
              to={ROUTES.debitNoteDetail(row.id)}
              className="font-medium text-brand-deep hover:text-brand-deep/80 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-deep focus:ring-offset-1 rounded"
              aria-label={`View debit note ${row.debit_note_number ?? row.code ?? row.id}`}
            >
              {row.debit_note_number ?? row.code ?? row.id}
            </Link>
            {row.memo && (
              <span
                className="text-xs text-slate-500 line-clamp-2"
                title={row.memo}
              >
                {row.memo}
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Vendor",
        accessor: "vendor_name",
        render: (row) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-slate-700 font-medium">
              {row.vendor_name ?? row.vendor_id ?? "—"}
            </span>
            {row.vendor_code && (
              <span className="text-xs text-slate-500">{row.vendor_code}</span>
            )}
          </div>
        ),
      },
      {
        header: "Date",
        accessor: "debit_note_date",
        render: (row) => (
          <span className="text-sm text-slate-700 tabular-nums">
            {formatDate(row.debit_note_date)}
          </span>
        ),
      },
      {
        header: "Amount",
        accessor: "total",
        render: (row) => {
          const amount = row.total ?? 0;
          return (
            <span className="text-sm text-slate-900 font-semibold tabular-nums">
              {formatCurrency(amount, row.currency_code)}
            </span>
          );
        },
      },
      {
        header: "Status",
        accessor: "status",
        render: (row) => getStatusBadge(row.status),
      },
    ],
    [formatCurrency, formatDate, getStatusBadge],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Debit Notes"
        subtitle="AP adjustments and debit application to vendor bills."
        icon={FilePlus2}
        actions={
          <Button
            leftIcon={Plus}
            onClick={handleCreateDebitNote}
            aria-label="Create new debit note"
          >
            New Debit Note
          </Button>
        }
      />

      <ContentCard>
        <FilterBar
          left={
            <div className="flex items-center gap-3">
              <Input
                label="Vendor ID"
                value={vendorId}
                onChange={handleVendorIdChange}
                placeholder="Filter by vendor ID..."
                aria-label="Filter debit notes by vendor ID"
                className="min-w-[240px]"
              />
              {vendorId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilter}
                  aria-label="Clear vendor filter"
                >
                  Clear
                </Button>
              )}
            </div>
          }
          right={
            isError && error ? (
              <div
                className="flex items-center gap-2 text-sm text-red-600"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error?.message ?? "Failed to load debit notes"}</span>
              </div>
            ) : null
          }
        />

        <div className="mt-4">
          <DataTable
            columns={columns}
            rows={rows}
            isLoading={isLoading}
            empty={{
              title: "No debit notes found",
              description: vendorId
                ? "No debit notes match your filter. Try a different vendor ID or clear the filter."
                : "Create a debit note to adjust vendor balances and apply credits to bills.",
            }}
            aria-label="Debit notes table"
          />
        </div>
      </ContentCard>

      {/* Results summary */}
      {!isLoading && rows.length > 0 && (
        <div className="text-sm text-slate-600 text-center">
          Showing {rows.length} debit {rows.length === 1 ? "note" : "notes"}
          {vendorId && " for selected vendor"}
          {rows.length > 0 && (
            <span className="ml-4">
              Total:{" "}
              {formatCurrency(
                rows.reduce(
                  (sum, row) => sum + (parseFloat(row.total) || 0),
                  0,
                ),
                rows[0]?.currency_code || "USD",
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
