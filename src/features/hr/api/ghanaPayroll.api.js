import { ensureIdempotencyKey } from '../../../shared/api/idempotency.js';

const BASE = '/modules/hr/payroll/ghana';
const idem = () => ({ headers: ensureIdempotencyKey() });

export function makeGhanaPayrollApi(http) {
  return {
    async getSettings() {
      const response = await http.get(`${BASE}/settings`);
      return response.data;
    },
    async updateSettings(payload) {
      const response = await http.patch(`${BASE}/settings`, payload);
      return response.data;
    },
    async listReturns() {
      const response = await http.get(`${BASE}/returns`);
      return response.data;
    },
    async getReturn(returnId) {
      const response = await http.get(`${BASE}/returns/${returnId}`);
      return response.data;
    },
    async prepareReturn(payload) {
      const response = await http.post(`${BASE}/returns`, payload, idem());
      return response.data;
    },
    async finalizeReturn(returnId) {
      const response = await http.post(`${BASE}/returns/${returnId}/finalize`, {}, idem());
      return response.data;
    },
    async markReturnFiled(returnId, graReference) {
      const response = await http.post(`${BASE}/returns/${returnId}/filed`, { graReference }, idem());
      return response.data;
    },
    async exportReturnCsv(returnId) {
      return http.get(`${BASE}/returns/${returnId}/export.csv`, { responseType: 'blob' });
    },
    async getPensionSchedule({ periodStart, periodEnd }) {
      const query = new URLSearchParams({ periodStart, periodEnd }).toString();
      const response = await http.get(`${BASE}/pension-schedule?${query}`);
      return response.data;
    },
    async getDisengagedSchedule({ periodStart, periodEnd }) {
      const query = new URLSearchParams({ periodStart, periodEnd }).toString();
      const response = await http.get(`${BASE}/disengaged-schedule?${query}`);
      return response.data;
    },
    async listRemittances() {
      const response = await http.get(`${BASE}/remittances`);
      return response.data;
    },
    async prepareRemittance(payload) {
      const response = await http.post(`${BASE}/remittances`, payload, idem());
      return response.data;
    },
    async markRemittancePaid(remittanceId, payload) {
      const response = await http.post(`${BASE}/remittances/${remittanceId}/paid`, payload, idem());
      return response.data;
    },
  };
}
