import { endpoints } from '../../../../shared/api/endpoints.js';

export function makeSettingsApi(http) {
  return {
    // ── System Settings ───────────────────────────────────────────────────────
    list: async (qs) => {
      const res = await http.get(endpoints.core.settings.list(qs));
      return res.data;
    },
    get: async (key) => {
      const res = await http.get(endpoints.core.settings.get(key));
      return res.data;
    },
    put: async (key, body) => {
      const res = await http.put(endpoints.core.settings.put(key), body);
      return res.data;
    },
    bulk: async (settings) => {
      const res = await http.put(endpoints.core.settings.bulk, { settings });
      return res.data;
    },

    // ── Document Workflow Statics ─────────────────────────────────────────────
    workflowStatics: {
      list: async () => {
        const res = await http.get(endpoints.core.settings.workflowStatics.list);
        return res.data;
      },
      resolve: async ({ documentTypeId, entityType }) => {
        const res = await http.get(
          endpoints.core.settings.workflowStatics.resolve({
            ...(documentTypeId && { document_type_id: documentTypeId }),
            ...(entityType     && { entity_type:      entityType     })
          })
        );
        return res.data;
      },
      get: async (id) => {
        const res = await http.get(endpoints.core.settings.workflowStatics.get(id));
        return res.data;
      },
      create: async (payload) => {
        const res = await http.post(endpoints.core.settings.workflowStatics.create, payload);
        return res.data;
      },
      update: async (id, payload) => {
        const res = await http.patch(endpoints.core.settings.workflowStatics.update(id), payload);
        return res.data;
      },
      remove: async (id) => {
        const res = await http.delete(endpoints.core.settings.workflowStatics.remove(id));
        return res.data;
      }
    }
  };
}