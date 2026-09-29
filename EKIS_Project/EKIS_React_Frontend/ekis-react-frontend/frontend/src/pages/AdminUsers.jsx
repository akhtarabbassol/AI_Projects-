import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

import {
  createAdminUser,
  createCompany,
  getAdminUsers,
  getCompanies,
  removeAdminUser,
  removeCompany,
} from "../api/admin";

import { getDepartments } from "../api/departments";
import { getApiErrorMessage } from "../api/client";

import {
  demoCompanies,
  demoTeams,
  demoUsers,
  isDemoSession,
} from "../api/demo";

import {
  getRole,
  isSuperAdmin,
  roles,
} from "../auth/permissions";

import { useAuth } from "../context/AuthContext";

import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";


export default function AdminUsers() {
  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------

  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [view, setView] = useState("users");
  const [companyFilter, setCompanyFilter] = useState("all");

  const [modal, setModal] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    company_id: "",
    department_id: "",
    role: roles.EMPLOYEE,

    // Used only by the Create Company form
    adminName: "",
    adminEmail: "",
  });

  const [createdCredentials, setCreatedCredentials] =
    useState(null);

  const [state, setState] = useState({
    loading: true,
    error: "",
  });


  // ---------------------------------------------------------
  // Auth
  // ---------------------------------------------------------

  const { user } = useAuth();

  const superAdmin = isSuperAdmin(user);

  const currentCompanyId =
    user?.company_id ??
    user?.organization_id ??
    user?.tenant_id ??
    null;


  // ---------------------------------------------------------
  // Load users
  // ---------------------------------------------------------

  const loadUsers = async () => {
    try {
      const { data } = await getAdminUsers();

      const list =
        data?.users ||
        data?.items ||
        data?.data ||
        data ||
        [];

      setUsers(
        Array.isArray(list)
          ? list
          : []
      );
    } catch (err) {
      throw err;
    }
  };


  // ---------------------------------------------------------
  // Load companies
  // ---------------------------------------------------------

  const loadCompanies = async () => {
    if (!superAdmin) {
      setCompanies([]);
      return;
    }

    const { data } = await getCompanies();

    const list =
      Array.isArray(data)
        ? data
        : data?.items ||
          data?.companies ||
          data?.data ||
          [];

    setCompanies(
      Array.isArray(list)
        ? list
        : []
    );
  };


  // ---------------------------------------------------------
  // Load all page data
  // ---------------------------------------------------------

  const load = async () => {
    setState({
      loading: true,
      error: "",
    });

    try {
      // -----------------------------------------------------
      // Demo mode
      // -----------------------------------------------------

      if (isDemoSession()) {
        const savedUsers = JSON.parse(
          localStorage.getItem("ekis_demo_users") ||
            "null"
        );

        const savedCompanies = JSON.parse(
          localStorage.getItem(
            "ekis_demo_companies"
          ) || "null"
        );

        setUsers(
          savedUsers || demoUsers
        );

        setCompanies(
          savedCompanies || demoCompanies
        );

        setState({
          loading: false,
          error: "",
        });

        return;
      }


      // -----------------------------------------------------
      // Production
      // -----------------------------------------------------

      await Promise.all([
        loadUsers(),
        loadCompanies(),
      ]);

      setState({
        loading: false,
        error: "",
      });

    } catch (err) {
      setState({
        loading: false,
        error: getApiErrorMessage(
          err,
          "Unable to load access management data."
        ),
      });
    }
  };


  useEffect(() => {
    if (!user) return;

    load();
  }, [user]);


  // ---------------------------------------------------------
  // Load departments when selected company changes
  // ---------------------------------------------------------

  useEffect(() => {
    const loadSelectedDepartments = async () => {
      if (!form.company_id) {
        setDepartments([]);
        return;
      }

      try {
        // ---------------------------------------------------
        // Demo mode
        // ---------------------------------------------------

        if (isDemoSession()) {
          setDepartments(
            Array.isArray(demoTeams)
              ? demoTeams
              : []
          );

          return;
        }


        // ---------------------------------------------------
        // Production
        // ---------------------------------------------------

        const { data } =
          await getDepartments(
            form.company_id
          );

        const list =
          Array.isArray(data)
            ? data
            : data?.items ||
              data?.departments ||
              data?.data ||
              [];

        setDepartments(
          Array.isArray(list)
            ? list
            : []
        );

      } catch (err) {
        console.error(
          "Failed to load departments:",
          err
        );

        setDepartments([]);
      }
    };

    loadSelectedDepartments();
  }, [form.company_id]);


  // ---------------------------------------------------------
  // Visible users
  // ---------------------------------------------------------

  const visibleUsers = useMemo(() => {
    const scopedUsers = superAdmin
      ? users
      : users.filter(
          (item) =>
            Number(
              item?.company_id ??
                item?.organization_id ??
                item?.tenant_id
            ) === Number(currentCompanyId)
        );

    if (companyFilter === "all") {
      return scopedUsers;
    }

    return scopedUsers.filter(
      (item) =>
        Number(
          item?.company_id ??
            item?.organization_id ??
            item?.tenant_id
        ) === Number(companyFilter)
    );
  }, [
    companyFilter,
    currentCompanyId,
    superAdmin,
    users,
  ]);


  // ---------------------------------------------------------
  // Open Add User modal
  // ---------------------------------------------------------

  const openUserModal = () => {
    const selectedCompany =
      superAdmin
        ? (
            companyFilter === "all"
              ? companies[0]?.id
              : companyFilter
          )
        : currentCompanyId;

    setForm({
      name: "",
      email: "",
      password: "",

      company_id:
        selectedCompany ??
        "",

      department_id: "",

      role: roles.EMPLOYEE,

      adminName: "",
      adminEmail: "",
    });

    setModal("user");
  };


  // ---------------------------------------------------------
  // Save user
  // ---------------------------------------------------------

  const saveUser = async (event) => {
    event.preventDefault();

    // Employee must have a department
    if (
      form.role === roles.EMPLOYEE &&
      !form.department_id
    ) {
      setState({
        loading: false,
        error:
          "Please select a department for the employee.",
      });

      return;
    }

    if (!isDemoSession()) {
      try {
        await createAdminUser(form);

        setModal(null);

        await load();

      } catch (err) {
        setState({
          loading: false,
          error: getApiErrorMessage(
            err,
            "Unable to create user."
          ),
        });
      }

      return;
    }


    // -------------------------------------------------------
    // Demo user
    // -------------------------------------------------------

    const company = companies.find(
      (item) =>
        Number(item.id) ===
        Number(form.company_id)
    );

    const department =
      departments.find(
        (item) =>
          Number(item.id) ===
          Number(form.department_id)
      );

    const next = [
      ...users,
      {
        id: `demo-user-${Date.now()}`,

        full_name: form.name,
        name: form.name,

        email: form.email,

        company_id:
          form.company_id,

        company_name:
          company?.name ||
          "Company",

        department_id:
          form.department_id,

        department_name:
          department?.name ||
          "Department",

        role:
          form.role,

        is_active: true,
        status: "Active",
      },
    ];

    setUsers(next);

    localStorage.setItem(
      "ekis_demo_users",
      JSON.stringify(next)
    );

    setModal(null);
  };


  // ---------------------------------------------------------
  // Remove user
  // ---------------------------------------------------------

  const removeUser = async (item) => {
    if (
      item.email === user?.email
    ) {
      return;
    }

    if (
      !window.confirm(
        `Remove ${
          item.full_name ||
          item.name ||
          item.email
        } from this company?`
      )
    ) {
      return;
    }


    if (!isDemoSession()) {
      try {
        await removeAdminUser(
          item.id ??
            item.user_id
        );

        await load();

      } catch (err) {
        setState({
          loading: false,
          error: getApiErrorMessage(
            err,
            "Unable to remove user."
          ),
        });
      }

      return;
    }


    const next =
      users.filter(
        (candidate) =>
          candidate.id !==
          item.id
      );

    setUsers(next);

    localStorage.setItem(
      "ekis_demo_users",
      JSON.stringify(next)
    );
  };


  // ---------------------------------------------------------
  // Open Create Company modal
  // ---------------------------------------------------------

  const openCompanyModal = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      company_id: "",
      department_id: "",
      role: roles.EMPLOYEE,
      adminName: "",
      adminEmail: "",
    });

    setModal("company");
  };


  // ---------------------------------------------------------
  // Save company
  // ---------------------------------------------------------

  const saveCompany = async (event) => {
    event.preventDefault();

    if (!isDemoSession()) {
      try {
        // Backend currently creates the company only.
        const { data } =
          await createCompany(form);

        const company =
          data?.company ||
          data;

        setCreatedCredentials({
          companyName:
            company?.name ||
            form.name,

          email:
            form.adminEmail,

          password:
            form.password,
        });

        setModal(null);

        await load();

      } catch (err) {
        setState({
          loading: false,
          error: getApiErrorMessage(
            err,
            "Unable to create company."
          ),
        });
      }

      return;
    }


    // -------------------------------------------------------
    // Demo company
    // -------------------------------------------------------

    const company = {
      id: `company-${Date.now()}`,
      name: form.name,
      users: 1,
      status: "Active",
    };

    const nextCompanies = [
      ...companies,
      company,
    ];

    const admin = {
      id: `demo-user-${Date.now()}-admin`,

      name: form.adminName,
      full_name: form.adminName,

      email: form.adminEmail,

      company_id: company.id,
      company_name: company.name,

      department_id: null,
      department_name: null,

      role: roles.ADMIN,

      status: "Active",
      is_active: true,
    };

    const nextUsers = [
      ...users,
      admin,
    ];

    setCompanies(nextCompanies);
    setUsers(nextUsers);

    localStorage.setItem(
      "ekis_demo_companies",
      JSON.stringify(nextCompanies)
    );

    localStorage.setItem(
      "ekis_demo_users",
      JSON.stringify(nextUsers)
    );

    setCreatedCredentials({
      companyName: company.name,
      email: form.adminEmail,
      password: form.password,
    });

    setModal(null);
  };


  // ---------------------------------------------------------
  // Remove company
  // ---------------------------------------------------------

  const removeCompanyItem = async (
    company
  ) => {
    if (
      !window.confirm(
        `Remove ${company.name}?`
      )
    ) {
      return;
    }


    if (!isDemoSession()) {
      try {
        await removeCompany(
          company.id
        );

        await load();

      } catch (err) {
        setState({
          loading: false,
          error: getApiErrorMessage(
            err,
            "Unable to remove company."
          ),
        });
      }

      return;
    }


    const next =
      companies.filter(
        (item) =>
          item.id !==
          company.id
      );

    setCompanies(next);

    localStorage.setItem(
      "ekis_demo_companies",
      JSON.stringify(next)
    );
  };


  // ---------------------------------------------------------
  // Loading / error
  // ---------------------------------------------------------

  if (state.loading) {
    return (
      <LoadingState
        label="Loading users..."
      />
    );
  }


  if (state.error) {
    return (
      <ErrorState
        message={state.error}
        onRetry={load}
      />
    );
  }


  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <section className="content-view active">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="overview-header admin-page-header">

        <div>
          <h1>
            Access Management
          </h1>

          <p>
            {superAdmin
              ? "Control companies, users, and platform access."
              : "Manage users inside your company only."}
          </p>
        </div>


        <div className="header-actions">

          {superAdmin && (
            <button
              className="btn-ghost"
              onClick={openCompanyModal}
            >
              <Building2 size={16} />
              Add company
            </button>
          )}


          <button
            className="btn-primary"
            onClick={openUserModal}
          >
            <Plus size={17} />
            Add user
          </button>

        </div>

      </div>


      {/* =====================================================
          SUMMARY
      ====================================================== */}

      <div className="access-summary">

        <div>
          <Users size={19} />

          <span>
            <strong>
              {visibleUsers.length}
            </strong>{" "}
            visible users
          </span>
        </div>


        <div>
          <ShieldCheck size={19} />

          <span>
            Access scope:{" "}
            <strong>
              {superAdmin
                ? "All companies"
                : user?.company_name ||
                  "Your company"}
            </strong>
          </span>
        </div>

      </div>


      {/* =====================================================
          TABS
      ====================================================== */}

      <div className="access-tabs">

        <button
          className={
            view === "users"
              ? "active"
              : ""
          }
          onClick={() =>
            setView("users")
          }
        >
          Users
        </button>


        {superAdmin && (
          <button
            className={
              view === "companies"
                ? "active"
                : ""
            }
            onClick={() =>
              setView("companies")
            }
          >
            Companies
          </button>
        )}

      </div>


      {/* =====================================================
          USERS
      ====================================================== */}

      {view === "users" && (
        <>

          {/* Company filter */}
          {superAdmin && (
            <div className="access-filter">

              <label>
                Company

                <select
                  value={companyFilter}
                  onChange={(event) =>
                    setCompanyFilter(
                      event.target.value
                    )
                  }
                >

                  <option value="all">
                    All companies
                  </option>

                  {companies.map(
                    (company) => (
                      <option
                        key={company.id}
                        value={company.id}
                      >
                        {company.name}
                      </option>
                    )
                  )}

                </select>

              </label>

            </div>
          )}


          {/* Empty */}
          {visibleUsers.length === 0 ? (

            <EmptyState
              title="No users found"
              text="Add a user to this company to grant access."
            />

          ) : (

            <div className="table-wrap">

              <table>

                <thead>

                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Company</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>

                </thead>


                <tbody>

                  {visibleUsers.map(
                    (item, index) => {

                      const company =
                        companies.find(
                          (company) =>
                            Number(company.id) ===
                            Number(item.company_id)
                        );

                      const department =
                        departments.find(
                          (department) =>
                            Number(department.id) ===
                            Number(item.department_id)
                        );

                      const role =
                        getRole(item);

                      const isCurrentUser =
                        item.email ===
                        user?.email;


                      return (
                        <tr
                          key={
                            item.id ??
                            item.user_id ??
                            index
                          }
                        >

                          <td>
                            <strong>
                              {item.full_name ||
                                item.name ||
                                "—"}
                            </strong>
                          </td>


                          <td>
                            {item.email ||
                              "—"}
                          </td>


                          <td>
                            {item.company_name ||
                              item.company?.name ||
                              company?.name ||
                              "—"}
                          </td>


                          <td>
                            {item.department_name ||
                              item.department?.name ||
                              department?.name ||
                              item.department_id ||
                              "—"}
                          </td>


                          <td>
                            <span className="role-pill">
                              {role}
                            </span>
                          </td>


                          <td>
                            <span
                              className={`status-badge ${
                                String(
                                  item.status ||
                                    (
                                      item.is_active
                                        ? "Active"
                                        : "Inactive"
                                    )
                                ).toLowerCase()
                              }`}
                            >
                              {item.status ||
                                (
                                  item.is_active
                                    ? "Active"
                                    : "Inactive"
                                )}
                            </span>
                          </td>


                          <td>

                            <button
                              className="danger-btn"
                              title={
                                isCurrentUser
                                  ? "You cannot remove yourself"
                                  : "Remove user"
                              }
                              disabled={
                                isCurrentUser
                              }
                              onClick={() =>
                                removeUser(item)
                              }
                            >
                              <Trash2 size={16} />
                            </button>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>
          )}

        </>
      )}


      {/* =====================================================
          COMPANIES
      ====================================================== */}

      {view === "companies" && (
        <div className="company-grid">

          {companies.map(
            (company) => (

              <div
                className="company-card"
                key={company.id}
              >

                <div className="company-card-icon">
                  <Building2 size={20} />
                </div>


                <div>

                  <h3>
                    {company.name}
                  </h3>

                  <p>
                    {
                      users.filter(
                        (item) =>
                          Number(
                            item.company_id
                          ) ===
                          Number(
                            company.id
                          )
                      ).length
                    }{" "}
                    users
                  </p>

                </div>


                <button
                  className="danger-btn"
                  onClick={() =>
                    removeCompanyItem(
                      company
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>

              </div>

            )
          )}

        </div>
      )}


      {/* =====================================================
          MODALS
      ====================================================== */}

      {modal && (

        <div className="modal-backdrop">

          <div className="modal-content access-modal">

            <div className="modal-header">

              <h3>
                {modal === "user"
                  ? "Add user"
                  : "Create company"}
              </h3>

              <button
                className="icon-btn"
                onClick={() =>
                  setModal(null)
                }
              >
                ×
              </button>

            </div>


            <form
              className="settings-form"
              onSubmit={
                modal === "user"
                  ? saveUser
                  : saveCompany
              }
            >


              {/* =================================================
                  ADD USER
              ================================================== */}

              {modal === "user" ? (

                <>

                  {/* Full name */}
                  <div className="form-group">

                    <label>
                      Full name
                    </label>

                    <input
                      required
                      value={
                        form.name
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          name:
                            event.target.value,
                        })
                      }
                    />

                  </div>


                  {/* Email */}
                  <div className="form-group">

                    <label>
                      Email
                    </label>

                    <input
                      required
                      type="email"
                      value={
                        form.email
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          email:
                            event.target.value,
                        })
                      }
                    />

                  </div>


                  {/* Password */}
                  <div className="form-group">

                    <label>
                      Temporary password
                    </label>

                    <input
                      required
                      type="password"
                      value={
                        form.password
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          password:
                            event.target.value,
                        })
                      }
                    />

                  </div>


                  {/* Company */}
                  <div className="form-group">

                    <label>
                      Company
                    </label>

                    <select
                      required
                      value={
                        form.company_id
                      }
                      disabled={!superAdmin}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          company_id:
                            event.target.value,
                          department_id:
                            "",
                        })
                      }
                    >

                      <option value="">
                        Select company
                      </option>

                      {companies
                        .filter(
                          (company) =>
                            superAdmin ||
                            Number(
                              company.id
                            ) ===
                              Number(
                                currentCompanyId
                              )
                        )
                        .map(
                          (company) => (

                            <option
                              key={company.id}
                              value={company.id}
                            >
                              {company.name}
                            </option>

                          )
                        )}

                    </select>

                  </div>


                  {/* Role */}
                  <div className="form-group">

                    <label>
                      Role
                    </label>

                    <select
                      value={
                        form.role
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          role:
                            event.target.value,
                          department_id:
                            event.target.value ===
                            roles.ADMIN
                              ? ""
                              : form.department_id,
                        })
                      }
                    >

                      <option
                        value={
                          roles.EMPLOYEE
                        }
                      >
                        Employee
                      </option>


                      {superAdmin && (
                        <option
                          value={
                            roles.ADMIN
                          }
                        >
                          Company Admin
                        </option>
                      )}

                    </select>

                  </div>


                  {/* Department */}
                  <div className="form-group">

                    <label>
                      Department
                    </label>

                    <select
                      required={
                        form.role ===
                        roles.EMPLOYEE
                      }
                      value={
                        form.department_id
                      }
                      disabled={
                        !form.company_id ||
                        form.role ===
                          roles.ADMIN
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          department_id:
                            event.target.value,
                        })
                      }
                    >

                      <option value="">
                        {form.role ===
                        roles.ADMIN
                          ? "Not required for company admin"
                          : "Select department"}
                      </option>

                      {departments.map(
                        (department) => (

                          <option
                            key={
                              department.id
                            }
                            value={
                              department.id
                            }
                          >
                            {department.name}
                          </option>

                        )
                      )}

                    </select>

                  </div>

                </>

              ) : (

                /* ===============================================
                   CREATE COMPANY
                ================================================ */

                <>

                  {/* Company name */}
                  <div className="form-group">

                    <label>
                      Company name
                    </label>

                    <input
                      required
                      value={
                        form.name
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          name:
                            event.target.value,
                        })
                      }
                    />

                  </div>


                  {/* Admin name */}
                  <div className="form-group">

                    <label>
                      Company admin name
                    </label>

                    <input
                      required
                      value={
                        form.adminName ||
                        ""
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          adminName:
                            event.target.value,
                        })
                      }
                    />

                  </div>


                  {/* Admin email */}
                  <div className="form-group">

                    <label>
                      Company admin email
                    </label>

                    <input
                      required
                      type="email"
                      value={
                        form.adminEmail ||
                        ""
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          adminEmail:
                            event.target.value,
                        })
                      }
                    />

                  </div>


                  {/* Admin password */}
                  <div className="form-group">

                    <label>
                      Company admin password
                    </label>

                    <input
                      required
                      type="password"
                      value={
                        form.password
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          password:
                            event.target.value,
                        })
                      }
                    />

                  </div>

                </>

              )}


              {/* =================================================
                  FOOTER
              ================================================== */}

              <div className="modal-footer">

                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() =>
                    setModal(null)
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="btn-primary"
                >
                  {modal === "user"
                    ? "Create user"
                    : "Create company"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =====================================================
          CREATED CREDENTIALS
      ====================================================== */}

      {createdCredentials && (

        <div className="modal-backdrop">

          <div className="modal-content access-modal">

            <div className="modal-header">

              <h3>
                Company created
              </h3>

              <button
                className="icon-btn"
                onClick={() =>
                  setCreatedCredentials(
                    null
                  )
                }
              >
                ×
              </button>

            </div>


            <p className="muted credential-copy">
              Share these credentials
              with the new company
              administrator.
            </p>


            <div className="credential-box">

              <strong>
                {
                  createdCredentials.companyName
                }
              </strong>

              <span>
                Email:{" "}
                {
                  createdCredentials.email
                }
              </span>

              <span>
                Password:{" "}
                {
                  createdCredentials.password
                }
              </span>

            </div>


            <div className="modal-footer">

              <button
                className="btn-primary"
                onClick={() =>
                  setCreatedCredentials(
                    null
                  )
                }
              >
                Done
              </button>

            </div>

          </div>

        </div>

      )}

    </section>
  );
}