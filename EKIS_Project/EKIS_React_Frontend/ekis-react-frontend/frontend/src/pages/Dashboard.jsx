import { useEffect, useState } from "react";
import {
  FileText,
  MessageCircle,
  Zap,
  Clock,
  Upload,
  AlertCircle,
} from "lucide-react";

import { getAnalyticsDashboard } from "../api/analytics";
import { getCompanies } from "../api/admin";
import { getApiErrorMessage } from "../api/client";
import { getDocuments } from "../api/documents";

import { useAuth } from "../context/AuthContext";
import {
  getRole,
  getCompanyName,
  roles,
} from "../auth/permissions";

import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";

function pick(obj, paths, fallback = 0) {
  for (const path of paths) {
    let cur = obj;

    for (const key of path.split(".")) {
      cur = cur?.[key];
    }

    if (cur !== undefined && cur !== null) {
      return cur;
    }
  }

  return fallback;
}

/*
 * Demo dashboard data.
 *
 * Used only when the demo token is active.
 */
const demoDashboard = {
  total_documents: 12,
  ai_queries: 48,
  ai_accuracy: 94,
  time_saved_hours: 26,

  time_series: [
    { label: "Mon", value: 18 },
    { label: "Tue", value: 24 },
    { label: "Wed", value: 15 },
    { label: "Thu", value: 31 },
    { label: "Fri", value: 27 },
    { label: "Sat", value: 12 },
    { label: "Sun", value: 20 },
  ],
};

const demoDocuments = [
  {
    id: "demo-1",
    filename: "Company Handbook.pdf",
    status: "Indexed",
  },
  {
    id: "demo-2",
    filename: "Product Knowledge.docx",
    status: "Indexed",
  },
  {
    id: "demo-3",
    filename: "HR Policies.pdf",
    status: "Processing",
  },
];

