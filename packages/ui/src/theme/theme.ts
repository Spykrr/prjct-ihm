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
        // Palette bleue principale (theme de l'application — #422AFB)
        blue: {
          50: { value: '#ede9fe' },
          100: { value: '#ddd6fe' },
          200: { value: '#c4b5fd' },
          300: { value: '#a78bfa' },
          400: { value: '#7c5cfc' },
          500: { value: '#422AFB' },
          600: { value: '#3522d4' },
          700: { value: '#2b1fbf' },
          800: { value: '#221a99' },
          900: { value: '#1a1473' },
          950: { value: '#16104d' },
        },
        brand: {
          50: { value: '#ede9fe' },
          100: { value: '#ddd6fe' },
          200: { value: '#c4b5fd' },
          300: { value: '#a78bfa' },
          400: { value: '#7c5cfc' },
          500: { value: '#422AFB' },
          600: { value: '#3522d4' },
          700: { value: '#2b1fbf' },
          800: { value: '#221a99' },
          900: { value: '#1a1473' },
          950: { value: '#16104d' },
        },
      },
    },
  },
});

const system = createSystem(defaultConfig, config);

export default system;
