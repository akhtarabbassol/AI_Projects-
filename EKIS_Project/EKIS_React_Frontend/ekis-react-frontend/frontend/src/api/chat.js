import api from "./client";

export const queryChat = (query, topK = 5) => {
  return api.post("/chat/query", {
    query: query.trim(),
    top_k: topK,
  });
};