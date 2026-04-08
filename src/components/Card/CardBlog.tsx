import Image from "next/image";
import { Link } from "@/i18n/i18n-navigation";
import React from "react";
import { formatDate } from "@/lib/format";

type BlogItem = {
  image: {
    url: string;
    alt?: string;
  };
  title: string;
  slug: string;
  category: {
    title: string;
    slug: string;
  };
  created_at: string;
};

type CardBlogProps = {
  item: BlogItem;
  isHot?: boolean;
};

const CardBlog: React.FC<CardBlogProps> = ({ item, isHot }) => {
  return (
    <article className="group space-y-6 md:space-y-4 md:space-y-6">
      {/* Image */}
      <div className="relative">
        <Link
          href={{ pathname: '/blog/category/[category]/[slug]', params: { category: item.category.slug, slug: item.slug } }}
          className="block"
          aria-label={item.title}
        >
          <div className="aspect-w-7 aspect-h-5 relative overflow-hidden rounded-[12px]">
            <Image
              src={item.image.url}
              alt={item.image.alt || item.title}
              priority={false}
              fill
              className="h-full w-full object-cover duration-300 ease-in-out lg:group-hover:scale-105"
            />
          </div>
        </Link>
        <div className="absolute bottom-2 left-2 w-max">
          <div className="flex items-center space-x-2 bg-secondary text-yellow rounded-full py-1.5 px-3">
            <Link
              href={{ pathname: '/blog/category/[category]', params: { category: item.category.slug } }}
              className="label-2 font-semibold lg:hover:underline"
            >
              {item.category.title}
            </Link>
            <span className="body-2">
              {formatDate(item.created_at)}
            </span>
          </div>
        </div>
      </div>

      <div>
        <Link href={{ pathname: '/blog/category/[category]/[slug]', params: { category: item.category.slug, slug: item.slug } }} className="block">
          <h3 className={`${isHot ? "title-1 max-md:text-[18px]" : "title-2"} text-primary lg:group-hover:text-secondary duration-300 ease-in-out line-clamp-2`}>
            {item.title}
          </h3>
        </Link>
      </div>
    </article>
  );
};

export default CardBlog;
