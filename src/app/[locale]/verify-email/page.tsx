import VerifyEmailContainer from "@/components/Auth/VerifyEmailContainer";
import { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Kích hoạt tài khoản - Bếp Cô Thảo",
    description: "Kích hoạt tài khoản thành viên để tận hưởng trọn vẹn đặc quyền ưu đãi tại Bếp Cô Thảo.",
  };
}

export default async function VerifyEmailPage() {
  return (
    <main>
      <Suspense
        fallback={
          <div className="min-h-[90vh] flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        }
      >
        <VerifyEmailContainer />
      </Suspense>
    </main>
  );
}
