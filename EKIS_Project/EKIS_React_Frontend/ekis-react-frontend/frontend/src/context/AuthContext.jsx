import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCompanyId,
  getCompanyName,
  getRole,
  getTeamId,
  getTeamName,
  canAccess,
} from "../auth/permissions";

import { getCurrentUser } from "../api/auth";

const AuthContext = createContext(null);

function readUser() {
  try {
    return JSON.parse(
      localStorage.getItem("ekis_user") || "null"
    );
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("ekis_token")
  );

  const [user, setUser] = useState(readUser);

  const [loading, setLoading] = useState(
    Boolean(token)
  );

  /*
   * --------------------------------------------------
   * SUPERUSER SELECTED COMPANY
   * --------------------------------------------------
   *
   * This is the company selected from the Dashboard.
   *
   * Dashboard:
   *     select Kabir AI
   *
   * Then:
   *     Documents  -> Kabir AI
   *     Departments -> Kabir AI
   *
   * Only SUPERUSER uses this value.
   */
  const [selectedCompanyId, setSelectedCompanyId] =
    useState(() => {
      return (
        localStorage.getItem(
          "ekis_selected_company_id"
        ) || ""
      );
    });

  const [selectedCompanyName, setSelectedCompanyName] =
    useState(() => {
      return (
        localStorage.getItem(
          "ekis_selected_company_name"
        ) || ""
      );
    });

  /*
   * Load current authenticated user.
   */
  useEffect(() => {
    const loadCurrentUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await getCurrentUser();

        localStorage.setItem(
          "ekis_user",
          JSON.stringify(data)
        );

        setUser(data);
      } catch (error) {
        console.error(
          "Failed to load current user:",
          error
        );

        localStorage.removeItem("ekis_token");
        localStorage.removeItem("ekis_user");

        localStorage.removeItem(
          "ekis_selected_company_id"
        );

        localStorage.removeItem(
          "ekis_selected_company_name"
        );

        setToken(null);
        setUser(null);

        setSelectedCompanyId("");
        setSelectedCompanyName("");
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUser();
  }, [token]);

  /*
   * Logout event.
   */
  useEffect(() => {
    const handleLogout = () => {
      localStorage.removeItem("ekis_token");
      localStorage.removeItem("ekis_user");

      localStorage.removeItem(
        "ekis_selected_company_id"
      );

      localStorage.removeItem(
        "ekis_selected_company_name"
      );

      setToken(null);
      setUser(null);

      setSelectedCompanyId("");
      setSelectedCompanyName("");
    };

    window.addEventListener(
      "ekis:logout",
      handleLogout
    );

    return () => {
      window.removeEventListener(
        "ekis:logout",
        handleLogout
      );
    };
  }, []);

  /*
   * Sign in.
   */
  const signIn = (newToken) => {
    localStorage.setItem(
      "ekis_token",
      newToken
    );

    setToken(newToken);
  };

  /*
   * Sign out.
   */
  const signOut = () => {
    localStorage.removeItem("ekis_token");
    localStorage.removeItem("ekis_user");

    localStorage.removeItem(
      "ekis_selected_company_id"
    );

    localStorage.removeItem(
      "ekis_selected_company_name"
    );

    setToken(null);
    setUser(null);

    setSelectedCompanyId("");
    setSelectedCompanyName("");
  };

  /*
   * --------------------------------------------------
   * SET SELECTED COMPANY
   * --------------------------------------------------
   *
   * Dashboard calls:
   *
   *     setSelectedCompany(company.id, company.name)
   *
   * Documents and Departments can then read:
   *
   *     selectedCompanyId
   *
   * They do NOT need their own company selector.
   */
  const setSelectedCompany = (
    companyId,
    companyName = ""
  ) => {
    const normalizedId =
      companyId == null
        ? ""
        : String(companyId);

    const normalizedName =
      companyName == null
        ? ""
        : String(companyName);

    setSelectedCompanyId(
      normalizedId
    );

    setSelectedCompanyName(
      normalizedName
    );

    if (normalizedId) {
      localStorage.setItem(
        "ekis_selected_company_id",
        normalizedId
      );
    } else {
      localStorage.removeItem(
        "ekis_selected_company_id"
      );
    }

    if (normalizedName) {
      localStorage.setItem(
        "ekis_selected_company_name",
        normalizedName
      );
    } else {
      localStorage.removeItem(
        "ekis_selected_company_name"
      );
    }
  };

  /*
   * Clear selected company.
   */
  const clearSelectedCompany = () => {
    setSelectedCompanyId("");
    setSelectedCompanyName("");

    localStorage.removeItem(
      "ekis_selected_company_id"
    );

    localStorage.removeItem(
      "ekis_selected_company_name"
    );
  };

  /*
   * Context value.
   */
  const value = useMemo(
    () => ({
      token,
      user,

      role: getRole(user),

      /*
       * Authenticated user's own company.
       *
       * For ADMIN / EMPLOYEE this remains
       * the company they belong to.
       */
      companyId: getCompanyId(user),
      companyName: getCompanyName(user),

      teamId: getTeamId(user),
      teamName: getTeamName(user),

      /*
       * ------------------------------------------------
       * SUPERUSER COMPANY CONTEXT
       * ------------------------------------------------
       */
      selectedCompanyId,
      selectedCompanyName,

      setSelectedCompany,
      clearSelectedCompany,

      can: (permission) =>
        canAccess(user, permission),

      isAuthenticated:
        Boolean(token) && Boolean(user),

      loading,

      signIn,
      signOut,
    }),
    [
      token,
      user,
      loading,
      selectedCompanyId,
      selectedCompanyName,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () =>
  useContext(AuthContext);