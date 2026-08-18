function dateOnly(value) {
  return value ? String(value).slice(0, 10) : '';
}

function asObject(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
}

function taxComponents(line) {
  return line?.tax_breakdown?.components ?? line?.taxes ?? [];
}

function componentMeta(component) {
  return component?.tax_code_meta ?? component?.taxCodeMeta ?? {};
}

function isWithholding(component) {
  return String(component?.tax_type ?? componentMeta(component)?.tax_type ?? '').toUpperCase() === 'WITHHOLDING';
}

function lineTaxFields(line) {
  const components = taxComponents(line);
  const withholding = components.find(isWithholding);
  const primary = components.find((component) => !isWithholding(component));
  const recoverableFraction = primary?.recoverable_percent ?? primary?.recoverablePercent;
  return {
    taxCodeId: line?.tax_code_id ?? line?.taxCodeId ?? '',
    withholdingApplicable: !!withholding,
    withholdingTaxCodeId: withholding?.source_tax_code_id ?? withholding?.tax_code_id ?? withholding?.taxCodeId ?? '',
    withholdingRate: withholding?.tax_rate ?? withholding?.taxRate ?? '',
    recoverablePercent: recoverableFraction == null ? 100 : Number(recoverableFraction) * 100,
    exemptionReasonCode: primary?.metadata?.exemptionReasonCode ?? primary?.metadata?.exemption_reason_code ?? ''
  };
}

function snapshotContext(lines = []) {
  for (const line of lines) {
    const snapshot = asObject(line?.tax_snapshot_json ?? line?.taxSnapshotJson);
    if (snapshot?.context) return snapshot.context;
  }
  return {};
}

function pricingMode(detail, lines = []) {
  const explicit = detail?.detail_meta?.tax?.pricing_mode;
  if (explicit === 'inclusive' || explicit === 'exclusive') return explicit;
  const modes = [...new Set(lines.map((line) => line?.display_amounts?.pricing_mode).filter((mode) => mode === 'inclusive' || mode === 'exclusive'))];
  return modes.length === 1 ? modes[0] : 'exclusive';
}

export function hydrateInvoiceDraft(detail = {}) {
  const invoice = detail.invoice ?? detail.data?.invoice ?? {};
  const lines = detail.lines ?? detail.data?.lines ?? [];
  const ctx = snapshotContext(lines);
  return {
    customerId: invoice.customer_id ?? invoice.customerId ?? '',
    invoiceDate: dateOnly(invoice.invoice_date ?? invoice.invoiceDate),
    dueDate: dateOnly(invoice.due_date ?? invoice.dueDate),
    memo: invoice.memo ?? '',
    taxDate: dateOnly(ctx.taxDate ?? invoice.invoice_date ?? invoice.invoiceDate),
    pricingMode: pricingMode(detail, lines),
    supplyType: ctx.supplyType ?? ctx.supply_type ?? 'goods',
    placeOfSupplyCountryCode: ctx.placeOfSupplyCountryCode ?? ctx.place_of_supply_country_code ?? '',
    buyerReference: ctx.buyerReference ?? ctx.buyer_reference ?? invoice.buyer_reference ?? '',
    jurisdictionId: ctx.jurisdictionId ?? ctx.jurisdiction_id ?? '',
    lines: lines.map((line) => ({
      description: line.description ?? '',
      quantity: line.quantity ?? 1,
      unitPrice: line.unit_price ?? line.unitPrice ?? 0,
      revenueAccountId: line.revenue_account_id ?? line.revenueAccountId ?? '',
      ...lineTaxFields(line)
    }))
  };
}

export function hydrateBillDraft(detail = {}) {
  const bill = detail.bill ?? detail.data?.bill ?? {};
  const lines = detail.lines ?? detail.data?.lines ?? [];
  const ctx = snapshotContext(lines);
  return {
    vendorId: bill.vendor_id ?? bill.vendorId ?? '',
    billDate: dateOnly(bill.bill_date ?? bill.billDate),
    dueDate: dateOnly(bill.due_date ?? bill.dueDate),
    memo: bill.memo ?? '',
    taxDate: dateOnly(ctx.taxDate ?? bill.bill_date ?? bill.billDate),
    pricingMode: pricingMode(detail, lines),
    supplyType: ctx.supplyType ?? ctx.supply_type ?? 'services',
    placeOfSupplyCountryCode: ctx.placeOfSupplyCountryCode ?? ctx.place_of_supply_country_code ?? '',
    supplierReference: bill.supplier_reference ?? bill.supplierReference ?? '',
    jurisdictionId: ctx.jurisdictionId ?? ctx.jurisdiction_id ?? '',
    lines: lines.map((line) => ({
      description: line.description ?? '',
      quantity: line.quantity ?? 1,
      unitPrice: line.unit_price ?? line.unitPrice ?? 0,
      expenseAccountId: line.expense_account_id ?? line.expenseAccountId ?? '',
      ...lineTaxFields(line)
    }))
  };
}

