import { endpoints } from '../../../shared/api/endpoints.js';

export function makeIas12Api(http) {
  return {
    health: async () => (await http.get(endpoints.compliance.ias12.health)).data,

    // Settings
    getSettings: async () => (await http.get(endpoints.compliance.ias12.settings.get)).data,
    updateSettings: async (body) => (await http.put(endpoints.compliance.ias12.settings.put, body)).data,

    // Authorities
    listAuthorities: async () => (await http.get(endpoints.compliance.ias12.authorities.list)).data,
    createAuthority: async (body) => (await http.post(endpoints.compliance.ias12.authorities.create, body)).data,
    updateAuthority: async (authorityId, body) =>
      (await http.patch(endpoints.compliance.ias12.authorities.update(authorityId), body)).data,

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
    listTempDifferences: async (qs) => (await http.get(endpoints.compliance.ias12.tempDifferences.list(qs))).data,
    createTempDifference: async (body) => (await http.post(endpoints.compliance.ias12.tempDifferences.create, body)).data,
    updateTempDifference: async (tempDifferenceId, body) =>
      (await http.patch(endpoints.compliance.ias12.tempDifferences.update(tempDifferenceId), body)).data,
    deleteTempDifference: async (tempDifferenceId) =>
      (await http.delete(endpoints.compliance.ias12.tempDifferences.remove(tempDifferenceId))).data,

    importTempDifferences: async (body) => (await http.post(endpoints.compliance.ias12.tempDifferences.import, body)).data,
    copyForwardTempDifferences: async (body) => (await http.post(endpoints.compliance.ias12.tempDifferences.copyForward, body)).data,

    // Deferred tax runs
    computeDeferredTax: async (body) => (await http.post(endpoints.compliance.ias12.deferredTax.compute, body)).data,
    listDeferredTaxRuns: async (qs) => (await http.get(endpoints.compliance.ias12.deferredTax.runs(qs))).data,
    getDeferredTaxRun: async (runId) => (await http.get(endpoints.compliance.ias12.deferredTax.runDetail(runId))).data,
    finalizeDeferredTaxRun: async (runId) => (await http.post(endpoints.compliance.ias12.deferredTax.finalize(runId))).data,
    postDeferredTax: async (body) => (await http.post(endpoints.compliance.ias12.deferredTax.post, body)).data,
    reverseDeferredTax: async (body) => (await http.post(endpoints.compliance.ias12.deferredTax.reverse, body)).data,

    // Reports
    reportRollForward: async (qs) => (await http.get(endpoints.compliance.ias12.reports.rollForward(qs))).data,
    reportByCategory: async (qs) => (await http.get(endpoints.compliance.ias12.reports.byCategory(qs))).data,
    reportUnrecognised: async (qs) => (await http.get(endpoints.compliance.ias12.reports.unrecognised(qs))).data
  };
}
