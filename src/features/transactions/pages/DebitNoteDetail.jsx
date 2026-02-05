
import React, { useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileMinus2, Send, Trash2, AlertCircle, CheckCircle2, FileText, Calendar, DollarSign, Building2, Mail, Phone, MapPin, List } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makeDebitNotesApi } from '../api/debitNotes.api.js';
import { formatDate } from '../../../shared/utils/formatDate.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

export default function DebitNoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makeDebitNotesApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  // Fetch debit note details
  const { 
    data, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: qk.debitNote(id),
    queryFn: () => api.get(id),
    enabled: !!id,
    staleTime: 30000,
    retry: 2
  });

  // Extract debit note data - data is already the debit note object
  const note = data?.data ?? data;
  
  // Extract applications - use applications array from your data structure
  const applications = note?.applications || [];
  const lines = note?.lines || [];

  const status = (note?.status ?? 'draft').toLowerCase();

  // Action state
  const [action, setAction] = useState(null);
  const [applyBody, setApplyBody] = useState({ bill_id: '', amount_applied: '' });
  const [voidBody, setVoidBody] = useState({ reason: '' });

  // Form validation
  const isApplyFormValid = useMemo(() => {
    const amount = parseFloat(applyBody.amount_applied);
    return applyBody.bill_id.trim() !== '' && !isNaN(amount) && amount > 0;
  }, [applyBody]);

  // Calculate remaining amount - use balance.remaining if available
  const remainingAmount = useMemo(() => {
    if (note?.balance?.remaining !== undefined) {
      return parseFloat(note.balance.remaining);
    }
    
    // Fallback calculation
    const totalAmount = parseFloat(note?.total ?? note?.amount ?? 0);
    const appliedTotal = applications.reduce((sum, app) => {
      return sum + (parseFloat(app.amount_applied ?? 0));
    }, 0);
    return totalAmount - appliedTotal;
  }, [note, applications]);

  // Calculate total applied amount
  const totalApplied = useMemo(() => {
    if (note?.balance?.applied !== undefined) {
      return parseFloat(note.balance.applied);
    }
    
    return applications.reduce((sum, app) => {
      return sum + (parseFloat(app.amount_applied ?? 0));
    }, 0);
  }, [note, applications]);

  // Format currency
  const formatCurrency = useCallback((amount, currencyCode = 'USD') => {
    if (amount == null || amount === '') return '—';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '—';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  }, []);

  // Get status badge configuration
  const getStatusConfig = useCallback((status) => {
    const configs = {
      issued: { tone: 'brand', label: 'Issued', icon: Send },
      applied: { tone: 'success', label: 'Applied', icon: CheckCircle2 },
      draft: { tone: 'muted', label: 'Draft', icon: FileText },
      voided: { tone: 'error', label: 'Voided', icon: Trash2 },
      partial: { tone: 'warning', label: 'Partially Applied', icon: DollarSign }
    };
    
    return configs[status] || { tone: 'muted', label: status || 'Draft', icon: FileText };
  }, []);

  const statusConfig = getStatusConfig(status);

  // Action handlers
  const handleOpenAction = useCallback((actionType) => {
    setAction(actionType);
  }, []);

  const handleCloseAction = useCallback(() => {
    setAction(null);
    setApplyBody({ bill_id: '', amount_applied: '' });
    setVoidBody({ reason: '' });
  }, []);

  const handleApplyBodyChange = useCallback((field, value) => {
    setApplyBody(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleVoidReasonChange = useCallback((e) => {
    setVoidBody({ reason: e.target.value });
  }, []);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Mutation for actions
  const runAction = useMutation({
    mutationFn: async () => {
      if (action === 'issue') return api.issue(id);
      if (action === 'apply') {
        const amount = parseFloat(applyBody.amount_applied);
        return api.apply(id, { 
          bill_id: applyBody.bill_id.trim(), 
          amount_applied: amount 
        });
      }
      if (action === 'void') return api.void(id, voidBody);
      throw new Error('Unknown action');
    },
    onSuccess: (response) => {
      const messages = {
        issue: 'Debit note issued successfully',
        apply: 'Debit note applied to bill',
        void: 'Debit note voided'
      };
      toast.success(messages[action] || 'Action completed');
      qc.invalidateQueries({ queryKey: qk.debitNote(id) });
      qc.invalidateQueries({ queryKey: qk.debitNotes() });
      handleCloseAction();
    },
    onError: (err) => {
      const message = err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? 'Action failed';
      toast.error(message);
    }
  });

  // Determine available actions based on status
  const canIssue = status === 'draft';
  const canApply = (status === 'issued' || status === 'partial') && remainingAmount > 0;
  const canVoid = status !== 'voided';

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Loading debit note..."
          subtitle={`Debit note ID: ${id}`}
          icon={FileMinus2}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={handleBack}>
              Back
            </Button>
          }
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-500">Loading debit note details...</div>
          </div>
        </ContentCard>
      </div>
    );
  }

  // Error state
  if (isError || !note) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Error loading debit note"
          subtitle={`Debit note ID: ${id}`}
          icon={FileMinus2}
          actions={
            <Button variant="outline" leftIcon={ArrowLeft} onClick={handleBack}>
              Back
            </Button>
          }
        />
        <ContentCard>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-sm font-medium text-slate-900">Failed to load debit note</div>
            <div className="text-sm text-slate-500">{error?.message ?? 'Debit note not found'}</div>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
              Retry
            </Button>
          </div>
        </ContentCard>
      </div>
    );
  }

  // Use properties similar to credit note structure
  const debitNoteNumber = note?.debit_note_no ?? note?.code ?? id;
  const vendorName = note?.vendor_name ?? note?.vendor_id ?? '—';
  const debitNoteDate = note?.debit_note_date;
  const totalAmount = parseFloat(note?.total ?? note?.amount ?? 0);
  const subtotal = parseFloat(note?.subtotal ?? 0);
  const taxTotal = parseFloat(note?.tax_total ?? 0);
  const memo = note?.memo;
  const currencyCode = note?.currency_code || 'USD';

  return (
    <div className="space-y-6">
      <PageHeader
        title={debitNoteNumber}
        subtitle={`Debit note • ${formatDate(debitNoteDate)}`}
        icon={FileMinus2}
        actions={
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              leftIcon={ArrowLeft} 
              onClick={handleBack}
              aria-label="Go back"
            >
              Back
            </Button>
            {canIssue && (
              <Button 
                variant="outline" 
                leftIcon={Send} 
                onClick={() => handleOpenAction('issue')}
                aria-label="Issue debit note"
              >
                Issue
              </Button>
            )}
            {canApply && (
              <Button 
                onClick={() => handleOpenAction('apply')}
                aria-label="Apply debit note to bill"
              >
                Apply to Bill
              </Button>
            )}
            {canVoid && (
              <Button 
                variant="danger" 
                leftIcon={Trash2} 
                onClick={() => handleOpenAction('void')}
                aria-label="Void debit note"
              >
                Void
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Card */}
          <ContentCard>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="text-base font-semibold text-slate-900">Debit Note Summary</div>
                <div className="mt-1 text-sm text-slate-500">Vendor credit and transaction details</div>
              </div>
              <Badge tone={statusConfig.tone}>
                <statusConfig.icon className="h-3.5 w-3.5 mr-1.5" />
                {statusConfig.label}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Vendor */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-2">
                  <Building2 className="h-3.5 w-3.5" />
                  Vendor
                </div>
                <div className="text-sm font-semibold text-slate-900">{vendorName}</div>
                {note.vendor_code && (
                  <div className="text-xs text-slate-500 mt-1">Code: {note.vendor_code}</div>
                )}
              </div>

              {/* Date */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Debit Note Date
                </div>
                <div className="text-sm font-semibold text-slate-900">{formatDate(debitNoteDate)}</div>
              </div>

              {/* Total Amount */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-2">
                  <DollarSign className="h-3.5 w-3.5" />
                  Total Amount
                </div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {formatCurrency(totalAmount, currencyCode)}
                </div>
                {currencyCode && currencyCode !== 'USD' && (
                  <div className="text-xs text-slate-500 mt-1">Currency: {currencyCode}</div>
                )}
              </div>

              {/* Debit Note Number */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-2">
                  <FileMinus2 className="h-3.5 w-3.5" />
                  Reference Number
                </div>
                <div className="text-sm font-semibold text-slate-900 font-mono">
                  {debitNoteNumber}
                </div>
              </div>
            </div>

            {/* Memo */}
            {memo && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="text-xs font-medium text-slate-600 mb-2">Memo</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{memo}</div>
              </div>
            )}
          </ContentCard>

          {/* Vendor Contact Information */}
          {(note.vendor_email || note.vendor_phone) && (
            <ContentCard>
              <div className="text-base font-semibold text-slate-900 mb-4">Vendor Contact Information</div>
              <div className="grid gap-4 md:grid-cols-2">
                {note.vendor_email && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-2">
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </div>
                    <div className="text-sm text-slate-900 break-all">
                      {note.vendor_email}
                    </div>
                  </div>
                )}

                {note.vendor_phone && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-2">
                      <Phone className="h-3.5 w-3.5" />
                      Phone
                    </div>
                    <div className="text-sm text-slate-900">
                      {note.vendor_phone}
                    </div>
                  </div>
                )}
              </div>
            </ContentCard>
          )}

          {/* Line Items */}
          {lines.length > 0 && (
            <ContentCard>
              <div className="text-base font-semibold text-slate-900 mb-4">Line Items</div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Tax Amount
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Line Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {line.description || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {parseFloat(line.quantity || 0).toFixed(4)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">
                          {formatCurrency(line.unit_price, currencyCode)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">
                          {formatCurrency(line.tax_amount, currencyCode)}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">
                          {formatCurrency(line.line_total, currencyCode)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        Subtotal:
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        Tax:
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                        {formatCurrency(subtotal, currencyCode)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        Total:
                      </td>
                      <td className="px-4 py-3 text-right text-lg font-bold text-slate-900">
                        {formatCurrency(totalAmount, currencyCode)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </ContentCard>
          )}

          {/* Applications */}
          {applications.length > 0 && (
            <ContentCard>
              <div className="text-base font-semibold text-slate-900 mb-4">Bill Applications</div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Bill ID
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Amount Applied
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Applied Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {applications.map((application, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-900 font-mono text-xs">
                          {application.bill_id ? `${application.bill_id.substring(0, 12)}...` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">
                          {formatCurrency(application.amount_applied, currencyCode)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {formatDate(application.applied_at ?? application.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        Total Applied:
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                        {formatCurrency(totalApplied, currencyCode)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </ContentCard>
          )}

          {/* Balance Summary */}
          <ContentCard>
            <div className="text-base font-semibold text-slate-900 mb-4">Balance Summary</div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="text-xs font-medium text-slate-600 mb-2">Total Amount</div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {formatCurrency(totalAmount, currencyCode)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {lines.length} line{lines.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="text-xs font-medium text-slate-600 mb-2">Applied Amount</div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {formatCurrency(totalApplied, currencyCode)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {applications.length} application{applications.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="text-xs font-medium text-slate-600 mb-2">Remaining Balance</div>
                <div className={`text-lg font-bold tabular-nums ${remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(remainingAmount, currencyCode)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {remainingAmount > 0 ? 'Available for application' : 'Fully applied'}
                </div>
              </div>
            </div>
          </ContentCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions Guide */}
          <ContentCard>
            <div className="text-sm font-semibold text-slate-900 mb-3">Quick Actions</div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-xs">
                <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  canIssue ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  1
                </div>
                <div>
                  <div className="font-medium text-slate-700">Issue debit note</div>
                  <div className="text-slate-500 mt-0.5">Make the credit available for use</div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-xs">
                <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  canApply ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  2
                </div>
                <div>
                  <div className="font-medium text-slate-700">Apply to bill</div>
                  <div className="text-slate-500 mt-0.5">Reduce vendor bill balance</div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-xs">
                <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  canVoid ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  3
                </div>
                <div>
                  <div className="font-medium text-slate-700">Void if needed</div>
                  <div className="text-slate-500 mt-0.5">Cancel the debit note</div>
                </div>
              </div>
            </div>
          </ContentCard>

          {/* Status Info */}
          <ContentCard>
            <div className="text-sm font-semibold text-slate-900 mb-3">Status Information</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Current Status</span>
                <span className="font-medium text-slate-900 capitalize">{statusConfig.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Currency</span>
                <span className="font-medium text-slate-900">{currencyCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">FX Rate</span>
                <span className="font-medium text-slate-900">{parseFloat(note?.fx_rate || 1).toFixed(6)}</span>
              </div>
              {note?.created_at && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Created Date</span>
                  <span className="font-medium text-slate-900">{formatDate(note.created_at, { includeTime: true })}</span>
                </div>
              )}
              {note?.issued_at && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Issued Date</span>
                  <span className="font-medium text-slate-900">{formatDate(note.issued_at, { includeTime: true })}</span>
                </div>
              )}
              {note?.voided_at && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Voided Date</span>
                  <span className="font-medium text-slate-900">{formatDate(note.voided_at, { includeTime: true })}</span>
                </div>
              )}
              {note?.void_reason && (
                <div className="pt-2 border-t border-slate-200">
                  <div className="text-slate-600 mb-1">Void Reason</div>
                  <div className="text-slate-700 italic">"{note.void_reason}"</div>
                </div>
              )}
            </div>
          </ContentCard>

          {/* Quick Stats */}
          <ContentCard>
            <div className="text-sm font-semibold text-slate-900 mb-3">Quick Stats</div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Line Items</span>
                <span className="font-medium text-slate-900">{lines.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Applications</span>
                <span className="font-medium text-slate-900">{applications.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(subtotal, currencyCode)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tax Total</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(taxTotal, currencyCode)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-600 font-medium">Remaining Balance</span>
                <span className={`font-bold ${remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(remainingAmount, currencyCode)}
                </span>
              </div>
            </div>
          </ContentCard>
        </div>
      </div>

      {/* Action Modals */}
      
      {/* Issue Modal */}
      <Modal 
        open={action === 'issue'} 
        onClose={handleCloseAction} 
        title="Issue Debit Note"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Send className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <div className="font-medium mb-1">Issue this debit note?</div>
                <div className="text-blue-700">
                  Issuing makes the debit note available for application to vendor bills. 
                  This action cannot be undone.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Debit Note Number</span>
                <span className="font-medium font-mono">{debitNoteNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Amount</span>
                <span className="font-semibold tabular-nums">{formatCurrency(totalAmount, currencyCode)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Vendor</span>
                <span className="font-medium">{vendorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Currency</span>
                <span className="font-medium">{currencyCode}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={handleCloseAction} disabled={runAction.isPending}>
            Cancel
          </Button>
          <Button 
            loading={runAction.isPending} 
            onClick={() => runAction.mutate()}
            leftIcon={Send}
          >
            Issue Debit Note
          </Button>
        </div>
      </Modal>

      {/* Apply Modal */}
      <Modal 
        open={action === 'apply'} 
        onClose={handleCloseAction} 
        title="Apply to Bill"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <div className="font-medium mb-1">Apply credit to a vendor bill</div>
                <div className="text-blue-700">
                  Enter the bill ID and the amount to apply. The bill balance will be reduced by this amount.
                </div>
              </div>
            </div>
          </div>

          <Input 
            label="Bill ID" 
            value={applyBody.bill_id} 
            onChange={(e) => handleApplyBodyChange('bill_id', e.target.value)}
            placeholder="Enter bill UUID..."
            required
            aria-label="Bill ID to apply credit to"
          />
          
          <Input
            label="Amount to Apply"
            value={applyBody.amount_applied}
            onChange={(e) => handleApplyBodyChange('amount_applied', e.target.value)}
            type="number"
            step="0.01"
            min="0"
            max={remainingAmount || undefined}
            placeholder="0.00"
            required
            aria-label="Amount to apply to bill"
            helperText={`Available balance: ${formatCurrency(remainingAmount, currencyCode)}`}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={handleCloseAction} disabled={runAction.isPending}>
            Cancel
          </Button>
          <Button 
            loading={runAction.isPending} 
            onClick={() => runAction.mutate()}
            disabled={!isApplyFormValid}
          >
            Apply to Bill
          </Button>
        </div>
      </Modal>

      {/* Void Modal */}
      <Modal 
        open={action === 'void'} 
        onClose={handleCloseAction} 
        title="Void Debit Note"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-900">
                <div className="font-medium mb-1">Warning: This action cannot be undone</div>
                <div className="text-red-700">
                  Voiding this debit note will permanently cancel it. Any applied amounts will need to be reversed separately.
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Reason for Voiding (Optional)
            </label>
            <Textarea
              value={voidBody.reason}
              onChange={handleVoidReasonChange}
              placeholder="Enter reason for voiding..."
              rows={3}
              aria-label="Reason for voiding debit note"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Debit Note Number</span>
                <span className="font-medium font-mono">{debitNoteNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Amount</span>
                <span className="font-semibold tabular-nums">{formatCurrency(totalAmount, currencyCode)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Applied Amount</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(totalApplied, currencyCode)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Remaining Balance</span>
                <span className={`font-medium tabular-nums ${remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(remainingAmount, currencyCode)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-600 font-medium">Status</span>
                <Badge tone={statusConfig.tone}>{statusConfig.label}</Badge>
              </div>
            </div></div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={handleCloseAction} disabled={runAction.isPending}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            loading={runAction.isPending} 
            onClick={() => runAction.mutate()}
            leftIcon={Trash2}
          >
            Void Debit Note
          </Button>
        </div>
      </Modal>
    </div>
  );
}   