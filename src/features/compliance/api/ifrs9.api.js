
import { endpoints } from '../../../shared/api/endpoints.js';

export function makeIfrs9Api(http) {
  return {
    getSettings: async () => (await http.get(endpoints.compliance.ifrs9.settings.get)).data,
    updateSettings: async (body) => (await http.put(endpoints.compliance.ifrs9.settings.put, body)).data,

    listModels: async () => (await http.get(endpoints.compliance.ifrs9.models.list)).data,
    createModel: async (body) => (await http.post(endpoints.compliance.ifrs9.models.create, body)).data,
    addBucket: async (modelId, body) => (await http.post(endpoints.compliance.ifrs9.models.addBucket(modelId), body)).data,
    addParameter: async (modelId, body) => (await http.post(endpoints.compliance.ifrs9.models.addParameter(modelId), body)).data,

    getCounterpartyProfile: async (businessPartnerId) =>
      (await http.get(endpoints.compliance.ifrs9.counterparties.profile(businessPartnerId))).data,
    upsertCounterpartyProfile: async (body) => (await http.put(endpoints.compliance.ifrs9.counterparties.upsertProfile, body)).data,

    computeEcl: async (body) => (await http.post(endpoints.compliance.ifrs9.ecl.compute, body)).data,
    listRuns: async (qs) => (await http.get(endpoints.compliance.ifrs9.ecl.runs(qs))).data,
    getRun: async (runId) => (await http.get(endpoints.compliance.ifrs9.ecl.runDetail(runId))).data,
    finalizeRun: async (runId) => (await http.post(endpoints.compliance.ifrs9.ecl.finalize(runId))).data,

    postEcl: async (body) => (await http.post(endpoints.compliance.ifrs9.ecl.post, body)).data,
    reverseEcl: async (body) => (await http.post(endpoints.compliance.ifrs9.ecl.reverse, body)).data,

    reportAllowanceMovement: async (qs) => (await http.get(endpoints.compliance.ifrs9.reports.allowanceMovement(qs))).data,
    reportDisclosures: async (qs) => (await http.get(endpoints.compliance.ifrs9.reports.disclosures(qs))).data,

    listMacroScenarios: async () => (await http.get(endpoints.compliance.ifrs9.macroScenarios.list)).data,
    createMacroScenario: async (body) => (await http.post(endpoints.compliance.ifrs9.macroScenarios.create, body)).data,
    addMacroOverlay: async (scenarioId, body) => (await http.post(endpoints.compliance.ifrs9.macroScenarios.addOverlay(scenarioId), body)).data,

    listSicrTriggers: async () => (await http.get(endpoints.compliance.ifrs9.sicrTriggers.list)).data,
    createSicrTrigger: async (body) => (await http.post(endpoints.compliance.ifrs9.sicrTriggers.create, body)).data,

    getBehavioralAnalytics: async (body) => (await http.post(endpoints.compliance.ifrs9.analytics.behavioral, body)).data,

    listModelChanges: async (qs) => (await http.get(endpoints.compliance.ifrs9.modelChanges.list(qs))).data,
    createModelChange: async (body) => (await http.post(endpoints.compliance.ifrs9.modelChanges.create, body)).data,
    submitModelChange: async (changeId, body = {}) => (await http.post(endpoints.compliance.ifrs9.modelChanges.submit(changeId), body)).data,
    approveModelChange: async (changeId, body = {}) => (await http.post(endpoints.compliance.ifrs9.modelChanges.approve(changeId), body)).data,
    rejectModelChange: async (changeId, body = {}) => (await http.post(endpoints.compliance.ifrs9.modelChanges.reject(changeId), body)).data,
    applyModelChange: async (changeId) => (await http.post(endpoints.compliance.ifrs9.modelChanges.apply(changeId))).data
  };
}
