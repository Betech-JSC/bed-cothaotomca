"use client";

import { useEffect, useState } from "react";
import { useGeneralSettings } from "@/contexts/GeneralSettingsContext";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const settings = useGeneralSettings();

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    // Button is displayed after scrolling for 500 pixels
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);

    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  return (
    <div className="fixed right-4 bottom-8 z-80 space-y-4">
      {isVisible && (
        <div
          onClick={scrollToTop}
          aria-label="scroll to top"
          className="bg-secondary flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white shadow-md transition duration-300 ease-in-out"
        >
          <span className="mt-[6px] h-3 w-3 rotate-45 border-t border-l border-white"></span>
        </div>
      )}
      <a href={`tel:${settings?.hotline?.replace(/\s/g, '') || ''}`} target="_blank" rel="noopener noreferrer nofollow" className="bg-primary lg:hover:bg-secondary w-11 h-11 rounded-full flex items-center justify-center transition duration-300 ease-in-out">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.93947 14.0619C7.64872 11.7712 7.13147 9.48043 7.01478 8.56264C6.98218 8.30887 7.06951 8.05437 7.25106 7.87409L9.10485 6.02112C9.37755 5.74859 9.42594 5.32387 9.22154 4.99698L6.26996 0.41381C6.04383 0.0518439 5.57952 -0.0787932 5.19782 0.112155L0.459474 2.34374C0.150809 2.49573 -0.0307442 2.82368 0.00430138 3.16595C0.252577 5.52457 1.28085 11.3226 6.97878 17.021C12.6767 22.7193 18.474 23.7472 20.8338 23.9955C21.1761 24.0305 21.504 23.849 21.656 23.5403L23.8876 18.8019C24.0778 18.4211 23.9481 17.958 23.5876 17.7315L19.0044 14.7807C18.6777 14.5761 18.253 14.6241 17.9803 14.8966L16.1273 16.7504C15.9471 16.9319 15.6926 17.0192 15.4388 16.9866C14.521 16.8699 12.2302 16.3527 9.93947 14.0619Z" fill="#F1EEDF" />
          <path d="M19.0359 12.8276C18.5788 12.8276 18.2083 12.4571 18.2083 12C18.2044 8.57364 15.4278 5.79699 12.0014 5.79311C11.5444 5.79311 11.1738 5.42259 11.1738 4.96553C11.1738 4.50846 11.5444 4.13794 12.0014 4.13794C16.3415 4.14273 19.8587 7.65989 19.8635 12C19.8635 12.4571 19.493 12.8276 19.0359 12.8276Z" fill="#F1EEDF" />
          <path d="M23.1738 12.8276C22.7168 12.8276 22.3462 12.4571 22.3462 12C22.3399 6.28936 17.7121 1.66156 12.0014 1.65517C11.5444 1.65517 11.1738 1.28465 11.1738 0.827586C11.1738 0.370523 11.5444 0 12.0014 0C18.6258 0.0072976 23.9941 5.37561 24.0014 12C24.0014 12.2195 23.9142 12.43 23.759 12.5852C23.6038 12.7404 23.3933 12.8276 23.1738 12.8276Z" fill="#F1EEDF" />
        </svg>
      </a>
      <a href={settings?.link_facebook} target="_blank" rel="noopener noreferrer nofollow" className="bg-primary lg:hover:bg-secondary w-11 h-11 rounded-full flex items-center justify-center transition duration-300 ease-in-out">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#clip0_13792_3402)">
            <path d="M12 0C5.24004 0 0 4.95168 0 11.64C0 15.1384 1.43376 18.1615 3.76867 20.2495C3.96468 20.425 4.083 20.6707 4.09104 20.9338L4.15639 23.0683C4.17727 23.7492 4.88057 24.1922 5.50361 23.9172L7.88544 22.8658C8.08735 22.7767 8.3136 22.7602 8.52636 22.8187C9.62088 23.1197 10.7858 23.28 12 23.28C18.76 23.28 24 18.3283 24 11.64C24 4.95168 18.76 0 12 0Z" fill="#F1EEDF" />
            <path d="M4.79381 15.0441L8.31881 9.4516C8.87953 8.56192 10.0802 8.3404 10.9216 8.97136L13.7252 11.0741C13.9824 11.267 14.3363 11.266 14.5925 11.0716L18.3789 8.19796C18.8843 7.81444 19.544 8.41924 19.2058 8.95595L15.6808 14.5485C15.12 15.4381 13.9193 15.6597 13.078 15.0287L10.2743 12.9259C10.0171 12.733 9.66317 12.734 9.40705 12.9284L5.62061 15.8021C5.11525 16.1856 4.45553 15.5808 4.79381 15.0441Z" fill="#142A68" />
          </g>
          <defs>
            <clipPath id="clip0_13792_3402">
              <rect width="24" height="24" fill="white" />
            </clipPath>
          </defs>
        </svg>

      </a>
      <a href={settings?.link_zalo} target="_blank" rel="noopener noreferrer nofollow" className="bg-primary lg:hover:bg-secondary w-11 h-11 rounded-full flex items-center justify-center transition duration-300 ease-in-out">
        <svg width="26" height="10" viewBox="0 0 26 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#clip0_13792_3407)">
            <path fillRule="evenodd" clipRule="evenodd" d="M13.5228 2.68815V2.20372H14.9743V9.0167H14.1439C13.802 9.0167 13.5247 8.74059 13.5228 8.39939C13.5226 8.3996 13.5224 8.3996 13.5222 8.3998C12.9377 8.82723 12.215 9.08116 11.4346 9.08116C9.47986 9.08116 7.89493 7.49727 7.89493 5.54377C7.89493 3.59028 9.47986 2.00659 11.4346 2.00659C12.215 2.00659 12.9377 2.26031 13.5222 2.68774C13.5224 2.68795 13.5226 2.68795 13.5228 2.68815ZM7.5189 0.0128784V0.233642C7.5189 0.645733 7.46377 0.981956 7.19615 1.37663L7.16382 1.41353C7.10536 1.47986 6.96814 1.63554 6.90284 1.71991L2.24381 7.56774H7.5189V8.39566C7.5189 8.73872 7.24051 9.0167 6.89745 9.0167H0.0625V8.62637C0.0625 8.14815 0.181277 7.93506 0.331354 7.71285L5.29821 1.56527H0.269582V0.0128784H7.5189ZM16.7346 9.0167C16.4491 9.0167 16.217 8.78474 16.217 8.49972V0.0128784H17.7704V9.0167H16.7346ZM22.3637 1.96389C24.3319 1.96389 25.9272 3.5596 25.9272 5.52491C25.9272 7.49208 24.3319 9.0878 22.3637 9.0878C20.3953 9.0878 18.8002 7.49208 18.8002 5.52491C18.8002 3.5596 20.3953 1.96389 22.3637 1.96389ZM11.4346 7.62496C12.5848 7.62496 13.517 6.6934 13.517 5.54377C13.517 4.39601 12.5848 3.46425 11.4346 3.46425C10.2844 3.46425 9.35196 4.39601 9.35196 5.54377C9.35196 6.6934 10.2844 7.62496 11.4346 7.62496ZM22.3637 7.62143C23.5208 7.62143 24.4598 6.68303 24.4598 5.52491C24.4598 4.36865 23.5208 3.43025 22.3637 3.43025C21.2048 3.43025 20.2674 4.36865 20.2674 5.52491C20.2674 6.68303 21.2048 7.62143 22.3637 7.62143Z" fill="#F1EEDF" />
          </g>
          <defs>
            <clipPath id="clip0_13792_3407">
              <rect width="26" height="9.1" fill="white" />
            </clipPath>
          </defs>
        </svg>

      </a>
    </div>
  );
}
