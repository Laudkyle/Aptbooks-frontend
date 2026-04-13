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

    getWithholdingDashboard: async (qs) => (await http.get(endpoints.accounting.tax.withholdingDashboard(qs))).data?.data ?? {},
    listWithholdingOpenItems: async (qs) => (await http.get(endpoints.accounting.tax.withholdingOpenItems(qs))).data,

    listWithholdingRemittances: async (qs) => (await http.get(endpoints.accounting.tax.withholdingRemittances(qs))).data,
    createWithholdingRemittance: async (body) => (await http.post(endpoints.accounting.tax.withholdingRemittances({}), body, { headers: ensureIdempotencyKey() })).data,
    getWithholdingRemittance: async (id) => (await http.get(endpoints.accounting.tax.withholdingRemittanceDetail(id))).data,
    updateWithholdingRemittance: async (id, body) => (await http.patch(endpoints.accounting.tax.withholdingRemittanceDetail(id), body)).data,
    submitWithholdingRemittance: async (id) => (await http.post(endpoints.accounting.tax.withholdingRemittanceSubmit(id), {}, { headers: ensureIdempotencyKey() })).data,
    approveWithholdingRemittance: async (id, body) => (await http.post(endpoints.accounting.tax.withholdingRemittanceApprove(id), body ?? {}, { headers: ensureIdempotencyKey() })).data,
    rejectWithholdingRemittance: async (id, body) => (await http.post(endpoints.accounting.tax.withholdingRemittanceReject(id), body ?? {}, { headers: ensureIdempotencyKey() })).data,
    postWithholdingRemittance: async (id, body) => (await http.post(endpoints.accounting.tax.withholdingRemittancePost(id), body ?? {}, { headers: ensureIdempotencyKey() })).data,
    voidWithholdingRemittance: async (id, body) => (await http.post(endpoints.accounting.tax.withholdingRemittanceVoid(id), body ?? {}, { headers: ensureIdempotencyKey() })).data,

    listWithholdingCertificates: async (qs) => (await http.get(endpoints.accounting.tax.withholdingCertificates(qs))).data,
    createWithholdingCertificate: async (body) => (await http.post(endpoints.accounting.tax.withholdingCertificates({}), body, { headers: ensureIdempotencyKey() })).data,
    getWithholdingCertificate: async (id) => (await http.get(endpoints.accounting.tax.withholdingCertificateDetail(id))).data,
    updateWithholdingCertificate: async (id, body) => (await http.patch(endpoints.accounting.tax.withholdingCertificateDetail(id), body)).data,
    submitWithholdingCertificate: async (id) => (await http.post(endpoints.accounting.tax.withholdingCertificateSubmit(id), {}, { headers: ensureIdempotencyKey() })).data,
    approveWithholdingCertificate: async (id, body) => (await http.post(endpoints.accounting.tax.withholdingCertificateApprove(id), body ?? {}, { headers: ensureIdempotencyKey() })).data,
    rejectWithholdingCertificate: async (id, body) => (await http.post(endpoints.accounting.tax.withholdingCertificateReject(id), body ?? {}, { headers: ensureIdempotencyKey() })).data,
    postWithholdingCertificate: async (id, body) => (await http.post(endpoints.accounting.tax.withholdingCertificatePost(id), body ?? {}, { headers: ensureIdempotencyKey() })).data,
    voidWithholdingCertificate: async (id, body) => (await http.post(endpoints.accounting.tax.withholdingCertificateVoid(id), body ?? {}, { headers: ensureIdempotencyKey() })).data,
  };
}
