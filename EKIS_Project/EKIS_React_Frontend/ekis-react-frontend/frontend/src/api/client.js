import axios from "axios";


export function getApiErrorMessage(
  error,
  fallback = "Request failed."
) {
  const detail =
    error?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const location =
          Array.isArray(item?.loc)
            ? item.loc
                .filter(
                  (part) => part !== "body"
                )
                .join(".")
            : "";

        const message =
          item?.msg ||
          String(item);

        return location
          ? `${location}: ${message}`
          : message;
      })
      .join("; ");
  }

  if (
    detail &&
    typeof detail === "object"
  ) {
    return (
      detail.msg ||
      JSON.stringify(detail)
    );
  }

  const message =
    error?.response?.data?.message ||
    error?.message ||
    fallback;

  return error?.response?.status
    ? `${error.response.status}: ${message}`
    : message;
}


const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000/api/v1",

  headers: {
    "Content-Type": "application/json",
  },
});


api.interceptors.request.use(
  (config) => {

    /*
     * IMPORTANT:
     * Let the browser/Axios create the multipart
     * boundary for FormData.
     */

    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData
    ) {
      delete config.headers["Content-Type"];

      if (config.headers.common) {
        delete config.headers.common[
          "Content-Type"
        ];
      }
    }


    const token =
      localStorage.getItem(
        "ekis_token"
      );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  }
);


api.interceptors.response.use(
  (response) => response,

  (error) => {

    if (
      error.response?.status === 401
    ) {
      localStorage.removeItem(
        "ekis_token"
      );

      localStorage.removeItem(
        "ekis_user"
      );

      window.dispatchEvent(
        new Event("ekis:logout")
      );
    }

    return Promise.reject(error);
  }
);


export default api;