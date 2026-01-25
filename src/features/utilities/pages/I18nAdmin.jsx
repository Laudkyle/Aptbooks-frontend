import React, { useMemo, useState } from 'react'; 
import { useQuery } from '@tanstack/react-query'; 
import { useApi } from '../../../shared/hooks/useApi.js'; 
import { makeUtilitiesApi } from '../api/utilities.api.js'; 
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx'; 
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx'; 
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
          <div className="text-sm text-slate-700">Loading...</div>
        ) : localesQ.isError ? (
          <div className="text-sm text-red-700">{localesQ.error?.message ?? 'Failed to load locales.'}</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {locales.map((l) => (
              <button
                key={l}
                className={`rounded-md border px-3 py-2 text-sm ${locale === l ? 'border-brand-primary bg-brand-primary text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                onClick={() => setLocale(l)}
              >
                {l}
              </button>
            ))}
            {locales.length === 0 ? <div className="text-sm text-slate-500">No locales.</div> : null}
          </div>
        )}
      </ContentCard>

      <ContentCard title="Messages">
        <div className="mb-3">
          <Input label="Locale" value={locale} onChange={(e) => setLocale(e.target.value)} placeholder="e.g. en" className="w-40" />
        </div>
        {!locale ? (
          <div className="text-sm text-slate-700">Select or enter a locale to load messages.</div>
        ) : messagesQ.isLoading ? (
          <div className="text-sm text-slate-700">Loading...</div>
        ) : messagesQ.isError ? (
          <div className="text-sm text-red-700">{messagesQ.error?.message ?? 'Failed to load messages.'}</div>
        ) : (
          <pre className="max-h-[32rem] overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(messagesQ.data, null, 2)}</pre>
        )}
      </ContentCard>
    </div>
  ); 
}
