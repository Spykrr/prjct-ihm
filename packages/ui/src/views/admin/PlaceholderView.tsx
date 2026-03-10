import { Box } from '@chakra-ui/react';

interface PlaceholderViewProps {
  title?: string;
}

export default function PlaceholderView(_props: PlaceholderViewProps) {
  return <Box p={8} bg="#F8F8F8" minH="50vh" />;
}
