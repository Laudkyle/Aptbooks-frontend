import React from 'react';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { FilterBar } from '../../../shared/components/data/FilterBar.jsx';

export function ReportShell({ filters, right, children, footer }) {
  return (
    <ContentCard>
      <FilterBar left={<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{filters}</div>} right={right} />
      <div className="mt-4">{children}</div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </ContentCard>
  );
}
