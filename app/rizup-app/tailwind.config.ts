import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        mint: { DEFAULT: "#6ecbb0", light: "#e8f7f2", mid: "#b6e5d6", dark: "#5ab89d" },
        orange: { DEFAULT: "#f4976c", light: "#fef0e9", mid: "#fad4be" },
        bg: "#fafafa",
        text: { DEFAULT: "#3a3a3a", mid: "#6b6b6b", light: "#a0a0a0" },
      },
      fontFamily: {
        sans: ['"M PLUS Rounded 1c"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
