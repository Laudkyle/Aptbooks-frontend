import React from 'react';

import { Select } from '../ui/Select.jsx';
import { useCurrencies } from '../../hooks/useCurrencies.js';

export function CurrencySelect({
  allowEmpty = false,
  emptyLabel = 'Select currency',
  options: overrideOptions,
  disabled,
  ...props
}) {
  const currenciesQuery = useCurrencies();

  const options = (overrideOptions && overrideOptions.length ? overrideOptions : currenciesQuery.options) ?? [];
  const selectOptions = allowEmpty ? [{ value: '', label: emptyLabel }, ...options] : options;

  return (
    <Select
      {...props}
      disabled={disabled || currenciesQuery.isLoading}
      options={selectOptions}
    />
  );
}
