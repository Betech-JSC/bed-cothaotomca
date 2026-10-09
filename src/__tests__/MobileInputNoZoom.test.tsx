import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { viewport as rootViewport } from "@/app/layout";

describe("MobileInputNoZoom Test Suite", () => {
  it("exports root layout viewport with maximumScale: 1 and userScalable: false", () => {
    expect(rootViewport).toBeDefined();
    expect(rootViewport.width).toBe("device-width");
    expect(rootViewport.initialScale).toBe(1);
    expect(rootViewport.maximumScale).toBe(1);
    expect(rootViewport.userScalable).toBe(false);
  });

  it("exports [locale] layout viewport with maximumScale: 1 and userScalable: false", () => {
    const localeLayoutPath = path.resolve(__dirname, "../app/[locale]/layout.tsx");
    const content = fs.readFileSync(localeLayoutPath, "utf-8");

    expect(content).toContain("export const viewport: Viewport = {");
    expect(content).toContain("maximumScale: 1");
    expect(content).toContain("userScalable: false");
  });

  it("contains @media screen and (max-width: 768px) with font-size: 16px !important in globals.scss", () => {
    const globalsScssPath = path.resolve(__dirname, "../styles/globals.scss");
    const content = fs.readFileSync(globalsScssPath, "utf-8");

    expect(content).toContain("@media screen and (max-width: 768px)");
    expect(content).toContain("font-size: 16px !important;");
    expect(content).toContain('input[type="text"]');
    expect(content).toContain('input[type="password"]');
    expect(content).toContain('input[type="email"]');
    expect(content).toContain('input[type="tel"]');
    expect(content).toContain('input[type="number"]');
    expect(content).toContain('select');
    expect(content).toContain('textarea');
  });

  it("contains anti-zoom font-size rules in input.scss", () => {
    const inputScssPath = path.resolve(__dirname, "../styles/input.scss");
    const content = fs.readFileSync(inputScssPath, "utf-8");

    expect(content).toContain("@media screen and (max-width: 768px)");
    expect(content).toContain("font-size: 16px !important;");
  });
});
