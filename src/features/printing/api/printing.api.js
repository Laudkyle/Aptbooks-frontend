import { endpoints } from '../../../shared/api/endpoints.js';

export function makePrintingApi(http) {
  return {
    listTemplates: async (qs) => (await http.get(endpoints.modules.printing.documentTemplates.list(qs))).data,
    createTemplate: async (body) => (await http.post(endpoints.modules.printing.documentTemplates.create, body)).data,
    getTemplate: async (id) => (await http.get(endpoints.modules.printing.documentTemplates.detail(id))).data,
    updateTemplate: async (id, body) => (await http.patch(endpoints.modules.printing.documentTemplates.update(id), body)).data,
    publishTemplate: async (id, body) => (await http.post(endpoints.modules.printing.documentTemplates.publish(id), body ?? {})).data,
    previewSample: async (documentType, templateId) => (await http.get(endpoints.modules.printing.documentTemplates.previewSample(documentType, templateId))).data,

    listAssignments: async (qs) => (await http.get(endpoints.modules.printing.assignments.list(qs))).data,
    upsertAssignment: async (body) => (await http.post(endpoints.modules.printing.assignments.upsert, body)).data,

    renderDocument: async (documentType, documentId, qs) =>
      (await http.get(endpoints.modules.printing.render.document(documentType, documentId, qs))).data,
  };
}
