import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeSettingsApi } from '../api/settings.api.js';
import { makeNotificationsApi } from '../../../notifications/api/notifications.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Tabs } from '../../../../shared/components/ui/Tabs.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';

export default function SystemSettings() {
  const { http } = useApi();
  const settingsApi = useMemo(() => makeSettingsApi(http), [http]);
  const notifApi = useMemo(() => makeNotificationsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [tab, setTab] = useState('settings');

  return (
    <div className="space-y-4">
      <PageHeader title="System Settings" subtitle="Core settings and notification SMTP configuration." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'settings', label: 'Settings' },
          { value: 'smtp', label: 'SMTP' }
        ]}
      />

      {tab === 'settings' ? (
        <SettingsTab settingsApi={settingsApi} qc={qc} toast={toast} />
      ) : (
        <SmtpTab notifApi={notifApi} qc={qc} toast={toast} />
      )}
    </div>
  );
}

function SettingsTab({ settingsApi, qc, toast }) {
  const [prefix, setPrefix] = useState('');
  const [limit, setLimit] = useState(100);
  const [selectedKey, setSelectedKey] = useState('');
  const [valueText, setValueText] = useState('{}');

  const listQ = useQuery({
    queryKey: ['settings', prefix, limit],
    queryFn: () => settingsApi.list({ prefix: prefix || undefined, limit }),
    staleTime: 10_000
  });

  const items = listQ.data?.data ?? [];

  const put = useMutation({
    mutationFn: async () => {
      const json = valueText ? JSON.parse(valueText) : {};
      return settingsApi.put(selectedKey, json);
    },
    onSuccess: () => {
      toast.success('Setting saved.');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e) => toast.error(e.message ?? 'Save failed')
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ContentCard title="Settings List">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <Input label="Prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="optional" className="w-64" />
          <Input
            label="Limit"
            type="number"
            min={1}
            max={500}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value) || 100)}
            className="w-28"
          />
          <Button variant="secondary" onClick={() => qc.invalidateQueries({ queryKey: ['settings'] })}>Refresh</Button>
        </div>

        {listQ.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : listQ.isError ? (
          <div className="text-sm text-red-700">{listQ.error?.message ?? 'Failed to load settings.'}</div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Key</TH>
                <TH>Actions</TH>
              </tr>
            </THead>
            <TBody>
              {items.map((s) => (
                <tr key={s.key}>
                  <TD className="font-mono text-xs">{s.key}</TD>
                  <TD>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedKey(s.key);
                        setValueText(JSON.stringify(s.value_json ?? {}, null, 2));
                      }}
                    >
                      Edit
                    </Button>
                  </TD>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr><TD colSpan={2} className="text-slate-500">No settings.</TD></tr>
              ) : null}
            </TBody>
          </Table>
        )}
      </ContentCard>

      <ContentCard
        title="Editor"
        actions={
          <Button onClick={() => put.mutate()} disabled={!selectedKey || put.isLoading}>
            Save
          </Button>
        }
      >
        <div className="space-y-2">
          <Input label="Key" value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)} placeholder="setting key" />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Value JSON</span>
            <textarea
              className="h-72 w-full rounded-md border border-slate-200 bg-white p-3 text-xs font-mono focus:border-brand-light focus:ring-2 focus:ring-brand-light"
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
            />
          </label>
          <div className="text-xs text-slate-600">
            If key is <span className="font-mono">inventoryCostMethod</span>, backend expects <span className="font-mono">{{"method":"WEIGHTED_AVERAGE|FIFO"}}</span>.
          </div>
        </div>
      </ContentCard>
    </div>
  );
}

function SmtpTab({ notifApi, qc, toast }) {
  const q = useQuery({ queryKey: ['smtp'], queryFn: notifApi.getSmtp, staleTime: 10_000 });
  const [form, setForm] = useState({ host: 'smtp.gmail.com', port: 587, from: '', username: '', appPassword: '' });

  React.useEffect(() => {
    if (!q.data) return;
    if (q.data === null) return;
    setForm({
      host: q.data.host ?? 'smtp.gmail.com',
      port: q.data.port ?? 587,
      from: q.data.from ?? '',
      username: q.data.username ?? '',
      appPassword: q.data.appPassword ?? ''
    });
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => notifApi.putSmtp({
      host: form.host || undefined,
      port: Number(form.port) || 587,
      from: form.from,
      username: form.username,
      appPassword: form.appPassword
    }),
    onSuccess: () => {
      toast.success('SMTP saved.');
      qc.invalidateQueries({ queryKey: ['smtp'] });
    },
    onError: (e) => toast.error(e.message ?? 'SMTP save failed')
  });

  const test = useMutation({
    mutationFn: (to) => notifApi.testSmtp(to),
    onSuccess: (r) => toast.success(r?.message ?? 'SMTP test endpoint responded.'),
    onError: (e) => toast.error(e.message ?? 'SMTP test failed')
  });

  const [to, setTo] = useState('');

  return (
    <ContentCard
      title="SMTP"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => qc.invalidateQueries({ queryKey: ['smtp'] })}>Refresh</Button>
          <Button onClick={() => save.mutate()} disabled={save.isLoading}>Save</Button>
        </div>
      }
    >
      {q.isLoading ? (
        <div className="text-sm text-slate-700">Loading...</div>
      ) : q.isError ? (
        <div className="text-sm text-red-700">{q.error?.message ?? 'Failed to load SMTP.'}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Host" value={form.host} onChange={(e) => setForm((s) => ({ ...s, host: e.target.value }))} />
          <Input label="Port" type="number" value={form.port} onChange={(e) => setForm((s) => ({ ...s, port: e.target.value }))} />
          <Input label="From" value={form.from} onChange={(e) => setForm((s) => ({ ...s, from: e.target.value }))} />
          <Input label="Username" value={form.username} onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))} />
          <Input label="App Password" type="password" value={form.appPassword} onChange={(e) => setForm((s) => ({ ...s, appPassword: e.target.value }))} />
          <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-medium text-slate-900">Test endpoint</div>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <Input label="To" value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient email" className="w-80" />
              <Button variant="secondary" onClick={() => test.mutate(to)} disabled={!to || test.isLoading}>Test</Button>
            </div>
            <div className="mt-2 text-xs text-slate-600">
              Backend note: current build validates config existence only; does not send an actual email.
            </div>
          </div>
        </div>
      )}

      <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-800">Raw SMTP value</summary>
        <pre className="mt-2 max-h-96 overflow-auto text-xs">{JSON.stringify(q.data, null, 2)}</pre>
      </details>
    </ContentCard>
  );
}
