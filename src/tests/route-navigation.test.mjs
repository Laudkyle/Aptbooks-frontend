import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRouteNavigation, getBackFallback } from '../app/navigation/route-navigation.mjs';

function labels(path) {
  return buildRouteNavigation(path).map((item) => item.label);
}

test('vendor payment detail uses operations hierarchy', () => {
  const crumbs = buildRouteNavigation('/transactions/vendor-payments/abc-12345678');
  assert.deepEqual(crumbs.map((item) => item.label), ['Operations', 'Vendor Payments', 'Vendor Payment Details']);
  assert.equal(crumbs[1].to, '/transactions/vendor-payments');
  assert.equal(crumbs.at(-1).to, '/transactions/vendor-payments/abc-12345678');
});

test('journal details use accounting hierarchy', () => {
  assert.deepEqual(labels('/accounting/journals/12345678-abcd'), ['Accounting', 'Journals', 'Journal Details']);
});

test('account detail uses chart of accounts hierarchy', () => {
  assert.deepEqual(labels('/accounting/coa/12345678-abcd'), ['Accounting', 'Chart of Accounts', 'Account Details']);
});

test('financial statements include virtual group navigation', () => {
  assert.deepEqual(labels('/accounting/statements/balance-sheet'), ['Accounting', 'Financial Statements', 'Balance Sheet']);
});

test('banking treasury detail keeps useful parents', () => {
  assert.deepEqual(labels('/banking/treasury/payment-runs/12345678-abcd'), ['Banking', 'Treasury', 'Payment Runs', 'Payment Run Details']);
});

test('new vendor payment points current crumb to current page', () => {
  const crumbs = buildRouteNavigation('/transactions/vendor-payments/new');
  assert.deepEqual(crumbs.map((item) => item.label), ['Operations', 'Vendor Payments', 'New Vendor Payment']);
  assert.equal(crumbs.at(-1).current, true);
});

test('fallback is the previous useful breadcrumb', () => {
  const crumbs = buildRouteNavigation('/transactions/vendor-payments/abc-12345678');
  assert.equal(getBackFallback(crumbs), '/transactions/vendor-payments');
});
