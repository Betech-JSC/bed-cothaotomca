import { Metadata } from "next";
import { Link } from "@/i18n/i18n-navigation";

export const metadata: Metadata = {
  title: "Đã có lỗi xảy ra | Cô Thảo Tôm Cá",
  description: "Trang thông báo lỗi hệ thống Cô Thảo Tôm Cá",
  robots: { index: false, follow: false },
};

export default function ErrorPage() {
  return (
    <main className="min-h-[500px] md:min-h-[700px] flex items-center justify-center bg-yellow p-6">
      <div className="container">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <div className="space-y-3">
            <h1 className="display-1 font-bold text-primary">500</h1>
            <h2 className="title-1 font-display font-bold text-secondary">
              Đã có lỗi xảy ra
            </h2>
            <p className="body-1 text-gray-700 max-w-md mx-auto">
              Hệ thống đang gặp sự cố gián đoạn tạm thời. Vui lòng thử lại sau hoặc quay về trang chủ.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <Link
              href="/"
              className="btn btn-secondary w-[200px]"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
