import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      // One content width for every public page: 1200 px of content plus the gutters.
      padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" },
      screens: {
        "2xl": "1264px",
      },
    },
    extend: {
      maxWidth: {
        // Shared by every public page: 1200 px of content inside lg:px-8 gutters.
        site: "1264px",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '"Segoe UI"', 'Arial', 'sans-serif'],
        display: ['"League Spartan"', 'Inter', 'system-ui', '"Segoe UI"', 'Arial', 'sans-serif'],
        body: ['Inter', 'system-ui', '"Segoe UI"', 'Arial', 'sans-serif'],
        poster: ['"League Spartan"', 'Inter', 'system-ui', '"Segoe UI"', 'Arial', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        action: {
          DEFAULT: "hsl(var(--action))",
          hover: "hsl(var(--action-hover))",
          foreground: "hsl(var(--action-foreground))",
        },
        brand: {
          950: "hsl(var(--brand-950))",
          900: "hsl(var(--brand-900))",
          800: "hsl(var(--brand-800))",
          700: "hsl(var(--brand-700))",
          500: "hsl(var(--brand-500))",
        },
        olive: {
          DEFAULT: "hsl(var(--olive))",
          ink: "hsl(var(--olive-ink))",
        },
        cream: "hsl(var(--cream))",
        cover: {
          data: "hsl(var(--cover-data))",
          me: "hsl(var(--cover-me))",
          ai: "hsl(var(--cover-ai))",
          research: "hsl(var(--cover-research))",
          geo: "hsl(var(--cover-geo))",
        },
        mint: "hsl(var(--mint))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        forest: {
          DEFAULT: "hsl(var(--forest))",
          foreground: "hsl(var(--forest-foreground))",
          2: "hsl(var(--forest-2))",
        },
        flame: "hsl(var(--flame))",
        royal: "hsl(var(--royal))",
        leaf: {
          DEFAULT: "hsl(var(--leaf))",
          foreground: "hsl(var(--leaf-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          surface: "hsl(var(--success-surface))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          surface: "hsl(var(--warning-surface))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          surface: "hsl(var(--info-surface))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          surface: "hsl(var(--destructive-surface))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        "3xl": "var(--radius)",
        "2xl": "var(--radius)",
        xl: "var(--radius)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "scroll-rtl": {
          "0%": {
            transform: "translateX(0)",
          },
          "100%": {
            transform: "translateX(-50%)",
          },
        },
        "scroll-left": {
          "0%": {
            transform: "translateX(0)",
          },
          "100%": {
            transform: "translateX(-50%)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "scroll-rtl": "scroll-rtl 30s linear infinite",
        "scroll-left": "scroll-left 25s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
