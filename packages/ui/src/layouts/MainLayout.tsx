import { Box, Flex } from '@chakra-ui/react';
import { useLocation } from 'react-router-dom';
import AppSidebar from '../components/layout/AppSidebar';
import ScreensView from '../views/admin/screens/ScreensView';
import OrdonnancementView from '../views/admin/ordonnancement/OrdonnancementView';
import PlaceholderView from '../views/admin/PlaceholderView';

export default function MainLayout() {
  const location = useLocation();
  const pathname = location.pathname || '/tests';
  const isTests = pathname === '/tests';
  const isOrdonnancement = pathname === '/ordonnancement';
  const isSoap = pathname === '/soap';
  const isVariables = pathname === '/variables';

  return (
    <Flex minH="100vh" bg="#F8F8F8">
      <AppSidebar />
      <Box flex="1" display="flex" flexDirection="column" marginLeft="240px">
        <Box flex="1" overflow="auto" position="relative">
          <Box display={isTests ? 'block' : 'none'} height="100%">
            <ScreensView />
          </Box>
          <Box display={isOrdonnancement ? 'block' : 'none'} height="100%">
            <OrdonnancementView />
          </Box>
          <Box display={isSoap ? 'block' : 'none'} height="100%">
            <PlaceholderView title="Gérer les tests Soap et leur définition" />
          </Box>
          <Box display={isVariables ? 'block' : 'none'} height="100%">
            <PlaceholderView title="Gérer les variables" />
          </Box>
        </Box>
      </Box>
    </Flex>
  );
}
