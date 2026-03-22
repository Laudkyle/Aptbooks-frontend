import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Plus } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeAutomationApi } from '../api/automation.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';
import { Select } from '../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../shared/components/ui/Textarea.jsx';
import { Modal } from '../../../shared/components/ui/Modal.jsx';
import { DataTable } from '../../../shared/components/data/DataTable.jsx';
import { useToast } from '../../../shared/components/ui/Toast.jsx';

function rowsOf(d){ return Array.isArray(d?.items) ? d.items : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []; }

function renderPreview(data) {
  if (!data) return 'Run a sample classification to inspect the result.';
  if (typeof data === 'string') return data;
  const label = data.label ?? data.output_value ?? data.outputValue ?? data.prediction ?? 'No label returned';
  const confidence = data.score ?? data.confidence ?? null;
  return `${label}${confidence !== null && confidence !== undefined ? ` · score ${confidence}` : ''}`;
}

export default function AIClassificationPage() {
  const { http } = useApi();
  const api = useMemo(() => makeAutomationApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [rule, setRule] = useState({ code:'', name:'', targetType:'expense', conditionText:'', outputValue:'' });
  const [sampleText, setSampleText] = useState('');
  const rulesQ = useQuery({ queryKey:['automation.aiClassification.rules'], queryFn:()=>api.listClassificationRules() });
  const classify = useMutation({ mutationFn:(payload)=>api.classifyPreview(payload), onError:(e)=>toast.error(e?.response?.data?.error || e.message) });
  const create = useMutation({ mutationFn:(payload)=>api.createClassificationRule(payload), onSuccess:()=>{ toast.success('Classification rule created'); setOpen(false); setRule({ code:'', name:'', targetType:'expense', conditionText:'', outputValue:'' }); qc.invalidateQueries({ queryKey:['automation.aiClassification.rules'] }); }, onError:(e)=>toast.error(e?.response?.data?.error || e.message) });
  const rules = rowsOf(rulesQ.data);

  const columns = [
    { header: 'Code', render: (r) => <span className="font-medium text-text-strong">{r.code}</span> },
    { header: 'Name', render: (r) => r.name ?? '—' },
    { header: 'Target', render: (r) => r.target_type ?? r.targetType ?? '—' },
    { header: 'Output', render: (r) => r.output_value ?? r.outputValue ?? '—' }
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="AI Classification" subtitle="Deterministic classification rules for transaction coding, suggestion generation, and workflow assistance." icon={Bot} actions={<Button leftIcon={Plus} onClick={()=>setOpen(true)}>New rule</Button>} />
      <div className="grid gap-4 xl:grid-cols-5">
        <ContentCard className="xl:col-span-3" title="Classification rules">
          <DataTable columns={columns} rows={rules} isLoading={rulesQ.isLoading} empty={{ title: 'No classification rules', description: 'Create a rule to classify expense, invoice, or statement text automatically.' }} />
        </ContentCard>
        <ContentCard className="xl:col-span-2" title="Preview classification" actions={<Button onClick={()=>classify.mutate({ text: sampleText })}>Classify</Button>}>
          <Textarea label="Sample text" value={sampleText} onChange={(e)=>setSampleText(e.target.value)} placeholder="Paste a narration, memo, or invoice description" />
          <div className="mt-4 rounded-2xl border border-border-subtle bg-surface-2 p-4">
            <div className="text-sm font-medium text-text-body">Result</div>
            <div className="mt-2 text-sm text-text-muted">{renderPreview(classify.data)}</div>
          </div>
        </ContentCard>
      </div>
      <Modal open={open} title="Create classification rule" onClose={()=>setOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button><Button loading={create.isPending} onClick={()=>create.mutate(rule)}>Create rule</Button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Code" value={rule.code} onChange={(e)=>setRule((s)=>({...s, code:e.target.value}))} />
          <Input label="Name" value={rule.name} onChange={(e)=>setRule((s)=>({...s, name:e.target.value}))} />
          <Select label="Target type" value={rule.targetType} onChange={(e)=>setRule((s)=>({...s, targetType:e.target.value}))} options={[{value:'expense',label:'Expense'},{value:'invoice',label:'Invoice'},{value:'bank_statement_line',label:'Bank statement line'}]} />
          <Input label="Output value" value={rule.outputValue} onChange={(e)=>setRule((s)=>({...s, outputValue:e.target.value}))} />
          <Textarea className="md:col-span-2" label="Condition text or expression" value={rule.conditionText} onChange={(e)=>setRule((s)=>({...s, conditionText:e.target.value}))} />
        </div>
      </Modal>
    </div>
  );
}
