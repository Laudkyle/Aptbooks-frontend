import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, '..');

function read(rel) {
  return fs.readFileSync(path.join(srcRoot, rel), 'utf8');
}

test('invoice e-invoice requests are status-gated to issued/paid documents', () => {
  const src = read('features/transactions/pages/InvoiceDetail.jsx');
  assert.match(src, /const einvoiceEligible = \["issued", "paid"\]\.includes/);
  assert.match(src, /queryKey: \["invoice", id, "einvoicePreview"\][\s\S]*enabled: !!id && einvoiceEligible/);
  assert.match(src, /queryKey: \["invoice", id, "filingStatus"\][\s\S]*enabled: !!id && einvoiceEligible/);
  assert.match(src, /\{einvoiceEligible && \(/);
  assert.match(src, /filingStatusQ\.data\?\.filing_status/);
  assert.match(src, /einvoiceQ\.data\?\.profile_code/);
  assert.doesNotMatch(src, /filingStatusQ\.data\?\.(?:status|state)/);
});

test('bills do not call or advertise invoice-only e-invoice endpoints', () => {
  const detail = read('features/transactions/pages/BillDetail.jsx');
  const api = read('features/transactions/api/bills.api.js');
  const endpoints = read('shared/api/endpoints.js');

  assert.doesNotMatch(detail, /einvoicePreview|filingStatus|E-invoicing Status|E-invoice payload/);
  assert.doesNotMatch(api, /getEinvoicePreview|getFilingStatus|einvoicePreview|filingStatus/);

  const billsBlock = endpoints.match(/bills:\s*\{[\s\S]*?\n\s*\},\n\s*customerReceipts:/)?.[0] ?? '';
  assert.ok(billsBlock, 'bills endpoint block should be present');
  assert.doesNotMatch(billsBlock, /einvoicePreview|filingStatus|einvoice-preview|filing-status/);
});

test('invoice e-invoice endpoints remain configured for eligible invoice states', () => {
  const endpoints = read('shared/api/endpoints.js');
  const api = read('features/transactions/api/invoices.api.js');
  assert.match(endpoints, /invoices[\s\S]*einvoicePreview:[\s\S]*\/einvoice-preview/);
  assert.match(endpoints, /invoices[\s\S]*filingStatus:[\s\S]*\/filing-status/);
  assert.match(api, /getEinvoicePreview/);
  assert.match(api, /getFilingStatus/);
});
