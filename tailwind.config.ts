const config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    // "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "max-xl": { max: "1279px" },
      "max-lg": { max: "1023px" },
      "max-md": { max: "767px" },
    },
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        md: "2rem",
        lg: "2.5rem",
        xl: "2rem",
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
        display: ["TomCaSerif", "sans-serif"],
        sans: ["Roobert", "sans-serif"],
        serif: ["Roboto", "sans-serif"],
      },
    },
  },
};

export default config;
