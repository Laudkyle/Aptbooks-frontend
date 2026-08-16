import { endpoints } from '../../../../shared/api/endpoints.js';
import { ensureIdempotencyKey } from '../../../../shared/api/idempotency.js';

export function makeGhanaComplianceApi(http) {
  return {
    async getReadiness({ persist = false } = {}) {
      const response = await http.get(endpoints.accounting.tax.ghanaReadiness({ persist: String(persist) }));
      return response.data.data;
    },

    async listCatalogProfiles(query = {}) {
      const response = await http.get(endpoints.accounting.tax.catalogProfiles(query));
      return response.data.data;
    },

    async createCatalogProfile(payload) {
      const response = await http.post(
        endpoints.accounting.tax.catalogProfiles({}),
        payload,
        { headers: ensureIdempotencyKey() },
      );
      return response.data.data;
    },

    async updateCatalogProfile(profileId, payload) {
      const response = await http.patch(endpoints.accounting.tax.catalogProfile(profileId), payload);
      return response.data.data;
    },

    async deleteCatalogProfile(profileId) {
      const response = await http.delete(endpoints.accounting.tax.catalogProfile(profileId));
      return response.data;
    },

    async listTaxLedger(query = {}) {
      const response = await http.get(endpoints.accounting.tax.ledger(query));
      return response.data.data;
    },

    async listTaxCodes(query = {}) {
      const response = await http.get(endpoints.accounting.tax.codes(query));
      return response.data.data;
    },

    async listJurisdictions() {
      const response = await http.get(endpoints.accounting.tax.jurisdictions);
      return response.data.data;
    },

    async listPartnerProfiles(query = {}) {
      const response = await http.get(endpoints.accounting.tax.partnerProfiles(query));
      return response.data.data;
    },

    async createPartnerProfile(payload) {
      const response = await http.post(
        endpoints.accounting.tax.partnerProfiles({}),
        payload,
        { headers: ensureIdempotencyKey() },
      );
      return response.data.data;
    },

    async updatePartnerProfile(profileId, payload) {
      const response = await http.patch(endpoints.accounting.tax.partnerProfile(profileId), payload);
      return response.data.data;
    },

    async listWithholdingRates() {
      const response = await http.get(endpoints.accounting.tax.ghanaWithholdingRates);
      return response.data.data;
    },

    async getWithholdingDashboard(query = {}) {
      const response = await http.get(endpoints.accounting.tax.ghanaWithholdingDashboard(query));
      return response.data.data;
    },

    async getWithholdingReconciliation(query = {}) {
      const response = await http.get(endpoints.accounting.tax.ghanaWithholdingReconciliation(query));
      return response.data.data;
    },

    async getWithholdingThresholdPosition(query) {
      const response = await http.get(endpoints.accounting.tax.ghanaWithholdingThresholdPosition(query));
      return response.data.data;
    },

    async previewWithholding(payload) {
      const response = await http.post(endpoints.accounting.tax.ghanaWithholdingPreview, payload);
      return response.data.data;
    },

    async listWithholdingEvents(query = {}) {
      const response = await http.get(endpoints.accounting.tax.ghanaWithholdingEvents(query));
      return response.data.data;
    },

    async listGhanaWithholdingCertificates(query = {}) {
      const response = await http.get(endpoints.accounting.tax.ghanaWithholdingCertificates(query));
      return response.data.data;
    },

    async recordReceivedWithholdingCertificate(payload) {
      const response = await http.post(
        endpoints.accounting.tax.ghanaWithholdingCertificateReceived,
        payload,
        { headers: ensureIdempotencyKey() },
      );
      return response.data.data;
    },

    async listGhanaWithholdingReturns(query = {}) {
      const response = await http.get(endpoints.accounting.tax.ghanaWithholdingReturns(query));
      return response.data.data;
    },

    async getGhanaWithholdingReturn(returnId) {
      const response = await http.get(endpoints.accounting.tax.ghanaWithholdingReturn(returnId));
      return response.data.data;
    },

    async prepareGhanaWithholdingReturn(payload) {
      const response = await http.post(
        endpoints.accounting.tax.ghanaWithholdingReturns({}),
        payload,
        { headers: ensureIdempotencyKey() },
      );
      return response.data.data;
    },

    async finalizeGhanaWithholdingReturn(returnId) {
      const response = await http.post(
        endpoints.accounting.tax.ghanaWithholdingReturnFinalize(returnId),
        {},
        { headers: ensureIdempotencyKey() },
      );
      return response.data.data;
    },

    async markGhanaWithholdingReturnFiled(returnId, graReference) {
      const response = await http.post(
        endpoints.accounting.tax.ghanaWithholdingReturnFiled(returnId),
        { graReference },
        { headers: ensureIdempotencyKey() },
      );
      return response.data.data;
    },

    async listGhanaWithholdingRemittances(query = {}) {
      const response = await http.get(endpoints.accounting.tax.withholdingRemittances(query));
      return response.data.data;
    },

    async createGhanaWithholdingRemittance(payload) {
      const response = await http.post(
        endpoints.accounting.tax.ghanaWithholdingRemittances,
        payload,
        { headers: ensureIdempotencyKey() },
      );
      return response.data.data;
    },

    async postGhanaWithholdingRemittance(remittanceId, payload) {
      const response = await http.post(
        endpoints.accounting.tax.ghanaWithholdingRemittancePost(remittanceId),
        payload,
        { headers: ensureIdempotencyKey() },
      );
      return response.data.data;
    },

    async voidGhanaWithholdingRemittance(remittanceId, reason) {
      const response = await http.post(
        endpoints.accounting.tax.ghanaWithholdingRemittanceVoid(remittanceId),
        { reason },
        { headers: ensureIdempotencyKey() },
      );
      return response.data.data;
    },

    async getVatRegistrationMonitor({ asOfDate } = {}) {
      const response = await http.get(endpoints.accounting.tax.ghanaVatRegistrationMonitor(asOfDate ? { asOfDate } : {}));
      return response.data;
    },

    async getGhanaVatReturn({ from, to, templateCode } = {}) {
      const query = { from, to };
      if (templateCode) query.templateCode = templateCode;
      const response = await http.get(endpoints.reporting.tax.ghanaVatReturn(query));
      return response.data.data;
    },

    async getGhanaVatTransactions({ from, to }) {
      const response = await http.get(endpoints.reporting.tax.ghanaVatTransactions({ from, to }));
      return response.data.data;
    },

    async getGhanaVatReconciliation({ from, to }) {
      const response = await http.get(endpoints.reporting.tax.ghanaVatReconciliation({ from, to }));
      return response.data.data;
    },

    async listVatApportionments(query = {}) {
      const response = await http.get(endpoints.accounting.tax.ghanaVatApportionments(query));
      return response.data.data;
    },

    async calculateVatApportionment(payload) {
      const response = await http.post(endpoints.accounting.tax.ghanaVatApportionmentCalculate, payload);
      return response.data;
    },

    async postVatApportionment(apportionmentId, payload = {}) {
      const response = await http.post(
        endpoints.accounting.tax.ghanaVatApportionmentPost(apportionmentId),
        payload,
        { headers: ensureIdempotencyKey() },
      );
      return response.data;
    },

    async voidVatApportionment(apportionmentId, reason) {
      const response = await http.post(
        endpoints.accounting.tax.ghanaVatApportionmentVoid(apportionmentId),
        { reason },
        { headers: ensureIdempotencyKey() },
      );
      return response.data;
    },

    async listImportedServices(query = {}) {
      const response = await http.get(endpoints.accounting.tax.ghanaImportedServices(query));
      return response.data.data;
    },

    async getImportedService(importedServiceId) {
      const response = await http.get(endpoints.accounting.tax.ghanaImportedService(importedServiceId));
      return response.data;
    },

    async createImportedService(payload) {
      const response = await http.post(
        endpoints.accounting.tax.ghanaImportedServices({}),
        payload,
        { headers: ensureIdempotencyKey() },
      );
      return response.data;
    },

    async updateImportedService(importedServiceId, payload) {
      const response = await http.patch(endpoints.accounting.tax.ghanaImportedService(importedServiceId), payload);
      return response.data;
    },

    async postImportedService(importedServiceId) {
      const response = await http.post(
        endpoints.accounting.tax.ghanaImportedServicePost(importedServiceId),
        {},
        { headers: ensureIdempotencyKey() },
      );
      return response.data;
    },

    async voidImportedService(importedServiceId, reason) {
      const response = await http.post(
        endpoints.accounting.tax.ghanaImportedServiceVoid(importedServiceId),
        { reason },
        { headers: ensureIdempotencyKey() },
      );
      return response.data;
    },

    async getImportedServicesSummary({ from, to }) {
      const response = await http.get(endpoints.reporting.tax.ghanaImportedServicesSummary({ from, to }));
      return response.data.data;
    },
  };
}
