import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../../shared/hooks/useApi.js';
import { makeBankingApi } from '../api/banking.api.js';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';

function money(v) { return Number(v || 0).toLocaleString(); }

export default function TreasuryDashboardPage() {
  const { http } = useApi();
  const api = useMemo(() => makeBankingApi(http), [http]);
  const q = useQuery({ queryKey: ['treasury.dashboard'], queryFn: () => api.getTreasuryDashboard() });
  const data = q.data || {};
  const balances = Array.isArray(data.balances) ? data.balances : [];
  const pending = data.pending || {};
  const forecastAccounts = Array.isArray(data.forecast30d?.accounts) ? data.forecast30d.accounts : [];
  return (
    <>
      <PageHeader title="Treasury Dashboard" subtitle="Control liquidity, approvals, and treasury execution." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ContentCard><div className="text-sm text-gray-500">Pending payment runs</div><div className="text-3xl font-semibold mt-2">{pending.pending_payment_runs ?? 0}</div></ContentCard>
        <ContentCard><div className="text-sm text-gray-500">Pending bank transfers</div><div className="text-3xl font-semibold mt-2">{pending.pending_bank_transfers ?? 0}</div></ContentCard>
        <ContentCard><div className="text-sm text-gray-500">Open approval batches</div><div className="text-3xl font-semibold mt-2">{pending.open_approval_batches ?? 0}</div></ContentCard>
        <ContentCard><div className="text-sm text-gray-500">Outstanding cheques</div><div className="text-3xl font-semibold mt-2">{data.outstandingCheques?.outstanding_cheques ?? 0}</div><div className="text-xs mt-1 text-gray-500">Amount {money(data.outstandingCheques?.outstanding_cheque_amount)}</div></ContentCard>
      </div>
      <div className="grid gap-4 mt-4 lg:grid-cols-2">
        <ContentCard>
          <div className="text-base font-semibold mb-3">Bank balances</div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-gray-500"><th className="py-2">Code</th><th>Name</th><th>Currency</th><th className="text-right">Balance</th></tr></thead><tbody>{balances.map((r) => <tr key={r.bank_account_id} className="border-t"><td className="py-2">{r.code}</td><td>{r.name}</td><td>{r.currency_code}</td><td className="text-right">{money(r.balance)}</td></tr>)}{!balances.length && <tr><td className="py-3 text-gray-500" colSpan={4}>No balances available.</td></tr>}</tbody></table></div>
        </ContentCard>
        <ContentCard>
          <div className="text-base font-semibold mb-3">Approved liquidity needs</div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border rounded-lg p-3"><span>Approved payment runs</span><strong>{money(data.approvedLiquidityNeeds?.paymentRuns)}</strong></div>
            <div className="flex items-center justify-between border rounded-lg p-3"><span>Approved bank transfers</span><strong>{money(data.approvedLiquidityNeeds?.bankTransfers)}</strong></div>
          </div>
          <div className="text-base font-semibold mt-6 mb-3">30-day forecast summary</div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border rounded-lg p-3"><span>Opening balance</span><strong>{money(data.forecast30d?.summary?.openingBalance)}</strong></div>
            <div className="flex items-center justify-between border rounded-lg p-3"><span>Total inflows</span><strong>{money(data.forecast30d?.summary?.totalInflows)}</strong></div>
            <div className="flex items-center justify-between border rounded-lg p-3"><span>Total outflows</span><strong>{money(data.forecast30d?.summary?.totalOutflows)}</strong></div>
            <div className="flex items-center justify-between border rounded-lg p-3"><span>Projected closing</span><strong>{money(data.forecast30d?.summary?.projectedClosingBalance)}</strong></div>
          </div>
        </ContentCard>
      </div>
      <ContentCard className="mt-4">
        <div className="text-base font-semibold mb-3">30-day forecast by bank account</div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-gray-500"><th className="py-2">Code</th><th>Name</th><th>Currency</th><th className="text-right">Opening</th><th className="text-right">Inflows</th><th className="text-right">Outflows</th><th className="text-right">Projected closing</th></tr></thead><tbody>{forecastAccounts.map((r)=> <tr key={r.bankAccountId} className="border-t"><td className="py-2">{r.code}</td><td>{r.name}</td><td>{r.currencyCode}</td><td className="text-right">{money(r.openingBalance)}</td><td className="text-right">{money(r.inflows)}</td><td className="text-right">{money(r.outflows)}</td><td className="text-right font-medium">{money(r.projectedClosingBalance)}</td></tr>)}{!forecastAccounts.length && <tr><td colSpan={7} className="py-3 text-gray-500">No forecast data available.</td></tr>}</tbody></table></div>
      </ContentCard>
    </>
  );
}
