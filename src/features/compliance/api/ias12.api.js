import { endpoints } from '../../../shared/api/endpoints.js';

const pick = (obj, keys) => {
  const out = {};
  for (const key of keys) {
    if (obj?.[key] !== undefined) out[key] = obj[key];
  }
  return out;
};

const normalizePeriodQs = (qs) => {
  const periodId = qs?.period_id ?? qs?.periodId;
  return periodId ? { period_id: periodId } : {};
};

const normalizeAuthorityPayload = (body = {}) => pick({
  code: body.code,
  name: body.name,
  country_code: body.country_code ?? body.country ?? undefined,
  status: body.status
}, ['code', 'name', 'country_code', 'status']);

const normalizeSettingsPayload = (body = {}) => pick(body, [
  'default_authority_id',
  'default_rate_set_id',
  'deferred_tax_asset_account_id',
  'deferred_tax_liability_account_id',
  'deferred_tax_expense_account_id',
  'rounding_decimals'
]);

const normalizeTempDifferencePayload = (body = {}) => pick({
  period_id: body.period_id,
  category_id: body.category_id,
  source_type: body.source_type,
  source_id: body.source_id,
  diff_type: body.diff_type,
  carrying_amount: body.carrying_amount,
  tax_base: body.tax_base,
  recognisable: body.recognisable,
  notes: body.notes ?? body.description ?? undefined
}, ['period_id', 'category_id', 'source_type', 'source_id', 'diff_type', 'carrying_amount', 'tax_base', 'recognisable', 'notes']);

const normalizeComputePayload = (body = {}) => pick({
  period_id: body.period_id,
  rate_set_id: body.rate_set_id,
  memo: body.memo
}, ['period_id', 'rate_set_id', 'memo']);

const normalizePostPayload = (body = {}) => pick({
  period_id: body.period_id,
  run_id: body.run_id,
  memo: body.memo
}, ['period_id', 'run_id', 'memo']);

export function makeIas12Api(http) {
  return {
    health: async () => (await http.get(endpoints.compliance.ias12.health)).data,

    // Settings
    getSettings: async () => (await http.get(endpoints.compliance.ias12.settings.get)).data,
    updateSettings: async (body) => (await http.put(endpoints.compliance.ias12.settings.put, normalizeSettingsPayload(body))).data,

    // Authorities
    listAuthorities: async () => (await http.get(endpoints.compliance.ias12.authorities.list)).data,
    createAuthority: async (body) => (await http.post(endpoints.compliance.ias12.authorities.create, normalizeAuthorityPayload(body))).data,
    updateAuthority: async (authorityId, body) =>
      (await http.patch(endpoints.compliance.ias12.authorities.update(authorityId), normalizeAuthorityPayload(body))).data,

    // Rate sets
    listRateSets: async () => (await http.get(endpoints.compliance.ias12.rateSets.list)).data,
    createRateSet: async (body) => (await http.post(endpoints.compliance.ias12.rateSets.create, body)).data,
    listRateSetLines: async (rateSetId) => (await http.get(endpoints.compliance.ias12.rateSets.lines(rateSetId))).data,
    createRateSetLine: async (rateSetId, body) =>
      (await http.post(endpoints.compliance.ias12.rateSets.addLine(rateSetId), body)).data,

    // Temp difference categories
    listTempDifferenceCategories: async () => (await http.get(endpoints.compliance.ias12.tempDiffCategories.list)).data,
    createTempDifferenceCategory: async (body) =>
      (await http.post(endpoints.compliance.ias12.tempDiffCategories.create, body)).data,

    // Temp differences
    listTempDifferences: async (qs) => (await http.get(endpoints.compliance.ias12.tempDifferences.list(normalizePeriodQs(qs)))).data,
    createTempDifference: async (body) => (await http.post(endpoints.compliance.ias12.tempDifferences.create, normalizeTempDifferencePayload(body))).data,
    updateTempDifference: async (tempDifferenceId, body) =>
      (await http.patch(endpoints.compliance.ias12.tempDifferences.update(tempDifferenceId), normalizeTempDifferencePayload(body))).data,
    deleteTempDifference: async (tempDifferenceId) =>
      (await http.delete(endpoints.compliance.ias12.tempDifferences.remove(tempDifferenceId))).data,

    importTempDifferences: async (body) => (await http.post(endpoints.compliance.ias12.tempDifferences.import, body)).data,
    copyForwardTempDifferences: async (body) => (await http.post(endpoints.compliance.ias12.tempDifferences.copyForward, body)).data,

    // Deferred tax runs
    computeDeferredTax: async (body) => (await http.post(endpoints.compliance.ias12.deferredTax.compute, normalizeComputePayload(body))).data,
    listDeferredTaxRuns: async (qs) => (await http.get(endpoints.compliance.ias12.deferredTax.runs(normalizePeriodQs(qs)))).data,
    getDeferredTaxRun: async (runId) => (await http.get(endpoints.compliance.ias12.deferredTax.runDetail(runId))).data,
    finalizeDeferredTaxRun: async (runId) => (await http.post(endpoints.compliance.ias12.deferredTax.finalize(runId))).data,
    postDeferredTax: async (body) => (await http.post(endpoints.compliance.ias12.deferredTax.post, normalizePostPayload(body))).data,
    reverseDeferredTax: async (body) => (await http.post(endpoints.compliance.ias12.deferredTax.reverse, body)).data,

    // Reports
    reportRollForward: async (qs) => (await http.get(endpoints.compliance.ias12.reports.rollForward(normalizePeriodQs(qs)))).data,
    reportByCategory: async (qs) => (await http.get(endpoints.compliance.ias12.reports.byCategory(normalizePeriodQs(qs)))).data,
    reportUnrecognised: async (qs) => (await http.get(endpoints.compliance.ias12.reports.unrecognised(normalizePeriodQs(qs)))).data
  };
}
