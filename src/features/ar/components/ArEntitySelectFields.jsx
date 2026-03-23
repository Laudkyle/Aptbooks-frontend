import React from 'react';

import { Select } from '../../../shared/components/ui/Select.jsx';

export function ArEntitySelectFields({
  customerId,
  entityValue,
  customerOptions,
  entityOptions,
  onCustomerChange,
  onEntityChange,
  customerLabel = 'Customer',
  entityLabel = 'Source document'
}) {
  return (
    <>
      <Select label={customerLabel} value={customerId} onChange={(e) => onCustomerChange(e.target.value)} options={customerOptions} />
      <Select label={entityLabel} value={entityValue} onChange={(e) => onEntityChange(e.target.value)} options={entityOptions} />
    </>
  );
}
