import React from 'react';
import { Input } from '../ui/Input.jsx';

export function IdempotencyKeyField({ value, onChange, label = 'Idempotency-Key', hint = 'Required for this action' }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-white/70 p-4">
      <div className="text-xs font-semibold text-slate-700">{label}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
      <div className="mt-3">
        <Input value={value} onChange={(e) => onChange?.(e.target.value)} placeholder="uuid…" />
      </div>
    </div>
  );
}
