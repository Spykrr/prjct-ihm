import { Box, Text } from '@chakra-ui/react';

export default function RefTestFile() {
  return (
    <Box>
      <Text fontSize="lg" mb={4}>
        Ordonnancement des tests (référentiel CSV)
      </Text>
      <Text color="gray.500">Importez un fichier CSV pour gérer l'ordonnancement</Text>
    </Box>
  );
}
