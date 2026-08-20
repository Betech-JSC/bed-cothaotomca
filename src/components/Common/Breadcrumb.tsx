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
      className={`body-2 w-full max-w-full ${classNameNav || ''}`}
    >
      <div className="flex flex-wrap items-center gap-y-1 max-w-full">
        <span className="flex items-center flex-shrink-0">
          <Link href="/" className="text-gray-600 opacity-60 md:opacity-70 lg:hover:text-secondary duration-300 ease-in-out">
            {t("breadcrumb.home")}
          </Link>
          {breadcrumbs.length > 0 && <span className="mx-1 md:mx-2 text-gray-400 opacity-60">/</span>}
        </span>

        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <span key={index} className="inline-flex items-center min-w-0 max-w-full">
              {isLast || !item.url ? (
                <span className="text-gray-600 opacity-70 md:opacity-100 md:text-black font-normal md:font-medium break-words">{item.title}</span>
              ) : (
                <Link href={item.url} className="text-gray-600 opacity-60 md:opacity-70 lg:hover:text-secondary duration-300 ease-in-out">
                  {item.title}
                </Link>
              )}
              {!isLast && <span className="mx-1 md:mx-2 text-gray-400 opacity-60">/</span>}
            </span>
          );
        })}
      </div>
    </nav>
  );
};

export default Breadcrumb;