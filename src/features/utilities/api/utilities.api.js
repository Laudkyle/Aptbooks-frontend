import { endpoints } from '../../../shared/api/endpoints.js'; 
import { ensureIdempotencyKey } from '../../../shared/api/idempotency.js'; 

export function makeUtilitiesApi(http) {
  return {
    healthz: async () => (await http.get(endpoints.health.healthz)).data,
    readyz: async () => (await http.get(endpoints.health.readyz)).data,
    systemHealth: async () => (await http.get(endpoints.health.system)).data,

    scheduledTasks: async () => (await http.get(endpoints.utilities.scheduledTasks)).data,
    scheduledToggle: async (code, status) => (await http.post(endpoints.utilities.scheduledTaskToggle(code, status))).data,
    scheduledRuns: async (code, qs) => (await http.get(endpoints.utilities.scheduledTaskRuns(code, qs))).data,
    scheduledRunNow: async (code) => (await http.post(endpoints.utilities.scheduledTaskRunNow(code))).data,
    scheduledRunDetail: async (code, runId) => (await http.get(endpoints.utilities.scheduledTaskRunDetail(code, runId))).data,

    errorsList: async (qs) => (await http.get(endpoints.utilities.errors(qs))).data,
    errorsStats: async (qs) => (await http.get(endpoints.utilities.errorStats(qs))).data,
    errorsCorrelation: async (correlationId) => (await http.get(endpoints.utilities.errorCorrelation(correlationId))).data,

    clientLogsIngest: async (payload, headers = {}) => {
      const res = await http.post(endpoints.utilities.clientLogsIngest, payload, {
        headers: ensureIdempotencyKey(headers)
      }); 
      return res.data; 
    },
    clientLogsQuery: async (qs) => (await http.get(endpoints.utilities.clientLogs(qs))).data,

    i18nLocales: async () => (await http.get(endpoints.utilities.i18nLocales)).data,
    i18nMessages: async (locale) => (await http.get(endpoints.utilities.i18nMessages(locale))).data,

    a11yStatus: async () => (await http.get(endpoints.utilities.a11yStatus)).data,
    releaseInfo: async () => (await http.get(endpoints.utilities.releaseInfo)).data,

    testsList: async () => (await http.get(endpoints.utilities.testsList)).data,
    testsRun: async (body, headers = {}) => {
      const res = await http.post(endpoints.utilities.testsRun, body, {
        headers: ensureIdempotencyKey(headers)
      }); 
      return res.data; 
    }
  }; 
}
