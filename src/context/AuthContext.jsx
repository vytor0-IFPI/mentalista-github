import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("mj_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("auth-me")
      .then((res) => setUser(res.user))
      .catch(() => {
        localStorage.removeItem("mj_token");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post("auth-login", { email, password });
    localStorage.setItem("mj_token", res.token);
    setUser(res.user);
    setAuthError(null);
    return res.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await api.post("auth-register", { name, email, password });
    localStorage.setItem("mj_token", res.token);
    setUser(res.user);
    setAuthError(null);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("mj_token");
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const res = await api.get("auth-me");
    setUser(res.user);
    return res;
  }, []);

  const value = useMemo(
    () => ({ user, loading, authError, setAuthError, login, register, logout, refresh }),
    [user, loading, authError, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}