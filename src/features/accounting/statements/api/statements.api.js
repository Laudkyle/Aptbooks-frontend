import { endpoints } from '../../../../shared/api/endpoints.js';

export function makeStatementsApi(http) {
  return {
    trialBalance: async (qs) => (await http.get(endpoints.accounting.statements.trialBalance(qs))).data,
    incomeStatement: async (qs) => (await http.get(endpoints.accounting.statements.incomeStatement(qs))).data,
    balanceSheet: async (qs) => (await http.get(endpoints.accounting.statements.balanceSheet(qs))).data,
    cashFlow: async (qs) => (await http.get(endpoints.accounting.statements.cashFlow(qs))).data,
    changesInEquity: async (qs) => (await http.get(endpoints.accounting.statements.changesInEquity(qs))).data
  };
}
