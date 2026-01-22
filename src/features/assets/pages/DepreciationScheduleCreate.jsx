import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAssetsApi } from '../api/assets.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';

export default function DepreciationScheduleCreate() {
  const { id } = useParams(); // asset id
  const nav = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const assetsApi = useMemo(() => makeAssetsApi(http), [http]);

  const [form, setForm] = useState({
    method: 'straight_line',
    usefulLifeMonths: '',
    depreciationStartDate: '',
    effectiveStartDate: '',
    effectiveEndDate: '',
    componentCode: ''
  });

  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        assetId: id,
        method: form.method || 'straight_line',
        usefulLifeMonths: Number(form.usefulLifeMonths),
        depreciationStartDate: form.depreciationStartDate || undefined,
        effectiveStartDate: form.effectiveStartDate || undefined,
        effectiveEndDate: form.effectiveEndDate ? form.effectiveEndDate : null,
        componentCode: form.componentCode ? form.componentCode : null
      };
      await assetsApi.createDepreciationSchedule(payload);
      await qc.invalidateQueries({ queryKey: ['assets.depr.schedules'] });
      await qc.invalidateQueries({ queryKey: ['assets.fixedAsset', id] });
      nav(-1);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="New Depreciation Schedule"
        subtitle="Create a depreciation schedule for this asset."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => nav(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={onSubmit} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Create
            </Button>
          </div>
        }
      />

      <ContentCard>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Select
            label="Method"
            value={form.method}
            onChange={(e) => setForm((s) => ({ ...s, method: e.target.value }))}
            options={[{ value: 'straight_line', label: 'Straight line' }]}
          />
          <Input
            label="Useful life (months)"
            type="number"
            min="1"
            value={form.usefulLifeMonths}
            onChange={(e) => setForm((s) => ({ ...s, usefulLifeMonths: e.target.value }))}
            required
          />

          <Input
            label="Depreciation start date (optional)"
            type="date"
            value={form.depreciationStartDate}
            onChange={(e) => setForm((s) => ({ ...s, depreciationStartDate: e.target.value }))}
          />
          <Input
            label="Effective start date (optional)"
            type="date"
            value={form.effectiveStartDate}
            onChange={(e) => setForm((s) => ({ ...s, effectiveStartDate: e.target.value }))}
          />

          <Input
            label="Effective end date (optional)"
            type="date"
            value={form.effectiveEndDate}
            onChange={(e) => setForm((s) => ({ ...s, effectiveEndDate: e.target.value }))}
          />
          <Input
            label="Component code (optional)"
            value={form.componentCode}
            onChange={(e) => setForm((s) => ({ ...s, componentCode: e.target.value }))}
          />

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => nav(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              Create schedule
            </Button>
          </div>
        </form>
      </ContentCard>
    </>
  );
}
