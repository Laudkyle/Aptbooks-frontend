import React from "react";
import PageHeader from "@/shared/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";

export default function BankAccountsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank accounts"
        subtitle="GL-linked bank accounts used for statements, cashbook, and reconciliations."
        right={
          <Button>
            Create bank account
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Accounts</CardTitle>
              <CardDescription>Search by code, name, or currency.</CardDescription>
            </div>
            <Badge variant="secondary">Phase 8</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Search</Label>
              <Input placeholder="e.g., GCB, Stanbic, USD" />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Input placeholder="active / inactive" />
            </div>
            <div className="flex items-end">
              <Button variant="secondary" className="w-full">Apply filters</Button>
            </div>
          </div>

          <div className="rounded-xl border p-6">
            <div className="text-sm font-medium">No accounts loaded</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Connect to the backend to display real data. This UI provides the full layout, filters, and actions.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button>Create first account</Button>
              <Button variant="outline">Import from template</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
