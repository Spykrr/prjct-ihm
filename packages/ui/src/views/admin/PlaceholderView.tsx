import { Box, Text } from '@chakra-ui/react';

interface PlaceholderViewProps {
  title: string;
}

export default function PlaceholderView({ title }: PlaceholderViewProps) {
  return (
    <Box p={8} bg="gray.50" minH="50vh">
      <Text fontSize="xl" fontWeight="semibold" color="gray.600">
        {title}
      </Text>
      <Text mt={2} color="gray.500">
        Cette section sera bientôt disponible.
      </Text>
    </Box>
  );
}
