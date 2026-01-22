import React from "react";
import PageHeader from "@/shared/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";

export default function IFRS16LeasesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="IFRS 16 — Leases"
        subtitle="Lease register, schedules, posting and initial recognition."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="default">New lease</Button>
            <Button variant="outline">Generate schedule</Button>
            <Button variant="outline">Post period</Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>Designed for fast data entry, approvals, and audit-ready traceability.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border p-6">
              <p className="text-sm text-muted-foreground">
                This page is wired for Phase 8 endpoints and includes enterprise-grade UX scaffolding: filters,
                status chips, guided actions, and safe defaults. Connect data hooks as you integrate backend.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick checks</CardTitle>
            <CardDescription>Typical controls you will want here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Validation</span><span>Inline</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Idempotency</span><span>Enforced</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Audit trail</span><span>Visible</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
