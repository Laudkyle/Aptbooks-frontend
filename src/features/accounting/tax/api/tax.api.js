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
    setSettings: async (body) => (await http.put(endpoints.accounting.tax.settingsPut, body)).data,

    listAdjustments: async (qs) => (await http.get(endpoints.accounting.tax.adjustments(qs))).data,
    createAdjustment: async (body) => (await http.post(endpoints.accounting.tax.createAdjustment, body, { headers: ensureIdempotencyKey() })).data,
    postAdjustment: async (id) => (await http.post(endpoints.accounting.tax.postAdjustment(id), {}, { headers: ensureIdempotencyKey() })).data,
    voidAdjustment: async (id) => (await http.post(endpoints.accounting.tax.voidAdjustment(id), {}, { headers: ensureIdempotencyKey() })).data,

    listRegistrations: async (qs) => (await http.get(endpoints.accounting.tax.registrations(qs))).data,
    createRegistration: async (body) => (await http.post(endpoints.accounting.tax.registrationCreate, body, { headers: ensureIdempotencyKey() })).data,
    updateRegistration: async (id, body) => (await http.patch(endpoints.accounting.tax.registrationUpdate(id), body)).data,

    listRules: async (qs) => (await http.get(endpoints.accounting.tax.rules(qs))).data,
    createRule: async (body) => (await http.post(endpoints.accounting.tax.ruleCreate, body, { headers: ensureIdempotencyKey() })).data,
    updateRule: async (id, body) => (await http.patch(endpoints.accounting.tax.ruleUpdate(id), body)).data,

    listPartnerProfiles: async (qs) => (await http.get(endpoints.accounting.tax.taxProfiles(qs))).data,
    getEinvoicingSettings: async () => (await http.get(endpoints.accounting.tax.einvoicingSettings)).data,
    saveEinvoicingSettings: async (body) => (await http.put(endpoints.accounting.tax.einvoicingSettings, body)).data,
    listReturnTemplates: async (qs) => (await http.get(endpoints.accounting.tax.returnTemplates(qs))).data,
    listReturnConfigs: async (qs) => (await http.get(endpoints.accounting.tax.returnsConfig(qs))).data,
    listCountryPacks: async (qs) => (await http.get(endpoints.accounting.tax.countryPacks(qs))).data,
    listAutomationRules: async (qs) => (await http.get(endpoints.accounting.tax.automationRules(qs))).data,
    listFilingAdapters: async (qs) => (await http.get(endpoints.accounting.tax.filingAdapters(qs))).data,
  };
}
