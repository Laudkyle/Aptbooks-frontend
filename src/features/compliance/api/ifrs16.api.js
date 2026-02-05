import { endpoints } from '../../../shared/api/endpoints.js';

export function makeIfrs16Api(http) {
  return {
    // Leases
    listLeases: async (qs) => (await http.get(endpoints.compliance.ifrs16.leases.list(qs))).data,
    createLease: async (body) => (await http.post(endpoints.compliance.ifrs16.leases.create, body)).data,
    getLease: async (leaseId) => (await http.get(endpoints.compliance.ifrs16.leases.detail(leaseId))).data,
    updateLeaseStatus: async (leaseId, body) => (await http.patch(endpoints.compliance.ifrs16.leases.status(leaseId), body)).data,

    // Schedule
    generateSchedule: async (leaseId, body) => (await http.post(endpoints.compliance.ifrs16.leases.scheduleGenerate(leaseId), body ?? {})).data,
    getSchedule: async (leaseId) => (await http.get(endpoints.compliance.ifrs16.leases.schedule(leaseId))).data,

    // Posting
    postInitialRecognition: async (leaseId, body) =>
      (await http.post(endpoints.compliance.ifrs16.leases.initialRecognitionPost(leaseId), body ?? {})).data,
    postForRange: async (leaseId, body) => (await http.post(endpoints.compliance.ifrs16.leases.post(leaseId), body ?? {})).data
  };
}
