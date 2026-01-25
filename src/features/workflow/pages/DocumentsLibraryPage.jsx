import React from "react";
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"../../../shared/components/ui/card";
import { Button } from"../../../shared/components/ui/button";

export default function DocumentsLibraryPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Documents" subtitle="Library, versions, and approval workflow" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Work queue</CardTitle>
            <CardDescription>Create and manage documents, versions and approvals.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">New document</Button>
              <Button size="sm" variant="secondary">Upload version</Button>
              <Button size="sm" variant="ghost">Open approvals inbox</Button>
            </div>
            <div className="mt-4 rounded-xl border bg-muted/20 p-6">
              <div className="text-sm font-medium">No data loaded</div>
              <div className="mt-1 text-sm text-muted-foreground">
                This page is UI-ready. Wire it to the backend endpoints when your integration phase begins.
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Operational tips</CardTitle>
            <CardDescription>Design choices aligned with your backend.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Entity linking:</span> each document ties to an entity type/id.
            </div>
            <div>
              <span className="font-medium text-foreground">Versioning:</span> upload uses raw bytes + x-filename.
            </div>
            <div>
              <span className="font-medium text-foreground">Approvals:</span> approve/reject requires approvals.act.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
