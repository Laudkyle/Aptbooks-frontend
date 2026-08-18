import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { moneyNumberFromUnits, moneyString, moneyUnits } from '../shared/finance/money.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(srcRoot, rel), 'utf8');

test('frontend money wrapper is fixed-point and rounds only at the declared currency boundary', () => {
  assert.equal(moneyUnits('0.10') + moneyUnits('0.20'), 30n);
  assert.equal(moneyString('12.345'), '12.35');
  assert.equal(moneyNumberFromUnits(1234n), 12.34);
});

test('high-risk transaction forms preserve decimal strings in API payloads', () => {
  const inventory = read('features/inventory/pages/TransactionCreate.jsx');
  const receipt = read('features/transactions/pages/CustomerReceiptCreate.jsx');
  const payment = read('features/transactions/pages/VendorPaymentCreate.jsx');
  assert.match(inventory, /quantity: String\(l\.quantity/);
  assert.doesNotMatch(inventory, /quantity: Number\(l\.quantity\)/);
  assert.match(receipt, /amountTotal: moneyString\(payload\.amountTotal/);
  assert.match(payment, /amountTotal: moneyString\(formData\.amountTotal/);
  assert.doesNotMatch(payment, /amountTotal: parseFloat/);
});

test('asset mutation forms do not coerce accounting amounts to Number before submission', () => {
  for (const [rel, field] of [
    ['features/assets/pages/FixedAssetCreate.jsx', 'cost'],
    ['features/assets/pages/AssetRevalue.jsx', 'newValue'],
    ['features/assets/pages/AssetImpair.jsx', 'impairmentAmount'],
    ['features/assets/pages/AssetDispose.jsx', 'proceeds'],
  ]) {
    const src = read(rel);
    assert.match(src, new RegExp(`${field}: String\\(`));
    assert.doesNotMatch(src, new RegExp(`${field}: Number\\(`));
  }
});
