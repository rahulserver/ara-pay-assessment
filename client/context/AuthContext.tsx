"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { login as apiLogin } from "@/lib/api";
import { AuthError, clearToken, getToken, setToken } from "@/lib/auth";

export { AuthError };

interface AuthContextValue {
  authenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [authenticated, setAuthenticated] = useState<boolean>(() => !!getToken());

  const login = useCallback(async (email: string, password: string) => {
    const token = await apiLogin(email, password);
    setToken(token);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ authenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
