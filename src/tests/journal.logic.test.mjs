import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmountToCents, centsToDecimal, sumJournalLines, allowedJournalActions } from '../features/accounting/journals/journal.logic.mjs';

test('journal money parsing stays in integer minor units', () => {
  assert.equal(parseAmountToCents('10.01'), 1001n);
  assert.equal(centsToDecimal(1001n), '10.01');
  assert.equal(parseAmountToCents('1.001'), null);
});

test('journal totals detect balanced and temporarily unbalanced drafts exactly', () => {
  assert.deepEqual(sumJournalLines([{ debit: '120.00' }, { credit: '100.00' }]), {
    debit: 12000n, credit: 10000n, valid: true, balanced: false,
  });
  assert.equal(sumJournalLines([{ debit: '120.00' }, { credit: '120.00' }]).balanced, true);
});

test('journal lifecycle never offers void for draft or cancel for posted', () => {
  const all = { submit: true, approve: true, reject: true, cancel: true, post: true, void: true };
  assert.deepEqual(allowedJournalActions('draft', all), ['submit', 'cancel']);
  assert.deepEqual(allowedJournalActions('submitted', all), ['approve', 'reject']);
  assert.deepEqual(allowedJournalActions('approved', all), ['post']);
  assert.deepEqual(allowedJournalActions('posted', all), ['void']);
  assert.deepEqual(allowedJournalActions('voided', all), []);
});

test('permission capabilities remove unauthorized mutation actions', () => {
  assert.deepEqual(allowedJournalActions('draft', { submit: false, cancel: false }), []);
  assert.deepEqual(allowedJournalActions('posted', { void: false }), []);
});
