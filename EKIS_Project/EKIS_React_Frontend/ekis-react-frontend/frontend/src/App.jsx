import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import PermissionRoute from "./components/PermissionRoute";
import AppShell from "./components/AppShell";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Documents from "./pages/Documents";
import Settings from "./pages/Settings";
import Search from "./pages/Search";
import AdminUsers from "./pages/AdminUsers";
import Departments from "./pages/departments";

import React from "react";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          {/* Protected application routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>

              {/* Dashboard */}
              <Route
                path="/"
                element={<Dashboard />}
              />

              {/* AI Assistant */}
              <Route
                element={
                  <PermissionRoute permission="use_ai" />
                }
              >
                <Route
                  path="/chat"
                  element={<Chat />}
                />
              </Route>

              {/* Documents */}
              <Route
                path="/documents"
                element={<Documents />}
              />

              {/* Settings */}
              <Route
                path="/settings"
                element={<Settings />}
              />

              {/* Search */}
              <Route
                path="/search"
                element={<Search />}
              />

              {/* Admin-only routes */}
              <Route element={<AdminRoute />}>

                {/* Users */}
                <Route
                  path="/admin/users"
                  element={<AdminUsers />}
                />

                {/* Departments */}
                <Route
                  path="/admin/departments"
                  element={<Departments />}
                />

              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}