export function getDocumentNumber(doc, kind = "document") {
  if (!doc) return "";
  const candidates =
    kind === "invoice"
      ? [
          doc.invoice_no,
          doc.invoiceNumber,
          doc.code,
          doc.reference,
          doc.number,
          doc.document_number,
          doc.id,
        ]
      : kind === "bill"
        ? [
            doc.bill_no,
            doc.billNumber,
            doc.code,
            doc.reference,
            doc.number,
            doc.document_number,
            doc.id,
          ]
        : [doc.number, doc.document_number, doc.code, doc.reference, doc.id];

  return (
    candidates.find(
      (value) =>
        value !== undefined && value !== null && String(value).trim() !== "",
    ) || ""
  );
}

export function getDocumentTotal(doc, kind = "document") {
  if (!doc) return null;
  const kindSpecific =
    kind === "invoice"
      ? [doc.invoice_total, doc.invoiceTotal]
      : kind === "bill"
        ? [doc.bill_total, doc.billTotal]
        : [];

  const candidates = [
    ...kindSpecific,
    doc.total,
    doc.amount_total,
    doc.amountTotal,
    doc.total_amount,
    doc.grand_total,
    doc.grandTotal,
    doc.gross_total,
    doc.grossTotal,
    doc.amount,
  ];
  const raw = candidates.find(
    (value) => value !== undefined && value !== null && value !== "",
  );
  if (raw === undefined) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickNumericValue(candidates = []) {
  const raw = candidates.find(
    (value) => value !== undefined && value !== null && value !== "",
  );
  if (raw === undefined) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getDocumentWithholding(doc, kind = "document") {
  if (!doc) return null;
  const kindSpecific =
    kind === "invoice"
      ? [doc.invoice_withholding, doc.invoiceWithholding]
      : kind === "bill"
        ? [doc.bill_withholding, doc.billWithholding]
        : [];

  return pickNumericValue([
    ...kindSpecific,
    doc.withholding_total,
    doc.withholdingTotal,
    doc.withholding_amount,
    doc.withholdingAmount,
  ]);
}

export function getDocumentSettlementBasis(doc, kind = "document") {
  if (!doc) return null;
  const kindSpecific =
    kind === "invoice"
      ? [doc.invoice_settlement_basis, doc.invoiceSettlementBasis]
      : kind === "bill"
        ? [doc.bill_settlement_basis, doc.billSettlementBasis]
        : [];

  return pickNumericValue([
    ...kindSpecific,
    doc.settlement_basis_total,
    doc.settlementBasisTotal,
    doc.net_settlement_total,
    doc.netSettlementTotal,
    doc.net_due,
    doc.netDue,
  ]);
}

export function getDocumentOutstanding(doc, kind = "document") {
  if (!doc) return null;
  const kindSpecific =
    kind === "invoice"
      ? [doc.invoice_outstanding, doc.invoiceOutstanding]
      : kind === "bill"
        ? [doc.bill_outstanding, doc.billOutstanding]
        : [];

  return pickNumericValue([
    ...kindSpecific,
    doc.outstanding,
    doc.amount_due,
    doc.amountDue,
    doc.remaining_amount,
    doc.remainingAmount,
    doc.unapplied_amount,
    doc.unappliedAmount,
  ]);
}

export function formatDocumentAmount(
  doc,
  fallbackCurrency = "USD",
  kind = "document",
) {
  const total = getDocumentTotal(doc, kind);
  if (total == null) return "—";
  const currency = doc?.currency_code || doc?.currencyCode || fallbackCurrency;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(total);
  } catch {
    return `${currency} ${total.toFixed(2)}`;
  }
}

function formatMoneyValue(amount, currency) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDocumentOutstanding(
  doc,
  fallbackCurrency = "USD",
  kind = "document",
) {
  const outstanding = getDocumentOutstanding(doc, kind);
  if (outstanding == null) return "—";
  const currency = doc?.currency_code || doc?.currencyCode || fallbackCurrency;
  return formatMoneyValue(outstanding, currency);
}

export function formatDocumentWithholding(
  doc,
  fallbackCurrency = "USD",
  kind = "document",
) {
  const withholding = getDocumentWithholding(doc, kind);
  if (withholding == null) return "—";
  const currency = doc?.currency_code || doc?.currencyCode || fallbackCurrency;
  return formatMoneyValue(withholding, currency);
}

export function formatDocumentSettlementBasis(
  doc,
  fallbackCurrency = "USD",
  kind = "document",
) {
  const settlementBasis = getDocumentSettlementBasis(doc, kind);
  if (settlementBasis == null) return "—";
  const currency = doc?.currency_code || doc?.currencyCode || fallbackCurrency;
  return formatMoneyValue(settlementBasis, currency);
}

export function formatDocumentOptionLabel(
  doc,
  kind = "document",
  fallbackCurrency = "USD",
) {
  const number =
    getDocumentNumber(doc, kind) ||
    (kind === "invoice"
      ? "Unnamed invoice"
      : kind === "bill"
        ? "Unnamed bill"
        : "Unnamed document");
  const totalLabel = formatDocumentAmount(doc, fallbackCurrency, kind);
  const withholdingLabel = formatDocumentWithholding(doc, fallbackCurrency, kind);
  const settlementLabel = formatDocumentSettlementBasis(doc, fallbackCurrency, kind);
  const outstandingLabel = formatDocumentOutstanding(doc, fallbackCurrency, kind);

  const parts = [`Gross: ${totalLabel}`];
  if (withholdingLabel !== "—" && getDocumentWithholding(doc, kind) > 0) parts.push(`WHT: ${withholdingLabel}`);
  if (settlementLabel !== "—") parts.push(`Settlement: ${settlementLabel}`);
  if (outstandingLabel !== "—") parts.push(`Open: ${outstandingLabel}`);

  return `${number} — ${parts.join(" — ")}`;
}

export function formatDocumentSummary(
  doc,
  kind = "document",
  fallbackCurrency = "USD",
) {
  const number = getDocumentNumber(doc, kind);
  const totalLabel = formatDocumentAmount(doc, fallbackCurrency, kind);
  if (number && totalLabel !== "—") return `${number} — ${totalLabel}`;
  if (number) return number;
  return "—";
}
