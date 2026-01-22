import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Archive,
  Repeat,
  Plus,
  Save
} from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAssetsApi } from '../api/assets.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { IdempotencyKeyField } from '../../../shared/components/forms/IdempotencyKeyField.jsx';

export default function AssetDetail() {
  const { id } = useParams();
  const { http } = useApi();
  const api = useMemo(() => makeAssetsApi(http), [http]);
  const qc = useQueryClient();

  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['assets', 'fixedAssets', id],
    queryFn: () => api.getFixedAsset(id),
    enabled: !!id
  });

  const status = asset?.status ?? 'draft';
  const statusTone = status === 'active' ? 'success' : status === 'disposed' ? 'danger' : status === 'retired' ? 'warning' : 'muted';

  const [action, setAction] = useState(null); // 'acquire'|'dispose'|'transfer'|'revalue'|'impair'|'schedule'
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState(null);

  const [payload, setPayload] = useState({});

  function openAction(kind) {
    setErrMsg(null);
    setIdempotencyKey('');
    setAction(kind);
    // defaults per schema
    if (kind === 'acquire') {
      setPayload({ periodId: '', entryDate: '', fundingAccountId: '', memo: '' });
    } else if (kind === 'dispose') {
      setPayload({ periodId: '', entryDate: '', proceeds: '', proceedsAccountId: '', memo: '' });
    } else if (kind === 'transfer') {
      setPayload({ eventDate: '', toLocationId: '', toDepartmentId: '', toCostCenterId: '', reference: '', memo: '' });
    } else if (kind === 'revalue') {
      setPayload({ periodId: '', entryDate: '', newValue: '', revaluationReserveAccountId: '', memo: '' });
    } else if (kind === 'impair') {
      setPayload({ periodId: '', entryDate: '', impairmentAmount: '', impairmentLossAccountId: '', memo: '' });
    } else if (kind === 'schedule') {
      setPayload({
        assetId: id,
        method: 'straight_line',
        usefulLifeMonths: '',
        depreciationStartDate: '',
        effectiveStartDate: '',
        effectiveEndDate: '',
        componentCode: ''
      });
    }
  }

  async function runAction() {
    if (!action) return;
    setSaving(true);
    setErrMsg(null);
    try {
      const headers = { 'Idempotency-Key': idempotencyKey };

      if (action === 'acquire') {
        await http.post(`/modules/assets/fixed-assets/${id}/acquire`, payload, { headers });
      } else if (action === 'dispose') {
        await http.post(
          `/modules/assets/fixed-assets/${id}/dispose`,
          {
            periodId: payload.periodId,
            entryDate: payload.entryDate,
            proceeds: payload.proceeds === '' ? undefined : Number(payload.proceeds),
            proceedsAccountId: payload.proceedsAccountId,
            memo: payload.memo || undefined
          },
          { headers }
        );
      } else if (action === 'transfer') {
        await http.post(
          `/modules/assets/fixed-assets/${id}/transfer`,
          {
            eventDate: payload.eventDate,
            toLocationId: payload.toLocationId === '' ? null : payload.toLocationId,
            toDepartmentId: payload.toDepartmentId === '' ? null : payload.toDepartmentId,
            toCostCenterId: payload.toCostCenterId === '' ? null : payload.toCostCenterId,
            reference: payload.reference === '' ? null : payload.reference,
            memo: payload.memo === '' ? null : payload.memo
          },
          { headers }
        );
      } else if (action === 'revalue') {
        await http.post(
          `/modules/assets/fixed-assets/${id}/revalue`,
          {
            periodId: payload.periodId,
            entryDate: payload.entryDate,
            newValue: Number(payload.newValue),
            revaluationReserveAccountId: payload.revaluationReserveAccountId,
            memo: payload.memo || undefined
          },
          { headers }
        );
      } else if (action === 'impair') {
        await http.post(
          `/modules/assets/fixed-assets/${id}/impair`,
          {
            periodId: payload.periodId,
            entryDate: payload.entryDate,
            impairmentAmount: Number(payload.impairmentAmount),
            impairmentLossAccountId: payload.impairmentLossAccountId,
            memo: payload.memo || undefined
          },
          { headers }
        );
      } else if (action === 'schedule') {
        await http.post(
          `/modules/assets/depreciation/schedules`,
          {
            assetId: id,
            method: payload.method || 'straight_line',
            usefulLifeMonths: Number(payload.usefulLifeMonths),
            depreciationStartDate: payload.depreciationStartDate || undefined,
            effectiveStartDate: payload.effectiveStartDate || undefined,
            effectiveEndDate: payload.effectiveEndDate === '' ? null : payload.effectiveEndDate,
            componentCode: payload.componentCode === '' ? null : payload.componentCode
          },
          { headers }
        );
      }

      setAction(null);
      await qc.invalidateQueries({ queryKey: ['assets', 'fixedAssets', id] });
    } catch (e) {
      setErrMsg(e?.response?.data?.message ?? e?.message ?? 'Action failed');
    } finally {
      setSaving(false);
    }
  }

  async function retire() {
    setSaving(true);
    setErrMsg(null);
    try {
      await http.post(`/modules/assets/fixed-assets/${id}/retire`, {}, { headers: { 'Idempotency-Key': idempotencyKey } });
      await qc.invalidateQueries({ queryKey: ['assets', 'fixedAssets', id] });
    } catch (e) {
      setErrMsg(e?.response?.data?.message ?? e?.message ?? 'Retire failed');
    } finally {
      setSaving(false);
    }
  }

  async function deleteDraft() {
    setSaving(true);
    setErrMsg(null);
    try {
      await api.deleteFixedAsset(id);
      // Let user navigate back using browser; this is a detail view. No automatic redirect to avoid assumptions.
    } catch (e) {
      setErrMsg(e?.response?.data?.message ?? e?.message ?? 'Delete failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={asset?.name ? `Asset: ${asset.name}` : 'Asset'}
        subtitle="Lifecycle actions are idempotent per backend. Provide an Idempotency-Key for each action."
        icon={Building2}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone}>{status}</Badge>
            <Button variant="outline" leftIcon={Plus} onClick={() => openAction('schedule')}>
              Add depreciation schedule
            </Button>
            <Button variant="outline" leftIcon={TrendingUp} onClick={() => openAction('acquire')}>
              Acquire
            </Button>
            <Button variant="outline" leftIcon={Repeat} onClick={retire} disabled={saving}>
              Retire
            </Button>
            <Button variant="outline" leftIcon={TrendingDown} onClick={() => openAction('impair')}>
              Impair
            </Button>
            <Button variant="outline" leftIcon={ArrowLeftRight} onClick={() => openAction('transfer')}>
              Transfer
            </Button>
            <Button variant="outline" leftIcon={TrendingUp} onClick={() => openAction('revalue')}>
              Revalue
            </Button>
            <Button variant="outline" leftIcon={Archive} onClick={() => openAction('dispose')}>
              Dispose
            </Button>
            {status === 'draft' ? (
              <Button variant="danger" onClick={deleteDraft} disabled={saving}>
                Delete draft
              </Button>
            ) : null}
          </div>
        }
      />

      <ContentCard>
        {error ? <div className="text-sm text-red-600">{String(error?.message ?? 'Failed to load')}</div> : null}
        {isLoading ? <div className="text-sm text-slate-600">Loading…</div> : null}

        {!isLoading && asset ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-slate-500">Core</div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="grid gap-2 md:grid-cols-2">
                  <Field label="Code" value={asset.code} />
                  <Field label="Category" value={asset.category_name ?? asset.categoryName ?? asset.categoryId} />
                  <Field label="Acquisition date" value={asset.acquisition_date ?? asset.acquisitionDate} />
                  <Field label="Cost" value={asset.cost} />
                  <Field label="Salvage value" value={asset.salvage_value ?? asset.salvageValue} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-slate-500">Allocation</div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="grid gap-2 md:grid-cols-2">
                  <Field label="Location" value={asset.location_id ?? asset.locationId ?? '—'} />
                  <Field label="Department" value={asset.department_id ?? asset.departmentId ?? '—'} />
                  <Field label="Cost center" value={asset.cost_center_id ?? asset.costCenterId ?? '—'} />
                  <Field label="Status" value={status} />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </ContentCard>

      <Modal
        open={!!action}
        title={
          action === 'acquire'
            ? 'Acquire (capitalise)'
            : action === 'dispose'
              ? 'Dispose'
              : action === 'transfer'
                ? 'Transfer'
                : action === 'revalue'
                  ? 'Revalue'
                  : action === 'impair'
                    ? 'Impair'
                    : action === 'schedule'
                      ? 'Create depreciation schedule'
                      : 'Action'
        }
        onClose={() => setAction(null)}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">{errMsg ? <span className="text-red-600">{errMsg}</span> : null}</div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setAction(null)}>
                Cancel
              </Button>
              <Button variant="primary" leftIcon={Save} onClick={runAction} disabled={saving}>
                {saving ? 'Submitting…' : 'Submit'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <IdempotencyKeyField value={idempotencyKey} onChange={setIdempotencyKey} />
          {action === 'acquire' ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Period ID" value={payload.periodId ?? ''} onChange={(e) => setPayload({ ...payload, periodId: e.target.value })} placeholder="uuid" />
              <Input label="Entry date" value={payload.entryDate ?? ''} onChange={(e) => setPayload({ ...payload, entryDate: e.target.value })} placeholder="YYYY-MM-DD" />
              <Input
                label="Funding account ID"
                value={payload.fundingAccountId ?? ''}
                onChange={(e) => setPayload({ ...payload, fundingAccountId: e.target.value })}
                placeholder="uuid"
              />
              <Input label="Memo" value={payload.memo ?? ''} onChange={(e) => setPayload({ ...payload, memo: e.target.value })} placeholder="optional" />
            </div>
          ) : null}

          {action === 'dispose' ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Period ID" value={payload.periodId ?? ''} onChange={(e) => setPayload({ ...payload, periodId: e.target.value })} placeholder="uuid" />
              <Input label="Entry date" value={payload.entryDate ?? ''} onChange={(e) => setPayload({ ...payload, entryDate: e.target.value })} placeholder="YYYY-MM-DD" />
              <Input label="Proceeds" value={payload.proceeds ?? ''} onChange={(e) => setPayload({ ...payload, proceeds: e.target.value })} placeholder="0.00 (optional)" />
              <Input
                label="Proceeds account ID"
                value={payload.proceedsAccountId ?? ''}
                onChange={(e) => setPayload({ ...payload, proceedsAccountId: e.target.value })}
                placeholder="uuid"
              />
              <Textarea label="Memo" value={payload.memo ?? ''} onChange={(e) => setPayload({ ...payload, memo: e.target.value })} placeholder="optional" />
            </div>
          ) : null}

          {action === 'transfer' ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Event date" value={payload.eventDate ?? ''} onChange={(e) => setPayload({ ...payload, eventDate: e.target.value })} placeholder="YYYY-MM-DD" />
              <Input label="To location ID" value={payload.toLocationId ?? ''} onChange={(e) => setPayload({ ...payload, toLocationId: e.target.value })} placeholder="uuid or blank" />
              <Input
                label="To department ID"
                value={payload.toDepartmentId ?? ''}
                onChange={(e) => setPayload({ ...payload, toDepartmentId: e.target.value })}
                placeholder="uuid or blank"
              />
              <Input label="To cost center ID" value={payload.toCostCenterId ?? ''} onChange={(e) => setPayload({ ...payload, toCostCenterId: e.target.value })} placeholder="uuid or blank" />
              <Input label="Reference" value={payload.reference ?? ''} onChange={(e) => setPayload({ ...payload, reference: e.target.value })} placeholder="optional" />
              <Textarea label="Memo" value={payload.memo ?? ''} onChange={(e) => setPayload({ ...payload, memo: e.target.value })} placeholder="optional" />
            </div>
          ) : null}

          {action === 'revalue' ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Period ID" value={payload.periodId ?? ''} onChange={(e) => setPayload({ ...payload, periodId: e.target.value })} placeholder="uuid" />
              <Input label="Entry date" value={payload.entryDate ?? ''} onChange={(e) => setPayload({ ...payload, entryDate: e.target.value })} placeholder="YYYY-MM-DD" />
              <Input label="New value" value={payload.newValue ?? ''} onChange={(e) => setPayload({ ...payload, newValue: e.target.value })} placeholder="0.00" />
              <Input
                label="Revaluation reserve account ID"
                value={payload.revaluationReserveAccountId ?? ''}
                onChange={(e) => setPayload({ ...payload, revaluationReserveAccountId: e.target.value })}
                placeholder="uuid"
              />
              <Textarea label="Memo" value={payload.memo ?? ''} onChange={(e) => setPayload({ ...payload, memo: e.target.value })} placeholder="optional" />
            </div>
          ) : null}

          {action === 'impair' ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Period ID" value={payload.periodId ?? ''} onChange={(e) => setPayload({ ...payload, periodId: e.target.value })} placeholder="uuid" />
              <Input label="Entry date" value={payload.entryDate ?? ''} onChange={(e) => setPayload({ ...payload, entryDate: e.target.value })} placeholder="YYYY-MM-DD" />
              <Input label="Impairment amount" value={payload.impairmentAmount ?? ''} onChange={(e) => setPayload({ ...payload, impairmentAmount: e.target.value })} placeholder="> 0" />
              <Input
                label="Impairment loss account ID"
                value={payload.impairmentLossAccountId ?? ''}
                onChange={(e) => setPayload({ ...payload, impairmentLossAccountId: e.target.value })}
                placeholder="uuid"
              />
              <Textarea label="Memo" value={payload.memo ?? ''} onChange={(e) => setPayload({ ...payload, memo: e.target.value })} placeholder="optional" />
            </div>
          ) : null}

          {action === 'schedule' ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Method" value={payload.method ?? 'straight_line'} onChange={(e) => setPayload({ ...payload, method: e.target.value })} placeholder="straight_line" />
              <Input
                label="Useful life (months)"
                value={payload.usefulLifeMonths ?? ''}
                onChange={(e) => setPayload({ ...payload, usefulLifeMonths: e.target.value })}
                placeholder="e.g. 36"
              />
              <Input
                label="Depreciation start date"
                value={payload.depreciationStartDate ?? ''}
                onChange={(e) => setPayload({ ...payload, depreciationStartDate: e.target.value })}
                placeholder="YYYY-MM-DD (optional)"
              />
              <Input
                label="Effective start date"
                value={payload.effectiveStartDate ?? ''}
                onChange={(e) => setPayload({ ...payload, effectiveStartDate: e.target.value })}
                placeholder="YYYY-MM-DD (optional)"
              />
              <Input
                label="Effective end date"
                value={payload.effectiveEndDate ?? ''}
                onChange={(e) => setPayload({ ...payload, effectiveEndDate: e.target.value })}
                placeholder="YYYY-MM-DD or blank (null)"
              />
              <Input
                label="Component code"
                value={payload.componentCode ?? ''}
                onChange={(e) => setPayload({ ...payload, componentCode: e.target.value })}
                placeholder="optional"
              />
              <div className="md:col-span-2 text-xs text-slate-500">
                Backend rule: either effectiveStartDate or depreciationStartDate must be provided.
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {errMsg && !action ? <div className="text-sm text-red-600">{errMsg}</div> : null}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{value ?? '—'}</div>
    </div>
  );
}
