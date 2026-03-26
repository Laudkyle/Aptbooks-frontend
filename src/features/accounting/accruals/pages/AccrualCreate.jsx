import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeAccrualsApi } from '../api/accruals.api.js';
import { makeCoaApi } from '../../chartOfAccounts/api/coa.api.js';
import { makePeriodsApi } from '../../periods/api/periods.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { AccountSelect } from '../../../../shared/components/forms/AccountSelect.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { ROUTES } from '../../../../app/constants/routes.js';


export default function AccrualCreate() {
  const { http } = useApi();
  const api = useMemo(() => makeAccrualsApi(http), [http]);
  const coaApi = useMemo(() => makeCoaApi(http), [http]);
  const periodsApi = useMemo(() => makePeriodsApi(http), [http]);
  const toast = useToast();
  const navigate = useNavigate();

  const accountsQ = useQuery({ queryKey: ['coa', 'active'], queryFn: () => coaApi.list({ includeArchived: 'false' }), staleTime: 10_000 });
  const periodsQ = useQuery({ queryKey: ['periods'], queryFn: periodsApi.list, staleTime: 10_000 });

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [ruleType, setRuleType] = useState('RECURRING');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [status, setStatus] = useState('active');
  const [autoReverse, setAutoReverse] = useState(false);
  const [reverseTiming, setReverseTiming] = useState('NEXT_PERIOD_START');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  const [lines, setLines] = useState([
    { accountId: '', dc: 'debit', amountValue: '', description: '' },
    { accountId: '', dc: 'credit', amountValue: '', description: '' }
  ]);

  // Deferral-specific fields (match backend expectations)
  const [defTotalAmount, setDefTotalAmount] = useState('');
  const [defPeriodCount, setDefPeriodCount] = useState('');
  const [defStartPeriodId, setDefStartPeriodId] = useState('');

  function setLine(i, patch) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => prev.concat({ accountId: '', dc: 'debit', amountValue: '', description: '' }));
  }
  function removeLine(i) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  const accountOptions = [{ value: '', label: 'Select account…' }].concat(
    (accountsQ.data ?? []).map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))
  );
  
  const periodOptions = [{ value: '', label: 'Select start period…' }].concat(
    (periodsQ.data ?? []).map((p) => ({ value: p.id, label: p.code }))
  );

  const create = useMutation({
    mutationFn: () => {
      const payload = {
        code,
        name,
        ruleType,
        frequency,
        autoReverse: ruleType === 'REVERSING' ? true : autoReverse,
        status,
        isRequired,
        lines: lines.map((l) => ({
          accountId: l.accountId,
          dc: l.dc,
          amountValue: Number(l.amountValue),
          description: l.description || undefined
        }))
      };

      // Add reverseTiming for REVERSING rules
      if (ruleType === 'REVERSING') {
        payload.reverseTiming = reverseTiming;
      }

      // Add startDate and endDate if provided
      if (startDate) {
        payload.startDate = startDate;
      }
      if (endDate) {
        payload.endDate = endDate;
      }

      // Add deferral schedule for DEFERRAL rules
      if (ruleType === 'DEFERRAL') {
        payload.deferralSchedule = {
          totalAmount: Number(defTotalAmount),
          periodCount: Number(defPeriodCount),
          startPeriodId: defStartPeriodId
        };
      }

      return api.createRule(payload);
    },
    onSuccess: () => {
      toast.success('Accrual rule created.');
      navigate(ROUTES.accountingAccruals);
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Create failed')
  });

  return (
    <div className="space-y-4">
      <PageHeader title="New Accrual Rule" subtitle="Create an accrual rule. Backend enforces balance rules." />

      <ContentCard title="Header">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} />
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select
            label="Rule type"
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value)}
            options={[
              { value: 'REVERSING', label: 'REVERSING' },
              { value: 'RECURRING', label: 'RECURRING' },
              { value: 'DEFERRAL', label: 'DEFERRAL' },
              { value: 'DERIVED', label: 'DERIVED' }
            ]}
          />
          <Select
            label="Frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            options={[
              { value: 'DAILY', label: 'DAILY' },
              { value: 'WEEKLY', label: 'WEEKLY' },
              { value: 'MONTHLY', label: 'MONTHLY' },
              { value: 'PERIOD_END', label: 'PERIOD_END' },
              { value: 'ON_DEMAND', label: 'ON_DEMAND' }
            ]}
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: 'active', label: 'active' },
              { value: 'inactive', label: 'inactive' }
            ]}
          />
          {ruleType === 'REVERSING' && (
            <>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoReverse"
                  checked={true}
                  readOnly
                  disabled
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="autoReverse" className="text-sm text-gray-600">
                  Auto Reverse (required for REVERSING rules)
                </label>
              </div>
              <Select
                label="Reverse Timing"
                value={reverseTiming}
                onChange={(e) => setReverseTiming(e.target.value)}
                options={[
                  { value: 'NEXT_PERIOD_START', label: 'NEXT_PERIOD_START' }
                ]}
              />
            </>
          )}
          {ruleType !== 'REVERSING' && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoReverse"
                checked={autoReverse}
                onChange={(e) => setAutoReverse(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="autoReverse" className="text-sm text-gray-600">
                Auto Reverse
              </label>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isRequired"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="isRequired" className="text-sm text-gray-600">
              Required
            </label>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Date Range (Optional)">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input 
            label="Start Date" 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
          />
          <Input 
            label="End Date" 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
          />
        </div>
      </ContentCard>

      {ruleType === 'DEFERRAL' && (
        <ContentCard title="Deferral Schedule">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input 
              label="Total Amount" 
              type="number" 
              value={defTotalAmount} 
              onChange={(e) => setDefTotalAmount(e.target.value)} 
              required
            />
            <Input 
              label="Period Count" 
              type="number" 
              value={defPeriodCount} 
              onChange={(e) => setDefPeriodCount(e.target.value)} 
              required
            />
            <Select 
              label="Start Period" 
              value={defStartPeriodId} 
              onChange={(e) => setDefStartPeriodId(e.target.value)} 
              options={periodOptions}
              required
            />
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Deferral will be recognized equally over {defPeriodCount || 'N'} periods starting from the selected period.
          </div>
        </ContentCard>
      )}

      <ContentCard title="Lines" actions={<Button variant="secondary" onClick={addLine}>Add line</Button>}>
        <Table>
          <THead>
            <tr>
              <TH>Account</TH>
              <TH>DC</TH>
              <TH className="text-right">Amount</TH>
              <TH>Description</TH>
              <TH className="text-right">...</TH>
            </tr>
          </THead>
          <TBody>
            {lines.map((l, idx) => (
              <tr key={idx}>
                <TD>
                  <AccountSelect 
                    value={l.accountId} 
                    onChange={(e) => setLine(idx, { accountId: e.target.value })} 
                    allowEmpty 
                  />
                </TD>
                <TD>
                  <Select
                    value={l.dc}
                    onChange={(e) => setLine(idx, { dc: e.target.value })}
                    options={[
                      { value: 'debit', label: 'debit' },
                      { value: 'credit', label: 'credit' }
                    ]}
                  />
                </TD>
                <TD className="text-right">
                  <Input 
                    type="number" 
                    value={l.amountValue} 
                    onChange={(e) => setLine(idx, { amountValue: e.target.value })} 
                  />
                </TD>
                <TD>
                  <Input 
                    value={l.description} 
                    onChange={(e) => setLine(idx, { description: e.target.value })} 
                  />
                </TD>
                <TD className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeLine(idx)} 
                    disabled={lines.length <= 2}
                  >
                    Remove
                  </Button>
                </TD>
              </tr>
            ))}
          </TBody>
        </Table>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(ROUTES.accountingAccruals)}>
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate()}
            disabled={
              create.isLoading ||
              !code ||
              !name ||
              lines.length < 2 ||
              lines.some((l) => !l.accountId || !l.amountValue) ||
              (ruleType === 'DEFERRAL' && (!defTotalAmount || !defPeriodCount || !defStartPeriodId))
            }
          >
            Create rule
          </Button>
        </div>
      </ContentCard>
    </div>
  );
}