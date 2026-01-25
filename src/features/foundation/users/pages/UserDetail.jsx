import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeUsersApi } from '../api/users.api.js';
import { makeRolesApi } from '../../roles/api/roles.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';

export default function UserDetail() {
  const { id } = useParams();
  const { http } = useApi();
  const usersApi = useMemo(() => makeUsersApi(http), [http]);
  const rolesApi = useMemo(() => makeRolesApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const userQ = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.detail(id),
    enabled: !!id,
    staleTime: 10_000
  });

  const rolesQ = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.list,
    staleTime: 30_000
  });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    status: '',
    password: ''
  });

  React.useEffect(() => {
    const u = userQ.data;
    if (!u) return;
    setForm({
      email: u.email ?? '',
      first_name: u.first_name ?? '',
      last_name: u.last_name ?? '',
      phone: u.phone ?? '',
      status: u.status ?? '',
      password: ''
    });
  }, [userQ.data]);

  const update = useMutation({
    mutationFn: async () => {
      const body = {
        email: form.email || undefined,
        first_name: form.first_name === '' ? null : form.first_name,
        last_name: form.last_name === '' ? null : form.last_name,
        phone: form.phone === '' ? null : form.phone,
        status: form.status || undefined,
        password: form.password || undefined
      };
      return usersApi.update(id, body);
    },
    onSuccess: () => {
      toast.success('User updated.');
      setForm((s) => ({ ...s, password: '' }));
      qc.invalidateQueries({ queryKey: ['user', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(e.message ?? 'Update failed')
  });

  const disable = useMutation({
    mutationFn: () => usersApi.disable(id),
    onSuccess: () => {
      toast.success('User disabled.');
      qc.invalidateQueries({ queryKey: ['user', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(e.message ?? 'Disable failed')
  });

  const enable = useMutation({
    mutationFn: () => usersApi.enable(id),
    onSuccess: () => {
      toast.success('User enabled.');
      qc.invalidateQueries({ queryKey: ['user', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(e.message ?? 'Enable failed')
  });

  const remove = useMutation({
    mutationFn: () => usersApi.remove(id),
    onSuccess: () => {
      toast.success('User deleted (soft).');
      setConfirmDelete(false);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(e.message ?? 'Delete failed')
  });

  const assignRoles = useMutation({
    mutationFn: (roleIds) => usersApi.assignRoles(id, roleIds),
    onSuccess: () => {
      toast.success('Roles assigned.');
      qc.invalidateQueries({ queryKey: ['user', id] });
    },
    onError: (e) => toast.error(e.message ?? 'Assign roles failed')
  });

  const removeRoles = useMutation({
    mutationFn: (roleIds) => usersApi.removeRoles(id, roleIds),
    onSuccess: () => {
      toast.success('Roles removed.');
      qc.invalidateQueries({ queryKey: ['user', id] });
    },
    onError: (e) => toast.error(e.message ?? 'Remove roles failed')
  });

  const user = userQ.data;
  const allRoles = rolesQ.data ?? [];
  const assignedRoleIds = new Set((user?.roles ?? []).map((r) => r.id));

  const [rolePick, setRolePick] = useState('');

  return (
    <div className="space-y-4">
      <PageHeader
        title="User Detail"
        subtitle={id}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => update.mutate()} disabled={update.isLoading || userQ.isLoading}>
              Save
            </Button>
            {user?.status === 'disabled' ? (
              <Button onClick={() => enable.mutate()} disabled={enable.isLoading}>Enable</Button>
            ) : (
              <Button variant="secondary" onClick={() => disable.mutate()} disabled={disable.isLoading}>Disable</Button>
            )}
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete</Button>
          </div>
        }
      />

      <ContentCard title="Profile">
        {userQ.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : userQ.isError ? (
          <div className="text-sm text-red-700">{userQ.error?.message ?? 'Failed to load user.'}</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            <div className="flex items-end gap-2">
              <div className="text-sm text-slate-700">Status</div>
              <Badge variant={user.status === 'active' ? 'success' : user.status === 'disabled' ? 'warning' : 'default'}>
                {user.status}
              </Badge>
            </div>
            <Input label="First name" value={form.first_name} onChange={(e) => setForm((s) => ({ ...s, first_name: e.target.value }))} />
            <Input label="Last name" value={form.last_name} onChange={(e) => setForm((s) => ({ ...s, last_name: e.target.value }))} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
            <Input label="New password" type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
          </div>
        )}
      </ContentCard>

      <ContentCard title="Roles">
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Assign role</span>
            <select
              className="w-72 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-light focus:ring-2 focus:ring-brand-light"
              value={rolePick}
              onChange={(e) => setRolePick(e.target.value)}
            >
              <option value="">Select a role...</option>
              {allRoles.map((r) => (
                <option key={r.id} value={r.id} disabled={assignedRoleIds.has(r.id)}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            onClick={() => {
              if (!rolePick) return;
              assignRoles.mutate([rolePick]);
              setRolePick('');
            }}
            disabled={!rolePick || assignRoles.isLoading}
          >
            Assign
          </Button>
        </div>

        <div className="mt-3">
          <Table>
            <THead>
              <tr>
                <TH>Role</TH>
                <TH>Actions</TH>
              </tr>
            </THead>
            <TBody>
              {(user?.roles ?? []).map((r) => (
                <tr key={r.id}>
                  <TD>{r.name}</TD>
                  <TD>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => removeRoles.mutate([r.id])}
                      disabled={removeRoles.isLoading}
                    >
                      Remove
                    </Button>
                  </TD>
                </tr>
              ))}
              {(user?.roles ?? []).length === 0 ? (
                <tr>
                  <TD colSpan={2} className="text-slate-500">No roles assigned.</TD>
                </tr>
              ) : null}
            </TBody>
          </Table>
        </div>
      </ContentCard>

      <ContentCard title="Login History (Admin)">
        <AdminLoginHistory userId={id} />
      </ContentCard>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete user"
        message="This performs a soft delete. Continue?"
        confirmText="Delete"
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
      />

      <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-800">Raw user</summary>
        <pre className="mt-2 max-h-96 overflow-auto text-xs">{JSON.stringify(user, null, 2)}</pre>
      </details>
    </div>
  );
}

function AdminLoginHistory({ userId }) {
  const { http } = useApi();
  const api = useMemo(() => makeUsersApi(http), [http]);
  const [limit, setLimit] = useState(50);
  const [email, setEmail] = useState('');

  const q = useQuery({
    queryKey: ['userLoginHistory', userId, limit, email],
    queryFn: () => api.loginHistory(userId, { limit: String(limit), email: email || undefined, userId: userId }),
    enabled: !!userId
  });

  const rows = q.data?.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <Input label="Limit" type="number" min={1} max={200} value={limit} onChange={(e) => setLimit(Number(e.target.value) || 50)} className="w-28" />
        <Input label="Email filter (optional)" value={email} onChange={(e) => setEmail(e.target.value)} className="w-72" />
      </div>

      {q.isLoading ? (
        <div className="text-sm text-slate-700">Loading...</div>
      ) : q.isError ? (
        <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load login history.'}</div>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Created</TH>
              <TH>Success</TH>
              <TH>IP</TH>
              <TH>User agent</TH>
              <TH>Failure</TH>
            </tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <tr key={r.id}>
                <TD>{r.created_at}</TD>
                <TD>{String(r.success)}</TD>
                <TD>{r.ip ?? '—'}</TD>
                <TD className="max-w-[20rem] truncate">{r.user_agent ?? '—'}</TD>
                <TD>{r.failure_reason ?? '—'}</TD>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><TD colSpan={5} className="text-slate-500">No rows.</TD></tr>
            ) : null}
          </TBody>
        </Table>
      )}
    </div>
  );
}
