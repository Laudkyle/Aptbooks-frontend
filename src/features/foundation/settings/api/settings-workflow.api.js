// Create a new file: settings-workflow.api.js
export function makeWorkflowSettingsApi(http) {
  return {
    // Document Types
    listDocumentTypes: async (qs = {}) => {
      const res = await http.get(endpoints.core.documentTypes.list(qs));
      return res.data;
    },
    getDocumentType: async (id) => {
      const res = await http.get(endpoints.core.documentTypes.get(id));
      return res.data;
    },
    createDocumentType: async (data) => {
      const res = await http.post(endpoints.core.documentTypes.create, data);
      return res.data;
    },
    updateDocumentType: async (id, data) => {
      const res = await http.put(endpoints.core.documentTypes.update(id), data);
      return res.data;
    },
    deleteDocumentType: async (id) => {
      const res = await http.delete(endpoints.core.documentTypes.delete(id));
      return res.data;
    },
    
    // Approval Levels
    listApprovalLevels: async (qs = {}) => {
      const res = await http.get(endpoints.core.approvalLevels.list(qs));
      return res.data;
    },
    getApprovalLevel: async (id) => {
      const res = await http.get(endpoints.core.approvalLevels.get(id));
      return res.data;
    },
    createApprovalLevel: async (data) => {
      const res = await http.post(endpoints.core.approvalLevels.create, data);
      return res.data;
    },
    updateApprovalLevel: async (id, data) => {
      const res = await http.put(endpoints.core.approvalLevels.update(id), data);
      return res.data;
    },
    deleteApprovalLevel: async (id) => {
      const res = await http.delete(endpoints.core.approvalLevels.delete(id));
      return res.data;
    },
    reorderApprovalLevels: async (orderedIds) => {
      const res = await http.post(endpoints.core.approvalLevels.reorder, { level_ids: orderedIds });
      return res.data;
    },
    
    // Approval Mappings (Document Type → Approval Levels)
    getApprovalMappings: async (documentTypeId) => {
      const res = await http.get(endpoints.core.approvalMappings.get(documentTypeId));
      return res.data;
    },
    updateApprovalMappings: async (documentTypeId, approvalLevelIds) => {
      const res = await http.put(endpoints.core.approvalMappings.update(documentTypeId), {
        approval_level_ids: approvalLevelIds
      });
      return res.data;
    }
  };
}