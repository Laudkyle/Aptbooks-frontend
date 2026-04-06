import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eraser, FileImage, PenTool, Save, ShieldCheck, Upload, UserRound } from 'lucide-react';

import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeUsersApi } from '../api/users.api.js';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Textarea } from '../../../../shared/components/ui/Textarea.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';

function safeString(value) {
  return value == null ? '' : String(value);
}

function resolveDisplayName(signature = {}, fallbackUser = {}) {
  return (
    signature?.signature_display_name ||
    signature?.display_name ||
    signature?.displayName ||
    [fallbackUser?.first_name, fallbackUser?.last_name].filter(Boolean).join(' ') ||
    fallbackUser?.full_name ||
    fallbackUser?.email ||
    ''
  );
}

function resolveSignatureImage(signature = {}) {
  return (
    signature?.signature_image ||
    signature?.signatureImage ||
    signature?.image ||
    ''
  );
}

function normalizeSignature(data = {}, fallbackUser = {}) {
  return {
    signature_display_name: resolveDisplayName(data, fallbackUser),
    signature_title: safeString(data?.signature_title ?? data?.title),
    signature_notes: safeString(data?.signature_notes ?? data?.notes),
    signature_image: safeString(resolveSignatureImage(data)),
    signature_is_active: Boolean(data?.signature_is_active ?? data?.is_active ?? data?.isActive ?? data?.has_signature ?? resolveSignatureImage(data))
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export function SignatureManager({
  userId,
  mode = 'self',
  title = 'Signature',
  subtitle,
  fallbackUser,
  compact = false,
}) {
  const { http } = useApi();
  const api = useMemo(() => makeUsersApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    signature_display_name: '',
    signature_title: '',
    signature_notes: '',
    signature_image: '',
    signature_is_active: true,
  });
  const [dirty, setDirty] = useState(false);

  const queryKey = mode === 'self' ? ['me', 'signature'] : ['user', userId, 'signature'];

  const signatureQ = useQuery({
    queryKey,
    queryFn: () => (mode === 'self' ? api.meSignature() : api.getSignature(userId)),
    enabled: mode === 'self' || Boolean(userId),
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!signatureQ.data) return;
    setForm(normalizeSignature(signatureQ.data, fallbackUser));
    setDirty(false);
  }, [signatureQ.data, fallbackUser]);

  const saveMutation = useMutation({
    mutationFn: (payload) => (mode === 'self' ? api.updateMeSignature(payload) : api.updateSignature(userId, payload)),
    onSuccess: (data) => {
      toast.success('Signature saved successfully.');
      qc.setQueryData(queryKey, data);
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['me'] });
      if (userId) qc.invalidateQueries({ queryKey: ['user', userId] });
      setDirty(false);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? error?.message ?? 'Failed to save signature.');
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => (mode === 'self' ? api.deleteMeSignature() : api.deleteSignature(userId)),
    onSuccess: (data) => {
      toast.success('Signature cleared successfully.');
      qc.setQueryData(queryKey, data);
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['me'] });
      if (userId) qc.invalidateQueries({ queryKey: ['user', userId] });
      setDirty(false);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? error?.message ?? 'Failed to clear signature.');
    },
  });

  const imageUrl = form.signature_image || '';
  const hasSignatureImage = Boolean(imageUrl);
  const isActive = Boolean(form.signature_is_active);
  const effectiveSubtitle = subtitle || (mode === 'self'
    ? 'Your signature is stored per organization and will appear in print templates when the document template requires it.'
    : 'This signature belongs to the selected user in the current organization and is used by print templates that render signatories.');

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((prev) => ({ ...prev, signature_image: dataUrl, signature_is_active: true }));
      setDirty(true);
    } catch (error) {
      toast.error(error?.message ?? 'Failed to read the selected file.');
    } finally {
      event.target.value = '';
    }
  };

  const handleSave = () => {
    saveMutation.mutate({
      signature_display_name: form.signature_display_name || null,
      signature_title: form.signature_title || null,
      signature_notes: form.signature_notes || null,
      signature_image: form.signature_image || null,
      signature_is_active: Boolean(form.signature_is_active),
    });
  };

  return (
    <ContentCard>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <PenTool className="h-4 w-4 text-slate-500" />
            {title}
          </div>
          <div className="mt-1 max-w-3xl text-sm text-slate-500">{effectiveSubtitle}</div>
        </div>
        <Badge tone={isActive ? 'success' : 'muted'} className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          {isActive ? 'Active on prints' : 'Inactive'}
        </Badge>
      </div>

      {signatureQ.isLoading ? (
        <div className="text-sm text-slate-500">Loading signature...</div>
      ) : signatureQ.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {signatureQ.error?.response?.data?.message ?? signatureQ.error?.message ?? 'Failed to load signature.'}
        </div>
      ) : (
        <div className={`grid gap-6 ${compact ? 'xl:grid-cols-[1.1fr_0.9fr]' : 'xl:grid-cols-[1.2fr_0.8fr]'}`}>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Display name"
                value={form.signature_display_name}
                onChange={(e) => handleChange('signature_display_name', e.target.value)}
                placeholder="Name to show under signature"
              />
              <Input
                label="Title / role"
                value={form.signature_title}
                onChange={(e) => handleChange('signature_title', e.target.value)}
                placeholder="Finance Manager"
              />
            </div>

            <Textarea
              label="Print note"
              rows={3}
              value={form.signature_notes}
              onChange={(e) => handleChange('signature_notes', e.target.value)}
              placeholder="Optional note shown in internal audit context or retained with the signature record"
            />

            <Input
              label="Signature image URL or path"
              value={form.signature_image}
              onChange={(e) => handleChange('signature_image', e.target.value)}
              placeholder="Paste a data URL, https URL, or app-relative image path"
            />

            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(form.signature_is_active)}
                onChange={(e) => handleChange('signature_is_active', e.target.checked)}
              />
              Signature is active for print rendering in this organization
            </label>

            <div className="flex flex-wrap gap-2">
              <Button leftIcon={Save} onClick={handleSave} loading={saveMutation.isPending} disabled={!dirty && !saveMutation.isPending}>
                Save signature
              </Button>
              <Button variant="outline" leftIcon={Upload} onClick={() => fileInputRef.current?.click()}>
                Upload image
              </Button>
              <Button
                variant="outline"
                leftIcon={Eraser}
                onClick={() => {
                  setForm((prev) => ({ ...prev, signature_image: '', signature_is_active: false }));
                  setDirty(true);
                }}
              >
                Remove image
              </Button>
              <Button variant="ghost" leftIcon={FileImage} onClick={() => clearMutation.mutate()} loading={clearMutation.isPending}>
                Reset record
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </div>

            {dirty ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                You have unsaved signature changes.
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Print preview block</div>
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                {hasSignatureImage ? (
                  <img src={imageUrl} alt="User signature" className="mb-3 max-h-24 max-w-full object-contain" />
                ) : (
                  <div className="mb-3 inline-flex h-16 w-full items-center justify-center rounded-xl bg-white text-slate-400">
                    <UserRound className="h-8 w-8" />
                  </div>
                )}
                <div className="border-t border-slate-300 pt-3 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">{form.signature_display_name || 'No display name set'}</div>
                  <div className="mt-1 text-slate-500">{form.signature_title || 'No title set'}</div>
                  {form.signature_notes ? <div className="mt-2 text-xs text-slate-500">{form.signature_notes}</div> : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="mb-2 font-medium text-slate-900">How this works</div>
              <ul className="list-disc space-y-1 pl-5">
                <li>Signatures are stored per user per organization.</li>
                <li>Printouts only show the signature when the selected print template includes signature blocks.</li>
                <li>The document must also carry the relevant signatory user fields such as prepared by, approved by, or posted by.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </ContentCard>
  );
}

export default SignatureManager;
