import { endpoints } from '../../../../shared/api/endpoints.js'; 

export function makeApprovalsApi(http) {
  return {
    inbox: async (qs) => {
      const res = await http.get(endpoints.workflow.approvalsInbox(qs)); 
      return res.data; 
    }
  }; 
}
