const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const srcRoot = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(srcRoot, relative), 'utf8');

test('GRA UI wave 1 uses the exact backend endpoint names', () => {
  const endpoints = read('shared/api/endpoints.js');
  assert.match(endpoints, /\/core\/accounting\/tax\/catalog-profiles/);
  assert.match(endpoints, /\/core\/accounting\/tax\/ledger/);
  assert.match(endpoints, /\/core\/accounting\/tax\/partner-profiles/);
  assert.match(endpoints, /\/core\/accounting\/tax\/ghana\/readiness/);
  assert.match(endpoints, /\/core\/accounting\/tax\/ghana\/withholding\/rates/);
});

test('GRA compliance API reads only the exact wrapped response contract', () => {
  const api = read('features/accounting/tax/api/ghanaCompliance.api.js');
  assert.doesNotMatch(api, /normalize/i);
  assert.doesNotMatch(api, /Array\.isArray/);
  assert.doesNotMatch(api, /response\.data\?\./);
  assert.match(api, /return response\.data\.data;/);
  assert.match(api, /return response\.data;\n\s*},\n\n\s*async listTaxLedger/);
});

test('GRA wave 1 forms do not ask users to type internal IDs', () => {
  const files = [
    'features/accounting/tax/pages/ghana/GhanaComplianceOverview.jsx',
    'features/accounting/tax/pages/ghana/TaxLedger.jsx',
    'features/accounting/tax/pages/ghana/TaxCatalogProfiles.jsx',
    'features/accounting/tax/pages/ghana/PartnerTaxProfiles.jsx',
    'shared/components/forms/TaxCatalogProfileSelect.jsx',
    'features/inventory/pages/ItemCreate.jsx',
    'features/inventory/pages/Items.jsx',
  ];
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /label=["'][^"']*\b(UUID|ID)\b/i, file);
    assert.doesNotMatch(source, /placeholder=["'][^"']*\b(UUID|ID|IDs)\b/i, file);
  }
});

test('inventory Ghana tax classification uses a readable select and exact taxProfileId payload', () => {
  const create = read('features/inventory/pages/ItemCreate.jsx');
  const items = read('features/inventory/pages/Items.jsx');
  const selector = read('shared/components/forms/TaxCatalogProfileSelect.jsx');
  assert.match(create, /<TaxCatalogProfileSelect/);
  assert.match(create, /taxProfileId: form\.taxProfileId \|\| null/);
  assert.match(items, /taxProfileId: taxProfileId \|\| null/);
  assert.match(selector, /value: profile\.id/);
  assert.match(selector, /profile\.code.*profile\.name/);
  assert.doesNotMatch(selector, /label:.*profile\.id/);
});

test('Ghana compliance routes and permission are registered', () => {
  const routes = read('app/constants/routes.js');
  const permissions = read('app/constants/permissions.js');
  const routeConfig = read('app/routes/index.jsx');
  assert.match(routes, /accountingTaxGhana:\s*['"]\/accounting\/tax\/ghana['"]/);
  assert.match(routes, /accountingTaxGhanaLedger/);
  assert.match(routes, /accountingTaxGhanaCatalogProfiles/);
  assert.match(routes, /accountingTaxGhanaPartnerProfiles/);
  assert.match(permissions, /taxGhanaReadinessRead:\s*['"]tax\.ghana\.readiness\.read['"]/);
  assert.match(routeConfig, /PERMISSIONS\.taxGhanaReadinessRead/);
});
