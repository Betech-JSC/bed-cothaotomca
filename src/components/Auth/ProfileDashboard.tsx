"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { StorefrontUser } from "@/contexts/AuthContext";
import {
  changePasswordApi,
  getCustomerAddressesApi,
  createCustomerAddressApi,
  updateCustomerAddressApi,
  deleteCustomerAddressApi,
  setDefaultCustomerAddressApi,
  type CustomerAddress,
} from "@/services/authService";
import {
  getAdministrativeUnits,
  type AdministrativeProvince,
} from "@/services/orderService";
import WardSelectCombobox from "@/components/Checkout/WardSelectCombobox";

type ProfileDashboardProps = {
  user: StorefrontUser;
  onLogout: () => void;
  updateProfile: (data: {
    name: string;
    email?: string;
    phone?: string;
    dob?: string;
    gender?: string | boolean | null;
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
  const [activeTab, setActiveTab] = useState<"orders" | "info" | "password" | "addresses">("orders");

  // Personal Info Form State
  const [formData, setFormData] = useState({
    fullname: user.name || "",
    phone: user.phone || "",
    email: user.email || "",
    dob: user.dob ? user.dob.split("T")[0] : "",
    gender: user.gender !== null && user.gender !== undefined ? String(user.gender) : "male",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState<string | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);

  // Orders State
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [expandedOrderCode, setExpandedOrderCode] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Avatar & Points State
  const [refreshingPoints, setRefreshingPoints] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const hasFetchedOrdersRef = useRef<number | null>(null);

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Customer Addresses State
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressModalError, setAddressModalError] = useState<string | null>(null);

  // Address Form State inside Modal
  const [addressForm, setAddressForm] = useState({
    recipient_name: "",
    phone: "",
    province: "TP. Hồ Chí Minh",
    district: "",
    ward: "",
    ward_id: "",
    street_address: "",
    is_default: false,
    notes: "",
  });

  // Administrative units for address picker
  const [adminProvinces, setAdminProvinces] = useState<AdministrativeProvince[]>([]);
  useEffect(() => {
    getAdministrativeUnits().then((units) => {
      if (units && units.length > 0) {
        setAdminProvinces(units);
      }
    });
  }, []);

  const currentProvinceData = useMemo(() => {
    return adminProvinces.find((p) => p.name === addressForm.province);
  }, [adminProvinces, addressForm.province]);

  const availableWards = useMemo(() => {
    return currentProvinceData?.wards || [];
  }, [currentProvinceData]);

  // Load addresses on mount and when tab switched
  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const data = await getCustomerAddressesApi();
      setAddresses(data);
    } catch (err) {
      console.error("fetchAddresses error:", err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  // Fetch orders from API once per user ID
  const userId = user?.id;
  useEffect(() => {
    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const token = localStorage.getItem("auth_token");
        const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
        const res = await fetch(`${BASE_URL}/user/orders`, {
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

    if (userId && hasFetchedOrdersRef.current !== userId) {
      hasFetchedOrdersRef.current = userId;
      fetchOrders();
    }
  }, [userId]);

  // Keep form fields synced when user info changes
  const userName = user?.name;
  const userPhone = user?.phone;
  const userEmail = user?.email;
  const userDob = user?.dob;
  const userGender = user?.gender;

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      fullname: userName || "",
      phone: userPhone || "",
      email: userEmail || "",
      dob: userDob ? userDob.split("T")[0] : "",
      gender: userGender !== null && userGender !== undefined ? String(userGender) : "male",
    }));
  }, [userName, userPhone, userEmail, userDob, userGender]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setInfoSuccess(null);
    setInfoError(null);

    try {
      const payload: any = {
        name: formData.fullname.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        dob: formData.dob || null,
        gender: formData.gender || null,
      };

      const res = await updateProfile(payload);

      if (res.success) {
        setInfoSuccess(t("save_success") || "Đã lưu thay đổi thông tin cá nhân!");
        await refreshUser();
      } else {
        setInfoError(res.message || "Cập nhật thông tin thất bại.");
      }
    } catch (err: any) {
      setInfoError("Đã xảy ra lỗi. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!passwordData.current_password) {
      setPasswordError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (passwordData.new_password.length < 6) {
      setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (passwordData.new_password !== passwordData.new_password_confirmation) {
      setPasswordError("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await changePasswordApi(passwordData);
      setPasswordSuccess(res.message || "Đổi mật khẩu thành công!");
      setPasswordData({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
    } catch (err: any) {
      setPasswordError(err.message || "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Address Actions
  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      recipient_name: user?.name || "",
      phone: user?.phone || "",
      province: "TP. Hồ Chí Minh",
      district: "",
      ward: "",
      ward_id: "",
      street_address: "",
      is_default: addresses.length === 0,
      notes: "",
    });
    setAddressModalError(null);
    setAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: CustomerAddress) => {
    setEditingAddress(addr);
    setAddressForm({
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      province: addr.province,
      district: addr.district,
      ward: addr.ward,
      ward_id: addr.ward_id || "",
      street_address: addr.street_address,
      is_default: addr.is_default,
      notes: addr.notes || "",
    });
    setAddressModalError(null);
    setAddressModalOpen(true);
  };

  const handleSetDefaultAddress = async (id: number) => {
    try {
      await setDefaultCustomerAddressApi(id);
      await fetchAddresses();
    } catch (err: any) {
      alert(err.message || "Không thể đặt làm địa chỉ mặc định.");
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa địa chỉ này?")) return;
    try {
      await deleteCustomerAddressApi(id);
      await fetchAddresses();
    } catch (err: any) {
      alert(err.message || "Không thể xóa địa chỉ.");
    }
  };

  const handleSaveAddressModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.recipient_name.trim() || !addressForm.phone.trim()) {
      setAddressModalError("Vui lòng điền họ tên và số điện thoại người nhận.");
      return;
    }
    if (!addressForm.ward.trim() || !addressForm.street_address.trim()) {
      setAddressModalError("Vui lòng chọn Phường/Xã và nhập số nhà tên đường.");
      return;
    }

    setSavingAddress(true);
    setAddressModalError(null);

    const full_address = [
      addressForm.street_address.trim(),
      addressForm.ward,
      addressForm.district,
      addressForm.province,
    ]
      .filter(Boolean)
      .join(", ");

    try {
      if (editingAddress) {
        await updateCustomerAddressApi(editingAddress.id, {
          recipient_name: addressForm.recipient_name.trim(),
          phone: addressForm.phone.trim(),
          province: addressForm.province,
          district: addressForm.district,
          ward: addressForm.ward,
          ward_id: addressForm.ward_id || null,
          street_address: addressForm.street_address.trim(),
          full_address,
          is_default: addressForm.is_default,
          notes: addressForm.notes.trim() || null,
        });
      } else {
        await createCustomerAddressApi({
          recipient_name: addressForm.recipient_name.trim(),
          phone: addressForm.phone.trim(),
          province: addressForm.province,
          district: addressForm.district,
          ward: addressForm.ward,
          ward_id: addressForm.ward_id || null,
          street_address: addressForm.street_address.trim(),
          full_address,
          is_default: addressForm.is_default,
          notes: addressForm.notes.trim() || null,
        });
      }

      setAddressModalOpen(false);
      await fetchAddresses();
    } catch (err: any) {
      setAddressModalError(err.message || "Lưu địa chỉ thất bại.");
    } finally {
      setSavingAddress(false);
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
    const data = new FormData();
    data.append("avatar", file);

    const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");

    try {
      const res = await fetch(`${BASE_URL}/auth/profile/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: data,
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
        bgBadge: "bg-primary/10 text-primary border-primary/20",
      };
    } else if (points >= 400) {
      return {
        name: t("gold_member"),
        bgBadge: "bg-yellow text-brown border-secondary/30",
      };
    } else {
      return {
        name: t("member"),
        bgBadge: "bg-gray-100 text-gray-700 border-gray-200/50",
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
    <div className="w-full max-w-[1440px] mx-auto min-h-[698px] py-10 md:py-[60px] px-4 md:px-8 xl:px-12 flex flex-col lg:flex-row gap-10 xl:gap-[80px] bg-yellow">
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
              className="absolute bottom-0 right-0 bg-primary rounded-full p-2 border border-white hover:bg-secondary duration-300 disabled:opacity-50 cursor-pointer"
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
          <p className="text-gray-500 text-sm mb-4">
            {user.phone ? user.phone.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3") : ""}
          </p>

          {/* Badges */}
          <div className="flex items-center justify-between w-full border-t border-gray-100 pt-4">
            <span className={`border text-[12px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${tier.bgBadge}`}>
              {tier.name}
            </span>
            <button
              onClick={handleRefreshPoints}
              disabled={refreshingPoints}
              className="text-primary font-bold text-[14px] flex items-center gap-1 hover:text-secondary duration-300 cursor-pointer"
            >
              <svg className={`h-4 w-4 overflow-visible ${refreshingPoints ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.247 7H16" />
              </svg>
              {t("points", { count: user.points })}
            </button>
          </div>

          {/* Menu Items */}
          <div className="w-full border-t border-gray-100 mt-5 pt-4 text-left">
            <span className="text-[12px] font-bold text-gray-400 tracking-widest block mb-3">
              {t("account_label")}
            </span>
            <div className="flex flex-col gap-2">
              {/* Personal Info Tab */}
              <button
                onClick={() => setActiveTab("info")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm cursor-pointer ${
                  activeTab === "info"
                    ? "bg-secondary text-white shadow-sm"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 10C12.2091 10 14 8.20914 14 6C14 3.79086 12.2091 2 10 2C7.79086 2 6 3.79086 6 6C6 8.20914 7.79086 10 10 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 17C3 14.2386 6.13401 12 10 12C13.866 12 17 14.2386 17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("title") || "Thông tin cá nhân"}
              </button>

              {/* Address Book Tab */}
              <button
                onClick={() => setActiveTab("addresses")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm cursor-pointer ${
                  activeTab === "addresses"
                    ? "bg-secondary text-white shadow-sm"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                Sổ địa chỉ nhận hàng
              </button>

              {/* Change Password Tab */}
              <button
                onClick={() => setActiveTab("password")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm cursor-pointer ${
                  activeTab === "password"
                    ? "bg-secondary text-white shadow-sm"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Đổi mật khẩu
              </button>

              {/* Order History Tab */}
              <button
                onClick={() => setActiveTab("orders")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-semibold text-sm cursor-pointer ${
                  activeTab === "orders"
                    ? "bg-secondary text-white shadow-sm"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("order_history") || "Lịch sử đơn hàng"}
              </button>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 py-3 rounded-[24px] font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          {t("logout")}
        </button>
      </div>

      {/* RIGHT COLUMN: Main Content */}
      <div className="grow bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-gray-100">
        {/* TAB 1: ORDER HISTORY */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <h3 className="text-primary font-display font-bold text-[20px] md:text-[22px] flex items-center gap-2.5">
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("transaction_history")}
            </h3>

            <div className="flex flex-col gap-4">
              {loadingOrders ? (
                <div className="text-center py-12 text-gray-500 font-medium text-[14px] animate-pulse">
                  Đang tải đơn hàng...
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
                          ? "bg-gray-50 border-gray-100 hover:border-gray-200"
                          : "bg-yellow/20 border-yellow/60 hover:border-secondary/40"
                      }`}
                      onClick={() => setExpandedOrderCode(expandedOrderCode === order.order_code ? null : order.order_code)}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
                        <div className="flex flex-wrap items-center gap-y-3">
                          <div className="pr-4 md:pr-6">
                            <span className="text-[0.875rem] text-gray-400 font-normal block leading-tight mb-1 uppercase">
                              {t("order_code") || "MÃ GIAO DỊCH"}
                            </span>
                            <span className="text-[1.125rem] md:text-[1.25rem] font-bold text-primary font-mono">
                              {formattedCode}
                            </span>
                          </div>

                          <div className="hidden sm:block h-10 w-px bg-gray-200/90 self-center mx-2 md:mx-4" />

                          <div className="px-2 md:px-4">
                            <span className="text-[0.875rem] text-gray-400 font-normal block leading-tight mb-1 uppercase">
                              {t("order_date") || "NGÀY GIAO DỊCH"}
                            </span>
                            <span className="text-[1rem] md:text-[1.125rem] font-semibold text-gray-900">
                              {formatDate(order.created_at)}
                            </span>
                          </div>

                          <div className="hidden sm:block h-10 w-px bg-gray-200/90 self-center mx-2 md:mx-4" />

                          <div className="pl-2 md:pl-4">
                            <span className="text-[0.875rem] text-gray-400 font-normal block leading-tight mb-1">
                              {t("status") || "Trạng thái"}
                            </span>
                            {isShipping ? (
                              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary text-white text-[0.875rem] font-medium shadow-sm">
                                Đang giao
                              </span>
                            ) : isCompleted ? (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#3BB77E] text-white text-[0.875rem] font-medium">
                                Hoàn thành
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-yellow text-primary border border-secondary/20 text-[0.875rem] font-semibold">
                                Đang chuẩn bị
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 self-end md:self-center">
                          <div className="text-right">
                            <span className="text-[0.875rem] text-gray-400 font-normal block leading-tight mb-1">
                              Tổng cộng
                            </span>
                            <span className="text-[1.125rem] md:text-[1.25rem] font-bold text-secondary">
                              {formatPrice(order.total)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PERSONAL INFO WITH DOB & GENDER */}
        {activeTab === "info" && (
          <form onSubmit={handleSaveInfo} className="space-y-6">
            <h3 className="text-primary font-display font-bold text-[22px] flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 10C12.2091 10 14 8.20914 14 6C14 3.79086 12.2091 2 10 2C7.79086 2 6 3.79086 6 6C6 8.20914 7.79086 10 10 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 17C3 14.2386 6.13401 12 10 12C13.866 12 17 14.2386 17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("title") || "Thông tin cá nhân"}
            </h3>

            {infoSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold">
                {infoSuccess}
              </div>
            )}
            {infoError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {infoError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="col-span-full space-y-1.5">
                <label className="text-sm font-semibold text-primary block">
                  {t("fullname") || "Họ và tên"} <span className="text-red-500">*</span>
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
                  {t("phone") || "Số điện thoại"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  placeholder="0912345678"
                  className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-primary block">
                  {t("email") || "Email"}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                />
              </div>

              {/* Ngày sinh (dob) */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-primary block flex items-center justify-between">
                  <span>Ngày sinh</span>
                  <span className="text-xs text-secondary font-normal">🎂 Nhận quà sinh nhật</span>
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                />
                <span className="text-[11px] text-gray-500 block">
                  Cung cấp ngày sinh chính xác để nhận quà tặng và mã ưu đãi độc quyền từ Bếp Cô Thảo.
                </span>
              </div>

              {/* Giới tính (gender) */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-primary block">
                  Giới tính
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900 cursor-pointer"
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`btn font-bold h-[44px] rounded-full px-8 transition-all duration-300 text-sm cursor-pointer ${
                  loading
                    ? "bg-gray-200! text-gray-400! shadow-none! cursor-not-allowed"
                    : "btn-secondary text-white shadow-sm hover:shadow-md cursor-pointer"
                } disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed`}
              >
                {loading ? "Đang lưu..." : t("save") || "Lưu thông tin"}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: CHANGE PASSWORD */}
        {activeTab === "password" && (
          <form onSubmit={handlePasswordChange} className="space-y-6 max-w-lg">
            <h3 className="text-primary font-display font-bold text-[22px] flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Đổi mật khẩu tài khoản
            </h3>

            {passwordSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold animate-in fade-in">
                {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-in fade-in">
                {passwordError}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-primary block">
                  Mật khẩu hiện tại <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) =>
                    setPasswordData((prev) => ({ ...prev, current_password: e.target.value }))
                  }
                  required
                  placeholder="Nhập mật khẩu hiện tại"
                  className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-primary block">
                  Mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) =>
                    setPasswordData((prev) => ({ ...prev, new_password: e.target.value }))
                  }
                  required
                  placeholder="Tối thiểu 6 ký tự"
                  className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-primary block">
                  Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={passwordData.new_password_confirmation}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      new_password_confirmation: e.target.value,
                    }))
                  }
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  className="input-form w-full rounded-[12px] border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-[44px] text-gray-900"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className={`btn font-bold h-[44px] rounded-full px-8 transition-all duration-300 text-sm cursor-pointer ${
                  passwordLoading
                    ? "bg-gray-200! text-gray-400! shadow-none! cursor-not-allowed"
                    : "btn-secondary text-white shadow-sm hover:shadow-md cursor-pointer"
                } disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed`}
              >
                {passwordLoading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: ADDRESS BOOK */}
        {activeTab === "addresses" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
              <div>
                <h3 className="text-primary font-display font-bold text-[22px] flex items-center gap-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Sổ địa chỉ nhận hàng
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lưu trữ các địa chỉ thường nhận để thanh toán đơn hàng nhanh chóng chỉ với một chạm.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddAddress}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary text-white text-sm font-bold shadow-sm hover:bg-secondary/90 transition-all cursor-pointer shrink-0"
              >
                <span>+ Thêm địa chỉ mới</span>
              </button>
            </div>

            {loadingAddresses ? (
              <div className="text-center py-12 text-gray-500 animate-pulse text-sm">
                Đang tải danh sách địa chỉ...
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-8 space-y-3">
                <div className="text-4xl">📍</div>
                <p className="text-gray-500 text-sm font-medium">
                  Bạn chưa lưu địa chỉ nhận hàng nào.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddAddress}
                  className="text-secondary font-bold text-sm underline cursor-pointer"
                >
                  Thêm địa chỉ đầu tiên ngay
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`rounded-2xl p-5 border transition-all flex flex-col justify-between gap-3 ${
                      addr.is_default
                        ? "bg-emerald-50/40 border-emerald-300 shadow-xs"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-primary text-base flex items-center gap-2">
                          <span>{addr.recipient_name}</span>
                          {addr.is_default && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider">
                              Mặc định
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 font-mono">
                        📞 {addr.phone}
                      </p>

                      <p className="text-sm text-gray-800 leading-snug">
                        {addr.full_address || `${addr.street_address}, ${addr.ward}, ${addr.district}, ${addr.province}`}
                      </p>

                      {addr.notes && (
                        <p className="text-xs text-gray-500 italic">
                          Ghi chú: {addr.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs">
                      {!addr.is_default ? (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="text-gray-600 hover:text-secondary font-semibold transition-all cursor-pointer"
                        >
                          ★ Đặt làm mặc định
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-semibold">
                          ✓ Địa chỉ nhận hàng chính
                        </span>
                      )}

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenEditAddress(addr)}
                          className="text-primary hover:text-secondary font-bold cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL THÊM / SỬA ĐỊA CHỈ */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-[24px] p-6 sm:p-7 shadow-2xl space-y-4 border border-gray-100 text-gray-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-display font-bold text-lg text-primary flex items-center gap-2">
                <span>📍</span>
                <span>{editingAddress ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ nhận hàng"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setAddressModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {addressModalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                {addressModalError}
              </div>
            )}

            <form onSubmit={handleSaveAddressModal} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary block">
                    Tên người nhận <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressForm.recipient_name}
                    onChange={(e) =>
                      setAddressForm((prev) => ({ ...prev, recipient_name: e.target.value }))
                    }
                    required
                    placeholder="Nguyễn Văn A"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary h-[40px] text-gray-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary block">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={addressForm.phone}
                    onChange={(e) =>
                      setAddressForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    required
                    placeholder="0912345678"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary h-[40px] text-gray-900"
                  />
                </div>
              </div>

              {/* Tỉnh / Thành */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-primary block">
                  Tỉnh / Thành phố <span className="text-red-500">*</span>
                </label>
                <select
                  value={addressForm.province}
                  onChange={(e) => {
                    const newProv = e.target.value;
                    setAddressForm((prev) => ({
                      ...prev,
                      province: newProv,
                      district: "",
                      ward: "",
                      ward_id: "",
                    }));
                  }}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary h-[40px] text-gray-900 cursor-pointer"
                >
                  {adminProvinces.length > 0 ? (
                    adminProvinces.map((prov) => (
                      <option key={prov.id} value={prov.name}>
                        {prov.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="Bình Dương">Bình Dương</option>
                    </>
                  )}
                </select>
              </div>

              {/* Phường / Xã with Combobox */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-primary block">
                  Phường / Xã (Khu vực giao) <span className="text-red-500">*</span>
                </label>
                <WardSelectCombobox
                  wards={availableWards}
                  selectedWardId={addressForm.ward_id}
                  selectedWardName={addressForm.ward}
                  onSelectWard={(wObj) => {
                    if (wObj) {
                      setAddressForm((prev) => ({
                        ...prev,
                        ward: wObj.name,
                        ward_id: wObj.id,
                        district: wObj.district || prev.district,
                      }));
                    } else {
                      setAddressForm((prev) => ({
                        ...prev,
                        ward: "",
                        ward_id: "",
                      }));
                    }
                  }}
                />
              </div>

              {/* Số nhà, tên đường */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-primary block">
                  Số nhà, tên đường <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressForm.street_address}
                  onChange={(e) =>
                    setAddressForm((prev) => ({ ...prev, street_address: e.target.value }))
                  }
                  required
                  placeholder="Ví dụ: 123 Lê Lợi"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary h-[40px] text-gray-900"
                />
              </div>

              {/* Ghi chú */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 block">
                  Ghi chú giao hàng (nếu có)
                </label>
                <input
                  type="text"
                  value={addressForm.notes}
                  onChange={(e) =>
                    setAddressForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Ví dụ: Giao giờ hành chính, gọi trước 15 phút"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary h-[40px] text-gray-900"
                />
              </div>

              {/* Đặt làm mặc định checkbox */}
              <div className="pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={addressForm.is_default}
                    onChange={(e) =>
                      setAddressForm((prev) => ({ ...prev, is_default: e.target.checked }))
                    }
                    className="rounded text-secondary focus:ring-secondary size-4"
                  />
                  <span>Đặt làm địa chỉ nhận hàng mặc định</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAddressModalOpen(false)}
                  className="px-5 py-2 rounded-full border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className={`px-6 py-2 rounded-full bg-secondary text-white font-bold text-sm shadow-sm hover:bg-secondary/90 transition-all cursor-pointer ${
                    savingAddress ? "opacity-75 cursor-not-allowed" : ""
                  }`}
                >
                  {savingAddress ? "Đang lưu..." : "Lưu địa chỉ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDashboard;
