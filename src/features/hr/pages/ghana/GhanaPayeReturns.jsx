import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, ContentCard, Input, Select, SimpleTable, StatusBadge } from '../_hrShared.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { ROUTES } from '../../../../app/constants/routes.js';
import { GhanaPayrollShell, dateText, money, useGhanaPayrollApi } from './_ghanaPayrollUi.jsx';
import { usePermissions } from '../../../../shared/hooks/usePermissions.js';
import { PERMISSIONS } from '../../../../app/constants/permissions.js';

export default function GhanaPayeReturns() {
  const api = useGhanaPayrollApi(); const { can } = usePermissions(); const canManage = can(PERMISSIONS.hrPayrollGhanaManage); const toast = useToast(); const qc = useQueryClient();
  const [form, setForm] = useState({ formCode: 'DT107', periodStart: '', periodEnd: '' });
  const query = useQuery({ queryKey: ['hr','payroll','ghana','returns'], queryFn: () => api.listReturns() });
  const create = useMutation({ mutationFn: () => api.prepareReturn(form), onSuccess: () => { toast.success('PAYE return prepared.'); qc.invalidateQueries({ queryKey: ['hr','payroll','ghana','returns'] }); }, onError: (e) => toast.error(e?.message ?? 'Could not prepare PAYE return.') });
  return <GhanaPayrollShell title="Ghana PAYE Returns" subtitle="Prepare DT107 monthly or DT108 annual returns from posted Ghana payroll snapshots.">
    {canManage ? <ContentCard title="Prepare return"><form className="grid gap-3 md:grid-cols-4" onSubmit={(e)=>{e.preventDefault();create.mutate();}}><Select label="Form" value={form.formCode} onChange={(e)=>setForm({...form,formCode:e.target.value})} options={[{value:'DT107',label:'DT107 — Monthly PAYE'},{value:'DT108',label:'DT108 — Annual PAYE'}]} /><Input label="Period start" type="date" value={form.periodStart} onChange={(e)=>setForm({...form,periodStart:e.target.value})} required/><Input label="Period end" type="date" value={form.periodEnd} onChange={(e)=>setForm({...form,periodEnd:e.target.value})} required/><div className="flex items-end"><Button type="submit" loading={create.isPending}>Prepare</Button></div></form></ContentCard> : null}
    <ContentCard title="PAYE returns"><SimpleTable rows={query.data ?? []} empty="No Ghana PAYE returns prepared." columns={[{key:'form_code',label:'Form'},{key:'period',label:'Period',render:(r)=>`${dateText(r.period_start)} → ${dateText(r.period_end)}`},{key:'version_no',label:'Version',render:(r)=>`v${r.version_no}`},{key:'total_paye',label:'PAYE',render:(r)=>money(r.total_paye)},{key:'status',label:'Status',render:(r)=><StatusBadge value={r.status}/>},{key:'gra_reference',label:'GRA reference',render:(r)=>r.gra_reference||'—'}]} actions={(r)=><Link to={ROUTES.hrPayrollGhanaReturnDetail(r.id)}><Button size="sm" variant="outline">Open</Button></Link>} /></ContentCard>
  </GhanaPayrollShell>;
}
