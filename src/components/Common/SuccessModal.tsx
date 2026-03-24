"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText: string;
}

export default function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  buttonText,
}: SuccessModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-[480px] bg-primary rounded-[32px] p-8 md:p-12 shadow-2xl animate-in zoom-in-95 duration-300 text-center space-y-6">
        <div className="mx-auto size-20 rounded-full bg-green-50 flex items-center justify-center text-green-500 mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="size-10"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>

        <div className="space-y-3">
          <h3 className="headline-3 text-secondary">{title}</h3>
          <p className="body-2 text-yellow">{message}</p>
        </div>

        <button
          onClick={onClose}
          className="btn btn-secondary w-full"
        >
          {buttonText}
        </button>
      </div>
    </div>,
    document.body
  );
}
