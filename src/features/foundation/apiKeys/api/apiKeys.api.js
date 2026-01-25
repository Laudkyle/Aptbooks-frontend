import { endpoints } from '../../../../shared/api/endpoints.js'; 

export function makeApiKeysApi(http) {
  return {
    list: async () => {
      const res = await http.get(endpoints.core.apiKeys.list); 
      return res.data; 
    },
    create: async (name) => {
      const res = await http.post(endpoints.core.apiKeys.create, { name }); 
      return res.data; 
    },
    revoke: async (id) => {
      const res = await http.post(endpoints.core.apiKeys.revoke(id)); 
      return res.data; 
    }
  }; 
}
