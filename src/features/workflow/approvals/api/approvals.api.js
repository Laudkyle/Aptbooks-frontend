import { endpoints } from '../../../../shared/api/endpoints.js';
import { ensureIdempotencyKey } from '../../../../shared/api/idempotency.js';

const DOCUMENT_ENTITY_ENDPOINTS = {
  invoice: endpoints.modules.transactions.invoices,
  bill: endpoints.modules.transactions.bills,
  payment_in: endpoints.modules.transactions.customerReceipts,
  payment_out: endpoints.modules.transactions.vendorPayments,
  credit_note: endpoints.modules.transactions.creditNotes,
  debit_note: endpoints.modules.transactions.debitNotes,
  quotation: endpoints.modules.transactions.quotations,
  sales_order: endpoints.modules.transactions.salesOrders,
  purchase_requisition: endpoints.modules.transactions.purchaseRequisitions,
  purchase_order: endpoints.modules.transactions.purchaseOrders,
  goods_receipt: endpoints.modules.transactions.goodsReceipts,
  expense: endpoints.modules.transactions.expenses,
  petty_cash: endpoints.modules.transactions.pettyCash,
  advance: endpoints.modules.transactions.advances,
  return: endpoints.modules.transactions.returns,
  refund: endpoints.modules.transactions.refunds,
};

function assertSupported(row) {
  if (!row?.source) throw new Error('Unsupported approval row: missing source');
}

function actionUrl(row, action) {
  assertSupported(row);

  // Tier 10 documents workflow
  if (row.source === 'documents') {
    const entityType = String(row.entity_type ?? '').toLowerCase();
    const entityId = row.entity_id;
    const transactionEndpoints = DOCUMENT_ENTITY_ENDPOINTS[entityType];
    if (transactionEndpoints && entityId && typeof transactionEndpoints[action] === 'function') {
      return transactionEndpoints[action](entityId);
    }

    const id = row.document_id;
    if (!id) throw new Error('Document approval row is missing document_id');
    return `/workflow/documents/${id}/${action}`;
  }

  // Journals
  if (row.source === 'journals') {
    return `/core/accounting/journals/${row.entity_id}/${action}`;
  }

  // AR write-offs
  if (row.source === 'writeoffs') {
    return `/modules/ar/writeoffs/${row.entity_id}/${action}`;
  }

  // Inventory stock counts
  if (row.source === 'stock_counts') {
    return `/modules/inventory/stock-counts/${row.entity_id}/${action}`;
  }

  // HR leave requests
  if (row.source === 'leave_requests') {
    // backend uses /modules/hr/leave/requests/:id/{approve|reject}
    return `/modules/hr/leave/requests/${row.entity_id}/${action}`;
  }

  // Budget versions
  if (row.source === 'budget_versions') {
    const budgetId = row.meta?.budget_id;
    if (!budgetId) throw new Error('Budget version approval row is missing meta.budget_id');
    return `/reporting/budgets/${budgetId}/versions/${row.entity_id}/${action}`;
  }

  // Forecast versions
  if (row.source === 'forecast_versions') {
    const forecastId = row.meta?.forecast_id;
    if (!forecastId) throw new Error('Forecast version approval row is missing meta.forecast_id');
    return `/reporting/forecasts/${forecastId}/versions/${row.entity_id}/${action}`;
  }

  throw new Error(`Unsupported approvals source: ${row.source}`);
}

export function makeApprovalsApi(http) {
  return {
    inbox: async (qs) => {
      const res = await http.get(endpoints.workflow.approvalsInbox(qs));
      return res.data;
    },

    approve: async (row) => {
      const url = actionUrl(row, 'approve');
      const res = await http.post(url, {}, { headers: ensureIdempotencyKey() });
      return res.data;
    },

    reject: async (row, reason) => {
      const url = actionUrl(row, 'reject');
      const payload = reason
        ? (row?.source === 'documents' ? { comment: reason } : { reason })
        : {};
      const res = await http.post(url, payload, { headers: ensureIdempotencyKey() });
      return res.data;
    }
  };
}
