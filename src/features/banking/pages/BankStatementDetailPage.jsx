import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import PageHeader from "../../../shared/components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "../../../shared/components/ui/Card";
import { Button } from "../../../shared/components/ui/Button";
import { Input } from "../../../shared/components/ui/Input";
import { Badge } from "../../../shared/components/ui/Badge";
import { Tabs } from "../../../shared/components/ui/Tabs";
import { Table, TBody, TD, TH, THead, TR } from "../../../shared/components/ui/Table";


export default function BankStatementDetailPage() {
  const { statementId } = useParams();
  const [tab, setTab] = useState("lines");

  const statement = useMemo(
    () => ({
      id: statementId,
      bankAccountName: "Main Operating Account",
      bankAccountCode: "BNK-001",
      statementDate: "2026-01-01",
      openingBalance: 0,
      closingBalance: 0,
      currencyCode: "GHS",
      status: "open",
    }),
    [statementId]
  );

  const sampleLines = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => ({
        id: `line_${i + 1}`,
        txnDate: `2026-01-${String(i + 2).padStart(2, "0")}`,
        amount: i % 2 === 0 ? 250 : -125,
        description: i % 2 === 0 ? "Card settlement" : "Bank charges",
        reference: `REF-${1000 + i}`,
        externalId: `EXT-${2000 + i}`,
        matched: i % 3 === 0,
      })),
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Statement"
        subtitle={
          <span className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">{statement.bankAccountName}</span>
            <span className="mx-2 text-slate-300">•</span>
            <span className="font-mono">{statement.bankAccountCode}</span>
            <span className="mx-2 text-slate-300">•</span>
            <span>Statement ID: </span>
            <span className="font-mono">{statement.id}</span>
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" asChild>
              <Link to="/banking/statements">Back to Statements</Link>
            </Button>
            <Button variant="secondary">Import CSV</Button>
            <Button>New Match</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader title="Statement summary" />
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">Statement date</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{statement.statementDate}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">Opening balance</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {statement.currencyCode} {statement.openingBalance.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">Closing balance</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {statement.currencyCode} {statement.closingBalance.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">Status</div>
                <div className="mt-2">
                  <Badge variant={statement.status === "closed" ? "success" : "warning"}>
                    {String(statement.status).toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Button variant="secondary" className="justify-center">
                Add lines
              </Button>
              <Button variant="secondary" className="justify-center">
                Import lines (CSV)
              </Button>
              <Button className="justify-center">Run reconciliation preview</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader title="Quick actions" />
          <CardContent>
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-700">Match a line</div>
                <div className="mt-1 text-xs text-slate-600">
                  Select a statement line and link it to a posted journal entry.
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm">Match</Button>
                  <Button size="sm" variant="secondary">
                    Suggestions
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-medium text-slate-700">Filters</div>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <Input placeholder="Search description / reference" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="From (YYYY-MM-DD)" />
                    <Input placeholder="To (YYYY-MM-DD)" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary">Unmatched</Button>
                    <Button variant="secondary">Matched</Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Statement workspace"
          subtitle="Manage lines, import CSV, and perform matching."
        />
        <CardContent>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "lines", label: "Lines" },
              { value: "import", label: "Import CSV" },
              { value: "match", label: "Match" },
              { value: "suggestions", label: "Suggestions" },
              { value: "audit", label: "Audit" },
            ]}
          />

          {tab === "lines" && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-slate-600">
                  Showing <span className="font-medium text-slate-900">{sampleLines.length}</span> lines
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary">Export</Button>
                  <Button>New line</Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <Table>
                  <THead>
                    <TR>
                      <TH>Date</TH>
                      <TH>Description</TH>
                      <TH className="text-right">Amount</TH>
                      <TH>Reference</TH>
                      <TH>External ID</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {sampleLines.map((l) => (
                      <TR key={l.id}>
                        <TD className="whitespace-nowrap font-mono text-xs">{l.txnDate}</TD>
                        <TD className="min-w-[240px]">
                          <div className="text-sm font-medium text-slate-900">{l.description}</div>
                          <div className="text-xs text-slate-500">Line ID: {l.id}</div>
                        </TD>
                        <TD className="whitespace-nowrap text-right font-medium">
                          {statement.currencyCode} {l.amount.toLocaleString()}
                        </TD>
                        <TD className="font-mono text-xs">{l.reference}</TD>
                        <TD className="font-mono text-xs">{l.externalId}</TD>
                        <TD>
                          <Badge variant={l.matched ? "success" : "secondary"}>
                            {l.matched ? "Matched" : "Unmatched"}
                          </Badge>
                        </TD>
                        <TD className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="secondary">
                              View
                            </Button>
                            <Button size="sm">Match</Button>
                          </div>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </div>
          )}

          {tab === "import" && (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
              <Card className="lg:col-span-7">
                <CardHeader title="Paste CSV" subtitle="CSV columns: txnDate, amount, description?, reference?, externalId?" />
                <CardContent>
                  <div className="space-y-3">
                    <textarea
                      className="h-56 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder={`txnDate,amount,description,reference,externalId\n2026-01-02,250,Card settlement,REF-1001,EXT-2001`}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button>Validate</Button>
                      <Button variant="secondary">Import</Button>
                      <Button variant="secondary">Download template</Button>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                      This is UI-only. Wire it to <span className="font-mono">POST /modules/banking/statements/:statementId/lines/import-csv</span>.
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-5">
                <CardHeader title="Import checks" />
                <CardContent>
                  <div className="space-y-2 text-sm text-slate-700">
                    <div className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
                      <div>
                        Ensure amounts are numeric (negative for debits).
                        <div className="text-xs text-slate-500">Backend accepts aliases: txn_date, date, external_id</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
                      <div>
                        Use <span className="font-mono">Idempotency-Key</span> for imports.
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
                      <div>Large statements: paginate using limit/offset.</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "match" && (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
              <Card className="lg:col-span-6">
                <CardHeader title="Select statement line" />
                <CardContent>
                  <div className="space-y-3">
                    <Input placeholder="Line ID or reference" />
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-xs text-slate-500">Selected line</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">Unmatched line placeholder</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full bg-slate-100 px-2 py-1">txnDate: 2026-01-02</span>
                        <span className="rounded-full bg-slate-100 px-2 py-1">amount: GHS 250</span>
                        <span className="rounded-full bg-slate-100 px-2 py-1">reference: REF-1001</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-6">
                <CardHeader title="Match to posted journal" subtitle="POST /modules/banking/statements/lines/:lineId/match" />
                <CardContent>
                  <div className="space-y-3">
                    <Input placeholder="Posted Journal Entry ID" />
                    <Input placeholder="Reason (optional)" />
                    <Input placeholder="Rule version (optional)" />
                    <div className="flex gap-2">
                      <Button>Match</Button>
                      <Button variant="secondary">Cancel</Button>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      Backend enforces the journal entry must be <span className="font-mono">status='posted'</span>.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "suggestions" && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-slate-600">
                  Suggestions help you quickly match a line to candidate journal entries.
                </div>
                <Button variant="secondary">Refresh</Button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <Table>
                  <THead>
                    <TR>
                      <TH>Candidate journal</TH>
                      <TH>Score</TH>
                      <TH>Reason</TH>
                      <TH className="text-right">Action</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <TR key={i}>
                        <TD>
                          <div className="text-sm font-medium text-slate-900">JE-{5000 + i}</div>
                          <div className="text-xs text-slate-500">Posted • 2026-01-0{(i % 9) + 1}</div>
                        </TD>
                        <TD className="font-mono text-xs">{(0.92 - i * 0.08).toFixed(2)}</TD>
                        <TD className="text-sm text-slate-700">Amount within tolerance;description similarity</TD>
                        <TD className="text-right">
                          <Button size="sm">Match</Button>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                Wire to <span className="font-mono">GET /modules/banking/matching/lines/:lineId/suggestions</span>.
              </div>
            </div>
          )}

          {tab === "audit" && (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
              <Card className="lg:col-span-7">
                <CardHeader title="Audit trail" subtitle="Operational history of imports, matches, and changes." />
                <CardContent>
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                        <div>
                          <div className="text-sm font-medium text-slate-900">Line matched</div>
                          <div className="text-xs text-slate-500">by user@company.com • 2026-01-0{(i % 9) + 1} 09:1{i}</div>
                        </div>
                        <Badge variant="secondary">Event</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-5">
                <CardHeader title="Notes" />
                <CardContent>
                  <div className="space-y-3">
                    <textarea
                      className="h-40 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="Internal notes for audit or reconciliation context..."
                    />
                    <Button>Save note</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