export function hydrateReceiptDraft(detail = {}) {
  const receipt = detail.customerReceipt ?? detail.data?.customerReceipt ?? {};
  const allocations = detail.allocations ?? detail.data?.allocations ?? [];
  return {
    customerId: receipt.customer_id ?? receipt.customerId ?? '',
    receiptDate: dateOnly(receipt.receipt_date ?? receipt.receiptDate),
    paymentMethodId: receipt.payment_method_id ?? receipt.paymentMethodId ?? '',
    cashAccountId: receipt.cash_account_id ?? receipt.cashAccountId ?? '',
    amountTotal: String(receipt.amount_total ?? receipt.amountTotal ?? ''),
    memo: receipt.memo ?? '',
    allocations: allocations.map((allocation) => ({
      invoiceId: allocation.invoice_id ?? allocation.invoiceId ?? '',
      amountApplied: String(allocation.amount_applied ?? allocation.amountApplied ?? '')
    }))
  };
}

export function hydrateVendorPaymentDraft(detail = {}) {
  const payment = detail.vendorPayment ?? detail.data?.vendorPayment ?? {};
  const allocations = detail.allocations ?? detail.data?.allocations ?? [];
  return {
    formData: {
      vendorId: payment.vendor_id ?? payment.vendorId ?? '',
      paymentDate: dateOnly(payment.payment_date ?? payment.paymentDate),
      paymentMethodId: payment.payment_method_id ?? payment.paymentMethodId ?? '',
      cashAccountId: payment.cash_account_id ?? payment.cashAccountId ?? '',
      amountTotal: String(payment.amount_total ?? payment.amountTotal ?? ''),
      reference: payment.reference ?? '',
      memo: payment.memo ?? ''
    },
    allocations: allocations.map((allocation) => ({
      billId: allocation.bill_id ?? allocation.billId ?? '',
      amountApplied: String(allocation.amount_applied ?? allocation.amountApplied ?? '')
    }))
  };
}

export function hydrateCreditNoteDraft(detail = {}) {
  const note = detail.creditNote ?? detail.credit_note ?? detail.data?.creditNote ?? detail.data?.credit_note ?? (detail.id ? detail : {});
  const lines = detail.lines ?? detail.data?.lines ?? [];
  return {
    customerId: note.customer_id ?? note.customerId ?? '',
    creditNoteDate: dateOnly(note.credit_note_date ?? note.creditNoteDate ?? note.note_date),
    memo: note.memo ?? '',
    lines: lines.map((line) => ({
      description: line.description ?? '',
      quantity: line.quantity ?? 1,
      unitPrice: line.unit_price ?? line.unitPrice ?? 0,
      revenueAccountId: line.revenue_account_id ?? line.revenueAccountId ?? '',
      taxAmount: line.tax_amount ?? 0,
      ...lineTaxFields(line)
    }))
  };
}

export function hydrateDebitNoteDraft(detail = {}) {
  const note = detail.debitNote ?? detail.debit_note ?? detail.data?.debitNote ?? detail.data?.debit_note ?? (detail.id ? detail : {});
  const lines = detail.lines ?? detail.data?.lines ?? [];
  return {
    vendorId: note.vendor_id ?? note.vendorId ?? '',
    debitNoteDate: dateOnly(note.debit_note_date ?? note.debitNoteDate ?? note.note_date),
    memo: note.memo ?? '',
    lines: lines.map((line) => ({
      description: line.description ?? '',
      quantity: line.quantity ?? 1,
      unitPrice: line.unit_price ?? line.unitPrice ?? 0,
      expenseAccountId: line.expense_account_id ?? line.expenseAccountId ?? '',
      taxAmount: line.tax_amount ?? 0,
      ...lineTaxFields(line)
    }))
  };
}

export function hydrateOperationalDraft(detail = {}, emptyForm = {}) {
  const header = detail.header ?? detail.data?.header ?? {};
  const lines = detail.lines ?? detail.data?.lines ?? [];
  const metadata = asObject(header.metadata ?? header.meta_json ?? header.meta);
  return {
    ...emptyForm,
    partnerId: header.counterparty_partner_id ?? header.counterpartyPartnerId ?? header.partner_id ?? header.partnerId ?? emptyForm.partnerId ?? '',
    employeeId: header.employee_id ?? header.employeeId ?? emptyForm.employeeId ?? '',
    date: dateOnly(header.document_date ?? header.documentDate ?? header.date) || emptyForm.date,
    dueDate: dateOnly(header.due_date ?? header.dueDate),
    memo: header.memo ?? '',
    reference: header.reference ?? '',
    sourceDocumentId: header.source_document_id ?? header.sourceDocumentId ?? '',
    cashAccountId: header.cash_account_id ?? header.cashAccountId ?? '',
    primaryAccountId: header.primary_account_id ?? header.primaryAccountId ?? '',
    amountTotal: String(header.amount_total ?? header.amountTotal ?? emptyForm.amountTotal ?? ''),
    ...metadata,
    lines: lines.map((line) => ({
      description: line.description ?? '',
      quantity: line.quantity ?? 1,
      unitPrice: line.unit_price ?? line.unitPrice ?? 0,
      accountId: line.account_id ?? line.accountId ?? '',
      taxCodeId: line.tax_code_id ?? line.taxCodeId ?? ''
    }))
  };
}
