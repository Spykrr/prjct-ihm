import { Box, Text } from '@chakra-ui/react';
import { useSidebar } from '../../../contexts/SidebarContext';

export default function TestsFile() {
  const { currentTest } = useSidebar();

  return (
    <Box>
      <Text fontSize="lg" mb={4}>
        Gestion des tests
      </Text>
      {currentTest ? (
        <Text>Test sélectionné : {currentTest}</Text>
      ) : (
        <Text color="gray.500">Sélectionnez un test dans l'arbre</Text>
      )}
    </Box>
  );
}
