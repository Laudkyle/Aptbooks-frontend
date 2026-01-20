import React, { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeCoaApi } from '../api/coa.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { ROUTES } from '../../../../app/constants/routes.js';

const TYPE_OPTIONS = [
  { value: 'ASSET', label: 'Asset' },
  { value: 'LIABILITY', label: 'Liability' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'REVENUE', label: 'Revenue' },
  { value: 'EXPENSE', label: 'Expense' }
];

export default function AccountCreate() {
  const { http } = useApi();
  const api = useMemo(() => makeCoaApi(http), [http]);
  const toast = useToast();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountTypeCode, setAccountTypeCode] = useState('ASSET');
  const [categoryName, setCategoryName] = useState('');
  const [parentAccountId, setParentAccountId] = useState('');
  const [isPostable, setIsPostable] = useState(true);
  const [status, setStatus] = useState('active');

  const create = useMutation({
    mutationFn: () =>
      api.create({
        code,
        name,
        accountTypeCode,
        categoryName: categoryName || undefined,
        parentAccountId: parentAccountId || undefined,
        isPostable,
        status
      }),
    onSuccess: (data) => {
      toast.success('Account created.');
      window.location.href = ROUTES.accountingCoaDetail(data?.id ?? '');
    },
    onError: (e) => toast.error(e.message ?? 'Create failed')
  });

  return (
    <div className="space-y-4">
      <PageHeader title="New Account" subtitle="Create a chart of accounts entry." />

      <ContentCard title="Account details">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} />
          <Select label="Account type" value={accountTypeCode} onChange={(e) => setAccountTypeCode(e.target.value)} options={TYPE_OPTIONS} />
          <Input className="md:col-span-2" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Category (optional)" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
          <Input label="Parent account ID (optional)" value={parentAccountId} onChange={(e) => setParentAccountId(e.target.value)} />
          <Select
            label="Postable"
            value={String(isPostable)}
            onChange={(e) => setIsPostable(e.target.value === 'true')}
            options={[
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' }
            ]}
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => (window.location.href = ROUTES.accountingCoa)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isLoading || !code || !name}>
            Create
          </Button>
        </div>
      </ContentCard>
    </div>
  );
}
