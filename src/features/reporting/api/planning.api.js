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
        http.get(`${base}/centers/${type}`, { params }),
      usage: (type, id) => http.get(`${base}/centers/${type}/${id}/usage`),
      create: (type, body, options = {}) =>
        http.post(
          `${base}/centers/${type}`,
          body,
          idem(options, options?.idempotencyKey),
        ),
      update: (type, id, body, options = {}) =>
        http.put(
          `${base}/centers/${type}/${id}`,
          body,
          idem(options, options?.idempotencyKey),
        ),
      archive: (type, id, options = {}) =>
        http.delete(
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
      getAll: (params = {}) => http.get(`${base}/centers/all`, { params }),

      /**
       * Get all centers grouped by type
       * @param {Object} params - Query parameters
       * @param {string} [params.status] - Filter by status
       * @param {boolean} [params.includeArchived] - Whether to include archived centers
       * @returns {Promise<Object>} Centers grouped by type: { cost: [], profit: [], investment: [] }
       */
      getAllGrouped: (params = {}) =>
        http.get(`${base}/centers/all`, {
          params: { ...params, grouped: true },
        }),

      /**
       * Get a center by ID across all types (auto-detects type)
       * @param {string} id - Center UUID
       * @returns {Promise<Object>} Center object with centerType field
       */
      getById: (id) => http.get(`${base}/centers/by-id/${id}`),

      /**
       * Get usage for a center by ID (auto-detects type)
       * @param {string} id - Center UUID
       * @returns {Promise<Object>} Usage information
       */
      getUsageById: (id) => http.get(`${base}/centers/by-id/${id}/usage`),

      /**
       * Batch get multiple centers by their IDs
       * @param {string[]} ids - Array of center UUIDs
       * @returns {Promise<Array>} Array of center objects
       */
      getBatch: async (ids) => {
        if (!ids || ids.length === 0) return [];
        // Fetch centers one by one (could be optimized with a batch endpoint if needed)
        const promises = ids.map((id) =>
          http.get(`${base}/centers/by-id/${id}`).catch(() => null),
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
        const centers = await http.get(`${base}/centers/all`, {
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
        const centers = await http.get(`${base}/centers/${type}`, {
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
        const centers = await http.get(`${base}/centers/all`, {
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
      list: (params = {}) => http.get(`${base}/projects`, { params }),
      get: (id) => http.get(`${base}/projects/${id}`),
      create: (body, options = {}) =>
        http.post(
          `${base}/projects`,
          body,
          idem(options, options?.idempotencyKey),
        ),
      update: (id, body, options = {}) =>
        http.put(
          `${base}/projects/${id}`,
          body,
          idem(options, options?.idempotencyKey),
        ),
      archive: (id, options = {}) =>
        http.delete(
          `${base}/projects/${id}`,
          idem(options, options?.idempotencyKey),
        ),
      phases: {
        list: (projectId) => http.get(`${base}/projects/${projectId}/phases`),
        create: (projectId, body, options = {}) =>
          http.post(
            `${base}/projects/${projectId}/phases`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        update: (projectId, phaseId, body, options = {}) =>
          http.put(
            `${base}/projects/${projectId}/phases/${phaseId}`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        archive: (projectId, phaseId, options = {}) =>
          http.delete(
            `${base}/projects/${projectId}/phases/${phaseId}`,
            idem(options, options?.idempotencyKey),
          ),
        tasks: {
          list: (projectId, phaseId) =>
            http.get(`${base}/projects/${projectId}/phases/${phaseId}/tasks`),
          create: (projectId, phaseId, body, options = {}) =>
            http.post(
              `${base}/projects/${projectId}/phases/${phaseId}/tasks`,
              body,
              idem(options, options?.idempotencyKey),
            ),
          update: (projectId, phaseId, taskId, body, options = {}) =>
            http.put(
              `${base}/projects/${projectId}/phases/${phaseId}/tasks/${taskId}`,
              body,
              idem(options, options?.idempotencyKey),
            ),
          archive: (projectId, phaseId, taskId, options = {}) =>
            http.delete(
              `${base}/projects/${projectId}/phases/${phaseId}/tasks/${taskId}`,
              idem(options, options?.idempotencyKey),
            ),
        },
      },
    },

    // 7.3 Budgets
    budgets: {
      list: () => http.get(`${base}/budgets`),
      get: (id) => http.get(`${base}/budgets/${id}`),
      create: (body, options = {}) =>
        http.post(
          `${base}/budgets`,
          body,
          idem(options, options?.idempotencyKey),
        ),
      update: (id, body, options = {}) =>
        http.put(
          `${base}/budgets/${id}`,
          body,
          idem(options, options?.idempotencyKey),
        ),

      // New budget status management endpoints
      archive: (id, options = {}) =>
        http.post(
          `${base}/budgets/${id}/archive`,
          {},
          idem(options, options?.idempotencyKey),
        ),
      activate: (id, options = {}) =>
        http.post(
          `${base}/budgets/${id}/activate`,
          {},
          idem(options, options?.idempotencyKey),
        ),

      versions: {
        create: (budgetId, body, options = {}) =>
          http.post(
            `${base}/budgets/${budgetId}/versions`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        addLines: (budgetId, versionId, body, options = {}) =>
          http.post(
            `${base}/budgets/${budgetId}/versions/${versionId}/lines`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        upsertAmount: (budgetId, versionId, body, options = {}) =>
          http.post(
            `${base}/budgets/${budgetId}/versions/${versionId}/annual`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        importCsv: (budgetId, versionId, csvText, options = {}) =>
          http.post(
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
          http.post(
            `${base}/budgets/${budgetId}/versions/${versionId}/distribute`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        finalize: (budgetId, versionId, options = {}) =>
          http.post(
            `${base}/budgets/${budgetId}/versions/${versionId}/finalize`,
            {},
            idem(options, options?.idempotencyKey),
          ),
        submit: (budgetId, versionId, options = {}) =>
          http.post(
            `${base}/budgets/${budgetId}/versions/${versionId}/submit`,
            {},
            idem(options, options?.idempotencyKey),
          ),
        approve: (budgetId, versionId, options = {}) =>
          http.post(
            `${base}/budgets/${budgetId}/versions/${versionId}/approve`,
            {},
            idem(options, options?.idempotencyKey),
          ),
        reject: (budgetId, versionId, body, options = {}) =>
          http.post(
            `${base}/budgets/${budgetId}/versions/${versionId}/reject`,
            body,
            idem(options, options?.idempotencyKey),
          ),

        // Additional version operations that might be useful
        get: (budgetId, versionId) =>
          http.get(`${base}/budgets/${budgetId}/versions/${versionId}`),
        list: (budgetId) => http.get(`${base}/budgets/${budgetId}/versions`),

        // Variance analysis
        variance: (budgetId, versionId, periodId) =>
          http.get(
            `${base}/budgets/${budgetId}/versions/${versionId}/variance`,
            { params: { periodId } },
          ),

        // Mass operations
        massAdjust: (budgetId, versionId, body, options = {}) =>
          http.post(
            `${base}/budgets/${budgetId}/versions/${versionId}/lines/mass-adjust`,
            body,
            idem(options, options?.idempotencyKey),
          ),

        // Copy version
        copy: (budgetId, sourceVersionId, body, options = {}) =>
          http.post(
            `${base}/budgets/${budgetId}/versions/${sourceVersionId}/copy`,
            body,
            idem(options, options?.idempotencyKey),
          ),
      },

      // Alert rules
      alerts: {
        list: (budgetId) => http.get(`${base}/budgets/${budgetId}/alert-rules`),
        create: (budgetId, body, options = {}) =>
          http.post(
            `${base}/budgets/${budgetId}/alert-rules`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        update: (budgetId, ruleId, body, options = {}) =>
          http.put(
            `${base}/budgets/${budgetId}/alert-rules/${ruleId}`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        delete: (budgetId, ruleId, options = {}) =>
          http.delete(
            `${base}/budgets/${budgetId}/alert-rules/${ruleId}`,
            idem(options, options?.idempotencyKey),
          ),
        get: (budgetId, ruleId) =>
          http.get(`${base}/budgets/${budgetId}/alert-rules/${ruleId}`),
      },
    },
// 7.4 Forecasts
forecasts: {
  // ============================
  // Scenario Management
  // ============================
  scenarios: {
    // List all scenarios
    list: (params = {}) => http.get(`${base}/forecasts/scenarios`, { params }),
    
    // Get scenarios with usage statistics
    getStats: () => http.get(`${base}/forecasts/scenarios/stats`),
    
    // Get a specific scenario by ID
    get: (scenarioId) => http.get(`${base}/forecasts/scenarios/${scenarioId}`),
    
    // Get a scenario by code
    getByCode: (code) => http.get(`${base}/forecasts/scenarios/code/${code}`),
    
    // Create a new scenario
    create: (body, options = {}) =>
      http.post(
        `${base}/forecasts/scenarios`,
        body,
        idem(options, options?.idempotencyKey),
      ),
    
    // Update a scenario (PUT)
    update: (scenarioId, body, options = {}) =>
      http.put(
        `${base}/forecasts/scenarios/${scenarioId}`,
        body,
        idem(options, options?.idempotencyKey),
      ),
    
    // Partially update a scenario (PATCH)
    patch: (scenarioId, body, options = {}) =>
      http.patch(
        `${base}/forecasts/scenarios/${scenarioId}`,
        body,
        idem(options, options?.idempotencyKey),
      ),
    
    // Delete a scenario (soft delete by default, hard delete with force=true)
    delete: (scenarioId, params = {}) => 
      http.delete(`${base}/forecasts/scenarios/${scenarioId}`, { params }),
    
    // Set a scenario as default
    setDefault: (scenarioId, options = {}) =>
      http.post(
        `${base}/forecasts/scenarios/${scenarioId}/set-default`,
        {},
        idem(options, options?.idempotencyKey),
      ),
    
    // Restore a soft-deleted scenario
    restore: (scenarioId, options = {}) =>
      http.post(
        `${base}/forecasts/scenarios/${scenarioId}/restore`,
        {},
        idem(options, options?.idempotencyKey),
      ),
  },

  // ============================
  // Existing Forecast Endpoints
  // ============================
  
  // List forecasts
  list: (params = {}) => http.get(`${base}/forecasts`, { params }),
  
  // GET single forecast by ID
  get: (id, params = {}) => http.get(`${base}/forecasts/${id}`, { params }),
  
  // Update forecast (PUT)
  update: (id, body, options = {}) =>
    http.put(
      `${base}/forecasts/${id}`,
      body,
      idem(options, options?.idempotencyKey),
    ),
  
  // Partially update forecast (PATCH)
  patch: (id, body, options = {}) =>
    http.patch(
      `${base}/forecasts/${id}`,
      body,
      idem(options, options?.idempotencyKey),
    ),
  
  // Create forecast
  create: (body, options = {}) =>
    http.post(
      `${base}/forecasts`,
      body,
      idem(options, options?.idempotencyKey),
    ),
  
  // Activate forecast
  activate: (id, options = {}) =>
    http.post(
      `${base}/forecasts/${id}/activate`,
      {},
      idem(options, options?.idempotencyKey),
    ),
  
  // Archive forecast
  archive: (id, options = {}) =>
    http.post(
      `${base}/forecasts/${id}/archive`,
      {},
      idem(options, options?.idempotencyKey),
    ),
  
  // Get forecast summary
  getSummary: (id) => http.get(`${base}/forecasts/${id}/summary`),
  
  // ============================
  // Version Management
  // ============================
  versions: {
    // List all versions for a forecast
    list: (forecastId) => http.get(`${base}/forecasts/${forecastId}/versions`),
    
    // Get a specific version with its lines
    get: (forecastId, versionId) => 
      http.get(`${base}/forecasts/${forecastId}/versions/${versionId}`),
    
    // Update forecast version (PUT)
    update: (forecastId, versionId, body, options = {}) =>
      http.put(
        `${base}/forecasts/${forecastId}/versions/${versionId}`,
        body,
        idem(options, options?.idempotencyKey),
      ),
    
    // Partially update forecast version (PATCH)
    patch: (forecastId, versionId, body, options = {}) =>
      http.patch(
        `${base}/forecasts/${forecastId}/versions/${versionId}`,
        body,
        idem(options, options?.idempotencyKey),
      ),
    
    // Create a new version
    create: (forecastId, body, options = {}) =>
      http.post(
        `${base}/forecasts/${forecastId}/versions`,
        body,
        idem(options, options?.idempotencyKey),
      ),
    
    // Finalize a version
    finalize: (forecastId, versionId, options = {}) =>
      http.post(
        `${base}/forecasts/${forecastId}/versions/${versionId}/finalize`,
        {},
        idem(options, options?.idempotencyKey),
      ),
    
    // Copy a version
    copy: (forecastId, versionId, body, options = {}) =>
      http.post(
        `${base}/forecasts/${forecastId}/versions/${versionId}/copy`,
        body,
        idem(options, options?.idempotencyKey),
      ),
    
    // Submit for approval
    submit: (forecastId, versionId, options = {}) =>
      http.post(
        `${base}/forecasts/${forecastId}/versions/${versionId}/submit`,
        {},
        idem(options, options?.idempotencyKey),
      ),
    
    // Approve version
    approve: (forecastId, versionId, options = {}) =>
      http.post(
        `${base}/forecasts/${forecastId}/versions/${versionId}/approve`,
        {},
        idem(options, options?.idempotencyKey),
      ),
    
    // Reject version
    reject: (forecastId, versionId, body, options = {}) =>
      http.post(
        `${base}/forecasts/${forecastId}/versions/${versionId}/reject`,
        body,
        idem(options, options?.idempotencyKey),
      ),
    
    // Get workflow history for a version
    getHistory: (forecastId, versionId) => 
      http.get(`${base}/forecasts/${forecastId}/versions/${versionId}/history`),
    
    // ============================
    // Lines Management
    // ============================
    lines: {
      // List lines for a specific version with pagination and filtering
      list: (forecastId, versionId, params = {}) => 
        http.get(`${base}/forecasts/${forecastId}/versions/${versionId}/lines`, { params }),
      
      // Add lines to latest draft version
      addToLatestDraft: (forecastId, body, options = {}) =>
        http.post(
          `${base}/forecasts/${forecastId}/lines`,
          body,
          idem(options, options?.idempotencyKey),
        ),
      
      // Add lines to a specific version
      addLines: (forecastId, versionId, body, options = {}) =>
        http.post(
          `${base}/forecasts/${forecastId}/versions/${versionId}/lines`,
          body,
          idem(options, options?.idempotencyKey),
        ),
      
      // Import CSV to latest draft version
      importCsvToLatestDraft: (forecastId, csvText, options = {}) =>
        http.post(
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
        http.post(
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
    http.get(`${base}/forecasts/${forecastId}/compare`, { params }),
  
  // Forecast vs Budget comparison
  vsBudget: (params) => http.get(`${base}/forecasts/vs-budget`, { params }),
  
  // Variance analysis (Forecast vs Actual)
  variance: (forecastId, params) =>
    http.get(`${base}/forecasts/${forecastId}/variance`, { params }),
},
    // 7.5 Allocations
    allocations: {
      bases: {
        list: () => http.get(`${base}/allocations/bases`),
        create: (body, options = {}) =>
          http.post(
            `${base}/allocations/bases`,
            body,
            idem(options, options?.idempotencyKey),
          ),
      },
      rules: {
        list: () => http.get(`${base}/allocations/rules`),
        create: (body, options = {}) =>
          http.post(
            `${base}/allocations/rules`,
            body,
            idem(options, options?.idempotencyKey),
          ),
      },
      preview: (body) => http.post(`${base}/allocations/preview`, body),
      compute: (body, options = {}) =>
        http.post(
          `${base}/allocations/compute`,
          body,
          idem(options, options?.idempotencyKey),
        ),
      post: (id, body, options = {}) =>
        http.post(
          `${base}/allocations/${id}/post`,
          body,
          idem(options, options?.idempotencyKey),
        ),
    },

    // 7.6 KPIs
    kpis: {
      definitions: {
        list: (params = {}) => http.get(`${base}/kpis/definitions`, { params }),
        create: (body, options = {}) =>
          http.post(
            `${base}/kpis/definitions`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        update: (id, body, options = {}) =>
          http.put(
            `${base}/kpis/definitions/${id}`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        archive: (id, options = {}) =>
          http.delete(
            `${base}/kpis/definitions/${id}`,
            idem(options, options?.idempotencyKey),
          ),
        targets: {
          list: (id, params = {}) =>
            http.get(`${base}/kpis/definitions/${id}/targets`, { params }),
          create: (id, body, options = {}) =>
            http.post(
              `${base}/kpis/definitions/${id}/targets`,
              body,
              idem(options, options?.idempotencyKey),
            ),
        },
      },
      values: {
        list: (params = {}) => http.get(`${base}/kpis/values`, { params }),
        compute: (body, options = {}) =>
          http.post(
            `${base}/kpis/values/compute`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        importCsv: (csvText, options = {}) =>
          http.post(`${base}/kpis/values/import-csv`, csvText, {
            ...idem(options, options?.idempotencyKey),
            headers: {
              "Content-Type": "text/csv",
              ...(idem(options, options?.idempotencyKey).headers || {}),
            },
          }),
      },
      targets: {
        update: (targetId, body, options = {}) =>
          http.put(
            `${base}/kpis/targets/${targetId}`,
            body,
            idem(options, options?.idempotencyKey),
          ),
        archive: (targetId, options = {}) =>
          http.delete(
            `${base}/kpis/targets/${targetId}`,
            idem(options, options?.idempotencyKey),
          ),
      },
    },

    // 7.7 Dashboards
    dashboards: {
      list: (params = {}) => http.get(`${base}/dashboards`, { params }),
      create: (body) => http.post(`${base}/dashboards`, body),
      update: (dashboardId, body) =>
        http.patch(`${base}/dashboards/${dashboardId}`, body),
      widgets: {
        list: (dashboardId, params = {}) =>
          http.get(`${base}/dashboards/${dashboardId}/widgets`, { params }),
        create: (dashboardId, body) =>
          http.post(`${base}/dashboards/${dashboardId}/widgets`, body),
        update: (widgetId, body) =>
          http.patch(`${base}/dashboards/widgets/${widgetId}`, body),
      },
    },

    // 7.8 Saved Report Builder
    reports: {
      list: (params = {}) => http.get(`${base}/reports`, { params }),
      create: (body) => http.post(`${base}/reports`, body),
      update: (reportId, body) =>
        http.patch(`${base}/reports/${reportId}`, body),
      archive: (reportId) =>
        http.post(`${base}/reports/${reportId}/archive`, {}),
      unarchive: (reportId) =>
        http.post(`${base}/reports/${reportId}/unarchive`, {}),
      versions: {
        list: (reportId) => http.get(`${base}/reports/${reportId}/versions`),
        create: (reportId, body) =>
          http.post(`${base}/reports/${reportId}/versions`, body),
      },
      runs: {
        run: (reportId, body) =>
          http.post(`${base}/reports/${reportId}/run`, body),
        list: (reportId, params = {}) =>
          http.get(`${base}/reports/${reportId}/runs`, { params }),
      },
      shares: {
        list: (reportId) => http.get(`${base}/reports/${reportId}/shares`),
        create: (reportId, body) =>
          http.post(`${base}/reports/${reportId}/shares`, body),
        remove: (shareId) => http.delete(`${base}/reports/shares/${shareId}`),
      },
      schedules: {
        list: (reportId) => http.get(`${base}/reports/${reportId}/schedules`),
        create: (reportId, body) =>
          http.post(`${base}/reports/${reportId}/schedules`, body),
        update: (scheduleId, body) =>
          http.patch(`${base}/reports/schedules/${scheduleId}`, body),
      },
      comments: {
        list: (reportId, params = {}) =>
          http.get(`${base}/reports/${reportId}/comments`, { params }),
        create: (reportId, body) =>
          http.post(`${base}/reports/${reportId}/comments`, body),
      },
    },

    // 7.9 Management Reports
    management: {
      departmentalPnl: (params) =>
        http.get(`${base}/management/departmental-pnl`, { params }),
      costCenterSummary: (params) =>
        http.get(`${base}/management/cost-center-summary`, { params }),
    },
  };
}
