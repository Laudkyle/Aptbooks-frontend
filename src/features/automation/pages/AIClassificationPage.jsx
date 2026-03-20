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
  return (<>
    <PageHeader title="AI Classification" subtitle="Rule-based and deterministic classification for accounting documents." actions={<Button onClick={()=>setOpen(true)}>New rule</Button>} />
    <div className="grid gap-4 xl:grid-cols-5">
      <ContentCard className="xl:col-span-3" title="Classification rules">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="py-2">Code</th><th>Name</th><th>Target</th><th>Output</th></tr></thead><tbody>{rules.map((r)=><tr key={r.id || r.code} className="border-t"><td className="py-2 font-medium">{r.code}</td><td>{r.name}</td><td>{r.target_type ?? r.targetType ?? '—'}</td><td>{r.output_value ?? r.outputValue ?? '—'}</td></tr>)}{!rules.length && <tr><td className="py-3 text-slate-500" colSpan={4}>No classification rules configured.</td></tr>}</tbody></table></div>
      </ContentCard>
      <ContentCard className="xl:col-span-2" title="Preview classification" actions={<Button onClick={()=>classify.mutate({ text: sampleText })}>Classify</Button>}>
        <Textarea label="Sample text" value={sampleText} onChange={(e)=>setSampleText(e.target.value)} />
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="font-medium text-slate-700">Result</div>
          <pre className="mt-2 overflow-auto text-xs text-slate-600">{JSON.stringify(classify.data ?? {}, null, 2)}</pre>
        </div>
      </ContentCard>
    </div>
    <Modal open={open} title="Create classification rule" onClose={()=>setOpen(false)} footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={()=>create.mutate(rule)}>Create</Button></div>}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Code" value={rule.code} onChange={(e)=>setRule((s)=>({...s, code:e.target.value}))} />
        <Input label="Name" value={rule.name} onChange={(e)=>setRule((s)=>({...s, name:e.target.value}))} />
        <Select label="Target type" value={rule.targetType} onChange={(e)=>setRule((s)=>({...s, targetType:e.target.value}))} options={[{value:'expense',label:'Expense'},{value:'invoice',label:'Invoice'},{value:'bank_statement_line',label:'Bank statement line'}]} />
        <Input label="Output value" value={rule.outputValue} onChange={(e)=>setRule((s)=>({...s, outputValue:e.target.value}))} />
        <Textarea className="md:col-span-2" label="Condition text / expression" value={rule.conditionText} onChange={(e)=>setRule((s)=>({...s, conditionText:e.target.value}))} />
      </div>
    </Modal>
  </>);
}
