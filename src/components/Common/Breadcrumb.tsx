import { ComponentProps } from "react";
import { Link } from "@/i18n/i18n-navigation";
import { useTranslations } from "next-intl";

type LinkHref = ComponentProps<typeof Link>["href"];

interface BreadcrumbProps {
  breadcrumbs: readonly {
    readonly title: string;
    readonly url?: LinkHref;
  }[];
  classNameNav?: string;
}

const Breadcrumb = ({ breadcrumbs, classNameNav }: BreadcrumbProps) => {
  const t = useTranslations();
  return (
    <nav
      aria-label="Breadcrumb"
      className={`body-2 md:w-max overflow-hidden w-full line-clamp-1 ${classNameNav}`}
    >
      <div className="flex whitespace-nowrap line-clamp-1 items-center gap-0 max-w-full">
        <span className="flex items-center">
          <Link href="/" className="text-gray-700 opacity-70 lg:hover:text-secondary duration-300 ease-in-out">
            {t("breadcrumb.home")}
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