
export function coerceNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export function computeLineAmounts(line = {}, taxCodeMap = {}, pricingMode = 'exclusive') {
  const quantity = coerceNumber(line.quantity ?? line.qty ?? 1, 1);
  const unitPrice = coerceNumber(line.unitPrice ?? line.unit_price ?? 0, 0);
  const lineDiscount = coerceNumber(line.discountAmount ?? line.discount_amount ?? 0, 0);
  const gross = quantity * unitPrice;
  const baseBeforeTax = Math.max(0, gross - lineDiscount);

  const explicitRate = line.taxRate ?? line.tax_rate;
  const taxCodeId = line.taxCodeId ?? line.tax_code_id;
  const fallbackCode = taxCodeMap[taxCodeId] ?? {};
  const taxRate = coerceNumber(explicitRate ?? fallbackCode.rate ?? fallbackCode.tax_rate ?? 0, 0);
  const withholdingRate = coerceNumber(line.withholdingRate ?? line.withholding_rate ?? 0, 0);
  const recoverablePercent = coerceNumber(line.recoverablePercent ?? line.recoverable_percent ?? 100, 100);

  let taxableBase = baseBeforeTax;
  let taxAmount = 0;
  if (String(pricingMode).toLowerCase() === 'inclusive' && taxRate > 0) {
    taxableBase = baseBeforeTax / (1 + (taxRate / 100));
    taxAmount = baseBeforeTax - taxableBase;
  } else {
    taxAmount = taxableBase * (taxRate / 100);
  }

  const withholdingAmount = taxableBase * (withholdingRate / 100);
  const recoverableTaxAmount = taxAmount * Math.min(Math.max(recoverablePercent, 0), 100) / 100;
  const nonRecoverableTaxAmount = taxAmount - recoverableTaxAmount;
  const total = String(pricingMode).toLowerCase() === 'inclusive' ? baseBeforeTax : taxableBase + taxAmount;
  const payableAmount = total - withholdingAmount;

  return {
    quantity,
    unitPrice,
    gross,
    lineDiscount,
    taxableBase,
    taxRate,
    taxAmount,
    withholdingRate,
    withholdingAmount,
    recoverablePercent,
    recoverableTaxAmount,
    nonRecoverableTaxAmount,
    total,
    payableAmount
  };
}

export function computeDocumentSummary({ lines = [], taxCodes = [], pricingMode = 'exclusive', headerDiscount = 0 } = {}) {
  const map = Object.fromEntries((taxCodes ?? []).map((code) => [code.id, code]));
  const normalized = lines.map((line) => ({
    ...line,
    _calc: computeLineAmounts(line, map, pricingMode)
  }));

  const subtotal = normalized.reduce((sum, line) => sum + line._calc.taxableBase, 0);
  const taxTotal = normalized.reduce((sum, line) => sum + line._calc.taxAmount, 0);
  const withholdingTotal = normalized.reduce((sum, line) => sum + line._calc.withholdingAmount, 0);
  const recoverableTaxTotal = normalized.reduce((sum, line) => sum + line._calc.recoverableTaxAmount, 0);
  const nonRecoverableTaxTotal = normalized.reduce((sum, line) => sum + line._calc.nonRecoverableTaxAmount, 0);
  const grandTotal = normalized.reduce((sum, line) => sum + line._calc.total, 0) - coerceNumber(headerDiscount, 0);
  const payableTotal = grandTotal - withholdingTotal;

  return {
    lines: normalized,
    subtotal,
    taxTotal,
    withholdingTotal,
    recoverableTaxTotal,
    nonRecoverableTaxTotal,
    grandTotal,
    payableTotal,
    headerDiscount: coerceNumber(headerDiscount, 0)
  };
}

export function buildPartnerTaxProfilePayload(state = {}) {
  return {
    taxProfile: {
      taxIdNumber: state.taxIdNumber || undefined,
      vatRegistrationNumber: state.vatRegistrationNumber || undefined,
      taxRegistrationStatus: state.taxRegistrationStatus || undefined,
      taxTreatment: state.taxTreatment || undefined,
      defaultTaxCodeId: state.defaultTaxCodeId || undefined,
      withholdingEnabled: !!state.withholdingEnabled,
      withholdingRate: state.withholdingRate === '' || state.withholdingRate == null ? undefined : coerceNumber(state.withholdingRate),
      recoverabilityPercent: state.recoverabilityPercent === '' || state.recoverabilityPercent == null ? undefined : coerceNumber(state.recoverabilityPercent),
      exemptionReasonCode: state.exemptionReasonCode || undefined,
      exemptionCertificateNumber: state.exemptionCertificateNumber || undefined,
      exemptionExpiryDate: state.exemptionExpiryDate || undefined,
      reverseChargeEligible: !!state.reverseChargeEligible,
      countryCode: state.taxCountryCode || undefined,
      regionCode: state.taxRegionCode || undefined,
      placeOfSupplyBasis: state.placeOfSupplyBasis || undefined,
      eInvoiceScheme: state.eInvoiceScheme || undefined,
      buyerReference: state.buyerReference || undefined,
      filingCurrency: state.filingCurrency || undefined
    }
  };
}
