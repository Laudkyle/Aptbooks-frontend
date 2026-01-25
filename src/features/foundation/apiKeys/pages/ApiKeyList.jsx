import React, { useMemo, useState } from 'react'; 
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'; 
import { useApi } from '../../../../shared/hooks/useApi.js'; 
import { makeApiKeysApi } from '../api/apiKeys.api.js'; 
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx'; 
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx'; 
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx'; 
import { Button } from '../../../../shared/components/ui/Button.jsx'; 
import { Modal } from '../../../../shared/components/ui/Modal.jsx'; 
import { Input } from '../../../../shared/components/ui/Input.jsx'; 
import { Badge } from '../../../../shared/components/ui/Badge.jsx'; 
import { useToast } from '../../../../shared/components/ui/Toast.jsx'; 

export default function ApiKeyList() {
  const { http } = useApi(); 
  const api = useMemo(() => makeApiKeysApi(http), [http]); 
  const qc = useQueryClient(); 
  const toast = useToast(); 

  const q = useQuery({ queryKey: ['apiKeys'], queryFn: api.list, staleTime: 10_000 }); 
  const keys = q.data?.data ?? []; 

  const [open, setOpen] = useState(false); 
  const [name, setName] = useState(''); 
  const [newSecret, setNewSecret] = useState(null); 

  const create = useMutation({
    mutationFn: () => api.create(name),
    onSuccess: (r) => {
      toast.success('API key created. Secret is shown once.'); 
      setNewSecret(r.apiKey ?? null); 
      setOpen(false); 
      setName(''); 
      qc.invalidateQueries({ queryKey: ['apiKeys'] }); 
    },
    onError: (e) => toast.error(e.message ?? 'Create failed')
  }); 

  const revoke = useMutation({
    mutationFn: (id) => api.revoke(id),
    onSuccess: () => {
      toast.success('API key revoked.'); 
      qc.invalidateQueries({ queryKey: ['apiKeys'] }); 
    },
    onError: (e) => toast.error(e.message ?? 'Revoke failed')
  }); 

  return (
    <div className="space-y-4">
      <PageHeader
        title="API Keys"
        subtitle="Create and revoke API keys. Secrets are returned only once."
        actions={<Button onClick={() => setOpen(true)}>New API key</Button>}
      />

      {newSecret ? (
        <ContentCard title="New API Key Secret">
          <div className="text-sm text-slate-700">Copy and store this value now. It will not be shown again.</div>
          <pre className="mt-2 rounded bg-slate-50 p-3 text-xs font-mono text-slate-900">{newSecret}</pre>
          <div className="mt-2">
            <Button variant="secondary" size="sm" onClick={() => setNewSecret(null)}>Dismiss</Button>
          </div>
        </ContentCard>
      ) : null}

      <ContentCard title="Keys">
        {q.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : q.isError ? (
          <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load keys.'}</div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Prefix</TH>
                <TH>Status</TH>
                <TH>Created</TH>
                <TH>Revoked</TH>
                <TH>Actions</TH>
              </tr>
            </THead>
            <TBody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <TD>{k.name}</TD>
                  <TD className="font-mono text-xs">{k.prefix}</TD>
                  <TD><Badge variant={k.is_active ? 'success' : 'warning'}>{k.is_active ? 'active' : 'revoked'}</Badge></TD>
                  <TD>{k.created_at ?? '—'}</TD>
                  <TD>{k.revoked_at ?? '—'}</TD>
                  <TD>
                    <Button size="sm" variant="danger" disabled={!k.is_active || revoke.isLoading} onClick={() => revoke.mutate(k.id)}>
                      Revoke
                    </Button>
                  </TD>
                </tr>
              ))}
              {keys.length === 0 ? (
                <tr><TD colSpan={6} className="text-slate-500">No API keys.</TD></tr>
              ) : null}
            </TBody>
          </Table>
        )}
      </ContentCard>

      <Modal
        open={open}
        title="Create API key"
        onClose={() => setOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={!name || create.isLoading}>Create</Button>
          </div>
        }
      >
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      </Modal>
    </div>
  ); 
}
