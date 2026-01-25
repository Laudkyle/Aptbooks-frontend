import { endpoints } from '../../../shared/api/endpoints.js';

export function makePaymentPlansApi(http) {
  return {
    list: async (qs) => (await http.get(endpoints.modules.ar.paymentPlans.list(qs))).data,
    get: async (id) => (await http.get(endpoints.modules.ar.paymentPlans.detail(id))).data,
    create: async (body) => (await http.post(endpoints.modules.ar.paymentPlans.create, body)).data,
    cancel: async (id) => (await http.post(endpoints.modules.ar.paymentPlans.cancel(id))).data,
    markInstallmentPaid: async (id, installmentId, body) =>
      (await http.post(endpoints.modules.ar.paymentPlans.markInstallmentPaid(id, installmentId), body)).data
  };
}
