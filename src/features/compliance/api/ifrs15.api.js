import { endpoints } from '../../../shared/api/endpoints.js';

export function makeIfrs15Api(http) {
  return {
    // Settings
    getSettings: async () => (await http.get(endpoints.compliance.ifrs15.settings.get)).data,
    updateSettings: async (body) => (await http.put(endpoints.compliance.ifrs15.settings.put, body)).data,

    // Contracts
    listContracts: async (qs) => (await http.get(endpoints.compliance.ifrs15.contracts.list(qs))).data,
    createContract: async (body) => (await http.post(endpoints.compliance.ifrs15.contracts.create, body)).data,
    getContract: async (contractId) => (await http.get(endpoints.compliance.ifrs15.contracts.detail(contractId))).data,
    activateContract: async (contractId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.activate(contractId), body ?? {})).data,

    // Performance obligations
    addObligation: async (contractId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.obligations(contractId), body)).data,

    // Schedule
    generateSchedule: async (contractId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.scheduleGenerate(contractId), body ?? {})).data,
    getSchedule: async (contractId) => (await http.get(endpoints.compliance.ifrs15.contracts.schedule(contractId))).data,

    // Posting
    postRevenue: async (contractId, body) => (await http.post(endpoints.compliance.ifrs15.contracts.post(contractId), body)).data,

    // Costs
    listCosts: async (contractId) => (await http.get(endpoints.compliance.ifrs15.contracts.costs(contractId))).data,
    addCost: async (contractId, body) => (await http.post(endpoints.compliance.ifrs15.contracts.costs(contractId), body)).data,
    generateCostSchedule: async (contractId, costId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.costScheduleGenerate(contractId, costId), body ?? {})).data,
    postCost: async (contractId, costId, body) =>
      (await http.post(endpoints.compliance.ifrs15.contracts.costPost(contractId, costId), body)).data
  };
}
