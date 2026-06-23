"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "@/i18n/routing";
import ProfileDashboard from "@/components/Auth/ProfileDashboard";

export default function ProfilePage() {
  const { user, loading, logout, updateProfile, refreshUser } = useAuth();
  const router = useRouter();

  // Redirect to signin if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="w-full min-h-[90vh] bg-[#F1EEDF] flex items-center justify-center">
        <div className="animate-pulse text-primary font-bold text-lg font-serif">Loading...</div>
      </div>
    );
  }

  return (
    <ProfileDashboard
      user={user}
      onLogout={logout}
      updateProfile={updateProfile}
      refreshUser={refreshUser}
    />
  );
}
