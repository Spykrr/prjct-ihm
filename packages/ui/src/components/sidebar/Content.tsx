import { Box } from '@chakra-ui/react';
import type { ReactNode } from 'react';

export default function Content({ children }: { children: ReactNode }) {
  return <Box flex="1" p={2} overflowY="auto">{children}</Box>;
}
