import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('invoice and bill preview clients target the implemented preview route', () => {
  const endpoints = read('src/shared/api/endpoints.js');
  const invoiceApi = read('src/features/transactions/api/invoices.api.js');
  const billApi = read('src/features/transactions/api/bills.api.js');
  assert.match(endpoints, /invoices\/\$\{id\}\/determine-taxes/);
  assert.match(endpoints, /bills\/\$\{id\}\/determine-taxes/);
  assert.match(invoiceApi, /id = 'preview'/);
  assert.match(billApi, /id = 'preview'/);
});

test('invoice and bill create forms no longer hard-code USD when backend posts in organization base currency', () => {
  for (const rel of [
    'src/features/transactions/pages/InvoiceCreate.jsx',
    'src/features/transactions/pages/BillCreate.jsx',
  ]) {
    const src = read(rel);
    assert.doesNotMatch(src, /currencyCode:\s*'USD'/);
    assert.doesNotMatch(src, /<CurrencySelect/);
  }
});
