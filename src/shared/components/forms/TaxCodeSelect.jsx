import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Select } from '../ui/Select.jsx';
import { useApi } from '../../hooks/useApi.js';
import { makeTaxApi } from '../../../features/accounting/tax/api/tax.api.js';
import { normalizeRows, normalizeTaxCodeShape } from '../../tax/frontendTax.js';


function normalizeQuery(query = {}) {
  const next = { ...query };
  if (next.taxCategory && !next.taxType) {
    const category = String(next.taxCategory).toLowerCase();
    if (category === 'withholding') next.taxType = 'WITHHOLDING';
  }
  delete next.taxCategory;
  return next;
}

function labelOf(code) {
  const codeValue = code?.code ?? code?.taxCode ?? '';
  const name = code?.name ?? code?.description ?? '';
  if (codeValue && name) return `${codeValue} — ${name}`;
  return codeValue || name || String(code?.id ?? '');
}

export function TaxCodeSelect({
  allowEmpty = true,
  emptyLabel = 'Select tax code',
  query = { status: 'active' },
  options: overrideOptions,
  disabled,
  ...props
}) {
  const { http } = useApi();
  const taxApi = useMemo(() => makeTaxApi(http), [http]);

  const taxCodesQuery = useQuery({
    queryKey: ['tax.codes.select', query],
    queryFn: () => taxApi.listCodes(normalizeQuery(query)),
    staleTime: 60_000
  });

  const options = useMemo(() => {
    if (overrideOptions?.length) return overrideOptions;
    return normalizeRows(taxCodesQuery.data).map((code) => normalizeTaxCodeShape(code)).map((code) => ({
      value: String(code.id),
      label: labelOf(code),
      code
    }));
  }, [overrideOptions, taxCodesQuery.data]);

  return (
    <Select
      {...props}
      disabled={disabled || taxCodesQuery.isLoading}
      options={allowEmpty ? [{ value: '', label: emptyLabel }, ...options] : options}
    />
  );
}
