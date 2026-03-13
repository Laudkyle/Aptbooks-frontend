/**
 * Workflow Documents API client
 *
 * Maps to the Express router at /documents (documents.routes.js).
 * Handles document workflow operations including viewing, uploading versions,
 * submitting for approval, approving, and rejecting documents.
 *
 * Usage:
 *   import { workflowDocumentsApi } from './workflowDocuments.api';
 *   const doc = await workflowDocumentsApi.getDocument(id);
 */

/**
 * @param {import('../../../shared/http/http').Http} http — shared axios/fetch wrapper
 */
export function makeWorkflowDocumentsApi(http) {
  const BASE = '/workflow/documents';

  return {
    /**
     * GET /documents/:id
     * Get document details including versions and approvals
     * Requires: documents.read
     * 
     * @param {string} id - Document UUID
     * @returns {Promise<Object>} Document details with versions and approvals
     */
    getDocument(id) {
      return http.get(`${BASE}/${id}`);
    },

    /**
     * POST /documents/:id/versions
     * Upload a new version of a document
     * Requires: documents.create
     * 
     * @param {string} id - Document UUID
     * @param {File} file - File to upload
     * @returns {Promise<Object>} Uploaded version details
     */
    async uploadVersion(id, file) {
      const formData = new FormData();
      formData.append('file', file);
      
      return http.post(`${BASE}/${id}/versions`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-filename': file.name
        }
      });
    },

    /**
     * POST /documents/:id/submit
     * Submit a document for approval
     * Requires: documents.create
     * 
     * @param {string} id - Document UUID
     * @param {Object} data - Submission data
     * @param {string} data.comment - Optional comment
     * @returns {Promise<Object>} Updated document
     */
    submit(id, data = {}) {
      return http.post(`${BASE}/${id}/submit`, data, {
        headers: buildIdempotencyHeader()
      });
    },

    /**
     * POST /documents/:id/approve
     * Approve a document at current level
     * Requires: approvals.act
     * 
     * @param {string} id - Document UUID
     * @param {Object} data - Approval data
     * @param {string} data.comment - Optional comment
     * @returns {Promise<Object>} Updated document and approval
     */
    approve(id, data = {}) {
      return http.post(`${BASE}/${id}/approve`, data, {
        headers: buildIdempotencyHeader()
      });
    },

    /**
     * POST /documents/:id/reject
     * Reject a document at current level
     * Requires: approvals.act
     * 
     * @param {string} id - Document UUID
     * @param {Object} data - Rejection data
     * @param {string} data.comment - Optional comment
     * @returns {Promise<Object>} Updated document and approval
     */
    reject(id, data = {}) {
      return http.post(`${BASE}/${id}/reject`, data, {
        headers: buildIdempotencyHeader()
      });
    },

    /**
     * GET /documents/:id/versions/:versionId/download
     * Download a specific version of a document
     * Requires: documents.read
     * 
     * @param {string} documentId - Document UUID
     * @param {string} versionId - Version UUID
     * @returns {Promise<Blob>} File blob
     */
    async downloadVersion(documentId, versionId) {
      const response = await http.get(`${BASE}/${documentId}/versions/${versionId}/download`, {
        responseType: 'blob'
      });
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      
      // Try to get filename from Content-Disposition header
      const contentDisposition = response.headers?.['content-disposition'];
      const filenameMatch = contentDisposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      const filename = filenameMatch?.[1]?.replace(/['"]/g, '') || 'download';
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return response;
    },

    /**
     * GET /documents
     * List documents with optional filtering
     * Requires: documents.read
     * 
     * @param {Object} params - Query parameters
     * @param {string} params.entity_type - Filter by entity type
     * @param {string} params.entity_id - Filter by entity ID
     * @param {string} params.status - Filter by status
     * @returns {Promise<Array>} List of documents
     */
    listDocuments(params = {}) {
      return http.get(BASE, { params });
    },

    /**
     * POST /documents
     * Create a new document
     * Requires: documents.create
     * 
     * @param {Object} data - Document data
     * @param {string} data.title - Document title
     * @param {string} data.document_type_id - Document type ID
     * @param {string} data.entity_type - Related entity type
     * @param {string} data.entity_id - Related entity ID
     * @param {string} data.entity_ref - Optional entity reference
     * @returns {Promise<Object>} Created document
     */
    createDocument(data) {
      return http.post(BASE, data, {
        headers: buildIdempotencyHeader()
      });
    }
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build the Idempotency-Key header object.
 * Generates a random UUID v4 when no key is supplied.
 * 
 * @param {string} [key] - Optional idempotency key
 * @returns {Object} Headers object with Idempotency-Key
 */
function buildIdempotencyHeader(key) {
  const idempotencyKey = key ?? generateUUID();
  return { 'Idempotency-Key': idempotencyKey };
}

/**
 * Generate a random UUID v4
 * @returns {string} UUID v4 string
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}