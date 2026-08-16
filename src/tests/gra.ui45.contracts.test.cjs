const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const src = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(src, rel), 'utf8');

const advancedApi = read('features/accounting/tax/api/ghanaAdvanced.api.js');
const payrollApi = read('features/hr/api/ghanaPayroll.api.js');
const routes = read('app/constants/routes.js');
const permissions = read('app/constants/permissions.js');

const wave45Pages = [
  'features/hr/pages/ghana/GhanaPayrollOverview.jsx',
  'features/hr/pages/ghana/GhanaPayeReturns.jsx',
  'features/hr/pages/ghana/GhanaPayeReturnDetail.jsx',
  'features/hr/pages/ghana/GhanaPensionSchedule.jsx',
  'features/hr/pages/ghana/GhanaDisengagedSchedule.jsx',
  'features/hr/pages/ghana/GhanaPayrollRemittances.jsx',
  'features/accounting/tax/pages/ghana/advanced/GhanaEvatOverview.jsx',
  'features/accounting/tax/pages/ghana/advanced/GhanaEvatDocuments.jsx',
  'features/accounting/tax/pages/ghana/advanced/GhanaEvatDocumentDetail.jsx',
  'features/accounting/tax/pages/ghana/advanced/GhanaEvatQueue.jsx',
  'features/accounting/tax/pages/ghana/advanced/GhanaEvatDevices.jsx',
  'features/accounting/tax/pages/ghana/advanced/GhanaEvatLogs.jsx',
  'features/accounting/tax/pages/ghana/advanced/GhanaEvatSettings.jsx',
  'features/accounting/tax/pages/ghana/advanced/GhanaCit.jsx',
  'features/accounting/tax/pages/ghana/advanced/GhanaCitComputation.jsx',
  'features/accounting/tax/pages/ghana/advanced/GhanaCapitalAllowances.jsx',
  'features/accounting/tax/pages/ghana/advanced/GhanaIndustryProfiles.jsx',
].map(read).join('\n');

test('UI waves 4 and 5 use exact Ghana payroll endpoints', () => {
  for (const endpoint of [
    "const BASE = '/modules/hr/payroll/ghana'",
    '`$\{BASE}/settings`',
    '`$\{BASE}/returns`',
    '/pension-schedule',
    '/disengaged-schedule',
    '/remittances',
  ]) assert.ok(payrollApi.includes(endpoint), endpoint);
  assert.doesNotMatch(payrollApi, /response\?\.|\?\?\s*response|\.rows\s*\?\?/);
});

test('UI wave 5 uses exact fiscalization and GRA-6 endpoint paths', () => {
  for (const endpoint of [
    '/modules/integrations/fiscalization',
    '/ghana/cit/settings',
    '/ghana/cit/rates',
    '/ghana/cit/computations',
    '/ghana/cit/self-assessments',
    '/ghana/capital-allowances/classes',
    '/ghana/capital-allowances/assets',
    '/ghana/capital-allowances/runs',
    '/ghana/industry-profiles',
  ]) assert.ok(advancedApi.includes(endpoint), endpoint);
  assert.doesNotMatch(advancedApi, /response\?\.|\?\?\s*response|\.rows\s*\?\?/);
});

test('UI waves 4 and 5 register exact permissions and routes', () => {
  for (const permission of [
    'hr.payroll.ghana.read','hr.payroll.ghana.manage','hr.payroll.ghana.file',
    'fiscalization.read','fiscalization.operate','fiscalization.manage','fiscalization.retry',
    'tax.ghana.cit.read','tax.ghana.cit.manage','tax.ghana.cit.file','tax.ghana.industry.manage',
  ]) assert.ok(permissions.includes(permission), permission);
  for (const route of [
    '/hr/payroll/ghana', '/accounting/tax/ghana/evat', '/accounting/tax/ghana/cit',
    '/accounting/tax/ghana/capital-allowances', '/accounting/tax/ghana/industry-profile',
  ]) assert.ok(routes.includes(route), route);
});

test('UI waves 4 and 5 never ask users to type AptBooks internal IDs', () => {
  assert.doesNotMatch(wave45Pages, /label=["'`][^"'`]*(UUID|internal id|database id|account id|asset id|profile id|return id|document id)[^"'`]*["'`]/i);
  assert.doesNotMatch(wave45Pages, /placeholder=["'`][^"'`]*(UUID|internal id|database id)[^"'`]*["'`]/i);
  assert.ok(wave45Pages.includes('AccountSelect'));
  assert.ok(wave45Pages.includes('Select'));
});

test('E-VAT document list does not invent unsupported sourceId filtering', () => {
  const method = advancedApi.match(/async listDocuments\(query = \{\}\)[\s\S]*?\n      \},/)[0];
  assert.doesNotMatch(method, /sourceId/);
});
