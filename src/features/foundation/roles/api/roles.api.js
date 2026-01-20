import { endpoints } from '../../../../shared/api/endpoints.js';

export function makeRolesApi(http) {
  return {
    list: async () => {
      const res = await http.get(endpoints.core.roles.list);
      return res.data;
    },
    create: async (body) => {
      const res = await http.post(endpoints.core.roles.create, body);
      return res.data;
    },
    update: async (id, body) => {
      const res = await http.patch(endpoints.core.roles.update(id), body);
      return res.data;
    },
    remove: async (id) => {
      const res = await http.delete(endpoints.core.roles.remove(id));
      return res.data;
    },
    matrix: async () => {
      const res = await http.get(endpoints.core.roles.matrix);
      return res.data;
    },
    getPermissions: async (id) => {
      const res = await http.get(endpoints.core.roles.permissions(id));
      return res.data;
    },
    attachPermissions: async (id, permissionCodes) => {
      const res = await http.post(endpoints.core.roles.attachPermissions(id), { permissionCodes });
      return res.data;
    },
    detachPermissions: async (id, permissionCodes) => {
      const res = await http.delete(endpoints.core.roles.detachPermissions(id), { data: { permissionCodes } });
      return res.data;
    },
    applyTemplate: async (template) => {
      const res = await http.post(endpoints.core.roles.templates, { template });
      return res.data;
    }
  };
}
