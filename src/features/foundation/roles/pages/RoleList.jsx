import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeRolesApi } from '../api/roles.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { ROUTES } from '../../../../app/constants/routes.js';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';

export default function RoleList() {
  const { http } = useApi();
  const api = useMemo(() => makeRolesApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const q = useQuery({ queryKey: ['roles'], queryFn: api.list, staleTime: 30_000 });
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('');

  const create = useMutation({
    mutationFn: () => api.create({ name }),
    onSuccess: () => {
      toast.success('Role created.');
      setCreateOpen(false);
      setName('');
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['roleMatrix'] });
    },
    onError: (e) => toast.error(e.message ?? 'Create failed')
  });

  const applyTemplate = useMutation({
    mutationFn: () => api.applyTemplate(template),
    onSuccess: () => {
      toast.success('Template applied.');
      setTemplate('');
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['roleMatrix'] });
    },
    onError: (e) => toast.error(e.message ?? 'Apply template failed')
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Roles"
        subtitle="Create roles and manage permissions."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Apply template</span>
              <select
                className="w-56 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-light focus:ring-2 focus:ring-brand-light"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              >
                <option value="">Select...</option>
                <option value="admin">admin</option>
                <option value="accountant">accountant</option>
                <option value="clerk">clerk</option>
                <option value="viewer">viewer</option>
              </select>
            </label>
            <Button variant="secondary" onClick={() => applyTemplate.mutate()} disabled={!template || applyTemplate.isLoading}>
              Apply
            </Button>
            <Button onClick={() => setCreateOpen(true)}>New role</Button>
          </div>
        }
      />

      <ContentCard title="Role List">
        {q.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : q.isError ? (
          <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load roles.'}</div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Created</TH>
              </tr>
            </THead>
            <TBody>
              {(q.data ?? []).map((r) => (
                <tr key={r.id}>
                  <TD>
                    <Link className="text-brand-primary hover:underline" to={ROUTES.adminRoleDetail(r.id)}>
                      {r.name}
                    </Link>
                  </TD>
                  <TD>{r.created_at ?? '—'}</TD>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </ContentCard>

      <Modal
        open={createOpen}
        title="Create role"
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={!name || create.isLoading}>Create</Button>
          </div>
        }
      >
        <Input label="Role name" value={name} onChange={(e) => setName(e.target.value)} />
      </Modal>
    </div>
  );
}
