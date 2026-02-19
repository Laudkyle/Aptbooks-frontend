/**
 * Document Types API client
 *
 * Maps to the Express router at /documents (documents.routes.js).
 * Covers document-type configuration, approval-level configuration,
 * and the linking of approval levels to document types.
 *
 * Usage:
 *   const api = makeDocumentTypesApi(http);
 *   const types = await api.listTypes();
 */

/**
 * @param {import('../../../shared/http/http').Http} http  — shared axios/fetch wrapper
 */
export function makeDocumentTypesApi(http) {
  const BASE = '/documents';

  return {
    // ── Document Types ────────────────────────────────────────────────────────

    /**
     * GET /documents/types
     * List all document types for the current organisation.
     * Requires: documents.read
     */
    list() {
      return http.get(`${BASE}/types`);
    },

    /**
     * POST /documents/types
     * Create a new document type.
     * Requires: documents.manage  |  idempotency header required
     *
     * @param {object} payload  — body validated by createDocumentTypeSchema
     * @param {object} [opts]
     * @param {string} [opts.idempotencyKey]  — UUID; one will be generated if omitted
     */
    createType(payload, opts = {}) {
      return http.post(`${BASE}/types`, payload, {
        headers: buildIdempotencyHeader(opts.idempotencyKey)
      });
    },

    // ── Approval Levels ───────────────────────────────────────────────────────

    /**
     * GET /documents/approval-levels
     * List all approval levels for the current organisation.
     * Requires: documents.read
     */
    listApprovalLevels() {
      return http.get(`${BASE}/approval-levels`);
    },

    /**
     * POST /documents/approval-levels
     * Create a new approval level.
     * Requires: documents.manage  |  idempotency header required
     *
     * @param {object} payload  — body validated by createApprovalLevelSchema
     * @param {object} [opts]
     * @param {string} [opts.idempotencyKey]
     */
    createApprovalLevel(payload, opts = {}) {
      return http.post(`${BASE}/approval-levels`, payload, {
        headers: buildIdempotencyHeader(opts.idempotencyKey)
      });
    },

    // ── Document Type ↔ Approval Level assignment ─────────────────────────────

    /**
     * PUT /documents/types/:typeId/approval-levels
     * Replace the approval-level list for a document type.
     * Requires: documents.manage
     *
     * @param {string}   typeId          — document type UUID
     * @param {string[]} approvalLevelIds — ordered list of approval level UUIDs
     */
    setApprovalLevels(typeId, approvalLevelIds) {
      return http.put(`${BASE}/types/${typeId}/approval-levels`, {
        approval_level_ids: approvalLevelIds
      });
    },

    // ── Entity types (informational) ──────────────────────────────────────────

    /**
     * GET /documents/entity-types
     * Returns the list of entity types that can be linked to documents.
     * Requires: documents.read
     */
    listEntityTypes() {
      return http.get(`${BASE}/entity-types`);
    }
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build the Idempotency-Key header object.
 * Generates a random UUID v4 when no key is supplied.
 */
function buildIdempotencyHeader(key) {
  const idempotencyKey = key ?? generateUUID();
  return { 'Idempotency-Key': idempotencyKey };
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}