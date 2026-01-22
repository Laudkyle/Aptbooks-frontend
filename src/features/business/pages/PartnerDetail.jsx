
import { useParams, Link, data } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, CreditCard, MapPin, Phone, Plus, Save } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useApi } from '../../../shared/hooks/useApi.js';
import { qk } from '../../../shared/query/keys.js';
import { makePartnersApi } from '../api/partners.api.js';
import { ROUTES } from '../../../app/constants/routes.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Tabs } from '../../../shared/components/ui/Tabs.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-2xl bg-brand-primary/10 p-2 ring-1 ring-brand-primary/20">
        <Icon className="h-5 w-5 text-brand-deep" />
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
      </div>
    </div>
  );
}

export default function PartnerDetail() {
  const { id } = useParams();
  const { http } = useApi();
  const api = useMemo(() => makePartnersApi(http), [http]);
  const qc = useQueryClient();
const toast = useToast();
  const { data: partner, isLoading } = useQuery({
    queryKey: qk.partner(id),
    queryFn: () => api.get(id)
  });

  const { data: creditPolicy } = useQuery({
    queryKey: qk.partnerCreditPolicy(id),
    queryFn: () => api.getCreditPolicy(id),
    enabled: !!id
  });

  const [editOpen, setEditOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [contactEditOpen, setContactEditOpen] = useState(false);
  const [addressEditOpen, setAddressEditOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);
  const [editingAddressId, setEditingAddressId] = useState(null);

  const [edit, setEdit] = useState({ name: '', code: '', email: '', phone: '', status: 'active', notes: '' });
  const [cp, setCp] = useState({ creditLimit: '', creditDays: '', holdIfOver: false, notes: '' });
  const [contact, setContact] = useState({ name: '', email: '', phone: '', role: '', isPrimary: false });
  const [contactEdit, setContactEdit] = useState({ name: '', email: '', phone: '', role: '', isPrimary: false });
  const [address, setAddress] = useState({ label: '', line1: '', line2: '', city: '', region: '', postalCode: '', country: '', isPrimary: false });
  const [addressEdit, setAddressEdit] = useState({ label: '', line1: '', line2: '', city: '', region: '', postalCode: '', country: '', isPrimary: false });

  React.useEffect(() => {
    if (partner) {
      setEdit({
        name: partner.partner.name ?? '',
        code: partner.partner.code ?? '',
        email: partner.partner.email ?? '',
        phone: partner.partner.phone ?? '',
        status: partner.partner.status ?? 'active',
        notes: partner.partner.notes ?? ''
      });
    }
  }, [partner]);

  React.useEffect(() => {
    if (creditPolicy) {
      setCp({
        creditLimit: creditPolicy.credit_limit ?? '',
        creditDays: creditPolicy.credit_days ?? '',
        holdIfOver: !!creditPolicy.hold_if_over,
        notes: creditPolicy.notes ?? ''
      });
    }
  }, [creditPolicy]);

  const updatePartner = useMutation({
    mutationFn: (body) => api.update(id, body),
    onSuccess: () => {
      toast.success('Saved partner');
      qc.invalidateQueries({ queryKey: qk.partner(id) });
      setEditOpen(false);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to save')
  });

  const saveCredit = useMutation({
    mutationFn: (body) => api.setCreditPolicy(id, body),
    onSuccess: () => {
      toast.success('Saved credit policy');
      qc.invalidateQueries({ queryKey: qk.partnerCreditPolicy(id) });
      setCreditOpen(false);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to save')
  });

  const addContact = useMutation({
    mutationFn: (body) => api.addContact(id, body),
    onSuccess: () => {
      toast.success('Added contact');
      qc.invalidateQueries({ queryKey: qk.partner(id) });
      setContactOpen(false);
      setContact({ name: '', email: '', phone: '', role: '', isPrimary: false });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to add')
    
  });
  const updateContact = useMutation({
    mutationFn: ({ contactId, body }) => api.updateContact(id, contactId, body),
    onSuccess: () => {
      toast.success('Updated contact');
      qc.invalidateQueries({ queryKey: qk.partner(id) });
      setContactEditOpen(false);
      setEditingContactId(null);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to update')
  });

  const addAddress = useMutation({
    mutationFn: (body) => api.addAddress(id, body),
    onSuccess: () => {
      toast.success('Added address');
      qc.invalidateQueries({ queryKey: qk.partner(id) });
      setAddressOpen(false);
      setAddress({ label: '', line1: '', line2: '', city: '', region: '', postalCode: '', country: '', isPrimary: false });
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to add')
    
  });
  const updateAddress = useMutation({
    mutationFn: ({ addressId, body }) => api.updateAddress(id, addressId, body),
    onSuccess: () => {
      toast.success('Updated address');
      qc.invalidateQueries({ queryKey: qk.partner(id) });
      setAddressEditOpen(false);
      setEditingAddressId(null);
    },
    onError: (e) => toast.error(e?.message ?? 'Failed to update')
  });

  const contacts = partner?.contacts ?? [];
  const addresses = partner?.addresses ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title={partner.partner?.name ?? (isLoading ? 'Loading partner…' : 'Partner')}
        subtitle={`Partner ID: ${id}`}
        icon={Building2}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => window.history.back()}>
              Back
            </Button>
            <Button variant="primary" leftIcon={Save} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          </div>
        }
        crumbs={[
          { label: 'Customers', href: ROUTES.businessCustomers },
          { label: partner.partner?.name ?? 'Partner' }
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <ContentCard className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <SectionTitle icon={Building2} title="Profile" subtitle="Core partner information and defaults." />
            <Badge tone={(partner?.status ?? 'active') === 'active' ? 'success' : 'muted'}>{partner?.status ?? 'active'}</Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
              <div className="text-xs text-slate-500">Code</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{partner.partner?.code ?? '—'}</div>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
              <div className="text-xs text-slate-500">Type</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{partner.partner?.type ?? '—'}</div>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
              <div className="text-xs text-slate-500">Email</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{partner.partner?.email ?? '—'}</div>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
              <div className="text-xs text-slate-500">Phone</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{partner.partner?.phone ?? '—'}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-medium text-slate-600">Notes</div>
            <div className="mt-2 rounded-2xl border border-border-subtle bg-white/70 p-4 text-sm text-slate-700">
              {partner?.notes ? partner.notes : <span className="text-slate-400">No notes recorded.</span>}
            </div>
          </div>
        </ContentCard>

        <ContentCard>
          <div className="flex items-center justify-between">
            <SectionTitle icon={CreditCard} title="Credit policy" subtitle="Limit, days and hold rules." />
            <Button variant="outline" size="sm" onClick={() => setCreditOpen(true)}>
              Edit
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
              <div className="text-xs text-slate-500">Credit limit</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{creditPolicy?.credit_limit ?? '—'}</div>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
              <div className="text-xs text-slate-500">Credit days</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{creditPolicy?.credit_days ?? '—'}</div>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
              <div className="text-xs text-slate-500">Hold if over</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{creditPolicy?.hold_if_over ? 'Yes' : 'No'}</div>
            </div>
            <div className="text-xs text-slate-500">{creditPolicy?.notes ?? ''}</div>
          </div>
        </ContentCard>
      </div>

      <Tabs
        tabs={[
          {
            key: 'contacts',
            label: `Contacts (${contacts.length})`,
            content: (
              <ContentCard>
                <div className="flex items-center justify-between">
                  <SectionTitle icon={Phone} title="Contacts" subtitle="People you can reach for billing, approvals and disputes." />
                  <Button leftIcon={Plus} variant="primary" onClick={() => setContactOpen(true)}>
                    Add contact
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {contacts.length ? (
                    contacts.map((c) => (
                      <div key={c.id ?? c.email ?? c.name} className="rounded-2xl border border-border-subtle bg-white/70 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                            <div className="mt-1 text-xs text-slate-500">{c.role ?? '—'}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.isPrimary ? <Badge tone="brand">Primary</Badge> : null}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingContactId(c.id);
                                setContactEdit({
                                  name: c.name ?? '',
                                  email: c.email ?? '',
                                  phone: c.phone ?? '',
                                  role: c.role ?? '',
                                  isPrimary: !!c.isPrimary
                                });
                                setContactEditOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1 text-sm text-slate-700">
                          <div>{c.email ?? <span className="text-slate-400">No email</span>}</div>
                          <div>{c.phone ?? <span className="text-slate-400">No phone</span>}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border-subtle bg-white/60 p-8 text-center text-sm text-slate-600 md:col-span-2">
                      No contacts yet. Add a primary billing contact to speed up approvals and collections.
                    </div>
                  )}
                </div>
              </ContentCard>
            )
          },
          {
            key: 'addresses',
            label: `Addresses (${addresses.length})`,
            content: (
              <ContentCard>
                <div className="flex items-center justify-between">
                  <SectionTitle icon={MapPin} title="Addresses" subtitle="Billing and shipping locations." />
                  <Button leftIcon={Plus} variant="primary" onClick={() => setAddressOpen(true)}>
                    Add address
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {addresses.length ? (
                    addresses.map((a) => (
                      <div key={a.id ?? a.line1} className="rounded-2xl border border-border-subtle bg-white/70 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{a.label ?? 'Address'}</div>
                            <div className="mt-1 text-xs text-slate-500">{[a.city, a.region, a.country].filter(Boolean).join(', ')}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {a.isPrimary ? <Badge tone="brand">Primary</Badge> : null}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingAddressId(a.id);
                                setAddressEdit({
                                  label: a.label ?? '',
                                  line1: a.line1 ?? '',
                                  line2: a.line2 ?? '',
                                  city: a.city ?? '',
                                  region: a.region ?? '',
                                  postalCode: a.postalCode ?? '',
                                  country: a.country ?? '',
                                  isPrimary: !!a.isPrimary
                                });
                                setAddressEditOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-slate-700">
                          <div>{a.line1}</div>
                          {a.line2 ? <div>{a.line2}</div> : null}
                          {a.postalCode ? <div className="text-xs text-slate-500">Postal: {a.postalCode}</div> : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border-subtle bg-white/60 p-8 text-center text-sm text-slate-600 md:col-span-2">
                      No addresses yet. Capture billing and delivery addresses for statements and shipping.
                    </div>
                  )}
                </div>
              </ContentCard>
            )
          },
          {
            key: 'raw',
            label: 'Raw JSON',
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                <JsonPanel title="Partner (GET)" value={partner ?? {}} />
                <JsonPanel title="Credit policy (GET)" value={creditPolicy ?? {}} />
              </div>
            )
          }
        ]}
      />

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit partner">
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Name" value={edit.name} onChange={(e) => setEdit((s) => ({ ...s, name: e.target.value }))} />
          <Input label="Code" value={edit.code} onChange={(e) => setEdit((s) => ({ ...s, code: e.target.value }))} />
          <Input label="Email" value={edit.email} onChange={(e) => setEdit((s) => ({ ...s, email: e.target.value }))} />
          <Input label="Phone" value={edit.phone} onChange={(e) => setEdit((s) => ({ ...s, phone: e.target.value }))} />
          <Input label="Status" value={edit.status} onChange={(e) => setEdit((s) => ({ ...s, status: e.target.value }))} />
          <div className="md:col-span-2">
            <Textarea label="Notes" rows={5} value={edit.notes} onChange={(e) => setEdit((s) => ({ ...s, notes: e.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEditOpen(false)}>
            Cancel
          </Button>
          <Button loading={updatePartner.isPending} onClick={() => updatePartner.mutate(edit)}>
            Save
          </Button>
        </div>
      </Modal>

      <Modal open={creditOpen} onClose={() => setCreditOpen(false)} title="Credit policy">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Credit limit"
            value={cp.creditLimit}
            onChange={(e) => setCp((s) => ({ ...s, creditLimit: e.target.value }))}
            placeholder="e.g., 25000"
          />
          <Input
            label="Credit days"
            value={cp.creditDays}
            onChange={(e) => setCp((s) => ({ ...s, creditDays: e.target.value }))}
            placeholder="e.g., 30"
          />
          <label className="flex items-center gap-2 rounded-xl border border-border-subtle bg-white/70 p-3 text-sm text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={cp.holdIfOver}
              onChange={(e) => setCp((s) => ({ ...s, holdIfOver: e.target.checked }))}
            />
            Hold new invoices if over limit
          </label>
          <div className="md:col-span-2">
            <Textarea label="Notes" rows={4} value={cp.notes ?? ''} onChange={(e) => setCp((s) => ({ ...s, notes: e.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCreditOpen(false)}>
            Cancel
          </Button>
          <Button loading={saveCredit.isPending} onClick={() => saveCredit.mutate({ ...cp, creditLimit: cp.creditLimit === '' ? undefined : Number(cp.creditLimit), creditDays: cp.creditDays === '' ? undefined : Number(cp.creditDays) })}>
            Save
          </Button>
        </div>
      </Modal>

      <Modal open={contactOpen} onClose={() => setContactOpen(false)} title="Add contact">
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Name" value={contact.name} onChange={(e) => setContact((s) => ({ ...s, name: e.target.value }))} />
          <Input label="Role" value={contact.role} onChange={(e) => setContact((s) => ({ ...s, role: e.target.value }))} />
          <Input label="Email" value={contact.email} onChange={(e) => setContact((s) => ({ ...s, email: e.target.value }))} />
          <Input label="Phone" value={contact.phone} onChange={(e) => setContact((s) => ({ ...s, phone: e.target.value }))} />
          <label className="flex items-center gap-2 rounded-xl border border-border-subtle bg-white/70 p-3 text-sm text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={contact.isPrimary}
              onChange={(e) => setContact((s) => ({ ...s, isPrimary: e.target.checked }))}
            />
            Primary contact
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setContactOpen(false)}>
            Cancel
          </Button>
          <Button loading={addContact.isPending} onClick={() => addContact.mutate(contact)}>
            Add
          </Button>
        </div>
      </Modal>


      <Modal
        open={contactEditOpen}
        onClose={() => {
          setContactEditOpen(false);
          setEditingContactId(null);
        }}
        title="Edit contact"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Name" value={contactEdit.name} onChange={(e) => setContactEdit((s) => ({ ...s, name: e.target.value }))} />
          <Input label="Role" value={contactEdit.role} onChange={(e) => setContactEdit((s) => ({ ...s, role: e.target.value }))} />
          <Input label="Email" value={contactEdit.email} onChange={(e) => setContactEdit((s) => ({ ...s, email: e.target.value }))} />
          <Input label="Phone" value={contactEdit.phone} onChange={(e) => setContactEdit((s) => ({ ...s, phone: e.target.value }))} />
          <label className="flex items-center gap-2 rounded-xl border border-border-subtle bg-white/70 p-3 text-sm text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={contactEdit.isPrimary}
              onChange={(e) => setContactEdit((s) => ({ ...s, isPrimary: e.target.checked }))}
            />
            Primary contact
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setContactEditOpen(false);
              setEditingContactId(null);
            }}
          >
            Cancel
          </Button>
          <Button
            loading={updateContact.isPending}
            onClick={() =>
              updateContact.mutate({
                contactId: editingContactId,
                body: {
                  name: contactEdit.name || undefined,
                  email: contactEdit.email || undefined,
                  phone: contactEdit.phone || undefined,
                  role: contactEdit.role || undefined,
                  isPrimary: contactEdit.isPrimary
                }
              })
            }
            disabled={!editingContactId}
          >
            Save
          </Button>
        </div>
      </Modal>
      <Modal open={addressOpen} onClose={() => setAddressOpen(false)} title="Add address">
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Label" value={address.label} onChange={(e) => setAddress((s) => ({ ...s, label: e.target.value }))} />
          <Input label="Line 1" value={address.line1} onChange={(e) => setAddress((s) => ({ ...s, line1: e.target.value }))} />
          <Input label="Line 2" value={address.line2} onChange={(e) => setAddress((s) => ({ ...s, line2: e.target.value }))} />
          <Input label="City" value={address.city} onChange={(e) => setAddress((s) => ({ ...s, city: e.target.value }))} />
          <Input label="Region" value={address.region} onChange={(e) => setAddress((s) => ({ ...s, region: e.target.value }))} />
          <Input label="Postal code" value={address.postalCode} onChange={(e) => setAddress((s) => ({ ...s, postalCode: e.target.value }))} />
          <Input label="Country" value={address.country} onChange={(e) => setAddress((s) => ({ ...s, country: e.target.value }))} />
          <label className="flex items-center gap-2 rounded-xl border border-border-subtle bg-white/70 p-3 text-sm text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={address.isPrimary}
              onChange={(e) => setAddress((s) => ({ ...s, isPrimary: e.target.checked }))}
            />
            Primary address
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setAddressOpen(false)}>
            Cancel
          </Button>
          <Button loading={addAddress.isPending} onClick={() => addAddress.mutate(address)}>
            Add
          </Button>
        </div>
      </Modal>
    </div>
  );
}
