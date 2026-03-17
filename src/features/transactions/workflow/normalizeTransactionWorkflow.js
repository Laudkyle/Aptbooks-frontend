const STATUS_ALIASES = {
  pending: "submitted",
  submitted_for_approval: "submitted",
  awaiting_approval: "submitted",
  in_review: "submitted",
  approved_for_issue: "approved",
  declined: "rejected",
};

function normalizeStatus(value, fallback = "draft") {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return fallback;
  return STATUS_ALIASES[raw] || raw;
}

function pickFirst(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== "",
  );
}

export function normalizeTransactionWorkflow({
  entity = {},
  payload = {},
  type,
} = {}) {
  const workflow = entity ?? payload ?? {};
  const businessStatus = normalizeStatus(
    pickFirst(entity?.status, payload?.status),
    "draft",
  );

  const workflowStatus = normalizeStatus(
    pickFirst(
      workflow?.workflow_status,
      entity?.workflow_status,
      payload?.workflow_status,
      entity?.status === "pending" ? "submitted" : undefined,
    ),
    "none",
  );

  const documentId = pickFirst(
    workflow?.documentId,
    workflow?.document_id,
    workflow?.id,
    entity?.workflow_document_id,
    payload?.workflow_document_id,
    payload?.document_id,
  );

  const explicitApprovalRequired = pickFirst(
    workflow?.approvalRequired,
    workflow?.approval_required,
    entity?.approval_required,
    payload?.approval_required,
  );

  const approvalRequired =
    typeof explicitApprovalRequired === "boolean"
      ? explicitApprovalRequired
      : Boolean(
          documentId ||
          ["submitted", "approved", "rejected"].includes(workflowStatus),
        );

  const canApprove = Boolean(
    pickFirst(
      workflow?.canApprove,
      workflow?.can_approve,
      entity?.canApprove,
      entity?.can_approve,
      payload?.canApprove,
      payload?.can_approve,
    ),
  );

  const canReject = Boolean(
    pickFirst(
      workflow?.canReject,
      workflow?.can_reject,
      entity?.canReject,
      entity?.can_reject,
      payload?.canReject,
      payload?.can_reject,
      canApprove,
    ),
  );

  const workflowTerminal = ["approved", "rejected"].includes(workflowStatus);
  const businessTerminal = ["voided", "cancelled"].includes(businessStatus);

  return {
    type,
    entity,
    payload,
    businessStatus,
    workflowStatus,
    approvalRequired,
    documentId,
    canApprove,
    canReject,
    workflowTerminal,
    businessTerminal,
    isRejected: workflowStatus === "rejected",
    isApproved: workflowStatus === "approved",
    isSubmitted: workflowStatus === "submitted",
  };
}
