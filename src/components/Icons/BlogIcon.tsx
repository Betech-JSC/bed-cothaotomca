import React from 'react';

interface IconProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

const BlogIcon: React.FC<IconProps> = ({ className = "w-5 h-5", width = 20, height = 20 }) => {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M19 20H5C3.89543 20 3 19.1046 3 18V6C3 4.89543 3.89543 4 5 4H15C16.1046 4 17 4.89543 17 6V18C17 19.1046 17.8954 20 19 20ZM19 20C20.1046 20 21 19.1046 21 18V9C21 7.89543 20.1046 7 19 7H17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 8H13M7 12H13M7 16H10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default BlogIcon;
