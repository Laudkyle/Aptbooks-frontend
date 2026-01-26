import { ensureIdempotencyKey } from '../../../shared/api/idempotency.js';

function qs(params) {
  const sp = new URLSearchParams(params ?? {});
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// Banking (backend-exact routes under backend src/modules/banking)
export function makeBankingApi(http) {
  return {
    listCurrencies() {
      return http.get('/core/reference/currencies').then((r) => r.data);
    },

    // Bank accounts
    listAccounts() {
      return http.get('/modules/banking/accounts').then((r) => r.data);
    },
    createAccount(payload) {
      return http.post('/modules/banking/accounts', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },

    // Statements
    listStatements() {
      return http.get('/modules/banking/statements').then((r) => r.data);
    },
    createStatement(payload) {
      return http.post('/modules/banking/statements', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    listStatementLines(statementId, params) {
      return http.get(`/modules/banking/statements/${statementId}/lines${qs(params)}`).then((r) => r.data);
    },
    addStatementLines(statementId, payload) {
      return http
        .post(`/modules/banking/statements/${statementId}/lines`, payload, { headers: ensureIdempotencyKey() })
        .then((r) => r.data);
    },
    importStatementLinesCsv(statementId, csvText) {
      return http
        .post(`/modules/banking/statements/${statementId}/lines/import-csv`, csvText, {
          headers: { ...ensureIdempotencyKey(), 'Content-Type': 'text/csv' }
        })
        .then((r) => r.data);
    },
    matchStatementLine(lineId, payload) {
      return http
        .post(`/modules/banking/statements/lines/${lineId}/match`, payload, { headers: ensureIdempotencyKey() })
        .then((r) => r.data);
    },

    // Cashbook
    listCashbook(params) {
      return http.get(`/modules/banking/cashbook${qs(params)}`).then((r) => r.data);
    },

    // Matching rules + suggestions
    listRules() {
      return http.get('/modules/banking/matching/rules').then((r) => r.data);
    },
    createRule(payload) {
      return http.post('/modules/banking/matching/rules', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    updateRule(id, payload) {
      return http.put(`/modules/banking/matching/rules/${id}`, payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    suggestMatches(lineId, params) {
      return http.get(`/modules/banking/matching/lines/${lineId}/suggestions${qs(params)}`).then((r) => r.data);
    },

    // Reconciliations
    listReconciliations(params) {
      return http.get(`/modules/banking/reconciliations${qs(params)}`).then((r) => r.data);
    },
    getReconciliation(id) {
      return http.get(`/modules/banking/reconciliations/${id}`).then((r) => r.data);
    },
    runReconciliation(payload) {
      return http.post('/modules/banking/reconciliations', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    closeReconciliation(id, payload) {
      return http
        .post(`/modules/banking/reconciliations/${id}/close`, payload ?? {}, { headers: ensureIdempotencyKey() })
        .then((r) => r.data);
    },
    unlockReconciliation(id) {
      return http
        .post(`/modules/banking/reconciliations/${id}/unlock`, {}, { headers: ensureIdempotencyKey() })
        .then((r) => r.data);
    },
    diffReconciliation(id) {
      return http.get(`/modules/banking/reconciliations/${id}/diff`).then((r) => r.data);
    },

    // Reporting (banking)
    statementStatus(qsParams) {
      return http.get(`/reporting/banking/statement-status${qs(qsParams)}`).then((r) => r.data);
    }
  };
}
