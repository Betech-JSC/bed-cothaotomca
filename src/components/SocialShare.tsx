"use client";

import React, { useEffect, useState } from "react";
import ShareFacebook from "./Icons/ShareFacebook";
import ShareInstagram from "./Icons/ShareInstagram";
import ShareThreads from "./Icons/ShareThreads";
import { useTranslations } from "next-intl";

const SocialShare = () => {
  const t = useTranslations();
  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`,
    threads: `https://www.threads.net/intent/post?text=${window.location.href}`,
    instagram: "https://www.instagram.com", // Instagram doesn't have a direct "share URL" intent like FB
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
        <a
          href={shareLinks.instagram}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="size-10 rounded-[8px] flex items-center justify-center bg-gray-25 text-gray-900 lg:hover:text-yellow lg:hover:bg-primary duration-300 ease-in-out"
        >
          <ShareInstagram />
        </a>
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
