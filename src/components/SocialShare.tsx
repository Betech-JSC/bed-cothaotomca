"use client";

import React, { useEffect, useState } from "react";
import ShareFacebook from "./Icons/ShareFacebook";
import ShareInstagram from "./Icons/ShareInstagram";
import ShareThreads from "./Icons/ShareThreads";
import { useTranslations } from "next-intl";

const SocialShare = () => {
  const t = useTranslations();
  const [currentUrl, setCurrentUrl] = useState("");
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const encodedUrl = encodeURIComponent(currentUrl);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    threads: `https://www.threads.net/intent/post?text=${encodedUrl}`,
  };

  const handleInstagramClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl).then(() => {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = currentUrl;
        textarea.style.position = "fixed";
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
          setShowCopied(true);
          setTimeout(() => setShowCopied(false), 2000);
        } catch (err) {
          console.error("Failed to copy", err);
        }
        document.body.removeChild(textarea);
      });
    }
  };

  return (
    <div className="flex items-center gap-6">
      <span className="label-1 text-gray-900 font-semibold">{t('common.share')}</span>
      <div className="flex items-center gap-1.5">
        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="size-10 rounded-[8px] flex items-center justify-center bg-gray-25 text-gray-900 lg:hover:text-yellow lg:hover:bg-primary duration-300 ease-in-out"
        >
          <ShareFacebook />
        </a>
        
        <div className="relative">
          <button
            onClick={handleInstagramClick}
            className="size-10 rounded-[8px] flex items-center justify-center bg-gray-25 text-gray-900 lg:hover:text-yellow lg:hover:bg-primary duration-300 ease-in-out cursor-pointer border-0"
            title={t('common.copied_link')}
          >
            <ShareInstagram />
          </button>
          {showCopied && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-gray-950 text-white text-xs font-medium rounded shadow-lg whitespace-nowrap z-50 transition-all duration-300 ease-out border border-gray-800">
              {t('common.copied_link')}
            </div>
          )}
        </div>

        <a
          href={shareLinks.threads}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="size-10 rounded-[8px] flex items-center justify-center bg-gray-25 text-gray-900 lg:hover:text-yellow lg:hover:bg-primary duration-300 ease-in-out"
        >
          <ShareThreads />
        </a>
      </div>
    </div>
  );
};

export default SocialShare;
