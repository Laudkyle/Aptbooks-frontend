import React from "react";
import PageHeader from "@/shared/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";

export default function StatementsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank statements"
        subtitle="Create statements, import lines, and match to posted journals."
        right={<Button>Create statement</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Statements</CardTitle>
            <CardDescription>Filter by bank account, date, or matching progress.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Bank account</Label>
                <Input placeholder="Select bank account" />
              </div>
              <div className="grid gap-2">
                <Label>From</Label>
                <Input placeholder="YYYY-MM-DD" />
              </div>
              <div className="grid gap-2">
                <Label>To</Label>
                <Input placeholder="YYYY-MM-DD" />
              </div>
            </div>

            <div className="rounded-xl border p-6">
              <div className="text-sm font-medium">Nothing to show yet</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Once you create a statement, it will appear here with drill-down to lines and matching.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button>Create statement</Button>
                <Button variant="outline">View cashbook</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shortcuts</CardTitle>
            <CardDescription>High-frequency workflows.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="secondary" className="justify-start">Import CSV lines</Button>
            <Button variant="secondary" className="justify-start">Review unmatched lines</Button>
            <Button variant="secondary" className="justify-start">Matching rules</Button>
            <Button variant="secondary" className="justify-start">Run reconciliation</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
