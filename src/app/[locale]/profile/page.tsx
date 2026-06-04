"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "@/i18n/routing";

export default function ProfilePage() {
  const { user, loading, logout, updateProfile, refreshUser } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<boolean | null>(null);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load user data into form when user object is loaded
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setDob(user.dob || "");
      setGender(user.gender);
    }
  }, [user, loading, router]);

  // Determine membership tier based on points balance
  const getTierInfo = (points: number) => {
    if (points >= 500) {
      return {
        name: "HỘI VIÊN VÀNG (GOLD)",
        gradient: "from-amber-400 via-yellow-500 to-amber-600",
        textColor: "text-amber-950",
        bgBadge: "bg-amber-900/20 text-amber-200 border-amber-500/30",
        minPoints: 500,
        nextTier: null,
      };
    } else if (points >= 100) {
      return {
        name: "HỘI VIÊN BẠC (SILVER)",
        gradient: "from-slate-300 via-gray-100 to-slate-400",
        textColor: "text-gray-950",
        bgBadge: "bg-slate-900/20 text-slate-200 border-slate-400/30",
        minPoints: 100,
        nextTier: { name: "VÀNG", remaining: 500 - points },
      };
    } else {
      return {
        name: "HỘI VIÊN ĐỒNG (BRONZE)",
        gradient: "from-orange-700 via-orange-500 to-amber-700",
        textColor: "text-orange-50",
        bgBadge: "bg-orange-950/20 text-orange-200 border-orange-500/30",
        minPoints: 0,
        nextTier: { name: "BẠC", remaining: 100 - points },
      };
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Họ tên không được để trống.");
      return;
    }

    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const res = await updateProfile({
      name: name.trim(),
      email: email.trim() || undefined,
      dob: dob || undefined,
      gender: gender !== null ? gender : undefined,
    });

    setSaving(false);
    if (res.success) {
      setSuccessMsg("Cập nhật thông tin cá nhân và đồng bộ KiotViet thành công.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(res.message || "Cập nhật thất bại. Vui lòng thử lại.");
    }
  };

  const handleRefreshPoints = async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-[600px] items-center justify-center bg-primary">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-yellow border-t-transparent"></div>
      </div>
    );
  }

  const tier = getTierInfo(user.points);
  // Generate high quality QR code for counter checkout scanning
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=282828&bgcolor=FFFFFF&data=${user.phone}`;

  return (
    <div className="relative min-h-[800px] bg-primary text-white py-16 px-4">
      {/* Background radial effects */}
      <div className="absolute top-10 left-10 -z-10 h-96 w-96 rounded-full bg-secondary/5 blur-[120px]" />
      <div className="absolute bottom-10 right-10 -z-10 h-96 w-96 rounded-full bg-yellow/5 blur-[120px]" />

      <div className="container mx-auto max-w-5xl">
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">Trang Cá Nhân Thành Viên</h1>
            <p className="text-gray-400 mt-1">Quản lý điểm tích lũy và cập nhật thông tin thành viên của bạn</p>
          </div>
          <button
            onClick={logout}
            className="w-fit border border-white/20 bg-white/5 hover:bg-white/10 text-white rounded-full px-6 py-2.5 font-bold transition-all"
          >
            Đăng Xuất
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Member Card & QR scanning (Left Column) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Membership Virtual Card */}
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tier.gradient} p-6 shadow-2xl transition-all duration-500 hover:scale-[1.02]`}>
              {/* Card glossy background elements */}
              <div className="absolute top-0 right-0 h-40 w-40 -translate-y-12 translate-x-12 rounded-full bg-white/10 blur-xl" />
              <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-black/10 blur-xl" />

              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-bold tracking-widest text-black/50">CƠM THỐ CÔ THẢO</div>
                  <div className={`text-base font-extrabold mt-1 uppercase ${tier.textColor}`}>
                    {tier.name}
                  </div>
                </div>
                <div className={`border rounded-full px-3 py-1 text-xs font-bold border-current ${tier.textColor}`}>
                  VIP
                </div>
              </div>

              <div className="mt-12">
                <div className="text-xs text-black/50 font-bold uppercase tracking-wider">Họ và tên</div>
                <div className={`text-xl font-extrabold truncate ${tier.textColor}`}>
                  {user.name}
                </div>
              </div>

              <div className="mt-6 flex justify-between items-end border-t border-black/10 pt-4">
                <div>
                  <div className="text-xs text-black/50 font-bold uppercase tracking-wider">Số điện thoại</div>
                  <div className={`text-base font-semibold font-mono ${tier.textColor}`}>
                    {user.phone.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-black/50 font-bold uppercase tracking-wider">Tích lũy</div>
                  <div className={`text-2xl font-extrabold ${tier.textColor}`}>
                    {user.points} <span className="text-sm font-normal">đổi thố</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Loyalty points QR Code for cashier scanning */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-xl backdrop-blur-md">
              <h3 className="text-base font-bold mb-2">Mã Thành Viên Tại Quầy</h3>
              <p className="text-xs text-gray-400 mb-6">Đưa mã này cho nhân viên khi thanh toán tại quầy để được cộng điểm thố thưởng</p>
              
              <div className="relative mx-auto w-[200px] h-[200px] rounded-xl bg-white p-2.5 shadow-inner flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="QR Code Phone Number"
                  width={180}
                  height={180}
                  className="rounded-lg"
                />
              </div>
              
              <div className="mt-4 font-mono font-bold text-lg text-yellow tracking-wider">
                {user.phone.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3")}
              </div>

              <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {tier.nextTier 
                    ? `Cần thêm ${tier.nextTier.remaining} điểm để lên hạng ${tier.nextTier.name}` 
                    : "Hạng cao nhất đã đạt được!"}
                </span>
                <button
                  onClick={handleRefreshPoints}
                  disabled={refreshing}
                  className="text-xs font-semibold text-yellow hover:text-secondary flex items-center gap-1 transition-colors"
                >
                  <svg className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.247 7H16" />
                  </svg>
                  {refreshing ? "Đang đồng bộ..." : "Cập nhật điểm"}
                </button>
              </div>
            </div>
          </div>

          {/* Edit Profile fields (Right Column) */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-md">
              <h2 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">Thông Tin Cá Nhân</h2>

              {successMsg && (
                <div className="mb-6 rounded-lg bg-green-500/20 border border-green-500/30 p-3.5 text-sm text-green-200">
                  {successMsg}
                </div>
              )}

              {errorMsg && (
                <div className="mb-6 rounded-lg bg-red-500/20 border border-red-500/30 p-3.5 text-sm text-red-200">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">Họ và tên *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white focus:border-yellow focus:outline-none focus:ring-1 focus:ring-yellow transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">Số điện thoại</label>
                    <input
                      type="text"
                      value={user.phone}
                      disabled
                      className="w-full rounded-xl border border-white/10 bg-white/10 py-3 px-4 text-gray-400 cursor-not-allowed focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white focus:border-yellow focus:outline-none focus:ring-1 focus:ring-yellow transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">Ngày sinh</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-white focus:border-yellow focus:outline-none focus:ring-1 focus:ring-yellow transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">Giới tính</label>
                  <div className="flex items-center gap-6 mt-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        checked={gender === true}
                        onChange={() => setGender(true)}
                        className="h-4 w-4 accent-yellow"
                      />
                      <span>Nam</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        checked={gender === false}
                        onChange={() => setGender(false)}
                        className="h-4 w-4 accent-yellow"
                      />
                      <span>Nữ</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        checked={gender === null}
                        onChange={() => setGender(null)}
                        className="h-4 w-4 accent-yellow"
                      />
                      <span>Không xác định</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full md:w-auto btn btn-secondary !px-8 !py-3 font-bold hover:shadow-lg transition-all"
                  >
                    {saving ? "Đang lưu..." : "Cập nhật hồ sơ"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
