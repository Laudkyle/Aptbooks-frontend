export const TRANSACTION_TEMPLATE_SPECS = [
  {
    documentType: 'invoice',
    label: 'Invoice',
    family: 'Sales & Customer',
    description: 'Customer-facing sales invoice with commercial and tax details.',
    sections: ['Header identity', 'Customer block', 'Document dates', 'Memo / notes', 'Line items', 'Tax summary', 'Amount totals', 'Workflow / compliance'],
    keyFields: ['Invoice number', 'Customer name', 'Invoice date', 'Due date', 'Currency', 'Memo', 'Line description', 'Quantity', 'Unit price', 'Revenue account', 'Tax totals', 'Status'],
  },
  {
    documentType: 'bill',
    label: 'Bill',
    family: 'Purchasing & Vendor',
    description: 'Vendor bill with payable and expense allocation details.',
    sections: ['Header identity', 'Vendor block', 'Document dates', 'Memo / notes', 'Line items', 'Tax summary', 'Amount totals', 'Workflow / compliance'],
    keyFields: ['Bill number', 'Vendor name', 'Bill date', 'Due date', 'Currency', 'Memo', 'Line description', 'Quantity', 'Unit price', 'Expense account', 'Tax totals', 'Status'],
  },
  {
    documentType: 'receipt',
    label: 'Customer Receipt',
    family: 'Sales & Customer',
    description: 'Receipt for incoming customer payments and invoice allocations.',
    sections: ['Header identity', 'Customer block', 'Receipt date', 'Cash / bank details', 'Allocation table', 'Amount totals', 'Memo / notes', 'Workflow'],
    keyFields: ['Receipt number', 'Customer name', 'Receipt date', 'Cash account', 'Currency', 'Amount received', 'Allocated amount', 'Unallocated amount', 'Applied invoice references', 'Memo', 'Status'],
  },
  {
    documentType: 'payment_out',
    label: 'Vendor Payment',
    family: 'Purchasing & Vendor',
    description: 'Outbound payment voucher for vendor settlements.',
    sections: ['Header identity', 'Vendor block', 'Payment date', 'Cash / bank details', 'Payment method', 'Allocation table', 'Amount totals', 'Workflow'],
    keyFields: ['Payment number', 'Vendor name', 'Payment date', 'Cash account', 'Payment method', 'Currency', 'Amount paid', 'Allocated amount', 'Unallocated amount', 'Bill references', 'Status'],
  },
  {
    documentType: 'credit_note',
    label: 'Credit Note',
    family: 'Sales & Customer',
    description: 'Customer credit note with applications against invoices.',
    sections: ['Header identity', 'Customer block', 'Document dates', 'Reason / memo', 'Line items or amount basis', 'Applications', 'Amount totals', 'Workflow'],
    keyFields: ['Credit note number', 'Customer name', 'Credit note date', 'Currency', 'Reason', 'Total amount', 'Applied invoices', 'Remaining balance', 'Status'],
  },
  {
    documentType: 'debit_note',
    label: 'Debit Note',
    family: 'Purchasing & Vendor',
    description: 'Vendor-facing debit note with bill applications.',
    sections: ['Header identity', 'Vendor block', 'Document dates', 'Reason / memo', 'Line items or amount basis', 'Applications', 'Amount totals', 'Workflow'],
    keyFields: ['Debit note number', 'Vendor name', 'Debit note date', 'Currency', 'Reason', 'Total amount', 'Applied bills', 'Remaining balance', 'Status'],
  },
  {
    documentType: 'quotation',
    label: 'Quotation',
    family: 'Sales & Customer',
    description: 'Commercial quote before order confirmation.',
    sections: ['Header identity', 'Customer block', 'Document date', 'Validity / due information', 'Reference', 'Memo / notes', 'Line items', 'Amount totals', 'Workflow'],
    keyFields: ['Quotation number', 'Customer name', 'Document date', 'Validity date', 'Reference', 'Currency', 'Line description', 'Quantity', 'Unit price', 'Total amount', 'Status'],
  },
  {
    documentType: 'sales_order',
    label: 'Sales Order',
    family: 'Sales & Customer',
    description: 'Confirmed customer order awaiting fulfillment or invoicing.',
    sections: ['Header identity', 'Customer block', 'Document dates', 'Reference', 'Memo / notes', 'Line items', 'Amount totals', 'Workflow'],
    keyFields: ['Sales order number', 'Customer name', 'Order date', 'Due date', 'Reference', 'Currency', 'Line description', 'Quantity', 'Unit price', 'Total amount', 'Status'],
  },
  {
    documentType: 'purchase_requisition',
    label: 'Purchase Requisition',
    family: 'Purchasing & Vendor',
    description: 'Internal request to procure goods or services.',
    sections: ['Header identity', 'Requester / partner block', 'Document date', 'Reference', 'Memo / notes', 'Requested lines', 'Amount totals', 'Workflow'],
    keyFields: ['Requisition number', 'Document date', 'Partner / requester', 'Reference', 'Currency', 'Line description', 'Quantity', 'Unit price', 'Requested amount', 'Status'],
  },
  {
    documentType: 'purchase_order',
    label: 'Purchase Order',
    family: 'Purchasing & Vendor',
    description: 'Formal order sent to a vendor.',
    sections: ['Header identity', 'Vendor block', 'Document dates', 'Reference', 'Memo / notes', 'Ordered lines', 'Amount totals', 'Workflow'],
    keyFields: ['Purchase order number', 'Vendor name', 'Order date', 'Due date', 'Reference', 'Currency', 'Line description', 'Quantity', 'Unit price', 'Ordered amount', 'Status'],
  },
  {
    documentType: 'goods_receipt',
    label: 'Goods Receipt',
    family: 'Purchasing & Vendor',
    description: 'Operational receipt evidencing goods received from vendors.',
    sections: ['Header identity', 'Vendor block', 'Receipt date', 'Source document reference', 'Inventory / posting lines', 'Account references', 'Amount totals', 'Workflow / posting'],
    keyFields: ['Goods receipt number', 'Receipt date', 'Vendor name', 'Source document', 'Primary account', 'Line description', 'Quantity received', 'Unit price', 'Line total', 'Status'],
  },
  {
    documentType: 'expense',
    label: 'Expense',
    family: 'Financial & Expenses',
    description: 'Expense voucher with posting lines and reimbursement detail.',
    sections: ['Header identity', 'Employee / vendor block', 'Document date', 'Reference', 'Memo / notes', 'Expense lines', 'Account references', 'Amount totals', 'Workflow / posting'],
    keyFields: ['Expense number', 'Document date', 'Partner name', 'Reference', 'Currency', 'Primary account', 'Line description', 'Quantity', 'Unit price', 'Line total', 'Status'],
  },
  {
    documentType: 'petty_cash',
    label: 'Petty Cash',
    family: 'Financial & Expenses',
    description: 'Petty cash voucher used for small cash disbursements.',
    sections: ['Header identity', 'Custodian / payee block', 'Document date', 'Reference', 'Memo / notes', 'Expense lines', 'Cash account', 'Amount totals', 'Workflow / posting'],
    keyFields: ['Voucher number', 'Document date', 'Payee / partner', 'Reference', 'Cash account', 'Currency', 'Line description', 'Quantity', 'Unit price', 'Line total', 'Status'],
  },
  {
    documentType: 'advance',
    label: 'Advance',
    family: 'Financial & Expenses',
    description: 'Advance disbursement or settlement request.',
    sections: ['Header identity', 'Beneficiary block', 'Document date', 'Advance type', 'Primary and cash accounts', 'Reference', 'Amount summary', 'Workflow / posting'],
    keyFields: ['Advance number', 'Document date', 'Advance type', 'Beneficiary', 'Cash account', 'Primary account', 'Currency', 'Amount total', 'Reference', 'Status'],
  },
  {
    documentType: 'return',
    label: 'Return',
    family: 'Financial & Expenses',
    description: 'Sales or purchase return tied back to a source document.',
    sections: ['Header identity', 'Counterparty block', 'Document date', 'Return type', 'Source document reference', 'Return lines', 'Amount totals', 'Workflow / posting'],
    keyFields: ['Return number', 'Document date', 'Return type', 'Counterparty', 'Source document', 'Currency', 'Line description', 'Quantity', 'Unit price', 'Return total', 'Status'],
  },
  {
    documentType: 'refund',
    label: 'Refund',
    family: 'Financial & Expenses',
    description: 'Cash or bank refund issued or received against a counterparty.',
    sections: ['Header identity', 'Counterparty block', 'Document date', 'Refund type', 'Cash and primary accounts', 'Reference', 'Amount summary', 'Workflow / posting'],
    keyFields: ['Refund number', 'Document date', 'Refund type', 'Counterparty', 'Cash account', 'Primary account', 'Currency', 'Amount total', 'Reference', 'Status'],
  },
];

export const TRANSACTION_TEMPLATE_SPECS_BY_TYPE = Object.fromEntries(
  TRANSACTION_TEMPLATE_SPECS.map((item) => [item.documentType, item])
);

export const TRANSACTION_DOCUMENT_TYPE_OPTIONS = TRANSACTION_TEMPLATE_SPECS.map((item) => ({
  value: item.documentType,
  label: item.label,
}));

export function getTemplateSpec(documentType) {
  return TRANSACTION_TEMPLATE_SPECS_BY_TYPE[documentType] ?? null;
}

export function groupTemplateSpecsByFamily() {
  return TRANSACTION_TEMPLATE_SPECS.reduce((acc, spec) => {
    if (!acc[spec.family]) acc[spec.family] = [];
    acc[spec.family].push(spec);
    return acc;
  }, {});
}
