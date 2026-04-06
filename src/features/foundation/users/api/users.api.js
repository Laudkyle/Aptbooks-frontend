import { endpoints } from '../../../../shared/api/endpoints.js';

export function makeUsersApi(http) {
  return {
    me: async () => {
      const res = await http.get(endpoints.core.users.me);
      return res.data;
    },
    meSignature: async () => {
      const res = await http.get(endpoints.core.users.meSignature);
      return res.data;
    },
    updateMeSignature: async (body) => {
      const res = await http.put(endpoints.core.users.meSignature, body);
      return res.data;
    },
    deleteMeSignature: async () => {
      const res = await http.delete(endpoints.core.users.meSignature);
      return res.data;
    },
    list: async () => {
      const res = await http.get(endpoints.core.users.list);
      return res.data;
    },
    create: async (body) => {
      const res = await http.post(endpoints.core.users.create, body);
      return res.data;
    },
    detail: async (id) => {
      const res = await http.get(endpoints.core.users.detail(id));
      return res.data;
    },
    update: async (id, body) => {
      const res = await http.patch(endpoints.core.users.update(id), body);
      return res.data;
    },
    disable: async (id) => {
      const res = await http.patch(endpoints.core.users.disable(id));
      return res.data;
    },
    enable: async (id) => {
      const res = await http.post(endpoints.core.users.enable(id));
      return res.data;
    },
    remove: async (id) => {
      const res = await http.delete(endpoints.core.users.remove(id));
      return res.data;
    },
    assignRoles: async (id, roleIds) => {
      const res = await http.post(endpoints.core.users.assignRoles(id), { roleIds });
      return res.data;
    },
    removeRoles: async (id, roleIds) => {
      const res = await http.delete(endpoints.core.users.removeRoles(id), { data: { roleIds } });
      return res.data;
    },
    loginHistory: async (userId, qs) => {
      const res = await http.get(endpoints.core.users.loginHistoryAdmin(userId, qs));
      return res.data;
    },
    getSignature: async (id) => {
      const res = await http.get(endpoints.core.users.signature(id));
      return res.data;
    },
    updateSignature: async (id, body) => {
      const res = await http.put(endpoints.core.users.signature(id), body);
      return res.data;
    },
    deleteSignature: async (id) => {
      const res = await http.delete(endpoints.core.users.signature(id));
      return res.data;
    }
  };
}
