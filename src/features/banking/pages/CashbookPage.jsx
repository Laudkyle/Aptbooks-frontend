import React from "react";
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"../../../shared/components/ui/card";
import { Button } from"../../../shared/components/ui/button";
import { Input } from"../../../shared/components/ui/input";
import { Label } from"../../../shared/components/ui/label";
import { Badge } from"../../../shared/components/ui/badge";

export default function CashbookPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cashbook"
        subtitle="Ledger-based cashbook view with optional running balance."
        right={<Button variant="secondary">Export</Button>}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search</CardTitle>
          <CardDescription>Filter by bank account and date range.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="grid gap-2 md:col-span-2">
              <Label>Bank account</Label>
              <Input placeholder="Select" />
            </div>
            <div className="grid gap-2">
              <Label>From</Label>
              <Input placeholder="YYYY-MM-DD" />
            </div>
            <div className="grid gap-2">
              <Label>To</Label>
              <Input placeholder="YYYY-MM-DD" />
            </div>
            <div className="flex items-end">
              <Button className="w-full">Search</Button>
            </div>
          </div>

          <div className="rounded-xl border p-6">
            <div className="text-sm font-medium">Results will appear here</div>
            <div className="mt-1 text-sm text-muted-foreground">
              This layout is ready for the cashbook API response including running balance.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
