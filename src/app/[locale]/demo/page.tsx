"use client";
import Image from "next/image";
import AnimateOnScroll from "@/components/Animated/animated-appear";

export default function Demo() {
  return (
    <main className="min-h-screen py-48 bg-yellow text-gray-900 title-3">
      <div className="container">
        {/* Components Section */}
        <section className="mb-16">
          <h2 className="display-2 font-bold text-primary">Cover</h2>
          <div className="space-y-4">
            <Image
              src="/cover.jpg"
              alt="Cover Image"
              width={1400}
              height={810}
              priority
            />
          </div>
        </section>

        {/* Typography Section */}
        <section className="mb-16">
          <h2 className="display-2 font-bold text-primary">Typography</h2>

          <div className="space-y-4">
            <div>
              <span className="display-1">Display 1</span> - 60px/120%/TomCaSerif/0.02em
            </div>
            <div>
              <span className="display-2">Display 2</span> - 48px/120%/TomCaSerif/0.03em
            </div>
            <div>
              <span className="display-3">Display 3</span> - 36px/132%/TomCaSerif/0.02em
            </div>
        

            <div>
              <span className="headline-1">Headline 1</span> - 32px/120%/TomCaSerif/0.02em
            </div>
            <div>
              <span className="headline-2">Headline 2</span> - 28px/120%/TomCaSerif/0.02em
            </div>
            <div>
              <span className="headline-3">Headline 3</span> - 24px/125%/TomCaSerif/0.02em
            </div>

            <div>
              <span className="title-1">Title 1</span> - 22px/145%/TomCaSerif/0.02em
            </div>
            <div>
              <span className="title-2">Title 2</span> - 18px/145%/TomCaSerif/0.02em
            </div>
            <div>
              <span className="title-3">Title 3</span> - 16px/150%/TomCaSerif/0.02em
            </div>
            <div>
              <span className="title-4">Title 4</span> - 14px/140%/TomCaSerif/0.02em
            </div>

            <div>
              <span className="button-1">Button 1</span> - 16px/150%/TomCaSerif/0.02em
            </div>
            <div>
              <span className="button-2">Button 2</span> - 14px/140%/TomCaSerif/0.02em
            </div>

            <div>
              <span className="body-0">Body 0</span> - 20px/150%/Roboto
            </div>
            <div>
              <span className="body-1">Body 1</span> - 16px/150%/Roboto
            </div>
            <div>
              <span className="body-2">Body 2</span> - 14px/140%/Roboto
            </div>
            <div>
              <span className="body-3">Body 3</span> - 12px/150%/Roboto
            </div>

            <div>
              <span className="label-1">Label 1</span> - 16px/150%/Roboto
            </div>
            <div>
              <span className="label-2">Label 2</span> - 14px/140%/Roboto
            </div>
            <div>
              <span className="label-3">Label 3</span> - 12px/150%/Roboto
            </div>            
          </div>
        </section>

        {/* Colors Section */}
        <section className="mb-16">
          <h2 className="display-2 font-bold text-primary mb-8">Colors</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-primary text-white">Primary</div>
            <div className="p-4 rounded-lg bg-secondary text-white">Secondary</div>
            <div className="p-4 rounded-lg bg-yellow text-gray-900">Yellow</div>
            <div className="p-4 rounded-lg bg-brown text-white">Brown</div>
            <div className="p-4 rounded-lg bg-black text-white">Black</div>
            <div className="p-4 rounded-lg bg-white text-gray-900">White</div>
            <div className="p-4 rounded-lg bg-gray-25 text-gray-900">Gray 25</div>
            <div className="p-4 rounded-lg bg-gray-50 text-gray-900">Gray 50</div>
            <div className="p-4 rounded-lg bg-gray-100 text-gray-900">Gray 100</div>
            <div className="p-4 rounded-lg bg-gray-200 text-gray-900">Gray 200</div>
            <div className="p-4 rounded-lg bg-gray-50">Gray 50</div>
            <div className="p-4 rounded-lg bg-gray-100">Gray 100</div>
            <div className="p-4 rounded-lg bg-gray-200">Gray 200</div>
            <div className="p-4 rounded-lg bg-gray-300">Gray 300</div>
            <div className="p-4 rounded-lg bg-gray-400">Gray 400</div>
            <div className="p-4 rounded-lg bg-gray-500 text-white">
              Gray 500
            </div>
            <div className="p-4 rounded-lg bg-gray-600 text-white">
              Gray 600
            </div>
            <div className="p-4 rounded-lg bg-gray-700 text-white">
              Gray 700
            </div>
            <div className="p-4 rounded-lg bg-gray-800 text-white">
              Gray 800
            </div>
            <div className="p-4 rounded-lg bg-gray-900 text-white">
              Gray 900
            </div>
          </div>
        </section>

        {/* Buttons Section */}
        <section className="mb-16">
          <h2 className="display-4 font-bold text-primary mb-8">Buttons</h2>

          <div className="space-y-8">
            <div className="space-x-4">
              <button className="btn btn-primary">
                <span className="inner">Primary Button</span>
              </button>
            </div>

            <div className="space-x-4">
              <button className="btn btn-secondary">
                <span className="inner">Secondary Button</span>
              </button>
            </div>

            <div className="space-x-4">
              <button className="btn btn-white">
                <span className="inner">White Button</span>
              </button>
            </div>

            <div className="space-x-4">
              <button className="btn-navigation">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button className="btn-navigation" disabled>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Animations Section */}
        <section className="mb-16">
          <h2 className="display-4 font-bold text-primary mb-8">Animations</h2>
          {/* Create some empty space to allow testing scroll */}
          <div className="h-[50vh] flex items-center justify-center border border-dashed border-primary/20 rounded-lg mb-16">
            <span className="text-primary title-1 opacity-50">⬇ Cuộn xuống để xem hiệu ứng AnimateOnScroll ⬇</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            <AnimateOnScroll animate="slideup" delay={0}>
              <div className="p-8 rounded-lg bg-primary text-white text-center title-2">slideup</div>
            </AnimateOnScroll>
            
            <AnimateOnScroll animate="slidedown" delay={150}>
              <div className="p-8 rounded-lg bg-secondary text-white text-center title-2">slidedown</div>
            </AnimateOnScroll>

            <AnimateOnScroll animate="slideleft" delay={300}>
              <div className="p-8 rounded-lg bg-yellow text-gray-900 text-center title-2">slideleft</div>
            </AnimateOnScroll>

            <AnimateOnScroll animate="slideright" delay={450}>
              <div className="p-8 rounded-lg bg-brown text-white text-center title-2">slideright</div>
            </AnimateOnScroll>

            <AnimateOnScroll animate="appear" delay={600}>
              <div className="p-8 rounded-lg bg-black text-white text-center title-2">appear</div>
            </AnimateOnScroll>

            <AnimateOnScroll animate="opacity" delay={750}>
              <div className="p-8 rounded-lg bg-gray-500 text-white text-center title-2">opacity</div>
            </AnimateOnScroll>

            <AnimateOnScroll animate="card-animate" delay={900}>
              <div className="p-8 rounded-lg bg-white text-gray-900 text-center title-2 border">card-animate</div>
            </AnimateOnScroll>
          </div>
          <div className="mt-8 text-center text-gray-500"><p className="body-1">Tải lại trang và cuộn xuống từ từ để xem hiệu ứng</p></div>
        </section>
      </div>
    </main>
  );
}
