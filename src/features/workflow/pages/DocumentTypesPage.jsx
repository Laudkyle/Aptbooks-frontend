import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  FileText, 
  Layers, 
  Edit, 
  X,
  ArrowUp,
  ArrowDown,
  AlertCircle 
} from 'lucide-react';

import { useApi } from '../../../shared/hooks/useApi.js';
import { makeDocumentTypesApi } from '../approvals/api/documentTypes.api.js';
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../shared/components/ui/Card.jsx";
import { Button } from "../../../shared/components/ui/Button.jsx";
import { Input } from "../../../shared/components/ui/Input.jsx";
import { Textarea } from "../../../shared/components/ui/Textarea.jsx";
import { Modal } from "../../../shared/components/ui/Modal.jsx";
import { useToast } from "../../../shared/components/ui/Toast.jsx";
import { Badge } from "../../../shared/components/ui/Badge.jsx";

// Generate UUID v4 for idempotency
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function DocumentTypesPage() {
  const { http } = useApi();
  const api = useMemo(() => makeDocumentTypesApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  // State for modals
  const [activeModal, setActiveModal] = useState(null); // 'type', 'level', 'assign'
  const [selectedType, setSelectedType] = useState(null);
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [globalLevels, setGlobalLevels] = useState([]);

  // Form states
  const [typeForm, setTypeForm] = useState({
    name: '',
    code: '',
    description: ''
  });

  const [levelForm, setLevelForm] = useState({
    name: '',
    code: '',
    description: '',
    sequence: 1
  });

  // Load document types - with proper error handling and data extraction
  const { 
    data: typesResponse, 
    isLoading: typesLoading,
    error: typesError,
    isError: typesIsError
  } = useQuery({
    queryKey: ['documentTypes'],
    queryFn: () => api.list()
  });

  // Load approval levels
  const { 
    data: levelsResponse, 
    isLoading: levelsLoading,
    error: levelsError,
    isError: levelsIsError
  } = useQuery({
    queryKey: ['approvalLevels'],
    queryFn: () => api.listApprovalLevels()
  });

  // Load entity types
  const { 
    data: entityTypesResponse,
    isLoading: entityTypesLoading 
  } = useQuery({
    queryKey: ['entityTypes'],
    queryFn: () => api.listEntityTypes()
  });

  const {
    data: globalLevelsResponse,
    isLoading: globalLevelsLoading
  } = useQuery({
    queryKey: ['globalApprovalLevels'],
    queryFn: () => api.getGlobalApprovalLevels()
  });

  // Safely extract data with fallbacks to empty arrays
  const documentTypes = React.useMemo(() => {
    if (!typesResponse) return [];
    // Handle different possible response structures
    if (Array.isArray(typesResponse)) return typesResponse;
    if (typesResponse?.data && Array.isArray(typesResponse.data)) return typesResponse.data;
    if (typesResponse?.items && Array.isArray(typesResponse.items)) return typesResponse.items;
    return [];
  }, [typesResponse]);

  const approvalLevels = React.useMemo(() => {
    if (!levelsResponse) return [];
    if (Array.isArray(levelsResponse)) return levelsResponse;
    if (levelsResponse?.data && Array.isArray(levelsResponse.data)) return levelsResponse.data;
    if (levelsResponse?.items && Array.isArray(levelsResponse.items)) return levelsResponse.items;
    return [];
  }, [levelsResponse]);


  const globalApprovalLevels = React.useMemo(() => {
    if (!globalLevelsResponse) return [];
    if (Array.isArray(globalLevelsResponse)) return globalLevelsResponse;
    if (globalLevelsResponse?.data && Array.isArray(globalLevelsResponse.data)) return globalLevelsResponse.data;
    if (globalLevelsResponse?.items && Array.isArray(globalLevelsResponse.items)) return globalLevelsResponse.items;
    return [];
  }, [globalLevelsResponse]);

  const entityTypes = React.useMemo(() => {
    if (!entityTypesResponse) return [];
    if (Array.isArray(entityTypesResponse)) return entityTypesResponse;
    if (entityTypesResponse?.supported && Array.isArray(entityTypesResponse.supported)) return entityTypesResponse.supported;
    if (entityTypesResponse?.data && Array.isArray(entityTypesResponse.data)) return entityTypesResponse.data;
    return [];
  }, [entityTypesResponse]);

  // Mutations
  const createTypeMutation = useMutation({
    mutationFn: (data) => {
      const idempotencyKey = generateUUID();
      return api.createType(data, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Document type created successfully');
      qc.invalidateQueries({ queryKey: ['documentTypes'] });
      setActiveModal(null);
      resetTypeForm();
    },
    onError: (e) => {
      toast.error(e?.message ?? 'Failed to create document type');
    }
  });

  const createLevelMutation = useMutation({
    mutationFn: (data) => {
      const idempotencyKey = generateUUID();
      return api.createApprovalLevel(data, { idempotencyKey });
    },
    onSuccess: () => {
      toast.success('Approval level created successfully');
      qc.invalidateQueries({ queryKey: ['approvalLevels'] });
      setActiveModal(null);
      resetLevelForm();
    },
    onError: (e) => {
      toast.error(e?.message ?? 'Failed to create approval level');
    }
  });

  const assignLevelsMutation = useMutation({
    mutationFn: ({ typeId, levelIds }) => {
      return api.setApprovalLevels(typeId, levelIds);
    },
    onSuccess: () => {
      toast.success('Approval levels assigned successfully');
      qc.invalidateQueries({ queryKey: ['documentTypes'] });
      setActiveModal(null);
      setSelectedType(null);
      setSelectedLevels([]);
    },
    onError: (e) => {
      toast.error(e?.message ?? 'Failed to assign approval levels');
    }
  });


  const saveGlobalLevelsMutation = useMutation({
    mutationFn: (levelIds) => api.setGlobalApprovalLevels(levelIds),
    onSuccess: () => {
      toast.success('Global approval ladder updated successfully');
      qc.invalidateQueries({ queryKey: ['globalApprovalLevels'] });
      qc.invalidateQueries({ queryKey: ['documentTypes'] });
      setActiveModal(null);
      setGlobalLevels([]);
    },
    onError: (e) => {
      toast.error(e?.message ?? 'Failed to update global approval ladder');
    }
  });

  const resetTypeForm = () => {
    setTypeForm({ name: '', code: '', description: '' });
  };

  const resetLevelForm = () => {
    setLevelForm({ name: '', code: '', description: '', sequence: 1 });
  };

  const handleCreateType = () => {
    if (!typeForm.name.trim()) {
      toast.error('Please enter a type name');
      return;
    }
    if (!typeForm.code.trim()) {
      toast.error('Please enter a type code');
      return;
    }
    createTypeMutation.mutate(typeForm);
  };

  const handleCreateLevel = () => {
    if (!levelForm.name.trim()) {
      toast.error('Please enter a level name');
      return;
    }
    if (!levelForm.code.trim()) {
      toast.error('Please enter a level code');
      return;
    }
    createLevelMutation.mutate(levelForm);
  };

  const handleAssignLevels = () => {
    if (!selectedType) return;
    assignLevelsMutation.mutate({
      typeId: selectedType.id,
      levelIds: selectedLevels
    });
  };


  const handleSaveGlobalLevels = () => {
    saveGlobalLevelsMutation.mutate(globalLevels);
  };

  const moveLevel = (index, direction) => {
    const newLevels = [...selectedLevels];
    if (direction === 'up' && index > 0) {
      [newLevels[index], newLevels[index - 1]] = [newLevels[index - 1], newLevels[index]];
    } else if (direction === 'down' && index < newLevels.length - 1) {
      [newLevels[index], newLevels[index + 1]] = [newLevels[index + 1], newLevels[index]];
    }
    setSelectedLevels(newLevels);
  };

  const isLoading = typesLoading || levelsLoading || entityTypesLoading || globalLevelsLoading;
  const hasError = typesIsError || levelsIsError;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Document Types" 
        subtitle="Configure document types and approval chains"
        actions={
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => {
                resetLevelForm();
                setActiveModal('level');
              }}
              variant="outline"
              className="border-gray-300"
              disabled={isLoading}
            >
              <Layers className="h-4 w-4 mr-2" />
              New Approval Level
            </Button>
            <Button 
              size="sm" 
              onClick={() => {
                resetTypeForm();
                setActiveModal('type');
              }}
              className="bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Document Type
            </Button>
          </div>
        }
      />

      {hasError ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load data</h3>
              <p className="text-sm text-gray-600">
                {typesError?.message || levelsError?.message || 'An error occurred while loading data'}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  qc.invalidateQueries({ queryKey: ['documentTypes'] });
                  qc.invalidateQueries({ queryKey: ['approvalLevels'] });
                }}
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Global Approval Ladder */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Global Approval Ladder
              </CardTitle>
              <CardDescription>
                Used for all document types by default. A document-specific ladder overrides it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-blue-900">Current global chain</div>
                  <p className="text-sm text-blue-800 mt-1">{globalApprovalLevels.length ? globalApprovalLevels.map(level => level.name || level.code).join(' → ') : 'No levels configured'}</p>
                </div>
                <Button
                  variant="outline"
                  className="border-blue-300"
                  onClick={() => {
                    setGlobalLevels(globalApprovalLevels.map(level => level.id));
                    setActiveModal('global');
                  }}
                  disabled={approvalLevels.length === 0}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Configure Global
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Document Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Types
              </CardTitle>
              <CardDescription>
                {isLoading ? 'Loading...' : `${documentTypes.length} types configured`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : documentTypes.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No document types yet</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveModal('type')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first type
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {documentTypes.map((type) => (
                    <div
                      key={type.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-medium text-gray-900">{type.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {type.code}
                            </Badge>
                          </div>
                          {type.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{type.description}</p>
                          )}
                          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                            <span>{type.approval_levels?.length ? `Override levels: ${type.approval_levels.length}` : `Uses global: ${globalApprovalLevels.length}`}</span>
                            <span>Created: {type.created_at ? new Date(type.created_at).toLocaleDateString() : '—'}</span>
                          </div>
                        </div>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setSelectedType(type);
                            setSelectedLevels(type.approval_levels?.map(l => l.id) || []);
                            setActiveModal('assign');
                          }}
                          className="border-gray-300 ml-2 flex-shrink-0"
                          disabled={approvalLevels.length === 0}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Configure
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approval Levels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Approval Levels
              </CardTitle>
              <CardDescription>
                {isLoading ? 'Loading...' : `${approvalLevels.length} levels configured`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : approvalLevels.length === 0 ? (
                <div className="text-center py-8">
                  <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No approval levels yet</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveModal('level')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first level
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...approvalLevels]
                    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                    .map((level) => (
                      <div
                        key={level.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-medium text-gray-900">{level.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {level.code}
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              Level {level.sequence || '—'}
                            </Badge>
                          </div>
                          {level.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{level.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Entity Types Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Supported Entity Types</CardTitle>
              <CardDescription>
                Document types can be linked to these entity types
              </CardDescription>
            </CardHeader>
            <CardContent>
              {entityTypesLoading ? (
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-8 w-24 bg-gray-100 animate-pulse rounded-full" />
                  ))}
                </div>
              ) : entityTypes.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No entity types available</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {entityTypes.map((type) => (
                    <Badge key={type} variant="outline" className="">
                      {type}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Operational Tips */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Operational tips</CardTitle>
              <CardDescription>Design choices aligned with your backend.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Entity linking</h4>
                  <p className="text-sm text-blue-700">
                    Each document ties to an entity type/id for context and permissions.
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-900 mb-2">Versioning</h4>
                  <p className="text-sm text-green-700">
                    Upload uses raw bytes + x-filename header for secure storage.
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-purple-900 mb-2">Approvals</h4>
                  <p className="text-sm text-purple-700">
                    Approve/reject actions require approvals.act permission.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Document Type Modal */}
      <Modal
        open={activeModal === 'type'}
        onClose={() => setActiveModal(null)}
        title="Create Document Type"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={typeForm.name}
              onChange={(e) => setTypeForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Invoice, Contract, Report"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Code <span className="text-red-500">*</span>
            </label>
            <Input
              value={typeForm.code}
              onChange={(e) => setTypeForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="e.g., INV, CONT, RPT"
            />
            <p className="text-xs text-gray-500 mt-1">Unique identifier, will be converted to uppercase</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Textarea
              value={typeForm.description}
              onChange={(e) => setTypeForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> After creating the document type, you can assign approval levels to it.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => setActiveModal(null)}
            className="border-gray-300"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateType}
            disabled={createTypeMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {createTypeMutation.isPending ? 'Creating...' : 'Create Type'}
          </Button>
        </div>
      </Modal>

      {/* Create Approval Level Modal */}
      <Modal
        open={activeModal === 'level'}
        onClose={() => setActiveModal(null)}
        title="Create Approval Level"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={levelForm.name}
              onChange={(e) => setLevelForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Manager Approval, Director Approval"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Code <span className="text-red-500">*</span>
            </label>
            <Input
              value={levelForm.code}
              onChange={(e) => setLevelForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="e.g., MGR, DIR"
            />
            <p className="text-xs text-gray-500 mt-1">Unique identifier, will be converted to uppercase</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sequence <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="1"
              step="1"
              value={levelForm.sequence}
              onChange={(e) => setLevelForm(prev => ({ ...prev, sequence: parseInt(e.target.value) || 1 }))}
            />
            <p className="text-xs text-gray-500 mt-1">Order in the approval chain (lower numbers go first)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Textarea
              value={levelForm.description}
              onChange={(e) => setLevelForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description of this approval level"
              rows={3}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => setActiveModal(null)}
            className="border-gray-300"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateLevel}
            disabled={createLevelMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {createLevelMutation.isPending ? 'Creating...' : 'Create Level'}
          </Button>
        </div>
      </Modal>


      {/* Global Approval Levels Modal */}
      <Modal
        open={activeModal === 'global'}
        onClose={() => {
          setActiveModal(null);
          setGlobalLevels([]);
        }}
        title="Configure Global Approval Ladder"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This ladder is the default for every document type. Any document type with its own approval levels will override this global chain.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Available Levels</h4>
              <div className="border border-gray-200 rounded-lg p-2 max-h-96 overflow-y-auto">
                {approvalLevels.filter(level => !globalLevels.includes(level.id)).map((level) => (
                  <div key={level.id} className="p-2 rounded cursor-pointer flex items-center justify-between hover:bg-gray-50" onClick={() => setGlobalLevels(prev => [...prev, level.id])}>
                    <div><span className="text-sm font-medium">{level.name}</span><span className="text-xs text-gray-500 ml-2">({level.code})</span></div>
                    <Plus className="h-4 w-4 text-gray-400" />
                  </div>
                ))}
                {approvalLevels.filter(level => !globalLevels.includes(level.id)).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No more levels available</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Global Levels (in order)</h4>
              <div className="border border-gray-200 rounded-lg p-2 max-h-96 overflow-y-auto">
                {globalLevels.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No global levels selected.</p>
                ) : (
                  globalLevels.map((levelId, index) => {
                    const level = approvalLevels.find(l => l.id === levelId);
                    if (!level) return null;
                    return (
                      <div key={levelId} className="p-2 bg-blue-50 rounded mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap"><Badge className="bg-blue-600 text-white">#{index + 1}</Badge><span className="text-sm font-medium">{level.name}</span><span className="text-xs text-gray-500">({level.code})</span></div>
                        <div className="flex items-center gap-1 ml-2">
                          <button onClick={() => { if (index > 0) { const copy = [...globalLevels]; [copy[index], copy[index-1]] = [copy[index-1], copy[index]]; setGlobalLevels(copy); } }} disabled={index===0} className="p-1 hover:bg-blue-100 rounded disabled:opacity-30" title="Move up"><ArrowUp className="h-4 w-4" /></button>
                          <button onClick={() => { if (index < globalLevels.length - 1) { const copy = [...globalLevels]; [copy[index], copy[index+1]] = [copy[index+1], copy[index]]; setGlobalLevels(copy); } }} disabled={index===globalLevels.length-1} className="p-1 hover:bg-blue-100 rounded disabled:opacity-30" title="Move down"><ArrowDown className="h-4 w-4" /></button>
                          <button onClick={() => setGlobalLevels(prev => prev.filter(id => id !== levelId))} className="p-1 hover:bg-red-100 rounded text-red-600" title="Remove"><X className="h-4 w-4" /></button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => { setActiveModal(null); setGlobalLevels([]); }} className="border-gray-300">Cancel</Button>
          <Button onClick={handleSaveGlobalLevels} disabled={saveGlobalLevelsMutation.isPending} className="bg-green-600 hover:bg-green-700">{saveGlobalLevelsMutation.isPending ? 'Saving...' : 'Save Global Ladder'}</Button>
        </div>
      </Modal>

      {/* Assign Approval Levels Modal */}
      <Modal
        open={activeModal === 'assign'}
        onClose={() => {
          setActiveModal(null);
          setSelectedType(null);
          setSelectedLevels([]);
        }}
        title={`Configure Approval Levels - ${selectedType?.name || 'Document Type'}`}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select and order the approval levels for this document type. Leave this list empty if the document type should inherit the global approval ladder.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Available Levels */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Available Levels</h4>
              <div className="border border-gray-200 rounded-lg p-2 max-h-96 overflow-y-auto">
                {approvalLevels.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No approval levels available</p>
                ) : (
                  approvalLevels
                    .filter(level => !selectedLevels.includes(level.id))
                    .map((level) => (
                      <div
                        key={level.id}
                        className="p-2 hover: rounded cursor-pointer flex items-center justify-between"
                        onClick={() => setSelectedLevels(prev => [...prev, level.id])}
                      >
                        <div>
                          <span className="text-sm font-medium">{level.name}</span>
                          <span className="text-xs text-gray-500 ml-2">({level.code})</span>
                        </div>
                        <Plus className="h-4 w-4 text-gray-400" />
                      </div>
                    ))
                )}
                {approvalLevels.filter(level => !selectedLevels.includes(level.id)).length === 0 && approvalLevels.length > 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No more levels available</p>
                )}
              </div>
            </div>

            {/* Selected Levels */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Levels (in order)</h4>
              <div className="border border-gray-200 rounded-lg p-2 max-h-96 overflow-y-auto">
                {selectedLevels.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No levels selected. Click on available levels to add them.
                  </p>
                ) : (
                  selectedLevels.map((levelId, index) => {
                    const level = approvalLevels.find(l => l.id === levelId);
                    if (!level) return null;
                    
                    return (
                      <div
                        key={levelId}
                        className="p-2 bg-blue-50 rounded mb-2 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-blue-600 text-white">#{index + 1}</Badge>
                            <span className="text-sm font-medium">{level.name}</span>
                            <span className="text-xs text-gray-500">({level.code})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => moveLevel(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-blue-100 rounded disabled:opacity-30"
                            title="Move up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => moveLevel(index, 'down')}
                            disabled={index === selectedLevels.length - 1}
                            className="p-1 hover:bg-blue-100 rounded disabled:opacity-30"
                            title="Move down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setSelectedLevels(prev => prev.filter(id => id !== levelId))}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                            title="Remove"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> The order determines the approval flow. Level 1 must approve first, then Level 2, etc.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => {
              setActiveModal(null);
              setSelectedType(null);
              setSelectedLevels([]);
            }}
            className="border-gray-300"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAssignLevels}
            disabled={assignLevelsMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {assignLevelsMutation.isPending ? 'Saving...' : (selectedLevels.length === 0 ? 'Use Global Ladder' : 'Save Configuration')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}