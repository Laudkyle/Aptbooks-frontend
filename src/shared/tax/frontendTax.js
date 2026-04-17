export function coerceNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function roundCurrency(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(coerceNumber(value, 0) * factor) / factor;
}

export function normalizeRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (data && typeof data === 'object') return [data];
  return [];
}

export function normalizeTaxCodeShape(code = {}) {
  const normalized = { ...code };
  const taxType = normalized.taxType ?? normalized.tax_type ?? normalized.type ?? '';
  const categoryCode = normalized.categoryCode ?? normalized.category_code ?? normalized.taxCategory ?? normalized.tax_category ?? '';
  const taxScope = normalized.taxScope ?? normalized.tax_scope ?? '';
  normalized.taxType = taxType;
  normalized.tax_type = normalized.tax_type ?? taxType;
  normalized.categoryCode = categoryCode;
  normalized.category_code = normalized.category_code ?? categoryCode;
  normalized.taxCategory = normalized.taxCategory ?? categoryCode;
  normalized.tax_category = normalized.tax_category ?? categoryCode;
  normalized.taxScope = taxScope;
  normalized.tax_scope = normalized.tax_scope ?? taxScope;
  return normalized;
}

function normalizeFractionOrPercent(value, fallback = 0) {
  if (value === '' || value == null) return fallback;
  const n = coerceNumber(value, fallback);
  if (!Number.isFinite(n)) return fallback;
  return n > 1 ? n / 100 : n;
}

