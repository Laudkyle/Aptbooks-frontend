import { endpoints } from '../../../shared/api/endpoints.js';

export function makeBillsApi(http) {
  return {
    list: async (qs) => (await http.get(endpoints.modules.transactions.bills.list(qs))).data,
    create: async (body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.bills.create, body, { headers: { 'Idempotency-Key': idempotencyKey } })).data,
    get: async (id) => (await http.get(endpoints.modules.transactions.bills.detail(id))).data,

    submitForApproval: async (id, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.bills.submitForApproval(id), null, { headers: { 'Idempotency-Key': idempotencyKey } })).data,
    approve: async (id, body = {}, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.bills.approve(id), body, { headers: { 'Idempotency-Key': idempotencyKey } })).data,
    reject: async (id, body = {}, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.bills.reject(id), body, { headers: { 'Idempotency-Key': idempotencyKey } })).data,
    issue: async (id, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.bills.issue(id), null, { headers: { 'Idempotency-Key': idempotencyKey } })).data,
    void: async (id, body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.bills.void(id), body, { headers: { 'Idempotency-Key': idempotencyKey } })).data
  };
}
