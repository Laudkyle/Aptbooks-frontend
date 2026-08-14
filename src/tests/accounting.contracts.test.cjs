const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('journal create consumes backend journalId contract', () => {
  const source = read('features/accounting/journals/pages/JournalCreate.jsx');
  assert.match(source, /accountingJournalDetail\(data\?\.journalId/);
  assert.doesNotMatch(source, /accountingJournalDetail\(data\?\.id/);
});

test('journal API maps complete lifecycle endpoints', () => {
  const source = read('features/accounting/journals/api/journals.api.js');
  for (const verb of ['submit', 'approve', 'reject', 'cancel', 'post', 'void']) {
    assert.match(source, new RegExp(`${verb}:\\s*async`));
  }
});

test('critical accounting routes remain permission guarded', () => {
  const source = read('app/routes/index.jsx');
  for (const permission of [
    'PERMISSIONS.accountingJournalRead',
    'PERMISSIONS.accountingJournalCreate',
    'PERMISSIONS.accountingBalancesRead',
    'PERMISSIONS.accountingPeriodRead',
    'PERMISSIONS.accountingCoaRead',
  ]) assert.ok(source.includes(permission), `missing ${permission}`);
});

test('journal detail action policy is delegated to tested lifecycle logic', () => {
  const source = read('features/accounting/journals/pages/JournalDetail.jsx');
  assert.match(source, /allowedJournalActions/);
});
