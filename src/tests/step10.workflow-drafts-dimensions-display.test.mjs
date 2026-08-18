import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('approval inbox omits undefined query values and server-filters source/state/document type', () => {
  const endpoints = read('shared/api/endpoints.js');
  const queue = read('features/workflow/approvals/pages/ApprovalQueue.jsx');
  assert.match(endpoints, /function cleanQueryString/);
  assert.match(endpoints, /value === undefined \|\| value === null \|\| value === ''/);
  assert.match(endpoints, /text !== 'undefined' && text !== 'null'/);
  assert.match(queue, /source:\s+sourceFilter \|\| undefined/);
  assert.match(queue, /state:\s+state\s+\|\| undefined/);
  assert.match(queue, /documentTypeId:\s+documentTypeId \|\| undefined/);
  assert.match(queue, /Pending Approval/);
  assert.doesNotMatch(queue, /row\.title \?\? row\.entity_id/);
  assert.doesNotMatch(queue, /row\.title \?\? row\.document_id/);
});

test('dimension security and allocation dimensions are human selects rather than UUID entry fields', () => {
  const rules = read('features/foundation/dimensionSecurity/pages/DimensionRules.jsx');
  const allocations = read('features/reporting/pages/Allocations.jsx');
  assert.match(rules, /principalOptions/);
  assert.match(rules, /dimensionOptions/);
  assert.match(rules, /Cost Centers/);
  assert.match(rules, /Profit Centers/);
  assert.match(rules, /Investment Centers/);
  assert.match(rules, /Projects/);
  assert.doesNotMatch(rules, /Principal ID is required/);
  assert.match(allocations, /label="Cost Center"/);
  assert.match(allocations, /label="Profit Center"/);
  assert.match(allocations, /label="Investment Center"/);
  assert.match(allocations, /label="Project Phase"/);
  assert.match(allocations, /label="Project Task"/);
  assert.doesNotMatch(allocations, /placeholder='\{ "projectId": "uuid", "locationId": "uuid" \}'/);
  assert.doesNotMatch(allocations, /dimensionKey:\s*'customId'/);
});

test('fixed asset dimensions use named option endpoints rather than manual IDs', () => {
  const create = read('features/assets/pages/FixedAssetCreate.jsx');
  const transfer = read('features/assets/pages/AssetTransfer.jsx');
  const api = read('features/assets/api/assets.api.js');
  assert.match(api, /listDimensionOptions/);
  assert.match(create, /dimensionOptions/);
  assert.match(create, /label="Location"/);
  assert.match(create, /label="Department"/);
  assert.match(create, /label="Cost center"/);
  assert.match(transfer, /listDimensionOptions/);
});

test('major transaction and administration pages do not visibly fall back to internal UUIDs', () => {
  const files = [
    'features/transactions/pages/InvoiceList.jsx',
    'features/transactions/pages/BillList.jsx',
    'features/transactions/pages/CustomerReceiptList.jsx',
    'features/transactions/pages/VendorPaymentList.jsx',
    'features/transactions/pages/CreditNoteList.jsx',
    'features/transactions/pages/DebitNoteList.jsx',
    'features/transactions/phase1/OperationalDocList.jsx',
    'features/foundation/users/pages/UserDetail.jsx',
    'features/foundation/roles/pages/RoleDetail.jsx',
  ];
  const source = files.map(read).join('\n');
  assert.doesNotMatch(source, />User ID</);
  assert.doesNotMatch(source, />Role ID</);
  assert.doesNotMatch(source, /\?\?\s*row\.customer_id\s*\?\?/);
  assert.doesNotMatch(source, /\?\?\s*row\.vendor_id\s*\?\?/);
  assert.doesNotMatch(source, /document_no\s*\?\?\s*r\.id/);
});

test('journal detail displays names/codes for users and technical relationships', () => {
  const detail = read('features/accounting/journals/pages/JournalDetail.jsx');
  assert.match(detail, /created_by_name/);
  assert.match(detail, /submitted_by_name/);
  assert.match(detail, /approved_by_name/);
  assert.match(detail, /period_code/);
  assert.doesNotMatch(detail, /Created By[\s\S]{0,160}j\?\.created_by\s*\|\|/);
});
