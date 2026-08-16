# GRA Frontend UI Waves 4 and 5

This frontend extends the existing GRA UI Waves 1–3 against the exact GRA Releases 1–6 backend contracts.

## UX invariants

- Users never type AptBooks internal UUID/database relationship IDs. Relationships are selected by human-readable labels and the ID is submitted invisibly.
- GRA UI API modules use exact backend route names and exact response wrappers. They do not probe alternate endpoints or normalize multiple property aliases.
- External statutory identifiers such as TIN/Ghana Card PIN, SSNIT number, machine registration code, GRA reference and verification-engine identifiers remain visible business/compliance fields.

## Wave 4: Ghana payroll

- Ghana payroll settings and statutory-account selectors.
- Employee Ghana Card, SSNIT, Tier 2, residency, worker classification and relief fields.
- Ghana payroll component classification and pensionability.
- DT107/DT108 PAYE returns with frozen employee schedules and CSV export.
- DT107C disengaged employee schedule.
- SSNIT/Tier 2 contribution schedule.
- PAYE, SSNIT Tier 1 and Tier 2 remittance preparation/payment with journal links.
- Permission-aware manage/file actions.

## Wave 5: E-VAT, CIT, capital allowances and industry profiles

- E-VAT readiness, settings, fiscal documents, document detail, queue, locations/devices and system logs.
- Exact fiscal payload fields are rendered directly from the backend contract; no source/property alias guessing.
- Fiscal queue processing and document operations respect fiscalization permissions.
- Corporate Income Tax settings, DT101 computations/workpapers, adjustments, finalization/filing, DT102/DT102A self-assessment and quarterly instalment tracking.
- Ghana tax-asset register and annual capital-allowance runs, with book assets selected by code/name rather than ID entry.
- Hospital, School, Mart, Hotel/Restaurant, Professional Services and General Trading industry-profile workflows. Industry profiles never auto-classify an entire sector as tax-exempt.
- Lightweight Ghana Compliance readiness card on the main dashboard.

## Backend requirement

Requires the backend with GRA Releases 1–6 and database migrations through `153_gra6_cit_industry_readiness.sql`.
