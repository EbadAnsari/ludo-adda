/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:         '#0D0D0D',
        bg2:        '#141414',
        surface:    '#1A1A1A',
        surface2:   '#212121',
        surface3:   '#272727',
        border:     '#2A2A2A',
        border2:    '#333333',
        green:      '#1DB954',
        'green-d':  '#17A348',
        'green-dim':'rgba(29,185,84,0.08)',
        gold:       '#C9A84C',
        'gold-dim': 'rgba(201,168,76,0.10)',
        red:        '#EF4444',
        'red-dim':  'rgba(239,68,68,0.08)',
        amber:      '#F59E0B',
        blue:       '#3B82F6',
        text1:      '#F0F0F0',
        text2:      '#A0A0A0',
        text3:      '#606060',
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        mono:    ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}
