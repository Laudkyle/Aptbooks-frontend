import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makePartnersApi } from '../../business/api/partners.api.js';
import { makeInvoicesApi } from '../../transactions/api/invoices.api.js';
import { makeCreditNotesApi } from '../../transactions/api/creditNotes.api.js';
import { makeDebitNotesApi } from '../../transactions/api/debitNotes.api.js';
import { toOptions, NONE_OPTION } from '../../../shared/utils/options.js';

function rowsOf(d) {
  return Array.isArray(d?.items) ? d.items : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
}

function moneyLike(v) {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function docNumber(row) {
  return row.document_no ?? row.documentNo ?? row.number ?? row.code ?? row.reference_no ?? row.referenceNo ?? row.id;
}

function amountLike(row) {
  return row.total_amount ?? row.totalAmount ?? row.amount_total ?? row.amountTotal ?? row.amount ?? row.balance_due ?? row.balanceDue ?? row.open_amount ?? row.openAmount;
}

function openBalanceLike(row) {
  return row.open_amount ?? row.openAmount ?? row.balance_due ?? row.balanceDue ?? row.amount_due ?? row.amountDue ?? row.remaining_amount ?? row.remainingAmount ?? null;
}

function statusLike(row) {
  return row.status ?? row.workflow_status ?? row.workflowStatus ?? row.state;
}

function normalizedStatus(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isPositiveOpenItem(row) {
  const openBalance = openBalanceLike(row);
  if (openBalance === null || openBalance === undefined || openBalance === '') return true;
  const n = Number(openBalance);
  return !Number.isFinite(n) || n > 0;
}

function isCollectibleStatus(row) {
  const s = normalizedStatus(statusLike(row));
  return !['paid', 'closed', 'settled', 'cancelled', 'canceled', 'voided', 'void'].includes(s);
}

function actionAllowedTypes(action) {
  switch (action) {
    case 'payment_plan':
    case 'writeoff':
      return new Set(['invoice', 'debit_note']);
    case 'dispute':
      return new Set(['invoice', 'debit_note', 'credit_note']);
    default:
      return new Set(['invoice', 'debit_note', 'credit_note']);
  }
}

function actionTitle(type) {
  if (type === 'invoice') return 'Invoice';
  if (type === 'debit_note') return 'Debit note';
  if (type === 'credit_note') return 'Credit note';
  return type;
}

export function useArEntityOptions({ action, customerId = '', includeInactive = false } = {}) {
  const { http } = useApi();
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);
  const invoicesApi = useMemo(() => makeInvoicesApi(http), [http]);
  const creditNotesApi = useMemo(() => makeCreditNotesApi(http), [http]);
  const debitNotesApi = useMemo(() => makeDebitNotesApi(http), [http]);

  const partnersQ = useQuery({ queryKey: ['ar-form-partners'], queryFn: () => partnersApi.list({ type: 'customer' }), staleTime: 60_000 });
  const invoicesQ = useQuery({ queryKey: ['ar-form-invoices'], queryFn: () => invoicesApi.list(), staleTime: 30_000 });
  const creditNotesQ = useQuery({ queryKey: ['ar-form-credit-notes'], queryFn: () => creditNotesApi.list(), staleTime: 30_000 });
  const debitNotesQ = useQuery({ queryKey: ['ar-form-debit-notes'], queryFn: () => debitNotesApi.list(), staleTime: 30_000 });

  const partners = rowsOf(partnersQ.data);
  const invoices = rowsOf(invoicesQ.data);
  const creditNotes = rowsOf(creditNotesQ.data);
  const debitNotes = rowsOf(debitNotesQ.data);

  const partnerMap = useMemo(() => new Map(partners.map((p) => [String(p.id), p])), [partners]);

  const customerOptions = useMemo(
    () => [NONE_OPTION, ...toOptions(partners, { valueKey: 'id', label: (p) => `${p.code ?? ''} ${p.name ?? p.business_name ?? ''}`.trim() || String(p.id) })],
    [partners]
  );

  const allRecords = useMemo(() => {
    const build = (type, rows) =>
      rows.map((row) => {
        const id = String(row.id ?? '');
        const partnerId = String(row.customer_id ?? row.customerId ?? row.partner_id ?? row.partnerId ?? '');
        const partner = partnerMap.get(partnerId);
        const partnerLabel = partner ? `${partner.code ?? ''} ${partner.name ?? partner.business_name ?? ''}`.trim() : partnerId;
        const amount = moneyLike(amountLike(row));
        const openBalance = moneyLike(openBalanceLike(row));
        const status = statusLike(row);
        const title = actionTitle(type);
        return {
          type,
          id,
          partnerId,
          row,
          status: normalizedStatus(status),
          documentNumber: docNumber(row),
          value: `${type}:${id}`,
          label: `${title} · ${docNumber(row)}${partnerLabel ? ` · ${partnerLabel}` : ''}${openBalance ? ` · Open ${openBalance}` : amount ? ` · ${amount}` : ''}${status ? ` · ${status}` : ''}`
        };
      }).filter((x) => x.id);

    return [
      ...build('invoice', invoices),
      ...build('debit_note', debitNotes),
      ...build('credit_note', creditNotes)
    ];
  }, [invoices, creditNotes, debitNotes, partnerMap]);

  const allowedTypes = useMemo(() => actionAllowedTypes(action), [action]);

  const filteredRecords = useMemo(() => {
    return allRecords.filter((record) => {
      if (!allowedTypes.has(record.type)) return false;
      if (customerId && String(record.partnerId) !== String(customerId)) return false;
      if (!includeInactive) {
        if ((action === 'payment_plan' || action === 'writeoff') && !isPositiveOpenItem(record.row)) return false;
        if ((action === 'payment_plan' || action === 'writeoff') && !isCollectibleStatus(record.row)) return false;
        if (action === 'dispute' && ['voided', 'void', 'cancelled', 'canceled'].includes(record.status)) return false;
      }
      return true;
    });
  }, [allRecords, allowedTypes, action, customerId, includeInactive]);

  const entityMap = useMemo(() => new Map(allRecords.map((record) => [record.value, record])), [allRecords]);

  const isLoading = partnersQ.isLoading || invoicesQ.isLoading || creditNotesQ.isLoading || debitNotesQ.isLoading;

  return {
    isLoading,
    partners,
    partnerMap,
    customerOptions,
    entityRecords: filteredRecords,
    allEntityRecords: allRecords,
    entityMap,
    entityOptions: [NONE_OPTION, ...filteredRecords.map((x) => ({ value: x.value, label: x.label }))],
    getEntityByValue: (value) => entityMap.get(value) ?? null
  };
}
