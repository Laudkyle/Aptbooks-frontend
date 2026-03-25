import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useApi } from './useApi.js';
import { makeBankingApi } from '../../features/banking/api/banking.api.js';
import { CURRENCIES } from '../../app/constants/currencies.js';

function normalizeRows(data) {
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.rows)) return data.data.rows;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data)) return data;
  return [];
}

export function useCurrencies() {
  const { http } = useApi();
  const bankingApi = useMemo(() => makeBankingApi(http), [http]);

  const query = useQuery({
    queryKey: ['currencies.list'],
    queryFn: () => bankingApi.listCurrencies()
  });

  const currencies = useMemo(() => {
    const rows = normalizeRows(query.data);
    if (rows.length) {
      return rows.map((currency) => ({
        code: currency.code ?? currency.currency_code,
        name: currency.name ?? currency.currency_name ?? currency.code ?? currency.currency_code
      })).filter((currency) => currency.code);
    }
    return CURRENCIES;
  }, [query.data]);

  const options = useMemo(
    () => currencies.map((currency) => ({
      value: currency.code,
      label: `${currency.code} — ${currency.name}`.trim()
    })),
    [currencies]
  );

  return { ...query, currencies, options };
}
