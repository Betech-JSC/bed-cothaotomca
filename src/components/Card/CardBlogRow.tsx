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
};

const CardBlog: React.FC<CardBlogProps> = ({ item }) => {
  return (
    <article className="group flex md:flex-row flex-col md:items-center gap-6 md:gap-3">
      {/* Image */}
      <div className="relative block max-w-full md:max-w-[175px] w-full md:flex-shrink-0">
        <Link href={{ pathname: '/blog/category/[category]/[slug]', params: { category: item.category.slug, slug: item.slug } }} aria-label={item.title}>
          <div className="aspect-w-7 aspect-h-5 relative overflow-hidden rounded-[12px] md:rounded-[8px]">
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
          <div className="flex md:hidden items-center space-x-2 bg-secondary text-yellow rounded-full py-1.5 px-3 w-max">
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

      <div className="md:space-y-2">
        <div className="hidden md:flex items-center space-x-2 bg-secondary text-yellow rounded-full py-1.5 px-3 w-max">
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

        <Link href={{ pathname: '/blog/category/[category]/[slug]', params: { category: item.category.slug, slug: item.slug } }} className="block">
          <h3 className="title-2 text-primary lg:group-hover:text-secondary duration-300 ease-in-out line-clamp-2 md:line-clamp-3">
            {item.title}
          </h3>
        </Link>
      </div>
    </article>
  );
};

export default CardBlog;
