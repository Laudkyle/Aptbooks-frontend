import React from "react";
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"../../../shared/components/ui/card";
import { Button } from"../../../shared/components/ui/Button";
import { Input } from"../../../shared/components/ui/Input";
import { Label } from"../../../shared/components/ui/label";
import { Badge } from"../../../shared/components/ui/Badge";

export default function MatchingRulesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Matching rules"
        subtitle="Control statement matching tolerance, date windows, similarity thresholds, and priority."
        right={<Button>Create rule</Button>}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rules</CardTitle>
          <CardDescription>Rules apply in priority order; start with strict matching and widen gradually.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="grid gap-2">
              <Label>Search</Label>
              <Input placeholder="Rule name" />
            </div>
            <div className="grid gap-2">
              <Label>Active</Label>
              <Input placeholder="true / false" />
            </div>
            <div className="grid gap-2">
              <Label>Priority </Label>
              <Input placeholder="e.g., 100" />
            </div>
            <div className="flex items-end">
              <Button variant="secondary" className="w-full">Apply</Button>
            </div>
          </div>

          <div className="rounded-xl border p-6">
            <div className="text-sm font-medium">No rules loaded</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Create a rule to enable suggestions and guide automatic matching.
            </div>
            <div className="mt-4">
              <Button>Create rule</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
