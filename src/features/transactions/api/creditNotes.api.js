import { endpoints } from '../../../shared/api/endpoints.js';

export function makeCreditNotesApi(http) {
  return {
    list: async (qs) => (await http.get(endpoints.modules.transactions.creditNotes.list(qs))).data,
    create: async (body) => (await http.post(endpoints.modules.transactions.creditNotes.create, body)).data,
    get: async (id) => (await http.get(endpoints.modules.transactions.creditNotes.detail(id))).data,

    issue: async (id) => (await http.post(endpoints.modules.transactions.creditNotes.issue(id))).data,
    apply: async (id, body) => (await http.post(endpoints.modules.transactions.creditNotes.apply(id), body)).data,
    void: async (id, body) => (await http.post(endpoints.modules.transactions.creditNotes.void(id), body)).data
  };
}
