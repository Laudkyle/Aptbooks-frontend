import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('financial void invalidation clears AR/AP and tax report caches', () => {
  const helper = read('src/shared/query/invalidateFinancialImpact.js');
  assert.match(helper, /queryKey: \['reports'\]/);
  assert.match(helper, /queryKey: \['tax'\]/);
  assert.match(helper, /queryKey: \['reporting'\]/);
  assert.match(helper, /root\.startsWith\('tax-'\)/);
  assert.match(helper, /trialBalance/);
  assert.match(helper, /balanceSheet/);
});

test('all operational financial detail void actions invalidate derived reporting', () => {
  for (const file of [
    'InvoiceDetail.jsx',
    'BillDetail.jsx',
    'CustomerReceiptDetail.jsx',
    'VendorPaymentDetail.jsx',
    'CreditNoteDetail.jsx',
    'DebitNoteDetail.jsx',
  ]) {
    const src = read(`src/features/transactions/pages/${file}`);
    assert.match(src, /invalidateFinancialImpact/);
    assert.match(src, /action === "void"/);
  }
  const ops = read('src/features/transactions/phase1/OperationalDocDetail.jsx');
  assert.match(ops, /vars\.key === 'void'/);
  assert.match(ops, /invalidateFinancialImpact\(qc\)/);
});
