import { ensureIdempotencyKey } from '../../../shared/api/idempotency';

/**
 * Phase 7 — Reporting & Planning API
 *
 * Notes:
 * - These routes are all mounted under /reporting on the backend.
 * - Many writes require Idempotency-Key; we enforce it where required by the route map.
 */
export function makePlanningApi(http) {
  const base = '/reporting';

  // Helpers
  const idem = (cfg = {}) => ensureIdempotencyKey(cfg);

  return {
    // 7.1 Centers
    centers: {
      list: (type, params = {}) => http.get(`${base}/centers/${type}`, { params }),
      usage: (type, id) => http.get(`${base}/centers/${type}/${id}/usage`),
      create: (type, body) => http.post(`${base}/centers/${type}`, body, idem()),
      update: (type, id, body) => http.put(`${base}/centers/${type}/${id}`, body, idem()),
      archive: (type, id) => http.delete(`${base}/centers/${type}/${id}`, idem())
    },

    // 7.2 Projects
    projects: {
      list: (params = {}) => http.get(`${base}/projects`, { params }),
      get: (id) => http.get(`${base}/projects/${id}`),
      create: (body) => http.post(`${base}/projects`, body, idem()),
      update: (id, body) => http.put(`${base}/projects/${id}`, body, idem()),
      archive: (id) => http.delete(`${base}/projects/${id}`, idem()),
      phases: {
        list: (projectId) => http.get(`${base}/projects/${projectId}/phases`),
        create: (projectId, body) => http.post(`${base}/projects/${projectId}/phases`, body, idem()),
        update: (projectId, phaseId, body) => http.put(`${base}/projects/${projectId}/phases/${phaseId}`, body, idem()),
        archive: (projectId, phaseId) => http.delete(`${base}/projects/${projectId}/phases/${phaseId}`, idem()),
        tasks: {
          list: (projectId, phaseId) => http.get(`${base}/projects/${projectId}/phases/${phaseId}/tasks`),
          create: (projectId, phaseId, body) => http.post(`${base}/projects/${projectId}/phases/${phaseId}/tasks`, body, idem()),
          update: (projectId, phaseId, taskId, body) => http.put(`${base}/projects/${projectId}/phases/${phaseId}/tasks/${taskId}`, body, idem()),
          archive: (projectId, phaseId, taskId) => http.delete(`${base}/projects/${projectId}/phases/${phaseId}/tasks/${taskId}`, idem())
        }
      }
    },

    // 7.3 Budgets
    budgets: {
      list: () => http.get(`${base}/budgets`),
      get: (id) => http.get(`${base}/budgets/${id}`),
      create: (body) => http.post(`${base}/budgets`, body, idem()),
      update: (id, body) => http.put(`${base}/budgets/${id}`, body, idem()),
      versions: {
        create: (budgetId, body) => http.post(`${base}/budgets/${budgetId}/versions`, body, idem()),
        addLines: (budgetId, versionId, body) => http.post(`${base}/budgets/${budgetId}/versions/${versionId}/lines`, body, idem()),
        importCsv: (budgetId, versionId, csvText) => http.post(`${base}/budgets/${budgetId}/versions/${versionId}/lines/import-csv`, csvText, {
          ...idem(),
          headers: { 'Content-Type': 'text/csv', ...(idem().headers || {}) }
        }),
        distribute: (budgetId, versionId, body) => http.post(`${base}/budgets/${budgetId}/versions/${versionId}/distribute`, body, idem()),
        finalize: (budgetId, versionId) => http.post(`${base}/budgets/${budgetId}/versions/${versionId}/finalize`, {}, idem()),
        submit: (budgetId, versionId) => http.post(`${base}/budgets/${budgetId}/versions/${versionId}/submit`, {}, idem()),
        approve: (budgetId, versionId) => http.post(`${base}/budgets/${budgetId}/versions/${versionId}/approve`, {}, idem()),
        reject: (budgetId, versionId, body) => http.post(`${base}/budgets/${budgetId}/versions/${versionId}/reject`, body, idem())
      }
    },

    // 7.4 Forecasts
    forecasts: {
      list: (params = {}) => http.get(`${base}/forecasts`, { params }),
      create: (body) => http.post(`${base}/forecasts`, body, idem()),
      activate: (id) => http.post(`${base}/forecasts/${id}/activate`, {}, idem()),
      archive: (id) => http.post(`${base}/forecasts/${id}/archive`, {}, idem()),
      versions: {
        create: (forecastId, body) => http.post(`${base}/forecasts/${forecastId}/versions`, body, idem()),
        finalize: (forecastId, versionId) => http.post(`${base}/forecasts/${forecastId}/versions/${versionId}/finalize`, {}, idem()),
        copy: (forecastId, versionId, body) => http.post(`${base}/forecasts/${forecastId}/versions/${versionId}/copy`, body, idem()),
        submit: (forecastId, versionId) => http.post(`${base}/forecasts/${forecastId}/versions/${versionId}/submit`, {}, idem()),
        approve: (forecastId, versionId) => http.post(`${base}/forecasts/${forecastId}/versions/${versionId}/approve`, {}, idem()),
        reject: (forecastId, versionId, body) => http.post(`${base}/forecasts/${forecastId}/versions/${versionId}/reject`, body, idem())
      },
      lines: {
        addToLatestDraft: (forecastId, body) => http.post(`${base}/forecasts/${forecastId}/lines`, body, idem()),
        addToVersion: (forecastId, versionId, body) => http.post(`${base}/forecasts/${forecastId}/versions/${versionId}/lines`, body, idem()),
        importCsvToLatestDraft: (forecastId, csvText) => http.post(`${base}/forecasts/${forecastId}/lines/import-csv`, csvText, {
          ...idem(),
          headers: { 'Content-Type': 'text/csv', ...(idem().headers || {}) }
        }),
        importCsvToVersion: (forecastId, versionId, csvText) => http.post(`${base}/forecasts/${forecastId}/versions/${versionId}/lines/import-csv`, csvText, {
          ...idem(),
          headers: { 'Content-Type': 'text/csv', ...(idem().headers || {}) }
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
        create: (body) => http.post(`${base}/allocations/bases`, body, idem())
      },
      rules: {
        list: () => http.get(`${base}/allocations/rules`),
        create: (body) => http.post(`${base}/allocations/rules`, body, idem())
      },
      preview: (body) => http.post(`${base}/allocations/preview`, body),
      compute: (body) => http.post(`${base}/allocations/compute`, body, idem()),
      post: (id, body) => http.post(`${base}/allocations/${id}/post`, body, idem())
    },

    // 7.6 KPIs
    kpis: {
      definitions: {
        list: (params = {}) => http.get(`${base}/kpis/definitions`, { params }),
        create: (body) => http.post(`${base}/kpis/definitions`, body, idem()),
        update: (id, body) => http.put(`${base}/kpis/definitions/${id}`, body, idem()),
        archive: (id) => http.delete(`${base}/kpis/definitions/${id}`, idem()),
        targets: {
          list: (id, params = {}) => http.get(`${base}/kpis/definitions/${id}/targets`, { params }),
          create: (id, body) => http.post(`${base}/kpis/definitions/${id}/targets`, body, idem())
        }
      },
      values: {
        list: (params = {}) => http.get(`${base}/kpis/values`, { params }),
        compute: (body) => http.post(`${base}/kpis/values/compute`, body, idem()),
        importCsv: (csvText) => http.post(`${base}/kpis/values/import-csv`, csvText, {
          ...idem(),
          headers: { 'Content-Type': 'text/csv', ...(idem().headers || {}) }
        })
      },
      targets: {
        update: (targetId, body) => http.put(`${base}/kpis/targets/${targetId}`, body, idem()),
        archive: (targetId) => http.delete(`${base}/kpis/targets/${targetId}`, idem())
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
