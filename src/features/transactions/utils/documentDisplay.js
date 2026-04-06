export function getDocumentNumber(doc, kind = 'document') {
  if (!doc) return '';
  const candidates = kind === 'invoice'
    ? [doc.invoice_no, doc.invoiceNumber, doc.code, doc.reference, doc.number, doc.document_number, doc.id]
    : kind === 'bill'
      ? [doc.bill_no, doc.billNumber, doc.code, doc.reference, doc.number, doc.document_number, doc.id]
      : [doc.number, doc.document_number, doc.code, doc.reference, doc.id];

  return candidates.find((value) => value !== undefined && value !== null && String(value).trim() !== '') || '';
}

export function getDocumentTotal(doc) {
  if (!doc) return null;
  const candidates = [
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
  const raw = candidates.find((value) => value !== undefined && value !== null && value !== '');
  if (raw === undefined) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatDocumentAmount(doc, fallbackCurrency = 'USD') {
  const total = getDocumentTotal(doc);
  if (total == null) return '—';
  const currency = doc?.currency_code || doc?.currencyCode || fallbackCurrency;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(total);
  } catch {
    return `${currency} ${total.toFixed(2)}`;
  }
}

export function formatDocumentOptionLabel(doc, kind = 'document', fallbackCurrency = 'USD') {
  const number = getDocumentNumber(doc, kind) || (kind === 'invoice' ? 'Unnamed invoice' : kind === 'bill' ? 'Unnamed bill' : 'Unnamed document');
  const totalLabel = formatDocumentAmount(doc, fallbackCurrency);
  return `${number} — Total: ${totalLabel}`;
}

export function formatDocumentSummary(doc, kind = 'document', fallbackCurrency = 'USD') {
  const number = getDocumentNumber(doc, kind);
  const totalLabel = formatDocumentAmount(doc, fallbackCurrency);
  if (number && totalLabel !== '—') return `${number} — ${totalLabel}`;
  if (number) return number;
  return '—';
}
