import { Box, Flex, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '../../contexts/useSidebar';
import NavbarLinksAdmin from './NavbarLinksAdmin';

const TAB_NAMES: Record<string, string> = {
  '1': 'Gérer les tests',
  '2': 'Ordonnancer les tests',
  '3': 'Gérer les tests Soap',
  '4': 'Gérer les variables',
};

export default function NavbarAdmin() {
  const { activeTab, setActiveTab } = useSidebar();
  const navigate = useNavigate();

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    navigate(`/${id}`);
  };

  return (
    <Box
      as="nav"
      position="sticky"
      top={0}
      zIndex={10}
      bg="white"
      borderBottomWidth="1px"
      borderColor="gray.200"
      px={6}
      py={4}
    >
      <Flex align="center" justify="space-between">
        <Flex gap={2} align="center">
          {Object.entries(TAB_NAMES).map(([id, name]) => (
            <Button
              key={id}
              size="sm"
              variant={activeTab === id ? 'solid' : 'outline'}
              colorPalette={activeTab === id ? 'blue' : 'gray'}
              onClick={() => handleTabClick(id)}
            >
              {name}
            </Button>
          ))}
        </Flex>
        <NavbarLinksAdmin />
      </Flex>
    </Box>
  );
}
