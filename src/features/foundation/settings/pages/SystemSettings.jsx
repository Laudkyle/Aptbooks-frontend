import React, { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../../../shared/hooks/useApi.js";
import { makeSettingsApi } from "../api/settings.api.js";
import { makeNotificationsApi } from "../../../notifications/api/notifications.api.js";
import { makeDocumentsApi } from "../api/documents.api.js";
import { PageHeader } from "../../../../shared/components/layout/PageHeader.jsx";
import { ContentCard } from "../../../../shared/components/layout/ContentCard.jsx";
import { Tabs } from "../../../../shared/components/ui/Tabs.jsx";
import { Input } from "../../../../shared/components/ui/Input.jsx";
import { Button } from "../../../../shared/components/ui/Button.jsx";
import { Select } from "../../../../shared/components/ui/Select.jsx";
import {
  Table,
  THead,
  TBody,
  TH,
  TD,
} from "../../../../shared/components/ui/Table.jsx";
import { useToast } from "../../../../shared/components/ui/Toast.jsx";
import { Modal } from "../../../../shared/components/ui/Modal.jsx";

// ---------------------------------------------------------------------------
// Root page
// ---------------------------------------------------------------------------
export default function SystemSettings() {
  const { http } = useApi();
  const settingsApi = useMemo(() => makeSettingsApi(http), [http]);
  const notifApi = useMemo(() => makeNotificationsApi(http), [http]);
  const documentsApi = useMemo(() => makeDocumentsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [tab, setTab] = useState("general");

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      <PageHeader
        title="Company Settings"
        subtitle="Configure your system preferences and email notifications"
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "general", label: "General Preferences" },
          { value: "email", label: "Email Settings" },
          { value: "approvals", label: "Approvals & Document Types" },
        ]}
      />

      {tab === "general" && (
        <GeneralSettingsTab settingsApi={settingsApi} qc={qc} toast={toast} />
      )}
      {tab === "email" && (
        <EmailSettingsTab notifApi={notifApi} qc={qc} toast={toast} />
      )}
      {tab === "approvals" && (
        <ApprovalsTab documentsApi={documentsApi} qc={qc} toast={toast} />
      )}
    </div>
  );
}

