import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, CheckCircle2, LockKeyhole, Mail, MapPin, Phone, ShieldCheck, UserRound } from 'lucide-react';

import { useApi } from '../../../../shared/hooks/useApi.js';
import { useAuth } from '../../../../shared/hooks/useAuth.js';
import { makeSettingsApi } from '../../settings/api/settings.api.js';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { qk } from '../../../../shared/query/keys.js';

function Toggle({ checked, onChange, label, description, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start justify-between gap-4 rounded-2xl border p-4 text-left transition ${
        checked ? 'border-brand-primary/40 bg-brand-primary/5' : 'border-slate-200 bg-white hover:border-slate-300'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      aria-pressed={checked}
    >
      <span>
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
      <span className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${checked ? 'bg-brand-primary' : 'bg-slate-300'}`}>
        <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition ${checked ? 'translate-x-5' : 'translate-x-0'}`}>
          {checked ? <Check className="h-3 w-3 text-brand-primary" /> : null}
        </span>
      </span>
    </button>
  );
}

function LoadingGate() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="text-center text-white">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        <div className="text-sm font-medium">Preparing your organization…</div>
      </div>
    </div>
  );
}

export function OrganizationOnboardingGate({ children }) {
  const { http } = useApi();
  const { user, logout } = useAuth();
  const api = useMemo(() => makeSettingsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const query = useQuery({
    queryKey: ['organization-onboarding', user?.organization_id],
    queryFn: () => api.onboarding.get(),
    enabled: Boolean(user?.organization_id),
    staleTime: 5_000,
    retry: 1,
  });

  const [fullName, setFullName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [inventoryCostMethod, setInventoryCostMethod] = useState('WEIGHTED_AVERAGE');
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [creatorCanApprove, setCreatorCanApprove] = useState(false);
  const [creatorCanPost, setCreatorCanPost] = useState(false);
  const [requireCommentOnRejection, setRequireCommentOnRejection] = useState(true);

  useEffect(() => {
    if (!query.data) return;
    setFullName(query.data.user?.fullName || '');
    setContactEmail(query.data.organization?.contactEmail || query.data.user?.email || '');
    setContactPhone(query.data.organization?.contactPhone || '');
    const address = query.data.organization?.address || {};
    setAddressLine1(address.addressLine1 || address.line1 || address.street || '');
    setCity(address.city || '');
    setCountry(address.country || '');
    setInventoryCostMethod(query.data.accounting?.inventoryCostMethod || 'WEIGHTED_AVERAGE');
    setApprovalRequired(query.data.journalWorkflow?.approvalRequired ?? true);
    setCreatorCanApprove(Boolean(query.data.journalWorkflow?.creatorCanApprove));
    setCreatorCanPost(Boolean(query.data.journalWorkflow?.creatorCanPost));
    setRequireCommentOnRejection(query.data.journalWorkflow?.requireCommentOnRejection !== false);
  }, [query.data]);

  const complete = useMutation({
    mutationFn: () => api.onboarding.complete({
      fullName: fullName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      addressLine1: addressLine1.trim(),
      city: city.trim(),
      country: country.trim(),
      inventoryCostMethod,
      approvalRequired,
      creatorCanApprove,
      creatorCanPost,
      requireCommentOnRejection,
      notifyCreatorOnApproval: true,
      notifyCreatorOnRejection: true,
    }),
    onSuccess: async (data) => {
      qc.setQueryData(['organization-onboarding', user?.organization_id], data);
      await qc.invalidateQueries({ queryKey: qk.me });
      await qc.invalidateQueries({ queryKey: qk.orgMe });
      toast.success('Organization setup completed. Welcome to AptBooks.');
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || 'Could not complete setup.'),
  });

  if (!user?.organization_id || query.isLoading) return <LoadingGate />;
  if (query.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
          <h1 className="text-xl font-bold text-slate-900">Setup check failed</h1>
          <p className="mt-2 text-sm text-slate-600">AptBooks could not verify whether this organization has completed mandatory setup.</p>
          <div className="mt-5 flex gap-2">
            <Button onClick={() => query.refetch()}>Retry</Button>
            <Button variant="secondary" onClick={logout}>Sign out</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!query.data?.required) return children;

  const canComplete = fullName.trim().length >= 2
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())
    && Boolean(contactPhone.trim())
    && Boolean(addressLine1.trim())
    && Boolean(city.trim())
    && Boolean(country.trim())
    && Boolean(inventoryCostMethod);
  const org = query.data.organization || {};

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-2xl shadow-black/30">
        <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="relative overflow-hidden bg-slate-950 p-8 text-white lg:p-10">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-primary/30 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80">
                <LockKeyhole className="h-3.5 w-3.5" /> Mandatory first-run setup
              </div>
              <h1 className="mt-8 text-3xl font-bold tracking-tight">Set the rules before the books open.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">These choices become the starting accounting and approval policy for {org.name || 'your organization'}.</p>

              <div className="mt-10 space-y-5">
                {[
                  ['1', 'Identity', 'Your full name is used on every document you print.'],
                  ['2', 'Organization details', 'Complete the contact and address details printed on accounting documents.'],
                  ['3', 'Accounting policy', 'Choose the inventory costing method before transactions begin.'],
                  ['4', 'Approval controls', 'A global Admin approval step protects every document by default; specific document types can be overridden later.'],
                ].map(([n, title, text]) => (
                  <div key={n} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">{n}</div>
                    <div><div className="text-sm font-semibold">{title}</div><div className="mt-1 text-xs leading-5 text-slate-400">{text}</div></div>
                  </div>
                ))}
              </div>

              <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Base currency</div>
                <div className="mt-2 text-lg font-bold">{org.baseCurrencyCode || '—'}</div>
                <div className="mt-1 text-xs text-slate-400">Selected during organization creation.</div>
              </div>
            </div>
          </aside>

          <main className="p-6 sm:p-8 lg:p-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[.18em] text-brand-primary">Organization setup</div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Mandatory accounting settings</h2>
              </div>
              <Building2 className="h-8 w-8 text-slate-300" />
            </div>

            <div className="mt-8 space-y-7">
              <section>
                <div className="mb-3 flex items-center gap-2"><UserRound className="h-4 w-4 text-brand-primary" /><h3 className="text-sm font-bold text-slate-900">Signed-in user</h3></div>
                <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Ama Mensah" required helperText="This exact name appears on print templates generated by you." />
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2"><Building2 className="h-4 w-4 text-brand-primary" /><h3 className="text-sm font-bold text-slate-900">Organization identity</h3></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Contact email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="accounts@company.com" required />
                  <Input label="Contact phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+233..." required />
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Input label="Business address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="Street / area" required />
                  </div>
                  <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} required />
                  <Input label="Country" value={country} onChange={(e) => setCountry(e.target.value)} required />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> Used on document headers</span>
                  <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> Organization contact</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> Printed business address</span>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand-primary" /><h3 className="text-sm font-bold text-slate-900">Accounting policy</h3></div>
                <Select
                  label="Inventory costing method"
                  value={inventoryCostMethod}
                  onChange={(e) => setInventoryCostMethod(e.target.value)}
                  options={[
                    { value: 'WEIGHTED_AVERAGE', label: 'Weighted average' },
                    { value: 'FIFO', label: 'FIFO — First in, first out' },
                  ]}
                />
              </section>

              <section>
                <div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-primary" /><h3 className="text-sm font-bold text-slate-900">Default approval flow</h3></div>
                <div className="mb-4 rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">Default approver: Admin</div>
                  <div className="mt-1 text-xs leading-5 text-slate-600">This becomes the global approval ladder for invoices, bills, journals and every other workflow document. An administrator can create a document-specific override later.</div>
                </div>
                <div className="space-y-3">
                  <Toggle checked={approvalRequired} onChange={setApprovalRequired} label="Require approval for workflow documents" description="Applies the Admin approval step globally unless a document type has an explicit override." />
                  <Toggle checked={creatorCanApprove} onChange={setCreatorCanApprove} label="Non-admin creator can approve their own journal" description={approvalRequired ? 'Admins can approve by default. Enable this only if non-admin journal creators may self-approve too.' : 'Stored as the self-approval policy if approval is enabled later.'} />
                  <Toggle checked={creatorCanPost} onChange={setCreatorCanPost} label="Non-admin creator can post their own journal" description={approvalRequired ? 'Admins can post by default after approval. Enable this if non-admin creators may post their own approved journals.' : 'Enable this if non-admin creators may post a valid draft directly when approval is disabled.'} />
                  <Toggle checked={requireCommentOnRejection} onChange={setRequireCommentOnRejection} label="Require a reason when rejecting" description="Recommended for a useful audit trail and clear rework instructions." />
                </div>
              </section>
            </div>

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-200 pt-6">
              <p className="max-w-md text-xs leading-5 text-slate-500">This setup cannot be skipped. An administrator can refine workflow rules later in System Settings.</p>
              <Button onClick={() => complete.mutate()} disabled={!canComplete || complete.isPending}>
                {complete.isPending ? 'Applying settings…' : 'Complete setup'}
              </Button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
