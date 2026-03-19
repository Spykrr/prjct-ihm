import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  globalCss: {
    html: {
      colorPalette: 'blue',
    },
  },
  theme: {
    tokens: {
      colors: {
        // Palette violette principale (theme — #5D2AD0 / #6036D1)
        blue: {
          50: { value: '#f5f0ff' },
          100: { value: '#e9ddfe' },
          200: { value: '#d4c2fc' },
          300: { value: '#b89bf8' },
          400: { value: '#8b5cf5' },
          500: { value: '#5D2AD0' },
          600: { value: '#4e23b8' },
          700: { value: '#401d9e' },
          800: { value: '#33187d' },
          900: { value: '#1D0D5E' },
          950: { value: '#150a45' },
        },
        brand: {
          50: { value: '#f5f0ff' },
          100: { value: '#e9ddfe' },
          200: { value: '#d4c2fc' },
          300: { value: '#b89bf8' },
          400: { value: '#8b5cf5' },
          500: { value: '#5D2AD0' },
          600: { value: '#4e23b8' },
          700: { value: '#401d9e' },
          800: { value: '#33187d' },
          900: { value: '#1D0D5E' },
          950: { value: '#150a45' },
        },
      },
    },
  },
});

const system = createSystem(defaultConfig, config);

export default system;
