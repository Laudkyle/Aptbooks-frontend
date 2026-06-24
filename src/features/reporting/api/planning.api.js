import { ensureIdempotencyKey } from "../../../shared/api/idempotency";

/**
 * Phase 7 — Reporting & Planning API
 *
 * Notes:
 * - These routes are all mounted under /reporting on the backend.
 * - Many writes require Idempotency-Key;we enforce it where required by the route map.
 */
export function makePlanningApi(http) {
  const base = "/reporting";
  const unwrap = (request) => request.then((res) => res.data);
  const get = (...args) => unwrap(http.get(...args));
  const post = (...args) => unwrap(http.post(...args));
  const put = (...args) => unwrap(http.put(...args));
  const patch = (...args) => unwrap(http.patch(...args));
  const del = (...args) => unwrap(http.delete(...args));

  // Helper that accepts idempotencyKey parameter
  const idem = (cfg = {}, idempotencyKey) => {
    const headers = idempotencyKey
      ? { "Idempotency-Key": idempotencyKey, ...cfg.headers }
      : cfg.headers;
    return ensureIdempotencyKey({ ...cfg, headers });
  };

  return {
    // 7.1 Centers
    centers: {
      // Existing methods
      list: (type, params = {}) =>
        get(`${base}/centers/${type}`, { params }),
      usage: (type, id) => get(`${base}/centers/${type}/${id}/usage`),
      create: (type, body, options = {}) =>
        post(
          `${base}/centers/${type}`,
          body,
          idem(options, options?.idempotencyKey),
        ),
      update: (type, id, body, options = {}) =>
        put(
          `${base}/centers/${type}/${id}`,
          body,
          idem(options, options?.idempotencyKey),
        ),
      archive: (type, id, options = {}) =>
        del(
          `${base}/centers/${type}/${id}`,
          idem(options, options?.idempotencyKey),
        ),

      // New methods for cross-type operations
      /**
       * Get all centers across all types (cost, profit, investment)
       * @param {Object} params - Query parameters
       * @param {string} [params.status] - Filter by status (active, inactive, archived)
       * @param {boolean} [params.includeArchived] - Whether to include archived centers
       * @param {boolean} [params.grouped] - If true, returns centers grouped by type
       * @returns {Promise<Array|Object>} Flat array or grouped object of centers
       */
      getAll: (params = {}) => get(`${base}/centers/all`, { params }),

      /**
       * Get all centers grouped by type
       * @param {Object} params - Query parameters
       * @param {string} [params.status] - Filter by status
       * @param {boolean} [params.includeArchived] - Whether to include archived centers
       * @returns {Promise<Object>} Centers grouped by type: { cost: [], profit: [], investment: [] }
       */
      getAllGrouped: (params = {}) =>
        get(`${base}/centers/all`, {
          params: { ...params, grouped: true },
        }),

      /**
       * Get a center by ID across all types (auto-detects type)
       * @param {string} id - Center UUID
       * @returns {Promise<Object>} Center object with centerType field
       */
      getById: (id) => get(`${base}/centers/by-id/${id}`),

      /**
       * Get usage for a center by ID (auto-detects type)
       * @param {string} id - Center UUID
       * @returns {Promise<Object>} Usage information
       */
      getUsageById: (id) => get(`${base}/centers/by-id/${id}/usage`),

      /**
       * Batch get multiple centers by their IDs
       * @param {string[]} ids - Array of center UUIDs
       * @returns {Promise<Array>} Array of center objects
       */
      getBatch: async (ids) => {
        if (!ids || ids.length === 0) return [];
        // Fetch centers one by one (could be optimized with a batch endpoint if needed)
        const promises = ids.map((id) =>
          get(`${base}/centers/by-id/${id}`).catch(() => null),
        );
        const results = await Promise.all(promises);
        return results.filter(Boolean);
      },

      /**
       * Search centers across all types
       * @param {string} query - Search term
       * @param {Object} options - Search options
       * @param {string} [options.status] - Filter by status
       * @param {boolean} [options.includeArchived] - Include archived centers
       * @returns {Promise<Array>} Matching centers
       */
      search: async (query, options = {}) => {
        const centers = await get(`${base}/centers/all`, {
          params: {
            status: options.status,
            includeArchived: options.includeArchived,
          },
        });

        // Client-side search filtering
        const searchTerm = query.toLowerCase();
        return centers.filter(
          (center) =>
            center.name?.toLowerCase().includes(searchTerm) ||
            center.code?.toLowerCase().includes(searchTerm),
        );
      },

      /**
       * Get centers suitable for use as parents in a hierarchy
       * @param {string} type - Center type (cost, profit, investment)
       * @param {string} [currentCenterId] - Current center ID to exclude from results
       * @returns {Promise<Array>} Centers that can be parents
       */
      getParentCandidates: async (type, currentCenterId = null) => {
        const centers = await get(`${base}/centers/${type}`, {
          params: { status: "active" }, // Only active centers can be parents
        });

        // Filter out archived and the current center
        return centers.filter(
          (center) =>
            center.status !== "archived" &&
            (!currentCenterId || center.id !== currentCenterId),
        );
      },

      /**
       * Get all parent candidates across all types
       * Useful for cross-type hierarchies (if supported)
       * @param {string} [currentCenterId] - Current center ID to exclude
       * @returns {Promise<Array>} All active centers that can be parents
       */
      getAllParentCandidates: async (currentCenterId = null) => {
        const centers = await get(`${base}/centers/all`, {
          params: { status: "active" },
        });

        // Filter out the current center
        return centers.filter(
          (center) => !currentCenterId || center.id !== currentCenterId,
        );
      },
    },
    // 7.2 Projects
    projects: {
      list: (params = {}) => get(`${base}/projects`, { params }),
      get: (id) => get(`${base}/projects/${id}`),
      create: (body, options = {}) =>
        post(
          `${base}/projects`,
          body,
          idem(options, options?.idempotencyKey),
        ),
      update: (id, body, options = {}) =>
        put(
          `${base}/projects/${id}`,
          body,
          idem(options, options?.idempotencyKey),
        ),
      archive: (id, options = {}) =>
        del(
          `${base}/projects/${id}`,
          idem(options, options?.idempotencyKey),
        ),
      phases: {
        list: (projectId) => get(`${base}/projects/${projectId}/phases`),
        create: (projectId, body, options = {}) =>
          post(
            `${base}/projects/${projectId}/phases`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        update: (projectId, phaseId, body, options = {}) =>
          put(
            `${base}/projects/${projectId}/phases/${phaseId}`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        archive: (projectId, phaseId, options = {}) =>
          del(
            `${base}/projects/${projectId}/phases/${phaseId}`,
            idem(options, options?.idempotencyKey),
          ),
        tasks: {
          list: (projectId, phaseId) =>
            get(`${base}/projects/${projectId}/phases/${phaseId}/tasks`),
          create: (projectId, phaseId, body, options = {}) =>
            post(
              `${base}/projects/${projectId}/phases/${phaseId}/tasks`,
              body,
              idem(options, options?.idempotencyKey),
            ),
          update: (projectId, phaseId, taskId, body, options = {}) =>
            put(
              `${base}/projects/${projectId}/phases/${phaseId}/tasks/${taskId}`,
              body,
              idem(options, options?.idempotencyKey),
            ),
          archive: (projectId, phaseId, taskId, options = {}) =>
            del(
              `${base}/projects/${projectId}/phases/${phaseId}/tasks/${taskId}`,
              idem(options, options?.idempotencyKey),
            ),
        },
      },
    },

    // 7.3 Budgets
    budgets: {
      list: () => get(`${base}/budgets`),
      get: (id) => get(`${base}/budgets/${id}`),
      create: (body, options = {}) =>
        post(
          `${base}/budgets`,
          body,
          idem(options, options?.idempotencyKey),
        ),
      update: (id, body, options = {}) =>
        put(
          `${base}/budgets/${id}`,
          body,
          idem(options, options?.idempotencyKey),
        ),

      // New budget status management endpoints
      archive: (id, options = {}) =>
        post(
          `${base}/budgets/${id}/archive`,
          {},
          idem(options, options?.idempotencyKey),
        ),
      activate: (id, options = {}) =>
        post(
          `${base}/budgets/${id}/activate`,
          {},
          idem(options, options?.idempotencyKey),
        ),

      versions: {
        create: (budgetId, body, options = {}) =>
          post(
            `${base}/budgets/${budgetId}/versions`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        addLines: (budgetId, versionId, body, options = {}) =>
          post(
            `${base}/budgets/${budgetId}/versions/${versionId}/lines`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        upsertAmount: (budgetId, versionId, body, options = {}) =>
          post(
            `${base}/budgets/${budgetId}/versions/${versionId}/annual`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        importCsv: (budgetId, versionId, csvText, options = {}) =>
          post(
            `${base}/budgets/${budgetId}/versions/${versionId}/lines/import-csv`,
            csvText,
            {
              ...idem(options, options?.idempotencyKey),
              headers: {
                "Content-Type": "text/csv",
                ...(idem(options, options?.idempotencyKey).headers || {}),
              },
            },
          ),
        distribute: (budgetId, versionId, body, options = {}) =>
          post(
            `${base}/budgets/${budgetId}/versions/${versionId}/distribute`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        finalize: (budgetId, versionId, options = {}) =>
          post(
            `${base}/budgets/${budgetId}/versions/${versionId}/finalize`,
            {},
            idem(options, options?.idempotencyKey),
          ),
        submit: (budgetId, versionId, options = {}) =>
          post(
            `${base}/budgets/${budgetId}/versions/${versionId}/submit`,
            {},
            idem(options, options?.idempotencyKey),
          ),
        approve: (budgetId, versionId, options = {}) =>
          post(
            `${base}/budgets/${budgetId}/versions/${versionId}/approve`,
            {},
            idem(options, options?.idempotencyKey),
          ),
        reject: (budgetId, versionId, body, options = {}) =>
          post(
            `${base}/budgets/${budgetId}/versions/${versionId}/reject`,
            body,
            idem(options, options?.idempotencyKey),
          ),

        // Additional version operations that might be useful
        get: (budgetId, versionId) =>
          get(`${base}/budgets/${budgetId}/versions/${versionId}`),
        list: (budgetId) => get(`${base}/budgets/${budgetId}/versions`),

        // Variance analysis
        variance: (budgetId, versionId, periodId) =>
          get(
            `${base}/budgets/${budgetId}/versions/${versionId}/variance`,
            { params: { periodId } },
          ),

        // Mass operations
        massAdjust: (budgetId, versionId, body, options = {}) =>
          post(
            `${base}/budgets/${budgetId}/versions/${versionId}/lines/mass-adjust`,
            body,
            idem(options, options?.idempotencyKey),
          ),

        // Copy version
        copy: (budgetId, sourceVersionId, body, options = {}) =>
          post(
            `${base}/budgets/${budgetId}/versions/${sourceVersionId}/copy`,
            body,
            idem(options, options?.idempotencyKey),
          ),
      },

      // Alert rules
      alerts: {
        list: (budgetId) => get(`${base}/budgets/${budgetId}/alert-rules`),
        create: (budgetId, body, options = {}) =>
          post(
            `${base}/budgets/${budgetId}/alert-rules`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        update: (budgetId, ruleId, body, options = {}) =>
          put(
            `${base}/budgets/${budgetId}/alert-rules/${ruleId}`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        delete: (budgetId, ruleId, options = {}) =>
          del(
            `${base}/budgets/${budgetId}/alert-rules/${ruleId}`,
            idem(options, options?.idempotencyKey),
          ),
        get: (budgetId, ruleId) =>
          get(`${base}/budgets/${budgetId}/alert-rules/${ruleId}`),
      },
    },
    // 7.4 Forecasts
    forecasts: {
      // ============================
      // Scenario Management
      // ============================
      scenarios: {
        // List all scenarios
        list: (params = {}) =>
          get(`${base}/forecasts/scenarios`, { params }),

        // Get scenarios with usage statistics
        getStats: () => get(`${base}/forecasts/scenarios/stats`),

        // Get a specific scenario by ID
        get: (scenarioId) =>
          get(`${base}/forecasts/scenarios/${scenarioId}`),

        // Get a scenario by code
        getByCode: (code) =>
          get(`${base}/forecasts/scenarios/code/${code}`),

        // Create a new scenario
        create: (body, options = {}) =>
          post(
            `${base}/forecasts/scenarios`,
            body,
            idem(options, options?.idempotencyKey),
          ),

        // Update a scenario (PUT)
        update: (scenarioId, body, options = {}) =>
          put(
            `${base}/forecasts/scenarios/${scenarioId}`,
            body,
            idem(options, options?.idempotencyKey),
          ),

        // Partially update a scenario (PATCH)
        patch: (scenarioId, body, options = {}) =>
          patch(
            `${base}/forecasts/scenarios/${scenarioId}`,
            body,
            idem(options, options?.idempotencyKey),
          ),

        // Delete a scenario (soft delete by default, hard delete with force=true)
        delete: (scenarioId, params = {}) =>
          del(`${base}/forecasts/scenarios/${scenarioId}`, { params }),

        // Set a scenario as default
        setDefault: (scenarioId, options = {}) =>
          post(
            `${base}/forecasts/scenarios/${scenarioId}/set-default`,
            {},
            idem(options, options?.idempotencyKey),
          ),

        // Restore a soft-deleted scenario
        restore: (scenarioId, options = {}) =>
          post(
            `${base}/forecasts/scenarios/${scenarioId}/restore`,
            {},
            idem(options, options?.idempotencyKey),
          ),
      },

      // ============================
      // Existing Forecast Endpoints
      // ============================

      // List forecasts
      list: (params = {}) => get(`${base}/forecasts`, { params }),

      // GET single forecast by ID
      get: (id, params = {}) => get(`${base}/forecasts/${id}`, { params }),

      // Update forecast (PUT)
      update: (id, body, options = {}) =>
        put(
          `${base}/forecasts/${id}`,
          body,
          idem(options, options?.idempotencyKey),
        ),

      // Partially update forecast (PATCH)
      patch: (id, body, options = {}) =>
        patch(
          `${base}/forecasts/${id}`,
          body,
          idem(options, options?.idempotencyKey),
        ),

      // Create forecast
      create: (body, options = {}) =>
        post(
          `${base}/forecasts`,
          body,
          idem(options, options?.idempotencyKey),
        ),

      // Activate forecast
      activate: (id, options = {}) =>
        post(
          `${base}/forecasts/${id}/activate`,
          {},
          idem(options, options?.idempotencyKey),
        ),

      // Archive forecast
      archive: (id, options = {}) =>
        post(
          `${base}/forecasts/${id}/archive`,
          {},
          idem(options, options?.idempotencyKey),
        ),

      // Get forecast summary
      getSummary: (id) => get(`${base}/forecasts/${id}/summary`),

      // ============================
      // Version Management
      // ============================
      versions: {
        // List all versions for a forecast
        list: (forecastId) =>
          get(`${base}/forecasts/${forecastId}/versions`),

        // Get a specific version with its lines
        get: (forecastId, versionId) =>
          get(`${base}/forecasts/${forecastId}/versions/${versionId}`),

        // Update forecast version (PUT)
        update: (forecastId, versionId, body, options = {}) =>
          put(
            `${base}/forecasts/${forecastId}/versions/${versionId}`,
            body,
            idem(options, options?.idempotencyKey),
          ),

        // Partially update forecast version (PATCH)
        patch: (forecastId, versionId, body, options = {}) =>
          patch(
            `${base}/forecasts/${forecastId}/versions/${versionId}`,
            body,
            idem(options, options?.idempotencyKey),
          ),

        // Create a new version
        create: (forecastId, body, options = {}) =>
          post(
            `${base}/forecasts/${forecastId}/versions`,
            body,
            idem(options, options?.idempotencyKey),
          ),

        // Finalize a version
        finalize: (forecastId, versionId, options = {}) =>
          post(
            `${base}/forecasts/${forecastId}/versions/${versionId}/finalize`,
            {},
            idem(options, options?.idempotencyKey),
          ),

        // Copy a version
        copy: (forecastId, versionId, body, options = {}) =>
          post(
            `${base}/forecasts/${forecastId}/versions/${versionId}/copy`,
            body,
            idem(options, options?.idempotencyKey),
          ),

        // Submit for approval
        submit: (forecastId, versionId, options = {}) =>
          post(
            `${base}/forecasts/${forecastId}/versions/${versionId}/submit`,
            {},
            idem(options, options?.idempotencyKey),
          ),

        // Approve version
        approve: (forecastId, versionId, options = {}) =>
          post(
            `${base}/forecasts/${forecastId}/versions/${versionId}/approve`,
            {},
            idem(options, options?.idempotencyKey),
          ),

        // Reject version
        reject: (forecastId, versionId, body, options = {}) =>
          post(
            `${base}/forecasts/${forecastId}/versions/${versionId}/reject`,
            body,
            idem(options, options?.idempotencyKey),
          ),

        // Get workflow history for a version
        getHistory: (forecastId, versionId) =>
          get(
            `${base}/forecasts/${forecastId}/versions/${versionId}/history`,
          ),

        // ============================
        // Lines Management
        // ============================
        lines: {
          // List lines for a specific version with pagination and filtering
          list: (forecastId, versionId, params = {}) =>
            get(
              `${base}/forecasts/${forecastId}/versions/${versionId}/lines`,
              { params },
            ),

          // Add lines to latest draft version
          addToLatestDraft: (forecastId, body, options = {}) =>
            post(
              `${base}/forecasts/${forecastId}/lines`,
              body,
              idem(options, options?.idempotencyKey),
            ),

          // Add lines to a specific version
          addLines: (forecastId, versionId, body, options = {}) =>
            post(
              `${base}/forecasts/${forecastId}/versions/${versionId}/lines`,
              body,
              idem(options, options?.idempotencyKey),
            ),

          // Import CSV to latest draft version
          importCsvToLatestDraft: (forecastId, csvText, options = {}) =>
            post(
              `${base}/forecasts/${forecastId}/lines/import-csv`,
              csvText,
              {
                ...idem(options, options?.idempotencyKey),
                headers: {
                  "Content-Type": "text/csv",
                  ...(idem(options, options?.idempotencyKey).headers || {}),
                },
              },
            ),

          // Import CSV to a specific version
          importCsvToVersion: (forecastId, versionId, csvText, options = {}) =>
            post(
              `${base}/forecasts/${forecastId}/versions/${versionId}/lines/import-csv`,
              csvText,
              {
                ...idem(options, options?.idempotencyKey),
                headers: {
                  "Content-Type": "text/csv",
                  ...(idem(options, options?.idempotencyKey).headers || {}),
                },
              },
            ),
        },
      },

      // ============================
      // Analysis Endpoints
      // ============================

      // Compare two versions
      compare: (forecastId, params) =>
        get(`${base}/forecasts/${forecastId}/compare`, { params }),

      // Forecast vs Budget comparison
      vsBudget: (params) => get(`${base}/forecasts/vs-budget`, { params }),

      // Variance analysis (Forecast vs Actual)
      variance: (forecastId, params) =>
        get(`${base}/forecasts/${forecastId}/variance`, { params }),
    },
    // 7.5 Allocations
    allocations: {
      bases: {
        list: () => get(`${base}/allocations/bases`),
        create: (body, options = {}) =>
          post(
            `${base}/allocations/bases`,
            body,
            idem(options, options?.idempotencyKey),
          ),
      },
      rules: {
        list: () => get(`${base}/allocations/rules`),
        create: (body, options = {}) =>
          post(
            `${base}/allocations/rules`,
            body,
            idem(options, options?.idempotencyKey),
          ),
      },
      preview: (body) => post(`${base}/allocations/preview`, body),
      compute: (body, options = {}) =>
        post(
          `${base}/allocations/compute`,
          body,
          idem(options, options?.idempotencyKey),
        ),
      post: (id, body, options = {}) =>
        post(
          `${base}/allocations/${id}/post`,
          body,
          idem(options, options?.idempotencyKey),
        ),
    },

    // 7.6 KPIs
    kpis: {
      definitions: {
        list: (params = {}) => get(`${base}/kpis/definitions`, { params }),
        create: (body, options = {}) =>
          post(
            `${base}/kpis/definitions`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        update: (id, body, options = {}) =>
          put(
            `${base}/kpis/definitions/${id}`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        archive: (id, options = {}) =>
          del(
            `${base}/kpis/definitions/${id}`,
            idem(options, options?.idempotencyKey),
          ),
        targets: {
          list: (id, params = {}) =>
            get(`${base}/kpis/definitions/${id}/targets`, { params }),
          create: (id, body, options = {}) =>
            post(
              `${base}/kpis/definitions/${id}/targets`,
              body,
              idem(options, options?.idempotencyKey),
            ),
        },
      },
      values: {
        list: (params = {}) => get(`${base}/kpis/values`, { params }),
        compute: (body, options = {}) =>
          post(
            `${base}/kpis/values/compute`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        importCsv: (csvText, options = {}) =>
          post(`${base}/kpis/values/import-csv`, csvText, {
            ...idem(options, options?.idempotencyKey),
            headers: {
              "Content-Type": "text/csv",
              ...(idem(options, options?.idempotencyKey).headers || {}),
            },
          }),
      },
      targets: {
        update: (targetId, body, options = {}) =>
          put(
            `${base}/kpis/targets/${targetId}`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        archive: (targetId, options = {}) =>
          del(
            `${base}/kpis/targets/${targetId}`,
            idem(options, options?.idempotencyKey),
          ),
      },
    },

    // 7.7 Dashboards
    dashboards: {
      list: (params = {}) => get(`${base}/dashboards`, { params }),
      create: (body) => post(`${base}/dashboards`, body),
      update: (dashboardId, body) =>
        patch(`${base}/dashboards/${dashboardId}`, body),
      widgets: {
        list: (dashboardId, params = {}) =>
          get(`${base}/dashboards/${dashboardId}/widgets`, { params }),
        create: (dashboardId, body) =>
          post(`${base}/dashboards/${dashboardId}/widgets`, body),
        update: (widgetId, body) =>
          patch(`${base}/dashboards/widgets/${widgetId}`, body),
      },
    },

    // 7.8 Saved Report Builder
    reports: {
      list: (params = {}) => get(`${base}/reports`, { params }),
      create: (body) => post(`${base}/reports`, body),
      update: (reportId, body) =>
        patch(`${base}/reports/${reportId}`, body),
      archive: (reportId) =>
        post(`${base}/reports/${reportId}/archive`, {}),
      unarchive: (reportId) =>
        post(`${base}/reports/${reportId}/unarchive`, {}),
      versions: {
        list: (reportId) => get(`${base}/reports/${reportId}/versions`),
        create: (reportId, body) =>
          post(`${base}/reports/${reportId}/versions`, body),
      },
      runs: {
        run: (reportId, body) =>
          post(`${base}/reports/${reportId}/run`, body),
        list: (reportId, params = {}) =>
          get(`${base}/reports/${reportId}/runs`, { params }),
      },
      shares: {
        list: (reportId) => get(`${base}/reports/${reportId}/shares`),
        create: (reportId, body) =>
          post(`${base}/reports/${reportId}/shares`, body),
        remove: (shareId) => del(`${base}/reports/shares/${shareId}`),
      },
      schedules: {
        list: (reportId) => get(`${base}/reports/${reportId}/schedules`),
        create: (reportId, body) =>
          post(`${base}/reports/${reportId}/schedules`, body),
        update: (scheduleId, body) =>
          patch(`${base}/reports/schedules/${scheduleId}`, body),
      },
      comments: {
        list: (reportId, params = {}) =>
          get(`${base}/reports/${reportId}/comments`, { params }),
        create: (reportId, body) =>
          post(`${base}/reports/${reportId}/comments`, body),
      },
    },

    // 7.9 Management Reports
    management: {
      departmentalPnl: (params) =>
        get(`${base}/management/departmental-pnl`, { params }),
      costCenterSummary: (params) =>
        get(`${base}/management/cost-center-summary`, { params }),
    },
  };
}
