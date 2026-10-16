import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import SectionHotProduct from "@/components/Hero/SectionHotProduct";
import SectionSliderPost from "@/components/Common/SectionSliderPost";
import ProductGallery from "@/components/Product/ProductGallery";
import SliderProductRelated from "@/components/Product/SliderProductRelated";
import SectionRelatedPosts from "@/components/Blog/SectionRelatedPosts";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k, useLocale: () => "vi" }));
vi.mock("@/i18n/i18n-navigation", () => ({ Link: ({ children }: any) => <a>{children}</a> }));
vi.mock("@/components/Animated/animated-appear", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("next/image", () => ({ default: ({ alt }: any) => <span data-alt={alt} /> }));
vi.mock("@/components/Common/ZoomableImage", () => ({ default: ({ alt }: any) => <span data-alt={alt} /> }));
vi.mock("@/components/Common/SafeImage", () => ({ default: ({ alt }: any) => <span data-alt={alt} /> }));
vi.mock("swiper/react", () => ({
  Swiper: ({ children }: any) => <div>{children}</div>,
  SwiperSlide: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("swiper/modules", () => ({ Navigation: {} }));
vi.mock("@/components/Card/CardProduct", () => ({ default: ({ item }: any) => <div>{item.title}</div> }));
vi.mock("@/components/Card/CardBlog", () => ({ default: ({ item }: any) => <div>{item.title}</div> }));

describe("Carousel Navigation Position & Responsive", () => {
  it("centers SectionHotProduct navigation buttons vertically and hugs cards across breakpoints", () => {
    const items = [{ id: 1, title: "SP 1" }, { id: 2, title: "SP 2" }];
    const { container } = render(<SectionHotProduct products={items} />);
    const prevBtn = container.querySelector(".swiper-btn-prev") as HTMLElement;
    const nextBtn = container.querySelector(".swiper-btn-next") as HTMLElement;
    expect(prevBtn.className).toContain("top-1/2");
    expect(prevBtn.className).toContain("-translate-y-1/2");
    expect(prevBtn.className).toContain("flex");
    expect(prevBtn.className).not.toContain("top-[117px]");
    expect(prevBtn.className).not.toContain("hidden");
    expect(nextBtn.className).toContain("top-1/2");
    expect(nextBtn.className).toContain("-translate-y-1/2");
  });

  it("centers SectionSliderPost navigation buttons on image box and moves them outside cards on lg/xl+", () => {
    const posts = [{ title: "Post 1", slug: "p1" }, { title: "Post 2", slug: "p2" }];
    const { container } = render(<SectionSliderPost items={posts} />);
    const prevBtn = container.querySelector(".swiper-btn-prev") as HTMLElement;
    const nextBtn = container.querySelector(".swiper-btn-next") as HTMLElement;
    expect(prevBtn.className).toContain("top-[calc(50%-20px)]");
    expect(prevBtn.className).toContain("lg:top-[calc(50%-26px)]");
    expect(prevBtn.className).toContain("-translate-y-1/2");
    expect(prevBtn.className).toContain("xl:-left-14");
    expect(nextBtn.className).toContain("lg:top-[calc(50%-26px)]");
    expect(nextBtn.className).toContain("-translate-y-1/2");
    expect(nextBtn.className).toContain("xl:-right-14");
  });

  it("places ProductGallery navigation buttons on the outer edge of the main image frame without clipping", () => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    const imgs = [{ url: "/1.jpg" }, { url: "/2.jpg" }];
    const { getByLabelText } = render(<ProductGallery images={imgs} title="Tôm" />);
    const prevBtn = getByLabelText("Ảnh trước");
    const nextBtn = getByLabelText("Ảnh tiếp theo");
    expect(prevBtn.className).toContain("-left-3");
    expect(prevBtn.className).toContain("md:-left-5");
    expect(prevBtn.className).toContain("xl:-left-6");
    expect(nextBtn.className).toContain("-right-3");
    expect(nextBtn.className).toContain("md:-right-5");
    expect(nextBtn.className).toContain("xl:-right-6");
    expect(prevBtn.parentElement?.className).not.toContain("overflow-hidden");
  });

  it("centers SliderProductRelated navigation buttons vertically and positions them on the outer edge", () => {
    const items = [{ id: 1, title: "SP 1" }, { id: 2, title: "SP 2" }];
    const { container } = render(<SliderProductRelated products={items} />);
    const prevBtn = container.querySelector(".swiper-btn-prev") as HTMLElement;
    const nextBtn = container.querySelector(".swiper-btn-next") as HTMLElement;
    expect(prevBtn.className).toContain("top-1/2");
    expect(prevBtn.className).toContain("-translate-y-1/2");
    expect(prevBtn.className).toContain("xl:-left-14");
    expect(prevBtn.className).not.toContain("top-[117px]");
    expect(nextBtn.className).toContain("top-1/2");
    expect(nextBtn.className).toContain("xl:-right-14");
  });

  it("centers SectionRelatedPosts navigation buttons on the image box and positions them on the outer edge", () => {
    const items = [
      { image: { url: "/1.jpg" }, title: "B1", slug: "b1", category: { title: "C", slug: "c" } },
      { image: { url: "/2.jpg" }, title: "B2", slug: "b2", category: { title: "C", slug: "c" } },
    ];
    const { container } = render(<SectionRelatedPosts items={items} />);
    const prevBtn = container.querySelector(".swiper-related-btn-prev") as HTMLElement;
    const nextBtn = container.querySelector(".swiper-related-btn-next") as HTMLElement;
    expect(prevBtn.className).toContain("top-[calc(50%-20px)]");
    expect(prevBtn.className).toContain("-translate-y-1/2");
    expect(prevBtn.className).toContain("xl:-left-14");
    expect(prevBtn.className).not.toContain("top-[100px]");
    expect(nextBtn.className).toContain("xl:-right-14");
  });
});
