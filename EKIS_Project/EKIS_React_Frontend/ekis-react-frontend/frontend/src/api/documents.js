import api from "./client";

export const uploadDocument = (file, departmentId) => {
  const formData = new FormData();

  formData.append(
    "department_id",
    String(departmentId)
  );

  formData.append(
    "file",
    file,
    file.name
  );

  return api.post(
    "/documents/upload",
    formData
  );
};

export const getDocuments = (companyId = null) => {
  const params = {};

  if (companyId) {
    params.company_id = companyId;
  }

  return api.get("/documents", {
    params,
  });
};

export const getDocument = (documentId) => {
  return api.get(
    `/documents/${documentId}`
  );
};

export const deleteDocument = (documentId) => {
  return api.delete(
    `/documents/${documentId}`
  );
};