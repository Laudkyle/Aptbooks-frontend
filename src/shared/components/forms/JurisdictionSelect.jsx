import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Select } from '../ui/Select.jsx';
import { useApi } from '../../hooks/useApi.js';
import { makeTaxApi } from '../../../features/accounting/tax/api/tax.api.js';
import { normalizeRows } from '../../tax/frontendTax.js';

function labelOf(jurisdiction) {
  const code = jurisdiction?.code ?? '';
  const name = jurisdiction?.name ?? '';
  if (code && name) return `${code} — ${name}`;
  return name || code || String(jurisdiction?.id ?? '');
}

export function JurisdictionSelect({
  allowEmpty = true,
  emptyLabel = 'Select jurisdiction',
  options: overrideOptions,
  disabled,
  ...props
}) {
  const { http } = useApi();
  const taxApi = useMemo(() => makeTaxApi(http), [http]);

  const jurisdictionsQuery = useQuery({
    queryKey: ['tax.jurisdictions.select'],
    queryFn: () => taxApi.listJurisdictions(),
    staleTime: 60_000
  });

  const options = useMemo(() => {
    if (overrideOptions?.length) return overrideOptions;
    return normalizeRows(jurisdictionsQuery.data).map((jurisdiction) => ({
      value: String(jurisdiction.id),
      label: labelOf(jurisdiction),
      jurisdiction
    }));
  }, [overrideOptions, jurisdictionsQuery.data]);

  return (
    <Select
      {...props}
      disabled={disabled || jurisdictionsQuery.isLoading}
      options={allowEmpty ? [{ value: '', label: emptyLabel }, ...options] : options}
    />
  );
}
