import { endpoints } from '../../../shared/api/endpoints.js'; 

export function makeReportingApi(http) {
  return {
    ar: {
      agedReceivables: async (qs) => (await http.get(endpoints.reporting.ar.agedReceivables(qs))).data,
      openItems: async (qs) => (await http.get(endpoints.reporting.ar.openItems(qs))).data,
      customerStatement: async (qs) => (await http.get(endpoints.reporting.ar.customerStatement(qs))).data
    },
    ap: {
      agedPayables: async (qs) => (await http.get(endpoints.reporting.ap.agedPayables(qs))).data,
      openItems: async (qs) => (await http.get(endpoints.reporting.ap.openItems(qs))).data,
      vendorStatement: async (qs) => (await http.get(endpoints.reporting.ap.vendorStatement(qs))).data
    },
    tax: {
      vatSummary: async (qs) => (await http.get(endpoints.reporting.tax.vatSummary(qs))).data,
      vatReturn: async (qs) => (await http.get(endpoints.reporting.tax.vatReturn(qs))).data,
      returns: async (qs) => (await http.get(endpoints.reporting.tax.returns(qs))).data
    }
  }; 
}
