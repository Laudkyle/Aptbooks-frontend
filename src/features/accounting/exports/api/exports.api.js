import { endpoints } from '../../../../shared/api/endpoints.js';

export function makeExportsApi(http) {
  async function getBlob(url) {
    const res = await http.get(url, { responseType: 'blob' });
    return { blob: res.data, headers: res.headers };
  }
  return {
    trialBalance: async (qs) => getBlob(endpoints.accounting.exports.trialBalance(qs)),
    generalLedger: async (qs) => getBlob(endpoints.accounting.exports.generalLedger(qs)),
    accountActivity: async (qs) => getBlob(endpoints.accounting.exports.accountActivity(qs))
  };
}
