import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Select } from '../ui/Select.jsx';
import { useApi } from '../../hooks/useApi.js';
import { normalizeRows } from '../../tax/frontendTax.js';
import { makePartnersApi } from '../../../features/business/api/partners.api.js';

function labelOf(partner) {
  const code = partner?.code ?? '';
  const name = partner?.name ?? partner?.displayName ?? '';
  if (code && name) return `${code} — ${name}`;
  return name || code || String(partner?.id ?? '');
}

export function PartnerSelect({
  allowEmpty = true,
  emptyLabel = 'Select partner',
  type,
  query,
  options: overrideOptions,
  disabled,
  ...props
}) {
  const { http } = useApi();
  const partnersApi = useMemo(() => makePartnersApi(http), [http]);

  const partnersQuery = useQuery({
    queryKey: ['partners.select', { type: type || '', ...(query || {}) }],
    queryFn: () => partnersApi.list({ ...(query || {}), ...(type ? { type } : {}), limit: 500 }),
    staleTime: 60_000
  });

  const options = useMemo(() => {
    if (overrideOptions?.length) return overrideOptions;
    return normalizeRows(partnersQuery.data)
      .filter((partner) => !type || String(partner.type || '').toLowerCase() === String(type).toLowerCase())
      .map((partner) => ({
        value: String(partner.id),
        label: labelOf(partner),
        partner
      }));
  }, [overrideOptions, partnersQuery.data, type]);

  return (
    <Select
      {...props}
      disabled={disabled || partnersQuery.isLoading}
      options={allowEmpty ? [{ value: '', label: emptyLabel }, ...options] : options}
    />
  );
}
