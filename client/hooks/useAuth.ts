import { useCallback, useState } from "react";
import { login as apiLogin } from "@/lib/api";
import { AuthError, clearToken, getToken, setToken } from "@/lib/auth";

export interface UseAuthReturn {
  authenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
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

  return { authenticated, login, logout };
}

export { AuthError };
