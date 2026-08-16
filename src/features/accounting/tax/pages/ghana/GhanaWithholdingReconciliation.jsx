import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

import { useApi } from '../../../../../shared/hooks/useApi.js';
import { qk } from '../../../../../shared/query/keys.js';
import { formatMoney } from '../../../../../shared/utils/formatMoney.js';
import { ContentCard } from '../../../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../../../shared/components/ui/Button.jsx';
import { Input } from '../../../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../../../shared/components/ui/Badge.jsx';
import { Table } from '../../../../../shared/components/ui/Table.jsx';
import { makeGhanaComplianceApi } from '../../api/ghanaCompliance.api.js';
import { GhanaComplianceShell } from '../../components/GhanaComplianceShell.jsx';
import { GhanaWithholdingNav } from '../../components/GhanaWithholdingNav.jsx';

export default function GhanaWithholdingReconciliation(){
 const {http}=useApi();const api=useMemo(()=>makeGhanaComplianceApi(http),[http]);const [toDate,setToDate]=useState(()=>new Date().toISOString().slice(0,10));
 const query=useQuery({queryKey:qk.ghanaWithholdingReconciliation({toDate}),queryFn:()=>api.getWithholdingReconciliation({toDate})});
 const data=query.data??{asOf:toDate,regimes:[]};
 return <GhanaComplianceShell title="Withholding Reconciliation" subtitle="Reconcile open income-WHT and WHVAT events to the corresponding posted GL control-account balances." actions={<Button variant="outline" onClick={()=>query.refetch()}><RefreshCw className="mr-2 h-4 w-4"/>Re-run</Button>}>
  <GhanaWithholdingNav/>
  <ContentCard title="Reconciliation date"><Input label="As of" type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/></ContentCard>
  <ContentCard title={`Control-account reconciliation · ${data.asOf}`}><Table rows={data.regimes??[]} columns={[
    {header:'Regime',render:r=><div className="font-semibold">{r.regime==='vat_withholding'?'VAT Withholding (WHVAT)':'Income WHT'}</div>},
    {header:'Open withholding events',className:'text-right',render:r=>formatMoney(r.openWithholdingEvents,'GHS')},
    {header:'GL control balance',className:'text-right',render:r=>formatMoney(r.glControlBalance,'GHS')},
    {header:'Variance',className:'text-right',render:r=><span className={Number(r.variance||0)===0?'font-semibold text-emerald-700':'font-semibold text-rose-700'}>{formatMoney(r.variance,'GHS')}</span>},
    {header:'Status',render:r=><Badge tone={r.reconciled?'success':'danger'}>{r.reconciled?'Reconciled':'Difference'}</Badge>},
    {header:'Note',render:r=><span className="text-xs text-slate-500">{r.note||'—'}</span>},
  ]}/></ContentCard>
 </GhanaComplianceShell>;
}
