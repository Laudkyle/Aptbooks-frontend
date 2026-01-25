import { endpoints } from '../../../../shared/api/endpoints.js';

export function makePermissionsApi(http) {
  return {
    list: async () => {
      const res = await http.get(endpoints.core.permissions.list);
      return res.data;
    }
  };
}
