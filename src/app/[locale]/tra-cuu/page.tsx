"use client";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function TraCuuPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const order = searchParams.get("order") || "";
    const code = searchParams.get("code") || "";
    const phone = searchParams.get("phone") || "";

    const params = new URLSearchParams();
    if (order) params.set("code", order); // map ?order= sang ?code=
    else if (code) params.set("code", code);
    if (phone) params.set("phone", phone);

    const dest = "/order-lookup" + (params.toString() ? "?" + params.toString() : "");
    router.replace(dest);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Đang chuyển hướng...</p>
    </div>
  );
}
