import { ensureIdempotencyKey } from '../../../shared/api/idempotency.js';

function qs(params) {
  const sp = new URLSearchParams(params ?? {});
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function makeAutomationApi(http) {
  return {
    listRecurringTransactions(params) {
      return http.get(`/modules/automation/recurring-transactions${qs(params)}`).then((r) => r.data);
    },
    createRecurringTransaction(payload) {
      return http.post('/modules/automation/recurring-transactions', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    runRecurringTransaction(id, payload) {
      return http.post(`/modules/automation/recurring-transactions/${id}/run`, payload ?? {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    toggleRecurringTransaction(id, payload) {
      return http.post(`/modules/automation/recurring-transactions/${id}/toggle`, payload ?? {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },

    listAccountingJobs(params) {
      return http.get(`/modules/automation/accounting-jobs${qs(params)}`).then((r) => r.data);
    },
    runAccountingJob(code, payload) {
      return http.post(`/modules/automation/accounting-jobs/${encodeURIComponent(code)}/run`, payload ?? {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    listAccountingJobRuns(params) {
      return http.get(`/modules/automation/accounting-jobs/runs${qs(params)}`).then((r) => r.data);
    },

    listAutoReconciliationProfiles(params) {
      return http.get(`/modules/automation/auto-reconciliation/profiles${qs(params)}`).then((r) => r.data);
    },
    createAutoReconciliationProfile(payload) {
      return http.post('/modules/automation/auto-reconciliation/profiles', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    listAutoReconciliationRuns(params) {
      return http.get(`/modules/automation/auto-reconciliation/runs${qs(params)}`).then((r) => r.data);
    },
    runAutoReconciliation(payload) {
      return http.post('/modules/automation/auto-reconciliation/runs', payload ?? {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },

    listDocumentMatches(params) {
      return http.get(`/modules/automation/document-matching/matches${qs(params)}`).then((r) => r.data);
    },
    runDocumentMatching(payload) {
      return http.post('/modules/automation/document-matching/runs', payload ?? {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },

    listClassificationRules(params) {
      return http.get(`/modules/automation/ai-classification/rules${qs(params)}`).then((r) => r.data);
    },
    createClassificationRule(payload) {
      return http.post('/modules/automation/ai-classification/rules', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    classifyPreview(payload) {
      return http.post('/modules/automation/ai-classification/classify', payload ?? {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },

    listSmartNotificationRules(params) {
      return http.get(`/modules/automation/smart-notifications/rules${qs(params)}`).then((r) => r.data);
    },
    createSmartNotificationRule(payload) {
      return http.post('/modules/automation/smart-notifications/rules', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    runSmartNotifications(payload) {
      return http.post('/modules/automation/smart-notifications/run', payload ?? {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    listSmartNotificationEvents(params) {
      return http.get(`/modules/automation/smart-notifications/events${qs(params)}`).then((r) => r.data);
    }
  };
}
