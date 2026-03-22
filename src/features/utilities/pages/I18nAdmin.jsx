import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeUtilitiesApi } from '../api/utilities.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';

export default function I18nAdmin() {
  const { http } = useApi();
  const api = useMemo(() => makeUtilitiesApi(http), [http]);
  const localesQ = useQuery({ queryKey: ['i18nLocales'], queryFn: api.i18nLocales, staleTime: 60_000 });
  const [locale, setLocale] = useState('');
  const messagesQ = useQuery({ queryKey: ['i18nMessages', locale], queryFn: () => api.i18nMessages(locale), enabled: !!locale });

  const locales = localesQ.data?.data ?? localesQ.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="i18n Admin" subtitle="Locales and messages" />
      <ContentCard title="Locales">
        {localesQ.isLoading ? (
          <div className="text-sm text-text-body">Loading...</div>
        ) : localesQ.isError ? (
          <div className="text-sm text-red-700">{localesQ.error?.message ?? 'Failed to load locales.'}</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {locales.map((l) => (
              <Button
                key={l}
                variant={locale === l ? 'primary' : 'outline'}
                onClick={() => setLocale(l)}
              >
                {l}
              </Button>
            ))}
            {locales.length === 0 ? <div className="text-sm text-text-muted">No locales.</div> : null}
          </div>
        )}
      </ContentCard>

      <ContentCard title="Messages">
        <div className="mb-3">
          <Input label="Locale" value={locale} onChange={(e) => setLocale(e.target.value)} placeholder="e.g. en" className="w-40" />
        </div>
        {!locale ? (
          <div className="text-sm text-text-body">Select or enter a locale to load messages.</div>
        ) : messagesQ.isLoading ? (
          <div className="text-sm text-text-body">Loading...</div>
        ) : messagesQ.isError ? (
          <div className="text-sm text-red-700">{messagesQ.error?.message ?? 'Failed to load messages.'}</div>
        ) : (
          <pre className="max-h-[32rem] overflow-auto rounded bg-surface-2 p-3 text-xs">{JSON.stringify(messagesQ.data, null, 2)}</pre>
        )}
      </ContentCard>
    </div>
  );
}
