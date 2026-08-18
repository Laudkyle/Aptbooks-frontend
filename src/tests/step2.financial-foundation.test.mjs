import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPercentagePoints,
  inclusiveTaxBreakdown,
  multiplyScaled,
  toScaledInteger,
} from '../shared/finance/fixedPoint.js';
import {
  buildPartnerTaxProfilePayload,
  buildTaxSubmissionLines,
  buildTransactionTaxPayload,
  computeLineAmounts,
  normalizeTaxProfile,
} from '../shared/tax/frontendTax.js';

test('1 percent is 1 percent, not 100 percent', () => {
  const calc = computeLineAmounts({ quantity: 1, unitPrice: 100, taxRate: 1, recoverablePercent: 100 });
  assert.equal(calc.taxRate, 1);
  assert.equal(calc.taxAmount, 1);
  assert.equal(calc.total, 101);
});

test('sub-one percentage points remain percentage points', () => {
  const calc = computeLineAmounts({ quantity: 1, unitPrice: 100, taxRate: 0.5, recoverablePercent: 100 });
  assert.equal(calc.taxRate, 0.5);
  assert.equal(calc.taxAmount, 0.5);
});

test('inclusive tax and fixed-point multiplication are deterministic', () => {
  assert.deepEqual(inclusiveTaxBreakdown(11500n, 15), { baseUnits: 10000n, taxUnits: 1500n });
  assert.equal(multiplyScaled('2.5000', 4, '3.33', 2, 2), 833n);
  assert.equal(toScaledInteger('10.005', 2), 1001n);
  assert.equal(applyPercentagePoints(10000n, 1), 100n);
});

test('withholding uses percentage points while recoverability uses persisted fraction', () => {
  const profile = normalizeTaxProfile({
    withholding_rate_override: '1.000000',
    recoverable_percent_override: '0.500000',
  });
  assert.equal(profile.withholdingRate, 1);
  assert.equal(profile.recoverabilityPercent, 50);

  const partnerPayload = buildPartnerTaxProfilePayload({ withholdingRate: '5', recoverabilityPercent: '50' });
  assert.equal(partnerPayload.withholdingRateOverride, 5);
  assert.equal(partnerPayload.recoverablePercentOverride, 0.5);

  const [line] = buildTaxSubmissionLines([
    { quantity: 1, unitPrice: 100, taxRate: 1, withholdingRate: 5, recoverablePercent: 50 },
  ]);
  assert.equal(line.withholdingRateOverride, 5);
  assert.equal(line.recoverablePercentOverride, 0.5);
  assert.equal(line.taxAmount, undefined);
  assert.equal(line.taxableAmount, undefined);
  assert.equal(line.lineTotal, undefined);
});


test('submission payload contains tax selections, not client-calculated monetary totals', () => {
  const payload = buildTransactionTaxPayload(
    {
      customerId: 'customer',
      invoiceDate: '2026-08-17',
      dueDate: '2026-08-17',
      lines: [{ quantity: 1, unitPrice: 100, taxRate: 1, taxCodeId: 'tax-code', revenueAccountId: 'acct' }],
    },
    { partnerKey: 'customerId', dateKey: 'invoiceDate', accountField: 'revenueAccountId', taxCodes: [] },
  );
  assert.equal(payload.taxSummary, undefined);
  assert.equal(payload.lines[0].taxAmount, undefined);
  assert.equal(payload.lines[0].taxableAmount, undefined);
  assert.equal(payload.lines[0].lineTotal, undefined);
  assert.equal(payload.lines[0].taxCodeId, 'tax-code');
});
