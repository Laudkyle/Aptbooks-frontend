import {
  FINANCIAL_SCALE,
  applyPercentagePointUnits,
  applyPercentagePoints,
  clampPercentagePoints,
  fractionToPercentagePointsNumber,
  inclusiveTaxBreakdown,
  multiplyScaled,
  normalizePercentagePointsNumber,
  percentagePointsToFractionNumber,
  scaledIntegerToNumber,
  formatScaledInteger,
  toScaledInteger,
} from '../finance/fixedPoint.js';

export function coerceNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function roundCurrency(value, decimals = FINANCIAL_SCALE.money) {
  return scaledIntegerToNumber(toScaledInteger(value, decimals), decimals);
}

export function normalizeRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function normalizeRecoverableDisplay(value, fallback = 100) {
  if (value === '' || value == null) return fallback;
  return normalizePercentagePointsNumber(value, fallback);
}

function normalizeRecoverableFraction(value, fallback = 1) {
  if (value === '' || value == null) return fallback;
  return percentagePointsToFractionNumber(value);
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

export function normalizeTaxProfile(profile = {}) {
  const source = profile?.taxProfile ?? profile?.tax_profile ?? profile ?? {};
  return {
    taxIdNumber: pickFirst(source.taxIdNumber, source.tax_id_number, source.taxregistrationNumber, source.tax_registration_number) ?? '',
    vatRegistrationNumber: pickFirst(source.vatRegistrationNumber, source.vat_registration_number) ?? '',
    taxRegistrationStatus: pickFirst(source.taxRegistrationStatus, source.tax_registration_status, source.registrationStatus, source.registration_status) ?? '',
    taxTreatment: pickFirst(source.taxTreatment, source.tax_treatment, source.taxClass, source.tax_class) ?? '',
    defaultTaxCodeId: pickFirst(source.defaultTaxCodeId, source.default_tax_code_id) ?? '',
    purchaseTaxCodeId: pickFirst(source.purchaseTaxCodeId, source.purchase_tax_code_id) ?? '',
    salesTaxCodeId: pickFirst(source.salesTaxCodeId, source.sales_tax_code_id) ?? '',
    withholdingEnabled: !!pickFirst(source.withholdingEnabled, source.withholding_enabled, source.withholdingApplicable, source.withholding_applicable),
    withholdingTaxCodeId: pickFirst(source.withholdingTaxCodeId, source.withholding_tax_code_id) ?? '',
    // Tax/withholding rates are percentage points: 1.000000 means 1%, never 100%.
    withholdingRate: normalizePercentagePointsNumber(
      pickFirst(source.withholdingRate, source.withholding_rate, source.withholdingRateOverride, source.withholding_rate_override),
      0,
    ),
    // The persisted recoverable override is a fraction (0..1); the form displays percentage points (0..100).
    recoverabilityPercent:
      pickFirst(source.recoverabilityPercent, source.recoverability_percent) !== undefined
        ? normalizeRecoverableDisplay(pickFirst(source.recoverabilityPercent, source.recoverability_percent), 100)
        : fractionToPercentagePointsNumber(
            pickFirst(source.recoverablePercentOverride, source.recoverable_percent_override) ?? 1,
            100,
          ),
    exemptionReasonCode: pickFirst(source.exemptionReasonCode, source.exemption_reason_code) ?? '',
    exemptionCertificateNumber: pickFirst(source.exemptionCertificateNumber, source.exemption_certificate_number, source.certificateReference, source.certificate_reference, source.withholdingCertificateNo, source.withholding_certificate_no) ?? '',
    exemptionExpiryDate: pickFirst(source.exemptionExpiryDate, source.exemption_expiry_date, source.certificateExpiry, source.certificate_expiry) ?? '',
    reverseChargeEligible: !!pickFirst(source.reverseChargeEligible, source.reverse_charge_eligible, source.reverseChargeApplicable, source.reverse_charge_applicable),
    countryCode: pickFirst(source.countryCode, source.country_code, source.taxCountryCode, source.tax_country_code, source.destinationCountryCode, source.destination_country_code) ?? '',
    regionCode: pickFirst(source.regionCode, source.region_code, source.taxRegionCode, source.tax_region_code, source.metadata?.regionCode) ?? '',
    placeOfSupplyBasis: pickFirst(source.placeOfSupplyBasis, source.place_of_supply_basis, source.placeOfSupply, source.place_of_supply) ?? '',
    eInvoiceScheme: pickFirst(source.eInvoiceScheme, source.e_invoice_scheme, source.eInvoiceNetwork, source.e_invoice_network) ?? '',
    eInvoiceEndpoint: pickFirst(source.eInvoiceEndpoint, source.e_invoice_endpoint) ?? '',
    legalName: pickFirst(source.legalName, source.legal_name) ?? '',
    filingContactEmail: pickFirst(source.filingContactEmail, source.filing_contact_email) ?? '',
    customerTaxIdentifierType: pickFirst(source.customerTaxIdentifierType, source.customer_tax_identifier_type) ?? '',
    vendorTaxIdentifierType: pickFirst(source.vendorTaxIdentifierType, source.vendor_tax_identifier_type) ?? '',
    inputTaxRecoveryMode: pickFirst(source.inputTaxRecoveryMode, source.input_tax_recovery_mode) ?? '',
    buyerReference: pickFirst(source.buyerReference, source.buyer_reference, source.metadata?.buyerReference) ?? '',
    filingCurrency: pickFirst(source.filingCurrency, source.filing_currency, source.metadata?.filingCurrency) ?? '',
    isTaxExempt: !!pickFirst(source.isTaxExempt, source.is_tax_exempt),
    isTaxRegistered: !!pickFirst(source.isTaxRegistered, source.is_tax_registered),
    jurisdictionId: pickFirst(source.jurisdictionId, source.jurisdiction_id) ?? ''
  };
}

export function extractPartnerTaxProfile(partner = {}) {
  const merged = {
    ...(partner?.taxProfile ?? partner?.tax_profile ?? {}),
    ...partner
  };
  return normalizeTaxProfile(merged);
}

export function applyTaxProfileToLine(line = {}, taxProfile = {}) {
  const profile = normalizeTaxProfile(taxProfile);
  const next = { ...line };

  if (!next.taxCodeId) {
    next.taxCodeId = profile.defaultTaxCodeId || profile.purchaseTaxCodeId || profile.salesTaxCodeId || next.taxCodeId;
  }
  if ((next.withholdingRate === '' || next.withholdingRate == null || toScaledInteger(next.withholdingRate, FINANCIAL_SCALE.percentagePoints) === 0n) && profile.withholdingEnabled) {
    next.withholdingRate = profile.withholdingRate;
  }
  if (next.recoverablePercent === '' || next.recoverablePercent == null || toScaledInteger(next.recoverablePercent, FINANCIAL_SCALE.percentagePoints) === 100000000n) {
    next.recoverablePercent = profile.recoverabilityPercent;
  }
  if (!next.exemptionReasonCode && profile.exemptionReasonCode) next.exemptionReasonCode = profile.exemptionReasonCode;
  if (!next.withholdingTaxCodeId && profile.withholdingTaxCodeId) next.withholdingTaxCodeId = profile.withholdingTaxCodeId;
  if (next.withholdingApplicable == null && profile.withholdingEnabled) next.withholdingApplicable = true;
  if (next.reverseCharge == null && profile.reverseChargeEligible) next.reverseCharge = true;
  if (next.taxTreatment == null && profile.isTaxExempt) next.taxTreatment = 'exempt';

  return next;
}

export function applyTaxProfileToDocument(payload = {}, taxProfile = {}, options = {}) {
  const profile = normalizeTaxProfile(taxProfile);
  const preserveExistingHeaderValues = options.preserveExistingHeaderValues !== false;
  const next = {
    ...payload,
    lines: (payload.lines ?? []).map((line) => applyTaxProfileToLine(line, profile))
  };

  const maybeSetHeader = (key, value) => {
    if (value == null || value === '') return;
    if (!preserveExistingHeaderValues || !next[key]) next[key] = value;
  };

  maybeSetHeader('buyerReference', profile.buyerReference);
  maybeSetHeader('placeOfSupplyCountryCode', profile.countryCode);
  maybeSetHeader('taxCountryCode', profile.countryCode);
  maybeSetHeader('jurisdictionId', profile.jurisdictionId);

  return next;
}

export function computeLineAmounts(line = {}, taxCodeMap = {}, pricingMode = 'exclusive') {
  const quantityRaw = line.quantity ?? line.qty ?? 1;
  const unitPriceRaw = line.unitPrice ?? line.unit_price ?? 0;
  const lineDiscountRaw = line.discountAmount ?? line.discount_amount ?? 0;

  const quantityUnits = toScaledInteger(quantityRaw, FINANCIAL_SCALE.documentQuantity);
  const unitPriceUnits = toScaledInteger(unitPriceRaw, FINANCIAL_SCALE.documentUnitPrice);
  const grossUnits = multiplyScaled(
    quantityRaw,
    FINANCIAL_SCALE.documentQuantity,
    unitPriceRaw,
    FINANCIAL_SCALE.documentUnitPrice,
    FINANCIAL_SCALE.money,
  );
  const discountUnits = toScaledInteger(lineDiscountRaw, FINANCIAL_SCALE.money);
  const baseBeforeTaxUnits = grossUnits - discountUnits > 0n ? grossUnits - discountUnits : 0n;

  const explicitRate = line.taxRate ?? line.tax_rate;
  const taxCodeId = line.taxCodeId ?? line.tax_code_id;
  const withholdingTaxCodeId = line.withholdingTaxCodeId ?? line.withholding_tax_code_id;
  const fallbackCode = taxCodeMap[taxCodeId] ?? {};
  const withholdingCode = taxCodeMap[withholdingTaxCodeId] ?? {};

  const taxRate = normalizePercentagePointsNumber(
    pickFirst(explicitRate, fallbackCode.rate, fallbackCode.tax_rate),
    0,
  );
  const withholdingRate = normalizePercentagePointsNumber(
    pickFirst(
      line.withholdingRateOverride,
      line.withholding_rate_override,
      line.withholdingRate,
      line.withholding_rate,
      withholdingCode.rate,
      withholdingCode.tax_rate,
    ),
    0,
  );
  const recoverablePercent = normalizeRecoverableDisplay(
    line.recoverablePercent ?? line.recoverable_percent ?? 100,
    100,
  );

  const inclusive = String(pricingMode).toLowerCase() === 'inclusive';
  let taxableBaseUnits = baseBeforeTaxUnits;
  let taxUnits = 0n;
  if (inclusive) {
    const result = inclusiveTaxBreakdown(baseBeforeTaxUnits, taxRate);
    taxableBaseUnits = result.baseUnits;
    taxUnits = result.taxUnits;
  } else {
    taxUnits = applyPercentagePoints(taxableBaseUnits, taxRate);
  }

  const withholdingUnits = applyPercentagePoints(taxableBaseUnits, withholdingRate);
  const recoverableRateUnits = clampPercentagePoints(recoverablePercent, 0, 100);
  const recoverableTaxUnits = applyPercentagePointUnits(taxUnits, recoverableRateUnits);
  const nonRecoverableTaxUnits = taxUnits - recoverableTaxUnits;
  const totalUnits = inclusive ? baseBeforeTaxUnits : taxableBaseUnits + taxUnits;
  const payableUnits = totalUnits - withholdingUnits;

  return {
    quantity: scaledIntegerToNumber(quantityUnits, FINANCIAL_SCALE.documentQuantity),
    unitPrice: scaledIntegerToNumber(unitPriceUnits, FINANCIAL_SCALE.documentUnitPrice),
    gross: scaledIntegerToNumber(grossUnits, FINANCIAL_SCALE.money),
    lineDiscount: scaledIntegerToNumber(discountUnits, FINANCIAL_SCALE.money),
    taxableBase: scaledIntegerToNumber(taxableBaseUnits, FINANCIAL_SCALE.money),
    // Public rate fields remain percentage points to match API/database semantics and the UI labels.
    taxRate,
    taxAmount: scaledIntegerToNumber(taxUnits, FINANCIAL_SCALE.money),
    withholdingRate,
    withholdingAmount: scaledIntegerToNumber(withholdingUnits, FINANCIAL_SCALE.money),
    recoverablePercent,
    recoverableFraction: percentagePointsToFractionNumber(recoverablePercent),
    recoverableTaxAmount: scaledIntegerToNumber(recoverableTaxUnits, FINANCIAL_SCALE.money),
    nonRecoverableTaxAmount: scaledIntegerToNumber(nonRecoverableTaxUnits, FINANCIAL_SCALE.money),
    total: scaledIntegerToNumber(totalUnits, FINANCIAL_SCALE.money),
    payableAmount: scaledIntegerToNumber(payableUnits, FINANCIAL_SCALE.money),
  };
}

export function computeDocumentSummary({ lines = [], taxCodes = [], pricingMode = 'exclusive', headerDiscount = 0 } = {}) {
  const map = Object.fromEntries((taxCodes ?? []).map((code) => [code.id, code]));
  const normalized = lines.map((line) => ({
    ...line,
    _calc: computeLineAmounts(line, map, pricingMode)
  }));

  const sumMoney = (field) => normalized.reduce(
    (sum, line) => sum + toScaledInteger(line._calc[field], FINANCIAL_SCALE.money),
    0n,
  );
  const subtotalUnits = sumMoney('taxableBase');
  const taxTotalUnits = sumMoney('taxAmount');
  const withholdingTotalUnits = sumMoney('withholdingAmount');
  const recoverableTaxTotalUnits = sumMoney('recoverableTaxAmount');
  const nonRecoverableTaxTotalUnits = sumMoney('nonRecoverableTaxAmount');
  const headerDiscountUnits = toScaledInteger(headerDiscount, FINANCIAL_SCALE.money);
  const grandTotalUnits = sumMoney('total') - headerDiscountUnits;
  const payableTotalUnits = grandTotalUnits - withholdingTotalUnits;

  return {
    lines: normalized,
    subtotal: scaledIntegerToNumber(subtotalUnits, FINANCIAL_SCALE.money),
    taxTotal: scaledIntegerToNumber(taxTotalUnits, FINANCIAL_SCALE.money),
    withholdingTotal: scaledIntegerToNumber(withholdingTotalUnits, FINANCIAL_SCALE.money),
    recoverableTaxTotal: scaledIntegerToNumber(recoverableTaxTotalUnits, FINANCIAL_SCALE.money),
    nonRecoverableTaxTotal: scaledIntegerToNumber(nonRecoverableTaxTotalUnits, FINANCIAL_SCALE.money),
    grandTotal: scaledIntegerToNumber(grandTotalUnits, FINANCIAL_SCALE.money),
    payableTotal: scaledIntegerToNumber(payableTotalUnits, FINANCIAL_SCALE.money),
    headerDiscount: scaledIntegerToNumber(headerDiscountUnits, FINANCIAL_SCALE.money),
  };
}

export function buildTaxSubmissionLines(lines = [], taxCodes = [], pricingMode = 'exclusive', accountField = 'accountId') {
  const summary = computeDocumentSummary({ lines, taxCodes, pricingMode });
  return summary.lines.map((line) => ({
    description: line.description || undefined,
    quantity: line.quantity === '' ? undefined : formatScaledInteger(toScaledInteger(line.quantity, FINANCIAL_SCALE.documentQuantity), FINANCIAL_SCALE.documentQuantity),
    unitPrice: line.unitPrice === '' ? undefined : formatScaledInteger(toScaledInteger(line.unitPrice, FINANCIAL_SCALE.documentUnitPrice), FINANCIAL_SCALE.documentUnitPrice),
    [accountField]: line[accountField] || undefined,
    itemId: line.itemId || undefined,
    taxCodeId: line.taxCodeId || undefined,
    withholdingApplicable: !!(line.withholdingApplicable || line.withholdingTaxCodeId),
    withholdingTaxCodeId: line.withholdingTaxCodeId || undefined,
    withholdingRateOverride:
      line.withholdingRate === '' || line.withholdingRate == null
        ? undefined
        : normalizePercentagePointsNumber(line.withholdingRate),
    recoverablePercentOverride:
      line.recoverablePercent === '' || line.recoverablePercent == null
        ? undefined
        : normalizeRecoverableFraction(line.recoverablePercent, 1),
    exemptionReasonCode: line.exemptionReasonCode || undefined,
    reverseCharge: !!line.reverseCharge
  }));
}

export function buildTransactionTaxPayload(payload = {}, { partnerKey, dateKey, referenceKey, accountField, taxCodes = [] } = {}) {
  const pricingMode = payload.pricingMode ?? payload.pricing_mode ?? 'exclusive';
  return {
    [partnerKey]: payload[partnerKey] || undefined,
    [dateKey]: payload[dateKey] || undefined,
    dueDate: payload.dueDate || undefined,
    memo: payload.memo || undefined,
    currencyCode: payload.currencyCode || undefined,
    taxDate: payload.taxDate || undefined,
    pricingMode,
    supplyType: payload.supplyType || undefined,
    placeOfSupplyCountryCode: payload.placeOfSupplyCountryCode || undefined,
    buyerReference: payload.buyerReference || undefined,
    jurisdictionId: payload.jurisdictionId || undefined,
    [referenceKey]: referenceKey ? (payload[referenceKey] || undefined) : undefined,
    // Calculated monetary totals are deliberately not submitted. The backend
    // derives line bases/taxes/totals from the authoritative tax configuration.
    lines: buildTaxSubmissionLines(payload.lines ?? [], taxCodes, pricingMode, accountField)
  };
}

export function buildPartnerTaxProfilePayload(state = {}) {
  const registrationStatus = state.taxRegistrationStatus || undefined;
  const isTaxRegistered = registrationStatus ? registrationStatus === 'registered' : undefined;
  const isTaxExempt = state.isTaxExempt != null ? !!state.isTaxExempt : undefined;

  return {
    taxregistrationNumber: state.taxIdNumber || state.vatRegistrationNumber || undefined,
    legalName: state.legalName || state.name || undefined,
    taxClass: state.taxTreatment || undefined,
    defaultTaxCodeId: state.defaultTaxCodeId || undefined,
    purchaseTaxCodeId: state.purchaseTaxCodeId || undefined,
    salesTaxCodeId: state.salesTaxCodeId || undefined,
    jurisdictionId: state.jurisdictionId || undefined,
    placeOfSupply: state.placeOfSupplyBasis || undefined,
    isTaxRegistered,
    isTaxExempt,
    exemptionReasonCode: state.exemptionReasonCode || undefined,
    certificateReference: state.exemptionCertificateNumber || undefined,
    certificateExpiry: state.exemptionExpiryDate || undefined,
    reverseChargeApplicable: !!state.reverseChargeEligible,
    withholdingApplicable: !!state.withholdingEnabled,
    withholdingTaxCodeId: state.withholdingTaxCodeId || undefined,
    withholdingRateOverride:
      state.withholdingRate === '' || state.withholdingRate == null
        ? undefined
        : normalizePercentagePointsNumber(state.withholdingRate),
    recoverablePercentOverride:
      state.recoverabilityPercent === '' || state.recoverabilityPercent == null
        ? undefined
        : normalizeRecoverableFraction(state.recoverabilityPercent, 1),
    destinationCountryCode: state.taxCountryCode || undefined,
    registrationStatus,
    eInvoiceNetwork: state.eInvoiceScheme || undefined,
    eInvoiceEndpoint: state.eInvoiceEndpoint || undefined,
    legalName: state.legalName || state.name || undefined,
    filingContactEmail: state.filingContactEmail || undefined,
    customerTaxIdentifierType: state.customerTaxIdentifierType || undefined,
    vendorTaxIdentifierType: state.vendorTaxIdentifierType || undefined,
    inputTaxRecoveryMode: state.inputTaxRecoveryMode || undefined,
    metadata: {
      buyerReference: state.buyerReference || undefined,
      filingCurrency: state.filingCurrency || undefined,
      regionCode: state.taxRegionCode || undefined,
      vatRegistrationNumber: state.vatRegistrationNumber || undefined
    }
  };
}


export const PARTNER_TAX_TREATMENT_OPTIONS = {
  customer: [
    { value: 'standard_output', label: 'Standard output tax' },
    { value: 'reverse_charge', label: 'Reverse charge' },
    { value: 'exempt', label: 'Exempt' },
    { value: 'zero_rated', label: 'Zero rated' }
  ],
  vendor: [
    { value: 'standard_input', label: 'Standard input tax' },
    { value: 'reverse_charge', label: 'Reverse charge' },
    { value: 'exempt', label: 'Exempt' },
    { value: 'zero_rated', label: 'Zero rated' }
  ]
};

export function getPartnerTaxFormVisibility({ type = 'customer', taxTreatment = '', withholdingEnabled = false } = {}) {
  const isCustomer = type === 'customer';
  const isVendor = type === 'vendor';
  const isExempt = taxTreatment === 'exempt';
  const isReverseCharge = taxTreatment === 'reverse_charge';
  return {
    isCustomer,
    isVendor,
    isExempt,
    isReverseCharge,
    showDefaultReceivable: isCustomer,
    showDefaultPayable: isVendor,
    showSalesTaxCode: isCustomer && !isExempt,
    showPurchaseTaxCode: isVendor && !isExempt,
    showDefaultTaxCode: !isExempt,
    showRecoverability: isVendor && !isExempt,
    showWithholdingSection: !!withholdingEnabled,
    showReverseChargeEligible: isVendor || isReverseCharge,
    showExemptionFields: isExempt,
    showBuyerReference: isCustomer,
  };
}

export function normalizePartnerTaxFormState(form = {}) {
  const type = form.type === 'vendor' ? 'vendor' : 'customer';
  let taxTreatment = form.taxTreatment || (type === 'vendor' ? 'standard_input' : 'standard_output');
  if (type === 'customer' && taxTreatment === 'standard_input') taxTreatment = 'standard_output';
  if (type === 'vendor' && taxTreatment === 'standard_output') taxTreatment = 'standard_input';

  const next = {
    filingCurrency: 'USD',
    taxRegistrationStatus: 'registered',
    placeOfSupplyBasis: 'customer_location',
    ...form,
    type,
    taxTreatment,
  };

  const visibility = getPartnerTaxFormVisibility(next);

  if (!visibility.showDefaultReceivable) next.defaultReceivableAccountId = '';
  if (!visibility.showDefaultPayable) next.defaultPayableAccountId = '';
  if (!visibility.showSalesTaxCode) next.salesTaxCodeId = '';
  if (!visibility.showPurchaseTaxCode) next.purchaseTaxCodeId = '';
  if (!visibility.showDefaultTaxCode) next.defaultTaxCodeId = '';
  if (!visibility.showRecoverability) next.recoverabilityPercent = visibility.isVendor && !visibility.isExempt ? (next.recoverabilityPercent || '100') : '';
  if (!visibility.showWithholdingSection) {
    next.withholdingTaxCodeId = '';
    next.withholdingRate = '';
  }
  if (!visibility.showExemptionFields) {
    next.exemptionReasonCode = '';
    next.exemptionCertificateNumber = '';
    next.exemptionExpiryDate = '';
  }
  if (!visibility.showReverseChargeEligible) next.reverseChargeEligible = false;
  if (!visibility.showBuyerReference) next.buyerReference = '';

  return next;
}

export function normalizePartnerTaxFormForSubmit(form = {}) {
  return normalizePartnerTaxFormState(form);
}
