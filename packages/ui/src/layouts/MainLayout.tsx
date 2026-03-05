import { Box } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import TopTabs from '../components/layout/TopTabs';

export default function MainLayout() {
  return (
    <Box minH="100vh" bg="gray.50" display="flex" flexDirection="column">
      <TopTabs />
      <Box flex="1" overflow="auto">
        <Outlet />
      </Box>
    </Box>
  );
}
