import apiClient from "./client";

export const getAnalyticsDashboard = (companyId = null) => {
  const params = {};

  if (companyId) {
    params.company_id = companyId;
  }

  return apiClient.get("/analytics/dashboard", {
    params,
  });
};