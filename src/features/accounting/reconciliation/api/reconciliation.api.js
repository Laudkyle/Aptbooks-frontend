import { endpoints } from '../../../../shared/api/endpoints.js';

export function makeReconciliationApi(http) {
  return {
    period: async (qs) => (await http.get(endpoints.accounting.reconciliation.period(qs))).data
  };
}
