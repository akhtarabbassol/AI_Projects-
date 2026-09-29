import api from "./client";

export const semanticSearch = (query, top_k = 10) => {
  const user = JSON.parse(localStorage.getItem("ekis_user") || "null");
  return api.post("/search/semantic", { query, top_k, team_id: user?.team_id || user?.department_id || null });
};