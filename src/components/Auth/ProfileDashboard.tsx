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
  payment_status?: string;
  subtotal?: string;
  discount?: string;
  delivery_type?: string;
  delivery?: {
    receiver: string;
    contact_number: string;
    address: string;
    price: string;
  } | null;
  payment?: {
    method: string;
    total_payment: string;
  } | null;
  items?: {
    product_name: string;
    quantity: number;
    price: string;
    note: string | null;
  }[];
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
  const [expandedOrderCode, setExpandedOrderCode] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [refreshingPoints, setRefreshingPoints] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // OTP States
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const handleSendOtp = async () => {
    const phoneTrimmed = formData.phone.trim();
    if (!phoneTrimmed) {
      alert("Vui lòng nhập số điện thoại.");
      return;
    }

    setSendingOtp(true);
    try {
      const token = localStorage.getItem("auth_token");
      const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
      const res = await fetch(`${BASE_URL}/auth/profile/send-otp`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ phone: phoneTrimmed }),
      });

      const body = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setOtpCountdown(60);
        alert(body.message || "Mã OTP đã được gửi thành công. Hãy kiểm tra điện thoại của bạn.");
      } else {
        const errorMsg = body.errors?.phone?.[0] || body.message || "Gửi OTP thất bại.";
        alert(errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      alert("Đã xảy ra lỗi kết nối khi gửi OTP. Vui lòng thử lại sau.");
    } finally {
      setSendingOtp(false);
    }
  };

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

    const isPhoneChanged = formData.phone.trim().replace(/[^0-9]/g, "") !== (user.phone || "").replace(/[^0-9]/g, "");
    if (isPhoneChanged && !otpSent) {
      alert("Vui lòng gửi và xác thực mã OTP trước khi thay đổi số điện thoại.");
      return;
    }
    if (isPhoneChanged && otp.length !== 6) {
      alert("Mã OTP phải có 6 chữ số.");
      return;
    }


    setLoading(true);
    try {
      const payload: any = {
        name: formData.fullname.trim(),
        email: formData.email.trim() || undefined,
      };

      if (isPhoneChanged) {
        payload.phone = formData.phone.trim();
        payload.otp = otp;

      }

      const res = await updateProfile(payload);

      if (res.success) {
        localStorage.setItem("customer_address", formData.address.trim());
        alert(t("save_success") || "Đã lưu thay đổi thông tin cá nhân!");
        setOtpSent(false);
        setOtp("");
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
    if (points >= 800) {
      return {
        name: t("diamond_member"),
        bgBadge: "bg-blue-50 text-blue-700 border-blue-200/50",
      };
    } else if (points >= 400) {
      return {
        name: t("gold_member"),
        bgBadge: "bg-[#FDF9ED] text-amber-700 border-amber-200/50",
      };
    } else {
      return {
        name: t("member"),
        bgBadge: "bg-slate-100 text-slate-700 border-slate-200/50",
      };
    }
  };

  const tier = getTierInfo(user.points);

  const mapStatus = (status: string): string => {
    if (status === "synced" || status === "completed" || status === "paid") return "completed";
    if (status === "shipping" || status === "delivering") return "shipping";
    if (status === "cancelled" || status === "cancel_requested") return "cancelled";
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
                  src="/images/default-avatar.svg"
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
                <path d="M10.5 3.5H9.33333C9.02333 3.5 8.74917 3.325 8.62083 3.03917L8.14333 1.96583C7.945 1.5225 7.50167 1.23083 7.0175 1.23083H4.9825C4.49833 1.23083 4.055 1.5225 3.85667 1.96583L3.37917 3.03917C3.25083 3.325 2.97667 3.5 2.66667 3.5H1.5C0.670833 3.5 0 4.17083 0 5V11.5C0 12.3292 0.670833 13 1.5 13H10.5C11.3292 13 12 12.3292 12 11.5V5C12 4.17083 11.3292 3.5 10.5 3.5ZM6 10.75C4.48 10.75 3.25 9.52 3.25 8C3.25 6.48 4.48 5.25 6 5.25C7.52 5.25 8.75 6.48 8.75 8C8.75 9.52 7.52 10.75 6 10.75Z" fill="white" />
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
              <svg className={`h-4 w-4 overflow-visible ${refreshingPoints ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.247 7H16" />
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm ${activeTab === "info"
                  ? "bg-secondary text-white shadow-sm"
                  : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 10C12.2091 10 14 8.20914 14 6C14 3.79086 12.2091 2 10 2C7.79086 2 6 3.79086 6 6C6 8.20914 7.79086 10 10 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 17C3 14.2386 6.13401 12 10 12C13.866 12 17 14.2386 17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("title")}
              </button>

              {/* Order History Tab Button */}
              <button
                onClick={() => setActiveTab("orders")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm ${activeTab === "orders"
                  ? "bg-secondary text-white shadow-sm"
                  : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
          {t("logout")}
        </button>
      </div>

      {/* RIGHT COLUMN: Content Card */}
      <div className="grow bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-gray-100">
        {activeTab === "orders" ? (
          /* TRANSACTION HISTORY TAB */
          <div className="space-y-6 font-serif">
            <h3 className="text-primary font-display font-bold text-[20px] md:text-[22px] flex items-center gap-2.5">
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

              </svg>
              {t("transaction_history")}
            </h3>

            <div className="flex flex-col gap-4 font-serif">
              {loadingOrders ? (
                <div className="text-center py-12 text-gray-500 font-medium text-[14px] animate-pulse">
                  Loading orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-medium text-[14px]">
                  {t("no_orders") || "Chưa có đơn hàng nào."}
                </div>
              ) : (
                orders.map((order, idx) => {
                  const mappedStatus = mapStatus(order.status);
                  const isCompleted = mappedStatus === "completed";
                  const isShipping = mappedStatus === "shipping";
                  const formattedCode = order.order_code.startsWith("#") ? order.order_code : `#${order.order_code}`;

                  return (
                    <div
                      key={idx}
                      className={`border rounded-[1rem] p-5 md:p-6 flex flex-col gap-4 transition-all cursor-pointer hover:shadow-md ${
                        isCompleted
                          ? "bg-[#F8F9FC] border-gray-100 hover:border-gray-200"
                          : "bg-orderBg border-[#F5EEDC] hover:border-amber-200/80"
                      }`}
                      onClick={() => setExpandedOrderCode(expandedOrderCode === order.order_code ? null : order.order_code)}
                    >
                      {/* Main transaction item row matching exact UI specification */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
                        <div className="flex flex-wrap items-center gap-y-3">
                          {/* 1. MÃ GIAO DỊCH */}
                          <div className="pr-4 md:pr-6">
                            <span className="text-[0.875rem] text-[#7D89AF] font-normal block leading-tight mb-1 uppercase">
                              {t("order_code") || "MÃ GIAO DỊCH"}
                            </span>
                            <span className="text-[1.125rem] md:text-[1.25rem] font-bold text-orderCode">
                              {formattedCode}
                            </span>
                          </div>

                          {/* Vertical Divider 1 */}
                          <div className="hidden sm:block h-10 w-px bg-gray-200/90 self-center mx-2 md:mx-4" />

                          {/* 2. NGÀY GIAO DỊCH */}
                          <div className="px-2 md:px-4">
                            <span className="text-[0.875rem] text-[#7D89AF] font-normal block leading-tight mb-1 uppercase">
                              {t("order_date") || "NGÀY GIAO DỊCH"}
                            </span>
                            <span className="text-[1rem] md:text-[1.125rem] font-semibold text-[#111322]">
                              {formatDate(order.created_at)}
                            </span>
                          </div>

                          {/* Vertical Divider 2 */}
                          <div className="hidden sm:block h-10 w-px bg-gray-200/90 self-center mx-2 md:mx-4" />

                          {/* 3. Trạng thái */}
                          <div className="pl-2 md:pl-4">
                            <span className="text-[0.875rem] text-[#7D89AF] font-normal block leading-tight mb-1">
                              {t("status") || "Trạng thái"}
                            </span>

                            {isShipping && (
                              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#CD4829] text-white text-[0.875rem] font-medium shadow-sm">
                                <Image
                                  src="/images/fi_2769339.svg"
                                  alt="Đang giao"
                                  width={18}
                                  height={18}
                                  className="w-4 h-4 object-contain brightness-0 invert"
                                />
                                <span>{t("status_shipping") || "Đang giao"}</span>
                              </span>
                            )}

                            {mappedStatus === "processing" && (
                              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#CD4829] text-white text-[0.875rem] font-medium shadow-sm">
                                <Image
                                  src="/images/fi_3448102.svg"
                                  alt="Đang xử lý"
                                  width={18}
                                  height={18}
                                  className="w-4 h-4 object-contain brightness-0 invert"
                                />
                                <span>{t("status_processing") || "Đang xử lý"}</span>
                              </span>
                            )}

                            {isCompleted && (
                              <span className="inline-flex items-center gap-1.5 text-[#4A5578] text-[0.875rem] font-medium py-1">
                                <Image
                                  src="/images/check.svg"
                                  alt="Hoàn thành"
                                  width={18}
                                  height={18}
                                  className="w-4 h-4 object-contain"
                                />
                                <span>{t("status_completed") || "Hoàn thành"}</span>
                              </span>
                            )}

                            {mappedStatus === "cancelled" && (
                              <span className="inline-flex items-center gap-1.5 text-red-600 text-[0.875rem] font-medium py-1">
                                <span>{t("status_cancelled") || "Đã hủy"}</span>
                              </span>
                            )}

                            {mappedStatus === "error" && (
                              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#BD7F15] text-white text-[0.875rem] font-medium shadow-sm">
                                <span>{t("status_error") || "Lỗi đơn hàng"}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Far Right: Total Amount & Expand Chevron */}
                        <div className="flex items-center gap-4 self-end md:self-auto">
                          <div className="text-[1rem] font-display font-bold text-[#142A68]">
                            {formatPrice(order.total)}
                          </div>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-primary transition-colors">
                            <svg
                              className={`w-5 h-5 transition-transform duration-300 ${expandedOrderCode === order.order_code ? "rotate-180" : ""}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Detail Panel */}
                      {expandedOrderCode === order.order_code && (
                        <div className="mt-2 pt-5 border-t border-gray-200/80 grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm" onClick={(e) => e.stopPropagation()}>
                          {/* Column 1: Items List */}
                          <div className="space-y-3">
                            <h4 className="font-bold text-primary border-b border-gray-100 pb-1.5 text-[14px]">
                              Chi tiết món ăn
                            </h4>
                            <div className="space-y-3 divide-y divide-gray-100 max-h-[250px] overflow-y-auto pr-1">
                              {order.items?.map((item, itemIdx) => (
                                <div key={itemIdx} className={`flex justify-between items-start text-gray-700 ${itemIdx > 0 ? "pt-2.5" : ""}`}>
                                  <div className="flex-1">
                                    <span className="font-semibold text-secondary text-[13px]">{item.product_name}</span>
                                    {item.note && <span className="block text-[11px] text-gray-400 mt-0.5">Ghi chú: {item.note}</span>}
                                  </div>
                                  <div className="w-12 text-center text-gray-500 text-[13px]">x{item.quantity}</div>
                                  <div className="w-24 text-right font-semibold text-primary text-[13px]">{formatPrice(item.price)}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Column 2: Delivery & Summary */}
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <h4 className="font-bold text-primary border-b border-gray-100 pb-1.5 text-[14px]">
                                Thông tin giao nhận
                              </h4>
                              <div className="grid grid-cols-3 gap-y-1.5 text-gray-600 text-[12px] leading-relaxed">
                                <span className="text-gray-400 font-semibold">Hình thức:</span>
                                <span className="col-span-2 font-bold text-secondary">
                                  {order.delivery_type === "pickup" ? "Nhận tại quán" : "Giao hàng tận nơi"}
                                </span>
                                {order.delivery_type === "delivery" && order.delivery && (
                                  <>
                                    <span className="text-gray-400 font-semibold">Người nhận:</span>
                                    <span className="col-span-2">{order.delivery.receiver}</span>
                                    <span className="text-gray-400 font-semibold">Điện thoại:</span>
                                    <span className="col-span-2">{order.delivery.contact_number}</span>
                                    <span className="text-gray-400 font-semibold">Địa chỉ:</span>
                                    <span className="col-span-2">{order.delivery.address}</span>
                                  </>
                                )}
                                <span className="text-gray-400 font-semibold">Thanh toán:</span>
                                <span className="col-span-2 font-bold text-secondary">
                                  {order.payment?.method === "TRANSFER" ? "Chuyển khoản (SePay)" : order.payment?.method || "Chuyển khoản"}
                                </span>
                              </div>
                            </div>

                            {/* Order Totals Summary */}
                            <div className="bg-gray-50/80 p-3 rounded-[12px] space-y-1.5 text-[12px] border border-gray-100">
                              <div className="flex justify-between text-gray-500">
                                <span>Tạm tính:</span>
                                <span>{formatPrice(order.subtotal || "0")}</span>
                              </div>
                              {parseFloat(order.discount || "0") > 0 && (
                                <div className="flex justify-between text-red-500">
                                  <span>Giảm giá:</span>
                                  <span>-{formatPrice(order.discount || "0")}</span>
                                </div>
                              )}
                              {order.delivery_type === "delivery" && order.delivery && parseFloat(order.delivery.price || "0") > 0 && (
                                <div className="flex justify-between text-gray-500">
                                  <span>Phí vận chuyển:</span>
                                  <span>+{formatPrice(order.delivery.price)}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-bold text-sm text-primary pt-2 border-t border-dashed border-gray-200 mt-2">
                                <span>Tổng cộng:</span>
                                <span>{formatPrice(order.total)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
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
                <path d="M10 10C12.2091 10 14 8.20914 14 6C14 3.79086 12.2091 2 10 2C7.79086 2 6 3.79086 6 6C6 8.20914 7.79086 10 10 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 17C3 14.2386 6.13401 12 10 12C13.866 12 17 14.2386 17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="input-form flex-1 rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                  />
                  {formData.phone.trim().replace(/[^0-9]/g, "") !== (user.phone || "").replace(/[^0-9]/g, "") && (
                    <button
                      type="button"
                      disabled={sendingOtp || otpCountdown > 0}
                      onClick={handleSendOtp}
                      className="px-4 py-2 text-xs font-semibold text-white bg-primary rounded-[12px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[44px]"
                    >
                      {sendingOtp ? "Đang gửi..." : otpCountdown > 0 ? `Gửi lại (${otpCountdown}s)` : "Gửi OTP"}
                    </button>
                  )}
                </div>
                {formData.phone.trim().replace(/[^0-9]/g, "") !== (user.phone || "").replace(/[^0-9]/g, "") && otpSent && (
                  <div className="mt-2 space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 block">
                      Mã xác thực OTP (Đã gửi)
                    </label>
                    <input
                      type="text"
                      name="otp"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                      required
                      placeholder="Nhập 6 số OTP"
                      className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                    />
                  </div>
                )}
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
                className={`btn btn-secondary text-white font-bold h-[44px] rounded-full px-8 shadow-sm hover:shadow-md transition-all duration-300 ${loading ? "opacity-75 cursor-not-allowed" : ""
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
