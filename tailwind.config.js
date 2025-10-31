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
        // Vibrant NeoBrutalism Color Palette (from design)
        'neo': {
          'black': '#000000',
          'dark-bg': '#2D2D2D',
          'white': '#FFFFFF',
          'lime': '#BFFF00',        // Primary vibrant green
          'teal': '#00BCD4',         // Low carbon category
          'olive': '#697B42',        // Public transport
          'forest': '#3D7D5C',       // Alternative green
          'coral': '#FF6B4A',        // Bike friendly
          'mustard': '#E5A82D',      // Walkable cities
          'cyan': '#00E5FF',
          'red': '#FF3D3D',
          'blue': '#4A90E2',
          'orange': '#FF8C42',
          'purple': '#A855F7',
          'gray': '#6B7280',
        },
        // Vibrant Eco-friendly variants
        'eco-brutal': {
          'primary': '#BFFF00',      // Lime green
          'secondary': '#E5A82D',     // Mustard
          'accent': '#00BCD4',        // Teal
          'dark': '#2D2D2D',
          'darker': '#1A1A1A',
          'light': '#FFFFFF',
          'gray': '#6B7280',
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Courier New', 'monospace'],
        'sans': ['Inter', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'brutal': '8px 8px 0px 0px #000000',
        'brutal-sm': '4px 4px 0px 0px #000000',
        'brutal-lg': '12px 12px 0px 0px #000000',
        'brutal-color': '8px 8px 0px 0px',
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