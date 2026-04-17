import { ROUTES } from '../../../app/constants/routes.js';

function documentEntityPath(entityType, entityId, documentId) {
  if (!entityType) return ROUTES.documentDetail(documentId);
  switch (entityType) {
    case 'invoice':
    case 'tax_invoice':
      return ROUTES.invoiceDetail(entityId);
    case 'bill':
      return ROUTES.billDetail(entityId);
    case 'journal_entry':
      return ROUTES.accountingJournalDetail(entityId);
    case 'credit_note':
    case 'tax_credit':
      return ROUTES.creditNoteDetail(entityId);
    case 'debit_note':
      return ROUTES.debitNoteDetail(entityId);
    case 'payment_in':
      return ROUTES.customerReceiptDetail(entityId);
    case 'payment_out':
      return ROUTES.vendorPaymentDetail(entityId);
    case 'quotation':
      return ROUTES.quotationDetail(entityId);
    case 'sales_order':
      return ROUTES.salesOrderDetail(entityId);
    case 'purchase_requisition':
      return ROUTES.purchaseRequisitionDetail(entityId);
    case 'purchase_order':
      return ROUTES.purchaseOrderDetail(entityId);
    case 'goods_receipt':
      return ROUTES.goodsReceiptDetail(entityId);
    case 'expense':
      return ROUTES.expenseDetail(entityId);
    case 'petty_cash':
      return ROUTES.pettyCashDetail(entityId);
    case 'advance':
      return ROUTES.advanceDetail(entityId);
    case 'return':
      return ROUTES.returnDetail(entityId);
    case 'refund':
      return ROUTES.refundDetail(entityId);
    case 'budget':
      return ROUTES.planningBudgetDetail(entityId);
    case 'forecast':
      return ROUTES.planningForecastDetail(entityId);
    case 'project':
      return ROUTES.planningProjectDetail(entityId);
    case 'contract':
      return ROUTES.complianceIFRS15ContractDetail(entityId);
    default:
      return ROUTES.documentDetail(documentId);
  }
}

export function resolveSearchResultPath(result) {
  if (!result?.type) return ROUTES.search;

  switch (result.type) {
    case 'partner':
      return ROUTES.businessPartnerDetail(result.id);
    case 'account':
      return ROUTES.accountingCoaDetail(result.id);
    case 'journal':
      return ROUTES.accountingJournalDetail(result.id);
    case 'invoice':
      return ROUTES.invoiceDetail(result.id);
    case 'bill':
      return ROUTES.billDetail(result.id);
    case 'customer_receipt':
      return ROUTES.customerReceiptDetail(result.id);
    case 'vendor_payment':
      return ROUTES.vendorPaymentDetail(result.id);
    case 'credit_note':
      return ROUTES.creditNoteDetail(result.id);
    case 'debit_note':
      return ROUTES.debitNoteDetail(result.id);
    case 'quotation':
      return ROUTES.quotationDetail(result.id);
    case 'sales_order':
      return ROUTES.salesOrderDetail(result.id);
    case 'purchase_requisition':
      return ROUTES.purchaseRequisitionDetail(result.id);
    case 'purchase_order':
      return ROUTES.purchaseOrderDetail(result.id);
    case 'goods_receipt':
      return ROUTES.goodsReceiptDetail(result.id);
    case 'expense':
      return ROUTES.expenseDetail(result.id);
    case 'petty_cash':
      return ROUTES.pettyCashDetail(result.id);
    case 'advance':
      return ROUTES.advanceDetail(result.id);
    case 'return':
      return ROUTES.returnDetail(result.id);
    case 'refund':
      return ROUTES.refundDetail(result.id);
    case 'asset':
      return ROUTES.assetsAssetDetail(result.id);
    case 'inventory_item':
      return ROUTES.inventoryItemEdit(result.id);
    case 'inventory_transaction':
      return ROUTES.inventoryTransactionDetail(result.id);
    case 'stock_count':
      return ROUTES.inventoryStockCountDetail(result.id);
    case 'inventory_transfer':
      return ROUTES.inventoryTransferDetail(result.id);
    case 'project':
      return ROUTES.planningProjectDetail(result.id);
    case 'budget':
      return ROUTES.planningBudgetDetail(result.id);
    case 'forecast':
      return ROUTES.planningForecastDetail(result.id);
    case 'bank_account':
      return ROUTES.bankingAccounts;
    case 'bank_statement':
      return ROUTES.bankingStatementDetail(result.id);
    case 'bank_reconciliation':
      return ROUTES.bankingReconciliationDetail(result.id);
    case 'payment_run':
      return ROUTES.paymentRunDetail(result.id);
    case 'bank_transfer':
      return ROUTES.bankTransferDetail(result.id);
    case 'payment_approval_batch':
      return ROUTES.paymentApprovalBatchDetail(result.id);
    case 'lease':
      return ROUTES.complianceIFRS16LeaseDetail(result.id);
    case 'contract':
      return ROUTES.complianceIFRS15ContractDetail(result.id);
    case 'withholding_remittance':
      return ROUTES.accountingTaxWithholdingRemittanceDetail(result.id);
    case 'withholding_certificate':
      return ROUTES.accountingTaxWithholdingCertificateDetail(result.id);
    case 'document':
      return documentEntityPath(result.meta?.entityType, result.meta?.entityId, result.id);
    default:
      if (result.meta?.entityType || result.meta?.entityId) {
        return documentEntityPath(result.meta?.entityType, result.meta?.entityId, result.id);
      }
      return ROUTES.search;
  }
}