// ===========================================================================
// APPROVALS TAB
// ===========================================================================
function ApprovalsTab({ documentsApi, qc, toast }) {
  const [subTab, setSubTab] = useState('levels');
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState(null);

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {[
          { value: 'levels', label: 'Approval Levels' },
          { value: 'types', label: 'Document Types' },
          { value: 'ladder', label: 'Approval Ladders' }
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => setSubTab(t.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              subTab === t.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      {subTab === 'levels' && (
        <ApprovalLevelsPanel
          documentsApi={documentsApi}
          qc={qc}
          toast={toast}
          showModal={showLevelModal}
          setShowModal={setShowLevelModal}
        />
      )}
      {subTab === 'types' && (
        <DocumentTypesPanel
          documentsApi={documentsApi}
          qc={qc}
          toast={toast}
          showModal={showTypeModal}
          setShowModal={setShowTypeModal}
        />
      )}
      {subTab === 'ladder' && (
        <ApprovalLadderPanel
          documentsApi={documentsApi}
          qc={qc}
          toast={toast}
          editingTypeId={editingTypeId}
          setEditingTypeId={setEditingTypeId}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Approval Levels Panel
// ---------------------------------------------------------------------------
function ApprovalLevelsPanel({ documentsApi, qc, toast, showModal, setShowModal }) {
  const levelsQ = useQuery({
    queryKey: ['approval-levels'],
    queryFn: documentsApi.listApprovalLevels,
    staleTime: 30_000
  });

  const levels = levelsQ.data ?? [];

  return (
    <>
      <ContentCard
        title="Approval Levels"
        subtitle="Define the sequential approval tiers used in your organisation's document workflow"
        actions={<Button onClick={() => setShowModal(true)}>+ Add Level</Button>}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-800">
              <strong className="font-semibold">How approval levels work:</strong> Each level represents a distinct tier (e.g. Team Lead → Finance Manager → CFO).
              Assign levels to document types via the <em>Approval Ladders</em> tab to define the exact sequence required.
            </p>
          </div>

          {levelsQ.isError ? (
            <ErrorBanner message="Failed to load approval levels." onRetry={() => qc.invalidateQueries({ queryKey: ['approval-levels'] })} />
          ) : levelsQ.isLoading ? (
            <LoadingRows cols={4} />
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <THead>
                  <tr>
                    <TH>Sequence</TH>
                    <TH>Code</TH>
                    <TH>Name</TH>
                    <TH>Status</TH>
                  </tr>
                </THead>
                <TBody>
                  {levels.length === 0 ? (
                    <tr>
                      <TD colSpan={4} className="text-center text-slate-500 py-10">
                        No approval levels configured yet. Click <strong>+ Add Level</strong> to get started.
                      </TD>
                    </tr>
                  ) : (
                    [...levels]
                      .sort((a, b) => a.sequence - b.sequence)
                      .map((level) => (
                        <tr key={level.id} className="hover:bg-slate-50">
                          <TD>
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                              {level.sequence}
                            </span>
                          </TD>
                          <TD>
                            <code className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono text-slate-700">
                              {level.code}
                            </code>
                          </TD>
                          <TD className="font-medium text-slate-900">{level.name}</TD>
                          <TD><StatusBadge active={level.is_active} /></TD>
                        </tr>
                      ))
                  )}
                </TBody>
              </Table>
            </div>
          )}
        </div>
      </ContentCard>

      {showModal && (
        <CreateApprovalLevelModal
          onClose={() => setShowModal(false)}
          documentsApi={documentsApi}
          qc={qc}
          toast={toast}
          existingLevels={levels}
        />
      )}
    </>
  );
}

function CreateApprovalLevelModal({
  onClose,
  documentsApi,
  qc,
  toast,
  existingLevels,
}) {
  const nextSeq = Math.max(0, ...existingLevels.map((l) => l.sequence)) + 1;
  const [form, setForm] = useState({
    code: "",
    name: "",
    sequence: nextSeq,
    is_active: true,
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.code.trim()) e.code = "Code is required";
    else if (!/^[A-Z0-9_]+$/.test(form.code.trim()))
      e.code = "Uppercase letters, numbers and underscores only";
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.sequence || Number(form.sequence) < 1)
      e.sequence = "Sequence must be a positive number";
    else if (existingLevels.some((l) => l.sequence === Number(form.sequence)))
      e.sequence = "This sequence number is already taken";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = useMutation({
    mutationFn: () => {
      if (!validate()) throw new Error("validation");
      return documentsApi.createApprovalLevel({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        sequence: Number(form.sequence),
        is_active: form.is_active,
      });
    },
    onSuccess: () => {
      toast.success("Approval level created");
      qc.invalidateQueries({ queryKey: ["approval-levels"] });
      onClose();
    },
    onError: (e) => {
      if (e.message !== "validation") {
        if (e?.response?.status === 409)
          toast.error("A level with this code or sequence already exists");
        else toast.error(e.message || "Failed to create approval level");
      }
    },
  });

  const set = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <Modal open onClose={onClose} title="Add Approval Level">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Code"
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="TEAM_LEAD"
              error={errors.code}
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Unique identifier. Uppercase, no spaces.
            </p>
          </div>
          <div>
            <Input
              label="Sequence"
              type="number"
              min={1}
              value={form.sequence}
              onChange={(e) => set("sequence", e.target.value)}
              error={errors.sequence}
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Lower numbers are approved first.
            </p>
          </div>
        </div>

        <Input
          label="Display Name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Team Lead"
          error={errors.name}
          required
        />

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-brand-600"
          />
          <span className="text-sm font-medium text-slate-700">Active</span>
          <span className="text-xs text-slate-500">
            (inactive levels are excluded from new document ladders)
          </span>
        </label>

        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isLoading}>
            {save.isLoading ? "Saving..." : "Create Level"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Document Types Panel
// ---------------------------------------------------------------------------
function DocumentTypesPanel({ documentsApi, qc, toast, showModal, setShowModal }) {
  const typesQ = useQuery({
    queryKey: ['document-types'],
    queryFn: documentsApi.listDocumentTypes,
    staleTime: 30_000
  });

  const types = typesQ.data ?? [];

  return (
    <>
      <ContentCard
        title="Document Types"
        subtitle="Categorise documents that flow through your approval workflow"
        actions={<Button onClick={() => setShowModal(true)}>+ Add Type</Button>}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-blue-800">
              <strong className="font-semibold">Document types</strong> categorise the documents uploaded to the system
              (e.g. Purchase Orders, Contracts, Expense Claims). Each type can be assigned a specific approval ladder
              in the <em>Approval Ladders</em> tab.
            </p>
          </div>

          {typesQ.isError ? (
            <ErrorBanner message="Failed to load document types." onRetry={() => qc.invalidateQueries({ queryKey: ['document-types'] })} />
          ) : typesQ.isLoading ? (
            <LoadingRows cols={4} />
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <THead>
                  <tr>
                    <TH>Code</TH>
                    <TH>Name</TH>
                    <TH>Description</TH>
                    <TH>Status</TH>
                  </tr>
                </THead>
                <TBody>
                  {types.length === 0 ? (
                    <tr>
                      <TD colSpan={4} className="text-center text-slate-500 py-10">
                        No document types configured yet. Click <strong>+ Add Type</strong> to get started.
                      </TD>
                    </tr>
                  ) : (
                    types.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <TD>
                          <code className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono text-slate-700">
                            {t.code}
                          </code>
                        </TD>
                        <TD className="font-medium text-slate-900">{t.name}</TD>
                        <TD className="text-slate-500 text-sm">{t.description || '—'}</TD>
                        <TD><StatusBadge active={t.is_active} /></TD>
                      </tr>
                    ))
                  )}
                </TBody>
              </Table>
            </div>
          )}
        </div>
      </ContentCard>

      {showModal && (
        <CreateDocumentTypeModal
          onClose={() => setShowModal(false)}
          documentsApi={documentsApi}
          qc={qc}
          toast={toast}
        />
      )}
    </>
  );
}

function CreateDocumentTypeModal({ onClose, documentsApi, qc, toast }) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    is_active: true,
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.code.trim()) e.code = "Code is required";
    else if (!/^[A-Z0-9_]+$/.test(form.code.trim()))
      e.code = "Uppercase letters, numbers and underscores only";
    if (!form.name.trim()) e.name = "Name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = useMutation({
    mutationFn: () => {
      if (!validate()) throw new Error("validation");
      return documentsApi.createDocumentType({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_active: form.is_active,
      });
    },
    onSuccess: () => {
      toast.success("Document type created");
      qc.invalidateQueries({ queryKey: ["document-types"] });
      onClose();
    },
    onError: (e) => {
      if (e.message !== "validation") {
        if (e?.response?.status === 409)
          toast.error("A document type with this code already exists");
        else toast.error(e.message || "Failed to create document type");
      }
    },
  });

  const set = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <Modal open onClose={onClose} title="Add Document Type">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Code"
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="PURCHASE_ORDER"
              error={errors.code}
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Unique identifier used by the system.
            </p>
          </div>
          <div>
            <Input
              label="Display Name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Purchase Order"
              error={errors.name}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Describe when this document type is used..."
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-brand-600"
          />
          <span className="text-sm font-medium text-slate-700">Active</span>
        </label>

        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isLoading}>
            {save.isLoading ? "Saving..." : "Create Type"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Approval Ladder Panel
// ---------------------------------------------------------------------------
function ApprovalLadderPanel({ documentsApi, qc, toast, editingTypeId, setEditingTypeId }) {
  const typesQ = useQuery({
    queryKey: ["document-types"],
    queryFn: documentsApi.listDocumentTypes,
    staleTime: 30_000,
  });

  const levelsQ = useQuery({
    queryKey: ["approval-levels"],
    queryFn: documentsApi.listApprovalLevels,
    staleTime: 30_000,
  });

  const types = typesQ.data ?? [];
  const activeLevels = (levelsQ.data ?? [])
    .filter((l) => l.is_active)
    .sort((a, b) => a.sequence - b.sequence);
  const isLoading = typesQ.isLoading || levelsQ.isLoading;
  const isError = typesQ.isError || levelsQ.isError;
  const editingType = types.find((t) => t.id === editingTypeId) || null;

  return (
    <>
      <ContentCard
        title="Approval Ladders"
        subtitle="Assign an ordered chain of approval levels to each document type"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <svg
              className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm text-amber-800">
              <strong className="font-semibold">
                Changing a ladder is non-destructive for in-flight documents.
              </strong>{" "}
              Updates only affect newly submitted documents. Documents already
              in the workflow continue using the ladder active at submission
              time.
            </p>
          </div>

          {isError && (
            <ErrorBanner
              message="Failed to load data."
              onRetry={() => {
                qc.invalidateQueries({ queryKey: ["document-types"] });
                qc.invalidateQueries({ queryKey: ["approval-levels"] });
              }}
            />
          )}

          {!isError && isLoading ? (
            <LoadingRows cols={3} />
          ) : types.length === 0 ? (
            <EmptyState message="No document types found. Create document types first, then come back here to assign their approval ladders." />
          ) : activeLevels.length === 0 ? (
            <EmptyState message="No active approval levels found. Create and activate approval levels first." />
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <THead>
                  <tr>
                    <TH>Document Type</TH>
                    <TH>Approval Chain</TH>
                    <TH className="text-right">Actions</TH>
                  </tr>
                </THead>
                <TBody>
                  {types.map((docType) => (
                    <tr key={docType.id} className="hover:bg-slate-50">
                      <TD>
                        <div className="font-medium text-slate-900">
                          {docType.name}
                        </div>
                        <code className="text-xs font-mono text-slate-500">
                          {docType.code}
                        </code>
                      </TD>
                      <TD>
                        <span className="text-sm text-slate-400 italic">
                          Click Configure to view or update the approval chain
                        </span>
                      </TD>
                      <TD className="text-right">
                        <Button onClick={() => setEditingTypeId(docType.id)}>Configure</Button>
                      </TD>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </div>
      </ContentCard>
      
      {editingType && (
        <EditLadderModal
          docType={editingType}
          allLevels={activeLevels}
          onClose={() => setEditingTypeId(null)}
          documentsApi={documentsApi}
          qc={qc}
          toast={toast}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Edit Ladder Modal
// ---------------------------------------------------------------------------
function EditLadderModal({ docType, allLevels, onClose, documentsApi, qc, toast }) {
  const [selectedIds, setSelectedIds] = useState([]);

  // Fetch the existing ladder for this document type on mount
  const ladderQ = useQuery({
    queryKey: ['document-type-ladder', docType.id],
    queryFn:  () => documentsApi.getDocumentTypeLadder(docType.id),
    staleTime: 0 // always fresh when modal opens
  });

  // Once loaded, seed selectedIds in the correct saved order
  useEffect(() => {
    if (ladderQ.data && ladderQ.data.length > 0) {
      // Backend returns levels ordered by sequence ASC — preserve that order
      setSelectedIds(ladderQ.data.map((l) => l.id));
    }
  }, [ladderQ.data]);

  const toggleLevel = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    setSelectedIds((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (idx) => {
    setSelectedIds((prev) => {
      if (idx === prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const save = useMutation({
    mutationFn: () =>
      documentsApi.setDocumentTypeApprovalLevels(docType.id, selectedIds),
    onSuccess: () => {
      toast.success(`Approval ladder updated for "${docType.name}"`);
      qc.invalidateQueries({ queryKey: ['document-types'] });
      qc.invalidateQueries({ queryKey: ['document-type-ladder', docType.id] });
      onClose();
    },
    onError: (e) => toast.error(e.message || 'Failed to update ladder')
  });

  const selectedLevels   = selectedIds.map((id) => allLevels.find((l) => l.id === id)).filter(Boolean);
  const unselectedLevels = allLevels.filter((l) => !selectedIds.includes(l.id));

  return (
    <Modal open onClose={onClose} title={`Configure Approval Ladder — ${docType.name}`}>
      <div className="space-y-5">
        <p className="text-sm text-slate-600">
          Select the approval levels required for this document type and arrange
          them in the order approvals must occur.
        </p>

        {/* Loading state */}
        {ladderQ.isLoading && (
          <div className="flex items-center gap-3 py-4 text-sm text-slate-500">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-brand-500 rounded-full animate-spin flex-shrink-0" />
            Loading current ladder...
          </div>
        )}

        {/* Error state — still allow editing, just warn */}
        {ladderQ.isError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            Could not load the existing ladder. You can still configure it — saving will replace whatever is currently set.
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {/* Available */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Available Levels
            </p>
            <div className="border border-slate-200 rounded-lg overflow-hidden min-h-[120px]">
              {unselectedLevels.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-400">All levels assigned</div>
              ) : (
                unselectedLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => toggleLevel(level.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-brand-50 border-b border-slate-100 last:border-b-0 group transition-colors"
                  >
                    <div>
                      <span className="text-sm font-medium text-slate-900">{level.name}</span>
                      <span className="ml-2 text-xs text-slate-400">seq {level.sequence}</span>
                    </div>
                    <svg
                      className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Selected & ordered */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Approval Chain{' '}
              <span className="text-slate-400 font-normal normal-case">(in order)</span>
            </p>
            <div className="border border-slate-200 rounded-lg overflow-hidden min-h-[120px]">
              {ladderQ.isLoading ? (
                <div className="p-4 text-center text-sm text-slate-400">Loading...</div>
              ) : selectedLevels.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-400">
                  ← Select levels to build the chain
                </div>
              ) : (
                selectedLevels.map((level, idx) => (
                  <div
                    key={level.id}
                    className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-sm font-medium text-slate-900">{level.name}</span>
                        <span className="ml-2 text-xs text-slate-400">seq {level.sequence}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveDown(idx)}
                        disabled={idx === selectedLevels.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => toggleLevel(level.id)}
                        className="p-1 text-slate-400 hover:text-red-500 ml-1"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Workflow preview */}
        {selectedLevels.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Workflow Preview
            </p>
            <div className="flex items-center flex-wrap gap-2">
              <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Submitted
              </span>
              {selectedLevels.map((level) => (
                <React.Fragment key={level.id}>
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {level.name}
                  </span>
                </React.Fragment>
              ))}
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                Approved
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t">
          <p className="text-xs text-slate-500">
            {selectedLevels.length === 0
              ? 'No levels selected — documents of this type will skip the approval workflow.'
              : `${selectedLevels.length} level${selectedLevels.length > 1 ? 's' : ''} in chain`}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => save.mutate()}
              disabled={save.isLoading || ladderQ.isLoading}
            >
              {save.isLoading ? 'Saving...' : 'Save Ladder'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
// ===========================================================================
// GENERAL SETTINGS TAB (unchanged)
// ===========================================================================
function GeneralSettingsTab({ settingsApi, qc, toast }) {
  const [editModal, setEditModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const listQ = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.list({ limit: 500 }),
    staleTime: 30_000,
  });

  const settings = listQ.data?.data ?? [];
  const inventorySetting = settings.find(
    (s) => s.key === "inventoryCostMethod",
  );
  const currentMethod =
    inventorySetting?.value_json?.method || "WEIGHTED_AVERAGE";
  const filteredSettings = settings.filter((s) =>
    s.key.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <>
      <div className="grid gap-6">
        <ContentCard
          title="Inventory & Costing"
          subtitle="Configure how inventory costs are calculated"
        >
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Cost Method
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-900">
                    {currentMethod === "WEIGHTED_AVERAGE"
                      ? "Weighted Average"
                      : "First In, First Out (FIFO)"}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setEditModal({
                        type: "inventory",
                        key: "inventoryCostMethod",
                        currentValue: currentMethod,
                      })
                    }
                  >
                    Change
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  This determines how inventory costs are calculated across all
                  products
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                  About Cost Methods
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>
                    <strong>Weighted Average:</strong> Averages the cost of all
                    units in inventory
                  </li>
                  <li>
                    <strong>FIFO:</strong> Assumes oldest inventory is sold
                    first
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </ContentCard>

        <ContentCard
          title="Advanced Settings"
          subtitle="View and manage system configuration"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Input
                placeholder="Search settings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Button
                variant="secondary"
                onClick={() => qc.invalidateQueries({ queryKey: ["settings"] })}
                disabled={listQ.isLoading}
              >
                {listQ.isLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
            {listQ.isError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                Failed to load settings. Please try again.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <Table>
                  <THead>
                    <tr>
                      <TH>Setting Name</TH>
                      <TH>Current Value</TH>
                      <TH className="text-right">Actions</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {filteredSettings.map((s) => (
                      <tr key={s.key} className="hover:bg-slate-50">
                        <TD className="font-medium text-slate-900">
                          {formatSettingName(s.key)}
                        </TD>
                        <TD className="text-slate-600 text-sm">
                          {formatSettingValue(s)}
                        </TD>
                        <TD className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setEditModal({
                                type: "custom",
                                key: s.key,
                                currentValue: s.value_json,
                              })
                            }
                          >
                            Edit
                          </Button>
                        </TD>
                      </tr>
                    ))}
                    {filteredSettings.length === 0 && (
                      <tr>
                        <TD
                          colSpan={3}
                          className="text-center text-slate-500 py-8"
                        >
                          {searchTerm
                            ? "No settings match your search"
                            : "No settings configured"}
                        </TD>
                      </tr>
                    )}
                  </TBody>
                </Table>
              </div>
            )}
          </div>
        </ContentCard>
      </div>

      {editModal && (
        <EditSettingModal
          modal={editModal}
          onClose={() => setEditModal(null)}
          settingsApi={settingsApi}
          qc={qc}
          toast={toast}
        />
      )}
    </>
  );
}

function EditSettingModal({ modal, onClose, settingsApi, qc, toast }) {
  const [value, setValue] = useState(modal.currentValue);
  const [errors, setErrors] = useState({});

  const save = useMutation({
    mutationFn: async () => {
      if (modal.type === "inventory")
        return settingsApi.put("inventoryCostMethod", { method: value });
      return settingsApi.put(modal.key, value);
    },
    onSuccess: () => {
      toast.success("Setting updated successfully");
      qc.invalidateQueries({ queryKey: ["settings"] });
      onClose();
    },
    onError: (e) => toast.error(e.message || "Failed to save setting"),
  });

  const handleSave = () => {
    const validationErrors = {};
    if (modal.type === "inventory" && !value)
      validationErrors.method = "Please select a cost method";
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    save.mutate();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={
        modal.type === "inventory"
          ? "Change Inventory Cost Method"
          : `Edit ${formatSettingName(modal.key)}`
      }
    >
      <div className="space-y-6">
        {modal.type === "inventory" ? (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
              <svg
                className="w-5 h-5 text-amber-600 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-amber-900 mb-1">
                  Important
                </h4>
                <p className="text-sm text-amber-800">
                  Changing the cost method will affect how inventory costs are
                  calculated going forward. This change cannot be undone.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Cost Method
              </label>
              <Select
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setErrors({});
                }}
                error={errors.method}
              >
                <option value="WEIGHTED_AVERAGE">Weighted Average</option>
                <option value="FIFO">First In, First Out (FIFO)</option>
              </Select>
              {errors.method && (
                <p className="mt-1 text-sm text-red-600">{errors.method}</p>
              )}
            </div>
            <div className="space-y-3">
              <div className="border-l-4 border-slate-300 pl-4">
                <h5 className="text-sm font-medium text-slate-900 mb-1">
                  Weighted Average
                </h5>
                <p className="text-sm text-slate-600">
                  Calculates a new average cost each time inventory is
                  purchased.
                </p>
              </div>
              <div className="border-l-4 border-slate-300 pl-4">
                <h5 className="text-sm font-medium text-slate-900 mb-1">
                  FIFO
                </h5>
                <p className="text-sm text-slate-600">
                  Assumes the oldest inventory items are sold first.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-600">
              Advanced setting editing is restricted. Please contact your system
              administrator.
            </p>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={save.isLoading || modal.type === "custom"}
          >
            {save.isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ===========================================================================
// EMAIL SETTINGS TAB (unchanged)
// ===========================================================================
function EmailSettingsTab({ notifApi, qc, toast }) {
  const q = useQuery({
    queryKey: ["smtp"],
    queryFn: notifApi.getSmtp,
    staleTime: 30_000,
  });
  const [form, setForm] = useState({
    host: "",
    port: 587,
    from: "",
    username: "",
    appPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (q.data)
      setForm({
        host: q.data.host || "",
        port: q.data.port || 587,
        from: q.data.from || "",
        username: q.data.username || "",
        appPassword: q.data.appPassword || "",
      });
  }, [q.data]);

  const validateForm = () => {
    const newErrors = {};
    if (!form.host.trim()) newErrors.host = "SMTP host is required";
    if (!form.port || form.port < 1 || form.port > 65535)
      newErrors.port = "Port must be between 1 and 65535";
    if (!form.from.trim()) newErrors.from = "From email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.from))
      newErrors.from = "Please enter a valid email address";
    if (!form.username.trim()) newErrors.username = "Username is required";
    if (!form.appPassword.trim())
      newErrors.appPassword = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const save = useMutation({
    mutationFn: () => {
      if (!validateForm()) throw new Error("Please fix validation errors");
      return notifApi.putSmtp({
        host: form.host.trim(),
        port: Number(form.port),
        from: form.from.trim(),
        username: form.username.trim(),
        appPassword: form.appPassword,
      });
    },
    onSuccess: () => {
      toast.success("Email settings saved successfully");
      qc.invalidateQueries({ queryKey: ["smtp"] });
      setHasUnsavedChanges(false);
    },
    onError: (e) => {
      if (e.message !== "Please fix validation errors")
        toast.error(e.message || "Failed to save email settings");
    },
  });

  const test = useMutation({
    mutationFn: (to) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to))
        throw new Error("Please enter a valid email address");
      return notifApi.testSmtp(to);
    },
    onSuccess: () => {
      toast.success("Test email configuration validated");
      setTestEmail("");
    },
    onError: (e) => toast.error(e.message || "Email test failed"),
  });

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (q.isLoading)
    return (
      <ContentCard>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-600">Loading email settings...</p>
          </div>
        </div>
      </ContentCard>
    );

  if (q.isError)
    return (
      <ContentCard>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Failed to Load Settings
          </h3>
          <p className="text-sm text-red-700 mb-4">
            {q.error?.message || "An error occurred"}
          </p>
          <Button
            variant="secondary"
            onClick={() => qc.invalidateQueries({ queryKey: ["smtp"] })}
          >
            Try Again
          </Button>
        </div>
      </ContentCard>
    );

  return (
    <div className="space-y-6">
      <ContentCard
        title="Email Server Configuration"
        subtitle="Configure SMTP settings for sending email notifications"
        actions={
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-sm text-amber-600 font-medium">
                Unsaved changes
              </span>
            )}
            <Button
              variant="secondary"
              onClick={() => qc.invalidateQueries({ queryKey: ["smtp"] })}
              disabled={q.isLoading}
            >
              Refresh
            </Button>
            <Button
              onClick={() => save.mutate()}
              disabled={save.isLoading || !hasUnsavedChanges}
            >
              {save.isLoading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        }
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Input
              label="SMTP Host"
              value={form.host}
              onChange={(e) => handleInputChange("host", e.target.value)}
              placeholder="smtp.gmail.com"
              error={errors.host}
              required
            />
            <p className="mt-1.5 text-xs text-slate-600">
              Your email provider's SMTP server address
            </p>
          </div>
          <div>
            <Input
              label="Port"
              type="number"
              min={1}
              max={65535}
              value={form.port}
              onChange={(e) => handleInputChange("port", e.target.value)}
              error={errors.port}
              required
            />
            <p className="mt-1.5 text-xs text-slate-600">
              Common ports: 587 (TLS), 465 (SSL), 25 (Unsecured)
            </p>
          </div>
          <div>
            <Input
              label="From Email Address"
              type="email"
              value={form.from}
              onChange={(e) => handleInputChange("from", e.target.value)}
              placeholder="notifications@yourcompany.com"
              error={errors.from}
              required
            />
            <p className="mt-1.5 text-xs text-slate-600">
              Email address that will appear as the sender
            </p>
          </div>
          <div>
            <Input
              label="Username"
              value={form.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
              placeholder="your.email@gmail.com"
              error={errors.username}
              required
            />
            <p className="mt-1.5 text-xs text-slate-600">
              Your email account username or email address
            </p>
          </div>
          <div className="md:col-span-2 relative">
            <Input
              label="App Password"
              type={showPassword ? "text" : "password"}
              value={form.appPassword}
              onChange={(e) => handleInputChange("appPassword", e.target.value)}
              placeholder="Enter app-specific password"
              error={errors.appPassword}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
            <p className="mt-1.5 text-xs text-slate-600">
              Use an app-specific password for better security.{" "}
              <a
                href="https://support.google.com/accounts/answer/185833"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-700 underline"
              >
                Learn how
              </a>
            </p>
          </div>
        </div>
      </ContentCard>

      <ContentCard
        title="Test Email Configuration"
        subtitle="Send a test email to verify your settings"
      >
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-md">
              <Input
                label="Test Recipient Email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => test.mutate(testEmail)}
              disabled={!testEmail || test.isLoading}
            >
              {test.isLoading ? "Testing..." : "Send Test"}
            </Button>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <svg
              className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-blue-800">
              The test validates your SMTP configuration. Make sure you've saved
              your settings before testing.
            </p>
          </div>
        </div>
      </ContentCard>
    </div>
  );
}

// ===========================================================================
// SHARED HELPERS
// ===========================================================================
function StatusBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      Inactive
    </span>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
      <p className="text-sm text-red-800">{message}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="border border-dashed border-slate-300 rounded-lg p-10 text-center">
      <svg
        className="w-10 h-10 text-slate-300 mx-auto mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">{message}</p>
    </div>
  );
}

function LoadingRows({ cols = 3 }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <Table>
        <TBody>
          {[1, 2, 3].map((i) => (
            <tr key={i}>
              {Array.from({ length: cols }).map((_, j) => (
                <TD key={j}>
                  <div
                    className="h-4 bg-slate-100 rounded animate-pulse"
                    style={{
                      width: j === 0 ? "40%" : j === cols - 1 ? "20%" : "60%",
                    }}
                  />
                </TD>
              ))}
            </tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

function formatSettingName(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatSettingValue(setting) {
  if (!setting.value_json) return "—";
  if (setting.key === "inventoryCostMethod")
    return setting.value_json.method === "WEIGHTED_AVERAGE"
      ? "Weighted Average"
      : "FIFO";
  if (typeof setting.value_json === "object") {
    const entries = Object.entries(setting.value_json);
    if (entries.length === 0) return "—";
    if (entries.length === 1) {
      const [key, value] = entries[0];
      return `${key}: ${value}`;
    }
    return `${entries.length} properties`;
  }
  return String(setting.value_json);
}