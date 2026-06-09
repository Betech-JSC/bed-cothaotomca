"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { postApi } from "@/services/apiService";

export interface StorefrontUser {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  points: number;
  dob: string | null;
  gender: boolean | null;
  kiotviet_customer_id: number | null;
}

interface AuthContextType {
  user: StorefrontUser | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: {
    name: string;
    phone: string;
    password: string;
    email?: string;
    dob?: string;
    gender?: boolean | null;
  }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateProfile: (data: {
    name: string;
    email?: string;
    phone?: string;
    dob?: string;
    gender?: boolean | null;
  }) => Promise<{ success: boolean; message?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StorefrontUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage on client mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (typeof window !== "undefined") {
        const storedToken = localStorage.getItem("auth_token");
        if (storedToken) {
          setToken(storedToken);
          try {
            // Validate token and fetch user details from /api/auth/me
            const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
            const res = await fetch(`${BASE_URL}/auth/me`, {
              headers: {
                Authorization: `Bearer ${storedToken}`,
                Accept: "application/json",
              },
            });

            if (res.ok) {
              const body = await res.json();
              setUser(body.data);
            } else {
              // Invalid token -> Clear
              localStorage.removeItem("auth_token");
              setToken(null);
              setUser(null);
            }
          } catch (e) {
            console.error("Failed to load user profile on mount:", e);
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (phone: string, password: string) => {
    try {
      const res = await postApi<any>("auth/login", { phone, password });
      if (res?.data?.token) {
        const userToken = res.data.token;
        const userProfile = res.data.user;
        
        localStorage.setItem("auth_token", userToken);
        setToken(userToken);
        setUser(userProfile);
        
        return { success: true };
      }
      return { success: false, message: "Đăng nhập thất bại. Định dạng dữ liệu không khớp." };
    } catch (e: any) {
      return { success: false, message: e.message || "Số điện thoại hoặc mật khẩu không chính xác." };
    }
  };

  const loginWithGoogle = async (credential: string) => {
    try {
      const res = await postApi<any>("auth/google", { credential });
      if (res?.data?.token) {
        const userToken = res.data.token;
        const userProfile = res.data.user;

        localStorage.setItem("auth_token", userToken);
        setToken(userToken);
        setUser(userProfile);

        return { success: true };
      }
      return { success: false, message: "Đăng nhập Google thất bại. Định dạng dữ liệu không khớp." };
    } catch (e: any) {
      return { success: false, message: e.message || "Đăng nhập Google thất bại." };
    }
  };

  const register = async (data: any) => {
    try {
      const res = await postApi<any>("auth/register", data);
      if (res?.data?.token) {
        const userToken = res.data.token;
        const userProfile = res.data.user;

        localStorage.setItem("auth_token", userToken);
        setToken(userToken);
        setUser(userProfile);

        return { success: true };
      }
      return { success: false, message: "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin." };
    } catch (e: any) {
      return { success: false, message: e.message || "Đăng ký thất bại. Số điện thoại đã tồn tại hoặc dữ liệu không hợp lệ." };
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: any) => {
    if (!token) return { success: false, message: "Bạn chưa đăng nhập." };
    
    try {
      const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
      const res = await fetch(`${BASE_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(data),
      });

      const body = await res.json();
      if (res.ok) {
        setUser(body.data);
        return { success: true };
      }
      return { success: false, message: body.message || "Cập nhật thông tin thất bại." };
    } catch (e: any) {
      return { success: false, message: e.message || "Lỗi mạng. Vui lòng thử lại sau." };
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (res.ok) {
        const body = await res.json();
        setUser(body.data);
      }
    } catch (e) {
      console.error("Failed to refresh user info:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, register, logout, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
