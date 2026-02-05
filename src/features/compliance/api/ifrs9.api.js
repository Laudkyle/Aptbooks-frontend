import { endpoints } from '../../../shared/api/endpoints.js';

export function makeIfrs9Api(http) {
  return {
    // Settings
    getSettings: async () => (await http.get(endpoints.compliance.ifrs9.settings.get)).data,
    updateSettings: async (body) => (await http.put(endpoints.compliance.ifrs9.settings.put, body)).data,

    // Models
    listModels: async () => (await http.get(endpoints.compliance.ifrs9.models.list)).data,
    createModel: async (body) => (await http.post(endpoints.compliance.ifrs9.models.create, body)).data,
    addBucket: async (modelId, body) => (await http.post(endpoints.compliance.ifrs9.models.addBucket(modelId), body)).data,

    // Counterparty profile
    getCounterpartyProfile: async (businessPartnerId) =>
      (await http.get(endpoints.compliance.ifrs9.counterparties.profile(businessPartnerId))).data,
    upsertCounterpartyProfile: async (body) => (await http.put(endpoints.compliance.ifrs9.counterparties.upsertProfile, body)).data,

    // Runs
    computeEcl: async (body) => (await http.post(endpoints.compliance.ifrs9.ecl.compute, body)).data,
    listRuns: async (qs) => (await http.get(endpoints.compliance.ifrs9.ecl.runs(qs))).data,
    getRun: async (runId) => (await http.get(endpoints.compliance.ifrs9.ecl.runDetail(runId))).data,
    finalizeRun: async (runId) => (await http.post(endpoints.compliance.ifrs9.ecl.finalize(runId))).data,

    // Posting
    postEcl: async (body) => (await http.post(endpoints.compliance.ifrs9.ecl.post, body)).data,
    reverseEcl: async (body) => (await http.post(endpoints.compliance.ifrs9.ecl.reverse, body)).data,

    // Reports
    reportAllowanceMovement: async (qs) => (await http.get(endpoints.compliance.ifrs9.reports.allowanceMovement(qs))).data,
    reportDisclosures: async (qs) => (await http.get(endpoints.compliance.ifrs9.reports.disclosures(qs))).data
  };
}
