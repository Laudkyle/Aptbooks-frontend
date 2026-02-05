import React, { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../../../shared/hooks/useApi.js';
import { makeSettingsApi } from '../api/settings.api.js';
import { makeNotificationsApi } from '../../../notifications/api/notifications.api.js';
import { PageHeader } from '../../../../shared/components/layout/PageHeader.jsx';
import { ContentCard } from '../../../../shared/components/layout/ContentCard.jsx';
import { Tabs } from '../../../../shared/components/ui/Tabs.jsx';
import { Input } from '../../../../shared/components/ui/Input.jsx';
import { Button } from '../../../../shared/components/ui/Button.jsx';
import { Select } from '../../../../shared/components/ui/Select.jsx';
import { Table, THead, TBody, TH, TD } from '../../../../shared/components/ui/Table.jsx';
import { useToast } from '../../../../shared/components/ui/Toast.jsx';
import { Modal } from '../../../../shared/components/ui/Modal.jsx';

export default function SystemSettings() {
  const { http } = useApi();
  const settingsApi = useMemo(() => makeSettingsApi(http), [http]);
  const notifApi = useMemo(() => makeNotificationsApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const [tab, setTab] = useState('general');

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
          { value: 'general', label: 'General Preferences' },
          { value: 'email', label: 'Email Settings' }
        ]}
      />

      {tab === 'general' ? (
        <GeneralSettingsTab settingsApi={settingsApi} qc={qc} toast={toast} />
      ) : (
        <EmailSettingsTab notifApi={notifApi} qc={qc} toast={toast} />
      )}
    </div>
  );
}

