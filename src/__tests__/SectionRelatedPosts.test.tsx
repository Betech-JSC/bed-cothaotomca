import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import SectionRelatedPosts, { RelatedPostItem } from "@/components/Blog/SectionRelatedPosts";
import SectionSliderPost from "@/components/Common/SectionSliderPost";
import SliderProductRelated from "@/components/Product/SliderProductRelated";
import SectionHotProduct from "@/components/Hero/SectionHotProduct";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      "blog.related_posts": "Bài viết liên quan",
      "blog.title": "Góc Bếp Cô Thảo Tôm Cá",
      "product.explore-more": "Khám phá thêm",
      "home.section-4.title": "Sản phẩm bán chạy",
      "button.learn-more": "Tìm hiểu thêm",
      "button.order-now": "Đặt hàng ngay",
      "common.previous": "Trước",
      "common.next": "Tiếp theo",
    };
    return messages[key] || key;
  },
  useLocale: () => "vi",
}));

// Mock navigation
vi.mock("@/i18n/i18n-navigation", () => ({
  Link: ({ children, href, ...props }: any) => <a href={typeof href === 'object' ? href.pathname : href} {...props}>{children}</a>,
}));

// Mock CardBlog & CardProduct to isolate Swiper layout tests
vi.mock("@/components/Card/CardBlog", () => ({
  default: ({ item }: any) => <div data-testid="card-blog">{item.title}</div>,
}));

vi.mock("@/components/Card/CardProduct", () => ({
  default: ({ item }: any) => <div data-testid="card-product">{item.title}</div>,
}));

// Mock AnimateOnScroll
vi.mock("@/components/Animated/animated-appear", () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, fill, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock swiper
vi.mock("swiper/react", () => ({
  Swiper: ({ children, className }: any) => <div data-testid="swiper-container" className={className}>{children}</div>,
  SwiperSlide: ({ children, className }: any) => <div data-testid="swiper-slide" className={className}>{children}</div>,
}));

vi.mock("swiper/modules", () => ({
  Navigation: {},
}));

const mockItems: RelatedPostItem[] = [
  {
    image: { url: "/test-1.jpg", alt: "Test 1" },
    title: "Cá hồi ngâm tương là gì?",
    slug: "ca-hoi-ngam-tuong",
    category: { title: "Ẩm thực", slug: "am-thuc" },
  },
  {
    image: { url: "/test-2.jpg", alt: "Test 2" },
    title: "Cách bảo quản hải sản tươi sống",
    slug: "cach-bao-quan-hai-san",
    category: { title: "Mẹo hay", slug: "meo-hay" },
  },
];

const mockProducts = [
  { id: 1, title: "Cá hồi ngâm tương", slug: "ca-hoi" },
  { id: 2, title: "Tôm ngâm tương", slug: "tom-ngam" },
];

describe("SectionRelatedPosts Component", () => {
  it("renders swiper container, related posts slides, and Option 1B alignment classes", () => {
    const { container } = render(<SectionRelatedPosts items={mockItems} />);

    expect(screen.getByText("Bài viết liên quan")).toBeInTheDocument();

    const swiper = screen.getByTestId("swiper-container");
    expect(swiper).toBeInTheDocument();

    const slides = screen.getAllByTestId("swiper-slide");
    expect(slides).toHaveLength(2);

    expect(screen.getByText("Cá hồi ngâm tương là gì?")).toBeInTheDocument();
    expect(screen.getByText("Cách bảo quản hải sản tươi sống")).toBeInTheDocument();

    const wrapper = container.querySelector(".swiper-related-posts");
    expect(wrapper).toHaveClass("md:mx-7", "lg:mx-8", "xl:mx-8", "2xl:mx-0");

    // Verify navigation buttons exist and use Option 1B coordinates
    const prevBtn = container.querySelector(".swiper-related-btn-prev");
    const nextBtn = container.querySelector(".swiper-related-btn-next");
    expect(prevBtn).toHaveClass("md:-left-12", "lg:-left-[52px]", "xl:-left-[56px]", "2xl:-left-[68px]");
    expect(nextBtn).toHaveClass("md:-right-12", "lg:-right-[52px]", "xl:-right-[56px]", "2xl:-right-[68px]");
  });

  it("returns null when items is empty", () => {
    const { container } = render(<SectionRelatedPosts items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("Swiper Responsive Alignment (Option 1B) across SectionSliderPost, SliderProductRelated, and SectionHotProduct", () => {
  it("applies xl:!max-w-[76rem], md:mx-7 lg:mx-8 xl:mx-8 2xl:mx-0, and button offsets on SectionSliderPost", () => {
    const { container } = render(<SectionSliderPost items={mockItems} />);

    const containerDiv = container.querySelector("section > div");
    expect(containerDiv).toHaveClass("md:container", "xl:!max-w-[76rem]");

    const wrapper = container.querySelector(".swiper-related-product");
    expect(wrapper).toHaveClass("md:mx-7", "lg:mx-8", "xl:mx-8", "2xl:mx-0");

    const prevBtn = container.querySelector(".swiper-btn-prev");
    const nextBtn = container.querySelector(".swiper-btn-next");
    expect(prevBtn).toHaveClass("md:-left-12", "lg:-left-[52px]", "xl:-left-[56px]", "2xl:-left-[68px]");
    expect(nextBtn).toHaveClass("md:-right-12", "lg:-right-[52px]", "xl:-right-[56px]", "2xl:-right-[68px]");
  });

  it("applies xl:!max-w-[76rem], md:mx-7 lg:mx-8 xl:mx-8 2xl:mx-0, and button offsets on SliderProductRelated", () => {
    const { container } = render(<SliderProductRelated products={mockProducts} />);

    const containerDiv = container.querySelector("section > div");
    expect(containerDiv).toHaveClass("md:container", "xl:!max-w-[76rem]");

    const wrapper = container.querySelector(".swiper-related-product");
    expect(wrapper).toHaveClass("md:mx-7", "lg:mx-8", "xl:mx-8", "2xl:mx-0");

    const prevBtn = container.querySelector(".swiper-btn-prev");
    const nextBtn = container.querySelector(".swiper-btn-next");
    expect(prevBtn).toHaveClass("md:-left-12", "lg:-left-[52px]", "xl:-left-[56px]", "2xl:-left-[68px]");
    expect(nextBtn).toHaveClass("md:-right-12", "lg:-right-[52px]", "xl:-right-[56px]", "2xl:-right-[68px]");
  });

  it("applies xl:!max-w-[76rem], md:mx-5 lg:mx-6 xl:mx-6 2xl:mx-0, and scale-90 button offsets on SectionHotProduct", () => {
    const { container } = render(<SectionHotProduct products={mockProducts} />);

    const containerDiv = container.querySelector("section > div.relative > div");
    expect(containerDiv).toHaveClass("md:container", "xl:!max-w-[76rem]");

    const wrapper = container.querySelector(".swiper-hot-product");
    expect(wrapper).toHaveClass("md:mx-5", "lg:mx-6", "xl:mx-6", "2xl:mx-0");

    const prevBtn = container.querySelector(".swiper-btn-prev");
    const nextBtn = container.querySelector(".swiper-btn-next");
    expect(prevBtn).toHaveClass("md:-left-9", "lg:-left-11", "xl:-left-[46px]", "2xl:-left-[50px]");
    expect(nextBtn).toHaveClass("md:-right-9", "lg:-right-11", "xl:-right-[46px]", "2xl:-right-[50px]");
  });
});

