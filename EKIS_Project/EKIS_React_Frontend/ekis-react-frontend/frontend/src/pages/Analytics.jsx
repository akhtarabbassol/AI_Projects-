import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { getAnalyticsDashboard } from "../api/analytics";
import { getApiErrorMessage } from "../api/client";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import EmptyState from "../components/EmptyState";

function val(data, keys) {
  for (const key of keys) {
    if (data?.[key] !== undefined && data?.[key] !== null) {
      return data[key];
    }
  }

  return "—";
}

export default function Analytics() {
  const [data, setData] = useState(null);

  const [state, setState] = useState({
    loading: true,
    error: "",
  });

  const load = async () => {
    setState({
      loading: true,
      error: "",
    });

    try {
      // Get company ID from localStorage.
      // const companyId = localStorage.getItem("company_id");
      const companyId = 5;

      const response = await getAnalyticsDashboard(companyId);

      setData(response?.data || {});

      setState({
        loading: false,
        error: "",
      });
    } catch (err) {
      setState({
        loading: false,
        error: getApiErrorMessage(
          err,
          "Unable to load analytics."
        ),
      });
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (state.loading) {
    return <LoadingState label="Loading analytics..." />;
  }

  if (state.error) {
    return (
      <ErrorState
        message={state.error}
        onRetry={load}
      />
    );
  }

  const stats = data?.stats || {};

  /*
   * Backend now returns:
   *
   * query_trends: [
   *   {
   *     date: "2026-09-23",
   *     queries: 0
   *   },
   *   ...
   * ]
   */
  const queryTrends = Array.isArray(data?.query_trends)
    ? data.query_trends
    : [];

  const chartData = queryTrends.map((item) => ({
    date: item.date,
    queries: Number(item.queries || 0),
  }));

  const engagementTotal = chartData.reduce(
    (total, item) => total + item.queries,
    0
  );

  return (
    <section className="content-view active">

      {/* Header */}
      <div className="overview-header">
        <h1>Intelligence Analytics</h1>

        <p>
          Deep dive into your organization's knowledge usage
        </p>
      </div>


      {/* Statistics */}
      <div className="stats-grid">

        <div className="stat-card">
          <div className="stat-details">
            <span className="stat-label">
              Total Documents
            </span>

            <h3 className="stat-value">
              {val(stats, ["total_documents"])}
            </h3>

            <span className="stat-trend positive">
              Backend data
            </span>
          </div>
        </div>


        <div className="stat-card">
          <div className="stat-details">
            <span className="stat-label">
              Total Queries
            </span>

            <h3 className="stat-value">
              {val(stats, ["total_queries"])}
            </h3>

            <span className="stat-trend positive">
              Backend data
            </span>
          </div>
        </div>


        <div className="stat-card">
          <div className="stat-details">
            <span className="stat-label">
              Response Time (Avg)
            </span>

            <h3 className="stat-value">
              {stats.average_response_time_ms !== null &&
              stats.average_response_time_ms !== undefined
                ? `${stats.average_response_time_ms} ms`
                : "—"}
            </h3>

            <span className="stat-trend positive">
              Backend data
            </span>
          </div>
        </div>

      </div>


      {/* Dashboard */}
      <div className="dashboard-grid">

        {/* Intelligence Engagement */}
        <div className="chart-container">

          <div className="container-header">
            <div>
              <h3>Intelligence Engagement</h3>

              <p>
                AI query activity across your organization
              </p>
            </div>

            <div className="engagement-summary">
              <span className="stat-label">
                Period Queries
              </span>

              <strong>
                {engagementTotal}
              </strong>
            </div>
          </div>


          {chartData.length > 0 ? (
            <div
              className="real-chart"
              style={{
                width: "100%",
                height: 320,
              }}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 0,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);

                      return date.toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                        }
                      );
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                  />

                  <Tooltip
                    labelFormatter={(value) => {
                      const date = new Date(value);

                      return date.toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      );
                    }}
                    formatter={(value) => [
                      value,
                      "Queries",
                    ]}
                  />

                  <Line
                    type="monotone"
                    dataKey="queries"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="No query activity"
              text="No query trend data was returned for this period."
            />
          )}

        </div>


        {/* Popular Topics */}
        <div className="activity-container">

          <div className="container-header">
            <h3>Popular Topics</h3>
          </div>

          {Array.isArray(data?.popular_topics) &&
          data.popular_topics.length > 0 ? (

            <div className="topic-list">

              {data.popular_topics.map((topic, index) => (

                <div
                  className="tag"
                  key={index}
                >
                  {typeof topic === "string"
                    ? topic
                    : (
                        topic.name ||
                        topic.topic ||
                        "Topic"
                      )}
                </div>

              ))}

            </div>

          ) : (
            <EmptyState
              title="No topics returned"
            />
          )}

        </div>

      </div>

    </section>
  );
}