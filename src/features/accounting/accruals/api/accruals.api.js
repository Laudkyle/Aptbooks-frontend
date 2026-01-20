import { endpoints } from '../../../../shared/api/endpoints.js';

export function makeAccrualsApi(http) {
  return {
    listRules: async () => (await http.get(endpoints.accounting.accruals.rules)).data,
    ruleDetail: async (id) => (await http.get(endpoints.accounting.accruals.ruleDetail(id))).data,
    createRule: async (body) => (await http.post(endpoints.accounting.accruals.createRule, body)).data,
    runDue: async (body) => (await http.post(endpoints.accounting.accruals.runDue, body)).data,
    runReversals: async (body) => (await http.post(endpoints.accounting.accruals.runReversals, body)).data,
    runPeriodEnd: async (body) => (await http.post(endpoints.accounting.accruals.runPeriodEnd, body)).data,
    listRuns: async (qs) => (await http.get(endpoints.accounting.accruals.runs(qs))).data,
    runDetail: async (runId) => (await http.get(endpoints.accounting.accruals.runDetail(runId))).data
  };
}
