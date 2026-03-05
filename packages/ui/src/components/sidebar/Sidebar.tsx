import { Box, Flex } from '@chakra-ui/react';
import Brand from './Brand';
import Content from './Content';
import Tree from './Tree';

export default function Sidebar() {
  return (
    <Box
      position="fixed"
      left={0}
      top={0}
      bottom={0}
      w="280px"
      bg="gray.900"
      color="white"
      overflowY="auto"
    >
      <Flex direction="column" h="full">
        <Brand />
        <Content>
          <Tree />
        </Content>
      </Flex>
    </Box>
  );
}