function normalizePercentDisplay(value, fallback = 0) {
  if (value === '' || value == null) return fallback;
  const n = coerceNumber(value, fallback);
  if (!Number.isFinite(n)) return fallback;
  return n <= 1 ? n * 100 : n;
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
    withholdingRate: normalizePercentDisplay(pickFirst(source.withholdingRate, source.withholding_rate, source.withholdingRateOverride, source.withholding_rate_override), 0),
    recoverabilityPercent: normalizePercentDisplay(pickFirst(source.recoverabilityPercent, source.recoverability_percent, source.recoverablePercentOverride, source.recoverable_percent_override), 100),
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
  if ((next.withholdingRate === '' || next.withholdingRate == null || Number(next.withholdingRate) === 0) && profile.withholdingEnabled) {
    next.withholdingRate = profile.withholdingRate;
  }
  if (next.recoverablePercent === '' || next.recoverablePercent == null || Number(next.recoverablePercent) === 100) {
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
  const quantity = coerceNumber(line.quantity ?? line.qty ?? 1, 1);
  const unitPrice = coerceNumber(line.unitPrice ?? line.unit_price ?? 0, 0);
  const lineDiscount = coerceNumber(line.discountAmount ?? line.discount_amount ?? 0, 0);
  const gross = quantity * unitPrice;
  const baseBeforeTax = Math.max(0, gross - lineDiscount);

  const explicitRate = line.taxRate ?? line.tax_rate;
  const taxCodeId = line.taxCodeId ?? line.tax_code_id;
  const withholdingTaxCodeId = line.withholdingTaxCodeId ?? line.withholding_tax_code_id;
  const fallbackCode = taxCodeMap[taxCodeId] ?? {};
  const withholdingCode = taxCodeMap[withholdingTaxCodeId] ?? {};
  const taxRate = normalizeFractionOrPercent(pickFirst(explicitRate, fallbackCode.rate, fallbackCode.tax_rate), 0);
  const withholdingRate = normalizeFractionOrPercent(
    pickFirst(line.withholdingRateOverride, line.withholding_rate_override, line.withholdingRate, line.withholding_rate, withholdingCode.rate, withholdingCode.tax_rate),
    0
  );
  const recoverableFraction = normalizeFractionOrPercent(line.recoverablePercent ?? line.recoverable_percent ?? 1, 1);

  let taxableBase = baseBeforeTax;
  let taxAmount = 0;
  if (String(pricingMode).toLowerCase() === 'inclusive' && taxRate > 0) {
    taxableBase = baseBeforeTax / (1 + taxRate);
    taxAmount = baseBeforeTax - taxableBase;
  } else {
    taxAmount = taxableBase * taxRate;
  }

  taxableBase = roundCurrency(taxableBase);
  taxAmount = roundCurrency(taxAmount);

  const withholdingAmount = roundCurrency(taxableBase * withholdingRate);
  const recoverableTaxAmount = roundCurrency(taxAmount * Math.min(Math.max(recoverableFraction, 0), 1));
  const nonRecoverableTaxAmount = roundCurrency(taxAmount - recoverableTaxAmount);
  const total = roundCurrency(String(pricingMode).toLowerCase() === 'inclusive' ? baseBeforeTax : taxableBase + taxAmount);
  const payableAmount = roundCurrency(total - withholdingAmount);

  return {
    quantity,
    unitPrice,
    gross: roundCurrency(gross),
    lineDiscount: roundCurrency(lineDiscount),
    taxableBase,
    taxRate,
    taxAmount,
    withholdingRate,
    withholdingAmount,
    recoverablePercent: roundCurrency(recoverableFraction * 100),
    recoverableFraction,
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

  const subtotal = roundCurrency(normalized.reduce((sum, line) => sum + line._calc.taxableBase, 0));
  const taxTotal = roundCurrency(normalized.reduce((sum, line) => sum + line._calc.taxAmount, 0));
  const withholdingTotal = roundCurrency(normalized.reduce((sum, line) => sum + line._calc.withholdingAmount, 0));
  const recoverableTaxTotal = roundCurrency(normalized.reduce((sum, line) => sum + line._calc.recoverableTaxAmount, 0));
  const nonRecoverableTaxTotal = roundCurrency(normalized.reduce((sum, line) => sum + line._calc.nonRecoverableTaxAmount, 0));
  const grandTotal = roundCurrency(normalized.reduce((sum, line) => sum + line._calc.total, 0) - coerceNumber(headerDiscount, 0));
  const payableTotal = roundCurrency(grandTotal - withholdingTotal);

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

export function buildTaxSubmissionLines(lines = [], taxCodes = [], pricingMode = 'exclusive', accountField = 'accountId') {
  const summary = computeDocumentSummary({ lines, taxCodes, pricingMode });
  return summary.lines.map((line) => ({
    description: line.description || undefined,
    quantity: line.quantity === '' ? undefined : coerceNumber(line.quantity, 1),
    unitPrice: line.unitPrice === '' ? undefined : roundCurrency(line.unitPrice),
    [accountField]: line[accountField] || undefined,
    itemId: line.itemId || undefined,
    taxCodeId: line.taxCodeId || undefined,
    taxAmount: roundCurrency(line._calc?.taxAmount ?? line.taxAmount),
    taxableAmount: roundCurrency(line._calc?.taxableBase),
    withholdingApplicable: !!(line.withholdingApplicable || line.withholdingTaxCodeId),
    withholdingTaxCodeId: line.withholdingTaxCodeId || undefined,
    withholdingRateOverride:
      line.withholdingRate === '' || line.withholdingRate == null
        ? undefined
        : normalizeFractionOrPercent(line.withholdingRate),
    recoverablePercentOverride:
      line.recoverablePercent === '' || line.recoverablePercent == null
        ? undefined
        : normalizeFractionOrPercent(line.recoverablePercent, 1),
    exemptionReasonCode: line.exemptionReasonCode || undefined,
    reverseCharge: !!line.reverseCharge,
    lineTotal: roundCurrency(line._calc?.total ?? line.lineTotal ?? line.taxableBase ?? 0)
  }));
}

export function buildTransactionTaxPayload(payload = {}, { partnerKey, dateKey, referenceKey, accountField, taxCodes = [] } = {}) {
  const pricingMode = payload.pricingMode ?? payload.pricing_mode ?? 'exclusive';
  const summary = computeDocumentSummary({ lines: payload.lines ?? [], taxCodes, pricingMode });

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
    lines: buildTaxSubmissionLines(payload.lines ?? [], taxCodes, pricingMode, accountField),
    taxSummary: {
      subtotal: summary.subtotal,
      taxTotal: summary.taxTotal,
      withholdingTotal: summary.withholdingTotal,
      recoverableTaxTotal: summary.recoverableTaxTotal,
      nonRecoverableTaxTotal: summary.nonRecoverableTaxTotal,
      grandTotal: summary.grandTotal,
      payableTotal: summary.payableTotal,
    }
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
        : normalizeFractionOrPercent(state.withholdingRate),
    recoverablePercentOverride:
      state.recoverabilityPercent === '' || state.recoverabilityPercent == null
        ? undefined
        : normalizeFractionOrPercent(state.recoverabilityPercent, 1),
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
