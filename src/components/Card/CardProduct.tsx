import Image from "next/image";
import { Link } from "@/i18n/routing";
import React from "react";

interface CardProductProps {
  item: {
    id: number;
    title: string;
    slug: string;
    price: number;
    category: {
      title: string;
      slug: string;
    };
    image: {
      url: string;
      alt?: string;
    };
    description: string;
    created_at: string;
  };
  isHot?: boolean;
}

function formatVND(price: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
}

const CardProduct: React.FC<CardProductProps> = ({ item, isHot }) => {
  return (
    <div className="group rounded-[24px] relative overflow-hidden bg-white">
      {/* Image */}
      <Link
        href={{ pathname: '/product/[category]/[slug]', params: { category: item.category.slug, slug: item.slug } }}
        className="block"
      >
        <div className="aspect-w-1 aspect-h-1 relative overflow-hidden">
          <Image
            src={item.image.url}
            alt={item.image.alt || item.title}
            priority={false}
            fill
            className="h-full w-full object-cover duration-500 ease-in-out lg:group-hover:scale-110"
          />
        </div>
      </Link>

      <div className="py-6 px-4 text-center">
        <Link
          href={{ pathname: '/product/[category]/[slug]', params: { category: item.category.slug, slug: item.slug } }}
          className="block"
        >
          <h3 className={`title-1 text-primary lg:group-hover:text-secondary duration-300 ease-in-out line-clamp-1 min-h-[32px]`}>
            {item.title}
          </h3>
        </Link>
        <div className="body-1 text-gray-900 line-clamp-3 mt-1.5 mb-3">{item.description}</div>
        <div className="flex items-center justify-center gap-1.5">
          <span className="body-0 text-gray-900">chỉ từ</span>
          <span className="title-2 text-secondary">
            {formatVND(item.price)} VNĐ
          </span>
        </div>
      </div>
    </div>
  );
};

export default CardProduct;
