import { endpoints } from '../../../../shared/api/endpoints.js';
import { ensureIdempotencyKey } from '../../../../shared/api/idempotency.js';

export function makeTaxApi(http) {
  return {
    listJurisdictions: async () => (await http.get(endpoints.accounting.tax.jurisdictions)).data,
    createJurisdiction: async (body) => (await http.post(endpoints.accounting.tax.jurisdictions, body, { headers: ensureIdempotencyKey() })).data,
    updateJurisdiction: async (id, body) => (await http.patch(endpoints.accounting.tax.jurisdictionUpdate(id), body)).data,
    deleteJurisdiction: async (id) => (await http.delete(endpoints.accounting.tax.jurisdictionDelete(id))).data,

    listCodes: async (qs) => (await http.get(endpoints.accounting.tax.codes(qs))).data,
    createCode: async (body) => (await http.post(endpoints.accounting.tax.codes({}), body, { headers: ensureIdempotencyKey() })).data,
    updateCode: async (id, body) => (await http.patch(endpoints.accounting.tax.codeUpdate(id), body)).data,
    deleteCode: async (id) => (await http.delete(endpoints.accounting.tax.codeDelete(id))).data,

    getSettings: async () => (await http.get(endpoints.accounting.tax.settingsGet)).data,
    setSettings: async (body) => (await http.put(endpoints.accounting.tax.settingsPut, body)).data
  };
}
