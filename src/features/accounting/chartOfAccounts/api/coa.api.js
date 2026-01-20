import { endpoints } from '../../../../shared/api/endpoints.js';

export function makeCoaApi(http) {
  return {
    list: async (qs) => (await http.get(endpoints.accounting.accounts.list(qs))).data,
    create: async (body) => (await http.post(endpoints.accounting.accounts.create, body)).data,
    detail: async (id) => (await http.get(endpoints.accounting.accounts.detail(id))).data,
    update: async (id, body) => (await http.patch(endpoints.accounting.accounts.update(id), body)).data,
    archive: async (id) => (await http.post(endpoints.accounting.accounts.archive(id))).data
  };
}
