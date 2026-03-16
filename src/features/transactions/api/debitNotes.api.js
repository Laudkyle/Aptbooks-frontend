import { endpoints } from '../../../shared/api/endpoints.js';
import { ensureIdempotencyKey } from '../../../shared/api/idempotency.js';

export function makeDebitNotesApi(http) {
  return {
    list: async (qs) => (await http.get(endpoints.modules.transactions.debitNotes.list(qs))).data,
    create: async (body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.debitNotes.create, body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    get: async (id) => (await http.get(endpoints.modules.transactions.debitNotes.detail(id))).data,
    submitForApproval: async (id, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.debitNotes.submitForApproval(id), null, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    approve: async (id, body = {}, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.debitNotes.approve(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    reject: async (id, body = {}, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.debitNotes.reject(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    issue: async (id, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.debitNotes.issue(id), null, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    apply: async (id, body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.debitNotes.apply(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    void: async (id, body, { idempotencyKey } = {}) =>
      (await http.post(endpoints.modules.transactions.debitNotes.void(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data
  };
}
