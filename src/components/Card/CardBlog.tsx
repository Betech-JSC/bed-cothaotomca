import Image from "next/image";
import { Link } from "@/i18n/i18n-navigation";
import React from "react";

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
    <article className="group space-y-4 md:space-y-6">
      {/* Image */}
      <Link
        href={{ pathname: '/blog/category/[category]/[slug]', params: { category: item.category.slug, slug: item.slug } }}
        className="block"
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

      <div className="space-y-1">
        <div className="flex items-center space-x-3">
          <div
            className="label-2 font-semibold text-[#941417] hover:underline"
          >
            {item.category.title}
          </div>
          <span className="text-[#941417]">|</span>
          <span className="body-2 text-[#941417]">
            {new Date(item.created_at).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        <Link href={{ pathname: '/blog/category/[category]/[slug]', params: { category: item.category.slug, slug: item.slug } }} className="block">
          <h3 className={`${isHot ? "title-1" : "title-2"} text-primary lg:group-hover:text-secondary duration-300 ease-in-out line-clamp-2`}>
            {item.title}
          </h3>
        </Link>
      </div>
    </article>
  );
};

export default CardBlog;
