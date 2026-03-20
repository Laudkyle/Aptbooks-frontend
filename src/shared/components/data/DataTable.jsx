import React from 'react';
import { Table } from '../ui/Table.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';

export function DataTable({
  columns,
  rows,
  keyField = 'id',
  isLoading,
  emptyTitle = 'No results',
  emptyDescription = 'Try adjusting your filters.',
  empty,
  onRowClick
}) {
  const resolvedEmptyTitle = empty?.title ?? emptyTitle;
  const resolvedEmptyDescription = empty?.description ?? emptyDescription;

  if (isLoading) {
    return (
      <div className="app-surface p-4">
        <Skeleton className="h-6 w-40" />
        <div className="mt-3 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="app-surface p-10 text-center">
        <div className="mx-auto max-w-md">
          <div className="text-base font-semibold text-brand-deep">{resolvedEmptyTitle}</div>
          <div className="mt-1 text-sm text-slate-600">{resolvedEmptyDescription}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-card">
      <Table columns={columns} rows={rows} keyField={keyField} onRowClick={onRowClick} />
    </div>
  );
}
