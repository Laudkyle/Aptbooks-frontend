import React from 'react';
import { Link } from 'react-router-dom';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../shared/components/ui/Card.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { ROUTES } from '../../../app/constants/routes.js';

export default function ComplianceOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        subtitle="IFRS/IAS workbench (leases, revenue, ECL, taxes)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to={ROUTES.complianceIFRS16}>IFRS 16</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={ROUTES.complianceIFRS15}>IFRS 15</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={ROUTES.complianceIFRS9}>IFRS 9</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={ROUTES.complianceIAS12}>IAS 12</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>How this area works</CardTitle>
            <CardDescription>Each standard ships as its own workbench: master data, calculations, posting, and disclosures.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold text-brand-deep">Controls</div>
                <div className="mt-1 text-sm text-slate-600">Idempotency keys, validations, workflow-friendly statuses, and audit fields.</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold text-brand-deep">Posting</div>
                <div className="mt-1 text-sm text-slate-600">All standards post into Journals via period-aware posting endpoints.</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold text-brand-deep">Traceability</div>
                <div className="mt-1 text-sm text-slate-600">Runs keep input snapshots and generated schedules to support audits.</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-sm font-semibold text-brand-deep">Disclosures</div>
                <div className="mt-1 text-sm text-slate-600">Each module exposes report endpoints to build note disclosures.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick start</CardTitle>
            <CardDescription>Typical sequence for go-live.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="font-semibold">1) Configure accounts</div>
              <div className="mt-1 text-slate-600">Pick the GL accounts each standard should post into.</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="font-semibold">2) Load master data</div>
              <div className="mt-1 text-slate-600">Leases, contracts, temp differences, models, etc.</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="font-semibold">3) Run & post</div>
              <div className="mt-1 text-slate-600">Generate schedules, compute runs, review, then post.</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
