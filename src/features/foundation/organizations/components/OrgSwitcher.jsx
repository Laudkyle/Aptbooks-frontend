import React, { useMemo, useState } from 'react'; 
import { ChevronDown } from 'lucide-react'; 
import { useOrg } from '../../../../shared/hooks/useOrg.js'; 
import { Button } from '../../../../shared/components/ui/Button.jsx'; 

export function OrgSwitcher() {
  const { organizations, currentOrg, switchOrganization } = useOrg(); 
  const [open, setOpen] = useState(false); 

  const items = useMemo(() => organizations ?? [], [organizations]); 

  if (!items.length) return null; 

  return (
    <div className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
        <span className="max-w-[14rem] truncate">{currentOrg?.name ?? 'Organization'}</span>
        <ChevronDown className="ml-2 h-4 w-4" />
      </Button>
      {open ? (
        <div className="absolute right-0 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-1 shadow-lg z-50">
          {items.map((o) => (
            <button
              key={o.id}
              className={
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-slate-50 ' +
                (o.id === currentOrg?.id ? 'font-semibold text-brand-deep' : 'text-slate-700')
              }
              onClick={async () => {
                setOpen(false); 
                if (o.id !== currentOrg?.id) await switchOrganization(o.id); 
              }}
            >
              <span className="truncate">{o.name}</span>
              {o.is_current ? <span className="text-xs text-slate-500">current</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  ); 
}
