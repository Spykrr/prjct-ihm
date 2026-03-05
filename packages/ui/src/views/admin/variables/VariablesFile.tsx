import { Box, Text } from '@chakra-ui/react';

export default function VariablesFile() {
  return (
    <Box>
      <Text fontSize="lg" mb={4}>
        Gestion des variables
      </Text>
      <Text color="gray.500">lists, fixed_vars (VAR_), amount_ranges (MNT_), passwords (PWD_)</Text>
    </Box>
  );
}
