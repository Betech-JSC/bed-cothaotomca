"use client";

import React, { useEffect, useState } from "react";
import ShareFacebook from "./Icons/ShareFacebook";
import ShareZalo from "./Icons/ShareZalo";
import ShareThreads from "./Icons/ShareThreads";
import { useTranslations } from "next-intl";

const SocialShare = () => {
  const t = useTranslations();
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const encodedUrl = encodeURIComponent(currentUrl);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    zalo: `https://sp.zalo.me/share_to_zalo?url=${encodedUrl}`,
    threads: `https://www.threads.net/intent/post?text=${encodedUrl}`,
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
          title="Facebook"
        >
          <ShareFacebook />
        </a>
        
        <a
          href={shareLinks.zalo}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="size-10 rounded-[8px] flex items-center justify-center bg-gray-25 text-gray-900 lg:hover:text-yellow lg:hover:bg-primary duration-300 ease-in-out"
          title="Zalo"
        >
          <ShareZalo />
        </a>

        <a
          href={shareLinks.threads}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="size-10 rounded-[8px] flex items-center justify-center bg-gray-25 text-gray-900 lg:hover:text-yellow lg:hover:bg-primary duration-300 ease-in-out"
          title="Threads"
        >
          <ShareThreads />
        </a>
      </div>
    </div>
  );
};

export default SocialShare;
