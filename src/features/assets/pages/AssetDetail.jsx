import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../../../shared/components/ui/Card";
import { Button } from "../../../shared/components/ui/Button";
import { Badge } from "../../../shared/components/ui/Badge";
import { Tabs } from "../../../shared/components/ui/Tabs";
import { Table } from "../../../shared/components/ui/Table";
import { Textarea } from "../../../shared/components/ui/Textarea";
import { Separator } from "../../../shared/components/ui/Separator";
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
  Edit,
  FileText,
  Hash,
  DollarSign,
  Package,
  MapPin,
  Users,
  Target,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Share2,
  MoreVertical,
  ChevronLeft,
  Plus,
  BarChart3,
  Receipt,
  Activity,
  Database,
  Shield,
  Tag,
  Settings,
  Search,
  Filter,
  Eye,
  Printer,
} from "lucide-react";
import { assetsApi } from "../api/assets.api";
import { formatCurrency, formatDate } from "../../../shared/utils/formatters";

export default function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const [asset, setAsset] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [assetRes, schedRes] = await Promise.all([
          assetsApi.getFixedAsset(id),
          assetsApi.listSchedules({ assetId: id }),
        ]);
        setAsset(assetRes);
        setSchedules(schedRes || []);
      } catch (error) {
        console.error("Failed to load asset:", error);
      } finally {
        setLoading(false);
      }
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

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4" />;
      case "draft":
        return <Clock className="h-4 w-4" />;
      case "retired":
      case "disposed":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Asset Not Found</h3>
          <p className="text-gray-600 mb-6">The asset you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Assets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
                  <Badge variant={statusColor} className="gap-1">
                    {getStatusIcon(asset.status)}
                    {asset.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-sm text-gray-600">
                    <Hash className="h-3 w-3" />
                    <code className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">
                      {asset.code}
                    </code>
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center gap-1 text-sm text-gray-600">
                    <Package className="h-3 w-3" />
                    {asset.category?.name || "Uncategorized"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Asset Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Asset Summary Card */}
            <Card className="border border-gray-200 shadow-sm">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Asset Summary</h3>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Cost Basis</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(asset.cost)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Acquisition Date</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(asset.acquisitionDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <TrendingDown className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Salvage Value</p>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(asset.salvageValue || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Net Book Value</p>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(asset.netBookValue || asset.cost)}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium">{asset.location?.name || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Department:</span>
                    <span className="font-medium">{asset.department?.name || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Cost Center:</span>
                    <span className="font-medium">{asset.costCenter?.name || "—"}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="border border-gray-200 shadow-sm">
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Revalue Asset
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Transfer Asset
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="h-4 w-4 mr-2" />
                    Impair Asset
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Dispose Asset
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tabs Navigation */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <Tabs
                value={activeTab}
                onChange={setActiveTab}
                tabs={[
                  { 
                    value: "overview", 
                    label: "Overview",
                    icon: <FileText className="h-4 w-4" />
                  },
                  { 
                    value: "depreciation", 
                    label: "Depreciation",
                    icon: <TrendingDown className="h-4 w-4" />
                  },
                  { 
                    value: "movements", 
                    label: "Movements",
                    icon: <ArrowLeftRight className="h-4 w-4" />
                  },
                  { 
                    value: "journal", 
                    label: "Journal Entries",
                    icon: <Receipt className="h-4 w-4" />
                  },
                  { 
                    value: "documents", 
                    label: "Documents",
                    icon: <Database className="h-4 w-4" />
                  },
                ]}
                variant="segmented"
                className="border-b"
              />

              {/* Tab Content */}
              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                            <Textarea 
                              value={asset.description || "No description provided"} 
                              readOnly 
                              className="min-h-[120px] resize-none"
                            />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                            <Textarea 
                              value={asset.notes || "No notes available"} 
                              readOnly 
                              className="min-h-[100px] resize-none"
                            />
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Asset Metadata</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600">Asset ID</span>
                                <span className="font-mono text-sm">{id}</span>
                              </div>
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600">Created</span>
                                <span>{formatDate(asset.createdAt || asset.acquisitionDate)}</span>
                              </div>
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600">Last Updated</span>
                                <span>{formatDate(asset.updatedAt || asset.acquisitionDate)}</span>
                              </div>
                              <div className="flex justify-between py-2">
                                <span className="text-gray-600">Serial Number</span>
                                <span className="font-medium">{asset.serialNumber || "—"}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Tags</h4>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="bg-gray-50">
                                <Tag className="h-3 w-3 mr-1" />
                                {asset.category?.name || "Uncategorized"}
                              </Badge>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Fixed Asset
                              </Badge>
                              {asset.tags?.map((tag, index) => (
                                <Badge key={index} variant="outline" className="bg-gray-50">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Depreciation Tab */}
                {activeTab === "depreciation" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Depreciation Schedules</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Manage depreciation methods and schedules for this asset
                        </p>
                      </div>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Schedule
                      </Button>
                    </div>

                    <Card className="border border-gray-200 shadow-none">
                      <Table
                        columns={[
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
                            header: "Useful Life",
                            render: (value) => `${value} months`
                          },
                          { 
                            key: "annualDepreciation", 
                            header: "Annual Depreciation",
                            render: (value) => formatCurrency(value || 0)
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
                            render: (value) => (
                              <Badge variant={value === "active" ? "success" : "muted"}>
                                {value}
                              </Badge>
                            )
                          },
                          { 
                            key: "actions", 
                            header: "",
                            align: "right",
                            render: () => (
                              <div className="flex justify-end gap-2">
                                <Button size="xs" variant="ghost">
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button size="xs" variant="ghost">
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            )
                          },
                        ]}
                        data={(schedules ?? []).map((s) => ({
                          ...s,
                          effectiveStartDate: s.effectiveStartDate || "—",
                          effectiveEndDate: s.effectiveEndDate || "—",
                        }))}
                        emptyText={
                          <div className="text-center py-8">
                            <TrendingDown className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h4 className="font-medium text-gray-900 mb-2">No Schedules Found</h4>
                            <p className="text-gray-600 mb-4">This asset doesn't have any depreciation schedules yet.</p>
                            <Button variant="outline">
                              <Plus className="h-4 w-4 mr-2" />
                              Create First Schedule
                            </Button>
                          </div>
                        }
                      />
                    </Card>

                    {/* Depreciation Projection */}
                    <Card className="border border-gray-200 shadow-none">
                      <div className="p-4 border-b border-gray-100">
                        <h4 className="font-medium text-gray-900">Depreciation Projection</h4>
                      </div>
                      <div className="p-6">
                        <div className="text-center py-8">
                          <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-600">Depreciation projection chart will appear here.</p>
                          <Button variant="outline" className="mt-4">
                            Generate Projection
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Movements Tab */}
                {activeTab === "movements" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Asset Movements</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Track all transfers, revaluations, and adjustments
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search movements..."
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64"
                          />
                        </div>
                        <Button variant="outline">
                          <Filter className="h-4 w-4 mr-2" />
                          Filter
                        </Button>
                      </div>
                    </div>

                    <Card className="border border-gray-200 shadow-none">
                      <div className="p-6 text-center">
                        <ArrowLeftRight className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h4 className="font-medium text-gray-900 mb-2">No Movement History</h4>
                        <p className="text-gray-600 max-w-md mx-auto mb-6">
                          This asset hasn't been transferred, revalued, or impaired yet. 
                          All movement history will appear here once available.
                        </p>
                        <Button>
                          <ArrowLeftRight className="h-4 w-4 mr-2" />
                          Record First Movement
                        </Button>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Journal Tab */}
                {activeTab === "journal" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Journal Entries</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Financial journal entries related to this asset
                        </p>
                      </div>
                      <Button variant="outline">
                        <Receipt className="h-4 w-4 mr-2" />
                        View in GL
                      </Button>
                    </div>

                    <Card className="border border-gray-200 shadow-none">
                      <div className="overflow-x-auto">
                        <Table
                          columns={[
                            { key: "date", header: "Date" },
                            { key: "type", header: "Entry Type" },
                            { key: "description", header: "Description" },
                            { key: "debit", header: "Debit" },
                            { key: "credit", header: "Credit" },
                            { key: "reference", header: "Reference" },
                            { key: "actions", header: "", align: "right" },
                          ]}
                          data={[]}
                          emptyText={
                            <div className="text-center py-8">
                              <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                              <h4 className="font-medium text-gray-900 mb-2">No Journal Entries</h4>
                              <p className="text-gray-600">
                                Journal entries will appear here after asset acquisition, depreciation, or disposal.
                              </p>
                            </div>
                          }
                        />
                      </div>
                    </Card>
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === "documents" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Documents & Attachments</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Purchase documents, warranties, maintenance records
                        </p>
                      </div>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </div>

                    <Card className="border border-gray-200 shadow-none">
                      <div className="p-6 text-center">
                        <Database className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h4 className="font-medium text-gray-900 mb-2">No Documents</h4>
                        <p className="text-gray-600 max-w-md mx-auto">
                          Upload purchase orders, invoices, warranty documents, or maintenance records.
                        </p>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-8">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>Asset ID: <code className="font-mono">{id}</code></span>
              <span>•</span>
              <span>Last synchronized: {formatDate(new Date().toISOString())}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Asset Management System v2.1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}