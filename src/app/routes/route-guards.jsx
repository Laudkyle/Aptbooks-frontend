import React from 'react'; 
import { Navigate, Outlet, useLocation } from 'react-router-dom'; 
import { ROUTES } from '../constants/routes.js'; 
import { authStore } from '../store/auth.store.js'; 
import { usePermissions } from '../../shared/hooks/usePermissions.js'; 

export function ProtectedRoute() {
  const isAuthed = authStore((s) => Boolean(s.accessToken)); 
  const location = useLocation(); 
  if (!isAuthed) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />; 
  }
  return <Outlet />; 
}

export function GuestRoute() {
  const isAuthed = authStore((s) => Boolean(s.accessToken)); 
  if (isAuthed) return <Navigate to={ROUTES.dashboard} replace />; 
  return <Outlet />; 
}

export function PermissionGate({ any, all, ...props }) {
  const { hasAny, can } = usePermissions(); 
  let ok = true; 
  if (any) ok = hasAny(any); 
  if (all) ok = (all ?? []).every((p) => can(p)); 
  if (!ok) return props.fallback ?? null; 
  return props.children; 
}
