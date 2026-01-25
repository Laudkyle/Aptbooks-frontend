import { endpoints } from '../../../shared/api/endpoints.js'; 

export function makePartnersApi(http) {
  return {
    list: async (qs) => (await http.get(endpoints.modules.business.partners.list(qs))).data,
    create: async (body) => (await http.post(endpoints.modules.business.partners.create, body)).data,
    get: async (id) => (await http.get(endpoints.modules.business.partners.detail(id))).data,
    update: async (id, body) => (await http.patch(endpoints.modules.business.partners.update(id), body)).data,

    getCreditPolicy: async (id) => (await http.get(endpoints.modules.business.partners.creditPolicy(id))).data,
    setCreditPolicy: async (id, body) =>
      (await http.put(endpoints.modules.business.partners.creditPolicy(id), body)).data,

    addContact: async (id, body) => (await http.post(endpoints.modules.business.partners.contacts(id), body)).data,
    updateContact: async (id, contactId, body) =>
      (await http.patch(endpoints.modules.business.partners.contact(id, contactId), body)).data,

    addAddress: async (id, body) => (await http.post(endpoints.modules.business.partners.addresses(id), body)).data,
    updateAddress: async (id, addressId, body) =>
      (await http.patch(endpoints.modules.business.partners.address(id, addressId), body)).data
  }; 
}
