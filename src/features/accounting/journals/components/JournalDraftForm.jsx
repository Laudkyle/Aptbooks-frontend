import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeJournalsApi } from '../api/journals.api.js';
import { makePeriodsApi } from '../../periods/api/periods.api.js';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { AccountSelect } from '../../../../shared/components/forms/AccountSelect.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { parseAmountToCents, centsToDecimal } from '../journal.logic.mjs';

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function blankLine(accountId = '') {
  return { accountId, description: '', debit: '', credit: '' };
}

export function JournalDraftForm({ initialAccountId = '', journalId = null, initialJournal = null, initialLines = null, onCreated, onSaved, onCancel, embedded = false }) {
  const { http } = useApi();
  const api = useMemo(() => makeJournalsApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  const toast = useToast();

  const periodsQ = useQuery({ queryKey: ['periods'], queryFn: periodsApi.list, staleTime: 10_000 });
  const [periodId, setPeriodId] = useState(() => initialJournal?.period_id || '');
  const [entryDate, setEntryDate] = useState(() => initialJournal?.entry_date ? String(initialJournal.entry_date).slice(0, 10) : todayIso());
  const [memo, setMemo] = useState(() => initialJournal?.memo || '');
  const [typeCode, setTypeCode] = useState(() => initialJournal?.type_code || 'GENERAL');
  const [lines, setLines] = useState(() => {
    if (Array.isArray(initialLines) && initialLines.length) {
      return initialLines.map((line) => ({
        accountId: line.account_id || '',
        description: line.description || '',
        debit: parseAmountToCents(line.debit) > 0n ? String(line.debit) : '',
        credit: parseAmountToCents(line.credit) > 0n ? String(line.credit) : ''
      }));
    }
    return [blankLine(initialAccountId), blankLine()];
  });

  function setLine(i, patch) {
    setLines((prev) => prev.map((line, idx) => (idx === i ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => prev.concat(blankLine()));
  }

  function removeLine(i) {
    setLines((prev) => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i));
  }

  const totals = useMemo(() => {
    let debit = 0n;
    let credit = 0n;
    let valid = true;
    for (const line of lines) {
      const d = parseAmountToCents(line.debit);
      const c = parseAmountToCents(line.credit);
      if (d === null || c === null || (d > 0n && c > 0n)) {
        valid = false;
        continue;
      }
      debit += d;
      credit += c;
    }
    return { debit, credit, valid, balanced: valid && debit === credit && debit > 0n };
  }, [lines]);

  function normalizedLines() {
    return lines.map((line) => ({
      accountId: line.accountId || null,
      description: line.description.trim(),
      debit: line.debit.trim() || undefined,
      credit: line.credit.trim() || undefined
    }));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!journalId) {
        return api.create({ periodId, entryDate, memo: memo.trim(), typeCode, lines: normalizedLines() });
      }
      await api.updateHeader(journalId, { periodId, entryDate, memo: memo.trim(), typeCode });
      await api.replaceLines(journalId, normalizedLines());
      return { journalId, status: 'draft' };
    },
    onSuccess: (data) => {
      toast.success(journalId ? 'Draft changes saved.' : totals.balanced ? 'Journal draft created.' : 'Incomplete journal saved as a draft.');
      if (journalId) onSaved?.(data);
      else onCreated?.(data);
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Could not save draft')
  });

  const periodOptions = [{ value: '', label: 'Select period…' }].concat(
    (periodsQ.data ?? []).map((period) => ({ value: period.id, label: period.code }))
  );

  const body = (
    <div className="space-y-4">
      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <span className="font-semibold">Drafts can be incomplete.</span> You can save now and continue later. Accounts, descriptions, amounts and balancing are enforced only when the journal is submitted.
      </div>

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
          <Input label="Memo (can be completed later)" value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>
      </ContentCard>

      <ContentCard title="Lines" actions={<Button variant="secondary" onClick={addLine}>Add line</Button>}>
        <div className="overflow-x-auto">
          <Table>
            <THead><tr><TH>Account</TH><TH>Description</TH><TH className="text-right">Debit</TH><TH className="text-right">Credit</TH><TH className="text-right">...</TH></tr></THead>
            <TBody>
              {lines.map((line, idx) => (
                <tr key={idx}>
                  <TD><AccountSelect value={line.accountId} onChange={(e) => setLine(idx, { accountId: e.target.value })} allowEmpty /></TD>
                  <TD><Input value={line.description} onChange={(e) => setLine(idx, { description: e.target.value })} placeholder="Optional while drafting" /></TD>
                  <TD className="text-right"><Input type="text" inputMode="decimal" value={line.debit} onChange={(e) => setLine(idx, { debit: e.target.value, credit: e.target.value ? '' : line.credit })} placeholder="0.00" /></TD>
                  <TD className="text-right"><Input type="text" inputMode="decimal" value={line.credit} onChange={(e) => setLine(idx, { credit: e.target.value, debit: e.target.value ? '' : line.debit })} placeholder="0.00" /></TD>
                  <TD className="text-right"><Button variant="ghost" size="sm" onClick={() => removeLine(idx)} disabled={lines.length <= 1}>Remove</Button></TD>
                </tr>
              ))}
            </TBody>
          </Table>
        </div>

        <div className="mt-3 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className={totals.balanced ? 'text-emerald-700' : totals.valid ? 'text-amber-700' : 'text-rose-700'}>
            Totals — Debit: {centsToDecimal(totals.debit)} | Credit: {centsToDecimal(totals.credit)} {totals.balanced ? '(Balanced)' : totals.valid ? '(Draft not balanced yet)' : '(Fix invalid amount)'}
          </div>
          <div className="flex justify-end gap-2">
            {onCancel ? <Button variant="secondary" onClick={onCancel}>Cancel</Button> : null}
            <Button onClick={() => save.mutate()} loading={save.isPending || save.isLoading} disabled={!periodId || !entryDate || !totals.valid || save.isPending || save.isLoading}>
              {journalId ? 'Save changes' : 'Save draft'}
            </Button>
          </div>
        </div>
      </ContentCard>
    </div>
  );

  return body;
}
