import React, { useMemo, useState } from 'react'; 
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'; 
import { useApi } from '../../../../shared/hooks/useApi.js'; 
import { makeOrganizationsApi } from '../api/organizations.api.js'; 
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx'; 
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx'; 
import { Input } from '../../../../shared/components/ui/Input.jsx'; 
import { Button } from '../../../../shared/components/ui/Button.jsx'; 
import { useToast } from '../../../../shared/components/ui/Toast.jsx'; 

export default function OrganizationSettings() {
  const { http } = useApi(); 
  const api = useMemo(() => makeOrganizationsApi(http), [http]); 
  const qc = useQueryClient(); 
  const toast = useToast(); 

  const q = useQuery({
    queryKey: ['orgMe'],
    queryFn: api.me,
    staleTime: 30_000
  }); 

  const [form, setForm] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address_json: '{}',
    branding_json: '{}'
  }); 

  React.useEffect(() => {
    if (!q.data) return; 
    setForm({
      name: q.data.name ?? '',
      contact_email: q.data.contact_email ?? '',
      contact_phone: q.data.contact_phone ?? '',
      address_json: JSON.stringify(q.data.address_json ?? {}, null, 2),
      branding_json: JSON.stringify(q.data.branding_json ?? {}, null, 2)
    }); 
  }, [q.data]); 

  const update = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name || undefined,
        contact_email: form.contact_email || undefined,
        contact_phone: form.contact_phone || undefined,
        address_json: form.address_json ? JSON.parse(form.address_json) : undefined,
        branding_json: form.branding_json ? JSON.parse(form.branding_json) : undefined
      }; 
      return api.updateMe(body); 
    },
    onSuccess: () => {
      toast.success('Organization updated.'); 
      qc.invalidateQueries({ queryKey: ['orgMe'] }); 
    },
    onError: (e) => toast.error(e.message ?? 'Update failed')
  }); 

  const upload = useMutation({
    mutationFn: (file) => api.uploadLogo(file),
    onSuccess: () => {
      toast.success('Logo uploaded.'); 
      qc.invalidateQueries({ queryKey: ['orgMe'] }); 
    },
    onError: (e) => toast.error(e.message ?? 'Upload failed')
  }); 

  return (
    <div className="space-y-4">
      <PageHeader title="Organization" subtitle="Manage organization profile and branding." />

      <ContentCard title="Profile" actions={
        <Button onClick={() => update.mutate()} disabled={update.isLoading || q.isLoading}>Save</Button>
      }>
        {q.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : q.isError ? (
          <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load organization.'}</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            <Input label="Contact email" value={form.contact_email} onChange={(e) => setForm((s) => ({ ...s, contact_email: e.target.value }))} />
            <Input label="Contact phone" value={form.contact_phone} onChange={(e) => setForm((s) => ({ ...s, contact_phone: e.target.value }))} />
            <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Address JSON</span>
                <textarea
                  className="h-44 w-full rounded-md border border-slate-200 bg-white p-3 text-xs font-mono focus:border-brand-light focus:ring-2 focus:ring-brand-light"
                  value={form.address_json}
                  onChange={(e) => setForm((s) => ({ ...s, address_json: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Branding JSON</span>
                <textarea
                  className="h-44 w-full rounded-md border border-slate-200 bg-white p-3 text-xs font-mono focus:border-brand-light focus:ring-2 focus:ring-brand-light"
                  value={form.branding_json}
                  onChange={(e) => setForm((s) => ({ ...s, branding_json: e.target.value }))}
                />
              </label>
            </div>
          </div>
        )}
      </ContentCard>

      <ContentCard title="Logo">
        <div className="space-y-2">
          <div className="text-xs text-slate-600">Upload uses multipart field name <span className="font-mono">file</span>.</div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]; 
              if (file) upload.mutate(file); 
            }}
          />
          {upload.isLoading ? <div className="text-sm text-slate-700">Uploading...</div> : null}
        </div>
      </ContentCard>

      <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-800">Raw organization row</summary>
        <pre className="mt-2 max-h-96 overflow-auto text-xs">{JSON.stringify(q.data, null, 2)}</pre>
      </details>
    </div>
  ); 
}
