import { endpoints } from '../../../../shared/api/endpoints.js';

export function makeDocumentsApi(http) {
  return {
    // Document Types
    listDocumentTypes: async () => {
      const res = await http.get(endpoints.documents.types.list);
      return res.data;
    },
    createDocumentType: async (payload) => {
      const res = await http.post(endpoints.documents.types.create, payload);
      return res.data;
    },

    // Approval Levels
    listApprovalLevels: async () => {
      const res = await http.get(endpoints.documents.approvalLevels.list);
      return res.data;
    },
    createApprovalLevel: async (payload) => {
      const res = await http.post(endpoints.documents.approvalLevels.create, payload);
      return res.data;
    },

    // Fetch the currently saved ladder for a given document type
    getDocumentTypeLadder: async (typeId) => {
      const res = await http.get(endpoints.documents.types.getLadder(typeId));
      return res.data; // returns array of approval_level rows ordered by sequence
    },

    // Replace the ladder for a given document type
    setDocumentTypeApprovalLevels: async (typeId, approvalLevelIds) => {
      const res = await http.put(
        endpoints.documents.types.setApprovalLevels(typeId),
        { approval_level_ids: approvalLevelIds }
      );
      return res.data;
    }
  };
}