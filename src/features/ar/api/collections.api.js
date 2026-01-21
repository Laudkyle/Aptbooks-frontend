import { endpoints } from '../../../shared/api/endpoints.js';

export function makeCollectionsApi(http) {
  return {
    queue: async (qs) => (await http.get(endpoints.modules.ar.collections.queue(qs))).data,
    queuePartner: async (partnerId, qs) =>
      (await http.get(endpoints.modules.ar.collections.queuePartner(partnerId, qs))).data,

    listCases: async (qs) => (await http.get(endpoints.modules.ar.collections.cases(qs))).data,
    createCase: async (body) => (await http.post(endpoints.modules.ar.collections.cases(), body)).data,
    updateCase: async (id, body) => (await http.patch(endpoints.modules.ar.collections.case(id), body)).data,
    addCaseAction: async (id, body) => (await http.post(endpoints.modules.ar.collections.caseActions(id), body)).data,

    listDunningTemplates: async () => (await http.get(endpoints.modules.ar.collections.dunningTemplates)).data,
    createDunningTemplate: async (body) => (await http.post(endpoints.modules.ar.collections.dunningTemplates, body)).data,
    updateDunningTemplate: async (id, body) => (await http.patch(endpoints.modules.ar.collections.dunningTemplate(id), body)).data,
    deleteDunningTemplate: async (id) => (await http.delete(endpoints.modules.ar.collections.dunningTemplate(id))).data,

    listDunningRules: async () => (await http.get(endpoints.modules.ar.collections.dunningRules)).data,
    createDunningRule: async (body) => (await http.post(endpoints.modules.ar.collections.dunningRules, body)).data,
    updateDunningRule: async (id, body) => (await http.patch(endpoints.modules.ar.collections.dunningRule(id), body)).data,
    deleteDunningRule: async (id) => (await http.delete(endpoints.modules.ar.collections.dunningRule(id))).data,

    listDunningRuns: async () => (await http.get(endpoints.modules.ar.collections.dunningRuns)).data,
    getDunningRun: async (id) => (await http.get(endpoints.modules.ar.collections.dunningRun(id))).data,
    runDunning: async (body) => (await http.post(endpoints.modules.ar.collections.dunningRuns, body)).data
  };
}
