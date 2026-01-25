import React, { useMemo, useState } from 'react'; 
import { useNavigate, useParams } from 'react-router-dom'; 
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'; 
import { useApi } from '../../../../shared/hooks/useApi.js'; 
import { makeRolesApi } from '../api/roles.api.js'; 
import { makePermissionsApi } from '../../permissions/api/permissions.api.js'; 
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx'; 
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx'; 
import { Button } from '../../../../shared/components/ui/Button.jsx'; 
import { Input } from '../../../../shared/components/ui/Input.jsx'; 
import { ConfirmDialog } from '../../../../shared/components/ui/ConfirmDialog.jsx'; 
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx'; 
import { useToast } from '../../../../shared/components/ui/Toast.jsx'; 
import { ROUTES } from '../../../../app/constants/routes.js'; 

export default function RoleDetail() {
  const { id } = useParams(); 
  const navigate = useNavigate(); 
  const { http } = useApi(); 
  const rolesApi = useMemo(() => makeRolesApi(http), [http]); 
  const permsApi = useMemo(() => makePermissionsApi(http), [http]); 
  const qc = useQueryClient(); 
  const toast = useToast(); 

  const rolesQ = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list, staleTime: 30_000 }); 
  const permListQ = useQuery({ queryKey: ['permissions'], queryFn: permsApi.list, staleTime: 30_000 }); 
  const rolePermsQ = useQuery({ queryKey: ['rolePerms', id], queryFn: () => rolesApi.getPermissions(id), enabled: !!id }); 

  const role = (rolesQ.data ?? []).find((r) => r.id === id); 
  const [name, setName] = useState(''); 
  React.useEffect(() => {
    if (role?.name) setName(role.name); 
  }, [role?.name]); 

  const [confirmDelete, setConfirmDelete] = useState(false); 

  const rename = useMutation({
    mutationFn: () => rolesApi.update(id, { name }),
    onSuccess: () => {
      toast.success('Role renamed.'); 
      qc.invalidateQueries({ queryKey: ['roles'] }); 
      qc.invalidateQueries({ queryKey: ['roleMatrix'] }); 
    },
    onError: (e) => toast.error(e.message ?? 'Rename failed')
  }); 

  const remove = useMutation({
    mutationFn: () => rolesApi.remove(id),
    onSuccess: () => {
      toast.success('Role deleted.'); 
      setConfirmDelete(false); 
      qc.invalidateQueries({ queryKey: ['roles'] }); 
      qc.invalidateQueries({ queryKey: ['roleMatrix'] }); 
      navigate(ROUTES.adminRoles); 
    },
    onError: (e) => toast.error(e.message ?? 'Delete failed')
  }); 

  const attached = new Set((rolePermsQ.data?.permissions ?? []).map((p) => p.code)); 

  const [filter, setFilter] = useState(''); 
  const filteredPerms = (permListQ.data ?? []).filter((p) => {
    if (!filter.trim()) return true; 
    const f = filter.trim().toLowerCase(); 
    return p.code.toLowerCase().includes(f) || (p.description ?? '').toLowerCase().includes(f); 
  }); 

  const attach = useMutation({
    mutationFn: (codes) => rolesApi.attachPermissions(id, codes),
    onSuccess: () => {
      toast.success('Permissions attached.'); 
      qc.invalidateQueries({ queryKey: ['rolePerms', id] }); 
      qc.invalidateQueries({ queryKey: ['roleMatrix'] }); 
    },
    onError: (e) => toast.error(e.message ?? 'Attach failed')
  }); 

  const detach = useMutation({
    mutationFn: (codes) => rolesApi.detachPermissions(id, codes),
    onSuccess: () => {
      toast.success('Permissions detached.'); 
      qc.invalidateQueries({ queryKey: ['rolePerms', id] }); 
      qc.invalidateQueries({ queryKey: ['roleMatrix'] }); 
    },
    onError: (e) => toast.error(e.message ?? 'Detach failed')
  }); 

  const [selected, setSelected] = useState(() => new Set()); 

  return (
    <div className="space-y-4">
      <PageHeader
        title="Role Detail"
        subtitle={id}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => rename.mutate()} disabled={!name || rename.isLoading}>Save</Button>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete</Button>
          </div>
        }
      />

      <ContentCard title="Role">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="text-xs text-slate-600">Role ID: <span className="font-mono">{id}</span></div>
        </div>
      </ContentCard>

      <ContentCard title="Permissions" actions={
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const codes = Array.from(selected).filter((c) => !attached.has(c)); 
              if (codes.length) attach.mutate(codes); 
            }}
            disabled={selected.size === 0 || attach.isLoading}
          >Attach</Button>
          <Button
            variant="secondary"
            onClick={() => {
              const codes = Array.from(selected).filter((c) => attached.has(c)); 
              if (codes.length) detach.mutate(codes); 
            }}
            disabled={selected.size === 0 || detach.isLoading}
          >Detach</Button>
        </div>
      }>
        <div className="mb-3">
          <Input label="Filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="permission code or description" />
        </div>

        {permListQ.isLoading || rolePermsQ.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : permListQ.isError || rolePermsQ.isError ? (
          <div className="text-sm text-red-700">Failed to load permissions.</div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH></TH>
                <TH>Code</TH>
                <TH>Description</TH>
                <TH>Attached</TH>
              </tr>
            </THead>
            <TBody>
              {filteredPerms.map((p) => {
                const isAttached = attached.has(p.code); 
                const isSelected = selected.has(p.code); 
                return (
                  <tr key={p.code}>
                    <TD>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          setSelected((prev) => {
                            const next = new Set(prev); 
                            if (e.target.checked) next.add(p.code); 
                            else next.delete(p.code); 
                            return next; 
                          }); 
                        }}
                      />
                    </TD>
                    <TD className="font-mono text-xs">{p.code}</TD>
                    <TD>{p.description ?? '—'}</TD>
                    <TD>{isAttached ? 'yes' : 'no'}</TD>
                  </tr>
                ); 
              })}
            </TBody>
          </Table>
        )}
      </ContentCard>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete role"
        message="This will delete the role. Continue?"
        confirmText="Delete"
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
      />

      <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-800">Raw role permissions</summary>
        <pre className="mt-2 max-h-96 overflow-auto text-xs">{JSON.stringify(rolePermsQ.data, null, 2)}</pre>
      </details>
    </div>
  ); 
}
