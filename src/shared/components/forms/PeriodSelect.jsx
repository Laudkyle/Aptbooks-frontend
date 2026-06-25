import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Select } from '../ui/Select.jsx';
import { useApi } from '../../hooks/useApi.js';
import { makePeriodsApi } from '../../../features/accounting/periods/api/periods.api.js';

function normalizeRows(data) {
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.rows)) return data.data.rows;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data)) return data;
  return [];
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : '';
}

function labelOf(period) {
  const code = period?.code ?? period?.period_code ?? '';
  const start = dateOnly(period?.start_date ?? period?.startDate);
  const end = dateOnly(period?.end_date ?? period?.endDate);
  const dates = start && end ? ` (${start} → ${end})` : '';
  return `${code || String(period?.id ?? '')}${dates}`;
}

export function PeriodSelect({
  allowEmpty = true,
  emptyLabel = 'Select period',
  options: overrideOptions,
  disabled,
  query = {},
  onChange,
  ...props
}) {
  const { http } = useApi();
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);

  const periodsQuery = useQuery({
    queryKey: ['periods.select', query],
    queryFn: () => periodsApi.list(query),
    staleTime: 60_000
  });

  const periods = useMemo(() => normalizeRows(periodsQuery.data), [periodsQuery.data]);

  const options = useMemo(() => {
    if (overrideOptions?.length) return overrideOptions;
    return periods.map((period) => ({
      value: String(period.id),
      label: labelOf(period),
      period
    }));
  }, [periods, overrideOptions]);

  return (
    <Select
      {...props}
      disabled={disabled || periodsQuery.isLoading}
      options={allowEmpty ? [{ value: '', label: emptyLabel }, ...options] : options}
      onChange={(event) => {
        const selected = options.find((option) => String(option.value) === String(event.target.value));
        onChange?.(event, selected?.period ?? null);
      }}
    />
  );
}
