import { Box, Flex, Text } from '@chakra-ui/react';

export default function AppTopBar() {
  return (
    <Box
      as="header"
      bg="#1A1A1A"
      color="white"
      px={6}
      py={4}
      borderBottomWidth="1px"
      borderColor="whiteAlpha.100"
    >
      <Flex alignItems="center" justifyContent="space-between">
        <Text fontSize="lg" fontWeight="medium">
          Redesign Test Automation Interfaces
        </Text>
      </Flex>
    </Box>
  );
}
