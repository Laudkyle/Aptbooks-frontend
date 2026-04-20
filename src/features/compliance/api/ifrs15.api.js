import { endpoints } from '../../../shared/api/endpoints.js';

export function makeIfrs15Api(http) {
  return {
    listCurrencies: async () => (await http.get('/core/reference/currencies')).data,

    getSettings: async () => (await http.get(endpoints.compliance.ifrs15.settings.get)).data,
    updateSettings: async (body) => (await http.put(endpoints.compliance.ifrs15.settings.put, body)).data,

    listContracts: async (qs) => (await http.get(endpoints.compliance.ifrs15.contracts.list(qs))).data,
    createContract: async (body) => (await http.post(endpoints.compliance.ifrs15.contracts.create, body)).data,
    getContract: async (contractId) => (await http.get(endpoints.compliance.ifrs15.contracts.detail(contractId))).data,
    activateContract: async (contractId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.activate(contractId), body ?? {})).data,
    updateLifecycle: async (contractId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.lifecycle(contractId), body ?? {})).data,
    submitForApproval: async (contractId) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.submitForApproval(contractId), {})).data,
    approveContract: async (contractId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.approve(contractId), body ?? {})).data,
    rejectContract: async (contractId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.reject(contractId), body ?? {})).data,

    addObligation: async (contractId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.obligations(contractId), body)).data,

    generateSchedule: async (contractId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.scheduleGenerate(contractId), body ?? {})).data,
    getSchedule: async (contractId) => (await http.get(endpoints.compliance.ifrs15.contracts.schedule(contractId))).data,

    postRevenue: async (contractId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.post(contractId), body)).data,

    listModifications: async (contractId) =>
      (await http.get(endpoints.compliance.ifrs15.contracts.modifications(contractId))).data,
    createModification: async (contractId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.modifications(contractId), body)).data,
    applyModification: async (contractId, modificationId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.applyModification(contractId, modificationId), body ?? {})).data,

    listVariableConsideration: async (contractId) =>
      (await http.get(endpoints.compliance.ifrs15.contracts.variableConsideration(contractId))).data,
    createVariableConsideration: async (contractId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.variableConsideration(contractId), body)).data,
    reviewVariableConsideration: async (contractId, variableConsiderationId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.reviewVariableConsideration(contractId, variableConsiderationId), body ?? {})).data,
    approveVariableConsideration: async (contractId, variableConsiderationId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.approveVariableConsideration(contractId, variableConsiderationId), body ?? {})).data,
    applyVariableConsideration: async (contractId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.applyVariableConsideration(contractId), body ?? {})).data,

    listFinancingTerms: async (contractId) =>
      (await http.get(endpoints.compliance.ifrs15.contracts.financingTerms(contractId))).data,
    setFinancingTerms: async (contractId, body) =>
      (await http.put(endpoints.compliance.ifrs15.contracts.financingTerms(contractId), body)).data,
    postFinancing: async (contractId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.financingPost(contractId), body)).data,

    listCosts: async (contractId) => (await http.get(endpoints.compliance.ifrs15.contracts.costs(contractId))).data,
    createCost: async (contractId, body) => (await http.post(endpoints.compliance.ifrs15.contracts.costs(contractId), body)).data,
    addCost: async (contractId, body) => (await http.post(endpoints.compliance.ifrs15.contracts.costs(contractId), body)).data,
    generateCostSchedule: async (contractId, costId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.costScheduleGenerate(contractId, costId), body ?? {})).data,
    getCostSchedule: async (contractId, costId) =>
      (await http.get(endpoints.compliance.ifrs15.contracts.costSchedule(contractId, costId))).data,
    postCost: async (contractId, costId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.costPost(contractId, costId), body)).data,

    getPostingLedger: async (contractId) =>
      (await http.get(endpoints.compliance.ifrs15.contracts.postingLedger(contractId))).data,
    getEvents: async (contractId) =>
      (await http.get(endpoints.compliance.ifrs15.contracts.events(contractId))).data,

    getContractRollforwardReport: async (qs) =>
      (await http.get(endpoints.compliance.ifrs15.reports.contractRollforward(qs))).data,
    getRpoReport: async (qs) =>
      (await http.get(endpoints.compliance.ifrs15.reports.rpo(qs))).data,
    getRevenueDisaggregationReport: async (qs) =>
      (await http.get(endpoints.compliance.ifrs15.reports.revenueDisaggregation(qs))).data,
    getJudgementsReport: async (qs) =>
      (await http.get(endpoints.compliance.ifrs15.reports.judgements(qs))).data,
  };
}
