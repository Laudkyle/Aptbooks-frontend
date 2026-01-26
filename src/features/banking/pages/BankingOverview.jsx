import React from "react";
import { Link } from "react-router-dom";

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ROUTES } from '../../../app/constants/routes.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Badge } from '../../../shared/components/ui/Badge.jsx';

function Tile({ title, description, to, tag }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
              {title}
            </h3>
            <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
              {description}
            </p>
          </div>
          {tag ? (
            <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
              tag === 'Setup' ? 'bg-purple-100 text-purple-800' :
              tag === 'Operational' ? 'bg-blue-100 text-blue-800' :
              tag === 'Control' ? 'bg-orange-100 text-orange-800' :
              tag === 'Query' ? 'bg-cyan-100 text-cyan-800' :
              tag === 'Period-end' ? 'bg-indigo-100 text-indigo-800' :
              tag === 'Reporting' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {tag}
            </span>
          ) : null}
        </div>
        <Link to={to}>
          <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-md font-medium transition-colors">
            Open
          </button>
        </Link>
      </div>
    </div>
  );
}

export default function BankingOverview() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* QuickBooks-style Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Banking</h1>
            <p className="mt-1 text-sm text-gray-600">
              Statements, matching, cashbook, and reconciliations
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={ROUTES.bankingStatements}>
              <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-md font-medium hover:bg-gray-50 transition-colors">
                Import Statement
              </button>
            </Link>
            <Link to={ROUTES.bankingReconciliations}>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-md font-medium transition-colors shadow-sm">
                Run Reconciliation
              </button>
            </Link>
          </div>
        </div>

        {/* Main Features Grid */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 mb-6">
          <Tile
            title="Bank Accounts"
            description="Configure and manage GL-linked bank accounts"
            to={ROUTES.bankingAccounts}
            tag="Setup"
          />
          <Tile
            title="Statements"
            description="Upload lines, review matches, and track progress"
            to={ROUTES.bankingStatements}
            tag="Operational"
          />
          <Tile
            title="Matching Rules"
            description="Tune matching tolerance, windows, and priorities"
            to={ROUTES.bankingMatchingRules}
            tag="Control"
          />
          <Tile
            title="Cashbook"
            description="Search ledger cash movements and running balances"
            to={ROUTES.bankingCashbook}
            tag="Query"
          />
          <Tile
            title="Reconciliations"
            description="Run, close, unlock and review period diffs"
            to={ROUTES.bankingReconciliations}
            tag="Period-end"
          />
          <Tile
            title="Statement Status"
            description="Banking status widget used in reporting dashboards"
            to={ROUTES.bankingStatementStatusReport}
            tag="Reporting"
          />
        </div>

        {/* Workflow Tips Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-blue-50 to-transparent">
            <h2 className="text-lg font-semibold text-gray-900">Workflow Tips</h2>
            <p className="mt-1 text-sm text-gray-600">
              Keep statements current, match to posted journals, and close reconciliations per period
            </p>
          </div>
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-7 h-7 bg-green-600 text-white rounded-full text-sm font-semibold">
                    1
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Import</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Create a statement and import lines via CSV for speed
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-7 h-7 bg-blue-600 text-white rounded-full text-sm font-semibold">
                    2
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Match</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Use suggestions to match lines against posted journal entries
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center justify-center w-7 h-7 bg-purple-600 text-white rounded-full text-sm font-semibold">
                    3
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Reconcile</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Run reconciliation per bank account and open period, then close
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}