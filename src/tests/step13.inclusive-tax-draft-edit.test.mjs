import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('detail tax model prioritizes canonical backend display totals', () => {
  const src = read('src/features/transactions/utils/taxDetail.js');
  assert.match(src, /canonicalTotals = payload\?\.detail_meta\?\.totals/);
  assert.match(src, /subtotal: pickNumber\(canonicalTotals\?\.subtotal/);
  assert.match(src, /taxTotal: pickNumber\(canonicalTotals\?\.tax_total/);
  assert.match(src, /grandTotal: pickNumber\(canonicalTotals\?\.total/);
  assert.match(src, /display_amounts\?\.taxable_amount/);
});

test('transaction APIs and routes expose draft edit operations', () => {
  const endpoints = read('src/shared/api/endpoints.js');
  const routes = read('src/app/constants/routes.js');
  for (const name of ['invoices','bills','customerReceipts','vendorPayments','creditNotes','debitNotes']) {
    assert.match(endpoints, new RegExp(`${name}: \\{[\\s\\S]*?update: \\(id\\)`));
  }
  for (const route of ['invoiceEdit','billEdit','customerReceiptEdit','vendorPaymentEdit','creditNoteEdit','debitNoteEdit','quotationEdit','salesOrderEdit','purchaseRequisitionEdit','purchaseOrderEdit','goodsReceiptEdit','expenseEdit','pettyCashEdit','advanceEdit','returnEdit','refundEdit']) {
    assert.match(routes, new RegExp(`${route}:`));
  }
});

test('create forms hydrate and update existing drafts', () => {
  const files = [
    ['InvoiceCreate.jsx','hydrateInvoiceDraft'],
    ['BillCreate.jsx','hydrateBillDraft'],
    ['CustomerReceiptCreate.jsx','hydrateReceiptDraft'],
    ['VendorPaymentCreate.jsx','hydrateVendorPaymentDraft'],
    ['CreditNoteCreate.jsx','hydrateCreditNoteDraft'],
    ['DebitNoteCreate.jsx','hydrateDebitNoteDraft'],
  ];
  for (const [file, hydrate] of files) {
    const src = read(`src/features/transactions/pages/${file}`);
    assert.match(src, /useParams/);
    assert.match(src, new RegExp(hydrate));
    assert.match(src, /isEditing/);
    assert.match(src, /\.update\(editId/);
  }
  const ops = read('src/features/transactions/phase1/OperationalDocCreate.jsx');
  assert.match(ops, /hydrateOperationalDraft/);
  assert.match(ops, /api\.update\(editId/);
});

test('draft detail pages provide an Edit draft action only while draft', () => {
  const bar = read('src/features/transactions/components/TransactionWorkflowActionBar.jsx');
  assert.match(bar, /editHref/);
  assert.match(bar, /Edit draft/);
  for (const file of ['InvoiceDetail.jsx','BillDetail.jsx','CustomerReceiptDetail.jsx','VendorPaymentDetail.jsx','CreditNoteDetail.jsx','DebitNoteDetail.jsx']) {
    const src = read(`src/features/transactions/pages/${file}`);
    assert.match(src, /editHref=\{String\(status\)\.toLowerCase\(\) === 'draft'/);
  }
  const ops = read('src/features/transactions/phase1/OperationalDocDetail.jsx');
  assert.match(ops, /config\.routeEdit\(id\)/);
});
