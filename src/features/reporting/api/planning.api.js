import { ensureIdempotencyKey } from '../../../shared/api/idempotency';

/**
 * Phase 7 — Reporting & Planning API
 *
 * Notes:
 * - These routes are all mounted under /reporting on the backend.
 * - Many writes require Idempotency-Key;we enforce it where required by the route map.
 */
export function makePlanningApi(http) {
  const base = '/reporting';

  // Helper that accepts idempotencyKey parameter
  const idem = (cfg = {}, idempotencyKey) => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey, ...cfg.headers } : cfg.headers;
    return ensureIdempotencyKey({ ...cfg, headers });
  };

  return {
    // 7.1 Centers
    centers: {
      list: (type, params = {}) => http.get(`${base}/centers/${type}`, { params }),
      usage: (type, id) => http.get(`${base}/centers/${type}/${id}/usage`),
      create: (type, body, options = {}) => http.post(`${base}/centers/${type}`, body, idem(options, options?.idempotencyKey)),
      update: (type, id, body, options = {}) => http.put(`${base}/centers/${type}/${id}`, body, idem(options, options?.idempotencyKey)),
      archive: (type, id, options = {}) => http.delete(`${base}/centers/${type}/${id}`, idem(options, options?.idempotencyKey))
    },

    // 7.2 Projects
    projects: {
      list: (params = {}) => http.get(`${base}/projects`, { params }),
      get: (id) => http.get(`${base}/projects/${id}`),
      create: (body, options = {}) => http.post(`${base}/projects`, body, idem(options, options?.idempotencyKey)),
      update: (id, body, options = {}) => http.put(`${base}/projects/${id}`, body, idem(options, options?.idempotencyKey)),
      archive: (id, options = {}) => http.delete(`${base}/projects/${id}`, idem(options, options?.idempotencyKey)),
      phases: {
        list: (projectId) => http.get(`${base}/projects/${projectId}/phases`),
        create: (projectId, body, options = {}) => http.post(`${base}/projects/${projectId}/phases`, body, idem(options, options?.idempotencyKey)),
        update: (projectId, phaseId, body, options = {}) => http.put(`${base}/projects/${projectId}/phases/${phaseId}`, body, idem(options, options?.idempotencyKey)),
        archive: (projectId, phaseId, options = {}) => http.delete(`${base}/projects/${projectId}/phases/${phaseId}`, idem(options, options?.idempotencyKey)),
        tasks: {
          list: (projectId, phaseId) => http.get(`${base}/projects/${projectId}/phases/${phaseId}/tasks`),
          create: (projectId, phaseId, body, options = {}) => http.post(`${base}/projects/${projectId}/phases/${phaseId}/tasks`, body, idem(options, options?.idempotencyKey)),
          update: (projectId, phaseId, taskId, body, options = {}) => http.put(`${base}/projects/${projectId}/phases/${phaseId}/tasks/${taskId}`, body, idem(options, options?.idempotencyKey)),
          archive: (projectId, phaseId, taskId, options = {}) => http.delete(`${base}/projects/${projectId}/phases/${phaseId}/tasks/${taskId}`, idem(options, options?.idempotencyKey))
        }
      }
    },

// 7.3 Budgets
budgets: {
  list: () => http.get(`${base}/budgets`),
  get: (id) => http.get(`${base}/budgets/${id}`),
  create: (body, options = {}) => http.post(`${base}/budgets`, body, idem(options, options?.idempotencyKey)),
  update: (id, body, options = {}) => http.put(`${base}/budgets/${id}`, body, idem(options, options?.idempotencyKey)),
  
  // New budget status management endpoints
  archive: (id, options = {}) => http.post(`${base}/budgets/${id}/archive`, {}, idem(options, options?.idempotencyKey)),
  activate: (id, options = {}) => http.post(`${base}/budgets/${id}/activate`, {}, idem(options, options?.idempotencyKey)),
  
  versions: {
    create: (budgetId, body, options = {}) => http.post(`${base}/budgets/${budgetId}/versions`, body, idem(options, options?.idempotencyKey)),
    addLines: (budgetId, versionId, body, options = {}) => http.post(`${base}/budgets/${budgetId}/versions/${versionId}/lines`, body, idem(options, options?.idempotencyKey)),
    upsertAmount: (budgetId, versionId, body, options = {}) => http.post(`${base}/budgets/${budgetId}/versions/${versionId}/annual`, body, idem(options, options?.idempotencyKey)),
    importCsv: (budgetId, versionId, csvText, options = {}) => http.post(`${base}/budgets/${budgetId}/versions/${versionId}/lines/import-csv`, csvText, {
      ...idem(options, options?.idempotencyKey),
      headers: { 'Content-Type': 'text/csv', ...(idem(options, options?.idempotencyKey).headers || {}) }
    }),
    distribute: (budgetId, versionId, body, options = {}) => http.post(`${base}/budgets/${budgetId}/versions/${versionId}/distribute`, body, idem(options, options?.idempotencyKey)),
    finalize: (budgetId, versionId, options = {}) => http.post(`${base}/budgets/${budgetId}/versions/${versionId}/finalize`, {}, idem(options, options?.idempotencyKey)),
    submit: (budgetId, versionId, options = {}) => http.post(`${base}/budgets/${budgetId}/versions/${versionId}/submit`, {}, idem(options, options?.idempotencyKey)),
    approve: (budgetId, versionId, options = {}) => http.post(`${base}/budgets/${budgetId}/versions/${versionId}/approve`, {}, idem(options, options?.idempotencyKey)),
    reject: (budgetId, versionId, body, options = {}) => http.post(`${base}/budgets/${budgetId}/versions/${versionId}/reject`, body, idem(options, options?.idempotencyKey)),
    
    // Additional version operations that might be useful
    get: (budgetId, versionId) => http.get(`${base}/budgets/${budgetId}/versions/${versionId}`),
    list: (budgetId) => http.get(`${base}/budgets/${budgetId}/versions`),
    
    // Variance analysis
    variance: (budgetId, versionId, periodId) => 
      http.get(`${base}/budgets/${budgetId}/versions/${versionId}/variance`, { params: { periodId } }),
    
    // Mass operations
    massAdjust: (budgetId, versionId, body, options = {}) => 
      http.post(`${base}/budgets/${budgetId}/versions/${versionId}/lines/mass-adjust`, body, idem(options, options?.idempotencyKey)),
    
    // Copy version
    copy: (budgetId, sourceVersionId, body, options = {}) => 
      http.post(`${base}/budgets/${budgetId}/versions/${sourceVersionId}/copy`, body, idem(options, options?.idempotencyKey))
  },
  
  // Alert rules
  alerts: {
    list: (budgetId) => http.get(`${base}/budgets/${budgetId}/alert-rules`),
    create: (budgetId, body, options = {}) => http.post(`${base}/budgets/${budgetId}/alert-rules`, body, idem(options, options?.idempotencyKey)),
    update: (budgetId, ruleId, body, options = {}) => http.put(`${base}/budgets/${budgetId}/alert-rules/${ruleId}`, body, idem(options, options?.idempotencyKey)),
    delete: (budgetId, ruleId, options = {}) => http.delete(`${base}/budgets/${budgetId}/alert-rules/${ruleId}`, idem(options, options?.idempotencyKey)),
    get: (budgetId, ruleId) => http.get(`${base}/budgets/${budgetId}/alert-rules/${ruleId}`)
  }
},

    // 7.4 Forecasts
    forecasts: {
      list: (params = {}) => http.get(`${base}/forecasts`, { params }),
      create: (body, options = {}) => http.post(`${base}/forecasts`, body, idem(options, options?.idempotencyKey)),
      activate: (id, options = {}) => http.post(`${base}/forecasts/${id}/activate`, {}, idem(options, options?.idempotencyKey)),
      archive: (id, options = {}) => http.post(`${base}/forecasts/${id}/archive`, {}, idem(options, options?.idempotencyKey)),
      versions: {
        create: (forecastId, body, options = {}) => http.post(`${base}/forecasts/${forecastId}/versions`, body, idem(options, options?.idempotencyKey)),
        finalize: (forecastId, versionId, options = {}) => http.post(`${base}/forecasts/${forecastId}/versions/${versionId}/finalize`, {}, idem(options, options?.idempotencyKey)),
        copy: (forecastId, versionId, body, options = {}) => http.post(`${base}/forecasts/${forecastId}/versions/${versionId}/copy`, body, idem(options, options?.idempotencyKey)),
        submit: (forecastId, versionId, options = {}) => http.post(`${base}/forecasts/${forecastId}/versions/${versionId}/submit`, {}, idem(options, options?.idempotencyKey)),
        approve: (forecastId, versionId, options = {}) => http.post(`${base}/forecasts/${forecastId}/versions/${versionId}/approve`, {}, idem(options, options?.idempotencyKey)),
        reject: (forecastId, versionId, body, options = {}) => http.post(`${base}/forecasts/${forecastId}/versions/${versionId}/reject`, body, idem(options, options?.idempotencyKey))
      },
      lines: {
        addToLatestDraft: (forecastId, body, options = {}) => http.post(`${base}/forecasts/${forecastId}/lines`, body, idem(options, options?.idempotencyKey)),
        addToVersion: (forecastId, versionId, body, options = {}) => http.post(`${base}/forecasts/${forecastId}/versions/${versionId}/lines`, body, idem(options, options?.idempotencyKey)),
        importCsvToLatestDraft: (forecastId, csvText, options = {}) => http.post(`${base}/forecasts/${forecastId}/lines/import-csv`, csvText, {
          ...idem(options, options?.idempotencyKey),
          headers: { 'Content-Type': 'text/csv', ...(idem(options, options?.idempotencyKey).headers || {}) }
        }),
        importCsvToVersion: (forecastId, versionId, csvText, options = {}) => http.post(`${base}/forecasts/${forecastId}/versions/${versionId}/lines/import-csv`, csvText, {
          ...idem(options, options?.idempotencyKey),
          headers: { 'Content-Type': 'text/csv', ...(idem(options, options?.idempotencyKey).headers || {}) }
        })
      },
      compare: (forecastId, params) => http.get(`${base}/forecasts/${forecastId}/compare`, { params }),
      vsBudget: (params) => http.get(`${base}/forecasts/vs-budget`, { params }),
      variance: (forecastId, params) => http.get(`${base}/forecasts/${forecastId}/variance`, { params })
    },

    // 7.5 Allocations
    allocations: {
      bases: {
        list: () => http.get(`${base}/allocations/bases`),
        create: (body, options = {}) => http.post(`${base}/allocations/bases`, body, idem(options, options?.idempotencyKey))
      },
      rules: {
        list: () => http.get(`${base}/allocations/rules`),
        create: (body, options = {}) => http.post(`${base}/allocations/rules`, body, idem(options, options?.idempotencyKey))
      },
      preview: (body) => http.post(`${base}/allocations/preview`, body),
      compute: (body, options = {}) => http.post(`${base}/allocations/compute`, body, idem(options, options?.idempotencyKey)),
      post: (id, body, options = {}) => http.post(`${base}/allocations/${id}/post`, body, idem(options, options?.idempotencyKey))
    },

    // 7.6 KPIs
    kpis: {
      definitions: {
        list: (params = {}) => http.get(`${base}/kpis/definitions`, { params }),
        create: (body, options = {}) => http.post(`${base}/kpis/definitions`, body, idem(options, options?.idempotencyKey)),
        update: (id, body, options = {}) => http.put(`${base}/kpis/definitions/${id}`, body, idem(options, options?.idempotencyKey)),
        archive: (id, options = {}) => http.delete(`${base}/kpis/definitions/${id}`, idem(options, options?.idempotencyKey)),
        targets: {
          list: (id, params = {}) => http.get(`${base}/kpis/definitions/${id}/targets`, { params }),
          create: (id, body, options = {}) => http.post(`${base}/kpis/definitions/${id}/targets`, body, idem(options, options?.idempotencyKey))
        }
      },
      values: {
        list: (params = {}) => http.get(`${base}/kpis/values`, { params }),
        compute: (body, options = {}) => http.post(`${base}/kpis/values/compute`, body, idem(options, options?.idempotencyKey)),
        importCsv: (csvText, options = {}) => http.post(`${base}/kpis/values/import-csv`, csvText, {
          ...idem(options, options?.idempotencyKey),
          headers: { 'Content-Type': 'text/csv', ...(idem(options, options?.idempotencyKey).headers || {}) }
        })
      },
      targets: {
        update: (targetId, body, options = {}) => http.put(`${base}/kpis/targets/${targetId}`, body, idem(options, options?.idempotencyKey)),
        archive: (targetId, options = {}) => http.delete(`${base}/kpis/targets/${targetId}`, idem(options, options?.idempotencyKey))
      }
    },

    // 7.7 Dashboards
    dashboards: {
      list: (params = {}) => http.get(`${base}/dashboards`, { params }),
      create: (body) => http.post(`${base}/dashboards`, body),
      update: (dashboardId, body) => http.patch(`${base}/dashboards/${dashboardId}`, body),
      widgets: {
        list: (dashboardId, params = {}) => http.get(`${base}/dashboards/${dashboardId}/widgets`, { params }),
        create: (dashboardId, body) => http.post(`${base}/dashboards/${dashboardId}/widgets`, body),
        update: (widgetId, body) => http.patch(`${base}/dashboards/widgets/${widgetId}`, body)
      }
    },

    // 7.8 Saved Report Builder
    reports: {
      list: (params = {}) => http.get(`${base}/reports`, { params }),
      create: (body) => http.post(`${base}/reports`, body),
      update: (reportId, body) => http.patch(`${base}/reports/${reportId}`, body),
      archive: (reportId) => http.post(`${base}/reports/${reportId}/archive`, {}),
      unarchive: (reportId) => http.post(`${base}/reports/${reportId}/unarchive`, {}),
      versions: {
        list: (reportId) => http.get(`${base}/reports/${reportId}/versions`),
        create: (reportId, body) => http.post(`${base}/reports/${reportId}/versions`, body)
      },
      runs: {
        run: (reportId, body) => http.post(`${base}/reports/${reportId}/run`, body),
        list: (reportId, params = {}) => http.get(`${base}/reports/${reportId}/runs`, { params })
      },
      shares: {
        list: (reportId) => http.get(`${base}/reports/${reportId}/shares`),
        create: (reportId, body) => http.post(`${base}/reports/${reportId}/shares`, body),
        remove: (shareId) => http.delete(`${base}/reports/shares/${shareId}`)
      },
      schedules: {
        list: (reportId) => http.get(`${base}/reports/${reportId}/schedules`),
        create: (reportId, body) => http.post(`${base}/reports/${reportId}/schedules`, body),
        update: (scheduleId, body) => http.patch(`${base}/reports/schedules/${scheduleId}`, body)
      },
      comments: {
        list: (reportId, params = {}) => http.get(`${base}/reports/${reportId}/comments`, { params }),
        create: (reportId, body) => http.post(`${base}/reports/${reportId}/comments`, body)
      }
    },

    // 7.9 Management Reports
    management: {
      departmentalPnl: (params) => http.get(`${base}/management/departmental-pnl`, { params }),
      costCenterSummary: (params) => http.get(`${base}/management/cost-center-summary`, { params })
    }
  };
}