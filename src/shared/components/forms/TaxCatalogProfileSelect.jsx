import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Select } from '../ui/Select.jsx';
import { useApi } from '../../hooks/useApi.js';
import { qk } from '../../query/keys.js';
import { makeGhanaComplianceApi } from '../../../features/accounting/tax/api/ghanaCompliance.api.js';

function profileLabel(profile) {
  if (profile.code && profile.name) return `${profile.code} — ${profile.name}`;
  if (profile.name) return profile.name;
  if (profile.code) return profile.code;
  return 'Unnamed tax profile';
}

export function TaxCatalogProfileSelect({
  allowEmpty = true,
  emptyLabel = 'Select tax profile',
  query = { status: 'active' },
  options: overrideOptions,
  disabled,
  ...props
}) {
  const { http } = useApi();
  const api = useMemo(() => makeGhanaComplianceApi(http), [http]);

  const profilesQuery = useQuery({
    queryKey: qk.taxCatalogProfiles(query),
    queryFn: () => api.listCatalogProfiles(query),
    staleTime: 60_000,
  });

  const options = useMemo(() => {
    if (overrideOptions) return overrideOptions;
    return (profilesQuery.data ?? []).map((profile) => ({
      value: profile.id,
      label: profileLabel(profile),
    }));
  }, [overrideOptions, profilesQuery.data]);

  return (
    <Select
      {...props}
      disabled={disabled || profilesQuery.isLoading}
      options={allowEmpty ? [{ value: '', label: emptyLabel }, ...options] : options}
    />
  );
}
