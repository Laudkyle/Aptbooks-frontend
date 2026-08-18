import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('allocation selectors show document number with open balance', () => {
  const display = read('src/features/transactions/utils/documentDisplay.js');
  assert.match(display, /Balance: \$\{outstandingLabel\}/);
  assert.doesNotMatch(display, /Gross: \$\{totalLabel\}/);
});

test('customer receipt payment method prefills a mapped account without category heuristics', () => {
  const src = read('src/features/transactions/pages/CustomerReceiptCreate.jsx');
  assert.match(src, /handlePaymentMethodChange/);
  assert.match(src, /default_account_id \?\? method\?\.defaultAccountId/);
  assert.match(src, /paymentAccounts = accounts\.filter/);
  assert.doesNotMatch(src, /category_name[\s\S]{0,120}includes\('cash'\)/);
  assert.match(src, /You can override it for this receipt/);
});

test('vendor payment payment method prefills mapped account and account options are postable active accounts', () => {
  const src = read('src/features/transactions/pages/VendorPaymentCreate.jsx');
  assert.match(src, /handlePaymentMethodChange/);
  assert.match(src, /default_account_id \?\? method\?\.defaultAccountId/);
  assert.match(src, /paymentAccountOptions = accounts/);
  assert.match(src, /postable !== false && status === 'active'/);
  assert.doesNotMatch(src, /category_name\?\.toLowerCase\(\)\.includes\('cash'\)/);
  assert.match(src, /You can override it for this payment/);
});

test('business payment methods support creation and default account mapping', () => {
  const page = read('src/features/business/pages/PaymentConfig.jsx');
  const api = read('src/features/business/api/paymentConfig.api.js');
  const endpoints = read('src/shared/api/endpoints.js');
  assert.match(page, /New Payment Method/);
  assert.match(page, /Default Posting Account/);
  assert.match(page, /defaultAccountId/);
  assert.match(page, /Create Method/);
  assert.match(api, /createPaymentMethod/);
  assert.match(api, /updatePaymentMethod/);
  assert.match(api, /deletePaymentMethod/);
  assert.match(endpoints, /paymentMethod: \(id\)/);
});

test('credit and debit note application selectors are scoped to the note counterparty', () => {
  const credit = read('src/features/transactions/pages/CreditNoteDetail.jsx');
  const debit = read('src/features/transactions/pages/DebitNoteDetail.jsx');
  assert.match(credit, /customerId: noteCustomerId/);
  assert.match(credit, /enabled: Boolean\(noteCustomerId\)/);
  assert.match(debit, /vendorId: noteVendorId/);
  assert.match(debit, /enabled: Boolean\(noteVendorId\)/);
});
