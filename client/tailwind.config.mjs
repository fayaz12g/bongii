/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        page: "var(--color-page)",
        panel: "var(--color-panel)",
        "panel-strong": "var(--color-panel-strong)",
        muted: "var(--color-text-muted)",
        line: "var(--color-border)",
        focus: "var(--color-focus)",
        happened: "var(--color-happened)",
        failed: "var(--color-failed)",
        pending: "var(--color-pending)",
        accent: "var(--color-campaign-accent)",
      },
    },
  },
  plugins: [],
};

export default config;
