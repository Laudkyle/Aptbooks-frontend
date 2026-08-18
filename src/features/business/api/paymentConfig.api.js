import { endpoints } from '../../../shared/api/endpoints.js';

export function makePaymentConfigApi(http) {
  return {
    listPaymentTerms: async () => (await http.get(endpoints.modules.business.paymentConfig.paymentTerms)).data,
    createPaymentTerm: async (body) => (await http.post(endpoints.modules.business.paymentConfig.paymentTerms, body)).data,
    updatePaymentTerm: async (id, body) =>
      (await http.patch(endpoints.modules.business.paymentConfig.paymentTerm(id), body)).data,
    deletePaymentTerm: async (id) => (await http.delete(endpoints.modules.business.paymentConfig.paymentTerm(id))).data,

    listPaymentMethods: async () => (await http.get(endpoints.modules.business.paymentConfig.paymentMethods)).data,
    createPaymentMethod: async (body) => (await http.post(endpoints.modules.business.paymentConfig.paymentMethods, body)).data,
    updatePaymentMethod: async (id, body) =>
      (await http.patch(endpoints.modules.business.paymentConfig.paymentMethod(id), body)).data,
    deletePaymentMethod: async (id) =>
      (await http.delete(endpoints.modules.business.paymentConfig.paymentMethod(id))).data,

    getPaymentSettings: async () => (await http.get(endpoints.modules.business.paymentConfig.paymentSettings)).data,
    setPaymentSettings: async (body) => (await http.put(endpoints.modules.business.paymentConfig.paymentSettings, body)).data
  };
}
