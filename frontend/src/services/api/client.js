// frontend/src/services/api/client.js

import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  clearAuthStorage,
} from "../../utils/storage.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/";

/*
 * Prevent multiple requests from refreshing the token at the same time.
 *
 * Example:
 *   Request A -> 401
 *   Request B -> 401
 *   Request C -> 401
 *
 * Only A should call /token/refresh/.
 * B and C wait for A's refresh result.
 */
let refreshPromise = null;

/**
 * Error used for API failures.
 */
export class ApiError extends Error {
  constructor(status, message, detail = null) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Resolve an API path against the configured API base URL.
 */
function resolveUrl(path) {
  return new URL(path, API_BASE_URL).toString();
}

/**
 * Redirect the user to the login page after authentication
 * can no longer be recovered.
 */
function redirectToLogin() {
  clearAuthStorage();

  // Prevent repeatedly adding /login to the browser history.
  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

/**
 * Refresh the access token using the stored refresh token.
 *
 * Returns the new access token or null if refresh failed.
 */
async function refreshAccessToken() {
  /*
   * If another request is already refreshing the token,
   * wait for that request instead of starting another refresh.
   */
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(resolveUrl("users/token/refresh/"), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = await response.json().catch(() => null);

      const newAccessToken = payload?.access;

      if (!newAccessToken) {
        return null;
      }

      /*
       * Save the new access token.
       *
       * We intentionally do NOT replace the refresh token here because
       * your current SimpleJWT configuration returns only a new access
       * token unless refresh token rotation is enabled.
       */
      setAccessToken(newAccessToken);

      return newAccessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Parse an API response.
 */
async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  return null;
}

/**
 * Convert a failed response into ApiError.
 */
function createApiError(response, payload) {
  const message =
    payload && typeof payload === "object" && (payload.detail || payload.error)
      ? payload.detail || payload.error
      : response.statusText || "Request failed";

  return new ApiError(response.status, message, payload);
}

/**
 * Perform an API request.
 *
 * Authentication behavior:
 *
 * - Adds the access token automatically.
 * - If the server returns 401:
 *     1. Try refreshing the access token.
 *     2. Retry the original request once.
 * - If refresh fails:
 *     1. Clear authentication.
 *     2. Redirect to /login.
 */
export async function request(path, options = {}) {
  const {
    method = "GET",
    body,
    headers = {},
    skipAuth = false,
    retry = true,
  } = options;

  const finalHeaders = {
    Accept: "application/json",
    ...headers,
  };

  /*
   * FormData automatically sets its own Content-Type
   * including the multipart boundary.
   */
  if (body && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }

  /*
   * Add access token unless authentication is explicitly skipped.
   */
  if (!skipAuth) {
    const token = getAccessToken();

    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const fetchOptions = {
    method,
    headers: finalHeaders,
  };

  if (body !== undefined && body !== null) {
    fetchOptions.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(resolveUrl(path), fetchOptions);
  } catch (error) {
    /*
     * Network errors are not authentication errors.
     * Do not try to refresh the token here.
     */
    throw error;
  }

  /*
   * Access token expired/invalid.
   *
   * Only attempt refresh when:
   * - request requires authentication
   * - server returned 401
   * - this request has not already been retried
   */
  if (response.status === 401 && !skipAuth && retry) {
    const newAccessToken = await refreshAccessToken();

    /*
     * Refresh failed.
     *
     * This normally means the refresh token is also expired,
     * invalid, blacklisted, or missing.
     */
    if (!newAccessToken) {
      redirectToLogin();

      throw new ApiError(401, "Your session has expired. Please log in again.");
    }

    /*
     * Retry the original request using the new access token.
     *
     * retry:false prevents an infinite loop if the newly refreshed
     * access token is somehow rejected as well.
     */
    return request(path, {
      ...options,
      retry: false,
    });
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw createApiError(response, payload);
  }

  return payload;
}

/**
 * GET
 */
export function get(path, options) {
  return request(path, {
    ...options,
    method: "GET",
  });
}

/**
 * POST
 */
export function post(path, body, options) {
  return request(path, {
    ...options,
    method: "POST",
    body,
  });
}

/**
 * PUT
 */
export function put(path, body, options) {
  return request(path, {
    ...options,
    method: "PUT",
    body,
  });
}

/**
 * PATCH
 */
export function patch(path, body, options) {
  return request(path, {
    ...options,
    method: "PATCH",
    body,
  });
}

/**
 * DELETE
 */
export function del(path, options) {
  return request(path, {
    ...options,
    method: "DELETE",
  });
}
