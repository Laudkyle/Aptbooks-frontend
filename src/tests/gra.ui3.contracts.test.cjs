const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

test('GRA UI3 uses exact GRA-3 withholding endpoint names', () => {
  const endpoints = read('shared/api/endpoints.js');
  for (const route of [
    '/core/accounting/tax/ghana/withholding/dashboard',
    '/core/accounting/tax/ghana/withholding/reconciliation',
    '/core/accounting/tax/ghana/withholding/rates',
    '/core/accounting/tax/ghana/withholding/threshold-position',
    '/core/accounting/tax/ghana/withholding/preview',
    '/core/accounting/tax/ghana/withholding/events',
    '/core/accounting/tax/ghana/withholding/certificates',
    '/core/accounting/tax/ghana/withholding/certificates/received',
    '/core/accounting/tax/ghana/withholding/returns',
    '/core/accounting/tax/ghana/withholding/remittances',
  ]) assert.ok(endpoints.includes(route), `missing exact endpoint ${route}`);
});

test('GRA UI3 API binds to wrapped GRA-3 responses without response normalization', () => {
  const api = read('features/accounting/tax/api/ghanaCompliance.api.js');
  assert.ok(api.includes('getWithholdingDashboard'));
  assert.ok(api.includes('listWithholdingEvents'));
  assert.ok(api.includes('recordReceivedWithholdingCertificate'));
  assert.ok(api.includes('prepareGhanaWithholdingReturn'));
  assert.ok(api.includes('createGhanaWithholdingRemittance'));
  assert.equal(/normalizeRows|response\?\.data|\.rows\s*\?\?|\.items\s*\?\?/.test(api), false);
});

test('GRA UI3 exposes all Ghana withholding workflow routes', () => {
  const routes = read('app/constants/routes.js');
  for (const route of [
    '/accounting/tax/ghana/withholding',
    '/accounting/tax/ghana/withholding/events',
    '/accounting/tax/ghana/withholding/certificates',
    '/accounting/tax/ghana/withholding/returns',
    '/accounting/tax/ghana/withholding/remittances',
    '/accounting/tax/ghana/withholding/reconciliation',
  ]) assert.ok(routes.includes(route));
});

test('GRA UI3 never asks users to type internal UUID/database relationship IDs', () => {
  const files = [
    'features/accounting/tax/pages/ghana/GhanaWithholdingOverview.jsx',
    'features/accounting/tax/pages/ghana/GhanaWithholdingEvents.jsx',
    'features/accounting/tax/pages/ghana/GhanaWithholdingCertificates.jsx',
    'features/accounting/tax/pages/ghana/GhanaWithholdingReturns.jsx',
    'features/accounting/tax/pages/ghana/GhanaWithholdingReturnDetail.jsx',
    'features/accounting/tax/pages/ghana/GhanaWithholdingRemittances.jsx',
    'features/accounting/tax/pages/ghana/GhanaWithholdingReconciliation.jsx',
  ];
  const source = files.map(read).join('\n');
  assert.equal(/label=["'`][^"'`]*(UUID|\bID\b|Database ID|Partner ID|Tax Code ID|Account ID)/i.test(source), false);
  assert.equal(/placeholder=["'`][^"'`]*(UUID|\bID\b)/i.test(source), false);
  assert.ok(source.includes('label="Partner"'));
  assert.ok(source.includes('label="Withholding tax code"'));
  assert.ok(source.includes('AccountSelect'));
});

test('vendor payment uses Ghana withholding profile and threshold endpoints without typed IDs', () => {
  const source = read('features/transactions/pages/VendorPaymentCreate.jsx');
  assert.ok(source.includes('getWithholdingThresholdPosition'));
  assert.ok(source.includes('previewWithholding'));
  assert.ok(source.includes('Ghana Withholding Check'));
  assert.doesNotMatch(source, /<Input[^>]+label=["'][^"']*(Partner ID|Tax Code ID|Account ID)/i);
});
