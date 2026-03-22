import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  Eye,
  Filter,
  Layers3,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Info,
} from "lucide-react";

import { useApi } from "../../../shared/hooks/useApi.js";
import { makePeriodsApi } from "../../accounting/periods/api/periods.api.js";
import { makeAssetsApi } from "../api/assets.api.js";
import { toOptions, NONE_OPTION } from "../../../shared/utils/options.js";
import { formatDate } from "../../../shared/utils/formatDate";

import { PageHeader } from "../../../shared/components/layout/PageHeader.jsx";
import { ContentCard } from "../../../shared/components/layout/ContentCard.jsx";
import { Button } from "../../../shared/components/ui/Button.jsx";
import { Badge } from "../../../shared/components/ui/Badge.jsx";
import { Tabs } from "../../../shared/components/ui/Tabs.jsx";
import { Input } from "../../../shared/components/ui/Input.jsx";
import { Textarea } from "../../../shared/components/ui/Textarea.jsx";
import { Select } from "../../../shared/components/ui/Select.jsx";
import { Table } from "../../../shared/components/ui/Table.jsx";
import { useToast } from "../../../shared/components/ui/Toast.jsx";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "complete", label: "Complete" },
];

export default function AssetDepreciationPage() {
  const { http } = useApi();
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  const assetsApi = useMemo(() => makeAssetsApi(http), [http]);
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("period-end");
  const [periodId, setPeriodId] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);

  const [preview, setPreview] = useState(null);
  const [scheduleFilters, setScheduleFilters] = useState({
    assetId: "",
    status: "",
    limit: "50",
    offset: "0",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const periodsQ = useQuery({
    queryKey: ["periods", "asset-depreciation"],
    queryFn: () => periodsApi.list({ limit: 500, offset: 0 }),
    staleTime: 60_000,
  });

  const periods = Array.isArray(periodsQ.data)
    ? periodsQ.data
    : periodsQ.data?.data ?? [];

  const periodOptions = useMemo(
    () => [
      NONE_OPTION,
      ...toOptions(periods, {
        valueKey: "id",
        label: (p) => `${p.code ?? ""} ${p.name ?? ""}`.trim() || p.id,
      }),
    ],
    [periods]
  );

  const canPreview = !!periodId?.trim();
  const canPost = !!periodId?.trim() && !!entryDate?.trim();

  useEffect(() => {
    if (!entryDate) {
      const d = new Date();
      const iso = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
        .toISOString()
        .slice(0, 10);
      setEntryDate(iso);
    }
  }, [entryDate]);

  const previewRows = useMemo(() => {
    const rows = Array.isArray(preview?.lines)
      ? preview.lines
      : Array.isArray(preview)
      ? preview
      : [];

    return rows.map((r, idx) => ({
      id: r.id || r.scheduleId || r.schedule_id || `${idx}`,
      assetCode: r.assetCode || r.asset_code || r.code || "—",
      assetName: r.assetName || r.asset_name || r.name || "—",
      amount: Number(r.amount ?? r.depreciationAmount ?? r.depreciation_amount ?? 0),
      scheduleId: r.scheduleId || r.schedule_id || "—",
      notes: r.notes || r.memo || "",
    }));
  }, [preview]);

  const totalPreviewAmount = useMemo(
    () => previewRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    [previewRows]
  );

  async function handlePreview() {
    if (!canPreview) {
      toast.error("Please select an accounting period to continue.");
      return;
    }

    try {
      setBusy(true);
      const res = await assetsApi.previewPeriodEnd(periodId.trim());
      setPreview(res);
      toast.success("Depreciation preview is ready.");
    } catch (e) {
      toast.error(e?.message || "We could not generate the depreciation preview.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRun() {
    if (!canPost) {
      toast.error("Please select a period and entry date before posting.");
      return;
    }

    try {
      setBusy(true);
      await assetsApi.runPeriodEnd({
        periodId: periodId.trim(),
        entryDate,
        memo: memo?.trim() ? memo.trim() : undefined,
      });
      toast.success("Depreciation was posted successfully.");
      await handlePreview();
    } catch (e) {
      toast.error(e?.message || "We could not post the depreciation entry.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReverse() {
    if (!canPost) {
      toast.error("Please select a period and entry date before reversing.");
      return;
    }

    try {
      setBusy(true);
      await assetsApi.reversePeriodEnd({
        periodId: periodId.trim(),
        entryDate,
        memo: memo?.trim() ? memo.trim() : undefined,
      });
      toast.success("Depreciation reversal was posted successfully.");
      await handlePreview();
    } catch (e) {
      toast.error(e?.message || "We could not reverse the depreciation entry.");
    } finally {
      setBusy(false);
    }
  }

  async function loadSchedules() {
    try {
      setLoadingSchedules(true);
      const params = Object.fromEntries(
        Object.entries(scheduleFilters).filter(([, v]) => String(v || "").trim() !== "")
      );
      const res = await assetsApi.listSchedules(params);
      setSchedules(Array.isArray(res) ? res : res?.items || res?.data || []);
    } catch (e) {
      toast.error(e?.message || "We could not load depreciation schedules.");
    } finally {
      setLoadingSchedules(false);
    }
  }

  useEffect(() => {
    if (activeTab === "schedules") {
      loadSchedules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  function clearFilters() {
    setScheduleFilters({
      assetId: "",
      status: "",
      limit: "50",
      offset: "0",
    });
  }

  function getStatusBadge(status) {
    const normalized = String(status || "").toLowerCase();

    if (normalized === "active") {
      return <Badge tone="success">Active</Badge>;
    }
    if (normalized === "complete") {
      return <Badge tone="brand">Complete</Badge>;
    }
    if (normalized === "inactive") {
      return <Badge tone="muted">Inactive</Badge>;
    }
    return <Badge tone="muted">{status || "Unknown"}</Badge>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Depreciation"
        subtitle="Preview, post, reverse, and review depreciation schedules."
        icon={TrendingDown}
        actions={
          activeTab === "schedules" ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setShowFilters((s) => !s)}>
                <Filter className="mr-2 h-4 w-4" />
                {showFilters ? "Hide filters" : "Show filters"}
              </Button>
              <Button variant="ghost" onClick={loadSchedules} disabled={loadingSchedules}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loadingSchedules ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          ) : null
        }
      />

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            key: "period-end",
            label: "Period-end",
            content: (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <ContentCard className="xl:col-span-1">
                  <div className="space-y-5">
                    <div>
                      <div className="text-base font-semibold text-text-strong">
                        Depreciation run
                      </div>
                      <div className="mt-1 text-sm text-text-muted">
                        Select the accounting period, confirm the entry date, and review the preview before posting.
                      </div>
                    </div>

                    <Select
                      label="Accounting period"
                      value={periodId}
                      onChange={(e) => setPeriodId(e.target.value)}
                      options={periodOptions}
                      required
                    />

                    <Input
                      label="Entry date"
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      required
                    />

                    <Textarea
                      label="Memo"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="Optional narration for the journal entry"
                      rows={4}
                    />

                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                      <div className="flex items-start gap-3">
                        <Info className="mt-0.5 h-4 w-4 text-blue-600" />
                        <div className="text-sm text-blue-900">
                          Preview first to confirm the depreciation lines for the selected period before posting to journals.
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Button variant="ghost" onClick={handlePreview} disabled={busy || !canPreview}>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </Button>
                      <Button onClick={handleRun} disabled={busy || !canPost}>
                        <Play className="mr-2 h-4 w-4" />
                        Post
                      </Button>
                      <Button variant="ghost" onClick={handleReverse} disabled={busy || !canPost}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reverse
                      </Button>
                    </div>
                  </div>
                </ContentCard>

                <ContentCard className="xl:col-span-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold text-text-strong">
                        Preview results
                      </div>
                      <div className="mt-1 text-sm text-text-muted">
                        Review the calculated depreciation lines for this run.
                      </div>
                    </div>
                    {previewRows.length > 0 ? (
                      <Badge tone="success">{previewRows.length} lines</Badge>
                    ) : null}
                  </div>

                  {!preview ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="rounded-2xl bg-surface-2 p-4">
                        <Eye className="h-8 w-8 text-text-soft" />
                      </div>
                      <div className="mt-4 text-base font-semibold text-text-strong">
                        No preview yet
                      </div>
                      <div className="mt-1 max-w-md text-sm text-text-muted">
                        Select an accounting period and generate a preview to review depreciation before posting.
                      </div>
                      <Button className="mt-5" variant="ghost" onClick={handlePreview} disabled={!canPreview || busy}>
                        <Eye className="mr-2 h-4 w-4" />
                        Generate preview
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-6">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-border-subtle p-4">
                          <div className="text-xs uppercase tracking-wide text-text-muted">
                            Period
                          </div>
                          <div className="mt-2 text-sm font-medium text-text-strong">
                            {periods.find((p) => p.id === periodId)?.name ||
                              periods.find((p) => p.id === periodId)?.code ||
                              periodId}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border-subtle p-4">
                          <div className="text-xs uppercase tracking-wide text-text-muted">
                            Entry date
                          </div>
                          <div className="mt-2 text-sm font-medium text-text-strong">
                            {entryDate ? formatDate(entryDate) : "—"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border-subtle p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-xs uppercase tracking-wide text-text-muted">
                                Total depreciation
                              </div>
                              <div className="mt-2 text-lg font-semibold text-text-strong">
                                {totalPreviewAmount.toLocaleString("en-US", {
                                  style: "currency",
                                  currency: "USD",
                                })}
                              </div>
                            </div>
                            <DollarSign className="h-5 w-5 text-text-soft" />
                          </div>
                        </div>
                      </div>

                      <Table
                        columns={[
                          { key: "assetCode", header: "Asset code" },
                          { key: "assetName", header: "Asset name" },
                          {
                            key: "amount",
                            header: "Amount",
                            render: (value) =>
                              Number(value || 0).toLocaleString("en-US", {
                                style: "currency",
                                currency: "USD",
                              }),
                          },
                          {
                            key: "scheduleId",
                            header: "Schedule",
                            render: (value) => (
                              <span className="font-mono text-xs text-text-muted">{value}</span>
                            ),
                          },
                          {
                            key: "notes",
                            header: "Notes",
                            render: (value) =>
                              value ? value : <span className="italic text-text-soft">No notes</span>,
                          },
                        ]}
                        data={previewRows}
                      />

                      <details className="rounded-2xl border border-border-subtle">
                        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-text-body">
                          Technical response details
                        </summary>
                        <pre className="max-h-72 overflow-auto border-t border-border-subtle bg-surface-2 p-4 text-xs text-text-body">
                          {JSON.stringify(preview, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </ContentCard>
              </div>
            ),
          },
          {
            key: "schedules",
            label: "Schedules",
            content: (
              <div className="space-y-6">
                {showFilters ? (
                  <ContentCard>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <Input
                        label="Asset ID"
                        value={scheduleFilters.assetId}
                        onChange={(e) =>
                          setScheduleFilters((s) => ({ ...s, assetId: e.target.value }))
                        }
                        placeholder="Filter by asset"
                      />

                      <Select
                        label="Status"
                        value={scheduleFilters.status}
                        onChange={(e) =>
                          setScheduleFilters((s) => ({ ...s, status: e.target.value }))
                        }
                        options={STATUS_OPTIONS}
                      />

                      <Input
                        label="Limit"
                        type="number"
                        min="1"
                        value={scheduleFilters.limit}
                        onChange={(e) =>
                          setScheduleFilters((s) => ({ ...s, limit: e.target.value }))
                        }
                      />

                      <Input
                        label="Offset"
                        type="number"
                        min="0"
                        value={scheduleFilters.offset}
                        onChange={(e) =>
                          setScheduleFilters((s) => ({ ...s, offset: e.target.value }))
                        }
                      />
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <Button variant="ghost" onClick={clearFilters}>
                        Clear
                      </Button>
                      <Button onClick={loadSchedules}>
                        <Search className="mr-2 h-4 w-4" />
                        Apply filters
                      </Button>
                    </div>
                  </ContentCard>
                ) : null}

                <ContentCard>
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold text-text-strong">
                        Depreciation schedules
                      </div>
                      <div className="mt-1 text-sm text-text-muted">
                        View and review depreciation schedules currently configured for assets.
                      </div>
                    </div>
                    {schedules.length ? (
                      <Badge tone="brand">{schedules.length} records</Badge>
                    ) : null}
                  </div>

                  <Table
                    loading={loadingSchedules}
                    columns={[
                      {
                        key: "id",
                        header: "Schedule ID",
                        render: (value) => (
                          <span className="font-mono text-xs text-text-muted">
                            {String(value || "").slice(0, 8)}...
                          </span>
                        ),
                      },
                      {
                        key: "assetId",
                        header: "Asset ID",
                        render: (value) => (
                          <span className="font-mono text-xs text-text-muted">
                            {String(value || "").slice(0, 8)}...
                          </span>
                        ),
                      },
                      {
                        key: "method",
                        header: "Method",
                        render: (value) => <Badge tone="muted">{value || "—"}</Badge>,
                      },
                      {
                        key: "usefulLifeMonths",
                        header: "Useful life",
                        render: (value) => `${value ?? "—"} months`,
                      },
                      {
                        key: "effectiveStartDate",
                        header: "Start date",
                        render: (value) => (value ? formatDate(value) : "—"),
                      },
                      {
                        key: "effectiveEndDate",
                        header: "End date",
                        render: (value) => (value ? formatDate(value) : "—"),
                      },
                      {
                        key: "status",
                        header: "Status",
                        render: (value) => getStatusBadge(value),
                      },
                    ]}
                    data={schedules}
                    emptyText={
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <div className="rounded-2xl bg-surface-2 p-4">
                          <Layers3 className="h-8 w-8 text-text-soft" />
                        </div>
                        <div className="mt-4 text-base font-semibold text-text-strong">
                          No schedules found
                        </div>
                        <div className="mt-1 max-w-md text-sm text-text-muted">
                          There are no depreciation schedules matching the current filters.
                        </div>
                        <Button className="mt-5" variant="ghost" onClick={clearFilters}>
                          Reset filters
                        </Button>
                      </div>
                    }
                  />
                </ContentCard>

                <div className="flex items-center justify-between text-sm text-text-muted">
                  <div>
                    {schedules.length > 0 ? (
                      <>
                        Showing <span className="font-medium text-text-body">{schedules.length}</span> schedule(s)
                      </>
                    ) : (
                      "No schedules to display"
                    )}
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl border border-border-subtle px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>Schedule creation and editing can be added here when the workflow is ready.</span>
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />

      <div className="border-t border-border-subtle pt-4 text-xs text-text-muted">
        Last refreshed: {formatDate(new Date().toISOString())}
      </div>
    </div>
  );
}