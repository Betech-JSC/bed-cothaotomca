import { ComponentProps } from "react";
import { Link } from "@/i18n/i18n-navigation";

type LinkHref = ComponentProps<typeof Link>["href"];

interface BreadcrumbProps {
  breadcrumbs: readonly {
    readonly title: string;
    readonly url?: LinkHref;
  }[];
}

const Breadcrumb = ({ breadcrumbs }: BreadcrumbProps) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className="w-full body-2 flex items-center justify-center"
    >
      <div className="flex whitespace-nowrap line-clamp-1 justify-start items-center gap-0 max-w-full">
        {/* Trang chủ */}
        <span className="flex items-center">
          <Link href="/" className="text-gray-700 opacity-70 lg:hover:text-secondary duration-300 ease-in-out">
            Trang chủ
          </Link>
          {breadcrumbs.length > 0 && <span className="mx-1 md:mx-2">/</span>}
        </span>

        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <span key={index} className="flex items-center">
              {isLast || !item.url ? (
                <span className="text-black line-clamp-1">{item.title}</span>
              ) : (
                <Link href={item.url} className="text-gray-700 opacity-70 lg:hover:text-secondary duration-300 ease-in-out">
                  {item.title}
                </Link>
              )}
              {!isLast && <span className="mx-1 md:mx-2">/</span>}
            </span>
          );
        })}
      </div>
    </nav>
  );
};

export default Breadcrumb;