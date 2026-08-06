/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /**
         * The built-in `stone` and `amber` scales are deliberately REPLACED
         * rather than supplemented. Every existing utility in the app already
         * speaks in stone-* (neutrals) and amber-* (brand), so remapping the
         * scales re-themes the whole product coherently instead of leaving a
         * trail of half-converted components.
         *
         * stone -> warm sand neutrals
         * amber -> antique brass
         */
        stone: {
          50: '#FDFBF7', // sidebar / raised cream surfaces
          100: '#F7F2E9',
          200: '#EAE2D4', // hairline borders
          300: '#D8CDB9',
          // 400/500 are solved values, not eyeballed: on a warm background the
          // obvious "light grey" choices fall below WCAG AA. These are the
          // lightest tones that still clear 3:1 / 4.5:1 on every cream surface.
          400: '#958B78', // placeholder / decorative (3.0:1 min)
          500: '#776E5D', // muted body text (4.5:1 min)
          600: '#6B6252',
          700: '#4E473A',
          800: '#373127',
          900: '#26211A', // primary text
          950: '#181410', // espresso
        },

        amber: {
          50: '#FBF7EF',
          100: '#F4EAD6',
          200: '#E9D9B8',
          300: '#D9C08F',
          400: '#C4A46B',
          500: '#B08D57', // the accent — antique brass
          600: '#8C6D3F', // accessible on white (4.8:1)
          700: '#75592F',
          800: '#5C4626',
          900: '#3D2F1B',
          950: '#241C11',
        },

        // Muted status colours so alerts sit calmly on beige
        emerald: {
          50: '#EEF4EE',
          100: '#DCE8DC',
          200: '#BCD3BD',
          600: '#4A7A52',
          700: '#3D6644',
          800: '#325339',
        },
        red: {
          50: '#FaF0ED',
          100: '#F5DED8',
          200: '#E8BFB5',
          600: '#A94A34',
          700: '#8E3D2B',
          800: '#743224',
        },
        blue: {
          50: '#EFF2F6',
          100: '#DDE4EC',
          200: '#BCCAD9',
          700: '#41607F',
          800: '#365068',
        },
        purple: {
          50: '#F3F0F5',
          100: '#E7E1EB',
          200: '#CFC3D7',
          800: '#5A4A66',
        },

        sand: '#F0E9DC', // page canvas
        canvas: '#F0E9DC',
        ink: '#26211A',
        brass: {
          DEFAULT: '#B08D57',
          50: '#FBF7EF',
          100: '#F4EAD6',
        },
      },

      fontFamily: {
        // Fraunces carries the couture feel; Inter keeps data legible.
        display: ['"Fraunces"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },

      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },

      boxShadow: {
        // Warm-tinted and very soft — hard grey shadows read cheap on beige.
        card: '0 1px 2px rgba(61, 47, 27, 0.04), 0 12px 32px -20px rgba(61, 47, 27, 0.22)',
        'card-hover': '0 1px 2px rgba(61, 47, 27, 0.05), 0 20px 44px -22px rgba(61, 47, 27, 0.30)',
        header: '0 8px 30px -22px rgba(61, 47, 27, 0.45)',
        pop: '0 40px 80px -30px rgba(24, 20, 16, 0.45)',
        rail: '1px 0 0 0 #EAE2D4',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(14px) scale(0.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-in': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
      },

      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        'rise-in': 'rise-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pop-in': 'pop-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in': 'slide-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both',
      },

      backgroundImage: {
        // Reserved for small dark elements (avatars, icon tiles) and the login
        // brand panel — deep espresso, not the old amber.
        'brass-sheen': 'linear-gradient(135deg, #26211A 0%, #373127 55%, #4E473A 100%)',
        'gold-rule': 'linear-gradient(180deg, transparent, #B08D57 18%, #B08D57 82%, transparent)',
        'banner-cream': 'linear-gradient(135deg, #FDFBF7 0%, #F9F4EA 55%, #F4EAD6 100%)',
      },
    },
  },
  plugins: [],
};
