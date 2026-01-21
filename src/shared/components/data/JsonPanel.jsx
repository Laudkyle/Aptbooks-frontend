import React, { useMemo, useState } from 'react';
import { Button } from '../ui/Button.jsx';
import { Textarea } from '../ui/Textarea.jsx';
import { Check, Copy, Wand2 } from 'lucide-react';

function safeStringify(value) {
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch {
    return String(value);
  }
}

export function JsonPanel({ title = 'Payload', value, onSubmit, submitLabel = 'Submit', hint }) {
  const initial = useMemo(() => safeStringify(value), [value]);
  const [text, setText] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [parseError, setParseError] = useState(null);

  function handleFormat() {
    try {
      const parsed = JSON.parse(text);
      setText(JSON.stringify(parsed, null, 2));
      setParseError(null);
    } catch (e) {
      setParseError(e?.message ?? 'Invalid JSON');
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      /* ignore */
    }
  }

  function handleSubmit() {
    try {
      const parsed = JSON.parse(text);
      setParseError(null);
      onSubmit?.(parsed);
    } catch (e) {
      setParseError(e?.message ?? 'Invalid JSON');
    }
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-white/80 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {hint ? <div className="mt-0.5 text-xs text-slate-500">{hint}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleFormat} leftIcon={Wand2}>
            Format
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopy} leftIcon={copied ? Check : Copy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          {onSubmit ? (
            <Button size="sm" onClick={handleSubmit}>
              {submitLabel}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="p-4">
        <Textarea
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="font-mono text-xs"
          error={parseError}
        />
      </div>
    </div>
  );
}