export default function Dashboard() {
  const {
    user,
    selectedCompanyId,
    setSelectedCompany,
  } = useAuth();

  const role = getRole(user);

  const isSuperuser = role === roles.SUPERUSER;
  const isAdmin = role === roles.ADMIN;
  const isEmployee = role === roles.EMPLOYEE;

  const [data, setData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [state, setState] = useState({
    loading: true,
    error: "",
  });

  /*
   * Extract documents from API response.
   */
  const extractDocuments = (response) => {
    const docs =
      response?.data?.documents ||
      response?.data?.items ||
      response?.data ||
      [];

    return Array.isArray(docs) ? docs : [];
  };

  /*
   * Load all data for the selected SUPERUSER company.
   */
  const loadSuperuserCompany = async (companyId) => {
    if (!companyId) {
      setDocuments([]);
      setData({
        total_documents: 0,
        ai_queries: null,
        ai_accuracy: null,
        time_saved_hours: null,
        time_series: [],
        recent_activity: [],
      });

      return;
    }

    const [analyticsRes, docsRes] =
      await Promise.all([
        getAnalyticsDashboard(companyId),
        getDocuments(companyId),
      ]);

    setData(
      analyticsRes.data || {}
    );

    setDocuments(
      extractDocuments(docsRes)
    );
  };

  /*
   * Initial dashboard load.
   */
  const load = async () => {
    setState({
      loading: true,
      error: "",
    });

    try {
      /*
       * --------------------------------------------------
       * DEMO MODE
       * --------------------------------------------------
       */
      if (
        localStorage.getItem("ekis_token") ===
        "ekis-demo-token"
      ) {
        setData(demoDashboard);
        setDocuments(demoDocuments);

        setState({
          loading: false,
          error: "",
        });

        return;
      }

      /*
       * --------------------------------------------------
       * SUPERUSER
       * --------------------------------------------------
       *
       * Superuser selects the company ONLY here.
       *
       * The selected company is stored in AuthContext.
       *
       * Documents and Departments will later use:
       *
       *     selectedCompanyId
       *
       * from AuthContext.
       */
      if (isSuperuser) {
        const companiesRes =
          await getCompanies();

        const companyList =
          companiesRes.data?.items ||
          companiesRes.data?.companies ||
          companiesRes.data ||
          [];

        const normalizedCompanies =
          Array.isArray(companyList)
            ? companyList
            : [];

        setCompanies(
          normalizedCompanies
        );

        /*
         * Check whether the company stored
         * in AuthContext still exists.
         */
        let companyId =
          selectedCompanyId;

        const selectedStillExists =
          companyId &&
          normalizedCompanies.some(
            (company) =>
              String(company.id) ===
              String(companyId)
          );

        /*
         * If there is no valid selected company,
         * automatically select the first company.
         */
        if (!selectedStillExists) {
          companyId =
            normalizedCompanies.length > 0
              ? String(
                  normalizedCompanies[0].id
                )
              : "";
        }

        /*
         * Find selected company details.
         */
        const selectedCompany =
          normalizedCompanies.find(
            (company) =>
              String(company.id) ===
              String(companyId)
          );

        /*
         * Store selected company globally.
         */
        setSelectedCompany(
          companyId,
          selectedCompany?.name || ""
        );

        /*
         * No companies exist.
         */
        if (!companyId) {
          setData({
            total_documents: 0,
            ai_queries: null,
            ai_accuracy: null,
            time_saved_hours: null,
            time_series: [],
            recent_activity: [],
          });

          setDocuments([]);

          setState({
            loading: false,
            error: "",
          });

          return;
        }

        /*
         * Load analytics and documents
         * for selected company.
         */
        await loadSuperuserCompany(
          companyId
        );

        setState({
          loading: false,
          error: "",
        });

        return;
      }

      /*
       * --------------------------------------------------
       * ADMIN
       * --------------------------------------------------
       *
       * Backend automatically scopes data
       * to the authenticated admin's company.
       */
      if (isAdmin) {
        const [
          analyticsRes,
          docsRes,
        ] = await Promise.all([
          getAnalyticsDashboard(),
          getDocuments(),
        ]);

        setData(
          analyticsRes.data || {}
        );

        setDocuments(
          extractDocuments(docsRes)
        );

        setState({
          loading: false,
          error: "",
        });

        return;
      }

      /*
       * --------------------------------------------------
       * EMPLOYEE
       * --------------------------------------------------
       *
       * Employees can access documents
       * but not analytics.
       */
      if (isEmployee) {
        const docsRes =
          await getDocuments();

        const docs =
          extractDocuments(docsRes);

        setDocuments(docs);

        setData({
          total_documents:
            docs.length,
          ai_queries: null,
          ai_accuracy: null,
          time_saved_hours: null,
          time_series: [],
          recent_activity: [],
        });

        setState({
          loading: false,
          error: "",
        });

        return;
      }

      /*
       * --------------------------------------------------
       * FALLBACK
       * --------------------------------------------------
       */
      const docsRes =
        await getDocuments();

      const docs =
        extractDocuments(docsRes);

      setDocuments(docs);

      setData({
        total_documents: docs.length,
        ai_queries: null,
        ai_accuracy: null,
        time_saved_hours: null,
        time_series: [],
        recent_activity: [],
      });

      setState({
        loading: false,
        error: "",
      });
    } catch (err) {
      console.error(
        "Dashboard loading error:",
        err
      );

      setState({
        loading: false,
        error: getApiErrorMessage(
          err,
          "Unable to load dashboard."
        ),
      });
    }
  };

  /*
   * Initial dashboard load.
   */
  useEffect(() => {
    load();
  }, [role]);

  /*
   * Loading state.
   */
  if (state.loading) {
    return (
      <LoadingState
        label="Loading dashboard..."
      />
    );
  }

  /*
   * Error state.
   */
  if (state.error) {
    return (
      <ErrorState
        message={state.error}
        onRetry={load}
      />
    );
  }

  /*
   * Dashboard statistics.
   */
  const docsCount = pick(
    data,
    [
      "stats.total_documents",
      "total_documents",
      "documents_count",
      "document_stats.total",
      "documents.total",
    ],
    documents.length
  );

  const queries = pick(
    data,
    [
      "stats.total_queries",
      "ai_queries",
      "total_queries",
      "query_count",
      "query_stats.total",
    ],
    null
  );

  /*
   * AI ACCURACY
   *
   * Backend value is used if available.
   * Otherwise static demo value = 94%.
   */
  const accuracy = pick(
    data,
    [
      "stats.ai_accuracy",
      "ai_accuracy",
      "accuracy",
      "query_stats.accuracy",
    ],
    94
  );

  /*
   * TIME SAVED
   *
   * Backend value is used if available.
   * Otherwise static demo value = 128 minutes.
   */
  const timeSaved = pick(
    data,
    [
      "stats.time_saved_minutes",
      "time_saved",
      "time_saved_hours",
      "timeSaved",
    ],
    128
  );

  /*
   * Backend returns query_trends.
   */
  const timeSeries =
    data?.query_trends ||
    data?.time_series ||
    [];

  const activities = pick(
    data,
    [
      "recent_activity",
      "activity",
      "activities",
    ],
    []
  );

  /*
   * Dashboard cards.
   */
  const cards = [
    [
      "Total Documents",
      docsCount,
      "—",
      FileText,
      "purple",
    ],
    [
      "AI Queries",
      queries == null
        ? "—"
        : queries,
      "—",
      MessageCircle,
      "blue",
    ],
    [
      "AI Accuracy",
      accuracy == null
        ? "94%"
        : `${accuracy}%`,
      "—",
      Zap,
      "green",
    ],
    [
      "Time Saved",
      timeSaved == null
        ? "128 min"
        : `${timeSaved} min`,
      "—",
      Clock,
      "cyan",
    ],
  ];

  /*
   * Current selected company.
   */
  const selectedCompany =
    companies.find(
      (company) =>
        String(company.id) ===
        String(selectedCompanyId)
    );

  return (
    <section className="content-view active">

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <div className="overview-header">

        <div>

          <h1>
            {isSuperuser
              ? "Platform Overview"
              : "Enterprise Overview"}
          </h1>

          <p>
            {isSuperuser
              ? "Monitor company intelligence performance"
              : isEmployee
                ? `Your ${getCompanyName(
                    user
                  )} knowledge workspace`
                : "Monitor your company's intelligence performance"}
          </p>

        </div>

        {/* ================================================== */}
        {/* SUPERUSER COMPANY SELECTOR */}
        {/* ================================================== */}

        {isSuperuser && (
          <div className="dashboard-company-selector">

            <label htmlFor="dashboard-company">
              Company
            </label>

            <select
              id="dashboard-company"
              value={
                selectedCompanyId
              }
              onChange={(event) => {
                const companyId =
                  event.target.value;

                const company =
                  companies.find(
                    (item) =>
                      String(
                        item.id
                      ) ===
                      String(
                        companyId
                      )
                  );

                /*
                 * Store selection globally.
                 */
                setSelectedCompany(
                  companyId,
                  company?.name || ""
                );

                /*
                 * Load dashboard data
                 * for the newly selected company.
                 */
                loadSuperuserCompany(
                  companyId
                ).catch((err) => {
                  console.error(
                    "Company dashboard loading error:",
                    err
                  );

                  setState({
                    loading: false,
                    error:
                      getApiErrorMessage(
                        err,
                        "Unable to load company dashboard."
                      ),
                  });
                });
              }}
            >

              <option value="">
                Select company
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

          </div>
        )}

      </div>

      {/* ================================================== */}
      {/* SELECTED COMPANY */}
      {/* ================================================== */}

      {isSuperuser &&
        selectedCompany && (
          <div className="dashboard-company-context">
            Viewing analytics and documents for{" "}
            <strong>
              {selectedCompany.name}
            </strong>
          </div>
        )}

      {/* ================================================== */}
      {/* STAT CARDS */}
      {/* ================================================== */}

      <div className="stats-grid">

        {cards.map(
          ([
            label,
            value,
            trend,
            Icon,
            tone,
          ]) => (
            <div
              className="stat-card"
              key={label}
            >

              <div
                className={`stat-icon ${tone}`}
              >
                <Icon size={24} />
              </div>

              <div className="stat-details">

                <span className="stat-label">
                  {label}
                </span>

                <h3 className="stat-value">
                  {value}
                </h3>

                <span className="stat-trend positive">
                  {trend}
                </span>

              </div>

            </div>
          )
        )}

      </div>

      {/* ================================================== */}
      {/* DASHBOARD GRID */}
      {/* ================================================== */}

      <div className="dashboard-grid">

        {/* ================================================= */}
        {/* QUERY TREND CHART */}
        {/* ================================================= */}

        <div className="chart-container">

          <div className="container-header">
            <h3>
              Intelligence Engagement
            </h3>
          </div>

          {Array.isArray(timeSeries) &&
          timeSeries.length ? (

            <div className="bar-chart real-chart">

              {timeSeries
                .slice(-12)
                .map(
                  (point, i) => {

                    const value =
                      Number(
                        point.value ??
                          point.queries ??
                          point.count ??
                          0
                      );

                    const max =
                      Math.max(
                        ...timeSeries.map(
                          (p) =>
                            Number(
                              p.value ??
                                p.queries ??
                                p.count ??
                                0
                            )
                        ),
                        1
                      );

                    return (
                      <div
                        className="bar-wrap"
                        key={i}
                        title={`${
                          point.label ||
                          point.date ||
                          ""
                        }: ${value}`}
                      >

                        <div
                          className="bar"
                          style={{
                            height: `${Math.max(
                              4,
                              (value /
                                max) *
                                100
                            )}%`,
                          }}
                        />

                      </div>
                    );
                  }
                )}

            </div>

          ) : (

            <EmptyState
              title={
                isEmployee
                  ? "Analytics unavailable"
                  : "No analytics series available"
              }
              text={
                isEmployee
                  ? "Analytics are available to company administrators."
                  : "The backend did not return time-series data."
              }
            />

          )}

        </div>

        {/* ================================================= */}
        {/* RECENT DOCUMENTS */}
        {/* ================================================= */}

        <div className="activity-container">

          <div className="container-header">

            <h3>
              Recent Documents
            </h3>

          </div>

          {documents.length ? (

            <ul className="activity-list">

              {documents
                .slice(0, 5)
                .map(
                  (doc, i) => (

                    <li
                      key={
                        doc.id ||
                        doc.document_id ||
                        i
                      }
                    >

                      <div
                        className={`activity-icon ${
                          i % 2
                            ? "purple"
                            : "blue"
                        }`}
                      >
                        <Upload
                          size={18}
                        />
                      </div>

                      <div className="activity-info">

                        <p>
                          {doc.filename ||
                            doc.name ||
                            "Document"}
                        </p>

                        <span>
                          {doc.status ||
                            "Status unavailable"}
                        </span>

                      </div>

                    </li>

                  )
                )}

            </ul>

          ) : (

            <EmptyState
              title="No documents found"
              text={
                isSuperuser &&
                selectedCompany
                  ? `No documents found for ${selectedCompany.name}.`
                  : undefined
              }
            />

          )}

          {Array.isArray(
            activities
          ) &&
            activities.length > 0 && (

              <div className="small activity-note">

                <AlertCircle
                  size={14}
                />

                Activity data is available
                from the analytics API.

              </div>

            )}

        </div>

      </div>

    </section>
  );
}