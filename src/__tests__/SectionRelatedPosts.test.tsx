import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import SectionRelatedPosts, { RelatedPostItem } from "@/components/Blog/SectionRelatedPosts";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      "blog.related_posts": "Bài viết liên quan",
      "common.previous": "Trước",
      "common.next": "Tiếp theo",
    };
    return messages[key] || key;
  },
}));

// Mock navigation
vi.mock("@/i18n/i18n-navigation", () => ({
  Link: ({ children, href, ...props }: any) => <a href={typeof href === 'object' ? href.pathname : href} {...props}>{children}</a>,
}));

// Mock AnimateOnScroll
vi.mock("@/components/Animated/animated-appear", () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => (
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

describe("SectionRelatedPosts Component", () => {
  it("renders swiper container and related posts slides", () => {
    const { container } = render(<SectionRelatedPosts items={mockItems} />);

    expect(screen.getByText("Bài viết liên quan")).toBeInTheDocument();

    const swiper = screen.getByTestId("swiper-container");
    expect(swiper).toBeInTheDocument();

    const slides = screen.getAllByTestId("swiper-slide");
    expect(slides).toHaveLength(2);

    expect(screen.getByText("Cá hồi ngâm tương là gì?")).toBeInTheDocument();
    expect(screen.getByText("Cách bảo quản hải sản tươi sống")).toBeInTheDocument();

    // Verify navigation buttons exist
    const prevBtn = container.querySelector(".swiper-related-btn-prev");
    const nextBtn = container.querySelector(".swiper-related-btn-next");
    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();
  });

  it("returns null when items is empty", () => {
    const { container } = render(<SectionRelatedPosts items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
