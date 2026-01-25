import React from "react";
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"../../../shared/components/ui/card";
import { Button } from"../../../shared/components/ui/button";
import { Input } from"../../../shared/components/ui/input";
import { Label } from"../../../shared/components/ui/label";
import { Badge } from"../../../shared/components/ui/badge";

export default function ReconciliationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reconciliations"
        subtitle="Run reconciliations for open periods, close/lock, unlock, and view diffs."
        right={<Button>Run reconciliation</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
            <CardDescription>Filter by bank account, period, and lock state.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Bank account</Label>
                <Input placeholder="Select" />
              </div>
              <div className="grid gap-2">
                <Label>Period</Label>
                <Input placeholder="Select period" />
              </div>
              <div className="grid gap-2">
                <Label>Locked</Label>
                <Input placeholder="true / false" />
              </div>
            </div>

            <div className="rounded-xl border p-6">
              <div className="text-sm font-medium">No reconciliations loaded</div>
              <div className="mt-1 text-sm text-muted-foreground">
                After running reconciliation, you can inspect diffs against statement balances and close the run.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Run controls</CardTitle>
            <CardDescription>Common actions at period-end.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button className="justify-start">Run</Button>
            <Button variant="secondary" className="justify-start">Close</Button>
            <Button variant="secondary" className="justify-start">Unlock</Button>
            <Button variant="outline" className="justify-start">View diff</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
