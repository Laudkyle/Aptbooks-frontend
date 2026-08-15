import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ROUTES } from '../../../../app/constants/routes.js';
import { JournalDraftForm } from '../components/JournalDraftForm.jsx';

export default function JournalCreate() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <PageHeader title="New Journal" subtitle="Start a journal now, save it incomplete, and finish it later before submission." />
      <JournalDraftForm
        onCancel={() => navigate(ROUTES.accountingJournals)}
        onCreated={(data) => navigate(ROUTES.accountingJournalDetail(data?.journalId ?? ''))}
      />
    </div>
  );
}
