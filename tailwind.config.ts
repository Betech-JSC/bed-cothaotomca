const config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    // "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      // Mobile nhỏ & vừa
      xs: "480px",        // Điện thoại màn hình lớn (iPhone Pro Max, Galaxy Plus/Ultra)
      sm: "640px",        // Tablet mini / điện thoại xoay ngang
      md: "768px",        // iPad / Tablet đứng
      lg: "1024px",       // iPad Pro / Laptop nhỏ (13 inch)
      xl: "1280px",       // Laptop phổ thông (14-15 inch)
      "2xl": "1440px",    // Chuẩn Desktop Figma / Màn hình 1440p
      "3xl": "1920px",    // Màn hình Full HD / UltraWide

      // Max-width (Desktop-first helper classes)
      "max-3xl": { max: "1919px" },
      "max-2xl": { max: "1439px" },
      "max-xl": { max: "1279px" },
      "max-lg": { max: "1023px" },
      "max-md": { max: "767px" },
      "max-sm": { max: "639px" },
      "max-xs": { max: "479px" },
    },
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",   // 16px cho mobile (< 640px)
        sm: "1.5rem",      // 24px cho mobile lớn / tablet nhỏ
        md: "2rem",        // 32px cho tablet
        lg: "2.5rem",      // 40px cho laptop
        xl: "2rem",        // 32px cho laptop lớn
        "2xl": "2.5rem",   // 40px cho màn hình 1440px
      },
    },
    extend: {
      colors: {
        primary: "#142A68",
        secondary: "#CD4829",
        yellow: "#F1EEDF",
        brown: "#531712",
        black: "#000000",
        white: "#FFFFFF",
        gray: {
          25: "#FCFCFD",
          50: "#F9F9FB",
          100: "#EFF1F5",
          200: "#DCDFEA",
          300: "#B9C0D4",
          400: "#7D89AF",
          500: "#5D6B98",
          600: "#4A5578",
          700: "#404968",
          800: "#23293D",
          900: "#111322",
        },
      },
      backgroundImage: {},
      keyframes: {
        'progress-bar': {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      animation: {
        'progress-bar': 'progress-bar 500ms ease-out forwards',
      },
      fontFamily: {
        display: ["TomCaSerif", "Roboto", "sans-serif"],
        sans: ["Roboto", "sans-serif"],
        serif: ["Roboto", "serif"],
      },
    },
  },
};

export default config;
