import { ensureIdempotencyKey } from '../../../../shared/api/idempotency.js';

const TAX_BASE = '/core/accounting/tax';
const FISCAL_BASE = '/modules/integrations/fiscalization';
const idem = () => ({ headers: ensureIdempotencyKey() });

function queryString(query = {}) {
  const values = Object.entries(query).filter(([, value]) => value !== '' && value !== null && value !== undefined);
  const encoded = new URLSearchParams(values).toString();
  return encoded ? `?${encoded}` : '';
}

export function makeGhanaAdvancedApi(http) {
  return {
    cit: {
      async getSettings() {
        const response = await http.get(`${TAX_BASE}/ghana/cit/settings`);
        return response.data.data;
      },
      async updateSettings(payload) {
        const response = await http.put(`${TAX_BASE}/ghana/cit/settings`, payload);
        return response.data.data;
      },
      async listRates({ asOfDate } = {}) {
        const response = await http.get(`${TAX_BASE}/ghana/cit/rates${queryString({ asOfDate })}`);
        return response.data.data;
      },
      async listComputations(query = {}) {
        const response = await http.get(`${TAX_BASE}/ghana/cit/computations${queryString(query)}`);
        return response.data.data;
      },
      async getComputation(id) {
        const response = await http.get(`${TAX_BASE}/ghana/cit/computations/${id}`);
        return response.data.data;
      },
      async prepareComputation(payload) {
        const response = await http.post(`${TAX_BASE}/ghana/cit/computations`, payload, idem());
        return response.data.data;
      },
      async addAdjustment(id, payload) {
        const response = await http.post(`${TAX_BASE}/ghana/cit/computations/${id}/adjustments`, payload);
        return response.data.data;
      },
      async finalizeComputation(id) {
        const response = await http.post(`${TAX_BASE}/ghana/cit/computations/${id}/finalize`, {}, idem());
        return response.data.data;
      },
      async markComputationFiled(id, graReference) {
        const response = await http.post(`${TAX_BASE}/ghana/cit/computations/${id}/filed`, { graReference }, idem());
        return response.data.data;
      },
      async listSelfAssessments({ taxYear } = {}) {
        const response = await http.get(`${TAX_BASE}/ghana/cit/self-assessments${queryString({ taxYear })}`);
        return response.data.data;
      },
      async createSelfAssessment(payload) {
        const response = await http.post(`${TAX_BASE}/ghana/cit/self-assessments`, payload, idem());
        return response.data.data;
      },
      async finalizeSelfAssessment(id) {
        const response = await http.post(`${TAX_BASE}/ghana/cit/self-assessments/${id}/finalize`, {}, idem());
        return response.data.data;
      },
      async markSelfAssessmentFiled(id, graReference) {
        const response = await http.post(`${TAX_BASE}/ghana/cit/self-assessments/${id}/filed`, { graReference }, idem());
        return response.data.data;
      },
      async recordSelfAssessmentPayment(id, payload) {
        const response = await http.post(`${TAX_BASE}/ghana/cit/self-assessments/${id}/payments`, payload, idem());
        return response.data.data;
      },
    },
    capitalAllowances: {
      async listClasses() {
        const response = await http.get(`${TAX_BASE}/ghana/capital-allowances/classes`);
        return response.data.data;
      },
      async listAssets(query = {}) {
        const response = await http.get(`${TAX_BASE}/ghana/capital-allowances/assets${queryString(query)}`);
        return response.data.data;
      },
      async createAsset(payload) {
        const response = await http.post(`${TAX_BASE}/ghana/capital-allowances/assets`, payload, idem());
        return response.data.data;
      },
      async disposeAsset(id, payload) {
        const response = await http.post(`${TAX_BASE}/ghana/capital-allowances/assets/${id}/dispose`, payload, idem());
        return response.data.data;
      },
      async listRuns({ taxYear } = {}) {
        const response = await http.get(`${TAX_BASE}/ghana/capital-allowances/runs${queryString({ taxYear })}`);
        return response.data.data;
      },
      async getRun(id) {
        const response = await http.get(`${TAX_BASE}/ghana/capital-allowances/runs/${id}`);
        return response.data.data;
      },
      async prepareRun(payload) {
        const response = await http.post(`${TAX_BASE}/ghana/capital-allowances/runs`, payload, idem());
        return response.data.data;
      },
      async finalizeRun(id) {
        const response = await http.post(`${TAX_BASE}/ghana/capital-allowances/runs/${id}/finalize`, {}, idem());
        return response.data.data;
      },
    },
    industry: {
      async listProfiles() {
        const response = await http.get(`${TAX_BASE}/ghana/industry-profiles`);
        return response.data.data;
      },
      async installProfile(profileCode, settings = {}) {
        const response = await http.post(`${TAX_BASE}/ghana/industry-profiles/${encodeURIComponent(profileCode)}/install`, { settings }, idem());
        return response.data.data;
      },
      async reviewProfile(settings = {}) {
        const response = await http.post(`${TAX_BASE}/ghana/industry-profiles/review`, { settings });
        return response.data.data;
      },
    },
    fiscalization: {
      async getSettings() {
        const response = await http.get(`${FISCAL_BASE}/settings`);
        return response.data;
      },
      async updateSettings(payload) {
        const response = await http.put(`${FISCAL_BASE}/settings`, payload);
        return response.data;
      },
      async getReadiness() {
        const response = await http.get(`${FISCAL_BASE}/readiness`);
        return response.data;
      },
      async listLocations() {
        const response = await http.get(`${FISCAL_BASE}/locations`);
        return response.data;
      },
      async saveLocation(payload) {
        const response = await http.post(`${FISCAL_BASE}/locations`, payload, idem());
        return response.data;
      },
      async listDevices() {
        const response = await http.get(`${FISCAL_BASE}/devices`);
        return response.data;
      },
      async saveDevice(payload) {
        const response = await http.post(`${FISCAL_BASE}/devices`, payload, idem());
        return response.data;
      },
      async listDocuments(query = {}) {
        const response = await http.get(`${FISCAL_BASE}/documents${queryString(query)}`);
        return response.data;
      },
      async getDocument(id) {
        const response = await http.get(`${FISCAL_BASE}/documents/${id}`);
        return response.data;
      },
      async prepareInvoice(invoiceId) {
        const response = await http.post(`${FISCAL_BASE}/invoices/${invoiceId}/prepare`, {}, idem());
        return response.data;
      },
      async preparePosSale(saleId) {
        const response = await http.post(`${FISCAL_BASE}/pos-sales/${saleId}/prepare`, {}, idem());
        return response.data;
      },
      async queueDocument(id) {
        const response = await http.post(`${FISCAL_BASE}/documents/${id}/queue`, {}, idem());
        return response.data;
      },
      async markOffline(id, reason) {
        const response = await http.post(`${FISCAL_BASE}/documents/${id}/offline`, { reason }, idem());
        return response.data;
      },
      async listQueue(query = {}) {
        const response = await http.get(`${FISCAL_BASE}/queue${queryString(query)}`);
        return response.data;
      },
      async processQueue(limit = 10) {
        const response = await http.post(`${FISCAL_BASE}/queue/process`, { limit });
        return response.data;
      },
      async listLogs({ documentId } = {}) {
        const response = await http.get(`${FISCAL_BASE}/logs${queryString({ documentId })}`);
        return response.data;
      },
      async exportLogsCsv() {
        return http.get(`${FISCAL_BASE}/logs/export.csv`, { responseType: 'blob' });
      },
    },
  };
}
