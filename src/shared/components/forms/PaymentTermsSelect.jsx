import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Select } from '../ui/Select.jsx';
import { useApi } from '../../hooks/useApi.js';
import { makePaymentConfigApi } from '../../../features/business/api/paymentConfig.api.js';
import { normalizeRows } from '../../tax/frontendTax.js';

function labelOf(paymentTerm) {
  return paymentTerm?.name || paymentTerm?.code || String(paymentTerm?.id ?? '');
}

export function PaymentTermsSelect({
  allowEmpty = true,
  emptyLabel = 'Select terms',
  options: overrideOptions,
  disabled,
  ...props
}) {
  const { http } = useApi();
  const paymentConfigApi = useMemo(() => makePaymentConfigApi(http), [http]);

  const paymentTermsQuery = useQuery({
    queryKey: ['paymentTerms.select'],
    queryFn: () => paymentConfigApi.listPaymentTerms(),
    staleTime: 60_000
  });

  const options = useMemo(() => {
    if (overrideOptions?.length) return overrideOptions;
    return normalizeRows(paymentTermsQuery.data).map((paymentTerm) => ({
      value: String(paymentTerm.id),
      label: labelOf(paymentTerm),
      paymentTerm
    }));
  }, [overrideOptions, paymentTermsQuery.data]);

  return (
    <Select
      {...props}
      disabled={disabled || paymentTermsQuery.isLoading}
      options={allowEmpty ? [{ value: '', label: emptyLabel }, ...options] : options}
    />
  );
}