function GeneralSettingsTab({ settingsApi, qc, toast }) {
  const [editModal, setEditModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const listQ = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.list({ limit: 500 }),
    staleTime: 30_000
  });

  const settings = listQ.data?.data ?? [];

  // Parse known settings
  const inventorySetting = settings.find(s => s.key === 'inventoryCostMethod');
  const currentMethod = inventorySetting?.value_json?.method || 'WEIGHTED_AVERAGE';

  const filteredSettings = settings.filter(s => 
    s.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditInventory = () => {
    setEditModal({
      type: 'inventory',
      key: 'inventoryCostMethod',
      currentValue: currentMethod
    });
  };

  return (
    <>
      <div className="grid gap-6">
        {/* Inventory Settings Card */}
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
                    {currentMethod === 'WEIGHTED_AVERAGE' ? 'Weighted Average' : 'First In, First Out (FIFO)'}
                  </div>
                  <Button variant="secondary" onClick={handleEditInventory}>
                    Change
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  This determines how inventory costs are calculated across all products
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">About Cost Methods</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li><strong>Weighted Average:</strong> Averages the cost of all units in inventory</li>
                  <li><strong>FIFO:</strong> Assumes oldest inventory is sold first</li>
                </ul>
              </div>
            </div>
          </div>
        </ContentCard>

        {/* Advanced Settings Card */}
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
                onClick={() => qc.invalidateQueries({ queryKey: ['settings'] })}
                disabled={listQ.isLoading}
              >
                {listQ.isLoading ? 'Refreshing...' : 'Refresh'}
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
                            onClick={() => setEditModal({ 
                              type: 'custom', 
                              key: s.key, 
                              currentValue: s.value_json 
                            })}
                          >
                            Edit
                          </Button>
                        </TD>
                      </tr>
                    ))}
                    {filteredSettings.length === 0 && (
                      <tr>
                        <TD colSpan={3} className="text-center text-slate-500 py-8">
                          {searchTerm ? 'No settings match your search' : 'No settings configured'}
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
      if (modal.type === 'inventory') {
        return settingsApi.put('inventoryCostMethod', { method: value });
      }
      // For custom settings, you'd implement specific logic here
      return settingsApi.put(modal.key, value);
    },
    onSuccess: () => {
      toast.success('Setting updated successfully');
      qc.invalidateQueries({ queryKey: ['settings'] });
      onClose();
    },
    onError: (e) => toast.error(e.message || 'Failed to save setting')
  });

  const handleSave = () => {
    const validationErrors = {};

    if (modal.type === 'inventory') {
      if (!value) {
        validationErrors.method = 'Please select a cost method';
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    save.mutate();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={modal.type === 'inventory' ? 'Change Inventory Cost Method' : `Edit ${formatSettingName(modal.key)}`}
    >
      <div className="space-y-6">
        {modal.type === 'inventory' ? (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-900 mb-1">Important</h4>
                  <p className="text-sm text-amber-800">
                    Changing the cost method will affect how inventory costs are calculated going forward. This change cannot be undone.
                  </p>
                </div>
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
                <h5 className="text-sm font-medium text-slate-900 mb-1">Weighted Average</h5>
                <p className="text-sm text-slate-600">
                  Calculates a new average cost each time inventory is purchased. Best for businesses with fluctuating purchase costs.
                </p>
              </div>
              <div className="border-l-4 border-slate-300 pl-4">
                <h5 className="text-sm font-medium text-slate-900 mb-1">FIFO</h5>
                <p className="text-sm text-slate-600">
                  Assumes the oldest inventory items are sold first. Best for perishable goods or tracking specific lot costs.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm text-slate-600">
              Advanced setting editing is restricted. Please contact your system administrator for changes to custom settings.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={save.isLoading || modal.type === 'custom'}
          >
            {save.isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function EmailSettingsTab({ notifApi, qc, toast }) {
  const q = useQuery({ 
    queryKey: ['smtp'], 
    queryFn: notifApi.getSmtp, 
    staleTime: 30_000 
  });

  const [form, setForm] = useState({
    host: '',
    port: 587,
    from: '',
    username: '',
    appPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (q.data) {
      setForm({
        host: q.data.host || '',
        port: q.data.port || 587,
        from: q.data.from || '',
        username: q.data.username || '',
        appPassword: q.data.appPassword || ''
      });
    }
  }, [q.data]);

  const validateForm = () => {
    const newErrors = {};

    if (!form.host.trim()) {
      newErrors.host = 'SMTP host is required';
    }

    if (!form.port || form.port < 1 || form.port > 65535) {
      newErrors.port = 'Port must be between 1 and 65535';
    }

    if (!form.from.trim()) {
      newErrors.from = 'From email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.from)) {
      newErrors.from = 'Please enter a valid email address';
    }

    if (!form.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!form.appPassword.trim()) {
      newErrors.appPassword = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const save = useMutation({
    mutationFn: () => {
      if (!validateForm()) {
        throw new Error('Please fix validation errors');
      }

      return notifApi.putSmtp({
        host: form.host.trim(),
        port: Number(form.port),
        from: form.from.trim(),
        username: form.username.trim(),
        appPassword: form.appPassword
      });
    },
    onSuccess: () => {
      toast.success('Email settings saved successfully');
      qc.invalidateQueries({ queryKey: ['smtp'] });
      setHasUnsavedChanges(false);
    },
    onError: (e) => {
      if (e.message !== 'Please fix validation errors') {
        toast.error(e.message || 'Failed to save email settings');
      }
    }
  });

  const test = useMutation({
    mutationFn: (to) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        throw new Error('Please enter a valid email address');
      }
      return notifApi.testSmtp(to);
    },
    onSuccess: () => {
      toast.success('Test email configuration validated');
      setTestEmail('');
    },
    onError: (e) => toast.error(e.message || 'Email test failed')
  });

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (q.isLoading) {
    return (
      <ContentCard>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-slate-600">Loading email settings...</p>
          </div>
        </div>
      </ContentCard>
    );
  }

  if (q.isError) {
    return (
      <ContentCard>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Settings</h3>
          <p className="text-sm text-red-700 mb-4">{q.error?.message || 'An error occurred'}</p>
          <Button 
            variant="secondary" 
            onClick={() => qc.invalidateQueries({ queryKey: ['smtp'] })}
          >
            Try Again
          </Button>
        </div>
      </ContentCard>
    );
  }

  return (
    <div className="space-y-6">
      <ContentCard 
        title="Email Server Configuration" 
        subtitle="Configure SMTP settings for sending email notifications"
        actions={
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-sm text-amber-600 font-medium">Unsaved changes</span>
            )}
            <Button 
              variant="secondary" 
              onClick={() => qc.invalidateQueries({ queryKey: ['smtp'] })}
              disabled={q.isLoading}
            >
              Refresh
            </Button>
            <Button 
              onClick={() => save.mutate()} 
              disabled={save.isLoading || !hasUnsavedChanges}
            >
              {save.isLoading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Input
                label="SMTP Host"
                value={form.host}
                onChange={(e) => handleInputChange('host', e.target.value)}
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
                onChange={(e) => handleInputChange('port', e.target.value)}
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
                onChange={(e) => handleInputChange('from', e.target.value)}
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
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="your.email@gmail.com"
                error={errors.username}
                required
              />
              <p className="mt-1.5 text-xs text-slate-600">
                Your email account username or email address
              </p>
            </div>

            <div className="md:col-span-2">
              <div className="relative">
                <Input
                  label="App Password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.appPassword}
                  onChange={(e) => handleInputChange('appPassword', e.target.value)}
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
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-600">
                Use an app-specific password for better security. <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700 underline">Learn how</a>
              </p>
            </div>
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
              {test.isLoading ? 'Testing...' : 'Send Test'}
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">About Email Testing</h4>
                <p className="text-sm text-blue-800">
                  The test validates your SMTP configuration. Make sure you've saved your settings before testing. Note that the current build validates configuration only and does not send an actual email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </ContentCard>
    </div>
  );
}

// Helper functions
function formatSettingName(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function formatSettingValue(setting) {
  if (!setting.value_json) return '—';
  
  if (setting.key === 'inventoryCostMethod') {
    const method = setting.value_json.method;
    return method === 'WEIGHTED_AVERAGE' ? 'Weighted Average' : 'FIFO';
  }
  
  if (typeof setting.value_json === 'object') {
    const entries = Object.entries(setting.value_json);
    if (entries.length === 0) return '—';
    if (entries.length === 1) {
      const [key, value] = entries[0];
      return `${key}: ${value}`;
    }
    return `${entries.length} properties`;
  }
  
  return String(setting.value_json);
}