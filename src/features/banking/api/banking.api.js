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


    // Treasury — Phase 3
    listPaymentRuns(params) {
      return http.get(`/modules/banking/treasury/payment-runs${qs(params)}`).then((r) => r.data);
    },
    getPaymentRun(id) {
      return http.get(`/modules/banking/treasury/payment-runs/${id}`).then((r) => r.data);
    },
    createPaymentRun(payload) {
      return http.post('/modules/banking/treasury/payment-runs', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    addPaymentRunLines(id, payload) {
      return http.post(`/modules/banking/treasury/payment-runs/${id}/lines`, payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    submitPaymentRun(id) {
      return http.post(`/modules/banking/treasury/payment-runs/${id}/submit`, {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    approvePaymentRun(id) {
      return http.post(`/modules/banking/treasury/payment-runs/${id}/approve`, {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    executePaymentRun(id) {
      return http.post(`/modules/banking/treasury/payment-runs/${id}/execute`, {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    cancelPaymentRun(id, payload) {
      return http.post(`/modules/banking/treasury/payment-runs/${id}/cancel`, payload ?? {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },

    listBankTransfers(params) {
      return http.get(`/modules/banking/treasury/bank-transfers${qs(params)}`).then((r) => r.data);
    },
    getBankTransfer(id) {
      return http.get(`/modules/banking/treasury/bank-transfers/${id}`).then((r) => r.data);
    },
    createBankTransfer(payload) {
      return http.post('/modules/banking/treasury/bank-transfers', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    submitBankTransfer(id) {
      return http.post(`/modules/banking/treasury/bank-transfers/${id}/submit`, {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    approveBankTransfer(id) {
      return http.post(`/modules/banking/treasury/bank-transfers/${id}/approve`, {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    postBankTransfer(id) {
      return http.post(`/modules/banking/treasury/bank-transfers/${id}/post`, {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    cancelBankTransfer(id, payload) {
      return http.post(`/modules/banking/treasury/bank-transfers/${id}/cancel`, payload ?? {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },

    listApprovalBatches() {
      return http.get('/modules/banking/treasury/approval-batches').then((r) => r.data);
    },
    getApprovalBatch(id) {
      return http.get(`/modules/banking/treasury/approval-batches/${id}`).then((r) => r.data);
    },
    createApprovalBatch(payload) {
      return http.post('/modules/banking/treasury/approval-batches', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    addApprovalBatchItems(id, payload) {
      return http.post(`/modules/banking/treasury/approval-batches/${id}/items`, payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    submitApprovalBatch(id) {
      return http.post(`/modules/banking/treasury/approval-batches/${id}/submit`, {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    approveApprovalBatch(id) {
      return http.post(`/modules/banking/treasury/approval-batches/${id}/approve`, {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    cancelApprovalBatch(id, payload) {
      return http.post(`/modules/banking/treasury/approval-batches/${id}/cancel`, payload ?? {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },

    listCheques(params) {
      return http.get(`/modules/banking/treasury/cheques${qs(params)}`).then((r) => r.data);
    },
    getCheque(id) {
      return http.get(`/modules/banking/treasury/cheques/${id}`).then((r) => r.data);
    },
    createCheque(payload) {
      return http.post('/modules/banking/treasury/cheques', payload, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    issueCheque(id, payload) {
      return http.post(`/modules/banking/treasury/cheques/${id}/issue`, payload ?? {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    clearCheque(id, payload) {
      return http.post(`/modules/banking/treasury/cheques/${id}/clear`, payload ?? {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    voidCheque(id, payload) {
      return http.post(`/modules/banking/treasury/cheques/${id}/void`, payload ?? {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },
    bounceCheque(id, payload) {
      return http.post(`/modules/banking/treasury/cheques/${id}/bounce`, payload ?? {}, { headers: ensureIdempotencyKey() }).then((r) => r.data);
    },

    getCashForecast(params) {
      return http.get(`/modules/banking/treasury/cash-forecast${qs(params)}`).then((r) => r.data);
    },
    listCashForecastSnapshots() {
      return http.get('/modules/banking/treasury/cash-forecast/snapshots').then((r) => r.data);
    },

    getTreasuryDashboard() {
      return http.get('/modules/banking/treasury/dashboard').then((r) => r.data);
    },

    // Reporting (banking)
    statementStatus(qsParams) {
      return http.get(`/reporting/banking/statement-status${qs(qsParams)}`).then((r) => r.data);
    }
  };
}
