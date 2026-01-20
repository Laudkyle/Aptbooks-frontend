import { endpoints } from '../../../../shared/api/endpoints.js';

export function makeJournalsApi(http) {
  return {
    list: async (qs) => (await http.get(endpoints.accounting.journals.list(qs))).data,
    create: async (body) => (await http.post(endpoints.accounting.journals.create, body)).data,
    detail: async (id) => (await http.get(endpoints.accounting.journals.detail(id))).data,
    updateHeader: async (id, body) => (await http.patch(endpoints.accounting.journals.update(id), body)).data,
    replaceLines: async (id, lines) => (await http.put(endpoints.accounting.journals.replaceLines(id), { lines })).data,
    addLine: async (id, body) => (await http.post(endpoints.accounting.journals.addLine(id), body)).data,
    updateLine: async (id, lineNo, body) => (await http.patch(endpoints.accounting.journals.updateLine(id, lineNo), body)).data,
    deleteLine: async (id, lineNo) => (await http.delete(endpoints.accounting.journals.deleteLine(id, lineNo))).data,
    submit: async (id) => (await http.post(endpoints.accounting.journals.submit(id))).data,
    approve: async (id) => (await http.post(endpoints.accounting.journals.approve(id))).data,
    reject: async (id, body) => (await http.post(endpoints.accounting.journals.reject(id), body)).data,
    cancel: async (id) => (await http.post(endpoints.accounting.journals.cancel(id))).data,
    post: async (id) => (await http.post(endpoints.accounting.journals.post(id))).data,
    batchPost: async (body) => (await http.post(endpoints.accounting.journals.batchPost, body)).data,
    void: async (id, body) => (await http.post(endpoints.accounting.journals.void(id), body)).data
  };
}
