import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useApi } from './useApi.js';
import { makeCoaApi } from '../../features/accounting/chartOfAccounts/api/coa.api.js';

function normalizeRows(data) {
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.rows)) return data.data.rows;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data)) return data;
  return [];
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return [value];
}

function accountTypeOf(account) {
  return String(account?.accountTypeCode ?? account?.account_type_code ?? '').toUpperCase();
}

function labelOf(account) {
  const code = account?.code ?? account?.account_code ?? '';
  const name = account?.name ?? account?.account_name ?? '';
  const type = accountTypeOf(account);
  if (code && name) return `${code} — ${name}`;
  if (name) return type ? `${name} (${type})` : name;
  if (code) return code;
  return String(account?.id ?? '');
}

export function useAccounts(filters = {}) {
  const { http } = useApi();
  const coaApi = useMemo(() => makeCoaApi(http), [http]);

  const query = useQuery({
    queryKey: ['coa.accounts.unified', filters],
    queryFn: () => coaApi.list({ includeArchived: filters?.includeArchived ? 'true' : 'false', limit: 1000 }),
    staleTime: 60_000
  });

  const accounts = useMemo(() => {
    const rows = normalizeRows(query.data);
    const ids = new Set(asArray(filters?.ids).map(String));
    const excludeIds = new Set(asArray(filters?.excludeIds).map(String));
    const allowedTypes = new Set(asArray(filters?.accountTypeCodes).map((x) => String(x).toUpperCase()));
    const q = String(filters?.q ?? '').trim().toLowerCase();
    const predicate = typeof filters?.predicate === 'function' ? filters.predicate : null;

    return rows.filter((account) => {
      const id = String(account?.id ?? '');
      const archived = Boolean(account?.isArchived ?? account?.is_archived ?? false);
      const type = accountTypeOf(account);
      const haystack = `${account?.code ?? account?.account_code ?? ''} ${account?.name ?? account?.account_name ?? ''} ${type}`.toLowerCase();

      if (!filters?.includeArchived && archived) return false;
      if (ids.size && !ids.has(id)) return false;
      if (excludeIds.has(id)) return false;
      if (allowedTypes.size && !allowedTypes.has(type)) return false;
      if (q && !haystack.includes(q)) return false;
      if (predicate && !predicate(account)) return false;
      return true;
    });
  }, [filters, query.data]);

  const options = useMemo(
    () => accounts.map((account) => ({ value: String(account.id), label: labelOf(account), account })),
    [accounts]
  );

  return { ...query, accounts, options };
}
