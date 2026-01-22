import { useEffect, useMemo, useState } from "react";
import { Card } from "../../../shared/components/ui/Card";
import { Button } from "../../../shared/components/ui/Button";
import { Badge } from "../../../shared/components/ui/Badge";
import { Tabs } from "../../../shared/components/ui/Tabs";
import { Table } from "../../../shared/components/ui/Table";
import { Input } from "../../../shared/components/ui/Input";
import { Textarea } from "../../../shared/components/ui/Textarea";
import { Select } from "../../../shared/components/ui/Select";
import { useToast } from "../../../shared/components/ui/Toast";
import { formatDate } from "../../../shared/utils/formatDate";
import { Calendar, Eye, Play, RotateCcw, Search, Layers, Sparkles, TrendingDown, Filter, Plus, ChevronRight, AlertCircle, CheckCircle, Clock, DollarSign, Hash, FileText, CalendarDays, RefreshCw } from "lucide-react";

export default function AssetDepreciationPage({ assetsApi }) {
  const [activeTab, setActiveTab] = useState("period-end");
  const [periodId, setPeriodId] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [memo, setMemo] = useState("");
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [scheduleFilters, setScheduleFilters] = useState({
    assetId: "",
    status: "",
    limit: "",
    offset: "",
  });
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const canPreview = useMemo(() => !!periodId?.trim(), [periodId]);
  const canPost = useMemo(() => !!periodId?.trim() && !!entryDate?.trim(), [periodId, entryDate]);

  useEffect(() => {
    if (!entryDate) {
      const d = new Date();
      const iso = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
        .toISOString()
        .slice(0, 10);
      setEntryDate(iso);
    }
  }, [entryDate]);

  async function handlePreview() {
    if (!canPreview) {
      toast.error("Period ID is required.");
      return;
    }
    try {
      setBusy(true);
      const res = await assetsApi.previewPeriodEnd(periodId.trim());
      setPreview(res);
      toast.success("Preview generated successfully.");
    } catch (e) {
      toast.error(e?.message || "Failed to preview depreciation.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRun() {
    if (!canPost) {
      toast.error("Period ID and Entry Date are required.");
      return;
    }
    try {
      setBusy(true);
      await assetsApi.runPeriodEnd({
        periodId: periodId.trim(),
        entryDate,
        memo: memo?.trim() ? memo.trim() : undefined,
      });
      toast.success("Period-end depreciation posted successfully.");
      await handlePreview();
    } catch (e) {
      toast.error(e?.message || "Failed to run period-end depreciation.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReverse() {
    if (!canPost) {
      toast.error("Period ID and Entry Date are required.");
      return;
    }
    try {
      setBusy(true);
      await assetsApi.reversePeriodEnd({
        periodId: periodId.trim(),
        entryDate,
        memo: memo?.trim() ? memo.trim() : undefined,
      });
      toast.success("Depreciation reversal posted successfully.");
      await handlePreview();
    } catch (e) {
      toast.error(e?.message || "Failed to reverse period-end depreciation.");
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
      setSchedules(Array.isArray(res) ? res : res?.items || []);
    } catch (e) {
      toast.error(e?.message || "Failed to load schedules.");
    } finally {
      setLoadingSchedules(false);
    }
  }

  useEffect(() => {
    if (activeTab === "schedules") loadSchedules();
  }, [activeTab]);

  function previewRows() {
    const rows =
      Array.isArray(preview?.lines) ? preview.lines :
      Array.isArray(preview) ? preview :
      [];

    return rows.map((r, idx) => ({
      id: r.id || r.scheduleId || r.schedule_id || `${idx}`,
      assetCode: r.assetCode || r.asset_code || r.code || "—",
      assetName: r.assetName || r.asset_name || r.name || "—",
      amount: r.amount ?? r.depreciationAmount ?? r.depreciation_amount ?? "—",
      scheduleId: r.scheduleId || r.schedule_id || "—",
      notes: r.notes || r.memo || "",
    }));
  }

  const getStatusBadge = (status) => {
    const config = {
      active: { variant: "success", icon: CheckCircle },
      inactive: { variant: "muted", icon: Clock },
      complete: { variant: "secondary", icon: CheckCircle }
    };
    const { variant, icon: Icon } = config[status] || { variant: "muted", icon: Clock };
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingDown className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Asset Depreciation</h1>
                <p className="text-gray-600 mt-1">
                  Manage depreciation schedules and run period-end calculations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Assets Module
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                Phase 6
              </Badge>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Production Environment
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Documentation
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          tabs={[
            { 
              value: "period-end", 
              label: "Period-End Processing",
              icon: CalendarDays 
            },
            { 
              value: "schedules", 
              label: "Depreciation Schedules",
              icon: Layers 
            },
          ]}
          variant="segmented"
          className="border-b"
        />

        {/* PERIOD-END TAB */}
        {activeTab === "period-end" && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Panel - Controls */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="border border-gray-200 shadow-none">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Run Controls</h3>
                        <p className="text-sm text-gray-500 mt-1">Configure and execute depreciation run</p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded-lg">
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Period ID
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Enter period identifier"
                            value={periodId}
                            onChange={(e) => setPeriodId(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          Unique identifier for the depreciation period. Required for preview and posting.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Entry Date
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <div className="relative">
                          <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="date"
                            value={entryDate}
                            onChange={(e) => setEntryDate(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          Journal entry date for the depreciation posting
                        </p>
                      </div>

                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Memo
                        </label>
                        <Textarea
                          placeholder="Optional description for the depreciation journal entry..."
                          value={memo}
                          onChange={(e) => setMemo(e.target.value)}
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 bg-gray-50 p-5">
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={handlePreview}
                        disabled={busy || !canPreview}
                        className="w-full"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        onClick={handleRun}
                        disabled={busy || !canPost}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Run & Post
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 col-span-2"
                        onClick={handleReverse}
                        disabled={busy || !canPost}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reverse Entry
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Info Panel */}
                <Card className="border border-blue-100 bg-blue-50 shadow-none">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Operational Notes</h4>
                        <ul className="mt-2 space-y-2 text-sm text-blue-800">
                          <li className="flex items-start gap-2">
                            <div className="h-1.5 w-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                            Idempotency handled via backend idempotency keys
                          </li>
                          <li className="flex items-start gap-2">
                            <div className="h-1.5 w-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                            Preview validates calculations before posting
                          </li>
                          <li className="flex items-start gap-2">
                            <div className="h-1.5 w-1.5 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                            Reversal creates offsetting journal entries
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Panel - Preview */}
              <div className="lg:col-span-2">
                <Card className="border border-gray-200 shadow-none h-full">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <Eye className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Preview Results</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Review depreciation calculations before posting
                          </p>
                        </div>
                      </div>
                      {preview && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {previewRows().length} Assets
                        </Badge>
                      )}
                    </div>

                    {!preview ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-4 bg-gray-100 rounded-full mb-4">
                          <Eye className="h-8 w-8 text-gray-400" />
                        </div>
                        <h4 className="font-medium text-gray-900 mb-2">No Preview Data</h4>
                        <p className="text-gray-500 max-w-sm">
                          Enter a Period ID and click Preview to generate depreciation calculations
                        </p>
                        <Button
                          variant="outline"
                          onClick={handlePreview}
                          disabled={busy || !canPreview}
                          className="mt-4"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Generate Preview
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card className="border border-gray-200 p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-500">Period ID</p>
                                <p className="font-mono text-sm font-medium text-gray-900 mt-1 truncate">
                                  {periodId}
                                </p>
                              </div>
                              <Hash className="h-5 w-5 text-gray-400" />
                            </div>
                          </Card>
                          <Card className="border border-gray-200 p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-500">Entry Date</p>
                                <p className="text-sm font-medium text-gray-900 mt-1">
                                  {formatDate(entryDate)}
                                </p>
                              </div>
                              <CalendarDays className="h-5 w-5 text-gray-400" />
                            </div>
                          </Card>
                          <Card className="border border-gray-200 p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-500">Total Amount</p>
                                <p className="text-lg font-bold text-gray-900 mt-1">
                                  {previewRows().reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0).toLocaleString('en-US', {
                                    style: 'currency',
                                    currency: 'USD'
                                  })}
                                </p>
                              </div>
                              <DollarSign className="h-5 w-5 text-gray-400" />
                            </div>
                          </Card>
                        </div>

                        {/* Data Table */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <h4 className="font-medium text-gray-900">Depreciation Lines</h4>
                          </div>
                          <Table
                            columns={[
                              { 
                                key: "assetCode", 
                                header: "Asset Code",
                                width: "120px"
                              },
                              { 
                                key: "assetName", 
                                header: "Asset Name",
                                width: "200px"
                              },
                              { 
                                key: "amount", 
                                header: "Amount",
                                render: (value) => (
                                  <span className="font-medium">
                                    {parseFloat(value).toLocaleString('en-US', {
                                      style: 'currency',
                                      currency: 'USD'
                                    })}
                                  </span>
                                )
                              },
                              { 
                                key: "scheduleId", 
                                header: "Schedule ID",
                                render: (value) => (
                                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                    {value}
                                  </span>
                                )
                              },
                              { 
                                key: "notes", 
                                header: "Notes",
                                render: (value) => value || (
                                  <span className="text-gray-400 italic">No notes</span>
                                )
                              },
                            ]}
                            data={previewRows()}
                            className="[&>div]:border-0"
                          />
                        </div>

                        {/* Raw Data Toggle */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <details className="group">
                            <summary className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer list-none">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-gray-900">Raw Response Data</span>
                              </div>
                              <ChevronRight className="h-5 w-5 text-gray-400 group-open:rotate-90 transition-transform" />
                            </summary>
                            <div className="border-t border-gray-200">
                              <pre className="text-xs p-4 bg-gray-50 overflow-auto max-h-64">
                                {JSON.stringify(preview, null, 2)}
                              </pre>
                            </div>
                          </details>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* SCHEDULES TAB */}
        {activeTab === "schedules" && (
          <div className="p-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Layers className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Depreciation Schedules</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Manage asset depreciation schedules and configurations
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadSchedules}
                    disabled={loadingSchedules}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loadingSchedules ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Schedule
                  </Button>
                </div>
              </div>

              {/* Filters */}
              {showFilters && (
                <Card className="border border-gray-200 shadow-none">
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Asset ID</label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Filter by asset ID"
                            value={scheduleFilters.assetId}
                            onChange={(e) => setScheduleFilters((s) => ({ ...s, assetId: e.target.value }))}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Status</label>
                        <Select
                          value={scheduleFilters.status}
                          onChange={(v) => setScheduleFilters((s) => ({ ...s, status: v }))}
                          options={[
                            { value: "", label: "All Statuses" },
                            { value: "active", label: "Active" },
                            { value: "inactive", label: "Inactive" },
                            { value: "complete", label: "Complete" },
                          ]}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Limit</label>
                        <Input
                          placeholder="Number of records"
                          value={scheduleFilters.limit}
                          onChange={(e) => setScheduleFilters((s) => ({ ...s, limit: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Offset</label>
                        <Input
                          placeholder="Starting position"
                          value={scheduleFilters.offset}
                          onChange={(e) => setScheduleFilters((s) => ({ ...s, offset: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setScheduleFilters({
                          assetId: "",
                          status: "",
                          limit: "",
                          offset: "",
                        })}
                      >
                        Clear All
                      </Button>
                      <Button
                        size="sm"
                        onClick={loadSchedules}
                        className="bg-gray-900 hover:bg-gray-800"
                      >
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Schedules Table */}
              <Card className="border border-gray-200 shadow-none overflow-hidden">
                <div className="overflow-x-auto">
                  <Table
                    columns={[
                      { 
                        key: "id", 
                        header: "Schedule ID",
                        render: (value) => (
                          <span className="font-mono text-xs font-medium">
                            {value.slice(0, 8)}...
                          </span>
                        )
                      },
                      { 
                        key: "assetId", 
                        header: "Asset ID",
                        render: (value) => (
                          <span className="font-mono text-xs">
                            {value.slice(0, 8)}...
                          </span>
                        )
                      },
                      { 
                        key: "method", 
                        header: "Method",
                        render: (value) => (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {value}
                          </Badge>
                        )
                      },
                      { 
                        key: "usefulLifeMonths", 
                        header: "Life",
                        render: (value) => (
                          <span className="font-medium">
                            {value} months
                          </span>
                        )
                      },
                      { 
                        key: "effectiveStartDate", 
                        header: "Start Date",
                        render: (value) => formatDate(value)
                      },
                      { 
                        key: "effectiveEndDate", 
                        header: "End Date",
                        render: (value) => value === "—" ? value : formatDate(value)
                      },
                      { 
                        key: "status", 
                        header: "Status",
                        render: (value) => getStatusBadge(value)
                      },
                      { 
                        key: "actions", 
                        header: "",
                        align: "right"
                      },
                    ]}
                    loading={loadingSchedules}
                    emptyText={
                      <div className="text-center py-12">
                        <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h4 className="font-medium text-gray-900 mb-2">No Schedules Found</h4>
                        <p className="text-gray-500 mb-4">
                          No depreciation schedules match your current filters
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setScheduleFilters({
                            assetId: "",
                            status: "",
                            limit: "",
                            offset: "",
                          })}
                        >
                          Clear Filters
                        </Button>
                      </div>
                    }
                    data={schedules.map((s) => ({
                      ...s,
                      effectiveStartDate: s.effectiveStartDate ? formatDate(s.effectiveStartDate) : "—",
                      effectiveEndDate: s.effectiveEndDate ? formatDate(s.effectiveEndDate) : "—",
                      actions: (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => toast.info(`View schedule ${s.id}`)}
                          >
                            View
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => toast.info(`Edit schedule ${s.id}`)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => toast.info(`Delete schedule ${s.id}`)}
                          >
                            Delete
                          </Button>
                        </div>
                      ),
                    }))}
                    className="[&>div]:border-0"
                  />
                </div>
              </Card>

              {/* Pagination Info */}
              {schedules.length > 0 && (
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div>
                    Showing <span className="font-medium">{schedules.length}</span> schedules
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" disabled>
                      Previous
                    </Button>
                    <span className="px-3 py-1 bg-gray-100 rounded">Page 1</span>
                    <Button variant="ghost" size="sm">
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-200">
        Asset Depreciation Module • Version 2.1.0 • Last updated: {formatDate(new Date().toISOString())}
      </div>
    </div>
  );
}