import { endpoints } from '../../../shared/api/endpoints.js'; 

export function makeDebitNotesApi(http) {
  return {
    list: async (qs) => (await http.get(endpoints.modules.transactions.debitNotes.list(qs))).data,
    create: async (body) => (await http.post(endpoints.modules.transactions.debitNotes.create, body)).data,
    get: async (id) => (await http.get(endpoints.modules.transactions.debitNotes.detail(id))).data,

    issue: async (id) => (await http.post(endpoints.modules.transactions.debitNotes.issue(id))).data,
    apply: async (id, body) => (await http.post(endpoints.modules.transactions.debitNotes.apply(id), body)).data,
    void: async (id, body) => (await http.post(endpoints.modules.transactions.debitNotes.void(id), body)).data
  }; 
}
