import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeInventoryApi } from '../api/inventory.api.js';

import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx';
import { Button } from '../../../shared/components/ui/Button.jsx';
import { Input } from '../../../shared/components/ui/Input.jsx';

export default function UnitCreate() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { http } = useApi();
  const invApi = useMemo(() => makeInventoryApi(http), [http]);

  const [form, setForm] = useState({ code: '', name: '' });
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await invApi.createUnit(form);
      await qc.invalidateQueries({ queryKey: ['inventory.units'] });
      nav(-1);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="New Unit"
        subtitle="Create an inventory unit of measure."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => nav(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={onSubmit} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              Create
            </Button>
          </div>
        }
      />

      <ContentCard>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Input label="Code" value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} required />
          <Input label="Name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => nav(-1)}>Cancel</Button>
            <Button type="submit" disabled={saving}>Create unit</Button>
          </div>
        </form>
      </ContentCard>
    </>
  );
}
