import { endpoints } from '../../../../shared/api/endpoints.js'; 

export function makeDimensionSecurityApi(http) {
  return {
    list: async (qs) => {
      const res = await http.get(endpoints.core.dimensionSecurity.rules(qs)); 
      return res.data; 
    },
    create: async (body) => {
      const res = await http.post(endpoints.core.dimensionSecurity.createRule, body); 
      return res.data; 
    },
    update: async (ruleId, body) => {
      const res = await http.put(endpoints.core.dimensionSecurity.updateRule(ruleId), body); 
      return res.data; 
    },
    remove: async (ruleId) => {
      const res = await http.delete(endpoints.core.dimensionSecurity.removeRule(ruleId)); 
      return res.data; 
    }
  }; 
}
