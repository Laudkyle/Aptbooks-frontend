import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, ImagePlus, Mail, MapPin, Phone, Save, Palette, Globe, FileText } from 'lucide-react';

import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeOrganizationsApi } from '../api/organizations.api.js';

import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';

function safeObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

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
    contactEmail: '',
    contactPhone: '',

    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',

    website: '',
    registrationNumber: '',
    taxId: '',
    primaryColor: '',
    secondaryColor: ''
  });

  useEffect(() => {
    if (!q.data) return;

    const address = safeObj(q.data.address_json);
    const branding = safeObj(q.data.branding_json);

    setForm({
      name: q.data.name ?? '',
      contactEmail: q.data.contact_email ?? '',
      contactPhone: q.data.contact_phone ?? '',

      addressLine1:
        address.addressLine1 ??
        address.line1 ??
        address.street ??
        '',
      addressLine2:
        address.addressLine2 ??
        address.line2 ??
        '',
      city: address.city ?? '',
      state: address.state ?? address.region ?? '',
      postalCode: address.postalCode ?? address.post_code ?? address.zip ?? '',
      country: address.country ?? '',

      website: branding.website ?? '',
      registrationNumber: branding.registrationNumber ?? branding.registration_number ?? '',
      taxId: branding.taxId ?? branding.tax_id ?? '',
      primaryColor: branding.primaryColor ?? branding.primary_color ?? '',
      secondaryColor: branding.secondaryColor ?? branding.secondary_color ?? ''
    });
  }, [q.data]);

  const update = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name || undefined,
        contact_email: form.contactEmail || undefined,
        contact_phone: form.contactPhone || undefined,
        address_json: {
          addressLine1: form.addressLine1 || '',
          addressLine2: form.addressLine2 || '',
          city: form.city || '',
          state: form.state || '',
          postalCode: form.postalCode || '',
          country: form.country || ''
        },
        branding_json: {
          website: form.website || '',
          registrationNumber: form.registrationNumber || '',
          taxId: form.taxId || '',
          primaryColor: form.primaryColor || '',
          secondaryColor: form.secondaryColor || ''
        }
      };

      return api.updateMe(body);
    },
    onSuccess: () => {
      toast.success('Organization settings were updated successfully.');
      qc.invalidateQueries({ queryKey: ['orgMe'] });
    },
    onError: (e) => toast.error(e.message ?? 'We could not update organization settings.')
  });

  const upload = useMutation({
    mutationFn: (file) => api.uploadLogo(file),
    onSuccess: () => {
      toast.success('Logo uploaded successfully.');
      qc.invalidateQueries({ queryKey: ['orgMe'] });
    },
    onError: (e) => toast.error(e.message ?? 'We could not upload the logo.')
  });

  const logoUrl =
    q.data?.branding_json?.logoUrl ||
    q.data?.branding_json?.logo_url ||
    q.data?.logo_url ||
    '';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Settings"
        subtitle="Manage your organization profile, contact details, address, and brand identity."
        icon={Building2}
        actions={
          <Button onClick={() => update.mutate()} disabled={update.isPending || q.isLoading}>
            <Save className="mr-2 h-4 w-4" />
            Save changes
          </Button>
        }
      />

      <ContentCard>
        {q.isLoading ? (
          <div className="text-sm text-text-muted">Loading organization settings...</div>
        ) : q.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {q.error?.message ?? 'We could not load the organization settings.'}
          </div>
        ) : (
          <div className="space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-text-muted" />
                <h2 className="text-base font-semibold text-text-strong">Profile</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Organization name"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                />
                <Input
                  label="Website"
                  value={form.website}
                  onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-text-muted" />
                <h2 className="text-base font-semibold text-text-strong">Contact details</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Contact email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((s) => ({ ...s, contactEmail: e.target.value }))}
                  placeholder="info@company.com"
                />
                <Input
                  label="Contact phone"
                  value={form.contactPhone}
                  onChange={(e) => setForm((s) => ({ ...s, contactPhone: e.target.value }))}
                  placeholder="+233..."
                />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-text-muted" />
                <h2 className="text-base font-semibold text-text-strong">Address</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Address line 1"
                  value={form.addressLine1}
                  onChange={(e) => setForm((s) => ({ ...s, addressLine1: e.target.value }))}
                  placeholder="Street address"
                />
                <Input
                  label="Address line 2"
                  value={form.addressLine2}
                  onChange={(e) => setForm((s) => ({ ...s, addressLine2: e.target.value }))}
                  placeholder="Suite, landmark, or area"
                />
                <Input
                  label="City"
                  value={form.city}
                  onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
                />
                <Input
                  label="State / Region"
                  value={form.state}
                  onChange={(e) => setForm((s) => ({ ...s, state: e.target.value }))}
                />
                <Input
                  label="Postal code"
                  value={form.postalCode}
                  onChange={(e) => setForm((s) => ({ ...s, postalCode: e.target.value }))}
                />
                <Input
                  label="Country"
                  value={form.country}
                  onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))}
                />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-text-muted" />
                <h2 className="text-base font-semibold text-text-strong">Registration</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Registration number"
                  value={form.registrationNumber}
                  onChange={(e) => setForm((s) => ({ ...s, registrationNumber: e.target.value }))}
                />
                <Input
                  label="Tax ID"
                  value={form.taxId}
                  onChange={(e) => setForm((s) => ({ ...s, taxId: e.target.value }))}
                />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-text-muted" />
                <h2 className="text-base font-semibold text-text-strong">Branding</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Primary brand color"
                  type="color"
                  value={form.primaryColor || '#2563eb'}
                  onChange={(e) => setForm((s) => ({ ...s, primaryColor: e.target.value }))}
                />
                <Input
                  label="Secondary brand color"
                  type="color"
                  value={form.secondaryColor || '#0f172a'}
                  onChange={(e) => setForm((s) => ({ ...s, secondaryColor: e.target.value }))}
                />
              </div>
            </section>
          </div>
        )}
      </ContentCard>

      <ContentCard title="Logo">
        <div className="space-y-4">
          {logoUrl ? (
            <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
              <div className="mb-3 text-sm font-medium text-text-body">Current logo</div>
              <img
                src={logoUrl}
                alt="Organization logo"
                className="max-h-20 w-auto object-contain"
              />
            </div>
          ) : null}

          <div className="rounded-xl border border-dashed border-border-subtle bg-surface-2 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-text-body">
              <ImagePlus className="h-4 w-4" />
              Upload new logo
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.mutate(file);
              }}
            />

            {upload.isPending ? (
              <div className="mt-2 text-sm text-text-muted">Uploading logo...</div>
            ) : null}
          </div>
        </div>
      </ContentCard>
    </div>
  );
}