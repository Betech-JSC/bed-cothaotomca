import AboutSectionOne from "@/components/About/AboutSectionOne";
import AboutSectionTwo from "@/components/About/AboutSectionTwo";
import Blog from "@/components/Blog";
import Brands from "@/components/Brands";
import ScrollUp from "@/components/Common/ScrollUp";
import Contact from "@/components/Contact";
import Features from "@/components/Features";
import Hero from "@/components/Hero";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import Video from "@/components/Video";
import { Metadata } from "next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getMessages, DEFAULT_LOCALE } from "@/i18n/i18n";

const messages = getMessages(DEFAULT_LOCALE);

export const metadata: Metadata = {
  title: messages.homeTitle,
  description: messages.homeDescription,
};

export default function Home() {
  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      <ScrollUp />
      <Hero />
      <Features />
      <Video />
      <Brands />
      <AboutSectionOne />
      <AboutSectionTwo />
      <Testimonials />
      <Pricing />
      <Blog />
      <Contact />
    </>
  );
}
