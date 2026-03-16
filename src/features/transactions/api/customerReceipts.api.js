import { endpoints } from '../../../shared/api/endpoints.js';
import { ensureIdempotencyKey } from '../../../shared/api/idempotency.js';

export function makeCustomerReceiptsApi(http) {
  return {
    list: async (qs) => (await http.get(endpoints.modules.transactions.customerReceipts.list(qs))).data,
    create: async (body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.customerReceipts.create, body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    get: async (id) => (await http.get(endpoints.modules.transactions.customerReceipts.detail(id))).data,
    submitForApproval: async (id, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.customerReceipts.submitForApproval(id), null, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    approve: async (id, body = {}, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.customerReceipts.approve(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    reject: async (id, body = {}, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.customerReceipts.reject(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    autoAllocate: async (id, body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.customerReceipts.autoAllocate(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    reallocate: async (id, body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.customerReceipts.reallocate(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    post: async (id, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.customerReceipts.post(id), null, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    void: async (id, body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.customerReceipts.void(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data
  };
}
