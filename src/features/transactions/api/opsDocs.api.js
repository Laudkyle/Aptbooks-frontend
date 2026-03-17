import { ensureIdempotencyKey } from '../../../shared/api/idempotency.js';

export function makeOpsDocsApi(http, endpointSet) {
  return {
    list: async (qs) => (await http.get(endpointSet.list(qs))).data,
    create: async (body, { idempotencyKey } = {}) =>
      (await http.post(endpointSet.create, body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    get: async (id) => (await http.get(endpointSet.detail(id))).data,
    submitForApproval: async (id, { idempotencyKey } = {}) =>
      (await http.post(endpointSet.submitForApproval(id), null, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    approve: async (id, body = {}, { idempotencyKey } = {}) =>
      (await http.post(endpointSet.approve(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    reject: async (id, body = {}, { idempotencyKey } = {}) =>
      (await http.post(endpointSet.reject(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data,
    finalize: async (id, { idempotencyKey } = {}) => {
      const fn = endpointSet.post ?? endpointSet.issue;
      return (await http.post(fn(id), null, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data;
    },
    void: async (id, body, { idempotencyKey } = {}) =>
      (await http.post(endpointSet.void(id), body, { headers: ensureIdempotencyKey(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) })).data
  };
}
