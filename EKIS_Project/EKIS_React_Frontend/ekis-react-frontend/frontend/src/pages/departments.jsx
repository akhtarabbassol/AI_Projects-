import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Building2,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";

import {
  getDepartments,
  createDepartment,
} from "../api/departments";

import { getApiErrorMessage } from "../api/client";

import { useAuth } from "../context/AuthContext";

import {
  getRole,
  roles,
} from "../auth/permissions";

import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";


/* =========================================================
   NORMALIZE DEPARTMENTS
   ========================================================= */

function normalizeDepartments(data) {
  const list =
    data?.items ||
    data?.departments ||
    data?.data ||
    data ||
    [];

  return Array.isArray(list) ? list : [];
}


/* =========================================================
   COMPONENT
   ========================================================= */

export default function Departments() {

  /* =======================================================
     AUTH / GLOBAL COMPANY CONTEXT
     ======================================================= */

  const {
    user,
    selectedCompanyId,
    selectedCompanyName,
  } = useAuth();

  const role = getRole(user);

  const isSuperuser =
    role === roles.SUPERUSER;


  /* =======================================================
     STATE
     ======================================================= */

  const [departments, setDepartments] =
    useState([]);

  const [state, setState] =
    useState({
      loading: true,
      error: "",
    });

  const [modalOpen, setModalOpen] =
    useState(false);

  const [departmentName, setDepartmentName] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [formError, setFormError] =
    useState("");


  /* =======================================================
     LOAD DEPARTMENTS
     ======================================================= */

  const loadDepartments =
    useCallback(
      async () => {

        /*
         * SUPERUSER:
         *
         * The company is selected ONLY
         * from the Dashboard.
         *
         * Do not load departments when
         * no company has been selected.
         */

        if (
          isSuperuser &&
          !selectedCompanyId
        ) {
          setDepartments([]);

          setState({
            loading: false,
            error: "",
          });

          return;
        }


        setState({
          loading: true,
          error: "",
        });


        try {

          /*
           * SUPERUSER
           * -------------------------------
           * Uses Dashboard-selected company.
           *
           * ADMIN / EMPLOYEE
           * -------------------------------
           * Backend automatically scopes
           * to authenticated company.
           */

          const response =
            isSuperuser
              ? await getDepartments(
                  selectedCompanyId
                )
              : await getDepartments();


          console.log(
            "Departments API response:",
            response?.data
          );


          const items =
            normalizeDepartments(
              response?.data
            );


          console.log(
            "Normalized departments:",
            items
          );


          setDepartments(items);

          setState({
            loading: false,
            error: "",
          });

        } catch (error) {

          console.error(
            "Departments loading error:",
            error
          );

          setDepartments([]);

          setState({
            loading: false,
            error: getApiErrorMessage(
              error,
              "Unable to load departments."
            ),
          });

        }

      },
      [
        isSuperuser,
        selectedCompanyId,
      ]
    );


  /* =======================================================
     AUTOMATIC LOAD
     ======================================================= */

  useEffect(() => {

    loadDepartments();

  }, [
    loadDepartments,
  ]);


  /* =======================================================
     OPEN CREATE MODAL
     ======================================================= */

  const openCreateModal = () => {

    /*
     * Superuser must have a company
     * selected on Dashboard.
     */

    if (
      isSuperuser &&
      !selectedCompanyId
    ) {

      alert(
        "Please select a company from the Dashboard first."
      );

      return;
    }


    setDepartmentName("");
    setFormError("");
    setModalOpen(true);

  };


  /* =======================================================
     CLOSE CREATE MODAL
     ======================================================= */

  const closeCreateModal = () => {

    if (saving) {
      return;
    }

    setModalOpen(false);
    setDepartmentName("");
    setFormError("");

  };


  /* =======================================================
     CREATE DEPARTMENT
     ======================================================= */

  const handleCreateDepartment =
    async (event) => {

      event.preventDefault();


      /* ---------------------------------------------------
         VALIDATE NAME
         --------------------------------------------------- */

      const name =
        departmentName.trim();


      if (!name) {

        setFormError(
          "Department name is required."
        );

        return;
      }


      /* ---------------------------------------------------
         VALIDATE COMPANY
         --------------------------------------------------- */

      if (
        isSuperuser &&
        !selectedCompanyId
      ) {

        setFormError(
          "Please select a company from the Dashboard first."
        );

        return;
      }


      setSaving(true);
      setFormError("");


      try {

        const payload = {
          name,
        };


        /*
         * SUPERUSER:
         *
         * Send the company selected
         * on Dashboard.
         *
         * ADMIN:
         *
         * Backend determines company
         * from authenticated user.
         */

        if (isSuperuser) {

          payload.company_id =
            Number(
              selectedCompanyId
            );

        }


        await createDepartment(
          payload
        );


        /* -------------------------------------------------
           CLOSE MODAL
           ------------------------------------------------- */

        setModalOpen(false);
        setDepartmentName("");
        setFormError("");


        /* -------------------------------------------------
           RELOAD CURRENT COMPANY
           ------------------------------------------------- */

        await loadDepartments();

      } catch (error) {

        console.error(
          "Create department error:",
          error
        );

        setFormError(
          getApiErrorMessage(
            error,
            "Unable to create department."
          )
        );

      } finally {

        setSaving(false);

      }

    };


  /* =======================================================
     LOADING STATE
     ======================================================= */

  if (state.loading) {

    return (
      <LoadingState
        label="Loading departments..."
      />
    );

  }


  /* =======================================================
     ERROR STATE
     ======================================================= */

  if (state.error) {

    return (
      <ErrorState
        message={state.error}
        onRetry={loadDepartments}
      />
    );

  }


  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <section className="content-view active">

      {/* ===================================================
          HEADER
          =================================================== */}

      <div className="overview-header admin-page-header">

        <div>

          <h1>
            Departments
          </h1>

          <p>
            {isSuperuser
              ? selectedCompanyName
                ? `Manage departments for ${selectedCompanyName}.`
                : "Select a company from the Dashboard to manage its departments."
              : "Manage the departments available in your company."}
          </p>

        </div>


        {/* =================================================
            ACTIONS — RIGHT SIDE
            ================================================= */}

        <div className="header-actions">

          <button
            type="button"
            className="btn-ghost"
            onClick={
              loadDepartments
            }
            title="Refresh departments"
            disabled={
              state.loading
            }
          >

            <RefreshCw
              size={17}
            />

            Refresh

          </button>


          <button
            type="button"
            className="btn-primary"
            onClick={
              openCreateModal
            }
            disabled={
              isSuperuser &&
              !selectedCompanyId
            }
          >

            <Plus
              size={17}
            />

            Add Department

          </button>

        </div>

      </div>


      {/* ===================================================
          SUPERUSER COMPANY CONTEXT
          =================================================== */}

      {isSuperuser &&
        selectedCompanyId && (

          <div className="dashboard-company-context">

            Viewing departments for{" "}

            <strong>
              {selectedCompanyName ||
                `Company #${selectedCompanyId}`}
            </strong>

          </div>

        )}


      {/* ===================================================
          SUPERUSER WITHOUT COMPANY
          =================================================== */}

      {isSuperuser &&
      !selectedCompanyId ? (

        <EmptyState
          title="No company selected"
          text="Go to the Dashboard and select a company to view and manage its departments."
        />

      ) : (

        <>

          {/* ===============================================
              SUMMARY
              =============================================== */}

          <div className="access-summary">

            <div>

              <Building2
                size={19}
              />

              <span>

                <strong>
                  {departments.length}
                </strong>{" "}

                department
                {departments.length === 1
                  ? ""
                  : "s"}

              </span>

            </div>


            <div>

              <span>

                Access scope:{" "}

                <strong>
                  {isSuperuser
                    ? selectedCompanyName ||
                      `Company #${selectedCompanyId}`
                    : "Authenticated company"}
                </strong>

              </span>

            </div>

          </div>


          {/* ===============================================
              DEPARTMENT TABLE
              =============================================== */}

          {departments.length === 0 ? (

            <EmptyState
              title="No departments found"
              text={
                isSuperuser &&
                selectedCompanyName
                  ? `No departments found for ${selectedCompanyName}.`
                  : "Create your first department to organize company knowledge."
              }
            />

          ) : (

            <div className="table-wrap">

              <table>

                <thead>

                  <tr>

                    <th>
                      ID
                    </th>

                    <th>
                      Department
                    </th>

                    <th>
                      Company ID
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {departments.map(
                    (
                      department,
                      index
                    ) => (

                      <tr
                        key={
                          department.id ??
                          department.department_id ??
                          index
                        }
                      >

                        <td>
                          {department.id ??
                            department.department_id ??
                            "—"}
                        </td>


                        <td>

                          <strong>
                            {department.name ||
                              department.department_name ||
                              "Unnamed Department"}
                          </strong>

                        </td>


                        <td>
                          {department.company_id ??
                            "—"}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </>

      )}


      {/* ===================================================
          CREATE DEPARTMENT MODAL
          =================================================== */}

      {modalOpen && (

        <div className="modal-backdrop">

          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="department-modal-title"
          >

            {/* =============================================
                MODAL HEADER
                ============================================= */}

            <div className="modal-header">

              <div>

                <h3
                  id="department-modal-title"
                >
                  Add Department
                </h3>

                <p className="muted">

                  {isSuperuser &&
                  selectedCompanyName
                    ? `Create a department for ${selectedCompanyName}.`
                    : "Create a department for your company."}

                </p>

              </div>


              <button
                type="button"
                className="icon-btn"
                onClick={
                  closeCreateModal
                }
                disabled={saving}
                aria-label="Close"
              >

                <X
                  size={18}
                />

              </button>

            </div>


            {/* =============================================
                FORM
                ============================================= */}

            <form
              className="settings-form"
              onSubmit={
                handleCreateDepartment
              }
            >

              <div className="form-group">

                <label
                  htmlFor="department-name"
                >
                  Department name
                </label>


                <input
                  id="department-name"
                  type="text"
                  value={
                    departmentName
                  }
                  onChange={(event) =>
                    setDepartmentName(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Human Resources"
                  disabled={saving}
                  autoFocus
                />

              </div>


              {formError && (

                <div className="error-message">
                  {formError}
                </div>

              )}


              <div className="modal-footer">

                <button
                  type="button"
                  className="btn-ghost"
                  onClick={
                    closeCreateModal
                  }
                  disabled={saving}
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    saving ||
                    (
                      isSuperuser &&
                      !selectedCompanyId
                    )
                  }
                >

                  {saving
                    ? "Creating..."
                    : "Create Department"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </section>
  );
}