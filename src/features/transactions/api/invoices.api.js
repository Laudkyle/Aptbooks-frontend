import { endpoints } from '../../../shared/api/endpoints.js';

export function makeInvoicesApi(http) {
  return {
    list: async (qs) => (await http.get(endpoints.modules.transactions.invoices.list(qs))).data,
    create: async (body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.invoices.create, body, { headers: { 'Idempotency-Key': idempotencyKey } })).data,
    get: async (id) => (await http.get(endpoints.modules.transactions.invoices.detail(id))).data,

    submitForApproval: async (id, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.invoices.submitForApproval(id), null, { headers: { 'Idempotency-Key': idempotencyKey } })).data,
    approve: async (id, body = {}, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.invoices.approve(id), body, { headers: { 'Idempotency-Key': idempotencyKey } })).data,
    reject: async (id, body = {}, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.invoices.reject(id), body, { headers: { 'Idempotency-Key': idempotencyKey } })).data,
    issue: async (id, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.invoices.issue(id), null, { headers: { 'Idempotency-Key': idempotencyKey } })).data,
    void: async (id, body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.invoices.void(id), body, { headers: { 'Idempotency-Key': idempotencyKey } })).data
  };
}
