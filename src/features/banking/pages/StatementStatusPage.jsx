import React from "react";
import PageHeader from "@/shared/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";

export default function StatementStatusPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Statement status"
        subtitle="Reporting widget endpoint (/reporting/banking/statement-status)."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parameters</CardTitle>
          <CardDescription>Backend requires from/to dates. Optional bankAccountId.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="grid gap-2">
              <Label>From</Label>
              <Input placeholder="YYYY-MM-DD" />
            </div>
            <div className="grid gap-2">
              <Label>To</Label>
              <Input placeholder="YYYY-MM-DD" />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Bank account (optional)</Label>
              <Input placeholder="uuid" />
            </div>
          </div>

          <div className="rounded-xl border p-6">
            <div className="text-sm font-medium">Widget preview</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Once wired to the API, show bank accounts with missing statements, last imported dates, and matching completion.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
