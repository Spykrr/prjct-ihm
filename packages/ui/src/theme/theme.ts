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
        // Palette bleue claire principale (theme — #3B82F6)
        blue: {
          50: { value: '#eff6ff' },
          100: { value: '#dbeafe' },
          200: { value: '#bfdbfe' },
          300: { value: '#93c5fd' },
          400: { value: '#60a5fa' },
          500: { value: '#3B82F6' },
          600: { value: '#2563EB' },
          700: { value: '#1D4ED8' },
          800: { value: '#1E40AF' },
          900: { value: '#1E3A8A' },
          950: { value: '#172554' },
        },
        brand: {
          50: { value: '#eff6ff' },
          100: { value: '#dbeafe' },
          200: { value: '#bfdbfe' },
          300: { value: '#93c5fd' },
          400: { value: '#60a5fa' },
          500: { value: '#3B82F6' },
          600: { value: '#2563EB' },
          700: { value: '#1D4ED8' },
          800: { value: '#1E40AF' },
          900: { value: '#1E3A8A' },
          950: { value: '#172554' },
        },
      },
    },
  },
});

const system = createSystem(defaultConfig, config);

export default system;
