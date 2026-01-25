import { endpoints } from '../../../../shared/api/endpoints.js'; 

export function makeOrganizationsApi(http) {
  return {
    me: async () => {
      const res = await http.get(endpoints.core.organizations.me); 
      return res.data; 
    },
    updateMe: async (body) => {
      const res = await http.patch(endpoints.core.organizations.updateMe, body); 
      return res.data; 
    },
    uploadLogo: async (file) => {
      const form = new FormData(); 
      form.append('file', file); 
      const res = await http.post(endpoints.core.organizations.uploadLogo, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }); 
      return res.data; 
    }
  }; 
}
