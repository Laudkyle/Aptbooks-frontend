import React from 'react';

import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Textarea } from '../../../../shared/components/ui/Textarea.jsx';

const RECOVERY_OPTIONS = [
  { value: 'direct_taxable', label: 'Directly attributable to taxable supplies — recoverable' },
  { value: 'direct_exempt', label: 'Directly attributable to exempt supplies — blocked' },
  { value: 'mixed', label: 'Mixed use — apply provisional/apportioned recovery' },
  { value: 'not_applicable', label: 'Not recoverable / not applicable' },
];

export function ImportedServiceForm({ form, setForm, supplierOptions, taxCodeOptions }) {
  const set = (key, value) => setForm((s) => ({ ...s, [key]: value }));
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Supplier" value={form.supplierId} onChange={(e)=>set('supplierId',e.target.value)} options={supplierOptions} />
        <Input label="Supplier document number" value={form.documentNo} onChange={(e)=>set('documentNo',e.target.value)} placeholder="Invoice or reference number" />
      </div>
      <Textarea label="Imported service description" value={form.description} onChange={(e)=>set('description',e.target.value)} rows={3} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Service date" type="date" value={form.serviceDate} onChange={(e)=>set('serviceDate',e.target.value)} />
        <Input label="Tax period start (optional)" type="date" value={form.taxPeriodStart} onChange={(e)=>set('taxPeriodStart',e.target.value)} />
        <Input label="Tax period end (optional)" type="date" value={form.taxPeriodEnd} onChange={(e)=>set('taxPeriodEnd',e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Supplier country code" value={form.supplierCountryCode} onChange={(e)=>set('supplierCountryCode',e.target.value.toUpperCase().slice(0,2))} placeholder="US" maxLength={2} />
        <Input label="Currency code" value={form.currencyCode} onChange={(e)=>set('currencyCode',e.target.value.toUpperCase().slice(0,3))} placeholder="USD" maxLength={3} />
        <Input label="Foreign amount" type="number" min="0" step="0.01" value={form.foreignAmount} onChange={(e)=>set('foreignAmount',e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Exchange rate" type="number" min="0.000001" step="0.000001" value={form.exchangeRate} onChange={(e)=>set('exchangeRate',e.target.value)} />
        <Input label="GHS taxable amount" type="number" min="0.01" step="0.01" value={form.taxableAmount} onChange={(e)=>set('taxableAmount',e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Ghana imported-services tax code" value={form.taxCodeId} onChange={(e)=>set('taxCodeId',e.target.value)} options={taxCodeOptions} />
        <Select label="Input tax recovery" value={form.recoveryBasis} onChange={(e)=>set('recoveryBasis',e.target.value)} options={RECOVERY_OPTIONS} />
      </div>
      {form.recoveryBasis === 'mixed' ? <Input label="Provisional recovery percentage override (optional)" type="number" min="0" max="100" step="0.01" value={form.recoverablePercent} onChange={(e)=>set('recoverablePercent',e.target.value)} /> : null}
      <Input label="Internal reference (optional)" value={form.reference} onChange={(e)=>set('reference',e.target.value)} />
    </div>
  );
}
