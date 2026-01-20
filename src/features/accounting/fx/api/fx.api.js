import { endpoints } from '../../../../shared/api/endpoints.js';

export function makeFxApi(http) {
  return {
    listRateTypes: async () => (await http.get(endpoints.accounting.fx.rateTypes)).data,
    createRateType: async (body) => (await http.post(endpoints.accounting.fx.createRateType, body)).data,
    listRates: async (qs) => (await http.get(endpoints.accounting.fx.rates(qs))).data,
    upsertRate: async (body) => (await http.put(endpoints.accounting.fx.upsertRate, body)).data,
    effectiveRate: async (qs) => (await http.get(endpoints.accounting.fx.effectiveRate(qs))).data
  };
}
