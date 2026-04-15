
let state = {
  errors: {},
  formErrors: [],
  requestId: null,
  version: 0
};

const listeners = new Set();

function emit() {
  state = { ...state, version: state.version + 1 };
  for (const listener of listeners) listener();
}

export function subscribeValidationErrors(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getValidationErrorState() {
  return state;
}

export function normalizeFieldKey(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const collapsed = raw
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return collapsed;
}

function toCamelCase(value) {
  const normalized = normalizeFieldKey(value);
  if (!normalized) return '';
  return normalized.replace(/ ([a-z0-9])/g, (_, ch) => ch.toUpperCase()).replace(/ /g, '');
}

function toSnakeCase(value) {
  return normalizeFieldKey(value).replace(/ /g, '_');
}

function toKebabCase(value) {
  return normalizeFieldKey(value).replace(/ /g, '-');
}

export function buildFieldCandidates(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return [];
  const normalized = normalizeFieldKey(raw);
  const set = new Set([raw, normalized, toCamelCase(raw), toSnakeCase(raw), toKebabCase(raw)]);
  const aliasMap = {
    'business name': ['name'],
    'partner code': ['code'],
    'authority partner': ['authorityPartnerId'],
    'jurisdiction': ['jurisdictionId'],
    'tax code': ['taxCodeId'],
    'settlement account': ['settlementAccountId'],
    'payment terms': ['paymentTermsId'],
    'default receivable account': ['defaultReceivableAccountId'],
    'default payable account': ['defaultPayableAccountId'],
    'default tax code': ['defaultTaxCodeId'],
    'purchase tax code': ['purchaseTaxCodeId'],
    'sales tax code': ['salesTaxCodeId'],
    'withholding tax code': ['withholdingTaxCodeId'],
    'withholding rate': ['withholdingRateOverride', 'withholdingRate'],
    'withholding rate %': ['withholdingRateOverride', 'withholdingRate'],
    'recoverability': ['recoverablePercentOverride', 'recoverabilityPercent'],
    'recoverability %': ['recoverablePercentOverride', 'recoverabilityPercent'],
    'registration status': ['registrationStatus', 'taxRegistrationStatus'],
    'tax country code': ['destinationCountryCode', 'taxCountryCode'],
    'e invoice scheme': ['eInvoiceNetwork', 'eInvoiceScheme'],
    'e invoice endpoint': ['eInvoiceEndpoint'],
    'legal name': ['legalName'],
    'filing contact email': ['filingContactEmail'],
    'customer tax identifier type': ['customerTaxIdentifierType'],
    'vendor tax identifier type': ['vendorTaxIdentifierType'],
    'input tax recovery mode': ['inputTaxRecoveryMode'],
    'tax id number': ['taxregistrationNumber', 'taxIdNumber'],
    'vat registration number': ['taxregistrationNumber', 'vatRegistrationNumber'],
    'exemption certificate': ['certificateReference', 'exemptionCertificateNumber', 'withholdingCertificateNo'],
    'exemption expiry': ['certificateExpiry', 'exemptionExpiryDate'],
    'place of supply basis': ['placeOfSupply', 'placeOfSupplyBasis'],
    'tax treatment': ['taxClass', 'taxTreatment'],
    'filing currency': ['filingCurrency'],
    'country code': ['destinationCountryCode', 'taxCountryCode'],
    'region code': ['taxRegionCode'],
    'buyer reference': ['buyerReference'],
  };
  for (const alias of aliasMap[normalized] || []) {
    set.add(alias);
    set.add(normalizeFieldKey(alias));
    set.add(toSnakeCase(alias));
    set.add(toKebabCase(alias));
  }
  return Array.from(set).filter(Boolean);
}

function normalizeIncomingFieldMap(fields = {}) {
  const next = {};
  for (const [key, messages] of Object.entries(fields || {})) {
    const text = Array.isArray(messages) ? messages.find(Boolean) : messages;
    if (!text) continue;
    for (const candidate of buildFieldCandidates(key)) {
      next[candidate] = String(text);
    }
  }
  return next;
}

export function publishValidationErrors(details = {}, requestId = null) {
  state = {
    errors: normalizeIncomingFieldMap(details?.fields || {}),
    formErrors: Array.isArray(details?.form) ? details.form.filter(Boolean).map(String) : [],
    requestId: requestId || null,
    version: state.version
  };
  emit();
}

export function clearValidationErrors() {
  if (!Object.keys(state.errors).length && !state.formErrors.length && !state.requestId) return;
  state = { errors: {}, formErrors: [], requestId: null, version: state.version };
  emit();
}

export function getValidationErrorForField(fieldKey) {
  if (!fieldKey) return '';
  for (const candidate of buildFieldCandidates(fieldKey)) {
    if (state.errors[candidate]) return state.errors[candidate];
  }
  return '';
}

export function clearValidationErrorForField(fieldKey) {
  const candidates = buildFieldCandidates(fieldKey);
  if (!candidates.length) return;
  let changed = false;
  const next = { ...state.errors };
  for (const candidate of candidates) {
    if (candidate in next) {
      delete next[candidate];
      changed = true;
    }
  }
  if (!changed) return;
  state = { ...state, errors: next };
  emit();
}
