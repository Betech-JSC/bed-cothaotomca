import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const EVIDENCE_DIR = process.env.EVIDENCE_DIR || path.join(__dirname, '../evidence');

test.beforeAll(() => {
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }
});

const viewports = [
  { name: 'iphone-se-375px', width: 375, height: 667 },
  { name: 'iphone-16-pro-393px', width: 393, height: 852 },
];

const testRoutes = [
  { path: '/vi', name: 'homepage' },
  { path: '/vi/about', name: 'about' },
  { path: '/vi/product', name: 'product' },
  { path: '/vi/contact', name: 'contact' },
  { path: '/vi/blog', name: 'blog' },
];

test.describe('Mobile Viewport Overflow & Layout Fit Verification', () => {
  for (const vp of viewports) {
    test.describe(`Viewport ${vp.name} (${vp.width}x${vp.height})`, () => {
      for (const route of testRoutes) {
        test(`Verify no horizontal overflow on ${route.name} (${route.path})`, async ({ page }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(route.path, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(1000);

          const overflowMetrics = await page.evaluate(() => {
            const docEl = document.documentElement;
            const body = document.body;

            const docScrollWidth = docEl.scrollWidth;
            const docClientWidth = docEl.clientWidth;
            const bodyScrollWidth = body.scrollWidth;
            const bodyClientWidth = body.clientWidth;
            const windowInnerWidth = window.innerWidth;

            // Find any elements exceeding viewport width
            const overflowingElements: Array<{ selector: string; right: number; scrollWidth: number }> = [];
            const allElements = document.querySelectorAll('*');
            allElements.forEach((el) => {
              const rect = el.getBoundingClientRect();
              if (rect.right > windowInnerWidth + 1) {
                overflowingElements.push({
                  selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.className ? `.${Array.from(el.classList).slice(0, 2).join('.')}` : ''),
                  right: Math.round(rect.right),
                  scrollWidth: el.scrollWidth,
                });
              }
            });

            return {
              docScrollWidth,
              docClientWidth,
              bodyScrollWidth,
              bodyClientWidth,
              windowInnerWidth,
              overflowCount: overflowingElements.length,
              sampleOverflows: overflowingElements.slice(0, 5),
            };
          });

          // Take screenshot for evidence
          const screenshotPath = path.join(EVIDENCE_DIR, `${vp.name}_${route.name}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: false });

          // Assert scrollWidth === clientWidth
          expect(overflowMetrics.docScrollWidth).toBeLessThanOrEqual(vp.width);
          expect(overflowMetrics.docScrollWidth).toBe(overflowMetrics.docClientWidth);
          expect(overflowMetrics.bodyScrollWidth).toBeLessThanOrEqual(vp.width);
          expect(overflowMetrics.bodyScrollWidth).toBe(overflowMetrics.bodyClientWidth);
        });
      }

      test(`Verify Section 2 Crab and Certificate positioning on homepage`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/vi', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        const section2Metrics = await page.evaluate(() => {
          const crabImg = document.querySelector('img[alt="image crab"]');
          const certImg = document.querySelector('img[alt="image certificate"]');
          const windowWidth = window.innerWidth;

          let crabRect: any = null;
          let certRect: any = null;

          if (crabImg) {
            const rect = crabImg.parentElement?.parentElement?.getBoundingClientRect() || crabImg.getBoundingClientRect();
            crabRect = {
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              overflows: rect.right > windowWidth,
            };
          }

          if (certImg) {
            const rect = certImg.parentElement?.getBoundingClientRect() || certImg.getBoundingClientRect();
            certRect = {
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              overflows: rect.right > windowWidth,
            };
          }

          return {
            windowWidth,
            crabRect,
            certRect,
          };
        });

        // Both decorative items must not exceed viewport width
        if (section2Metrics.crabRect) {
          expect(section2Metrics.crabRect.right).toBeLessThanOrEqual(vp.width + 1);
        }
        if (section2Metrics.certRect) {
          expect(section2Metrics.certRect.right).toBeLessThanOrEqual(vp.width + 1);
        }

        const section2Screenshot = path.join(EVIDENCE_DIR, `${vp.name}_section2_decorations.png`);
        await page.screenshot({ path: section2Screenshot, fullPage: false });
      });

      test(`Verify Mobile Drawer inert state when closed on homepage`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/vi', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        const drawerMetrics = await page.evaluate(() => {
          const drawer = document.querySelector('div[role="dialog"]');
          if (!drawer) return null;

          const style = window.getComputedStyle(drawer);
          const className = drawer.className;

          return {
            visibility: style.visibility,
            pointerEvents: style.pointerEvents,
            hasInvisibleClass: className.includes('invisible'),
            hasPointerEventsNoneClass: className.includes('pointer-events-none'),
            hasTranslateClass: className.includes('-translate-x-full'),
          };
        });

        expect(drawerMetrics).not.toBeNull();
        if (drawerMetrics) {
          expect(drawerMetrics.hasInvisibleClass).toBe(true);
          expect(drawerMetrics.hasPointerEventsNoneClass).toBe(true);
          expect(drawerMetrics.hasTranslateClass).toBe(true);
          expect(drawerMetrics.visibility).toBe('hidden');
          expect(drawerMetrics.pointerEvents).toBe('none');
        }
      });
    });
  }
});
