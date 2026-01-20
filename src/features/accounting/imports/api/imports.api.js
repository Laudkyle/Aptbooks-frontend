import { endpoints } from '../../../../shared/api/endpoints.js';

export function makeImportsApi(http) {
  async function postCsv(url, csvText) {
    const res = await http.post(url, csvText, {
      headers: { 'Content-Type': 'text/plain' }
    });
    return res.data;
  }

  return {
    importCoa: async ({ csvText, dryRun }) => {
      const url = endpoints.accounting.imports.coa({ dryRun: String(!!dryRun) });
      return postCsv(url, csvText);
    },
    importJournals: async ({ csvText, dryRun, journalKeyField }) => {
      const url = endpoints.accounting.imports.journals({
        dryRun: String(!!dryRun),
        journalKeyField: journalKeyField ?? 'journalKey'
      });
      return postCsv(url, csvText);
    }
  };
}
