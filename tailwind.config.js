import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
    './storage/framework/views/*.php',
    './resources/views/**/*.blade.php',
    './resources/js/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Brand colors dengan palette lengkap
        brand: {
          // Primary - Biru gelap (#3338A0)
          primary: {
            50: '#f0f2ff',
            100: '#e6e9ff',
            200: '#cdd5ff',
            300: '#b4c1ff',
            400: '#8b9dff',
            500: '#6279ff',
            600: '#3338A0',    // Base color
            700: '#2a2d85',
            800: '#1f226b',
            900: '#151851',
          },
          // Secondary - Coklat keemasan (#C59560)
          secondary: {
            50: '#fef8f3',
            100: '#fdf0e8',
            200: '#f9dcc9',
            300: '#f5c8aa',
            400: '#edb08b',
            500: '#e5986c',
            600: '#C59560',    // Base color
            700: '#a87d50',
            800: '#8b6540',
            900: '#6e4d30',
          },
          // Accent - Kuning emas (#FCC61D)
          accent: {
            50: '#fffbf0',
            100: '#fff8e1',
            200: '#fff4c4',
            300: '#ffeda0',
            400: '#ffe680',
            500: '#FFD700',
            600: '#FCC61D',    // Base color
            700: '#e6b300',
            800: '#cc9900',
            900: '#b38600',
          },
          // Background - Putih hangat (#F7F7F7)
          background: {
            50: '#ffffff',
            100: '#fafafa',
            200: '#f5f5f5',
            300: '#f0f0f0',
            400: '#ebebeb',
            500: '#e6e6e6',
            600: '#F7F7F7',    // Base color
            700: '#d3d3d3',
            800: '#bfbfbf',
            900: '#aaaaaa',
          },
          'primary-light': 'hsl(var(--brand-primary-light))',
          'primary-dark': 'hsl(var(--brand-primary-dark))',
          'secondary-light': 'hsl(var(--brand-secondary-light))',
          'secondary-dark': 'hsl(var(--brand-secondary-dark))',
          'accent-light': 'hsl(var(--brand-accent-light))',
          'accent-dark': 'hsl(var(--brand-accent-dark))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};