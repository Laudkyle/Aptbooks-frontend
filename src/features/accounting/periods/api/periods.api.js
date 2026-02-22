import { endpoints } from '../../../../shared/api/endpoints.js';

export function makePeriodsApi(http) {
  return {
    list: async (params = {}) => {
      // params can include: fiscalYear, status, startDate, endDate, code, limit, offset
      const response = await http.get(endpoints.accounting.periods.list, { params });
      return response.data;
    },
    current: async () => {
      const response = await http.get(endpoints.accounting.periods.current);
      return response.data;
    },
    create: async (body) => {
      const response = await http.post(endpoints.accounting.periods.create, body);
      return response.data;
    },
    closePreview: async (id) => {
      const response = await http.get(endpoints.accounting.periods.closePreview(id));
      return response.data;
    },
    close: async (id, body) => {
      const response = await http.post(endpoints.accounting.periods.close(id), body ?? {});
      return response.data;
    },
    reopen: async (id) => {
      const response = await http.post(endpoints.accounting.periods.reopen(id));
      return response.data;
    },
    lock: async (id) => {
      const response = await http.post(endpoints.accounting.periods.lock(id));
      return response.data;
    },
    unlock: async (id) => {
      const response = await http.post(endpoints.accounting.periods.unlock(id));
      return response.data;
    },
    rollForward: async (id, body) => {
      const response = await http.post(endpoints.accounting.periods.rollForward(id), body ?? {});
      return response.data;
    }
  };
}