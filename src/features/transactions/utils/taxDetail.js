import { computeDocumentSummary, computeLineAmounts, coerceNumber } from "../../../shared/tax/frontendTax.js";

const pickNumber = (...values) => {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

const pickString = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value);
  }
  return '';
};

export function buildTaxDetailModel({ header = {}, payload = {}, lines = [], pricingMode = 'exclusive' } = {}) {
  const sourceSummary = payload?.taxSummary ?? payload?.tax_summary ?? header?.taxSummary ?? header?.tax_summary ?? {};
  const computed = computeDocumentSummary({ lines, taxCodes: [], pricingMode });
  const summary = {
    subtotal: pickNumber(sourceSummary?.subtotal, header?.subtotal, payload?.subtotal, computed?.subtotal),
    taxTotal: pickNumber(sourceSummary?.taxTotal, sourceSummary?.tax_total, header?.taxTotal, header?.tax_total, header?.tax_amount, header?.vat_amount, payload?.taxTotal, payload?.tax_total, payload?.tax_amount, computed?.taxTotal),
    withholdingTotal: pickNumber(sourceSummary?.withholdingTotal, sourceSummary?.withholding_total, header?.withholdingTotal, header?.withholding_total, header?.withholding_tax_total, header?.withholding_amount, payload?.withholdingTotal, payload?.withholding_total, payload?.withholding_amount, computed?.withholdingTotal),
    nonRecoverableTaxTotal: pickNumber(sourceSummary?.nonRecoverableTaxTotal, sourceSummary?.non_recoverable_tax_total, header?.nonRecoverableTaxTotal, header?.non_recoverable_tax_total, payload?.nonRecoverableTaxTotal, payload?.non_recoverable_tax_total, computed?.nonRecoverableTaxTotal),
    recoverableTaxTotal: pickNumber(sourceSummary?.recoverableTaxTotal, sourceSummary?.recoverable_tax_total, header?.recoverableTaxTotal, header?.recoverable_tax_total, payload?.recoverableTaxTotal, payload?.recoverable_tax_total, computed?.recoverableTaxTotal),
    grandTotal: pickNumber(sourceSummary?.grandTotal, sourceSummary?.grand_total, header?.grandTotal, header?.grand_total, header?.amount_total, payload?.grandTotal, payload?.grand_total, payload?.amount_total, computed?.grandTotal),
    payableTotal: pickNumber(sourceSummary?.payableTotal, sourceSummary?.payable_total, header?.payableTotal, header?.payable_total, payload?.payableTotal, payload?.payable_total, computed?.payableTotal),
  };
  const lineModels = (lines ?? []).map((line) => {
    const calc = computeLineAmounts(line, {}, pricingMode);
    return {
      ...line,
      _tax: {
        taxCode: pickString(line?.taxCode?.code, line?.taxCode?.name, line?.tax_code, line?.taxCodeId, line?.tax_code_id),
        taxRate: pickNumber(line?.taxRate, line?.tax_rate, calc?.taxRate),
        taxAmount: pickNumber(line?.taxAmount, line?.tax_amount, line?.vat_amount, calc?.taxAmount),
        withholdingRate: pickNumber(line?.withholdingRate, line?.withholding_rate, calc?.withholdingRate),
        withholdingAmount: pickNumber(line?.withholdingAmount, line?.withholding_amount, calc?.withholdingAmount),
        recoverablePercent: pickNumber(line?.recoverablePercent, line?.recoverable_percent, calc?.recoverablePercent),
        taxableBase: pickNumber(line?.taxableBase, line?.taxable_base, calc?.taxableBase),
        total: pickNumber(line?.lineTotal, line?.line_total, line?.amount_total, calc?.total),
      }
    };
  });
  const hasLineTax = lineModels.some((line) => line._tax.taxCode || line._tax.taxRate || line._tax.taxAmount || line._tax.withholdingRate || line._tax.withholdingAmount);
  const hasHeaderTax = Object.values(summary).some((value) => Number(value) !== 0) || !!pickString(header?.pricingMode, header?.pricing_mode, payload?.pricingMode, payload?.pricing_mode);
  return {
    summary,
    lines: lineModels,
    hasTax: hasLineTax || hasHeaderTax,
    hasLineTax,
    pricingMode: pickString(header?.pricingMode, header?.pricing_mode, payload?.pricingMode, payload?.pricing_mode, pricingMode) || 'exclusive',
    taxPointDate: pickString(header?.taxDate, header?.tax_date, payload?.taxDate, payload?.tax_date),
    taxJurisdiction: pickString(header?.taxJurisdictionName, header?.tax_jurisdiction_name, header?.taxJurisdictionId, header?.tax_jurisdiction_id, payload?.taxJurisdictionName, payload?.tax_jurisdiction_name),
  };
}

export function formatTaxAmount(formatter, amount) {
  return typeof formatter === 'function' ? formatter(coerceNumber(amount, 0)) : coerceNumber(amount, 0).toFixed(2);
}
