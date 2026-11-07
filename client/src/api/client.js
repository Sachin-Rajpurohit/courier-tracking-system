const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

// Every request to the backend goes through this one function.
// Example: await api("/shipments", { params: { page: 1 } })
export async function api(path, { method = "GET", body, params } = {}) {
  const query = params ? `?${new URLSearchParams(params)}` : "";
  const token = getToken();

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}${query}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }

  // The fallback covers replies that aren't JSON, like a hosting error page.
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Our token stopped working, so go back to the login page.
    if (response.status === 401 && token) {
      setToken(null);
      window.location.href = "/login";
    }
    const error = new Error(data.message || "Something went wrong. Please try again.");
    error.status = response.status;
    error.fieldErrors = data.errors || {};
    throw error;
  }
  return data;
}
