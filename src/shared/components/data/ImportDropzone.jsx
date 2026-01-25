import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

export function ImportDropzone({ accept = '.csv,text/csv,text/plain', onText }) {
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    const text = await file.text();
    onText?.(text);
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <Upload className="h-5 w-5 text-brand-primary" />
        <div className="text-sm font-medium text-brand-deep">Drop CSV here</div>
        <div className="text-xs text-slate-600">or choose a file to upload</div>
        <div className="mt-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button variant="secondary" onClick={() => inputRef.current?.click()}>
            Choose file
          </Button>
        </div>
      </div>
    </div>
  );
}
