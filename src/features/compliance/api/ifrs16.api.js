import { endpoints } from '../../../shared/api/endpoints.js';

export function makeIfrs16Api(http) {
  return {
    getSettings: async () => (await http.get(endpoints.compliance.ifrs16.settings.get)).data,
    updateSettings: async (body) => (await http.put(endpoints.compliance.ifrs16.settings.put, body)).data,

    listLeases: async (qs) => (await http.get(endpoints.compliance.ifrs16.leases.list(qs))).data,
    createLease: async (body) => (await http.post(endpoints.compliance.ifrs16.leases.create, body)).data,
    getLease: async (leaseId) => (await http.get(endpoints.compliance.ifrs16.leases.detail(leaseId))).data,
    updateLeaseStatus: async (leaseId, body) => (await http.patch(endpoints.compliance.ifrs16.leases.status(leaseId), body)).data,
    submitLease: async (leaseId) => (await http.post(endpoints.compliance.ifrs16.leases.submit(leaseId))).data,
    approveLease: async (leaseId, body) => (await http.post(endpoints.compliance.ifrs16.leases.approve(leaseId), body ?? {})).data,
    rejectLease: async (leaseId, body) => (await http.post(endpoints.compliance.ifrs16.leases.reject(leaseId), body ?? {})).data,

    updateContract: async (leaseId, body) => (await http.put(endpoints.compliance.ifrs16.leases.contract(leaseId), body)).data,

    listAssets: async (leaseId) => (await http.get(endpoints.compliance.ifrs16.leases.assets(leaseId))).data,
    createAsset: async (leaseId, body) => (await http.post(endpoints.compliance.ifrs16.leases.assets(leaseId), body)).data,
    updateAsset: async (leaseId, assetId, body) => (await http.patch(endpoints.compliance.ifrs16.leases.assetDetail(leaseId, assetId), body)).data,
    deleteAsset: async (leaseId, assetId) => (await http.delete(endpoints.compliance.ifrs16.leases.assetDetail(leaseId, assetId))).data,

    listPayments: async (leaseId, qs) => (await http.get(endpoints.compliance.ifrs16.leases.payments(leaseId, qs))).data,
    createPayment: async (leaseId, body) => (await http.post(endpoints.compliance.ifrs16.leases.payments(leaseId), body)).data,

    generateSchedule: async (leaseId, body) =>
      (await http.post(endpoints.compliance.ifrs16.leases.scheduleGenerate(leaseId), body ?? {})).data,
    getSchedule: async (leaseId) => (await http.get(endpoints.compliance.ifrs16.leases.schedule(leaseId))).data,

    postInitialRecognition: async (leaseId, body) =>
      (await http.post(endpoints.compliance.ifrs16.leases.initialRecognitionPost(leaseId), body ?? {})).data,
    postForRange: async (leaseId, body) =>
      (await http.post(endpoints.compliance.ifrs16.leases.post(leaseId), body ?? {})).data,

    listModifications: async (leaseId) => (await http.get(endpoints.compliance.ifrs16.leases.modifications(leaseId))).data,
    createModification: async (leaseId, body) => (await http.post(endpoints.compliance.ifrs16.leases.modifications(leaseId), body)).data,
    getModification: async (leaseId, modificationId) => (await http.get(endpoints.compliance.ifrs16.leases.modificationDetail(leaseId, modificationId))).data,
    submitModification: async (leaseId, modificationId) => (await http.post(endpoints.compliance.ifrs16.leases.modificationSubmit(leaseId, modificationId))).data,
    approveModification: async (leaseId, modificationId, body) => (await http.post(endpoints.compliance.ifrs16.leases.modificationApprove(leaseId, modificationId), body ?? {})).data,
    rejectModification: async (leaseId, modificationId, body) => (await http.post(endpoints.compliance.ifrs16.leases.modificationReject(leaseId, modificationId), body ?? {})).data,
    applyModification: async (leaseId, modificationId) => (await http.post(endpoints.compliance.ifrs16.leases.modificationApply(leaseId, modificationId))).data,

    listEvents: async (leaseId, qs) => (await http.get(endpoints.compliance.ifrs16.leases.events(leaseId, qs))).data,
    getPostingLedger: async (leaseId) => (await http.get(endpoints.compliance.ifrs16.leases.postingLedger(leaseId))).data,
    getDashboard: async (qs) => (await http.get(endpoints.compliance.ifrs16.reports.dashboard(qs))).data,
    getDisclosures: async (qs) => (await http.get(endpoints.compliance.ifrs16.reports.disclosures(qs))).data,
  };
}
