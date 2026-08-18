/**
 * A financial state transition such as void/reversal changes several derived
 * views at once (AR/AP aging, tax, reconciliations, dashboards). Keep the UI
 * from showing a stale pre-void snapshot after the source transaction commits.
 */
export function invalidateFinancialImpact(queryClient) {
  if (!queryClient) return;
  queryClient.invalidateQueries({ queryKey: ['reports'] });
  queryClient.invalidateQueries({ queryKey: ['tax'] });
  queryClient.invalidateQueries({ queryKey: ['reporting'] });
  queryClient.invalidateQueries({
    predicate: (query) => {
      const root = query?.queryKey?.[0];
      return typeof root === 'string' && (
        root.startsWith('tax-') ||
        root === 'dashboard' ||
        root === 'healthSystem' ||
        ['trialBalance','accountActivity','balanceSheet','pnl','cashFlow','changesEquity'].includes(root)
      );
    },
  });
}
