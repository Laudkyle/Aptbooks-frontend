import React from 'react';
import { Input } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { generateRequestId } from '../../api/request-id.js';

export function IdempotencyKeyField({
  value,
  onChange,
  label = 'Idempotency-Key',
  hint = 'Required for this action'
}) {
  React.useEffect(() => {
    if (!value && onChange) onChange(generateRequestId());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-text-body">{label}</div>
          <div className="mt-1 text-xs text-text-muted">{hint}</div>
        </div>
        <Button size="sm" variant="outline" onClick={() => onChange?.(generateRequestId())}>
          Regenerate
        </Button>
      </div>
      <div className="mt-3">
        <Input value={value} onChange={(e) => onChange?.(e.target.value)} placeholder="uuid…" />
      </div>
    </div>
  );
}
