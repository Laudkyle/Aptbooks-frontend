# Frontend Tax Wave 1–3 Implementation Summary

This frontend repo was upgraded to align with the backend tax redesign across wave 1, wave 2, and wave 3.

## Covered areas

- Tax domain redesign UI
- Determination engine UI hooks
- Partner tax profiles
- Invoice and bill tax-aware capture
- Posting-standardization-facing summaries
- Tax reporting and reconciliation workspace
- Withholding tax views
- Recoverability / non-deductible tax views
- E-invoicing compatibility surfaces
- Jurisdiction-specific return views
- Automation, filing adapters, and country-pack visibility

## Main files changed

- `src/shared/api/endpoints.js`
- `src/shared/tax/frontendTax.js`
- `src/features/accounting/tax/api/tax.api.js`
- `src/features/accounting/tax/pages/TaxAdmin.jsx`
- `src/features/business/api/partners.api.js`
- `src/features/business/pages/PartnerCreate.jsx`
- `src/features/business/pages/PartnerDetail.jsx`
- `src/features/transactions/api/invoices.api.js`
- `src/features/transactions/api/bills.api.js`
- `src/features/transactions/pages/InvoiceCreate.jsx`
- `src/features/transactions/pages/BillCreate.jsx`
- `src/features/transactions/pages/InvoiceDetail.jsx`
- `src/features/transactions/pages/BillDetail.jsx`
- `src/features/reporting/api/reporting.api.js`
- `src/features/reporting/pages/ReportTax.jsx`
- `src/features/automation/pages/Overview.jsx`

## Validation performed

A TypeScript parser pass was run against the modified JS/JSX files using a temporary `tsconfig.check.json` with no emit.
