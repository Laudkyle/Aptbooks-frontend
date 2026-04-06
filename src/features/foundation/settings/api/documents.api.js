import { ensureIdempotencyKey } from '../../../../shared/api/idempotency.js';
import { endpoints } from '../../../../shared/api/endpoints.js';

export function makeDocumentsApi(http) {
  return {
    // Exposed so consumers can make ad-hoc calls (e.g. fetching org users)
    // without needing a separate api factory passed down the tree.
    _http: http,

    // ── Document Types ──────────────────────────────────────────────────────
    listDocumentTypes: async () => {
      const res = await http.get(endpoints.documents.types.list);
      return res.data;
    },
    createDocumentType: async (payload) => {
      const res = await http.post(
        endpoints.documents.types.create, 
        payload, 
        { headers: ensureIdempotencyKey() }
      );
      return res.data;
    },

    // ── Approval Levels ─────────────────────────────────────────────────────
    listApprovalLevels: async () => {
      const res = await http.get(endpoints.documents.approvalLevels.list);
      return res.data;
    },
    createApprovalLevel: async (payload) => {
      const res = await http.post(
        endpoints.documents.approvalLevels.create, 
        payload, 
        { headers: ensureIdempotencyKey() }
      );
      return res.data;
    },

    // ── Approval Ladder (type → ordered levels) ─────────────────────────────
    getDocumentTypeLadder: async (typeId) => {
      const res = await http.get(endpoints.documents.types.getLadder(typeId));
      return res.data;
    },
    setDocumentTypeApprovalLevels: async (typeId, approvalLevelIds) => {
      const res = await http.put(
        endpoints.documents.types.setApprovalLevels(typeId),
        { approval_level_ids: approvalLevelIds },
        { headers: ensureIdempotencyKey() }
      );
      return res.data;
    },

    getGlobalApprovalLevels: async () => {
      const res = await http.get(endpoints.documents.approvalLevels.global);
      return res.data;
    },
    setGlobalApprovalLevels: async (approvalLevelIds) => {
      const res = await http.put(
        endpoints.documents.approvalLevels.global,
        { approval_level_ids: approvalLevelIds },
        { headers: ensureIdempotencyKey() }
      );
      return res.data;
    },

    // ── Approval Level Users (level → assigned approvers) ───────────────────
    getApprovalLevelUsers: async (levelId) => {
      const res = await http.get(endpoints.documents.approvalLevels.getUsers(levelId));
      return res.data; // [{ id, email, first_name, last_name, assigned_at }]
    },
    setApprovalLevelUsers: async (levelId, userIds) => {
      const res = await http.put(
        endpoints.documents.approvalLevels.setUsers(levelId),
        { user_ids: userIds },
        { headers: ensureIdempotencyKey() }
      );
      return res.data;
    }
  };
}