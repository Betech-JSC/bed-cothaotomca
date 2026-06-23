"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { StorefrontUser } from "@/contexts/AuthContext";

type ProfileDashboardProps = {
  user: StorefrontUser;
  onLogout: () => void;
  updateProfile: (data: {
    name: string;
    email?: string;
    phone?: string;
    dob?: string;
    gender?: boolean | null;
  }) => Promise<{ success: boolean; message?: string }>;
  refreshUser: () => Promise<void>;
};

interface OrderItem {
  order_code: string;
  created_at: string;
  status: string;
  total: string;
}

const ProfileDashboard = ({ user, onLogout, updateProfile, refreshUser }: ProfileDashboardProps) => {
  const t = useTranslations("profile");
  const [activeTab, setActiveTab] = useState<"info" | "orders">("orders");
  const [formData, setFormData] = useState({
    fullname: user.name || "",
    phone: user.phone || "",
    email: user.email || "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [refreshingPoints, setRefreshingPoints] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Load address from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAddress = localStorage.getItem("customer_address");
      if (savedAddress) {
        setFormData((prev) => ({ ...prev, address: savedAddress }));
      }
    }
  }, []);

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const token = localStorage.getItem("auth_token");
        const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
        const res = await fetch(`${BASE_URL}/orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        if (res.ok) {
          const body = await res.json();
          setOrders(body.data || []);
        }
      } catch (e) {
        console.error("Failed to fetch orders:", e);
      } finally {
        setLoadingOrders(false);
      }
    };

    if (user) {
      fetchOrders();
    }
  }, [user]);

  // Keep form fields synced with user prop updates
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullname: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateProfile({
        name: formData.fullname.trim(),
        email: formData.email.trim() || undefined,
        phone: !user.phone ? formData.phone.trim() : undefined,
      });

      if (res.success) {
        localStorage.setItem("customer_address", formData.address.trim());
        alert(t("save_success") || "Đã lưu thay đổi thông tin cá nhân!");
      } else {
        alert(res.message || "Cập nhật thông tin thất bại.");
      }
    } catch (err: any) {
      alert("Đã xảy ra lỗi. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPoints = async () => {
    setRefreshingPoints(true);
    await refreshUser();
    setRefreshingPoints(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Kích thước hình ảnh đại diện tối đa là 2MB.");
      return;
    }

    setUploading(true);
    const token = localStorage.getItem("auth_token");
    const formData = new FormData();
    formData.append("avatar", file);

    const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");

    try {
      const res = await fetch(`${BASE_URL}/auth/profile/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      });

      const body = await res.json();

      if (res.ok) {
        alert("Cập nhật ảnh đại diện thành công!");
        await refreshUser();
      } else {
        const errorMsg = body.errors?.avatar?.[0] || body.message || "Cập nhật ảnh đại diện thất bại.";
        alert(errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      alert("Đã xảy ra lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getTierInfo = (points: number) => {
    if (points >= 500) {
      return {
        name: t("gold_member"),
        bgBadge: "bg-[#FDF9ED] text-amber-700 border-amber-200/50",
      };
    } else if (points >= 100) {
      return {
        name: t("silver_member"),
        bgBadge: "bg-slate-100 text-slate-700 border-slate-200/50",
      };
    } else {
      return {
        name: t("bronze_member"),
        bgBadge: "bg-orange-50 text-orange-700 border-orange-200/50",
      };
    }
  };

  const tier = getTierInfo(user.points);

  const mapStatus = (status: string): string => {
    if (status === "synced") return "completed";
    if (status === "pending_payment") return "processing";
    return "processing";
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  const formatPrice = (priceStr: string) => {
    const val = parseFloat(priceStr);
    if (isNaN(val)) return priceStr;
    return new Intl.NumberFormat("vi-VN").format(val) + " VNĐ";
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto min-h-[698px] py-10 md:py-[60px] px-4 md:px-8 xl:px-12 flex flex-col lg:flex-row gap-10 xl:gap-[80px] bg-yellow" style={{ backgroundColor: "#F1EEDF" }}>
      {/* LEFT COLUMN: Sidebar */}
      <div className="w-full lg:w-[320px] shrink-0 space-y-6">
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center">
          {/* Avatar Container */}
          <div className="relative size-24 mb-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
            <div className="size-full rounded-full overflow-hidden border-2 border-primary/20 relative">
              {user.photo_url ? (
                <img
                  src={user.photo_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop"
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <button
              onClick={handleAvatarClick}
              disabled={uploading}
              className="absolute bottom-0 right-0 bg-[#142A68] rounded-full p-2 border border-white hover:bg-secondary duration-300 disabled:opacity-50"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.5 3.5H9.33333C9.02333 3.5 8.74917 3.325 8.62083 3.03917L8.14333 1.96583C7.945 1.5225 7.50167 1.23083 7.0175 1.23083H4.9825C4.49833 1.23083 4.055 1.5225 3.85667 1.96583L3.37917 3.03917C3.25083 3.325 2.97667 3.5 2.66667 3.5H1.5C0.670833 3.5 0 4.17083 0 5V11.5C0 12.3292 0.670833 13 1.5 13H10.5C11.3292 13 12 12.3292 12 11.5V5C12 4.17083 11.3292 3.5 10.5 3.5ZM6 10.75C4.48 10.75 3.25 9.52 3.25 8C3.25 6.48 4.48 5.25 6 5.25C7.52 5.25 8.75 6.48 8.75 8C8.75 9.52 7.52 10.75 6 10.75Z" fill="white"/>
              </svg>
            </button>
          </div>

          {/* User Name & Phone */}
          <h2 className="text-secondary font-display font-bold text-[22px] leading-tight mb-1">
            {user.name}
          </h2>
          <p className="text-gray-500 text-sm font-serif mb-4">
            {user.phone ? user.phone.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3") : ""}
          </p>

          {/* Badges */}
          <div className="flex items-center justify-between w-full border-t border-gray-100 pt-4 font-serif">
            <span className={`border text-[12px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${tier.bgBadge}`}>
              {tier.name}
            </span>
            <button
              onClick={handleRefreshPoints}
              disabled={refreshingPoints}
              className="text-primary font-bold text-[14px] flex items-center gap-1 hover:text-secondary duration-300"
            >
              <svg className={`h-3.5 w-3.5 ${refreshingPoints ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.247 7H16" />
              </svg>
              {t("points", { count: user.points })}
            </button>
          </div>

          {/* Menu Items */}
          <div className="w-full border-t border-gray-100 mt-5 pt-4 text-left">
            <span className="text-[12px] font-bold text-gray-400 tracking-widest block mb-3 font-serif">
              {t("account_label")}
            </span>
            <div className="flex flex-col gap-2 font-serif">
              {/* Personal Info Tab Button */}
              <button
                onClick={() => setActiveTab("info")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm ${
                  activeTab === "info"
                    ? "bg-secondary text-white shadow-sm"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 10C12.2091 10 14 8.20914 14 6C14 3.79086 12.2091 2 10 2C7.79086 2 6 3.79086 6 6C6 8.20914 7.79086 10 10 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 17C3 14.2386 6.13401 12 10 12C13.866 12 17 14.2386 17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t("title")}
              </button>

              {/* Order History Tab Button */}
              <button
                onClick={() => setActiveTab("orders")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm ${
                  activeTab === "orders"
                    ? "bg-secondary text-white shadow-sm"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t("order_history")}
              </button>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 py-3 rounded-[24px] font-bold font-serif text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          {t("logout")}
        </button>
      </div>

      {/* RIGHT COLUMN: Content Card */}
      <div className="grow bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-gray-100">
        {activeTab === "orders" ? (
          /* TRANSACTION HISTORY TAB */
          <div className="space-y-6">
            <h3 className="text-primary font-display font-bold text-[22px] flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t("transaction_history")}
            </h3>

            <div className="flex flex-col gap-4 font-serif">
              {loadingOrders ? (
                <div className="text-center py-10 text-gray-500 font-semibold animate-pulse">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-10 text-gray-400 font-semibold">{t("no_orders") || "Chưa có đơn hàng nào."}</div>
              ) : (
                orders.map((order, idx) => {
                  const mappedStatus = mapStatus(order.status);
                  return (
                    <div
                      key={idx}
                      className="bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-[16px] p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all"
                    >
                      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                        {/* Order Code */}
                        <div>
                          <span className="text-[11px] font-bold text-gray-400 block tracking-wider">
                            {t("order_code")}
                          </span>
                          <span className="text-secondary font-bold text-[15px]">
                            {order.order_code}
                          </span>
                        </div>

                        {/* Order Date */}
                        <div>
                          <span className="text-[11px] font-bold text-gray-400 block tracking-wider">
                            {t("order_date")}
                          </span>
                          <span className="text-primary font-bold text-[15px]">
                            {formatDate(order.created_at)}
                          </span>
                        </div>

                        {/* Order Status */}
                        <div>
                          <span className="text-[11px] font-bold text-gray-400 block tracking-wider mb-0.5">
                            {t("status")}
                          </span>
                          {mappedStatus === "shipping" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#CD4829] text-white text-[12px] font-bold">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="3" width="15" height="13" />
                                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                                <circle cx="5.5" cy="18.5" r="2.5" />
                                <circle cx="18.5" cy="18.5" r="2.5" />
                              </svg>
                              {t("status_shipping")}
                            </span>
                          )}
                          {mappedStatus === "processing" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#A25F4E] text-white text-[12px] font-bold">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              {t("status_processing")}
                            </span>
                          )}
                          {mappedStatus === "completed" && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-primary text-[12px] font-bold">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              {t("status_completed")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Order Price */}
                      <div className="text-[20px] font-bold text-primary self-end md:self-auto">
                        {formatPrice(order.total)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* PERSONAL INFO EDIT TAB */
          <form onSubmit={handleSave} className="space-y-6">
            <h3 className="text-primary font-display font-bold text-[22px] flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 10C12.2091 10 14 8.20914 14 6C14 3.79086 12.2091 2 10 2C7.79086 2 6 3.79086 6 6C6 8.20914 7.79086 10 10 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 17C3 14.2386 6.13401 12 10 12C13.866 12 17 14.2386 17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t("title")}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-serif">
              {/* Full Name */}
              <div className="col-span-full space-y-1.5">
                <label className="text-sm font-semibold text-primary block">
                  {t("fullname")}
                </label>
                <input
                  type="text"
                  name="fullname"
                  value={formData.fullname}
                  onChange={handleInputChange}
                  required
                  className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-primary block">
                  {t("phone")}
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  disabled={!!user.phone}
                  className={`input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900 ${
                    user.phone ? "opacity-60 cursor-not-allowed bg-gray-50" : ""
                  }`}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-primary block">
                  {t("email")}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                />
              </div>

              {/* Address */}
              <div className="col-span-full space-y-1.5">
                <label className="text-sm font-semibold text-primary block">
                  {t("address")}
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`btn btn-secondary text-white font-bold h-[44px] rounded-full px-8 shadow-sm hover:shadow-md transition-all duration-300 ${
                  loading ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "..." : t("save")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfileDashboard;
