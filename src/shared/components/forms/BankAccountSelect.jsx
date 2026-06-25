import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Select } from '../ui/Select.jsx';
import { useApi } from '../../hooks/useApi.js';
import { makeBankingApi } from '../../../features/banking/api/banking.api.js';

function normalizeRows(data) {
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.rows)) return data.data.rows;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data)) return data;
  return [];
}

function labelOf(account) {
  const code = account?.code ?? account?.account_code ?? '';
  const name = account?.name ?? account?.account_name ?? '';
  const currency = account?.currency_code ?? account?.currencyCode ?? '';
  const main = [code, name].filter(Boolean).join(' — ');
  return currency ? `${main} (${currency})` : main || String(account?.id ?? '');
}

export function BankAccountSelect({
  allowEmpty = true,
  emptyLabel = 'Select bank account',
  options: overrideOptions,
  disabled,
  onlyActive = true,
  onChange,
  ...props
}) {
  const { http } = useApi();
  const bankingApi = useMemo(() => makeBankingApi(http), [http]);

  const accountsQuery = useQuery({
    queryKey: ['banking.accounts.select', { onlyActive }],
    queryFn: () => bankingApi.listAccounts(),
    staleTime: 60_000
  });

  const accounts = useMemo(() => {
    const rows = normalizeRows(accountsQuery.data);
    return onlyActive ? rows.filter((a) => a.is_active !== false && a.isActive !== false) : rows;
  }, [accountsQuery.data, onlyActive]);

  const options = useMemo(() => {
    if (overrideOptions?.length) return overrideOptions;
    return accounts.map((account) => ({
      value: String(account.id),
      label: labelOf(account),
      account
    }));
  }, [accounts, overrideOptions]);

  return (
    <Select
      {...props}
      disabled={disabled || accountsQuery.isLoading}
      options={allowEmpty ? [{ value: '', label: emptyLabel }, ...options] : options}
      onChange={(event) => {
        const selected = options.find((option) => String(option.value) === String(event.target.value));
        onChange?.(event, selected?.account ?? null);
      }}
    />
  );
}
