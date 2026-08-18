import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('approval queue routes operational document approvals through business endpoints', () => {
  const src = read('features/workflow/approvals/api/approvals.api.js');
  for (const type of ['invoice','bill','payment_in','payment_out','credit_note','debit_note','quotation','sales_order','purchase_requisition','purchase_order','goods_receipt','expense','petty_cash','advance','return','refund']) {
    assert.match(src, new RegExp(`${type}: endpoints\\.modules\\.transactions`));
  }
  assert.match(src, /transactionEndpoints\[action\]\(entityId\)/);
  assert.match(src, /row\?\.source === 'documents' \? \{ comment: reason \} : \{ reason \}/);
});

test('transaction tax detail model uses canonical gross display amounts and taxable_amount', () => {
  const src = read('features/transactions/utils/taxDetail.js');
  assert.match(src, /export function getLineGrossAmount/);
  assert.match(src, /display_amounts\?\.line_gross_total/);
  assert.match(src, /line\?\.taxable_amount/);
  assert.match(src, /Number\(taxable\) \+ \(Number\.isFinite\(Number\(tax\)\)/);
  assert.match(src, /payload\?\.detail_meta\?\.tax\?\.pricing_mode/);
  assert.match(src, /total: getLineGrossAmount\(line, calc\?\.total\)/);
});

test('invoice, bill and note detail screens no longer add tax twice', () => {
  const files = ['InvoiceDetail.jsx','BillDetail.jsx','CreditNoteDetail.jsx','DebitNoteDetail.jsx'];
  for (const file of files) {
    const src = read(`features/transactions/pages/${file}`);
    assert.match(src, /getLineGrossAmount/);
    assert.doesNotMatch(src, /lineTotal\s*\+\s*taxAmount/);
    assert.doesNotMatch(src, /formatCurrency\(line\.line_total/);
  }
});

test('users who can act on approvals can see the Approvals inbox navigation and route', () => {
  const routes = read('app/routes/index.jsx');
  const nav = read('app/navigation/side-nav.manifest.js');
  assert.match(routes, /RequirePermission any=\{\[PERMISSIONS\.approvalsInboxRead, PERMISSIONS\.approvalsAct\]\}/);
  assert.match(nav, /routeAny: \[PERMISSIONS\.approvalsInboxRead, PERMISSIONS\.approvalsAct\]/);
});

test('notification center renders backend items/meta approval requests and links to the approval inbox', () => {
  const src = read('features/notifications/pages/NotificationCenter.jsx');
  assert.match(src, /Array\.isArray\(payload\.items\)/);
  assert.match(src, /payload\.meta \?\? payload\.paging/);
  assert.match(src, /n\.body/);
  assert.match(src, /n\.type === 'approval'/);
  assert.match(src, /navigate\(ROUTES\.approvalsInbox\)/);
  assert.match(src, /Open approval/);
});
