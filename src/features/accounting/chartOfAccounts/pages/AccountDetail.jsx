import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeCoaApi } from '../api/coa.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { ROUTES } from '../../../../app/constants/routes.js';

export default function AccountDetail() {
  const { id } = useParams();
  const { http } = useApi();
  const api = useMemo(() => makeCoaApi(http), [http]);
  const toast = useToast();

  const q = useQuery({
    queryKey: ['coa', id],
    queryFn: () => api.detail(id),
    enabled: !!id
  });

  const [name, setName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [parentAccountId, setParentAccountId] = useState('');
  const [isPostable, setIsPostable] = useState(true);
  const [status, setStatus] = useState('active');
  const [archiveOpen, setArchiveOpen] = useState(false);

  React.useEffect(() => {
    if (!q.data) return;
    setName(q.data.name ?? '');
    setCategoryName(q.data.categoryName ?? '');
    setParentAccountId(q.data.parentAccountId ?? '');
    setIsPostable(Boolean(q.data.isPostable ?? true));
    setStatus(q.data.status ?? 'active');
  }, [q.data]);

  const update = useMutation({
    mutationFn: () =>
      api.update(id, {
        name,
        categoryName: categoryName || undefined,
        parentAccountId: parentAccountId || null,
        isPostable,
        status
      }),
    onSuccess: () => toast.success('Account updated.'),
    onError: (e) => toast.error(e.message ?? 'Update failed')
  });

  const archive = useMutation({
    mutationFn: () => api.archive(id),
    onSuccess: () => {
      toast.success('Account archived.');
      window.location.href = ROUTES.accountingCoa;
    },
    onError: (e) => toast.error(e.message ?? 'Archive failed')
  });

  const acc = q.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title={acc ? `${acc.code} — ${acc.name}` : 'Account'}
        subtitle="Review and update account metadata."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => (window.location.href = ROUTES.accountingCoa)}>Back</Button>
            <Button variant="danger" onClick={() => setArchiveOpen(true)} disabled={archive.isLoading}>
              Archive
            </Button>
          </div>
        }
      />

      <ContentCard title="Details">
        {q.isLoading ? (
          <div className="text-sm text-slate-700">Loading…</div>
        ) : q.isError ? (
          <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load account.'}</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input label="Code" value={acc?.code ?? ''} disabled />
            <Input label="Account type" value={acc?.accountTypeCode ?? ''} disabled />
            <Input className="md:col-span-2" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Category (optional)" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
            <Input label="Parent account ID (optional)" value={parentAccountId} onChange={(e) => setParentAccountId(e.target.value)} />
            <Select
              label="Postable"
              value={String(isPostable)}
              onChange={(e) => setIsPostable(e.target.value === 'true')}
              options={[
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' }
              ]}
            />
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />

            <div className="md:col-span-2 mt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => q.refetch()} disabled={q.isFetching}>Refresh</Button>
              <Button onClick={() => update.mutate()} disabled={update.isLoading || !name}>
                Save changes
              </Button>
            </div>
          </div>
        )}
      </ContentCard>

      <ConfirmDialog
        open={archiveOpen}
        title="Archive account"
        message="This account will be archived. Proceed?"
        onCancel={() => setArchiveOpen(false)}
        onConfirm={() => archive.mutate()}
      />
    </div>
  );
}
