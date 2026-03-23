import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeApiKeysApi } from '../api/apiKeys.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Modal } from '../../../../shared/components/ui/Modal.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Badge } from '../../../../shared/components/ui/Badge.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';

export default function ApiKeyList() {
  const { http } = useApi();
  const api = useMemo(() => makeApiKeysApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const q = useQuery({ 
    queryKey: ['apiKeys'], 
    queryFn: api.list, 
    staleTime: 30_000 
  });
  
  const keys = q.data?.data ?? [];
  const activeKeys = keys.filter(k => k.is_active);
  const revokedKeys = keys.filter(k => !k.is_active);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newSecretModal, setNewSecretModal] = useState(null);
  const [revokeConfirm, setRevokeConfirm] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'revoked'

  const filteredKeys = filter === 'all' ? keys : filter === 'active' ? activeKeys : revokedKeys;

  const revoke = useMutation({
    mutationFn: (id) => api.revoke(id),
    onSuccess: () => {
      toast.success('API key revoked successfully');
      qc.invalidateQueries({ queryKey: ['apiKeys'] });
      setRevokeConfirm(null);
    },
    onError: (e) => toast.error(e.message || 'Failed to revoke API key')
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      <PageHeader
        title="API Key Management"
        subtitle="Securely manage API keys for system integration and automation"
        actions={
          <Button onClick={() => setCreateModalOpen(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create API Key
          </Button>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Keys</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{keys.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Keys</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{activeKeys.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Revoked Keys</p>
              <p className="text-3xl font-bold text-slate-400 mt-2">{revokedKeys.length}</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <ContentCard>
        {/* Security Info Banner */}
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-900 mb-1">Security Best Practices</h4>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• API key secrets are shown only once during creation - store them securely</li>
                <li>• Revoke any keys that may have been compromised immediately</li>
                <li>• Use descriptive names to identify the purpose of each key</li>
                <li>• Regularly audit and rotate your API keys</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-200">
          <div className="flex gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filter === 'all'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              All Keys ({keys.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filter === 'active'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({activeKeys.length})
            </button>
            <button
              onClick={() => setFilter('revoked')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filter === 'revoked'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Revoked ({revokedKeys.length})
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ['apiKeys'] })}
            disabled={q.isLoading}
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>

        {/* Table */}
        {q.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-slate-600">Loading API keys...</p>
            </div>
          </div>
        ) : q.isError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load API Keys</h3>
            <p className="text-sm text-red-700 mb-4">{q.error?.message || 'An error occurred'}</p>
            <Button variant="secondary" onClick={() => qc.invalidateQueries({ queryKey: ['apiKeys'] })}>
              Try Again
            </Button>
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {filter === 'all' ? 'No API Keys' : filter === 'active' ? 'No Active Keys' : 'No Revoked Keys'}
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              {filter === 'all' 
                ? 'Create your first API key to get started with system integration'
                : filter === 'active'
                ? 'All keys have been revoked. Create a new key to enable API access.'
                : 'No keys have been revoked yet'}
            </p>
            {filter === 'all' && (
              <Button onClick={() => setCreateModalOpen(true)}>Create Your First API Key</Button>
            )}
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Table>
              <THead>
                <tr>
                  <TH>Key Name</TH>
                  <TH>Key Prefix</TH>
                  <TH>Status</TH>
                  <TH>Created</TH>
                  <TH>Revoked</TH>
                  <TH className="text-right">Actions</TH>
                </tr>
              </THead>
              <TBody>
                {filteredKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-slate-50">
                    <TD>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${key.is_active ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                        <span className="font-medium text-slate-900">{key.name}</span>
                      </div>
                    </TD>
                    <TD>
                      <code className="px-2 py-1 bg-slate-100 text-slate-900 rounded text-xs font-mono">
                        {key.prefix}...
                      </code>
                    </TD>
                    <TD>
                      <Badge variant={key.is_active ? 'success' : 'default'}>
                        {key.is_active ? (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                            </svg>
                            Revoked
                          </span>
                        )}
                      </Badge>
                    </TD>
                    <TD className="text-slate-600 text-sm">
                      {key.created_at ? formatDate(key.created_at) : '—'}
                    </TD>
                    <TD className="text-slate-600 text-sm">
                      {key.revoked_at ? formatDate(key.revoked_at) : '—'}
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!key.is_active}
                          onClick={() => setRevokeConfirm(key)}
                          className={!key.is_active ? '' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}
                        >
                          {key.is_active ? 'Revoke' : 'Revoked'}
                        </Button>
                      </div>
                    </TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </ContentCard>

      {/* Create Modal */}
      {createModalOpen && (
        <CreateApiKeyModal
          onClose={() => setCreateModalOpen(false)}
          onSuccess={(secret) => {
            setCreateModalOpen(false);
            setNewSecretModal(secret);
            qc.invalidateQueries({ queryKey: ['apiKeys'] });
          }}
          api={api}
          toast={toast}
        />
      )}

      {/* New Secret Modal */}
      {newSecretModal && (
        <NewSecretModal
          secret={newSecretModal}
          onClose={() => setNewSecretModal(null)}
        />
      )}

      {/* Revoke Confirmation Modal */}
      {revokeConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setRevokeConfirm(null)}
          title="Revoke API Key"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 mb-1">Confirm Revocation</h4>
                  <p className="text-sm text-red-800">
                    Are you sure you want to revoke this API key? Any applications using this key will immediately lose access. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Key Name:</span>
                <span className="font-medium text-slate-900">{revokeConfirm.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Key Prefix:</span>
                <code className="font-mono text-slate-900">{revokeConfirm.prefix}...</code>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Created:</span>
                <span className="text-slate-900">{formatDate(revokeConfirm.created_at)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setRevokeConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => revoke.mutate(revokeConfirm.id)}
                disabled={revoke.isLoading}
              >
                {revoke.isLoading ? 'Revoking...' : 'Revoke API Key'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CreateApiKeyModal({ onClose, onSuccess, api, toast }) {
  const [name, setName] = useState('');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'API key name is required';
    } else if (name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (name.trim().length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!validateForm()) {
        throw new Error('Please fix validation errors');
      }
      return api.create(name.trim());
    },
    onSuccess: (response) => {
      toast.success('API key created successfully');
      onSuccess(response.apiKey);
    },
    onError: (e) => {
      if (e.message !== 'Please fix validation errors') {
        toast.error(e.message || 'Failed to create API key');
      }
    }
  });

  const handleNameChange = (value) => {
    setName(value);
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Create New API Key"
    >
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Important</h4>
              <p className="text-sm text-blue-800">
                The API key secret will be displayed only once after creation. Make sure to copy and store it securely.
              </p>
            </div>
          </div>
        </div>

        <div>
          <Input
            label="API Key Name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., Production Integration, Mobile App, Analytics Service"
            error={errors.name}
            required
          />
          <p className="mt-2 text-xs text-slate-600">
            Choose a descriptive name to help identify the purpose or application using this key
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-900 mb-3">Best Practices</h4>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Use environment-specific keys (separate keys for dev, staging, production)</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Store keys securely in environment variables or secret managers</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Rotate keys regularly and revoke unused or compromised keys</span>
            </li>
          </ul>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isLoading || !name.trim()}>
            {create.isLoading ? 'Creating...' : 'Create API Key'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function NewSecretModal({ secret, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="API Key Created Successfully"
    >
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-green-900 mb-1">Key Created</h4>
              <p className="text-sm text-green-800">
                Your API key has been created successfully. Copy and save it now.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-900 mb-1">Save This Key Now</h4>
              <p className="text-sm text-amber-800">
                This is the only time you will see the complete API key. Store it in a secure location. If you lose it, you'll need to create a new key.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Your API Key Secret
          </label>
          <div className="relative">
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-400 break-all border-2 border-slate-700">
              {secret}
            </div>
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-md transition-colors flex items-center gap-2"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Key
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-900 mb-3">Next Steps</h4>
          <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
            <li>Copy the API key and store it in your password manager or secret vault</li>
            <li>Add the key to your application's environment variables</li>
            <li>Test the integration to ensure the key is working correctly</li>
            <li>Never commit the key to version control or share it publicly</li>
          </ol>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Helper function to format dates
function formatDate(dateString) {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (e) {
    return dateString;
  }
}