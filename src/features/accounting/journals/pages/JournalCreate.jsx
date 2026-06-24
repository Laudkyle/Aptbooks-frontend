import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeJournalsApi } from '../api/journals.api.js';
import { makePeriodsApi } from '../../periods/api/periods.api.js';
import { makeCoaApi } from '../../chartOfAccounts/api/coa.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { AccountSelect } from '../../../../shared/components/forms/AccountSelect.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { ROUTES } from '../../../../app/constants/routes.js';


export default function JournalCreate() {
  const { http } = useApi();
  const api = useMemo(() => makeJournalsApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const toast = useToast();
  const navigate = useNavigate();

  const periodsQ = useQuery({ queryKey: ['periods'], queryFn: periodsApi.list, staleTime: 10_000 });
  const accountsQ = useQuery({ queryKey: ['coa', 'active'], queryFn: () => coaApi.list({ includeArchived: 'false' }), staleTime: 10_000 });

  const [periodId, setPeriodId] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [memo, setMemo] = useState('');
  const [typeCode, setTypeCode] = useState('GENERAL');

  const [lines, setLines] = useState([
    { accountId: '', description: '', debit: '', credit: '' },
    { accountId: '', description: '', debit: '', credit: '' }
  ]);

  function setLine(i, patch) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => prev.concat({ accountId: '', description: '', debit: '', credit: '' }));
  }

  function removeLine(i) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  function parseAmountToCents(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return 0n;
    if (!/^\d+(?:\.\d{0,2})?$/.test(raw)) return null;
    const [whole, fraction = ''] = raw.split('.');
    return BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
  }

  function formatCents(value) {
    const amount = value < 0n ? -value : value;
    const whole = amount / 100n;
    const fraction = String(amount % 100n).padStart(2, '0');
    return `${value < 0n ? '-' : ''}${whole}.${fraction}`;
  }

  function totals() {
    let deb = 0n;
    let cre = 0n;
    let valid = true;

    for (const line of lines) {
      const debit = parseAmountToCents(line.debit);
      const credit = parseAmountToCents(line.credit);
      if (debit === null || credit === null) {
        valid = false;
        continue;
      }
      deb += debit;
      cre += credit;
    }

    return { deb, cre, valid };
  }

  function normalizedLines() {
    return lines.map((l) => ({
      accountId: l.accountId,
      description: l.description || null,
      debit: l.debit !== '' ? l.debit.trim() : undefined,
      credit: l.credit !== '' ? l.credit.trim() : undefined
    }));
  }

  const create = useMutation({
    mutationFn: () =>
      api.create({
        periodId,
        entryDate,
        memo: memo || undefined,
        typeCode,
        lines: normalizedLines()
      }),
    onSuccess: (data) => {
      toast.success('Journal draft created.');
      navigate(ROUTES.accountingJournalDetail(data?.id ?? ''));
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Create failed')
  });

  const periodOptions = [{ value: '', label: 'Select period…' }].concat(
    (periodsQ.data ?? []).map((p) => ({ value: p.id, label: p.code }))
  );
  const accountOptions = [{ value: '', label: 'Select account…' }].concat(
    (accountsQ.data ?? []).map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))
  );

  const { deb, cre, valid } = totals();
  const balanced = valid && deb === cre && deb > 0n && cre > 0n;

  return (
    <div className="space-y-4">
      <PageHeader title="New Journal" subtitle="Create a balanced journal draft (min 2 lines)." />

      <ContentCard title="Header">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Select label="Period" value={periodId} onChange={(e) => setPeriodId(e.target.value)} options={periodOptions} />
          <Input label="Entry date" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          <Select
            label="Type"
            value={typeCode}
            onChange={(e) => setTypeCode(e.target.value)}
            options={[
              { value: 'GENERAL', label: 'General' },
              { value: 'ADJUSTMENT', label: 'Adjustment' },
              { value: 'CLOSING', label: 'Closing' }
            ]}
          />
          <Input label="Memo (optional)" value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>
      </ContentCard>

      <ContentCard
        title="Lines"
        actions={
          <Button variant="secondary" onClick={addLine}>
            Add line
          </Button>
        }
      >
        <Table>
          <THead>
            <tr>
              <TH>Account</TH>
              <TH>Description</TH>
              <TH className="text-right">Debit</TH>
              <TH className="text-right">Credit</TH>
              <TH className="text-right">...</TH>
            </tr>
          </THead>
          <TBody>
            {lines.map((l, idx) => (
              <tr key={idx}>
                <TD>
                  <AccountSelect value={l.accountId} onChange={(e) => setLine(idx, { accountId: e.target.value })} allowEmpty />
                </TD>
                <TD>
                  <Input value={l.description} onChange={(e) => setLine(idx, { description: e.target.value })} placeholder="Optional" />
                </TD>
                <TD className="text-right">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={l.debit}
                    onChange={(e) => setLine(idx, { debit: e.target.value, credit: e.target.value ? '' : l.credit })}
                    placeholder="0.00"
                  />
                </TD>
                <TD className="text-right">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={l.credit}
                    onChange={(e) => setLine(idx, { credit: e.target.value, debit: e.target.value ? '' : l.debit })}
                    placeholder="0.00"
                  />
                </TD>
                <TD className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => removeLine(idx)} disabled={lines.length <= 2}>
                    Remove
                  </Button>
                </TD>
              </tr>
            ))}
          </TBody>
        </Table>

        <div className="mt-3 flex items-center justify-between text-sm">
          <div className={balanced ? 'text-emerald-700' : 'text-amber-700'}>
            Totals — Debit: {formatCents(deb)} | Credit: {formatCents(cre)} {balanced ? '(Balanced)' : valid ? '(Not balanced)' : '(Invalid amount)'}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(ROUTES.accountingJournals)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isLoading || !periodId || !entryDate || lines.length < 2 || !balanced}>
              Create draft
            </Button>
          </div>
        </div>
      </ContentCard>
    </div>
  );
}