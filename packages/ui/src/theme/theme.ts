import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#e6f2ff' },
          100: { value: '#bfdeff' },
          200: { value: '#99caff' },
          300: { value: '#66b3ff' },
          400: { value: '#3399ff' },
          500: { value: '#0077ff' },
          600: { value: '#0066dd' },
          700: { value: '#0055bb' },
          800: { value: '#004499' },
          900: { value: '#003377' },
          950: { value: '#001a44' },
        },
      },
    },
  },
});

const system = createSystem(defaultConfig, config);

export default system;
