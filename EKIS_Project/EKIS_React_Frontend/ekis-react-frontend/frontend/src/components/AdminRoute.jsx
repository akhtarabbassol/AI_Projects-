import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute() {
  const { user, can } = useAuth();
  return can("manage_users") ? <Outlet /> : <Navigate to="/" replace />;
}