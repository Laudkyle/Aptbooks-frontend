const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

test('GRA UI2 uses exact GRA-2 backend endpoint names', () => {
  const endpoints = read('shared/api/endpoints.js');
  const exact = [
    '/core/accounting/tax/ghana/vat/registration-monitor',
    '/core/accounting/tax/ghana/vat/apportionments',
    '/core/accounting/tax/ghana/vat/apportionments/calculate',
    '/core/accounting/tax/ghana/imported-services',
    '/reporting/tax/ghana/vat-return',
    '/reporting/tax/ghana/vat-transactions',
    '/reporting/tax/ghana/vat-reconciliation',
    '/reporting/tax/ghana/imported-services-summary',
  ];
  for (const route of exact) assert.ok(endpoints.includes(route), `missing exact endpoint ${route}`);
});

test('GRA UI2 API reads exact response wrappers instead of normalization fallbacks', () => {
  const api = read('features/accounting/tax/api/ghanaCompliance.api.js');
  assert.ok(api.includes('return response.data;'), 'direct-response GRA routes should read response.data');
  assert.ok(api.includes('return response.data.data;'), 'wrapped GRA routes should read response.data.data');
  assert.equal(/normalizeRows|\?\?\s*response|\.rows\s*\?\?/.test(api), false, 'API must not use response-shape fallback normalization');
});

test('GRA UI2 routes VAT workflows through Ghana Compliance', () => {
  const routes = read('app/constants/routes.js');
  for (const route of [
    '/accounting/tax/ghana/vat',
    '/accounting/tax/ghana/vat/return',
    '/accounting/tax/ghana/vat/apportionment',
    '/accounting/tax/ghana/vat/imported-services',
    '/accounting/tax/ghana/vat/reconciliation',
  ]) assert.ok(routes.includes(route));
});

test('GRA UI2 never asks for internal UUID or database ID in its forms', () => {
  const files = [
    'features/accounting/tax/pages/ghana/GhanaVatOverview.jsx',
    'features/accounting/tax/pages/ghana/GhanaVatReturn.jsx',
    'features/accounting/tax/pages/ghana/GhanaVatApportionment.jsx',
    'features/accounting/tax/pages/ghana/GhanaImportedServices.jsx',
    'features/accounting/tax/pages/ghana/GhanaImportedServiceDetail.jsx',
    'features/accounting/tax/pages/ghana/GhanaVatReconciliation.jsx',
    'features/accounting/tax/components/ImportedServiceForm.jsx',
  ];
  const source = files.map(read).join('\n');
  assert.equal(/label=["'`][^"'`]*(UUID|\bID\b|Identifier ID)/i.test(source), false);
  assert.equal(/placeholder=["'`][^"'`]*(UUID|\bID\b)/i.test(source), false);
  assert.ok(source.includes('label="Supplier"'));
  assert.ok(source.includes('label="Ghana imported-services tax code"'));
});

test('GRA UI2 imported-service relationship IDs are selected, not typed', () => {
  const form = read('features/accounting/tax/components/ImportedServiceForm.jsx');
  assert.match(form, /<Select label="Supplier"/);
  assert.match(form, /<Select label="Ghana imported-services tax code"/);
  assert.doesNotMatch(form, /<Input label="Supplier"/);
  assert.doesNotMatch(form, /<Input label=".*tax code/i);
});
