import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('approval inbox rows open the underlying detail screen', () => {
  const queue = read('src/features/workflow/approvals/pages/ApprovalQueue.jsx');
  assert.match(queue, /getApprovalDetailRoute/);
  assert.match(queue, /onClick=\{\(\) => handleOpenRequest\(row\)\}/);
  assert.match(queue, /role="button"/);
  assert.match(queue, />\s*Open\s*</);
});

test('approval detail resolver covers operational accounting documents', () => {
  const nav = read('src/features/workflow/approvals/utils/approvalNavigation.js');
  for (const token of [
    'invoice: ROUTES.invoiceDetail',
    'bill: ROUTES.billDetail',
    'payment_in: ROUTES.customerReceiptDetail',
    'payment_out: ROUTES.vendorPaymentDetail',
    'credit_note: ROUTES.creditNoteDetail',
    'debit_note: ROUTES.debitNoteDetail',
    'quotation: ROUTES.quotationDetail',
    'sales_order: ROUTES.salesOrderDetail',
    'purchase_requisition: ROUTES.purchaseRequisitionDetail',
    'purchase_order: ROUTES.purchaseOrderDetail',
    'goods_receipt: ROUTES.goodsReceiptDetail',
    'expense: ROUTES.expenseDetail',
    'petty_cash: ROUTES.pettyCashDetail',
    'advance: ROUTES.advanceDetail',
    'return: ROUTES.returnDetail',
    'refund: ROUTES.refundDetail',
    'stock_adjustment: ROUTES.inventoryTransactionDetail',
    'stock_transfer: ROUTES.inventoryTransactionDetail',
    'lease: ROUTES.complianceIFRS16LeaseDetail',
    'contract: ROUTES.complianceIFRS15ContractDetail',
  ]) assert.ok(nav.includes(token), `missing navigation mapping: ${token}`);
  assert.match(nav, /from=approvals/);
});

test('transaction detail screens retain approval and rejection actions with optional rejection reason', () => {
  const actionBar = read('src/features/transactions/components/TransactionWorkflowActionBar.jsx');
  assert.match(actionBar, /searchParams\.get\('from'\) === 'approvals'/);
  assert.match(actionBar, /review the document details, then approve or reject/);

  const workflow = read('src/features/transactions/workflow/resolveTransactionActions.js');
  assert.match(workflow, /workflowStatus === 'submitted' && canReject/);
  assert.match(workflow, /canApprove \? ACTION_CONFIG\.approve/);

  for (const rel of [
    'src/features/transactions/pages/InvoiceDetail.jsx',
    'src/features/transactions/pages/BillDetail.jsx',
    'src/features/transactions/pages/CustomerReceiptDetail.jsx',
    'src/features/transactions/pages/VendorPaymentDetail.jsx',
    'src/features/transactions/pages/CreditNoteDetail.jsx',
    'src/features/transactions/pages/DebitNoteDetail.jsx',
  ]) {
    const src = read(rel);
    assert.match(src, /TransactionWorkflowActionBar/);
    assert.doesNotMatch(src, /\(recommended\)/);
  }

  const ops = read('src/features/transactions/phase1/OperationalDocDetail.jsx');
  assert.match(ops, /Rejection reason \(optional\)/);
});
