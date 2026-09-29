export const roles = {
  EMPLOYEE: "EMPLOYEE",
  ADMIN: "ADMIN",
  SUPERUSER: "SUPERUSER",
};

// ---------------------------------------------------------
// Role normalization
// ---------------------------------------------------------
// Backend is authoritative:
// SUPERUSER | ADMIN | EMPLOYEE
//
// Legacy frontend role names are kept as aliases so older
// UI code does not immediately break.
// ---------------------------------------------------------

const roleAliases = {
  // Backend values
  superuser: roles.SUPERUSER,
  admin: roles.ADMIN,
  employee: roles.EMPLOYEE,

  // Common variations
  super_admin: roles.SUPERUSER,
  superadmin: roles.SUPERUSER,
  administrator: roles.ADMIN,

  // Old frontend roles
  manager: roles.ADMIN,
  team_lead: roles.ADMIN,
  member: roles.EMPLOYEE,
  user: roles.EMPLOYEE,
  viewer: roles.EMPLOYEE,
};

export function getRole(user) {
  const rawRole = String(
    user?.role ||
      user?.user_role ||
      roles.EMPLOYEE
  )
    .trim()
    .toLowerCase();

  return roleAliases[rawRole] || roles.EMPLOYEE;
}


// ---------------------------------------------------------
// Company
// ---------------------------------------------------------

export function getCompanyId(user) {
  return (
    user?.company_id ??
    user?.organization_id ??
    user?.tenant_id ??
    user?.company?.id ??
    user?.organization?.id ??
    null
  );
}

export function getCompanyName(user) {
  return (
    user?.company?.name ??
    user?.company_name ??
    user?.organization?.name ??
    user?.organization_name ??
    user?.tenant_name ??
    "Your company"
  );
}


// ---------------------------------------------------------
// Department
// ---------------------------------------------------------
// Backend uses department_id.
// We keep team_id as a compatibility fallback for old UI code.
// ---------------------------------------------------------

export function getTeamId(user) {
  return (
    user?.department_id ??
    user?.team_id ??
    user?.department?.id ??
    user?.team?.id ??
    null
  );
}

export function getTeamName(user) {
  return (
    user?.department_name ??
    user?.team_name ??
    user?.department?.name ??
    user?.team?.name ??
    "All departments"
  );
}


// ---------------------------------------------------------
// Permissions
// ---------------------------------------------------------

export function canAccess(user, permission) {
  const role = getRole(user);

  const permissions = {
    // All authenticated roles can open their dashboard.
    view_dashboard: [
      roles.SUPERUSER,
      roles.ADMIN,
      roles.EMPLOYEE,
    ],

    // All authenticated roles can use the AI assistant.
    // Backend RAG scope will determine which documents
    // the user is actually allowed to retrieve.
    use_ai: [
      roles.SUPERUSER,
      roles.ADMIN,
      roles.EMPLOYEE,
    ],

    // All authenticated roles can view documents they
    // are authorized to access.
    view_documents: [
      roles.SUPERUSER,
      roles.ADMIN,
      roles.EMPLOYEE,
    ],

    // Document management is available to ADMIN and SUPERUSER.
    manage_documents: [
      roles.SUPERUSER,
      roles.ADMIN,
    ],

    // Analytics is NOT available to employees.
    view_analytics: [
      roles.SUPERUSER,
      roles.ADMIN,
    ],

    // User management.
    manage_users: [
      roles.SUPERUSER,
      roles.ADMIN,
    ],

    // Company management is SUPERUSER only.
    manage_companies: [
      roles.SUPERUSER,
    ],

    // Settings.
    manage_settings: [
      roles.SUPERUSER,
      roles.ADMIN,
      roles.EMPLOYEE,
    ],
  };

  return (
    permissions[permission]?.includes(role) || false
  );
}


// ---------------------------------------------------------
// Role helpers
// ---------------------------------------------------------

export function isAdmin(user) {
  return getRole(user) === roles.ADMIN;
}

export function isSuperAdmin(user) {
  return getRole(user) === roles.SUPERUSER;
}

export function isEmployee(user) {
  return getRole(user) === roles.EMPLOYEE;
}