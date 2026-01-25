import { endpoints } from '../../../shared/api/endpoints.js'; 

export function makeSearchApi(http) {
  return {
    search: async ({ q, limit }) => {
      const res = await http.get(endpoints.search({ q, limit })); 
      return res.data; 
    }
  }; 
}
