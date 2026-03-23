import { PHASE1_MODULES } from './moduleConfigs.js';

export function toCurrency(value, currency = 'USD') {
  const amount = Number(value ?? 0);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}

export function getStatusBadgeClass(status) {
  const s = String(status ?? 'draft').toLowerCase();
  const map = {
    draft: 'bg-amber-100 text-amber-800 border-amber-200',
    submitted: 'bg-blue-100 text-blue-800 border-blue-200',
    approved: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    issued: 'bg-green-100 text-green-800 border-green-200',
    posted: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    voided: 'bg-gray-100 text-gray-700 border-gray-200'
  };
  return map[s] || map.draft;
}

export function getPhase1Actions(config, state) {
  if (!config || !state || state.businessTerminal) {
    return { forwardAction: null, rejectAction: null, voidAction: null };
  }
  const rejectAction = state.workflowStatus === 'submitted' && state.canReject
    ? { key: 'reject', label: 'Reject', className: 'border-blue-500 text-white-700 bg-blue-500 hover:bg-blue-700' }
    : null;
  const voidAction = ['voided', 'cancelled'].includes(state.businessStatus)
    ? null
    : { key: 'void', label: 'Void', className: 'border-red-600 bg-red-500 text-white hover:bg-red-700' };

  const approvedAction = {
    key: config.statusFinal === 'posted' ? 'post' : 'issue',
    label: config.finalActionLabel,
    className: 'bg-green-600 hover:bg-green-700 text-white'
  };

  let forwardAction = null;
  if (state.workflowStatus === 'submitted') {
    forwardAction = state.canApprove ? { key: 'approve', label: 'Approve', className: 'bg-green-600 hover:bg-green-700 text-white' } : null;
  } else if (state.workflowStatus === 'approved') {
    forwardAction = approvedAction;
  } else if ((state.workflowStatus === 'draft' || state.workflowStatus === 'none' || !state.approvalRequired) && state.businessStatus === 'draft') {
    forwardAction = state.approvalRequired ? { key: 'submit', label: 'Submit for Approval', className: 'bg-blue-600 hover:bg-blue-700 text-white' } : approvedAction;
  } else if (state.workflowStatus === 'rejected' && state.businessStatus === 'draft') {
    forwardAction = { key: 'submit', label: 'Resubmit for Approval', className: 'bg-blue-600 hover:bg-blue-700 text-white' };
  }

  if (state.businessStatus === config.statusFinal) forwardAction = null;
  return { forwardAction, rejectAction, voidAction };
}

export function makeEmptyForm(config) {
  return {
    date: new Date().toISOString().slice(0, 10),
    dueDate: '',
    partnerId: '',
    employeeId: '',
    cashAccountId: '',
    primaryAccountId: '',
    sourceDocumentId: '',
    reference: '',
    memo: '',
    amountTotal: '',
    currencyCode: '',
    advanceType: 'customer',
    returnType: 'sales_return',
    refundType: 'customer_refund',
    lines: config?.lineMode === 'none' ? [] : [{ description: '', quantity: 1, unitPrice: 0, lineTotal: 0, accountId: '' }]
  };
}

export function sanitizePayload(config, form) {
  const payload = {
    date: form.date,
    dueDate: form.dueDate || undefined,
    partnerId: form.partnerId || undefined,
    employeeId: form.employeeId || undefined,
    cashAccountId: form.cashAccountId || undefined,
    primaryAccountId: form.primaryAccountId || undefined,
    sourceDocumentId: form.sourceDocumentId || undefined,
    reference: form.reference || undefined,
    memo: form.memo || undefined,
    currencyCode: form.currencyCode || undefined,
  };
  if (config.requireAmountTotal && form.amountTotal !== '') payload.amountTotal = Number(form.amountTotal || 0);
  (config.extraFields || []).forEach((f) => {
    if (form[f.key] !== undefined && form[f.key] !== '') payload[f.key] = form[f.key];
  });
  if (config.lineMode !== 'none') {
    payload.lines = (form.lines || [])
      .filter((line) => line.description || line.accountId || Number(line.lineTotal || 0) || Number(line.unitPrice || 0))
      .map((line) => ({
        description: line.description,
        quantity: line.quantity === '' ? undefined : Number(line.quantity ?? 1),
        unitPrice: line.unitPrice === '' ? undefined : Number(line.unitPrice ?? 0),
        lineTotal: line.lineTotal === '' ? undefined : Number(line.lineTotal ?? 0),
        accountId: line.accountId || undefined,
        itemId: line.itemId || undefined,
        taxCodeId: line.taxCodeId || undefined,
      }));
  } else {
    payload.lines = [];
  }
  return payload;
}
