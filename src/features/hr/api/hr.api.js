import { ensureIdempotencyKey } from '../../../shared/api/idempotency.js';

function qs(params) {
  const clean = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
}

function unwrap(promise) {
  return promise.then((r) => r.data);
}

const idem = () => ({ headers: ensureIdempotencyKey() });

export function makeHrApi(http) {
  const base = '/modules/hr';
  const crud = (path) => ({
    list: (params) => unwrap(http.get(`${base}${path}${qs(params)}`)),
    get: (id) => unwrap(http.get(`${base}${path}/${id}`)),
    create: (payload) => unwrap(http.post(`${base}${path}`, payload, idem())),
    update: (id, payload) => unwrap(http.put(`${base}${path}/${id}`, payload)),
    remove: (id) => unwrap(http.delete(`${base}${path}/${id}`))
  });

  return {
    departments: crud('/departments'),
    grades: crud('/grades'),
    positions: crud('/positions'),
    compensationBands: crud('/compensation-bands'),
    employees: {
      ...crud('/employees'),
      activate: (id) => unwrap(http.post(`${base}/employees/${id}/activate`, {}, idem())),
      deactivate: (id) => unwrap(http.post(`${base}/employees/${id}/deactivate`, {}, idem())),
      terminate: (id) => unwrap(http.post(`${base}/employees/${id}/terminate`, {}, idem())),
      exportCsv: (params) => http.get(`${base}/employees/export${qs(params)}`, { responseType: 'blob' }),
      importJson: (payload) => unwrap(http.post(`${base}/employees/import`, payload, idem())),
      importCsv: (csvText, mode = 'upsert') => unwrap(http.post(`${base}/employees/import/csv${qs({ mode })}`, csvText, {
        ...idem(),
        headers: { ...ensureIdempotencyKey(), 'Content-Type': 'text/csv' }
      }))
    },
    payrollComponents: crud('/payroll/components'),
    employeeComponents: crud('/payroll/employee-components'),
    payrollRuns: {
      ...crud('/payroll/runs'),
      calculate: (id) => unwrap(http.post(`${base}/payroll/runs/${id}/calculate`, {}, idem())),
      submit: (id) => unwrap(http.post(`${base}/payroll/runs/${id}/submit-for-approval`, {}, idem())),
      approve: (id, comment) => unwrap(http.post(`${base}/payroll/runs/${id}/approve`, { comment }, idem())),
      reject: (id, comment) => unwrap(http.post(`${base}/payroll/runs/${id}/reject`, { comment }, idem())),
      buildJournal: (id) => unwrap(http.post(`${base}/payroll/runs/${id}/journal`, {}, idem())),
      postJournal: (id) => unwrap(http.post(`${base}/payroll/runs/${id}/journal/post`, {}, idem())),
      lines: (id) => unwrap(http.get(`${base}/payroll/runs/${id}/lines`))
    },
    leaveTypes: {
      list: (params) => unwrap(http.get(`${base}/leave/types${qs(params)}`)),
      create: (payload) => unwrap(http.post(`${base}/leave/types`, payload, idem())),
      update: (id, payload) => unwrap(http.put(`${base}/leave/types/${id}`, payload)),
      remove: (id) => unwrap(http.delete(`${base}/leave/types/${id}`))
    },
    leaveBalances: {
      list: (params) => unwrap(http.get(`${base}/leave/balances${qs(params)}`)),
      upsert: (payload) => unwrap(http.post(`${base}/leave/balances`, payload, idem()))
    },
    leaveRequests: {
      list: (params) => unwrap(http.get(`${base}/leave/requests${qs(params)}`)),
      get: (id) => unwrap(http.get(`${base}/leave/requests/${id}`)),
      create: (payload) => unwrap(http.post(`${base}/leave/requests`, payload, idem())),
      update: (id, payload) => unwrap(http.put(`${base}/leave/requests/${id}`, payload)),
      remove: (id) => unwrap(http.delete(`${base}/leave/requests/${id}`)),
      submit: (id) => unwrap(http.post(`${base}/leave/requests/${id}/submit`, {}, idem())),
      approve: (id) => unwrap(http.post(`${base}/leave/requests/${id}/approve`, {}, idem())),
      reject: (id, reason) => unwrap(http.post(`${base}/leave/requests/${id}/reject`, { reason }, idem())),
      cancel: (id) => unwrap(http.post(`${base}/leave/requests/${id}/cancel`, {}, idem()))
    },
    benefitPlans: {
      list: (params) => unwrap(http.get(`${base}/benefits/plans${qs(params)}`)),
      create: (payload) => unwrap(http.post(`${base}/benefits/plans`, payload, idem())),
      update: (id, payload) => unwrap(http.put(`${base}/benefits/plans/${id}`, payload)),
      remove: (id) => unwrap(http.delete(`${base}/benefits/plans/${id}`))
    },
    employeeBenefits: {
      list: (params) => unwrap(http.get(`${base}/benefits/employee-benefits${qs(params)}`)),
      create: (payload) => unwrap(http.post(`${base}/benefits/employee-benefits`, payload, idem())),
      update: (id, payload) => unwrap(http.put(`${base}/benefits/employee-benefits/${id}`, payload)),
      remove: (id) => unwrap(http.delete(`${base}/benefits/employee-benefits/${id}`))
    },
    statutoryRules: {
      list: (params) => unwrap(http.get(`${base}/statutory/rules${qs(params)}`)),
      create: (payload) => unwrap(http.post(`${base}/statutory/rules`, payload, idem())),
      update: (id, payload) => unwrap(http.put(`${base}/statutory/rules/${id}`, payload)),
      remove: (id) => unwrap(http.delete(`${base}/statutory/rules/${id}`))
    },
    reports: {
      headcount: (params) => unwrap(http.get(`${base}/reports/headcount${qs(params)}`)),
      leaveBalances: (params) => unwrap(http.get(`${base}/reports/leave-balances${qs(params)}`)),
      payrollCosts: (params) => unwrap(http.get(`${base}/reports/payroll-costs${qs(params)}`))
    }
  };
}
