import { endpoints } from '../../../../shared/api/endpoints.js';

export function makeReconciliationApi(http) {
  return {
    period: async (qs) => (await http.get(endpoints.accounting.reconciliation.period(qs))).data,

    getDiscrepancyDetails: async (qs) =>
      (await http.get(endpoints.accounting.reconciliation.discrepancyDetails(qs))).data,

    autoCorrect: async (body) =>
      (await http.post(endpoints.accounting.reconciliation.autoCorrect, body)).data,

    rebuildBalances: async (body) =>
      (await http.post(endpoints.accounting.reconciliation.rebuildBalances, body)).data,

    history: async (qs) =>
      (await http.get(endpoints.accounting.reconciliation.history(qs))).data,

    getPolicy: async () =>
      (await http.get(endpoints.accounting.reconciliation.policy)).data,

    updatePolicy: async (body) =>
      (await http.put(endpoints.accounting.reconciliation.policy, body)).data,

    exportReconciliation: async (qs) => {
      const res = await http.get(endpoints.accounting.reconciliation.export(qs), { responseType: 'blob' });
      return { blob: res.data, headers: res.headers };
    },
  };
}
