import React from 'react'; 
import { Button } from './Button.jsx'; 

export function Pagination({ limit, offset, total, onChange }) {
  const currentPage = Math.floor((offset ?? 0) / (limit ?? 1)) + 1; 
  const totalPages = total ? Math.max(1, Math.ceil(total / limit)) : null; 

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs text-slate-600">
        Page {currentPage}{totalPages ? ` of ${totalPages}` : ''}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange?.({ limit, offset: Math.max(0, (offset ?? 0) - limit) })}
          disabled={(offset ?? 0) <= 0}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange?.({ limit, offset: (offset ?? 0) + limit })}
          disabled={totalPages ? currentPage >= totalPages : false}
        >
          Next
        </Button>
      </div>
    </div>
  ); 
}
