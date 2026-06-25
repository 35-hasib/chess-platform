import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      screens: {
        // Extra-small breakpoint for narrow phones.
        xs: "420px",
      },
      colors: {
        board: {
          light: "#ebecd0",
          dark: "#739552",
        },
        brand: {
          DEFAULT: "#81b64c",
          dark: "#5d8a36",
        },
        panel: {
          DEFAULT: "#262522",
          light: "#302e2b",
          lighter: "#3d3b37",
        },
      },
    },
  },
  plugins: [],
};

export default config;
