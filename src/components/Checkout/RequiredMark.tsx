import React from "react";

interface RequiredMarkProps {
  className?: string;
}

export default function RequiredMark({ className = "" }: RequiredMarkProps) {
  return (
    <span
      className={`text-red-600 font-bold ml-1 select-none ${className}`}
      aria-hidden="true"
    >
      *
    </span>
  );
}
