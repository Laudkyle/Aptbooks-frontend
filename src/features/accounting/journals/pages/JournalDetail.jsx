import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeJournalsApi } from '../api/journals.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';

export default function JournalDetail() {
  const { id } = useParams();
  const { http } = useApi();
  const api = useMemo(() => makeJournalsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const q = useQuery({
    queryKey: ['journal', id],
    queryFn: () => api.detail(id),
    enabled: !!id
  });

  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [action, setAction] = useState(null); // 'reject' | 'void'

  const mutate = (mutationFn, successMsg) =>
    useMutation({
      mutationFn,
      onSuccess: () => {
        toast.success(successMsg);
        qc.invalidateQueries({ queryKey: ['journal', id] });
        qc.invalidateQueries({ queryKey: ['journals'] });
      },
      onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Action failed')
    });

  // Define action mutations
  const submit = mutate(() => api.submit(id), 'Submitted.');
  const approve = mutate(() => api.approve(id), 'Approved.');
  const cancel = mutate(() => api.cancel(id), 'Cancelled.');
  const post = mutate(() => api.post(id), 'Posted.');
  const reject = mutate(() => api.reject(id, { reason }), 'Rejected.');
  const voidM = mutate(() => api.void(id, { reason }), 'Voided.');

  function openReason(kind) {
    setAction(kind);
    setReason('');
    setReasonOpen(true);
  }

  function confirmReason() {
    if (action === 'reject') reject.mutate();
    if (action === 'void') voidM.mutate();
    setReasonOpen(false);
  }

  const j = q.data;

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => q.refetch()} disabled={q.isFetching}>Refresh</Button>
      <Button onClick={() => submit.mutate()} disabled={submit.isLoading}>Submit</Button>
      <Button onClick={() => approve.mutate()} disabled={approve.isLoading}>Approve</Button>
      <Button variant="secondary" onClick={() => openReason('reject')}>Reject</Button>
      <Button onClick={() => post.mutate()} disabled={post.isLoading}>Post</Button>
      <Button variant="secondary" onClick={() => cancel.mutate()} disabled={cancel.isLoading}>Cancel</Button>
      <Button variant="danger" onClick={() => openReason('void')}>Void</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Journal detail" subtitle="Workflow actions are server-validated by status." actions={actions} />

      <ContentCard title="Journal">
        {q.isLoading ? (
          <div className="text-sm text-slate-700">Loading…</div>
        ) : q.isError ? (
          <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load journal.'}</div>
        ) : (
          <pre className="max-h-[60vh] overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-800">
            {JSON.stringify(j, null, 2)}
          </pre>
        )}
      </ContentCard>

      <Modal
        open={reasonOpen}
        title={action === 'reject' ? 'Reject journal' : 'Void journal'}
        onClose={() => setReasonOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReasonOpen(false)}>Cancel</Button>
            <Button onClick={confirmReason} disabled={!reason}>
              Confirm
            </Button>
          </div>
        }
      >
        <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="1..300 chars" />
      </Modal>
    </div>
  );
}
