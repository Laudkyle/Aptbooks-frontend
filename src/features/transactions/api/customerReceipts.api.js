import { endpoints } from '../../../shared/api/endpoints.js'; 

export function makeCustomerReceiptsApi(http) {
  return {
    list: async (qs) => (await http.get(endpoints.modules.transactions.customerReceipts.list(qs))).data,
    create: async (body) => (await http.post(endpoints.modules.transactions.customerReceipts.create, body)).data,
    get: async (id) => (await http.get(endpoints.modules.transactions.customerReceipts.detail(id))).data,

    autoAllocate: async (id, body) => (await http.post(endpoints.modules.transactions.customerReceipts.autoAllocate(id), body)).data,
    reallocate: async (id, body) => (await http.post(endpoints.modules.transactions.customerReceipts.reallocate(id), body)).data,
    post: async (id) => (await http.post(endpoints.modules.transactions.customerReceipts.post(id))).data,
    void: async (id, body) => (await http.post(endpoints.modules.transactions.customerReceipts.void(id), body)).data
  }; 
}
