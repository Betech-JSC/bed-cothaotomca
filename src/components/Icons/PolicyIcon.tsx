import React from 'react';

interface IconProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

const PolicyIcon: React.FC<IconProps> = ({ className = "w-5 h-5", width = 20, height = 20 }) => {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default PolicyIcon;
