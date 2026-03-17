const ACTION_CONFIG = {
  submit: { key: 'submit', label: 'Submit for Approval', className: 'bg-blue-600 hover:bg-blue-700 text-white' },
  approve: { key: 'approve', label: 'Approve', className: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  issueInvoice: { key: 'issue', label: 'Issue Invoice', className: 'bg-green-600 hover:bg-green-700 text-white' },
  issueBill: { key: 'issue', label: 'Issue Bill', className: 'bg-green-600 hover:bg-green-700 text-white' },
  issueCreditNote: { key: 'issue', label: 'Issue Credit Note', className: 'bg-green-600 hover:bg-green-700 text-white' },
  issueDebitNote: { key: 'issue', label: 'Issue Debit Note', className: 'bg-green-600 hover:bg-green-700 text-white' },
  postReceipt: { key: 'post', label: 'Post Receipt', className: 'bg-green-600 hover:bg-green-700 text-white' },
  postPayment: { key: 'post', label: 'Post Payment', className: 'bg-green-600 hover:bg-green-700 text-white' },
  applyCreditNote: { key: 'apply', label: 'Apply Credit Note', className: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
  applyDebitNote: { key: 'apply', label: 'Apply Debit Note', className: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
  reject: { key: 'reject', label: 'Reject', className: 'border-orange-600 text-orange-700 hover:bg-orange-50' },
  void: { key: 'void', label: 'Void', className: 'border-red-600 text-red-700 hover:bg-red-50' }
};

function workflowForward(state, approvedAction) {
  const { approvalRequired, workflowStatus, canApprove, businessStatus } = state;
console.log("Resolving forward action with state:", workflowStatus, approvalRequired, canApprove, businessStatus,state);
  if (!approvalRequired) return approvedAction;
  if (workflowStatus == 'submitted') return canApprove ? ACTION_CONFIG.approve : null;
  if (workflowStatus == 'approved') return approvedAction;
  if (workflowStatus == 'rejected' && businessStatus === 'draft') return ACTION_CONFIG.submit;
  if ((workflowStatus == 'draft' || workflowStatus === 'none') && businessStatus === 'draft') return ACTION_CONFIG.submit;
  return null;
}

export function resolveTransactionActions({ type, state, remainingAmount = 0 } = {}) {
  const result = {
    forwardAction: null,
    rejectAction: null,
    voidAction: null
  };

  if (!state) return result;

  const { businessStatus, workflowStatus, canReject, businessTerminal } = state;
  const canVoid = !['voided', 'cancelled'].includes(businessStatus);

  if (workflowStatus === 'submitted' && canReject) {
    result.rejectAction = ACTION_CONFIG.reject;
  }
  if (canVoid && !businessTerminal) {
    result.voidAction = ACTION_CONFIG.void;
  }

  if (businessTerminal) {
    result.voidAction = null;
    return result;
  }

  switch (type) {
    case 'invoice': {
      if (['issued', 'paid'].includes(businessStatus)) return result;
      result.forwardAction = workflowForward(state, ACTION_CONFIG.issueInvoice);
      return result;
    }
    case 'bill': {
      if (['issued', 'paid'].includes(businessStatus)) return result;
      result.forwardAction = workflowForward(state, ACTION_CONFIG.issueBill);
      return result;
    }
    case 'creditNote': {
      if (businessStatus === 'draft') {
        result.forwardAction = workflowForward(state, ACTION_CONFIG.issueCreditNote);
      } else if (['issued', 'partial'].includes(businessStatus) && Number(remainingAmount) > 0) {
        result.forwardAction = ACTION_CONFIG.applyCreditNote;
      }
      return result;
    }
    case 'debitNote': {
      if (businessStatus === 'draft') {
        result.forwardAction = workflowForward(state, ACTION_CONFIG.issueDebitNote);
      } else if (['issued', 'partial'].includes(businessStatus) && Number(remainingAmount) > 0) {
        result.forwardAction = ACTION_CONFIG.applyDebitNote;
      }
      return result;
    }
    case 'customerReceipt': {
      if (businessStatus === 'posted') return result;
      result.forwardAction = workflowForward(state, ACTION_CONFIG.postReceipt);
      return result;
    }
    case 'vendorPayment': {
      if (businessStatus === 'posted') return result;
      result.forwardAction = workflowForward(state, ACTION_CONFIG.postPayment);
      return result;
    }
    default:
      return result;
  }
}
