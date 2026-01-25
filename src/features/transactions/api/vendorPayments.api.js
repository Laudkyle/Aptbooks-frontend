import { endpoints } from '../../../shared/api/endpoints.js'; 
import { ensureIdempotencyKey } from '../../../shared/api/idempotency.js'; 

export function makeVendorPaymentsApi(http) {
  return {
    list: async (qs) => (await http.get(endpoints.modules.transactions.vendorPayments.list(qs))).data,
    create: async (body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.vendorPayments.create, body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    get: async (id) => (await http.get(endpoints.modules.transactions.vendorPayments.detail(id))).data,

    autoAllocate: async (id, body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.vendorPayments.autoAllocate(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    reallocate: async (id, body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.vendorPayments.reallocate(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    post: async (id, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.vendorPayments.post(id), null, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    void: async (id, body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.vendorPayments.void(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data
  }; 
}
