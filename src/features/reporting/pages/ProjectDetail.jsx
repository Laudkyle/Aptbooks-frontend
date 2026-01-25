import React, { useMemo, useState } from 'react'; 
import { useQuery } from '@tanstack/react-query'; 
import { useParams } from 'react-router-dom'; 
import { FolderKanban, Plus, Layers3 } from 'lucide-react'; 

import { useApi } from '../../../shared/hooks/useApi.js'; 
import { makePlanningApi } from '../api/planning.api.js'; 
import { PageHeader } from '../../../shared/components/layout/PageHeader.jsx'; 
import { ContentCard } from '../../../shared/components/layout/ContentCard.jsx'; 
import { DataTable } from '../../../shared/components/data/DataTable.jsx'; 
import { Button } from '../../../shared/components/ui/Button.jsx'; 
import { Modal } from '../../../shared/components/ui/Modal.jsx'; 
import { Input } from '../../../shared/components/ui/Input.jsx'; 
import { Select } from '../../../shared/components/ui/Select.jsx'; 
import { JsonPanel } from '../../../shared/components/data/JsonPanel.jsx'; 

function rowsFrom(data) {
  if (!data) return []; 
  if (Array.isArray(data)) return data; 
  if (Array.isArray(data.data)) return data.data; 
  if (Array.isArray(data.items)) return data.items; 
  return []; 
}

export default function ProjectDetail() {
  const { projectId } = useParams(); 
  const { http } = useApi(); 
  const api = useMemo(() => makePlanningApi(http), [http]); 

  const { data: project, isLoading: projectLoading, refetch: refetchProject } = useQuery({
    queryKey: ['reporting', 'projects', projectId],
    queryFn: () => api.projects.get(projectId)
  }); 

  const { data: phasesData, isLoading: phasesLoading, refetch: refetchPhases } = useQuery({
    queryKey: ['reporting', 'projects', projectId, 'phases'],
    queryFn: () => api.projects.phases.list(projectId)
  }); 

  const phases = rowsFrom(phasesData); 
  const [selectedPhaseId, setSelectedPhaseId] = useState(''); 

  const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    enabled: !!selectedPhaseId,
    queryKey: ['reporting', 'projects', projectId, 'phases', selectedPhaseId, 'tasks'],
    queryFn: () => api.projects.tasks.list(projectId, selectedPhaseId)
  }); 

  const tasks = rowsFrom(tasksData); 

  const [openPhase, setOpenPhase] = useState(false); 
  const [phaseForm, setPhaseForm] = useState({ code: '', name: '', status: 'active' }); 

  const [openTask, setOpenTask] = useState(false); 
  const [taskForm, setTaskForm] = useState({ code: '', name: '', status: 'active' }); 

  async function createPhase() {
    await api.projects.phases.create(projectId, { code: phaseForm.code || null, name: phaseForm.name, status: phaseForm.status }); 
    setOpenPhase(false); 
    setPhaseForm({ code: '', name: '', status: 'active' }); 
    refetchPhases(); 
  }

  async function createTask() {
    await api.projects.tasks.create(projectId, selectedPhaseId, { code: taskForm.code || null, name: taskForm.name, status: taskForm.status }); 
    setOpenTask(false); 
    setTaskForm({ code: '', name: '', status: 'active' }); 
    refetchTasks(); 
  }

  const phaseCols = useMemo(() => {
    const keys = phases[0] ? Object.keys(phases[0]) : ['code', 'name', 'status']; 
    return keys.slice(0, 5).map((k) => ({ header: k, render: (r) => <span className="text-sm">{String(r[k] ?? '')}</span> })); 
  }, [phases]); 

  const taskCols = useMemo(() => {
    const keys = tasks[0] ? Object.keys(tasks[0]) : ['code', 'name', 'status']; 
    return keys.slice(0, 5).map((k) => ({ header: k, render: (r) => <span className="text-sm">{String(r[k] ?? '')}</span> })); 
  }, [tasks]); 

  return (
    <div className="space-y-4">
      <PageHeader
        title={project?.name ? `Project: ${project.name}` : 'Project'}
        subtitle="Project structure: phases and tasks."
        icon={FolderKanban}
        right={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { refetchProject();  refetchPhases();  if (selectedPhaseId) refetchTasks();  }}>
              Refresh
            </Button>
            <Button leftIcon={Plus} onClick={() => setOpenPhase(true)}>
              New phase
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ContentCard
          title="Phases"
          subtitle="Add phases, then select one to manage tasks."
          icon={Layers3}
          right={
            <Select
              label="Selected phase"
              value={selectedPhaseId}
              onChange={(e) => setSelectedPhaseId(e.target.value)}
              options={[
                { label: 'Choose...', value: '' },
                ...phases.map((p) => ({ label: p.name || p.code || p.id, value: p.id }))
              ]}
            />
          }
        >
          <DataTable columns={phaseCols} rows={phases} loading={phasesLoading || projectLoading} empty={{ title: 'No phases', description: 'Create a phase to organize work.' }} />
          <div className="mt-4">
            <JsonPanel title="Project" value={project ?? {}} />
          </div>
        </ContentCard>

        <ContentCard
          title="Tasks"
          subtitle={selectedPhaseId ? 'Tasks in the selected phase.' : 'Select a phase to view tasks.'}
          icon={FolderKanban}
          right={
            <Button leftIcon={Plus} onClick={() => setOpenTask(true)} disabled={!selectedPhaseId}>
              New task
            </Button>
          }
        >
          <DataTable
            columns={taskCols}
            rows={tasks}
            loading={tasksLoading}
            empty={{ title: selectedPhaseId ? 'No tasks' : 'No phase selected', description: selectedPhaseId ? 'Create a task to start tracking project work.' : 'Pick a phase from the left panel.' }}
          />
          <div className="mt-4">
            <JsonPanel title="Phase list" value={phasesData ?? {}} />
          </div>
        </ContentCard>
      </div>

      <Modal open={openPhase} onClose={() => setOpenPhase(false)} title="New phase">
        <div className="space-y-3">
          <Input label="Name" value={phaseForm.name} onChange={(e) => setPhaseForm((s) => ({ ...s, name: e.target.value }))} />
          <Input label="Code" value={phaseForm.code} onChange={(e) => setPhaseForm((s) => ({ ...s, code: e.target.value }))} />
          <Select
            label="Status"
            value={phaseForm.status}
            onChange={(e) => setPhaseForm((s) => ({ ...s, status: e.target.value }))}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
              { label: 'Archived', value: 'archived' }
            ]}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpenPhase(false)}>
              Cancel
            </Button>
            <Button onClick={createPhase} disabled={!phaseForm.name}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={openTask} onClose={() => setOpenTask(false)} title="New task">
        <div className="space-y-3">
          <Input label="Name" value={taskForm.name} onChange={(e) => setTaskForm((s) => ({ ...s, name: e.target.value }))} />
          <Input label="Code" value={taskForm.code} onChange={(e) => setTaskForm((s) => ({ ...s, code: e.target.value }))} />
          <Select
            label="Status"
            value={taskForm.status}
            onChange={(e) => setTaskForm((s) => ({ ...s, status: e.target.value }))}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
              { label: 'Archived', value: 'archived' }
            ]}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpenTask(false)}>
              Cancel
            </Button>
            <Button onClick={createTask} disabled={!selectedPhaseId || !taskForm.name}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  ); 
}
