import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";

import {
  FolderKanban,
  Plus,
  Layers3,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Edit,
  Archive,
  PlayCircle,
  MoreVertical,
  CheckCircle2,
  Clock,
  Calendar,
  Tag,
  FileText,
  Info,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  AlertTriangle,
  Users,
  Briefcase,
  BarChart3,
  ListTodo,
  Target,
  Filter,
  Search,
  PauseCircle,
  RotateCcw,
} from "lucide-react";

import { useApi } from "../../../shared/hooks/useApi.js";
import { makePlanningApi } from "../api/planning.api.js";
import { PageHeader } from "../../../shared/components/layout/PageHeader.jsx";
import { endpoints } from "../../../shared/api/endpoints.js";
import { ContentCard } from "../../../shared/components/layout/ContentCard.jsx";
import { DataTable } from "../../../shared/components/data/DataTable.jsx";
import { Button } from "../../../shared/components/ui/Button.jsx";
import { Modal } from "../../../shared/components/ui/Modal.jsx";
import { Input } from "../../../shared/components/ui/Input.jsx";
import { Select } from "../../../shared/components/ui/Select.jsx";
import { Badge } from "../../../shared/components/ui/Badge.jsx";
import { useToast } from "../../../shared/components/ui/Toast.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../shared/components/ui/DropdownMenu.jsx";
import { ROUTES } from "../../../app/constants/routes.js";
import { generateUUID } from "../../../shared/utils/generateUUID.js";

/**
 * Helper function to safely extract rows from various API response formats
 */
function extractRows(data) {
  if (!data) return [];

  if (data.data && Array.isArray(data.data.data)) {
    return data.data.data;
  }

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;

  if (data.data && typeof data.data === "object") {
    const nestedData = data.data;
    if (Array.isArray(nestedData.records)) return nestedData.records;
    if (Array.isArray(nestedData.results)) return nestedData.results;
    if (Array.isArray(nestedData.list)) return nestedData.list;
  }

  return [];
}

