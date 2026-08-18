import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('tax transaction payloads serialize quantities and unit prices as fixed decimal strings', () => {
  const src = read('src/shared/tax/frontendTax.js');
  assert.match(src, /quantity:[\s\S]*?formatScaledInteger\(toScaledInteger\(line\.quantity/);
  assert.match(src, /unitPrice:[\s\S]*?formatScaledInteger\(toScaledInteger\(line\.unitPrice/);
});

test('shared operational transaction payloads preserve decimal strings', () => {
  const src = read('src/features/transactions/phase1/helpers.js');
  assert.match(src, /payload\.amountTotal = String\(form\.amountTotal/);
  assert.match(src, /quantity:[\s\S]*?String\(line\.quantity/);
  assert.match(src, /unitPrice:[\s\S]*?String\(line\.unitPrice/);
  assert.match(src, /lineTotal:[\s\S]*?String\(line\.lineTotal/);
});

test('receipt payment and note allocation screens submit money as strings', () => {
  const receipt = read('src/features/transactions/pages/CustomerReceiptCreate.jsx');
  const payment = read('src/features/transactions/pages/VendorPaymentCreate.jsx');
  assert.match(receipt, /amountTotal: moneyString/);
  assert.match(receipt, /amountApplied: moneyString/);
  assert.match(payment, /amountTotal: moneyString/);
  assert.match(payment, /amountApplied: moneyString/);

  for (const rel of ['CreditNoteDetail.jsx', 'DebitNoteDetail.jsx']) {
    const src = read(`src/features/transactions/pages/${rel}`);
    assert.match(src, /const amount = String\(applyBody\.amountApplied/);
    assert.doesNotMatch(src, /const amount = parseFloat\(applyBody\.amountApplied\)/);
  }
});

test('asset and accrual forms preserve financial strings at request boundary', () => {
  for (const rel of ['FixedAssetCreate.jsx', 'AssetDispose.jsx', 'AssetRevalue.jsx', 'AssetImpair.jsx']) {
    const src = read(`src/features/assets/pages/${rel}`);
    assert.match(src, /String\(/, rel);
  }
  const accrual = read('src/features/accounting/accruals/pages/AccrualCreate.jsx');
  assert.match(accrual, /amountValue: String\(l\.amountValue/);
  assert.match(accrual, /totalAmount: String\(defTotalAmount/);
});
