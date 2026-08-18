import { ROUTES } from '../../../../app/constants/routes.js';

const DOCUMENT_DETAIL_ROUTES = {
  invoice: ROUTES.invoiceDetail,
  bill: ROUTES.billDetail,
  payment_in: ROUTES.customerReceiptDetail,
  receipt: ROUTES.customerReceiptDetail,
  payment_out: ROUTES.vendorPaymentDetail,
  credit_note: ROUTES.creditNoteDetail,
  debit_note: ROUTES.debitNoteDetail,
  quotation: ROUTES.quotationDetail,
  sales_order: ROUTES.salesOrderDetail,
  purchase_requisition: ROUTES.purchaseRequisitionDetail,
  purchase_order: ROUTES.purchaseOrderDetail,
  goods_receipt: ROUTES.goodsReceiptDetail,
  expense: ROUTES.expenseDetail,
  petty_cash: ROUTES.pettyCashDetail,
  advance: ROUTES.advanceDetail,
  return: ROUTES.returnDetail,
  refund: ROUTES.refundDetail,
  journal_entry: ROUTES.accountingJournalDetail,
  stock_count: ROUTES.inventoryStockCountDetail,
  stock_adjustment: ROUTES.inventoryTransactionDetail,
  stock_transfer: ROUTES.inventoryTransactionDetail,
  stock_issue: ROUTES.inventoryTransactionDetail,
  stock_receive: ROUTES.inventoryTransactionDetail,
  project: ROUTES.planningProjectDetail,
  lease: ROUTES.complianceIFRS16LeaseDetail,
  contract: ROUTES.complianceIFRS15ContractDetail,
  tax_invoice: ROUTES.invoiceDetail,
  tax_credit: ROUTES.creditNoteDetail,
};

function withApprovalContext(path) {
  if (!path) return null;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}from=approvals`;
}

/**
 * Resolve a unified Approval Inbox row to the actual business-detail screen.
 * The inbox contains several approval sources; Tier-10 document rows carry the
 * business entity in entity_type/entity_id, while some other sources carry a
 * parent resource id in meta.
 */
export function getApprovalDetailRoute(row) {
  if (!row) return null;

  const source = String(row.source ?? '').toLowerCase();
  const entityType = String(row.entity_type ?? '').toLowerCase();
  const entityId = row.entity_id;

  if (source === 'documents') {
    const routeBuilder = DOCUMENT_DETAIL_ROUTES[entityType];
    return routeBuilder && entityId ? withApprovalContext(routeBuilder(entityId)) : null;
  }

  if (source === 'journals' && entityId) {
    return withApprovalContext(ROUTES.accountingJournalDetail(entityId));
  }

  if (source === 'stock_counts' && entityId) {
    return withApprovalContext(ROUTES.inventoryStockCountDetail(entityId));
  }

  if (source === 'budget_versions' && row.meta?.budget_id) {
    return withApprovalContext(ROUTES.planningBudgetDetail(row.meta.budget_id));
  }

  if (source === 'forecast_versions' && row.meta?.forecast_id) {
    return withApprovalContext(ROUTES.planningForecastDetail(row.meta.forecast_id));
  }

  // These modules currently expose an approval-capable list/workspace rather
  // than a standalone detail route. Open the owning workspace instead of
  // inventing a UUID-based route that does not exist.
  if (source === 'writeoffs') return ROUTES.arWriteoffs;
  if (source === 'leave_requests') return ROUTES.hrLeave;

  return null;
}
