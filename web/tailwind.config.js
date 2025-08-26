import { defineConfig } from 'tailwindcss'

export default defineConfig({
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}', // your UI components
  ],
  theme: {
    extend: {
      colors: {
        border: 'oklch(var(--border))',
        ring: 'oklch(var(--ring))',
        background: 'oklch(var(--background))',
        foreground: 'oklch(var(--foreground))',
        primary: { DEFAULT: 'oklch(var(--primary))', foreground: 'oklch(var(--primary-foreground))' },
        secondary:{ DEFAULT: 'oklch(var(--secondary))', foreground: 'oklch(var(--secondary-foreground))' },
        destructive:{ DEFAULT: 'oklch(var(--destructive))', foreground:'oklch(var(--destructive-foreground))' },
        muted: { DEFAULT: 'oklch(var(--muted))', foreground: 'oklch(var(--muted-foreground))' },
        accent:{ DEFAULT: 'oklch(var(--accent))', foreground: 'oklch(var(--accent-foreground))' },
        popover:{ DEFAULT:'oklch(var(--popover))', foreground:'oklch(var(--popover-foreground))' },
        card: { DEFAULT:'oklch(var(--card))', foreground:'oklch(var(--card-foreground))' },
        'input-background': 'oklch(var(--input-background))',
        input: 'transparent',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'modal-enter': {
          from: { opacity: '0', transform: 'scale(0.96) translateY(-24px)', filter: 'blur(8px)' },
          to:   { opacity: '1', transform: 'scale(1) translateY(0)',        filter: 'blur(0)'  },
        },
        'error-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'modal-enter': 'modal-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'error-shake': 'error-shake 0.5s ease-in-out',
      },
    },
  },
})