import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAutomationApi } from '../api/automation.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

function rowsOf(d){ return Array.isArray(d?.items) ? d.items : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []; }

export default function DocumentMatchingPage() {
  const { http } = useApi();
  const api = useMemo(() => makeAutomationApi(http), [http]);
  const toast = useToast();
  const [params, setParams] = useState({ documentType:'', minScore:'0.80' });
  const matchesQ = useQuery({ queryKey:['automation.documentMatching.matches', params], queryFn:()=>api.listDocumentMatches(params) });
  const run = useMutation({ mutationFn:(payload)=>api.runDocumentMatching(payload), onSuccess:()=>{ toast.success('Document matching run started'); matchesQ.refetch(); }, onError:(e)=>toast.error(e?.response?.data?.error || e.message) });
  const rows = rowsOf(matchesQ.data);

  const columns = [
    { header: 'Type', render: (m) => m.match_type ?? m.matchType ?? '—' },
    { header: 'Source', render: (m) => <span className="font-medium text-slate-900">{m.source_code ?? m.sourceCode ?? m.source_id ?? '—'}</span> },
    { header: 'Target', render: (m) => m.target_code ?? m.targetCode ?? m.target_id ?? '—' },
    { header: 'Score', render: (m) => m.score ?? '—' },
    { header: 'Status', render: (m) => <Badge tone={m.status === 'matched' ? 'success' : 'warning'}>{m.status ?? 'suggested'}</Badge> }
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Intelligent Document Matching" subtitle="Review document-to-settlement suggestions and trigger matching cycles when fresh data arrives." actions={<Button onClick={()=>run.mutate(params)}>Run matching</Button>} />
      <ContentCard>
        <FilterBar left={<div className="grid gap-3 md:grid-cols-3"><Select label="Document type" value={params.documentType} onChange={(e)=>setParams((s)=>({...s, documentType:e.target.value}))} options={[{value:'',label:'All document types'},{value:'invoice_receipt',label:'Invoices ↔ Receipts'},{value:'bill_payment',label:'Bills ↔ Vendor Payments'}]} /><Input label="Minimum score" type="number" step="0.01" value={params.minScore} onChange={(e)=>setParams((s)=>({...s, minScore:e.target.value}))} /><div className="flex items-end"><Button variant="outline" leftIcon={RefreshCw} onClick={()=>matchesQ.refetch()}>Refresh results</Button></div></div>} right={<div className="text-xs text-slate-500">{rows.length} suggestions</div>} />
      </ContentCard>
      <ContentCard>
        <DataTable columns={columns} rows={rows} isLoading={matchesQ.isLoading} empty={{ title: 'No matching suggestions', description: 'Run a match cycle or lower your minimum score threshold.' }} />
      </ContentCard>
    </div>
  );
}
