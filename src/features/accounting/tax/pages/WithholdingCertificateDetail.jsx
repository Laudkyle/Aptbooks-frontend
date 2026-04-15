import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileCheck2 } from "lucide-react";

import { useApi } from "../../../../shared/hooks/useApi.js";
import { qk } from "../../../../shared/query/keys.js";
import { makeTaxApi } from "../api/tax.api.js";
import { ROUTES } from "../../../../app/constants/routes.js";
import { PageHeader } from "../../../../shared/components/layout/PageHeader.jsx";
import { ContentCard } from "../../../../shared/components/layout/ContentCard.jsx";
import { Badge } from "../../../../shared/components/ui/Badge.jsx";
import { Button } from "../../../../shared/components/ui/Button.jsx";
import { Textarea } from "../../../../shared/components/ui/Textarea.jsx";
import { DataTable } from "../../../../shared/components/data/DataTable.jsx";
import { useToast } from "../../../../shared/components/ui/Toast.jsx";

function money(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function WithholdingCertificateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeTaxApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [voidReason, setVoidReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: qk.withholdingCertificate(id),
    queryFn: () => api.getWithholdingCertificate(id),
  });
  const certificate = data?.data ?? data ?? {};
  const lines = certificate.lines || data?.lines || [];
  const status = String(certificate.status || "draft").toLowerCase();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.withholdingCertificate(id) });
    qc.invalidateQueries({ queryKey: qk.withholdingCertificates({}) });
    qc.invalidateQueries({ queryKey: qk.withholdingDashboard({}) });
  };

  const submitMutation = useMutation({
    mutationFn: () => api.submitWithholdingCertificate(id),
    onSuccess: () => {
      toast.success("Certificate submitted for approval.");
      refresh();
    },
    onError: (e) =>
      toast.error(
        e?.response?.data?.message ??
          e?.message ??
          "Failed to submit certificate",
      ),
  });
  const approveMutation = useMutation({
    mutationFn: () => api.approveWithholdingCertificate(id, {}),
    onSuccess: () => {
      toast.success("Certificate approved.");
      refresh();
    },
    onError: (e) =>
      toast.error(
        e?.response?.data?.message ??
          e?.message ??
          "Failed to approve certificate",
      ),
  });
  const rejectMutation = useMutation({
    mutationFn: () =>
      api.rejectWithholdingCertificate(id, {
        reason: rejectReason || "Rejected",
      }),
    onSuccess: () => {
      toast.success("Certificate rejected.");
      refresh();
    },
    onError: (e) =>
      toast.error(
        e?.response?.data?.message ??
          e?.message ??
          "Failed to reject certificate",
      ),
  });
  const postMutation = useMutation({
    mutationFn: () =>
      api.postWithholdingCertificate(id, {
        counterAccountId:
          certificate.counter_account_id || certificate.counterAccountId,
        certificateDate:
          (certificate.certificate_date || certificate.certificateDate)?.split(
            "T",
          )[0] || null,
        issuedBy: certificate.issued_by || certificate.issuedBy || null,
        reference: certificate.reference || null,
        memo: certificate.memo || null,
      }),
    onSuccess: () => {
      toast.success("Certificate posted.");
      refresh();
    },
    onError: (e) =>
      toast.error(
        e?.response?.data?.message ??
          e?.message ??
          "Failed to post certificate",
      ),
  });
  const voidMutation = useMutation({
    mutationFn: () =>
      api.voidWithholdingCertificate(id, { reason: voidReason || null }),
    onSuccess: () => {
      toast.success("Certificate voided.");
      refresh();
    },
    onError: (e) =>
      toast.error(
        e?.response?.data?.message ??
          e?.message ??
          "Failed to void certificate",
      ),
  });

  const columns = [
    {
      header: "Source document",
      accessorKey: "source_document_no",
      render: (row) => row.source_document_no || "—",
    },
    {
      header: "Customer",
      accessorKey: "partner_id",
      render: (row) => row.partner_name || row.partner_id || "—",
    },
    {
      header: "Tax code",
      accessorKey: "tax_code_id",
      render: (row) => row.tax_code || row.tax_code_id || "—",
    },
    {
      header: "Applied amount",
      accessorKey: "applied_amount",
      render: (row) =>
        money(row.applied_amount, certificate.currency_code || "USD"),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={certificate.certificate_no || "Withholding certificate"}
        subtitle="Approval, posting, and audit trail for customer-side withholding certificates."
        icon={FileCheck2}
        actions={
          <Button
            variant="outline"
            leftIcon={ArrowLeft}
            onClick={() => navigate(ROUTES.accountingTaxWithholding)}
          >
            Back to workspace
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <ContentCard
          title="Certificate summary"
          actions={
            <Badge
              tone={
                status === "posted"
                  ? "success"
                  : status === "voided" || status === "rejected"
                    ? "danger"
                    : status === "approved"
                      ? "success"
                      : status === "submitted"
                        ? "warning"
                        : "muted"
              }
            >
              {status}
            </Badge>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <div className="text-xs text-text-muted">Customer</div>
              <div className="font-semibold text-text-strong">
                {certificate.customer_name || certificate.customer_id || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Jurisdiction</div>
              <div className="font-semibold text-text-strong">
                {certificate.jurisdiction_code ||
                  certificate.jurisdiction_id ||
                  "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Certificate date</div>
              <div className="font-semibold text-text-strong">
                {certificate.certificate_date || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Issued by</div>
              <div className="font-semibold text-text-strong">
                {certificate.issued_by || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Counter account</div>
              <div className="font-semibold text-text-strong">
                {certificate.counter_account_name ||
                  certificate.counter_account_id ||
                  "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted">Total amount</div>
              <div className="font-semibold text-text-strong">
                {money(
                  certificate.total_amount,
                  certificate.currency_code || "USD",
                )}
              </div>
            </div>
          </div>
          {certificate.memo ? (
            <div className="mt-4 rounded-2xl border border-border-subtle p-4 text-sm text-text-body">
              {certificate.memo}
            </div>
          ) : null}
          {certificate.rejection_reason ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Rejected reason: {certificate.rejection_reason}
            </div>
          ) : null}
        </ContentCard>
        <ContentCard title="Actions">
          <div className="space-y-3">
            <div className="rounded-2xl border border-border-subtle bg-slate-50 p-4 text-sm text-text-body">
              Approval can be enforced before posting. Once posted, the
              withholding receivable is cleared against the selected counter
              account.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!["draft", "rejected"].includes(status)}
                loading={submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                Submit
              </Button>
              <Button
                variant="outline"
                disabled={status !== "submitted"}
                loading={approveMutation.isPending}
                onClick={() => approveMutation.mutate()}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                disabled={status !== "approved"}
                loading={postMutation.isPending}
                onClick={() => postMutation.mutate()}
              >
                Post
              </Button>
            </div>
            <Textarea
              label="Reject reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <Button
              variant="danger"
              disabled={status !== "submitted"}
              loading={rejectMutation.isPending}
              onClick={() => rejectMutation.mutate()}
            >
              Reject
            </Button>
            <Textarea
              label="Void reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={3}
            />
            <Button
              variant="danger"
              disabled={status !== "posted"}
              loading={voidMutation.isPending}
              onClick={() => voidMutation.mutate()}
            >
              Void posted certificate
            </Button>
          </div>
        </ContentCard>
      </div>
      <ContentCard title="Certificate lines">
        <DataTable
          columns={columns}
          rows={lines}
          isLoading={isLoading}
          emptyTitle="No certificate lines"
          emptyDescription="This certificate draft does not have any source items yet."
        />
      </ContentCard>
    </div>
  );
}
