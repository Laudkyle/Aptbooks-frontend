import { endpoints } from '../../../shared/api/endpoints.js';
// Create a new file: settings-workflow.api.js
export function makeWorkflowSettingsApi(http) {
  return {
    // Document Types
    listDocumentTypes: async (qs = {}) => {
      const res = await http.get(endpoints.documentTypes.list(qs));
      return res.data;
    },
    getDocumentType: async (id) => {
      const res = await http.get(endpoints.documentTypes.get(id));
      return res.data;
    },
    createDocumentType: async (data) => {
      const res = await http.post(endpoints.documentTypes.create, data);
      return res.data;
    },
    updateDocumentType: async (id, data) => {
      const res = await http.put(endpoints.documentTypes.update(id), data);
      return res.data;
    },
    deleteDocumentType: async (id) => {
      const res = await http.delete(endpoints.documentTypes.delete(id));
      return res.data;
    },
    
    // Approval Levels
    listApprovalLevels: async (qs = {}) => {
      const res = await http.get(endpoints.approvalLevels.list(qs));
      return res.data;
    },
    getApprovalLevel: async (id) => {
      const res = await http.get(endpoints.approvalLevels.get(id));
      return res.data;
    },
    createApprovalLevel: async (data) => {
      const res = await http.post(endpoints.approvalLevels.create, data);
      return res.data;
    },
    updateApprovalLevel: async (id, data) => {
      const res = await http.put(endpoints.approvalLevels.update(id), data);
      return res.data;
    },
    deleteApprovalLevel: async (id) => {
      const res = await http.delete(endpoints.approvalLevels.delete(id));
      return res.data;
    },
    reorderApprovalLevels: async (orderedIds) => {
      const res = await http.post(endpoints.approvalLevels.reorder, { level_ids: orderedIds });
      return res.data;
    },
    
    // Approval Mappings (Document Type → Approval Levels)
    getApprovalMappings: async (documentTypeId) => {
      const res = await http.get(endpoints.approvalMappings.get(documentTypeId));
      return res.data;
    },
    updateApprovalMappings: async (documentTypeId, approvalLevelIds) => {
      const res = await http.put(endpoints.approvalMappings.update(documentTypeId), {
        approval_level_ids: approvalLevelIds
      });
      return res.data;
    }
  };
}