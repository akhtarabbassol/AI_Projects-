import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  File,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import {
  deleteDocument,
  getDocuments,
} from "../api/documents";

import {
  getDepartments,
} from "../api/departments";

import { getApiErrorMessage } from "../api/client";

import { useAuth } from "../context/AuthContext";

import UploadModal from "../components/UploadModal";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";


/* =========================================================
   FILTERS
   ========================================================= */

const FILTERS = [
  "All",
  "PDF",
  "DOCX",
  "CSV",
  "TXT",
];


/* =========================================================
   NORMALIZE DOCUMENT RESPONSE
   ========================================================= */

function normalizeDocuments(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.documents)) {
    return data.documents;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}


/* =========================================================
   NORMALIZE DEPARTMENT RESPONSE
   ========================================================= */

function normalizeDepartments(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.departments)) {
    return data.departments;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}


/* =========================================================
   DOCUMENT ID
   ========================================================= */

function getDocumentId(document) {
  return (
    document?.id ??
    document?.document_id ??
    null
  );
}


/* =========================================================
   DOCUMENT NAME
   ========================================================= */

function getDocumentName(document) {
  return (
    document?.filename ??
    document?.name ??
    document?.file_name ??
    "Untitled document"
  );
}


/* =========================================================
   DOCUMENT TYPE
   ========================================================= */

function getDocumentType(document) {
  const fileType = String(
    document?.file_type ??
      document?.type ??
      ""
  )
    .trim()
    .toLowerCase();

  const filename = String(
    document?.filename ??
      document?.name ??
      document?.file_name ??
      ""
  )
    .trim()
    .toLowerCase();


  /* ---------------------------------------------------------
     MIME TYPES
     --------------------------------------------------------- */

  if (fileType === "application/pdf") {
    return "PDF";
  }

  if (
    fileType === "text/plain" ||
    fileType === "text/txt"
  ) {
    return "TXT";
  }

  if (
    fileType === "text/csv" ||
    fileType === "application/csv"
  ) {
    return "CSV";
  }

  if (
    fileType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "DOCX";
  }


  /* ---------------------------------------------------------
     EXTENSION / SIMPLE TYPE
     --------------------------------------------------------- */

  const normalizedType = fileType
    .replace(".", "")
    .toUpperCase();

  if (FILTERS.includes(normalizedType)) {
    return normalizedType;
  }


  /* ---------------------------------------------------------
     FILENAME FALLBACK
     --------------------------------------------------------- */

  if (filename.endsWith(".pdf")) {
    return "PDF";
  }

  if (filename.endsWith(".docx")) {
    return "DOCX";
  }

  if (filename.endsWith(".csv")) {
    return "CSV";
  }

  if (filename.endsWith(".txt")) {
    return "TXT";
  }

  return "FILE";
}


/* =========================================================
   DOCUMENT STATUS
   ========================================================= */

function getDocumentStatus(document) {
  return String(
    document?.status ??
      "unknown"
  )
    .trim()
    .toLowerCase();
}


/* =========================================================
   DOCUMENT DATE
   ========================================================= */

function getDocumentDate(document) {
  return (
    document?.created_at ??
    document?.upload_date ??
    document?.date ??
    document?.updated_at ??
    "—"
  );
}


/* =========================================================
   DOCUMENT SIZE
   ========================================================= */

function getDocumentSize(document) {
  return (
    document?.file_size ??
    document?.size ??
    document?.file_size_bytes ??
    "—"
  );
}


/* =========================================================
   DEPARTMENT NAME
   ========================================================= */

function getDepartmentName(document) {
  return (
    document?.department_name ??
    document?.department?.name ??
    document?.department_id ??
    "Department —"
  );
}


/* =========================================================
   FILE ICON CLASS
   ========================================================= */

function getFileIconClass(type) {
  switch (type) {
    case "PDF":
      return "purple";

    case "DOCX":
      return "blue";

    case "CSV":
      return "cyan";

    case "TXT":
      return "green";

    default:
      return "blue";
  }
}


/* =========================================================
   COMPONENT
   ========================================================= */

