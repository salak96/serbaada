/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: '#080D18',
          navbar: '#0B1220',
          card: '#111A2B',
          modal: '#101827',
          border: '#26364D',
          primary: '#2583F7',
          accent: '#38BDF8',
          hover: '#1D4ED8',
          text: '#F8FAFC',
          muted: '#94A3B8',
          available: '#10B981',
          outOfStock: '#EF4444',
        },
        primary: {
          DEFAULT: '#2583F7',
          hover: '#1D4ED8',
          light: '#0F274A',
          subtle: '#111A2B',
          accent: '#38BDF8',
        },
        success: {
          DEFAULT: '#10B981',
          hover: '#059669',
          light: '#062E20',
        },
        background: '#080D18',
        surface: '#111A2B',
        text: {
          DEFAULT: '#F8FAFC',
          muted: '#94A3B8',
        },
        border: '#26364D',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'lg': '10px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(0, 0, 0, 0.2)',
        'card': '0 4px 20px -2px rgba(8, 13, 24, 0.7), 0 2px 6px -1px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 12px 30px -4px rgba(37, 131, 247, 0.25), 0 0 15px rgba(56, 189, 248, 0.15)',
        'glow': '0 0 20px rgba(37, 131, 247, 0.35)',
        'glow-accent': '0 0 20px rgba(56, 189, 248, 0.4)',
        'drawer': '-10px 0 35px -5px rgba(0, 0, 0, 0.6)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 25px rgba(37, 131, 247, 0.2)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out forwards',
        slideIn: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        slideInLeft: 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        scaleUp: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};
