import { endpoints } from '../../../shared/api/endpoints.js';
import { ensureIdempotencyKey } from '../../../shared/api/idempotency.js';

export function makeCreditNotesApi(http) {
  return {
    list: async (qs) => (await http.get(endpoints.modules.transactions.creditNotes.list(qs))).data,
    create: async (body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.creditNotes.create, body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    get: async (id) => (await http.get(endpoints.modules.transactions.creditNotes.detail(id))).data,
    submitForApproval: async (id, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.creditNotes.submitForApproval(id), null, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    approve: async (id, body = {}, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.creditNotes.approve(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    reject: async (id, body = {}, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.creditNotes.reject(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    issue: async (id, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.creditNotes.issue(id), null, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    apply: async (id, body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.creditNotes.apply(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    void: async (id, body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.creditNotes.void(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data
  };
}
