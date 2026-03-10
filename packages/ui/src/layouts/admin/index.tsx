import { useEffect } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { Outlet, useParams } from 'react-router-dom';
import { SidebarProvider } from '../../contexts/SidebarContext';
import { useSidebar } from '../../contexts/useSidebar';
import NavbarAdmin from '../../components/navbar/NavbarAdmin';
import Sidebar from '../../components/sidebar/Sidebar';

function AdminContent() {
  const { tab } = useParams();
  const { setActiveTab } = useSidebar();
  useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab, setActiveTab]);
  return (
    <Flex minH="100vh" bg="gray.50">
      <Sidebar />
      <Box flex="1" display="flex" flexDirection="column" marginLeft="280px">
        <NavbarAdmin />
        <Box flex="1" padding={6}>
          <Outlet />
        </Box>
      </Box>
    </Flex>
  );
}

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <AdminContent />
    </SidebarProvider>
  );
}
