import { endpoints } from '../../../../shared/api/endpoints.js'; 

export function makeSettingsApi(http) {
  return {
    list: async (qs) => {
      const res = await http.get(endpoints.core.settings.list(qs)); 
      return res.data; 
    },
    get: async (key) => {
      const res = await http.get(endpoints.core.settings.get(key)); 
      return res.data; 
    },
    put: async (key, body) => {
      const res = await http.put(endpoints.core.settings.put(key), body); 
      return res.data; 
    },
    bulk: async (settings) => {
      const res = await http.put(endpoints.core.settings.bulk, { settings }); 
      return res.data; 
    }
  }; 
}
