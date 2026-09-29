import api from "./client";

export const getDepartments = (companyId = null) => {
  const params = {};

  if (companyId) {
    params.company_id = companyId;
  }

  return api.get("/departments", {
    params,
  });
};

export const createDepartment = (payload) => {
  return api.post("/departments", payload);
};