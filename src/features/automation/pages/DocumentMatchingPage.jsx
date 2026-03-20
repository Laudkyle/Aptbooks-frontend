import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAutomationApi } from '../api/automation.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';
import { ROUTES } from '../../../app/constants/routes.js';

function rowsOf(d){ return Array.isArray(d?.items) ? d.items : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []; }

export default function DocumentMatchingPage() {
  const { http } = useApi();
  const api = useMemo(() => makeAutomationApi(http), [http]);
  const toast = useToast();
  const [params, setParams] = useState({ documentType:'', minScore:'' });
  const matchesQ = useQuery({ queryKey:['automation.documentMatching.matches', params], queryFn:()=>api.listDocumentMatches(params) });
  const run = useMutation({ mutationFn:(payload)=>api.runDocumentMatching(payload), onSuccess:()=>{ toast.success('Document matching run started'); matchesQ.refetch(); }, onError:(e)=>toast.error(e?.response?.data?.error || e.message) });
  const rows = rowsOf(matchesQ.data);
  return (<>
    <PageHeader title="Intelligent Document Matching" subtitle="Review settlement/document suggestions and trigger matching runs." actions={<Button onClick={()=>run.mutate(params)}>Run matching</Button>} />
    <ContentCard>
      <div className="grid gap-4 md:grid-cols-3">
        <Select label="Document type" value={params.documentType} onChange={(e)=>setParams((s)=>({...s, documentType:e.target.value}))} options={[{value:'',label:'All document types'},{value:'invoice_receipt',label:'Invoices ↔ Receipts'},{value:'bill_payment',label:'Bills ↔ Vendor Payments'}]} />
        <Input label="Minimum score" type="number" step="0.01" value={params.minScore} onChange={(e)=>setParams((s)=>({...s, minScore:e.target.value}))} />
        <div className="flex items-end"><Button variant="secondary" onClick={()=>matchesQ.refetch()}>Refresh results</Button></div>
      </div>
    </ContentCard>
    <ContentCard className="mt-4">
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="py-2">Type</th><th>Source</th><th>Target</th><th>Score</th><th>Status</th></tr></thead><tbody>{rows.map((m)=><tr key={m.id || `${m.source_id}-${m.target_id}`} className="border-t"><td className="py-2">{m.match_type ?? m.matchType ?? '—'}</td><td>{m.source_code ?? m.sourceCode ?? m.source_id ?? '—'}</td><td>{m.target_code ?? m.targetCode ?? m.target_id ?? '—'}</td><td>{m.score ?? '—'}</td><td><Badge variant={m.status === 'matched' ? 'success' : 'warning'}>{m.status ?? 'suggested'}</Badge></td></tr>)}{!rows.length && <tr><td className="py-3 text-slate-500" colSpan={5}>No document matching suggestions.</td></tr>}</tbody></table></div>
    </ContentCard>
  </>);
}
