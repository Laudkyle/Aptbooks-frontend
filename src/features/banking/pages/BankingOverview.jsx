import React from "react";
import { Link } from "react-router-dom";

import PageHeader from "@/shared/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";

function Tile({ title, description, to, tag }) {
  return (
    <Card className="group overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          {tag ? <Badge variant="secondary">{tag}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Button asChild className="w-full">
          <Link to={to}>Open</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function BankingOverview() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Banking"
        subtitle="Statements, matching, cashbook and reconciliations."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="secondary">
              <Link to="/banking/statements">Import statement</Link>
            </Button>
            <Button asChild>
              <Link to="/banking/reconciliations">Run reconciliation</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Tile
          title="Bank accounts"
          description="Configure and manage GL-linked bank accounts."
          to="/banking/accounts"
          tag="Setup"
        />
        <Tile
          title="Statements"
          description="Upload lines, review matches, and track progress."
          to="/banking/statements"
          tag="Operational"
        />
        <Tile
          title="Matching rules"
          description="Tune matching tolerance, windows, and priorities."
          to="/banking/matching/rules"
          tag="Control"
        />
        <Tile
          title="Cashbook"
          description="Search ledger cash movements and running balances."
          to="/banking/cashbook"
          tag="Query"
        />
        <Tile
          title="Reconciliations"
          description="Run, close, unlock and review period diffs."
          to="/banking/reconciliations"
          tag="Period-end"
        />
        <Tile
          title="Statement status"
          description="Banking status widget used in reporting dashboards."
          to="/banking/reporting/statement-status"
          tag="Reporting"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow tips</CardTitle>
          <CardDescription>
            Keep statements current, match to posted journals, and close reconciliations per period.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border p-4">
            <div className="text-sm font-medium">1. Import</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Create a statement and import lines via CSV for speed.
            </div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-sm font-medium">2. Match</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Use suggestions to match lines against posted journal entries.
            </div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-sm font-medium">3. Reconcile</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Run reconciliation per bank account and open period, then close.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
