import { useEffect, useState } from "react";
import { getCurrentUser, loginUser, logoutUser, registerUser } from "../api/auth";
import type { User } from "../types/user";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("clubpost_token");
    if (!token) {
      setLoading(false);
      return;
    }

    getCurrentUser()
      .then((data) => {
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem("clubpost_token");
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (email: string, pass: string) => {
    setError(null);
    try {
      await loginUser(email, pass);
      const me = await getCurrentUser();
      setUser(me);
      return me;
    } catch (err: any) {
      setError(err.message || "Login failed");
      throw err;
    }
  };

  const register = async (email: string, pass: string) => {
    setError(null);
    try {
      await registerUser(email, pass);
      await login(email, pass);
    } catch (err: any) {
      setError(err.message || "Registration failed");
      throw err;
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  };

  return { user, loading, error, login, register, logout, isAuthenticated: !!user };
}

