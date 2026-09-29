import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Files,
  Settings,
  Users,
  Building2,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const items = [
  {
    to: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: "/chat",
    label: "AI Assistant",
    icon: MessageSquare,
    permission: "use_ai",
  },
  {
    to: "/documents",
    label: "Documents",
    icon: Files,
  },
  {
    to: "/admin/departments",
    label: "Departments",
    icon: Building2,
    permission: "manage_users",
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Settings,
  },
  {
    to: "/admin/users",
    label: "Users",
    icon: Users,
    permission: "manage_users",
  },
];

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, role, companyName, can, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName =
    user?.name ||
    user?.full_name ||
    user?.username ||
    "Alex Carter";

  const displayRole = role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const logout = () => {
    signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-container">
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X /> : <Menu />}
      </button>

      <aside
        className={`sidebar ${
          mobileOpen ? "mobile-open" : ""
        }`}
      >
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <Sparkles size={18} />
            </div>

            <span>EKIS</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {items
              .filter(
                (item) =>
                  !item.permission ||
                  can(item.permission)
              )
              .map(
                ({
                  to,
                  label,
                  icon: Icon,
                  end,
                }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      onClick={() =>
                        setMobileOpen(false)
                      }
                      className={({ isActive }) =>
                        `nav-item ${
                          isActive
                            ? "active"
                            : ""
                        }`
                      }
                    >
                      <Icon size={20} />
                      <span>{label}</span>
                    </NavLink>
                  </li>
                )
              )}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="upgrade-card">
            <h4>Go Premium</h4>

            <p>
              Unlock advanced RAG features
            </p>

            <button
              className="btn-primary-sm"
              onClick={() =>
                alert(
                  "Premium upgrade is not connected to the backend contract."
                )
              }
            >
              Upgrade
            </button>
          </div>

          <button
            className="logout-link"
            onClick={logout}
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-nav">
          <div className="search-container">
            <Search size={18} />

            <input
              placeholder="Search knowledge base..."
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  e.currentTarget.value.trim()
                ) {
                  navigate(
                    `/search?q=${encodeURIComponent(
                      e.currentTarget.value.trim()
                    )}`
                  );
                }
              }}
            />
          </div>

          <div className="user-actions">
            <button
              className="notification-bell"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="notification-dot" />
            </button>

            <div className="user-profile">
              <div className="avatar-circle">
                {displayName
                  .slice(0, 1)
                  .toUpperCase()}
              </div>

              <div className="user-info">
                <span className="user-name">
                  {displayName}
                </span>

                <span className="user-role">
                  {displayRole}
                </span>

                <span className="user-company">
                  {companyName}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}