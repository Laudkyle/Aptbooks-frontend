import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../../../../shared/components/ui/Button.jsx';
import { GhanaComplianceShell } from '../../../components/GhanaComplianceShell.jsx';
import { useGhanaAdvancedApi, titleCase, dateText } from './_advancedUi.jsx';
import { usePermissions } from '../../../../../../shared/hooks/usePermissions.js';
import { PERMISSIONS } from '../../../../../../app/constants/permissions.js';

export default function GhanaIndustryProfiles(){
  const api=useGhanaAdvancedApi(); const { can }=usePermissions(); const canManage=can(PERMISSIONS.taxGhanaIndustryManage); const qc=useQueryClient(); const [reviewNotes,setReviewNotes]=useState('');
  const q=useQuery({queryKey:['ghana-industry-profiles'],queryFn:()=>api.industry.listProfiles()});
  const refresh=()=>{qc.invalidateQueries({queryKey:['ghana-industry-profiles']});qc.invalidateQueries({queryKey:['ghana-readiness']});};
  const installM=useMutation({mutationFn:(code)=>api.industry.installProfile(code,{}),onSuccess:refresh});
  const reviewM=useMutation({mutationFn:()=>api.industry.reviewProfile(reviewNotes?{reviewNotes}:{}),onSuccess:()=>{setReviewNotes('');refresh();}});
  const profiles=q.data||[]; const installed=profiles.find(p=>p.installed);
  return <GhanaComplianceShell title="Ghana Industry Profile" subtitle="Install workflow and compliance recommendations for your sector without overriding transaction-level tax classification.">
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Tax safety:</strong> an industry profile is a workflow/readiness preset. Selecting Hospital, School or another sector never makes every product or service exempt. Each supply still uses its assigned Ghana tax profile and the tax-determination engine.</div>
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{profiles.map(p=><article key={p.code} className={`rounded-2xl border bg-white p-5 shadow-sm ${p.installed?'border-brand-primary ring-1 ring-brand-primary/20':'border-border-subtle'}`}><div className="flex justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">{p.code}</p><h2 className="mt-1 text-lg font-semibold text-slate-900">{p.name}</h2></div>{p.installed&&<span className="h-fit rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Primary</span>}</div><p className="mt-3 text-sm text-slate-600">{p.description}</p>{p.settings_json&&<div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Configured recommendations are stored with this organization.</div>}{canManage?<div className="mt-4"><Button variant={p.installed?'secondary':'primary'} onClick={()=>installM.mutate(p.code)} disabled={installM.isPending}>{p.installed?'Reinstall profile':'Use this profile'}</Button></div>:null}</article>)}</div>
    {installed&&canManage&&<section className="mt-6 rounded-2xl border border-border-subtle bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><h2 className="text-lg font-semibold">Review {installed.name}</h2><p className="mt-1 text-sm text-slate-500">Last reviewed: {dateText(installed.reviewed_at)}</p><p className="mt-2 max-w-2xl text-sm text-slate-600">Confirm that the sector recommendations have been reviewed against the organization’s actual supplies, registrations and operating model.</p></div><div className="w-full md:max-w-md"><textarea value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)} placeholder="Optional review note" className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"/><Button className="mt-2" onClick={()=>reviewM.mutate()} disabled={reviewM.isPending}>Mark profile reviewed</Button></div></div></section>}
  </GhanaComplianceShell>;
}
