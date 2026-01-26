import { endpoints } from '../../../../shared/api/endpoints.js';

export function makeReconciliationApi(http) {
  return {
    /**
     * Run period reconciliation
     * @param {Object} qs - Query string params
     * @param {string} qs.periodId - Period ID to reconcile
     * @param {boolean} qs.onlyMismatches - Return only accounts with discrepancies
     * @returns {Promise<Object>} Reconciliation results
     */
    period: async (qs) => (await http.get(endpoints.accounting.reconciliation.period(qs))).data,

    /**
     * Get detailed transaction breakdown for a specific account discrepancy
     * @param {Object} qs - Query string params
     * @param {string} qs.periodId - Period ID
     * @param {string} qs.accountId - Account ID to investigate
     * @returns {Promise<Object>} Detailed transaction breakdown
     */
    getDiscrepancyDetails: async (qs) => 
      (await http.get(endpoints.accounting.reconciliation.discrepancyDetails(qs))).data,

    /**
     * Auto-correct minor rounding differences in GL balances
     * @param {Object} body - Request body
     * @param {string} body.periodId - Period ID to correct
     * @param {number} body.threshold - Maximum variance to auto-correct (default: 0.01)
     * @param {boolean} body.dryRun - Preview changes without applying (default: true)
     * @returns {Promise<Object>} Correction results
     */
    autoCorrect: async (body) => 
      (await http.post(endpoints.accounting.reconciliation.autoCorrect, body)).data
  };
}