export default function Documents() {

  /* =======================================================
     AUTH / COMPANY CONTEXT
     ======================================================= */

  const {
    user,
    selectedCompanyId,
    selectedCompanyName,
  } = useAuth();

  const role = String(
    user?.role ?? ""
  ).toLowerCase();

  const isSuperuser =
    role === "superuser";

  const isEmployee =
    role === "employee";

  const canModifyDocuments =
    !isEmployee;


  /* =======================================================
     STATE
     ======================================================= */

  const [documents, setDocuments] =
    useState([]);

  const [departments, setDepartments] =
    useState([]);

  const [filter, setFilter] =
    useState("All");

  const [modal, setModal] =
    useState(false);

  const [
    departmentLoading,
    setDepartmentLoading,
  ] = useState(false);

  const [
    departmentError,
    setDepartmentError,
  ] = useState("");

  const [
    state,
    setState,
  ] = useState({
    loading: true,
    error: "",
    deleting: null,
  });


  /* =======================================================
     LOAD DOCUMENTS
     ======================================================= */

  const load = useCallback(
    async () => {

      /*
       * SUPERUSER:
       * The company comes from Dashboard/AuthContext.
       *
       * Never call getDocuments() without a company
       * for a superuser, otherwise the backend could
       * return documents from all companies.
       */

      if (
        isSuperuser &&
        !selectedCompanyId
      ) {
        setDocuments([]);

        setState({
          loading: false,
          error: "",
          deleting: null,
        });

        return;
      }


      setState({
        loading: true,
        error: "",
        deleting: null,
      });


      try {

        /*
         * SUPERUSER
         * -> selected Dashboard company
         *
         * ADMIN / EMPLOYEE
         * -> backend automatically scopes
         *    to their own company/department
         */

        const response =
          isSuperuser
            ? await getDocuments(
                selectedCompanyId
              )
            : await getDocuments();


        console.log(
          "Documents API response:",
          response?.data
        );


        const items =
          normalizeDocuments(
            response?.data
          );


        console.log(
          "Normalized documents:",
          items
        );


        setDocuments(items);

        setState({
          loading: false,
          error: "",
          deleting: null,
        });

      } catch (error) {

        console.error(
          "Documents loading error:",
          error
        );

        setDocuments([]);

        setState({
          loading: false,
          error: getApiErrorMessage(
            error,
            "Unable to load documents."
          ),
          deleting: null,
        });

      }

    },
    [
      isSuperuser,
      selectedCompanyId,
    ]
  );


  /* =======================================================
     LOAD DEPARTMENTS
     ======================================================= */

  const loadDepartments =
    useCallback(
      async () => {

        if (!canModifyDocuments) {
          return;
        }


        /*
         * SUPERUSER:
         * Departments must belong to the company
         * selected on Dashboard.
         */

        if (
          isSuperuser &&
          !selectedCompanyId
        ) {
          setDepartments([]);
          setDepartmentError(
            "Select a company from the Dashboard first."
          );

          return;
        }


        setDepartmentLoading(true);
        setDepartmentError("");


        try {

          /*
           * SUPERUSER
           * -> selected company
           *
           * ADMIN / EMPLOYEE
           * -> backend automatically scopes
           *    to their own company
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


          const validDepartments =
            items.filter(
              (department) =>
                department &&
                department.id !== undefined &&
                department.id !== null &&
                department.name
            );


          console.log(
            "Normalized departments:",
            validDepartments
          );


          setDepartments(
            validDepartments
          );

        } catch (error) {

          console.error(
            "Department loading error:",
            error
          );

          setDepartments([]);

          setDepartmentError(
            getApiErrorMessage(
              error,
              "Unable to load departments."
            )
          );

        } finally {

          setDepartmentLoading(false);

        }

      },
      [
        canModifyDocuments,
        isSuperuser,
        selectedCompanyId,
      ]
    );


  /* =======================================================
     LOAD WHEN COMPANY / ROLE CHANGES
     ======================================================= */

  useEffect(() => {

    load();

    if (canModifyDocuments) {
      loadDepartments();
    } else {
      setDepartments([]);
    }

  }, [
    load,
    loadDepartments,
    canModifyDocuments,
  ]);


  /* =======================================================
     OPEN UPLOAD MODAL
     ======================================================= */

  const openUploadModal =
    async () => {

      if (!canModifyDocuments) {
        return;
      }


      /*
       * Superuser must select a company
       * from Dashboard before uploading.
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


      setDepartmentError("");
      setModal(true);

      await loadDepartments();
    };


  /* =======================================================
     CLOSE UPLOAD MODAL
     ======================================================= */

  const closeUploadModal =
    () => {

      setModal(false);
      setDepartmentError("");

    };


  /* =======================================================
     FILTER DOCUMENTS
     ======================================================= */

  const visibleDocuments =
    useMemo(() => {

      if (filter === "All") {
        return documents;
      }

      return documents.filter(
        (document) =>
          getDocumentType(
            document
          ) === filter
      );

    }, [
      documents,
      filter,
    ]);


  /* =======================================================
     DELETE DOCUMENT
     ======================================================= */

  const remove =
    async (document) => {

      if (!canModifyDocuments) {
        return;
      }


      const documentId =
        getDocumentId(document);

      const documentName =
        getDocumentName(document);


      /* ---------------------------------------------------
         CHECK ID
         --------------------------------------------------- */

      if (documentId == null) {

        alert(
          "Unable to delete this document because its ID is missing."
        );

        return;
      }


      /* ---------------------------------------------------
         CONFIRM
         --------------------------------------------------- */

      const confirmed =
        window.confirm(
          `Delete "${documentName}"?`
        );

      if (!confirmed) {
        return;
      }


      /* ---------------------------------------------------
         DELETE STATE
         --------------------------------------------------- */

      setState(
        (current) => ({
          ...current,
          deleting: documentId,
        })
      );


      try {

        await deleteDocument(
          documentId
        );


        /* -----------------------------------------------
           REMOVE FROM UI
           ----------------------------------------------- */

        setDocuments(
          (current) =>
            current.filter(
              (item) =>
                getDocumentId(item) !==
                documentId
            )
        );

      } catch (error) {

        console.error(
          "Delete document error:",
          error
        );

        alert(
          getApiErrorMessage(
            error,
            "Delete failed."
          )
        );

      } finally {

        setState(
          (current) => ({
            ...current,
            deleting: null,
          })
        );

      }

    };


  /* =======================================================
     UPLOAD SUCCESS
     ======================================================= */

  const handleUploaded =
    async () => {

      setModal(false);
      setDepartmentError("");

      await load();

    };


  /* =======================================================
     RETRY DEPARTMENTS
     ======================================================= */

  const retryDepartments =
    async () => {

      await loadDepartments();

    };


  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <section className="content-view active">

      {/* ===================================================
          PAGE HEADER
          =================================================== */}

      <div className="documents-header">

        <div>

          <h1>
            Document Management
          </h1>

          <p>
            {isSuperuser
              ? selectedCompanyName
                ? `Manage documents for ${selectedCompanyName}.`
                : "Select a company from the Dashboard to view its documents."
              : isEmployee
                ? "View the documents available in your knowledge system."
                : "Manage the documents used by your knowledge system."}
          </p>

        </div>


        {/* =================================================
            UPLOAD BUTTON
            ================================================= */}

        {canModifyDocuments && (

          <div className="header-actions">

            <button
              type="button"
              className="btn-primary"
              onClick={
                openUploadModal
              }
              disabled={
                isSuperuser &&
                !selectedCompanyId
              }
            >

              <Plus size={18} />

              Upload New

            </button>

          </div>

        )}

      </div>


      {/* ===================================================
          SUPERUSER COMPANY CONTEXT
          =================================================== */}

      {isSuperuser &&
        selectedCompanyId && (
          <div className="dashboard-company-context">
            Viewing documents for{" "}
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
          text="Go to the Dashboard and select a company to view its documents."
        />

      ) : (

        <>

          {/* ===============================================
              FILTERS / TOOLBAR
              =============================================== */}

          <div className="document-tools">

            <div className="filter-group">

              {FILTERS.map(
                (item) => (

                  <button
                    key={item}
                    type="button"
                    className={`filter-btn ${
                      filter === item
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setFilter(item)
                    }
                  >
                    {item}
                  </button>

                )
              )}

            </div>


            {/* =============================================
                REFRESH
                ============================================= */}

            <button
              type="button"
              className="btn-ghost-sm"
              onClick={load}
              disabled={
                state.loading
              }
            >

              <RefreshCw
                size={14}
              />

              Refresh

            </button>

          </div>


          {/* ===============================================
              DOCUMENT STATES
              =============================================== */}

          {state.loading ? (

            <LoadingState
              label="Loading documents..."
            />

          ) : state.error ? (

            <ErrorState
              message={state.error}
              onRetry={load}
            />

          ) : visibleDocuments.length === 0 ? (

            <EmptyState
              title="No documents found"
              text={
                filter === "All"
                  ? isSuperuser &&
                    selectedCompanyName
                    ? `No documents are currently available for ${selectedCompanyName}.`
                    : isEmployee
                      ? "No documents are currently available."
                      : "Upload your first knowledge document."
                  : `No ${filter} documents found.`
              }
            />

          ) : (

            <div className="document-grid">

              {visibleDocuments.map(
                (document, index) => {

                  const type =
                    getDocumentType(
                      document
                    );

                  const status =
                    getDocumentStatus(
                      document
                    );

                  const documentId =
                    getDocumentId(
                      document
                    );

                  const documentName =
                    getDocumentName(
                      document
                    );

                  const documentSize =
                    getDocumentSize(
                      document
                    );

                  const documentDate =
                    getDocumentDate(
                      document
                    );

                  const departmentName =
                    getDepartmentName(
                      document
                    );


                  return (

                    <div
                      className="document-card"
                      key={
                        documentId ??
                        `${documentName}-${index}`
                      }
                    >

                      {/* ==================================
                          CARD TOP
                          ================================== */}

                      <div className="document-card-top">

                        <div
                          className={`stat-icon ${getFileIconClass(
                            type
                          )}`}
                        >

                          <File
                            size={20}
                          />

                        </div>


                        <span
                          className={`status-badge ${status}`}
                        >
                          {status}
                        </span>

                      </div>


                      {/* ==================================
                          DOCUMENT NAME
                          ================================== */}

                      <h4
                        title={documentName}
                      >
                        {documentName}
                      </h4>


                      {/* ==================================
                          TYPE / SIZE
                          ================================== */}

                      <div className="document-meta">

                        <span>
                          {type}
                        </span>

                        <span>
                          {documentSize}
                        </span>

                      </div>


                      {/* ==================================
                          DATE
                          ================================== */}

                      <div className="document-meta">

                        <span>
                          {documentDate}
                        </span>

                      </div>


                      {/* ==================================
                          BOTTOM
                          ================================== */}

                      <div className="document-bottom">

                        <span
                          title={
                            String(
                              departmentName
                            )
                          }
                        >
                          {departmentName}
                        </span>


                        {/* ==============================
                            DELETE BUTTON
                            ============================== */}

                        {canModifyDocuments && (

                          <button
                            type="button"
                            className="danger-btn"
                            title="Delete document"
                            disabled={
                              state.deleting ===
                              documentId
                            }
                            onClick={() =>
                              remove(
                                document
                              )
                            }
                          >

                            <Trash2
                              size={16}
                            />

                          </button>

                        )}

                      </div>

                    </div>

                  );

                }
              )}

            </div>

          )}

        </>

      )}


      {/* ===================================================
          UPLOAD MODAL
          =================================================== */}

      {canModifyDocuments && (

        <UploadModal
          open={modal}

          onClose={
            closeUploadModal
          }

          onUploaded={
            handleUploaded
          }

          departments={
            departments
          }

          departmentLoading={
            departmentLoading
          }

          departmentError={
            departmentError
          }

          onRetryDepartments={
            retryDepartments
          }
        />

      )}

    </section>
  );
}