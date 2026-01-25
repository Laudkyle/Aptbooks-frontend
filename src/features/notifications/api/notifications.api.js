import { endpoints } from '../../../shared/api/endpoints.js'; 

export function makeNotificationsApi(http) {
  return {
    list: async (qs) => {
      const res = await http.get(endpoints.core.notifications.list, { params: qs }); 
      return res.data; 
    },
    markRead: async (id) => {
      const res = await http.patch(endpoints.core.notifications.markRead(id)); 
      return res.data; 
    },
    bulkMarkRead: async (ids) => {
      const res = await http.post(endpoints.core.notifications.bulkMarkRead, { ids }); 
      return res.data; 
    },
    getSmtp: async () => {
      const res = await http.get(endpoints.core.notifications.smtpGet); 
      return res.data; 
    },
    putSmtp: async (body) => {
      const res = await http.put(endpoints.core.notifications.smtpPut, body); 
      return res.data; 
    },
    testSmtp: async (to) => {
      const res = await http.post(endpoints.core.notifications.smtpTest, { to }); 
      return res.data; 
    }
  }; 
}
