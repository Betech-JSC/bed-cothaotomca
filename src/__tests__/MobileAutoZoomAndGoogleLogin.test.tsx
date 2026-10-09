import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { viewport as rootViewport } from "@/app/layout";

describe("Mobile Auto-Zoom Prevention & Viewport Configuration", () => {
  it("exports root viewport locking unwanted zooming on mobile", () => {
    expect(rootViewport).toBeDefined();
    expect(rootViewport.width).toBe("device-width");
    expect(rootViewport.initialScale).toBe(1);
    expect(rootViewport.maximumScale).toBe(1);
    expect(rootViewport.userScalable).toBe(false);
    expect(rootViewport.interactiveWidget).toBe("resizes-visual");
  });

  it("declares viewport locking unwanted zooming in [locale]/layout.tsx", () => {
    const localeLayoutPath = path.resolve(__dirname, "../app/[locale]/layout.tsx");
    const content = fs.readFileSync(localeLayoutPath, "utf-8");

    expect(content).toContain("export const viewport: Viewport = {");
    expect(content).toContain("width: 'device-width'");
    expect(content).toContain("initialScale: 1");
    expect(content).toContain("maximumScale: 1");
    expect(content).toContain("userScalable: false");
    expect(content).toContain("interactiveWidget: 'resizes-visual'");
  });

  it("declares 16px font-size for inputs on mobile in input.scss to prevent iOS Safari auto-zoom", () => {
    const inputScssPath = path.resolve(__dirname, "../styles/input.scss");
    const content = fs.readFileSync(inputScssPath, "utf-8");

    // Must have max-width: 768px media query
    expect(content).toContain("@media screen and (max-width: 768px)");
    // Must enforce font-size: 16px !important
    expect(content).toContain("font-size: 16px !important;");
    // Must target input, select, textarea, .input-form, .select-form
    expect(content).toContain(".input-form");
    expect(content).toContain(".select-form");
    expect(content).toContain("textarea");
    expect(content).toContain("select");
  });
});
