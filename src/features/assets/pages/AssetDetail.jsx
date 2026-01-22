import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/Tabs";
import { Table } from "@/shared/components/ui/Table";
import { Input } from "@/shared/components/ui/Input";
import { Textarea } from "@/shared/components/ui/Textarea";
import {
  AssetTag,
  Calendar,
  Building2,
  Briefcase,
  Layers,
  ArrowLeftRight,
  TrendingDown,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { assetsApi } from "../api/assets.api";
import { formatCurrency, formatDate } from "@/shared/utils/formatters";

export default function AssetDetailPage() {
  const { id } = useParams();
  const [asset, setAsset] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [assetRes, schedRes] = await Promise.all([
        assetsApi.getFixedAsset(id),
        assetsApi.listDepreciationSchedules({ assetId: id }),
      ]);
      setAsset(assetRes);
      setSchedules(schedRes || []);
      setLoading(false);
    }
    load();
  }, [id]);

  const statusColor = useMemo(() => {
    switch (asset?.status) {
      case "active":
        return "success";
      case "draft":
        return "warning";
      case "retired":
      case "disposed":
        return "muted";
      default:
        return "default";
    }
  }, [asset?.status]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading asset…</div>;
  }

  if (!asset) {
    return <div className="p-6 text-sm text-red-600">Asset not found.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{asset.name}</h1>
            <Badge variant={statusColor}>{asset.status}</Badge>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Code: <span className="font-mono">{asset.code}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary">
            Edit
          </Button>
          <Button size="sm" variant="secondary">
            Acquire
          </Button>
          <Button size="sm" variant="secondary">
            Transfer
          </Button>
          <Button size="sm" variant="secondary">
            Revalue
          </Button>
          <Button size="sm" variant="secondary">
            Impair
          </Button>
          <Button size="sm" variant="destructive">
            Dispose
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <AssetTag className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Category</div>
              <div className="font-medium">{asset.category?.name || "—"}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Acquisition Date</div>
              <div className="font-medium">
                {formatDate(asset.acquisitionDate)}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Cost</div>
              <div className="font-medium">
                {formatCurrency(asset.cost)}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Salvage Value</div>
              <div className="font-medium">
                {formatCurrency(asset.salvageValue || 0)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <Card className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Location: {asset.location?.name || "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Department: {asset.department?.name || "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Cost Center: {asset.costCenter?.name || "—"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Notes</label>
              <Textarea value={asset.notes || ""} readOnly />
            </div>
          </Card>
        </TabsContent>

        {/* Depreciation */}
        <TabsContent value="depreciation">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium">Depreciation Schedules</h3>
              <Button size="sm">Add Schedule</Button>
            </div>

            <Table
              columns={[
                { key: "method", header: "Method" },
                { key: "usefulLifeMonths", header: "Life (months)" },
                { key: "effectiveStartDate", header: "Start" },
                { key: "effectiveEndDate", header: "End" },
                { key: "status", header: "Status" },
              ]}
              data={schedules.map((s) => ({
                ...s,
                effectiveStartDate: formatDate(s.effectiveStartDate),
                effectiveEndDate: s.effectiveEndDate
                  ? formatDate(s.effectiveEndDate)
                  : "—",
              }))}
            />
          </Card>
        </TabsContent>

        {/* Movements */}
        <TabsContent value="movements">
          <Card>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <ArrowLeftRight className="h-4 w-4" />
              Asset Movements
            </div>
            <div className="text-sm text-muted-foreground">
              Transfers, revaluations, impairments, disposals will appear here.
            </div>
          </Card>
        </TabsContent>

        {/* Journal */}
        <TabsContent value="journal">
          <Card>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Trash2 className="h-4 w-4" />
              Journal Impact
            </div>
            <div className="text-sm text-muted-foreground">
              Capitalisation, depreciation, revaluation and disposal entries.
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
