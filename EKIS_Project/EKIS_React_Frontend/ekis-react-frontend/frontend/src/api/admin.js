import api from "./client";

export const getAdminUsers = (companyId = null) => {
  const params = {};

  if (
    companyId !== null &&
    companyId !== undefined &&
    companyId !== ""
  ) {
    params.company_id = companyId;
  }

  return api.get("/users", { params });
};

export const createAdminUser = (form) => {
  const payload = {
    full_name: form.name,
    email: form.email,
    password: form.password,
    role: form.role,

    company_id:
      form.company_id !== undefined &&
      form.company_id !== null &&
      form.company_id !== ""
        ? Number(form.company_id)
        : null,

    department_id:
      form.department_id !== undefined &&
      form.department_id !== null &&
      form.department_id !== ""
        ? Number(form.department_id)
        : null,
  };

  return api.post("/users", payload);
};

export const removeAdminUser = (userId) => {
  return api.delete(`/users/${userId}`);
};

export const getCompanies = () => {
  return api.get("/companies");
};

export const createCompany = (form) => {
  return api.post("/companies", {
    name: form.name,
  });
};

export const removeCompany = (companyId) => {
  return api.delete(`/companies/${companyId}`);
};