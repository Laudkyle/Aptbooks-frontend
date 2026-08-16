import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../../../../shared/components/ui/Button.jsx';
import { Input } from '../../../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../../../shared/components/ui/Select.jsx';
import { useApi } from '../../../../../../shared/hooks/useApi.js';
import { makeAssetsApi } from '../../../../../assets/api/assets.api.js';
import { GhanaComplianceShell } from '../../../components/GhanaComplianceShell.jsx';
import { useGhanaAdvancedApi, money, dateText, titleCase } from './_advancedUi.jsx';
import { usePermissions } from '../../../../../../shared/hooks/usePermissions.js';
import { PERMISSIONS } from '../../../../../../app/constants/permissions.js';

const emptyAsset = { fixedAssetId:'', assetClassId:'', taxAssetCode:'', description:'', firstUseDate:'', taxCost:'', businessUsePercent:'100', usefulLifeYears:'' };
const thisYear = new Date().getFullYear();

export default function GhanaCapitalAllowances(){
  const api=useGhanaAdvancedApi(); const { can }=usePermissions(); const canManage=can(PERMISSIONS.taxGhanaCitManage); const canFile=can(PERMISSIONS.taxGhanaCitFile); const {http}=useApi(); const assetsApi=useMemo(()=>makeAssetsApi(http),[http]); const qc=useQueryClient();
  const [asset,setAsset]=useState(emptyAsset); const [year,setYear]=useState(String(thisYear)); const [selectedRun,setSelectedRun]=useState(''); const [dispose,setDispose]=useState({assetId:'',disposalDate:'',disposalProceeds:''});
  const classesQ=useQuery({queryKey:['ghana-ca-classes'],queryFn:()=>api.capitalAllowances.listClasses()});
  const taxAssetsQ=useQuery({queryKey:['ghana-tax-assets'],queryFn:()=>api.capitalAllowances.listAssets()});
  const bookAssetsQ=useQuery({queryKey:['fixed-assets-for-tax'],queryFn:()=>assetsApi.listFixedAssets({})});
  const runsQ=useQuery({queryKey:['ghana-ca-runs',year],queryFn:()=>api.capitalAllowances.listRuns({taxYear:year})});
  const runQ=useQuery({queryKey:['ghana-ca-run',selectedRun],queryFn:()=>api.capitalAllowances.getRun(selectedRun),enabled:Boolean(selectedRun)});
  const refresh=()=>{qc.invalidateQueries({queryKey:['ghana-tax-assets']});qc.invalidateQueries({queryKey:['ghana-ca-runs']});qc.invalidateQueries({queryKey:['ghana-ca-run']});qc.invalidateQueries({queryKey:['ghana-readiness']});};
  const createM=useMutation({mutationFn:()=>api.capitalAllowances.createAsset({...asset,fixedAssetId:asset.fixedAssetId||null,usefulLifeYears:asset.usefulLifeYears?Number(asset.usefulLifeYears):null,businessUsePercent:Number(asset.businessUsePercent)}),onSuccess:()=>{setAsset(emptyAsset);refresh();}});
  const runM=useMutation({mutationFn:()=>api.capitalAllowances.prepareRun({taxYear:Number(year),basisPeriodStart:`${year}-01-01`,basisPeriodEnd:`${year}-12-31`}),onSuccess:(out)=>{setSelectedRun(out.id);refresh();}});
  const finalizeM=useMutation({mutationFn:(id)=>api.capitalAllowances.finalizeRun(id),onSuccess:refresh});
  const disposeM=useMutation({mutationFn:()=>api.capitalAllowances.disposeAsset(dispose.assetId,{disposalDate:dispose.disposalDate,disposalProceeds:dispose.disposalProceeds||'0'}),onSuccess:()=>{setDispose({assetId:'',disposalDate:'',disposalProceeds:''});refresh();}});
  const bookAssets=bookAssetsQ.data||[]; const taxAssets=taxAssetsQ.data||[]; const classes=classesQ.data||[]; const runs=runsQ.data||[];
  const field=(key)=>(e)=>setAsset(v=>({...v,[key]:e.target.value}));
  return <GhanaComplianceShell title="Capital Allowances" subtitle="Maintain Ghana tax assets separately from book depreciation and prepare annual capital-allowance schedules.">
    <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Tax Asset Register</h2>
        <p className="mt-1 text-sm text-slate-500">Link a book asset when available. Internal asset IDs stay hidden.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Book asset (optional)<Select value={asset.fixedAssetId} onChange={field('fixedAssetId')} className="mt-1" options={[{ value:'', label:'Not linked' }, ...bookAssets.map((a)=>({ value:a.id, label:`${a.code} — ${a.name}` }))]} /></label>
          <label className="text-sm font-medium text-slate-700">Ghana tax class<Select value={asset.assetClassId} onChange={field('assetClassId')} className="mt-1" options={[{ value:'', label:'Select class' }, ...classes.map((c)=>({ value:c.id, label:`${c.code} — ${c.name} (${c.method}${c.rate ? ` ${c.rate}%` : ''})` }))]} /></label>
          <label className="text-sm font-medium text-slate-700">Tax asset code<Input value={asset.taxAssetCode} onChange={field('taxAssetCode')} className="mt-1" /></label>
          <label className="text-sm font-medium text-slate-700">First use date<Input type="date" value={asset.firstUseDate} onChange={field('firstUseDate')} className="mt-1" /></label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">Description<Input value={asset.description} onChange={field('description')} className="mt-1" /></label>
          <label className="text-sm font-medium text-slate-700">Tax cost<Input type="number" min="0" step="0.01" value={asset.taxCost} onChange={field('taxCost')} className="mt-1" /></label>
          <label className="text-sm font-medium text-slate-700">Business use %<Input type="number" min="0" max="100" step="0.01" value={asset.businessUsePercent} onChange={field('businessUsePercent')} className="mt-1" /></label>
          {classes.find(c=>c.id===asset.assetClassId)?.useful_life_required && <label className="text-sm font-medium text-slate-700">Useful life (years)<Input type="number" min="1" value={asset.usefulLifeYears} onChange={field('usefulLifeYears')} className="mt-1" /></label>}
        </div>
        {canManage?<div className="mt-4"><Button onClick={()=>createM.mutate()} disabled={createM.isPending||!asset.assetClassId||!asset.taxAssetCode||!asset.description||!asset.firstUseDate||!asset.taxCost}>Add tax asset</Button></div>:null}
        <div className="mt-6 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-4">Code</th><th className="py-2 pr-4">Description</th><th className="py-2 pr-4">Class</th><th className="py-2 pr-4 text-right">Tax cost</th><th className="py-2 pr-4">First use</th><th className="py-2">Status</th></tr></thead><tbody>{taxAssets.map(a=><tr key={a.id} className="border-b border-slate-100"><td className="py-3 pr-4 font-medium">{a.tax_asset_code}</td><td className="py-3 pr-4">{a.description}</td><td className="py-3 pr-4">{a.class_code} — {a.class_name}</td><td className="py-3 pr-4 text-right">{money(a.tax_cost)}</td><td className="py-3 pr-4">{dateText(a.first_use_date)}</td><td className="py-3">{titleCase(a.status)}</td></tr>)}</tbody></table></div>
      </section>
      <div className="space-y-6">
        <section className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Annual allowance run</h2><div className="mt-4 flex gap-2"><Select value={year} onChange={e=>setYear(e.target.value)} options={[0,1,2,3].map((n)=>({ value:String(thisYear-n), label:String(thisYear-n) }))} />{canManage?<Button onClick={()=>runM.mutate()} disabled={runM.isPending}>Prepare {year}</Button>:null}</div><div className="mt-4 space-y-2">{runs.map(r=><button key={r.id} type="button" onClick={()=>setSelectedRun(r.id)} className="w-full rounded-xl border p-3 text-left hover:bg-slate-50"><div className="flex justify-between"><span className="font-medium">{r.tax_year} · v{r.version_no}</span><span>{titleCase(r.status)}</span></div><div className="mt-1 text-sm text-slate-500">Allowance {money(r.total_capital_allowance)} · Closing WDV {money(r.total_closing_wdv)}</div></button>)}</div></section>
        {runQ.data && <section className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">{runQ.data.tax_year} capital allowance</h2><p className="text-sm text-slate-500">{titleCase(runQ.data.status)} · v{runQ.data.version_no}</p></div>{canFile&&runQ.data.status==='draft'&&<Button onClick={()=>finalizeM.mutate(runQ.data.id)} disabled={finalizeM.isPending}>Finalize</Button>}</div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-3">Opening WDV<br/><strong>{money(runQ.data.total_opening_wdv)}</strong></div><div className="rounded-xl bg-slate-50 p-3">Capital allowance<br/><strong>{money(runQ.data.total_capital_allowance)}</strong></div><div className="rounded-xl bg-slate-50 p-3">Additions<br/><strong>{money(runQ.data.total_additions)}</strong></div><div className="rounded-xl bg-slate-50 p-3">Closing WDV<br/><strong>{money(runQ.data.total_closing_wdv)}</strong></div></div><div className="mt-4 max-h-80 overflow-auto">{(runQ.data.lines||[]).map(l=><div key={l.id} className="border-b py-2 text-sm"><div className="flex justify-between"><span>{l.asset_code} · {l.description}</span><strong>{money(l.capital_allowance)}</strong></div><div className="text-xs text-slate-500">{l.class_code} · closing WDV {money(l.closing_wdv)}</div></div>)}</div></section>}
        <section className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Dispose tax asset</h2><div className="mt-3 space-y-3"><Select value={dispose.assetId} onChange={e=>setDispose(v=>({...v,assetId:e.target.value}))} options={[{ value:'', label:'Select active tax asset' }, ...taxAssets.filter((a)=>a.status==='active').map((a)=>({ value:a.id, label:`${a.tax_asset_code} — ${a.description}` }))]} /><Input type="date" value={dispose.disposalDate} onChange={e=>setDispose(v=>({...v,disposalDate:e.target.value}))}/><Input type="number" step="0.01" placeholder="Disposal proceeds" value={dispose.disposalProceeds} onChange={e=>setDispose(v=>({...v,disposalProceeds:e.target.value}))}/>{canManage?<Button variant="secondary" onClick={()=>disposeM.mutate()} disabled={!dispose.assetId||!dispose.disposalDate||disposeM.isPending}>Record disposal</Button>:null}</div></section>
      </div>
    </div>
  </GhanaComplianceShell>;
}
