const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('top navigation renders live TopSearch instead of a desktop search-page button', () => {
  const topNav = read('shared/components/layout/TopNav.jsx');
  const topSearch = read('shared/components/layout/TopSearch.jsx');
  assert.match(topNav, /<TopSearch\s*\/>/);
  assert.match(topSearch, /api\.search/);
  assert.match(topSearch, /resolveSearchResultPath/);
  assert.match(topSearch, /Ctrl K/);
});

test('sidebar uses requested Profit and Loss and Payments labels', () => {
  const source = read('app/navigation/side-nav.manifest.js');
  assert.match(source, /to: ROUTES\.accountingPnL[\s\S]{0,220}label: "Profit and Loss"/);
  assert.match(source, /to: ROUTES\.vendorPayments[\s\S]{0,220}label: "Payments"/);
});

test('login and account settings use emailed verification challenges', () => {
  const login = read('features/auth/pages/Login.jsx');
  const me = read('pages/Me.jsx');
  assert.match(login, /twoFactorRequired/);
  assert.match(login, /verification code/i);
  assert.match(me, /Two-step verification by email/);
  assert.match(me, /No authenticator app is required/);
});

test('system account is defensively hidden from the users page', () => {
  const users = read('features/foundation/users/pages/UserList.jsx');
  assert.match(users, /system@aptbooks\.local/);
  assert.match(users, /\.filter\(/);
});

test('journal draft form explicitly permits incomplete drafts and can be resumed', () => {
  const form = read('features/accounting/journals/components/JournalDraftForm.jsx');
  const detail = read('features/accounting/journals/pages/JournalDetail.jsx');
  assert.match(form, /Drafts can be incomplete/);
  assert.match(form, /Save draft/);
  assert.match(form, /journalId/);
  assert.match(detail, /Edit draft/);
  assert.match(detail, /Continue journal draft/);
});

test('account detail launches the shared journal form with the selected account', () => {
  const source = read('features/accounting/chartOfAccounts/pages/AccountDetail.jsx');
  assert.match(source, /New journal for this account/);
  assert.match(source, /<JournalDraftForm/);
  assert.match(source, /initialAccountId=\{id\}/);
});
