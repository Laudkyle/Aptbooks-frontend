import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

export function ExportButton({ children = 'Export', onClick, disabled }) {
  return (
    <Button variant="secondary" onClick={onClick} disabled={disabled}>
      <Download className="mr-2 h-4 w-4" />
      {children}
    </Button>
  );
}
