import { Navigate, Outlet } from 'react-router-dom';
import { getAdminToken } from '../lib/api';

export function RequireAuth() {
  if (!getAdminToken()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
