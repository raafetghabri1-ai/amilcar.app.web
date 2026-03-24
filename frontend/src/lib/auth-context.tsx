"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api, type User, type UserRole } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin: "/dashboard/admin",
  worker: "/dashboard/worker",
  client: "/dashboard/client",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check existing token on mount
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .getMe()
      .then((u) => {
        setUser(u);
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_role");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      localStorage.setItem("access_token", res.access_token);
      localStorage.setItem("user_role", res.user.role);
      document.cookie = `user_role=${res.user.role};path=/;max-age=${60 * 60 * 24 * 7}`;
      setUser(res.user);
      router.push(ROLE_DASHBOARDS[res.user.role]);
    },
    [router]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    document.cookie = "user_role=;path=/;max-age=0";
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
