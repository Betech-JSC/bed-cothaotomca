import { Link } from "@/i18n/i18n-navigation";
import Image from "next/image";

type LogoProps = {
  /** Kích thước bình thường (ví dụ dùng ở header/footer) */
  width?: number;
  height?: number;
  /**
   * Kích thước khi header sticky.
   * Nếu không truyền, sẽ dùng width/height như bình thường.
   */
  stickyWidth?: number;
  stickyHeight?: number;
  /** Bật/tắt hiệu ứng resize theo sticky */
  isSticky?: boolean;
  /** Thêm className để dễ canh layout từng nơi */
  className?: string;
};

const Logo = ({
  width = 125,
  height = 80,
  stickyWidth,
  stickyHeight,
  isSticky,
  className = "",
}: LogoProps) => {
  const normalSize = { w: width, h: height };
  const stickySize = {
    w: stickyWidth ?? width,
    h: stickyHeight ?? height,
  };

  const currentSize = isSticky ? stickySize : normalSize;

  return (
    <Link
      href="/"
      className={`flex items-center justify-center ${className}`}
      aria-label="Be - Cô Thảo"
    >
      <div
        className="relative duration-500 ease-in-out"
        style={{ width: currentSize.w, height: currentSize.h }}
      >
        <Image
          src="/images/logo.png"
          alt="Be - Cô Thảo logo"
          fill
          className="hidden object-contain dark:block"
          sizes="(max-width: 768px) 112px, 128px"
          priority
        />
      </div>
    </Link>
  );
};

export default Logo;

