import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "../api/client";

const AuthContext = createContext(null);

// Keeps the logged-in user in one place so every page can read it with useAuth().
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // If a token was saved from an earlier visit, load that user when the app opens.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(credentials) {
    const data = await api("/auth/login", { method: "POST", body: credentials });
    setToken(data.token);
    setUser(data.user);
  }

  async function register(details) {
    const data = await api("/auth/register", { method: "POST", body: details });
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, setUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
