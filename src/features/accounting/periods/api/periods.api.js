import { endpoints } from '../../../../shared/api/endpoints.js';

export function makePeriodsApi(http) {
  return {
    list: async () => (await http.get(endpoints.accounting.periods.list)).data,
    current: async () => (await http.get(endpoints.accounting.periods.current)).data,
    create: async (body) => (await http.post(endpoints.accounting.periods.create, body)).data,
    closePreview: async (id) => (await http.get(endpoints.accounting.periods.closePreview(id))).data,
    close: async (id, body) => (await http.post(endpoints.accounting.periods.close(id), body ?? {})).data,
    reopen: async (id) => (await http.post(endpoints.accounting.periods.reopen(id))).data,
    lock: async (id) => (await http.post(endpoints.accounting.periods.lock(id))).data,
    unlock: async (id) => (await http.post(endpoints.accounting.periods.unlock(id))).data,
    rollForward: async (id, body) => (await http.post(endpoints.accounting.periods.rollForward(id), body ?? {})).data
  };
}
