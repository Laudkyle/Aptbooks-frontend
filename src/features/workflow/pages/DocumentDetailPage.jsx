import { useEffect, useState } from "react"; 
import { useParams } from "react-router-dom "; 
import {
  FileText,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  Send,
} from "lucide-react"; 

import { Card } from "../../../shared/components/ui/Card"; 
import { Button } from "../../../shared/components/ui/Button"; 
import { Badge } from "../../../shared/components/ui/Badge"; 
import { Table } from "../../../shared/components/ui/Table"; 
import { Textarea } from "../../../shared/components/ui/Textarea"; 
import { workflowDocumentsApi } from "../api/workflowDocuments.api"; 
import { formatDate } from "../../../shared/utils/formatters"; 

export default function DocumentDetailPage() {
  const { id } = useParams(); 
  const [doc, setDoc] = useState(null); 
  const [comment, setComment] = useState(""); 
  const [loading, setLoading] = useState(true); 

  async function load() {
    setLoading(true); 
    const res = await workflowDocumentsApi.getDocument(id); 
    setDoc(res); 
    setLoading(false); 
  }

  useEffect(() => {
    load(); 
  }, [id]); 

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading document…</div>; 
  }

  if (!doc) {
    return <div className="p-6 text-sm text-red-600">Document not found.</div>; 
  }

  const statusVariant = {
    DRAFT: "warning",
    SUBMITTED: "info",
    APPROVED: "success",
    REJECTED: "destructive",
  }[doc.status]; 

  async function uploadVersion(file) {
    if (!file) return; 
    await workflowDocumentsApi.uploadVersion(doc.id, file); 
    await load(); 
  }

  async function submit() {
    await workflowDocumentsApi.submit(doc.id, { comment }); 
    setComment(""); 
    await load(); 
  }

  async function approve() {
    await workflowDocumentsApi.approve(doc.id, { comment }); 
    setComment(""); 
    await load(); 
  }

  async function reject() {
    await workflowDocumentsApi.reject(doc.id, { comment }); 
    setComment(""); 
    await load(); 
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{doc.title}</h1>
            <Badge variant={statusVariant}>{doc.status}</Badge>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Entity: {doc.entity_type} · Ref: {doc.entity_ref || "—"}
          </div>
        </div>

        <div className="flex gap-2">
          {doc.status === "DRAFT" && (
            <Button onClick={submit} size="sm ">
              <Send className="h-4 w-4 mr-1" />
              Submit
            </Button>
          )}
          {doc.canApprove && (
            <>
              <Button onClick={approve} size="sm " variant="success">
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button onClick={reject} size="sm " variant="destructive">
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Metadata */}
      <Card className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Document Type</div>
          <div className="font-medium ">{doc.document_type?.name || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Created</div>
          <div className="font-medium ">{formatDate(doc.created_at)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Current Version</div>
          <div className="font-medium ">
            {doc.versions?.length
              ? `v${doc.versions[doc.versions.length - 1].version_no}`
              : "—"}
          </div>
        </div>
      </Card>

      {/* Versions */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Versions
          </h3>

          {doc.status === "DRAFT" && (
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm ">
              <Upload className="h-4 w-4" />
              <span>Upload</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => uploadVersion(e.target.files[0])}
              />
            </label>
          )}
        </div>

        <Table
          columns={[
            { key: "version_no", header: "Version" },
            { key: "filename", header: "File" },
            { key: "created_at", header: "Uploaded" },
            { key: "action", header: "" },
          ]}
          data={(doc.versions || []).map((v) => ({
            ...v,
            created_at: formatDate(v.created_at),
            action: (
              <Button
                size="xs"
                variant="secondary"
                onClick={() =>
                  workflowDocumentsApi.downloadVersion(doc.id, v.id)
                }
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
            ),
          }))}
        />
      </Card>

      {/* Approvals */}
      <Card>
        <h3 className="mb-3 text-sm font-medium ">Approval History</h3>
        <Table
          columns={[
            { key: "level", header: "Level" },
            { key: "actor", header: "Actor" },
            { key: "action", header: "Action" },
            { key: "comment", header: "Comment" },
            { key: "date", header: "Date" },
          ]}
          data={(doc.approvals || []).map((a) => ({
            level: a.level_name,
            actor: a.actor_name || "—",
            action: a.action,
            comment: a.comment || "—",
            date: formatDate(a.created_at),
          }))}
        />
      </Card>

      {/* Comment box */}
      {(doc.status !== "APPROVED" && doc.status !== "REJECTED") && (
        <Card>
          <label className="text-xs text-muted-foreground">Comment</label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment (optional)"
          />
        </Card>
      )}
    </div>
  ); 
}
