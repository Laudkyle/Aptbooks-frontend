import React, { useMemo, useState } from 'react'; 
import { Link } from 'react-router-dom'; 
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'; 
import { useApi } from '../../../../shared/hooks/useApi.js'; 
import { makeUsersApi } from '../api/users.api.js'; 
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx'; 
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx'; 
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx'; 
import { Button } from '../../../../shared/components/ui/Button.jsx'; 
import { Modal } from '../../../../shared/components/ui/Modal.jsx'; 
import { Input } from '../../../../shared/components/ui/Input.jsx'; 
import { Badge } from '../../../../shared/components/ui/Badge.jsx'; 
import { ROUTES } from '../../../../app/constants/routes.js'; 
import { useToast } from '../../../../shared/components/ui/Toast.jsx'; 

export default function UserList() {
  const { http } = useApi(); 
  const api = useMemo(() => makeUsersApi(http), [http]); 
  const qc = useQueryClient(); 
  const toast = useToast(); 

  const [createOpen, setCreateOpen] = useState(false); 
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState(''); 

  const q = useQuery({
    queryKey: ['users'],
    queryFn: api.list,
    staleTime: 10_000
  }); 

  const create = useMutation({
    mutationFn: () => api.create({ email, password }),
    onSuccess: () => {
      toast.success('User created.'); 
      setCreateOpen(false); 
      setEmail(''); 
      setPassword(''); 
      qc.invalidateQueries({ queryKey: ['users'] }); 
    },
    onError: (e) => toast.error(e.message ?? 'Create failed')
  }); 

  const users = q.data ?? []; 

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        subtitle="Create and manage users in the current organization."
        actions={<Button onClick={() => setCreateOpen(true)}>New user</Button>}
      />

      <ContentCard title="User List">
        {q.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : q.isError ? (
          <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load users.'}</div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Email</TH>
                <TH>Status</TH>
                <TH>Created</TH>
              </tr>
            </THead>
            <TBody>
              {users.map((u) => (
                <tr key={u.id}>
                  <TD>
                    <Link className="text-brand-primary hover:underline" to={ROUTES.adminUserDetail(u.id)}>
                      {u.email}
                    </Link>
                  </TD>
                  <TD>
                    <Badge variant={u.status === 'active' ? 'success' : u.status === 'disabled' ? 'warning' : 'default'}>
                      {u.status}
                    </Badge>
                  </TD>
                  <TD>{u.created_at ?? '—'}</TD>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </ContentCard>

      <Modal
        open={createOpen}
        title="Create user"
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isLoading || !email || !password}>
              Create
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="text-xs text-slate-600">Backend enforces minimum password length 10.</div>
        </div>
      </Modal>
    </div>
  ); 
}
