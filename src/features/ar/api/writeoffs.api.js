import { endpoints } from '../../../shared/api/endpoints.js';

export function makeWriteoffsApi(http) {
  return {
    listReasonCodes: async () => (await http.get(endpoints.modules.ar.writeoffs.reasonCodes)).data,
    createReasonCode: async (body) => (await http.post(endpoints.modules.ar.writeoffs.reasonCodes, body)).data,
    deleteReasonCode: async (code) => (await http.delete(endpoints.modules.ar.writeoffs.reasonCode(code))).data,

    getSettings: async () => (await http.get(endpoints.modules.ar.writeoffs.settings)).data,
    setSettings: async (body) => (await http.put(endpoints.modules.ar.writeoffs.settings, body)).data,

    list: async (qs) => (await http.get(endpoints.modules.ar.writeoffs.list(qs))).data,
    get: async (id) => (await http.get(endpoints.modules.ar.writeoffs.detail(id))).data,
    create: async (body) => (await http.post(endpoints.modules.ar.writeoffs.create, body)).data,

    submit: async (id) => (await http.post(endpoints.modules.ar.writeoffs.submit(id))).data,
    approve: async (id) => (await http.post(endpoints.modules.ar.writeoffs.approve(id))).data,
    reject: async (id, body) => (await http.post(endpoints.modules.ar.writeoffs.reject(id), body)).data,
    post: async (id, body) => (await http.post(endpoints.modules.ar.writeoffs.post(id), body)).data,
    void: async (id) => (await http.post(endpoints.modules.ar.writeoffs.void(id))).data
  };
}