export default function ProjectDetail() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { http } = useApi();
  const api = useMemo(() => makePlanningApi(http), [http]);
  const qc = useQueryClient();
  const toast = useToast();

  const userList = useQuery({
    queryFn: async () => {
      const res = await http.get(endpoints.core.users.list);
      return res.data;
    },
  });
  // Add this after your userList query
  const userMap = useMemo(() => {
    if (!userList.data) return new Map();

    let users = [];

    // Handle different API response structures
    if (Array.isArray(userList.data)) {
      users = userList.data;
    } else if (userList.data?.data && Array.isArray(userList.data.data)) {
      users = userList.data.data;
    } else if (userList.data?.items && Array.isArray(userList.data.items)) {
      users = userList.data.items;
    }

    return new Map(
      users
        .filter((user) => user.status !== "deleted")
        .map((user) => [user.id, user.full_name || user.email]),
    );
  }, [userList.data]);

  // Also create a map for full user objects if you need more details
  const userDetailsMap = useMemo(() => {
    if (!userList.data) return new Map();

    let users = [];

    if (Array.isArray(userList.data)) {
      users = userList.data;
    } else if (userList.data?.data && Array.isArray(userList.data.data)) {
      users = userList.data.data;
    } else if (userList.data?.items && Array.isArray(userList.data.items)) {
      users = userList.data.items;
    }

    return new Map(
      users
        .filter((user) => user.status !== "deleted")
        .map((user) => [user.id, user]),
    );
  }, [userList.data]);

  // Helper function to get user display name
  const getUserDisplayName = (userId) => {
    if (!userId) return "—";
    return userMap.get(userId) || userId;
  };
  // UI State
  const [selectedPhaseId, setSelectedPhaseId] = useState(null);
  const [expandedPhases, setExpandedPhases] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    search: "",
    priority: "",
  });

  // Modal States
  const [modals, setModals] = useState({
    createPhase: false,
    editPhase: false,
    createTask: false,
    editTask: false,
    archiveConfirm: false,
    activateConfirm: false,
    completeConfirm: false,
  });

  // Form States - Updated to match database schema
  const [phaseForm, setPhaseForm] = useState({
    code: "",
    name: "",
    status: "draft", // Changed from 'active' to 'draft'
    description: "",
    start_date: "", // Changed from startDate to match DB
    end_date: "", // Changed from endDate to match DB
  });

  const [taskForm, setTaskForm] = useState({
    code: "",
    name: "",
    status: "draft", // Changed from 'active' to 'draft'
    description: "",
    assigned_to: "", // Changed from assignedTo to match DB
    priority: "medium",
    estimated_hours: "", // Changed from estimatedHours to match DB
    actual_hours: "", // Added actual_hours field
    start_date: "", // Changed from startDate to match DB
    end_date: "", // Changed from endDate to match DB
    completed_date: "", // Added completed_date field
  });

  const [selectedPhase, setSelectedPhase] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [actionType, setActionType] = useState(null);

  const [formErrors, setFormErrors] = useState({});
  const [showPhaseInfo, setShowPhaseInfo] = useState(false);
  const [showTaskInfo, setShowTaskInfo] = useState(false);

  // ============================
  // Data Fetching
  // ============================

  // Fetch Project
  const {
    data: projectData,
    isLoading: projectLoading,
    error: projectError,
    refetch: refetchProject,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.projects.get(projectId),
    enabled: !!projectId,
    staleTime: 30000,
    retry: 2,
  });

  // Extract project data
  const project = useMemo(() => {
    if (!projectData) return null;
    if (projectData.data && projectData.data.data) return projectData.data.data;
    if (projectData.data) return projectData.data;
    return projectData;
  }, [projectData]);

  console.log("Fetched project:", projectData);

  // Fetch Phases
  const {
    data: phasesData,
    isLoading: phasesLoading,
    error: phasesError,
    refetch: refetchPhases,
  } = useQuery({
    queryKey: ["project", projectId, "phases"],
    queryFn: () => api.projects.phases.list(projectId),
    enabled: !!projectId,
    staleTime: 30000,
  });

  const phases = useMemo(() => extractRows(phasesData), [phasesData]);

  // Fetch Tasks for selected phase
  const {
    data: tasksData,
    isLoading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useQuery({
    enabled: !!projectId && !!selectedPhaseId,
    queryKey: ["project", projectId, "phases", selectedPhaseId, "tasks"],
    queryFn: () => api.projects.phases.tasks.list(projectId, selectedPhaseId),
    staleTime: 30000,
  });

  const tasks = useMemo(() => extractRows(tasksData), [tasksData]);

  // Set initial selected phase
  useEffect(() => {
    if (phases.length > 0 && !selectedPhaseId) {
      setSelectedPhaseId(phases[0].id);
      setExpandedPhases(new Set([phases[0].id]));
    }
  }, [phases, selectedPhaseId]);

  // ============================
  // Mutations
  // ============================

  const createPhaseMutation = useMutation({
    mutationFn: async () => {
      if (!validatePhaseForm()) {
        throw new Error("Please fix validation errors");
      }

      const idempotencyKey = generateUUID();
      const payload = {
        code: phaseForm.code || null,
        name: phaseForm.name.trim(),
        status: phaseForm.status,
        description: phaseForm.description || null,
        start_date: phaseForm.start_date || null,
        end_date: phaseForm.end_date || null,
      };

      return api.projects.phases.create(projectId, payload, { idempotencyKey });
    },
    onSuccess: (data) => {
      toast.success("Phase created successfully");
      closeModal("createPhase");
      resetPhaseForm();
      refetchPhases();

      const newPhase = data?.data || data;
      if (newPhase?.id) {
        setSelectedPhaseId(newPhase.id);
        setExpandedPhases((prev) => new Set([...prev, newPhase.id]));
      }
    },
    onError: (err) => {
      const message =
        err?.response?.data?.message ??
        err?.message ??
        "Failed to create phase";
      toast.error(message);
    },
  });

  const updatePhaseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPhase) throw new Error("No phase selected");
      if (!validatePhaseForm()) {
        throw new Error("Please fix validation errors");
      }

      const idempotencyKey = generateUUID();
      const payload = {
        code: phaseForm.code || null,
        name: phaseForm.name.trim(),
        status: phaseForm.status,
        description: phaseForm.description || null,
        start_date: phaseForm.start_date || null,
        end_date: phaseForm.end_date || null,
      };

      return api.projects.phases.update(projectId, selectedPhase.id, payload, {
        idempotencyKey,
      });
    },
    onSuccess: () => {
      toast.success("Phase updated successfully");
      closeModal("editPhase");
      resetPhaseForm();
      setSelectedPhase(null);
      refetchPhases();
    },
    onError: (err) => {
      const message =
        err?.response?.data?.message ??
        err?.message ??
        "Failed to update phase";
      toast.error(message);
    },
  });

  const archivePhaseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPhase) throw new Error("No phase selected");
      const idempotencyKey = generateUUID();
      return api.projects.phases.update(
        projectId,
        selectedPhase.id,
        { status: "archived" },
        { idempotencyKey },
      );
    },
    onSuccess: () => {
      toast.success("Phase archived successfully");
      closeActionModal();
      refetchPhases();
    },
    onError: (err) => {
      const message =
        err?.response?.data?.message ??
        err?.message ??
        "Failed to archive phase";
      toast.error(message);
    },
  });

  const activatePhaseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPhase) throw new Error("No phase selected");
      const idempotencyKey = generateUUID();
      return api.projects.phases.update(
        projectId,
        selectedPhase.id,
        { status: "active" },
        { idempotencyKey },
      );
    },
    onSuccess: () => {
      toast.success("Phase activated successfully");
      closeActionModal();
      refetchPhases();
    },
    onError: (err) => {
      const message =
        err?.response?.data?.message ??
        err?.message ??
        "Failed to activate phase";
      toast.error(message);
    },
  });

  const completePhaseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPhase) throw new Error("No phase selected");
      const idempotencyKey = generateUUID();
      return api.projects.phases.update(
        projectId,
        selectedPhase.id,
        { status: "completed" },
        { idempotencyKey },
      );
    },
    onSuccess: () => {
      toast.success("Phase completed successfully");
      closeActionModal();
      refetchPhases();
    },
    onError: (err) => {
      const message =
        err?.response?.data?.message ??
        err?.message ??
        "Failed to complete phase";
      toast.error(message);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPhaseId) throw new Error("No phase selected");
      if (!validateTaskForm()) {
        throw new Error("Please fix validation errors");
      }

      const idempotencyKey = generateUUID();
      const payload = {
        code: taskForm.code || null,
        name: taskForm.name.trim(),
        status: taskForm.status,
        description: taskForm.description || null,
        assigned_to: taskForm.assigned_to || null,
        priority: taskForm.priority,
        estimated_hours: taskForm.estimated_hours
          ? Number(taskForm.estimated_hours)
          : null,
        actual_hours: taskForm.actual_hours
          ? Number(taskForm.actual_hours)
          : null,
        start_date: taskForm.start_date || null,
        end_date: taskForm.end_date || null,
        completed_date: taskForm.completed_date || null,
      };

      return api.projects.phases.tasks.create(
        projectId,
        selectedPhaseId,
        payload,
        { idempotencyKey },
      );
    },
    onSuccess: () => {
      toast.success("Task created successfully");
      closeModal("createTask");
      resetTaskForm();
      refetchTasks();
    },
    onError: (err) => {
      const message =
        err?.response?.data?.message ?? err?.message ?? "Failed to create task";
      toast.error(message);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPhaseId || !selectedTask)
        throw new Error("No task selected");
      if (!validateTaskForm()) {
        throw new Error("Please fix validation errors");
      }

      const idempotencyKey = generateUUID();
      const payload = {
        code: taskForm.code || null,
        name: taskForm.name.trim(),
        status: taskForm.status,
        description: taskForm.description || null,
        assigned_to: taskForm.assigned_to || null,
        priority: taskForm.priority,
        estimated_hours: taskForm.estimated_hours
          ? Number(taskForm.estimated_hours)
          : null,
        actual_hours: taskForm.actual_hours
          ? Number(taskForm.actual_hours)
          : null,
        start_date: taskForm.start_date || null,
        end_date: taskForm.end_date || null,
        completed_date: taskForm.completed_date || null,
      };

      return api.projects.phases.tasks.update(
        projectId,
        selectedPhaseId,
        selectedTask.id,
        payload,
        { idempotencyKey },
      );
    },
    onSuccess: () => {
      toast.success("Task updated successfully");
      closeModal("editTask");
      resetTaskForm();
      setSelectedTask(null);
      refetchTasks();
    },
    onError: (err) => {
      const message =
        err?.response?.data?.message ?? err?.message ?? "Failed to update task";
      toast.error(message);
    },
  });

  const archiveTaskMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPhaseId || !selectedTask)
        throw new Error("No task selected");
      const idempotencyKey = generateUUID();
      return api.projects.phases.tasks.update(
        projectId,
        selectedPhaseId,
        selectedTask.id,
        { status: "archived" },
        { idempotencyKey },
      );
    },
    onSuccess: () => {
      toast.success("Task archived successfully");
      closeActionModal();
      refetchTasks();
    },
    onError: (err) => {
      const message =
        err?.response?.data?.message ??
        err?.message ??
        "Failed to archive task";
      toast.error(message);
    },
  });

  const activateTaskMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPhaseId || !selectedTask)
        throw new Error("No task selected");
      const idempotencyKey = generateUUID();
      return api.projects.phases.tasks.update(
        projectId,
        selectedPhaseId,
        selectedTask.id,
        { status: "active" },
        { idempotencyKey },
      );
    },
    onSuccess: () => {
      toast.success("Task activated successfully");
      closeActionModal();
      refetchTasks();
    },
    onError: (err) => {
      const message =
        err?.response?.data?.message ??
        err?.message ??
        "Failed to activate task";
      toast.error(message);
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPhaseId || !selectedTask)
        throw new Error("No task selected");
      const idempotencyKey = generateUUID();
      const completedDate = new Date().toISOString().split("T")[0];

      return api.projects.phases.tasks.update(
        projectId,
        selectedPhaseId,
        selectedTask.id,
        {
          status: "completed",
          completed_date: completedDate,
        },
        { idempotencyKey },
      );
    },
    onSuccess: () => {
      toast.success("Task completed successfully");
      closeActionModal();
      refetchTasks();
    },
    onError: (err) => {
      const message =
        err?.response?.data?.message ??
        err?.message ??
        "Failed to complete task";
      toast.error(message);
    },
  });

  // ============================
  // Utility Functions
  // ============================

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    const normalized = (status || "draft").toLowerCase();
    const config = {
      draft: { tone: "muted", label: "Draft", icon: FileText },
      active: { tone: "success", label: "Active", icon: PlayCircle },
      on_hold: { tone: "warning", label: "On Hold", icon: PauseCircle },
      completed: { tone: "info", label: "Completed", icon: CheckCircle2 },
      archived: { tone: "default", label: "Archived", icon: Archive },
    };
    return config[normalized] || config.draft;
  };

  const getPriorityBadge = (priority) => {
    const normalized = (priority || "medium").toLowerCase();
    const config = {
      high: { tone: "danger", label: "High" },
      medium: { tone: "warning", label: "Medium" },
      low: { tone: "info", label: "Low" },
      critical: { tone: "danger", label: "Critical" },
    };
    return config[normalized] || config.medium;
  };

  // Form Validation
  const validatePhaseForm = useCallback(() => {
    const errors = {};

    if (!phaseForm.name.trim()) {
      errors.name = "Phase name is required";
    } else if (phaseForm.name.trim().length < 2) {
      errors.name = "Phase name must be at least 2 characters";
    }

    if (!phaseForm.code.trim()) {
      errors.code = "Phase code is required";
    } else if (phaseForm.code.length > 20) {
      errors.code = "Phase code must be 20 characters or less";
    }

    if (phaseForm.start_date && phaseForm.end_date) {
      if (new Date(phaseForm.start_date) > new Date(phaseForm.end_date)) {
        errors.end_date = "End date must be after start date";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [phaseForm]);

  const validateTaskForm = useCallback(() => {
    const errors = {};

    if (!taskForm.name.trim()) {
      errors.name = "Task name is required";
    } else if (taskForm.name.trim().length < 2) {
      errors.name = "Task name must be at least 2 characters";
    }

    if (taskForm.code && taskForm.code.length > 20) {
      errors.code = "Task code must be 20 characters or less";
    }

    if (
      taskForm.estimated_hours &&
      (isNaN(taskForm.estimated_hours) || taskForm.estimated_hours < 0)
    ) {
      errors.estimated_hours = "Estimated hours must be a positive number";
    }

    if (
      taskForm.actual_hours &&
      (isNaN(taskForm.actual_hours) || taskForm.actual_hours < 0)
    ) {
      errors.actual_hours = "Actual hours must be a positive number";
    }

    if (taskForm.start_date && taskForm.end_date) {
      if (new Date(taskForm.start_date) > new Date(taskForm.end_date)) {
        errors.end_date = "End date must be after start date";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [taskForm]);

  // Modal handlers
  const openModal = (modalName, item = null) => {
    if (modalName === "editPhase" && item) {
      setSelectedPhase(item);
      setPhaseForm({
        code: item.code || "",
        name: item.name || "",
        status: item.status || "draft",
        description: item.description || "",
        start_date: item.start_date || "",
        end_date: item.end_date || "",
      });
    } else if (modalName === "editTask" && item) {
      setSelectedTask(item);
      setTaskForm({
        code: item.code || "",
        name: item.name || "",
        status: item.status || "draft",
        description: item.description || "",
        assigned_to: item.assigned_to || "",
        priority: item.priority || "medium",
        estimated_hours: item.estimated_hours || "",
        actual_hours: item.actual_hours || "",
        start_date: item.start_date || "",
        end_date: item.end_date || "",
        completed_date: item.completed_date || "",
      });
    } else if (modalName === "createPhase") {
      resetPhaseForm();
    } else if (modalName === "createTask") {
      resetTaskForm();
    }
    setModals((prev) => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName) => {
    setModals((prev) => ({ ...prev, [modalName]: false }));
    setFormErrors({});
    if (modalName === "editPhase") setSelectedPhase(null);
    if (modalName === "editTask") setSelectedTask(null);
  };

  const openActionModal = (type, item, isTask = false) => {
    setActionType(type);
    if (isTask) {
      setSelectedTask(item);
    } else {
      setSelectedPhase(item);
    }

    let modalName = "";
    if (type === "archive") modalName = "archiveConfirm";
    else if (type === "activate") modalName = "activateConfirm";
    else if (type === "complete") modalName = "completeConfirm";

    setModals((prev) => ({ ...prev, [modalName]: true }));
  };

  const closeActionModal = () => {
    setActionType(null);
    setSelectedPhase(null);
    setSelectedTask(null);
    setModals((prev) => ({
      ...prev,
      archiveConfirm: false,
      activateConfirm: false,
      completeConfirm: false,
    }));
  };

  const resetPhaseForm = () => {
    setPhaseForm({
      code: "",
      name: "",
      status: "draft",
      description: "",
      start_date: "",
      end_date: "",
    });
    setFormErrors({});
  };

  const resetTaskForm = () => {
    setTaskForm({
      code: "",
      name: "",
      status: "draft",
      description: "",
      assigned_to: "",
      priority: "medium",
      estimated_hours: "",
      actual_hours: "",
      start_date: "",
      end_date: "",
      completed_date: "",
    });
    setFormErrors({});
  };

  const handleRefresh = useCallback(() => {
    refetchProject();
    refetchPhases();
    if (selectedPhaseId) refetchTasks();
    toast.success("Data refreshed");
  }, [refetchProject, refetchPhases, refetchTasks, selectedPhaseId, toast]);

  const togglePhaseExpand = (phaseId) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          task.name?.toLowerCase().includes(searchLower) ||
          task.code?.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [tasks, filters]);

  // Phase columns for table
  const phaseColumns = useMemo(
    () => [
      {
        header: "Phase",
        accessor: "name",
        render: (row) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => togglePhaseExpand(row.id)}
              className="p-1 hover:bg-slate-100 rounded"
            >
              {expandedPhases.has(row.id) ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>
            <Layers3 className="h-4 w-4 text-slate-400" />
            <span className="font-medium">{row.name || row.id}</span>
          </div>
        ),
      },
      {
        header: "Code",
        accessor: "code",
        render: (row) => (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Tag className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-mono">{row.code || "—"}</span>
          </div>
        ),
      },
      {
        header: "Status",
        accessor: "status",
        render: (row) => {
          const badge = getStatusBadge(row.status);
          return <Badge tone={badge.tone}>{badge.label}</Badge>;
        },
      },
      {
        header: "Tasks",
        render: (row) => {
          const taskCount = row.tasks?.length || 0;
          return (
            <Badge tone={taskCount > 0 ? "info" : "muted"}>{taskCount}</Badge>
          );
        },
      },
      {
        header: "Dates",
        render: (row) => {
          if (row.start_date || row.end_date) {
            return (
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {row.start_date && formatDate(row.start_date)}
                {row.end_date && ` → ${formatDate(row.end_date)}`}
              </div>
            );
          }
          return "—";
        },
      },
      {
        header: "Actions",
        render: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openModal("editPhase", row)}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Edit Phase</span>
              </DropdownMenuItem>

              {row.status === "draft" && (
                <DropdownMenuItem
                  onClick={() => openActionModal("activate", row)}
                >
                  <PlayCircle className="mr-2 h-4 w-4 text-green-600" />
                  <span>Activate Phase</span>
                </DropdownMenuItem>
              )}

              {row.status === "active" && (
                <>
                  <DropdownMenuItem
                    onClick={() => openActionModal("complete", row)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4 text-blue-600" />
                    <span>Complete Phase</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openActionModal("archive", row)}
                  >
                    <Archive className="mr-2 h-4 w-4 text-amber-600" />
                    <span>Archive Phase</span>
                  </DropdownMenuItem>
                </>
              )}

              {row.status === "completed" && (
                <DropdownMenuItem
                  onClick={() => openActionModal("archive", row)}
                >
                  <Archive className="mr-2 h-4 w-4 text-amber-600" />
                  <span>Archive Phase</span>
                </DropdownMenuItem>
              )}

              {row.status === "archived" && (
                <DropdownMenuItem
                  onClick={() => openActionModal("activate", row)}
                >
                  <RotateCcw className="mr-2 h-4 w-4 text-green-600" />
                  <span>Restore Phase</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [expandedPhases],
  );

  // Task columns for table
  const taskColumns = useMemo(
    () => [
      {
        header: "Task",
        accessor: "name",
        render: (row) => (
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-slate-400" />
            <div>
              <span className="font-medium">{row.name || row.id}</span>
              {row.description && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {row.description}
                </p>
              )}
            </div>
          </div>
        ),
      },
      {
        header: "Code",
        accessor: "code",
        render: (row) => (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Tag className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-mono">{row.code || "—"}</span>
          </div>
        ),
      },
      {
        header: "Status",
        accessor: "status",
        render: (row) => {
          const badge = getStatusBadge(row.status);
          return <Badge tone={badge.tone}>{badge.label}</Badge>;
        },
      },
      {
        header: "Priority",
        render: (row) => {
          const badge = getPriorityBadge(row.priority);
          return (
            <Badge tone={badge.tone} size="sm">
              {badge.label}
            </Badge>
          );
        },
      },
      {
        header: "Assigned To",
        render: (row) => (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            {getUserDisplayName(row.assigned_to)}
          </div>
        ),
      },
      {
        header: "Hours",
        render: (row) => {
          const est = row.estimated_hours;
          const actual = row.actual_hours;
          return (
            <div className="text-sm text-slate-700">
              {est ? `${est}h` : "—"}
              {actual && ` / ${actual}h`}
            </div>
          );
        },
      },
      {
        header: "Dates",
        render: (row) => {
          if (row.start_date || row.end_date) {
            return (
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {row.start_date && formatDate(row.start_date)}
                {row.end_date && ` → ${formatDate(row.end_date)}`}
                {row.completed_date && (
                  <span className="text-green-600 ml-1">
                    (Completed: {formatDate(row.completed_date)})
                  </span>
                )}
              </div>
            );
          }
          return "—";
        },
      },
      {
        header: "Actions",
        render: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openModal("editTask", row)}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Edit Task</span>
              </DropdownMenuItem>

              {row.status === "draft" && (
                <DropdownMenuItem
                  onClick={() => openActionModal("activate", row, true)}
                >
                  <PlayCircle className="mr-2 h-4 w-4 text-green-600" />
                  <span>Activate Task</span>
                </DropdownMenuItem>
              )}

              {row.status === "active" && (
                <>
                  <DropdownMenuItem
                    onClick={() => openActionModal("complete", row, true)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4 text-blue-600" />
                    <span>Complete Task</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openActionModal("archive", row, true)}
                  >
                    <Archive className="mr-2 h-4 w-4 text-amber-600" />
                    <span>Archive Task</span>
                  </DropdownMenuItem>
                </>
              )}

              {row.status === "completed" && (
                <DropdownMenuItem
                  onClick={() => openActionModal("archive", row, true)}
                >
                  <Archive className="mr-2 h-4 w-4 text-amber-600" />
                  <span>Archive Task</span>
                </DropdownMenuItem>
              )}

              {row.status === "archived" && (
                <DropdownMenuItem
                  onClick={() => openActionModal("activate", row, true)}
                >
                  <RotateCcw className="mr-2 h-4 w-4 text-green-600" />
                  <span>Restore Task</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  // ============================
  // Loading & Error States
  // ============================

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Loading Project..."
          icon={FolderKanban}
          actions={
            <Button
              variant="outline"
              leftIcon={ArrowLeft}
              onClick={() => navigate(ROUTES.projects)}
            >
              Back
            </Button>
          }
        />
        <ContentCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-500">Loading project details...</div>
          </div>
        </ContentCard>
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Error"
          icon={FolderKanban}
          actions={
            <Button
              variant="outline"
              leftIcon={ArrowLeft}
              onClick={() => navigate(ROUTES.projects)}
            >
              Back
            </Button>
          }
        />
        <ContentCard>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-lg font-medium text-slate-900">
              Failed to load project
            </div>
            <div className="text-slate-500">{projectError.message}</div>
            <Button onClick={() => refetchProject()}>Retry</Button>
          </div>
        </ContentCard>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Project Not Found"
          icon={FolderKanban}
          actions={
            <Button
              variant="outline"
              leftIcon={ArrowLeft}
              onClick={() => navigate(ROUTES.projects)}
            >
              Back
            </Button>
          }
        />
        <ContentCard>
          <div className="py-12 text-center text-slate-500">
            The requested project could not be found.
          </div>
        </ContentCard>
      </div>
    );
  }

  // ============================
  // Main Render
  // ============================

  return (
    <div className="min-h-screen bg-gray-50 space-y-6">
      {/* Header */}
      <PageHeader
        title={project.name || "Untitled Project"}
        subtitle={
          <div className="flex items-center gap-3 mt-1">
            <Badge
              tone={
                project.status === "active"
                  ? "success"
                  : project.status === "completed"
                    ? "info"
                    : project.status === "archived"
                      ? "default"
                      : "muted"
              }
            >
              {project.status || "draft"}
            </Badge>
            {project.code && (
              <span className="text-sm text-slate-600">
                Code: {project.code}
              </span>
            )}
            {project.start_date && project.end_date && (
              <span className="text-sm text-slate-600">
                {formatDate(project.start_date)} -{" "}
                {formatDate(project.end_date)}
              </span>
            )}
          </div>
        }
        icon={FolderKanban}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={ArrowLeft}
              onClick={() => navigate(ROUTES.projects)}
            >
              Back
            </Button>
            <Button
              variant="outline"
              leftIcon={RefreshCw}
              onClick={handleRefresh}
              loading={projectLoading || phasesLoading || tasksLoading}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Main Content - Split View */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Phases */}
        <ContentCard>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Layers3 className="h-5 w-5 text-slate-500" />
                Phases
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {phases.length} phase{phases.length !== 1 ? "s" : ""} in this
                project
              </p>
            </div>
            <Button
              leftIcon={Plus}
              onClick={() => openModal("createPhase")}
              size="sm"
            >
              New Phase
            </Button>
          </div>

          {phases.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-lg">
              <Layers3 className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-slate-900 mb-1">
                No phases yet
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Create your first phase to organize project work
              </p>
              <Button onClick={() => openModal("createPhase")} size="sm">
                Create Phase
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {phases.map((phase) => {
                const isSelected = selectedPhaseId === phase.id;
                const isExpanded = expandedPhases.has(phase.id);
                const phaseTasks = phase.tasks || [];
                const badge = getStatusBadge(phase.status);

                return (
                  <div
                    key={phase.id}
                    className={`border rounded-lg overflow-hidden ${
                      isSelected
                        ? "border-blue-300 ring-1 ring-blue-200"
                        : "border-slate-200"
                    }`}
                  >
                    {/* Phase Header */}
                    <div
                      className={`flex items-center justify-between p-4 cursor-pointer ${
                        isSelected ? "bg-blue-50/50" : "hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        setSelectedPhaseId(phase.id);
                        if (!isExpanded) {
                          togglePhaseExpand(phase.id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePhaseExpand(phase.id);
                          }}
                          className="p-1 hover:bg-slate-200 rounded"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-500" />
                          )}
                        </button>
                        <Layers3
                          className={`h-5 w-5 ${isSelected ? "text-blue-600" : "text-slate-400"}`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-semibold ${isSelected ? "text-blue-900" : "text-slate-900"}`}
                            >
                              {phase.name}
                            </span>
                            {phase.code && (
                              <Badge tone="muted" size="sm">
                                {phase.code}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <Badge tone={badge.tone} size="sm">
                              {badge.label}
                            </Badge>
                            <span>
                              {phaseTasks.length} task
                              {phaseTasks.length !== 1 ? "s" : ""}
                            </span>
                            {phase.description && (
                              <span className="text-slate-400 line-clamp-1">
                                {phase.description}
                              </span>
                            )}
                          </div>
                          {(phase.start_date || phase.end_date) && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                              <Calendar className="h-3 w-3" />
                              {phase.start_date && formatDate(phase.start_date)}
                              {phase.end_date &&
                                ` → ${formatDate(phase.end_date)}`}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Phase Actions */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openModal("editPhase", phase)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit Phase</span>
                            </DropdownMenuItem>

                            {phase.status === "draft" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  openActionModal("activate", phase)
                                }
                              >
                                <PlayCircle className="mr-2 h-4 w-4 text-green-600" />
                                <span>Activate Phase</span>
                              </DropdownMenuItem>
                            )}

                            {phase.status === "active" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    openActionModal("complete", phase)
                                  }
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4 text-blue-600" />
                                  <span>Complete Phase</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    openActionModal("archive", phase)
                                  }
                                >
                                  <Archive className="mr-2 h-4 w-4 text-amber-600" />
                                  <span>Archive Phase</span>
                                </DropdownMenuItem>
                              </>
                            )}

                            {phase.status === "completed" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  openActionModal("archive", phase)
                                }
                              >
                                <Archive className="mr-2 h-4 w-4 text-amber-600" />
                                <span>Archive Phase</span>
                              </DropdownMenuItem>
                            )}

                            {phase.status === "archived" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  openActionModal("activate", phase)
                                }
                              >
                                <RotateCcw className="mr-2 h-4 w-4 text-green-600" />
                                <span>Restore Phase</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Phase Tasks (when expanded) */}
                    {isExpanded && selectedPhaseId === phase.id && (
                      <div className="border-t border-slate-200 bg-slate-50/50 p-4">
                        {phaseTasks.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-slate-500 mb-3">
                              No tasks in this phase
                            </p>
                            <Button
                              size="sm"
                              leftIcon={Plus}
                              onClick={() => {
                                setSelectedPhaseId(phase.id);
                                openModal("createTask");
                              }}
                            >
                              Add Task
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {phaseTasks.map((task) => {
                              const taskBadge = getStatusBadge(task.status);
                              const priorityBadge = getPriorityBadge(
                                task.priority,
                              );
                              return (
                                <div
                                  key={task.id}
                                  className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <ListTodo className="h-4 w-4 text-slate-400" />
                                      <div>
                                        <span className="text-sm font-medium text-slate-900">
                                          {task.name}
                                        </span>
                                        {task.code && (
                                          <span className="ml-2 text-xs text-slate-500">
                                            ({task.code})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                        >
                                          <MoreVertical className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedTask(task);
                                            openModal("editTask", task);
                                          }}
                                        >
                                          <Edit className="mr-2 h-4 w-4" />
                                          <span>Edit Task</span>
                                        </DropdownMenuItem>

                                        {task.status === "draft" && (
                                          <DropdownMenuItem
                                            onClick={() =>
                                              openActionModal(
                                                "activate",
                                                task,
                                                true,
                                              )
                                            }
                                          >
                                            <PlayCircle className="mr-2 h-4 w-4 text-green-600" />
                                            <span>Activate Task</span>
                                          </DropdownMenuItem>
                                        )}

                                        {task.status === "active" && (
                                          <>
                                            <DropdownMenuItem
                                              onClick={() =>
                                                openActionModal(
                                                  "complete",
                                                  task,
                                                  true,
                                                )
                                              }
                                            >
                                              <CheckCircle2 className="mr-2 h-4 w-4 text-blue-600" />
                                              <span>Complete Task</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() =>
                                                openActionModal(
                                                  "archive",
                                                  task,
                                                  true,
                                                )
                                              }
                                            >
                                              <Archive className="mr-2 h-4 w-4 text-amber-600" />
                                              <span>Archive Task</span>
                                            </DropdownMenuItem>
                                          </>
                                        )}

                                        {task.status === "completed" && (
                                          <DropdownMenuItem
                                            onClick={() =>
                                              openActionModal(
                                                "archive",
                                                task,
                                                true,
                                              )
                                            }
                                          >
                                            <Archive className="mr-2 h-4 w-4 text-amber-600" />
                                            <span>Archive Task</span>
                                          </DropdownMenuItem>
                                        )}

                                        {task.status === "archived" && (
                                          <DropdownMenuItem
                                            onClick={() =>
                                              openActionModal(
                                                "activate",
                                                task,
                                                true,
                                              )
                                            }
                                          >
                                            <RotateCcw className="mr-2 h-4 w-4 text-green-600" />
                                            <span>Restore Task</span>
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                                    <Badge tone={taskBadge.tone} size="sm">
                                      {taskBadge.label}
                                    </Badge>
                                    <Badge tone={priorityBadge.tone} size="sm">
                                      {priorityBadge.label}
                                    </Badge>
                                    {task.assigned_to && (
                                      <span className="flex items-center gap-1 text-slate-600">
                                        <Users className="h-3 w-3" />
                                        {task.assigned_to}
                                      </span>
                                    )}
                                    <span className="flex items-center gap-1 text-slate-600">
                                      <Briefcase className="h-3 w-3" />
                                      {task.estimated_hours
                                        ? `${task.estimated_hours}h`
                                        : "—"}
                                      {task.actual_hours &&
                                        ` (${task.actual_hours}h actual)`}
                                    </span>
                                  </div>

                                  {task.description && (
                                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}

                                  {(task.start_date ||
                                    task.end_date ||
                                    task.completed_date) && (
                                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                                      <Calendar className="h-3 w-3" />
                                      {task.start_date &&
                                        formatDate(task.start_date)}
                                      {task.end_date &&
                                        ` → ${formatDate(task.end_date)}`}
                                      {task.completed_date && (
                                        <Badge tone="success" size="sm">
                                          Completed:{" "}
                                          {formatDate(task.completed_date)}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ContentCard>

        {/* Right Column - Tasks for Selected Phase */}
        <ContentCard>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-slate-500" />
                Tasks
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {selectedPhaseId
                  ? `${filteredTasks.length} task${filteredTasks.length !== 1 ? "s" : ""} in selected phase`
                  : "Select a phase to view tasks"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={Filter}
                onClick={() => setShowFilters(!showFilters)}
                disabled={!selectedPhaseId}
              >
                Filter
              </Button>
              <Button
                leftIcon={Plus}
                onClick={() => openModal("createTask")}
                size="sm"
                disabled={!selectedPhaseId}
              >
                New Task
              </Button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && selectedPhaseId && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-700">
                  Filters
                </span>
                <button
                  onClick={() =>
                    setFilters({ status: "", search: "", priority: "" })
                  }
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Clear all
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Select
                  size="sm"
                  label="Status"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, status: e.target.value }))
                  }
                  options={[
                    { label: "All Statuses", value: "" },
                    { label: "Draft", value: "draft" },
                    { label: "Active", value: "active" },
                    { label: "Completed", value: "completed" },
                    { label: "Archived", value: "archived" },
                  ]}
                />
                <Select
                  size="sm"
                  label="Priority"
                  value={filters.priority}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, priority: e.target.value }))
                  }
                  options={[
                    { label: "All Priorities", value: "" },
                    { label: "Critical", value: "critical" },
                    { label: "High", value: "high" },
                    { label: "Medium", value: "medium" },
                    { label: "Low", value: "low" },
                  ]}
                />
                <Input
                  size="sm"
                  label="Search"
                  placeholder="Search tasks..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, search: e.target.value }))
                  }
                  leftIcon={Search}
                />
              </div>
            </div>
          )}

          {!selectedPhaseId ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-lg">
              <Target className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-slate-900 mb-1">
                No Phase Selected
              </h3>
              <p className="text-sm text-slate-500">
                Select a phase from the left panel to view its tasks
              </p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-lg">
              <ListTodo className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-slate-900 mb-1">
                No Tasks Found
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                {filters.status || filters.search || filters.priority
                  ? "Try adjusting your filters"
                  : "Create your first task to start tracking work"}
              </p>
              {!filters.status && !filters.search && !filters.priority && (
                <Button onClick={() => openModal("createTask")} size="sm">
                  Create Task
                </Button>
              )}
            </div>
          ) : (
            <DataTable
              columns={taskColumns}
              rows={filteredTasks}
              isLoading={tasksLoading}
              empty={{
                title: "No tasks",
                description: "Create a task to start tracking work.",
              }}
            />
          )}
        </ContentCard>
      </div>

      {/* ============================ */}
      {/* Modals */}
      {/* ============================ */}

      {/* Create/Edit Phase Modal */}
      <Modal
        open={modals.createPhase || modals.editPhase}
        onClose={() =>
          closeModal(modals.createPhase ? "createPhase" : "editPhase")
        }
        title={modals.editPhase ? "Edit Phase" : "Create New Phase"}
        size="lg"
      >
        <div className="space-y-4">
          {/* Info Section */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowPhaseInfo(!showPhaseInfo)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <Info className="h-4 w-4" />
              <span>Phase creation info</span>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${showPhaseInfo ? "rotate-90" : ""}`}
              />
            </button>

            {showPhaseInfo && (
              <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <Layers3 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <div className="font-medium mb-1">
                      {modals.editPhase
                        ? "Edit phase details"
                        : "Create a new project phase"}
                    </div>
                    <div className="text-blue-700">
                      Phases help organize project work into logical stages.
                      Each phase can contain multiple tasks.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Phase Name"
                placeholder="e.g., Planning, Development, Testing"
                value={phaseForm.name}
                onChange={(e) =>
                  setPhaseForm((f) => ({ ...f, name: e.target.value }))
                }
                error={formErrors.name}
                leftIcon={Layers3}
                required
              />
            </div>

            <div>
              <Input
                label="Phase Code"
                placeholder="e.g., PH-001"
                value={phaseForm.code}
                onChange={(e) =>
                  setPhaseForm((f) => ({ ...f, code: e.target.value }))
                }
                error={formErrors.code}
                leftIcon={Tag}
                helperText="Required, max 20 characters"
                required
              />
            </div>

            <div>
              <Select
                label="Status"
                value={phaseForm.status}
                onChange={(e) =>
                  setPhaseForm((f) => ({ ...f, status: e.target.value }))
                }
                options={[
                  { label: "Draft", value: "draft" },
                  { label: "Active", value: "active" },
                  { label: "Completed", value: "completed" },
                  { label: "Archived", value: "archived" },
                ]}
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Description (Optional)"
                placeholder="Describe the purpose of this phase"
                value={phaseForm.description}
                onChange={(e) =>
                  setPhaseForm((f) => ({ ...f, description: e.target.value }))
                }
                leftIcon={FileText}
              />
            </div>

            <div>
              <Input
                label="Start Date (Optional)"
                type="date"
                value={phaseForm.start_date}
                onChange={(e) =>
                  setPhaseForm((f) => ({ ...f, start_date: e.target.value }))
                }
                leftIcon={Calendar}
              />
            </div>

            <div>
              <Input
                label="End Date (Optional)"
                type="date"
                value={phaseForm.end_date}
                onChange={(e) =>
                  setPhaseForm((f) => ({ ...f, end_date: e.target.value }))
                }
                leftIcon={Calendar}
                error={formErrors.end_date}
              />
            </div>
          </div>

          {/* Status Change Warning */}
          {modals.editPhase &&
            selectedPhase?.status === "archived" &&
            phaseForm.status !== "archived" && (
              <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Restoring this phase will make it visible again in project
                  views.
                </p>
              </div>
            )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() =>
              closeModal(modals.createPhase ? "createPhase" : "editPhase")
            }
            disabled={
              createPhaseMutation.isPending || updatePhaseMutation.isPending
            }
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              modals.editPhase
                ? updatePhaseMutation.mutate()
                : createPhaseMutation.mutate()
            }
            loading={
              modals.editPhase
                ? updatePhaseMutation.isPending
                : createPhaseMutation.isPending
            }
            leftIcon={modals.editPhase ? Edit : Plus}
          >
            {modals.editPhase ? "Update Phase" : "Create Phase"}
          </Button>
        </div>
      </Modal>

      {/* Create/Edit Task Modal */}
      <Modal
        open={modals.createTask || modals.editTask}
        onClose={() =>
          closeModal(modals.createTask ? "createTask" : "editTask")
        }
        title={modals.editTask ? "Edit Task" : "Create New Task"}
        size="lg"
      >
        <div className="space-y-4">
          {/* Info Section */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowTaskInfo(!showTaskInfo)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <Info className="h-4 w-4" />
              <span>Task creation info</span>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${showTaskInfo ? "rotate-90" : ""}`}
              />
            </button>

            {showTaskInfo && (
              <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <ListTodo className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <div className="font-medium mb-1">
                      {modals.editTask
                        ? "Edit task details"
                        : "Create a new task"}
                    </div>
                    <div className="text-blue-700">
                      Tasks represent specific work items within a phase. Track
                      status, priority, and estimates.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Task Name"
                placeholder="e.g., Design review, Code implementation"
                value={taskForm.name}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, name: e.target.value }))
                }
                error={formErrors.name}
                leftIcon={ListTodo}
                required
              />
            </div>

            <div>
              <Input
                label="Task Code (Optional)"
                placeholder="e.g., TASK-001"
                value={taskForm.code}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, code: e.target.value }))
                }
                error={formErrors.code}
                leftIcon={Tag}
                helperText="Max 20 characters"
              />
            </div>

            <div>
              <Select
                label="Status"
                value={taskForm.status}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, status: e.target.value }))
                }
                options={[
                  { label: "Draft", value: "draft" },
                  { label: "Active", value: "active" },
                  { label: "Completed", value: "completed" },
                  { label: "Archived", value: "archived" },
                ]}
              />
            </div>

            <div>
              <Select
                label="Priority"
                value={taskForm.priority}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, priority: e.target.value }))
                }
                options={[
                  { label: "Critical", value: "critical" },
                  { label: "High", value: "high" },
                  { label: "Medium", value: "medium" },
                  { label: "Low", value: "low" },
                ]}
              />
            </div>

            <div>
              <Select
                label="Assigned To"
                value={taskForm.assigned_to}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, assigned_to: e.target.value }))
                }
                leftIcon={Users}
                options={[
                  { label: "Unassigned", value: "" },
                  ...(userList.data
                    ?.filter((user) => user.status !== "deleted")
                    .map((user) => ({
                      label: user.full_name || user.email,
                      value: user.id,
                    })) || []),
                ]}
                isLoading={userList.isLoading}
                helperText="Select a user to assign this task"
              />
            </div>

            <div>
              <Input
                label="Estimated Hours (Optional)"
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g., 8"
                value={taskForm.estimated_hours}
                onChange={(e) =>
                  setTaskForm((f) => ({
                    ...f,
                    estimated_hours: e.target.value,
                  }))
                }
                error={formErrors.estimated_hours}
                leftIcon={Briefcase}
              />
            </div>

            <div>
              <Input
                label="Actual Hours (Optional)"
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g., 7.5"
                value={taskForm.actual_hours}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, actual_hours: e.target.value }))
                }
                error={formErrors.actual_hours}
                leftIcon={Clock}
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Description (Optional)"
                placeholder="Describe the task requirements"
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, description: e.target.value }))
                }
                leftIcon={FileText}
              />
            </div>

            <div>
              <Input
                label="Start Date (Optional)"
                type="date"
                value={taskForm.start_date}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, start_date: e.target.value }))
                }
                leftIcon={Calendar}
              />
            </div>

            <div>
              <Input
                label="End Date (Optional)"
                type="date"
                value={taskForm.end_date}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, end_date: e.target.value }))
                }
                leftIcon={Calendar}
                error={formErrors.end_date}
              />
            </div>

            {taskForm.status === "completed" && (
              <div className="md:col-span-2">
                <Input
                  label="Completed Date"
                  type="date"
                  value={taskForm.completed_date}
                  onChange={(e) =>
                    setTaskForm((f) => ({
                      ...f,
                      completed_date: e.target.value,
                    }))
                  }
                  leftIcon={CheckCircle2}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() =>
              closeModal(modals.createTask ? "createTask" : "editTask")
            }
            disabled={
              createTaskMutation.isPending || updateTaskMutation.isPending
            }
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              modals.editTask
                ? updateTaskMutation.mutate()
                : createTaskMutation.mutate()
            }
            loading={
              modals.editTask
                ? updateTaskMutation.isPending
                : createTaskMutation.isPending
            }
            leftIcon={modals.editTask ? Edit : Plus}
            disabled={!selectedPhaseId}
          >
            {modals.editTask ? "Update Task" : "Create Task"}
          </Button>
        </div>
      </Modal>

      {/* Archive/Activate/Complete Confirmation Modal */}
      <Modal
        open={
          modals.archiveConfirm ||
          modals.activateConfirm ||
          modals.completeConfirm
        }
        onClose={closeActionModal}
        title={
          modals.archiveConfirm
            ? "Archive Item"
            : modals.activateConfirm
              ? "Activate Item"
              : "Complete Item"
        }
        size="md"
      >
        <div className="px-6 py-5">
          <div className="flex items-start gap-3">
            {modals.archiveConfirm && (
              <Archive className="h-6 w-6 text-amber-600 flex-shrink-0" />
            )}
            {modals.activateConfirm && (
              <PlayCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            )}
            {modals.completeConfirm && (
              <CheckCircle2 className="h-6 w-6 text-blue-600 flex-shrink-0" />
            )}

            <div>
              <p className="text-sm text-slate-600 mb-2">
                {modals.archiveConfirm &&
                  `Are you sure you want to archive "${selectedPhase?.name || selectedTask?.name || "this item"}"?`}
                {modals.activateConfirm &&
                  `Are you sure you want to activate "${selectedPhase?.name || selectedTask?.name || "this item"}"?`}
                {modals.completeConfirm &&
                  `Are you sure you want to mark "${selectedPhase?.name || selectedTask?.name || "this item"}" as completed?`}
              </p>
              <p className="text-sm font-medium text-slate-900">
                {modals.archiveConfirm &&
                  "Archived items become read-only and are hidden from most views."}
                {modals.activateConfirm &&
                  "Activated items become visible and can be used in planning."}
                {modals.completeConfirm &&
                  "Completed items are marked as finished and can be reviewed later."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={closeActionModal}
            disabled={
              archivePhaseMutation.isPending ||
              activatePhaseMutation.isPending ||
              completePhaseMutation.isPending ||
              archiveTaskMutation.isPending ||
              activateTaskMutation.isPending ||
              completeTaskMutation.isPending
            }
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (selectedPhase) {
                if (modals.archiveConfirm) archivePhaseMutation.mutate();
                else if (modals.activateConfirm) activatePhaseMutation.mutate();
                else if (modals.completeConfirm) completePhaseMutation.mutate();
              } else if (selectedTask) {
                if (modals.archiveConfirm) archiveTaskMutation.mutate();
                else if (modals.activateConfirm) activateTaskMutation.mutate();
                else if (modals.completeConfirm) completeTaskMutation.mutate();
              }
            }}
            loading={
              archivePhaseMutation.isPending ||
              activatePhaseMutation.isPending ||
              completePhaseMutation.isPending ||
              archiveTaskMutation.isPending ||
              activateTaskMutation.isPending ||
              completeTaskMutation.isPending
            }
            className={
              modals.archiveConfirm
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : modals.activateConfirm
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
            }
          >
            {modals.archiveConfirm
              ? "Archive"
              : modals.activateConfirm
                ? "Activate"
                : "Complete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
