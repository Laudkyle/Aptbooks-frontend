import { endpoints } from '../../../../shared/api/endpoints.js';

export function makeBalancesApi(http) {
  return {
    trialBalance: async (qs) => (await http.get(endpoints.accounting.balances.trialBalance(qs))).data,
    gl: async (qs) => (await http.get(endpoints.accounting.balances.gl(qs))).data,
    accountActivity: async (qs) => (await http.get(endpoints.accounting.balances.accountActivity(qs))).data
  };
}
