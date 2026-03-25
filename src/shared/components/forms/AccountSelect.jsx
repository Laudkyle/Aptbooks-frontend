import React from 'react';

import { Select } from '../ui/Select.jsx';
import { useAccounts } from '../../hooks/useAccounts.js';

export function AccountSelect({
  allowEmpty = true,
  emptyLabel = 'Select account',
  filters,
  options: overrideOptions,
  disabled,
  ...props
}) {
  const accountsQuery = useAccounts(filters);

  const options = (overrideOptions && overrideOptions.length ? overrideOptions : accountsQuery.options) ?? [];
  const selectOptions = allowEmpty ? [{ value: '', label: emptyLabel }, ...options] : options;

  return (
    <Select
      {...props}
      disabled={disabled || accountsQuery.isLoading}
      options={selectOptions}
    />
  );
}
