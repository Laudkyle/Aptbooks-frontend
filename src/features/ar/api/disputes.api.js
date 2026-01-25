import { endpoints } from '../../../shared/api/endpoints.js'; 

export function makeDisputesApi(http) {
  return {
    listReasonCodes: async () => (await http.get(endpoints.modules.ar.disputes.reasonCodes)).data,
    createReasonCode: async (body) => (await http.post(endpoints.modules.ar.disputes.reasonCodes, body)).data,
    deleteReasonCode: async (code) => (await http.delete(endpoints.modules.ar.disputes.reasonCode(code))).data,

    list: async (qs) => (await http.get(endpoints.modules.ar.disputes.list(qs))).data,
    get: async (id) => (await http.get(endpoints.modules.ar.disputes.detail(id))).data,
    create: async (body) => (await http.post(endpoints.modules.ar.disputes.create, body)).data,
    actions: async (id, body) => (await http.post(endpoints.modules.ar.disputes.actions(id), body)).data,
    resolve: async (id, body) => (await http.post(endpoints.modules.ar.disputes.resolve(id), body)).data,
    void: async (id) => (await http.post(endpoints.modules.ar.disputes.void(id))).data
  }; 
}
