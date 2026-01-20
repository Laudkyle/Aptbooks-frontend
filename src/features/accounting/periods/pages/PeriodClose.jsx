import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makePeriodsApi } from '../api/periods.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { PERMISSIONS } from '../../../../app/constants/permissions.js';
import { usePermissions } from '../../../../shared/hooks/usePermissions.js';

export default function PeriodClose() {
  const { id } = useParams();
  const { http } = useApi();
  const api = useMemo(() => makePeriodsApi(http), [http]);
  const toast = useToast();
  const perms = usePermissions();

  const preview = useQuery({
    queryKey: ['period-close-preview', id],
    queryFn: () => api.closePreview(id),
    enabled: !!id
  });

  const [force, setForce] = useState('false');
  const [autoRunAccruals, setAutoRunAccruals] = useState('true');

  const canForce = perms.any([PERMISSIONS.periodForceClose]);

  const close = useMutation({
    mutationFn: () =>
      api.close(id, {
        force: force === 'true',
        autoRunAccruals: autoRunAccruals === 'true'
      }),
    onSuccess: () => {
      toast.success('Period close executed.');
      window.location.href = '/accounting/periods';
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Close failed')
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Close period" subtitle="Review close preview and execute close." />

      <ContentCard title="Close preview">
        {preview.isLoading ? (
          <div className="text-sm text-slate-700">Loading preview…</div>
        ) : preview.isError ? (
          <div className="text-sm text-red-700">{preview.error?.message ?? 'Failed to load preview.'}</div>
        ) : (
          <pre className="max-h-96 overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-800">
            {JSON.stringify(preview.data, null, 2)}
          </pre>
        )}
      </ContentCard>

      <ContentCard title="Options">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Select
            label="Auto run accruals"
            value={autoRunAccruals}
            onChange={(e) => setAutoRunAccruals(e.target.value)}
            options={[
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' }
            ]}
          />
          <Select
            label="Force close"
            value={force}
            onChange={(e) => setForce(e.target.value)}
            options={[
              { value: 'false', label: 'No' },
              { value: 'true', label: canForce ? 'Yes' : 'Yes (requires accounting.period.force_close)' }
            ]}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => window.history.back()}>Back</Button>
          <Button onClick={() => close.mutate()} disabled={close.isLoading || (force === 'true' && !canForce)}>
            Close period
          </Button>
        </div>
      </ContentCard>
    </div>
  );
}
