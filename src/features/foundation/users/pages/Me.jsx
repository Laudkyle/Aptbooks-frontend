import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Mail, Phone, Shield, User } from 'lucide-react';

import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeUsersApi } from '../api/users.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';
import { SignatureManager } from '../components/SignatureManager.jsx';

function displayName(user = {}) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.full_name || user?.email || 'My profile';
}

export default function Me() {
  const { http } = useApi();
  const api = useMemo(() => makeUsersApi(http), [http]);

  const q = useQuery({ queryKey: ['me'], queryFn: api.me, staleTime: 10_000 });

  const user = q.data?.user ?? {};
  const roles = Array.isArray(q.data?.roles) ? q.data.roles : [];
  const permissions = Array.isArray(q.data?.permissions) ? q.data.permissions : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="Manage your organization-scoped identity and print signature."
        icon={User}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <ContentCard>
            {q.isLoading ? (
              <div className="text-sm text-slate-700">Loading profile...</div>
            ) : q.isError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {q.error?.response?.data?.message ?? q.error?.message ?? 'Failed to load profile.'}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{displayName(user)}</div>
                    <div className="mt-1 text-sm text-slate-500">Your active organization profile and access summary.</div>
                  </div>
                  <Badge tone={String(user?.status || '').toLowerCase() === 'active' ? 'success' : 'muted'}>
                    {user?.status || 'unknown'}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700"><Mail className="h-4 w-4" /> Email</div>
                    <div className="text-sm text-slate-900">{user?.email || '—'}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700"><Phone className="h-4 w-4" /> Phone</div>
                    <div className="text-sm text-slate-900">{user?.phone || '—'}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                    <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700"><Shield className="h-4 w-4" /> Roles</div>
                    <div className="flex flex-wrap gap-2">
                      {roles.length ? roles.map((role) => (
                        <Badge key={role.id ?? role.name} tone="info">{role.name ?? role.id}</Badge>
                      )) : <span className="text-sm text-slate-500">No roles assigned.</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ContentCard>

          <SignatureManager mode="self" fallbackUser={user} />
        </div>

        <div className="space-y-6">
          <ContentCard title="Organization-scoped access">
            {q.isLoading ? (
              <div className="text-sm text-slate-500">Loading access summary...</div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-1 flex items-center gap-2 font-medium text-slate-800"><Building2 className="h-4 w-4" /> Current scope</div>
                  <div className="text-slate-600">This signature is saved against your membership in the active organization, not globally across all organizations.</div>
                </div>
                <div>
                  <div className="mb-2 font-medium text-slate-900">Permissions</div>
                  <div className="max-h-[24rem] overflow-auto rounded-2xl border border-slate-200 bg-white p-3">
                    {permissions.length ? (
                      <div className="flex flex-wrap gap-2">
                        {permissions.map((permission) => (
                          <span key={permission} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                            {permission}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-500">No permissions available.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </ContentCard>
        </div>
      </div>
    </div>
  );
}
