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
  onRowClick
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3">
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
      <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
        <div className="mx-auto max-w-md">
          <div className="text-base font-semibold text-brand-deep">{emptyTitle}</div>
          <div className="mt-1 text-sm text-slate-600">{emptyDescription}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <Table columns={columns} rows={rows} keyField={keyField} onRowClick={onRowClick} />
    </div>
  );
}
