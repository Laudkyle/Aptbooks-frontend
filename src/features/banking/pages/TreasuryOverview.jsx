import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { ROUTES } from '../../../app/constants/routes.js';

function Tile({ title, description, to, tag }) {
  return (
    <div className="bg-surface-1 rounded-lg border border-border-subtle shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-text-strong group-hover:text-green-600 transition-colors">{title}</h3>
            <p className="mt-1.5 text-sm text-text-muted leading-relaxed">{description}</p>
          </div>
          {tag ? <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">{tag}</span> : null}
        </div>
        <Link to={to}><Button className="w-full bg-green-600 hover:bg-green-700 shadow-sm shadow-green-600/20 ring-1 ring-green-600/20">Open</Button></Link>
      </div>
    </div>
  );
}

export default function TreasuryOverview() {
  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-strong">Treasury & Cash Management</h1>
            <p className="mt-1 text-sm text-text-muted">Payment execution, liquidity visibility, transfers, cheques, and approval batches.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={ROUTES.treasuryDashboard}><Button variant="outline">Dashboard</Button></Link>
            <Link to={ROUTES.cashForecast}><Button className="bg-green-600 hover:bg-green-700 shadow-sm shadow-green-600/20 ring-1 ring-green-600/20">Forecast Cash</Button></Link>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 mb-6">
          <Tile title="Treasury Dashboard" description="Current balances, pending approvals, outstanding cheques, and liquidity needs." to={ROUTES.treasuryDashboard} tag="Overview" />
          <Tile title="Payment Runs" description="Group outgoing payments, approve them, and execute as one controlled run." to={ROUTES.paymentRuns} tag="Operational" />
          <Tile title="Bank Transfers" description="Move cash between bank accounts with approval and journal posting." to={ROUTES.bankTransfers} tag="Operational" />
          <Tile title="Approval Batches" description="Approve payment runs and bank transfers together in one batch." to={ROUTES.paymentApprovalBatches} tag="Control" />
          <Tile title="Cheques" description="Manage cheque inventory, issuance, clearing, voids, and bounced cheques." to={ROUTES.cheques} tag="Control" />
          <Tile title="Cash Forecast" description="Project near-term inflows, outflows, and closing balances by bank account." to={ROUTES.cashForecast} tag="Forecast" />
        </div>
      </div>
    </div>
  );
}
