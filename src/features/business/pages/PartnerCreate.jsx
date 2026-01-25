import React, { useMemo, useState } from 'react'; 
import { Link, useNavigate, useSearchParams } from 'react-router-dom'; 
import { useMutation, useQueryClient } from '@tanstack/react-query'; 
import { ArrowLeft, Building2, Save } from 'lucide-react'; 

import { useApi } from '../../../shared/hooks/useApi.js'; 
import { qk } from '../../../shared/query/keys.js'; 
import { makePartnersApi } from '../api/partners.api.js'; 
import { ROUTES } from '../../../app/constants/routes.js'; 

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx'; 
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx'; 
import { Button } from '../../../shared/components/ui/Button.jsx'; 
import { Input } from '../../../shared/components/ui/Input.jsx'; 
import { Textarea } from '../../../shared/components/ui/Textarea.jsx'; 
import { Select } from '../../../shared/components/ui/Select.jsx'; 
import { useToast } from '../../../shared/components/ui/Toast.jsx'; 

export default function PartnerCreate() {
  const { http } = useApi(); 
  const api = useMemo(() => makePartnersApi(http), [http]); 
  const qc = useQueryClient(); 
  const toast = useToast(); 
  const navigate = useNavigate(); 
  const [searchParams] = useSearchParams(); 

  const initialType = searchParams.get('type') === 'vendor' ? 'vendor' : 'customer'; 

  const [form, setForm] = useState({
    type: initialType,
    name: '',
    code: '',
    email: '',
    phone: '',
    status: 'active',
    defaultReceivableAccountId: '',
    defaultPayableAccountId: '',
    paymentTermsId: '',
    notes: ''
  }); 

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v })); 

  const create = useMutation({
    mutationFn: async () => {
      // Backend validator expects uuid fields either omitted or valid UUID strings.
      const body = {
        type: form.type,
        name: form.name,
        code: form.code || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        status: form.status || undefined,
        defaultReceivableAccountId: form.defaultReceivableAccountId || undefined,
        defaultPayableAccountId: form.defaultPayableAccountId || undefined,
        paymentTermsId: form.paymentTermsId || undefined,
        notes: form.notes || undefined
      }; 
      return api.create(body); 
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: qk.partners() }); 
      toast.success('Partner created'); 
      const id = created?.id ?? created?.data?.id; 
      if (id) navigate(ROUTES.businessPartnerDetail(id)); 
      else navigate(form.type === 'vendor' ? ROUTES.businessVendors : ROUTES.businessCustomers); 
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to create partner')
  }); 

  return (
    <div className="space-y-4">
      <PageHeader
        title="New partner"
        subtitle="Create a customer or vendor profile."
        icon={Building2}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" leftIcon={ArrowLeft} asChild>
              <Link to={form.type === 'vendor' ? ROUTES.businessVendors : ROUTES.businessCustomers}>Back</Link>
            </Button>
            <Button variant="primary" leftIcon={Save} onClick={() => create.mutate()} disabled={create.isPending || !form.name.trim()}>
              Create
            </Button>
          </div>
        }
        crumbs={[
          { label: 'Business', href: ROUTES.businessCustomers },
          { label: 'New partner' }
        ]}
      />

      <ContentCard>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-slate-600">Type</div>
            <div className="mt-2">
              <Select
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
                options={[
                  { label: 'Customer', value: 'customer' },
                  { label: 'Vendor', value: 'vendor' }
                ]}
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-600">Status</div>
            <div className="mt-2">
              <Select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                options={[
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' }
                ]}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-medium text-slate-600">Name *</div>
            <div className="mt-2">
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g., Acme Trading Ltd." />
            </div>
            <div className="mt-1 text-xs text-slate-500">Minimum 2 characters (backend validated).</div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-600">Code</div>
            <div className="mt-2">
              <Input value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-600">Email</div>
            <div className="mt-2">
              <Input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-600">Phone</div>
            <div className="mt-2">
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-600">Payment terms ID</div>
            <div className="mt-2">
              <Input value={form.paymentTermsId} onChange={(e) => set('paymentTermsId', e.target.value)} placeholder="UUID (optional)" />
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-600">Default receivable account ID</div>
            <div className="mt-2">
              <Input
                value={form.defaultReceivableAccountId}
                onChange={(e) => set('defaultReceivableAccountId', e.target.value)}
                placeholder="UUID (optional)"
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-600">Default payable account ID</div>
            <div className="mt-2">
              <Input
                value={form.defaultPayableAccountId}
                onChange={(e) => set('defaultPayableAccountId', e.target.value)}
                placeholder="UUID (optional)"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-medium text-slate-600">Notes</div>
            <div className="mt-2">
              <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" rows={4} />
            </div>
          </div>
        </div>
      </ContentCard>
    </div>
  ); 
}
