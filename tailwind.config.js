/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Earthy NeoBrutalism Color Palette - Lighter & Faded with Light Background
        'neo': {
          'black': '#000000',        // Pure black for borders
          'dark-bg': '#F5F5F0',      // Faded white/cream background
          'white': '#FFFFFF',        // White for cards
          'lime': '#C4D69B',         // Lighter, faded earthy green
          'teal': '#C4D69B',         // Lighter, faded earthy green
          'olive': '#C4D69B',        // Lighter, faded earthy green
          'forest': '#C4D69B',       // Lighter, faded earthy green
          'coral': '#E89B97',        // Lighter, faded earthy red/coral
          'mustard': '#FFD966',      // Lighter, faded yellow
          'cyan': '#C4D69B',         // Lighter, faded earthy green
          'red': '#E89B97',          // Lighter, faded earthy red
          'blue': '#C4D69B',         // Lighter, faded earthy green
          'orange': '#FFD966',       // Lighter, faded yellow
          'purple': '#C4D69B',       // Lighter, faded earthy green
          'pink': '#E89B97',         // Lighter, faded earthy red
          'gray': '#2A2A2A',         // Dark gray text for light background
        },
        // Earthy Eco-friendly variants
        'eco-brutal': {
          'primary': '#C4D69B',      // Lighter earthy green
          'secondary': '#FFD966',    // Lighter yellow accent
          'accent': '#FFD966',       // Lighter yellow
          'dark': '#F5F5F0',         // Faded white background
          'darker': '#000000',       // Pure black
          'light': '#FFFFFF',        // White for cards
          'gray': '#2A2A2A',         // Dark gray text
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Courier New', 'monospace'],
        'sans': ['Inter', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px #000000',
        'brutal-sm': '2px 2px 0px 0px #000000',
        'brutal-lg': '6px 6px 0px 0px #000000',
        'brutal-color': '4px 4px 0px 0px',
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
        '5': '5px',
      },
      animation: {
        'glitch': 'glitch 0.3s ease-in-out infinite alternate',
        'bounce-brutal': 'bounce-brutal 1s ease-in-out infinite',
      },
      keyframes: {
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        'bounce-brutal': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}