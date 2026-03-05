import { Box, Flex } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';

const TABS = [
  { path: '/tests', label: 'Gérer les tests et leur définition' },
  { path: '/soap', label: 'Gérer les tests Soap et leur définition' },
  { path: '/ordonnancement', label: 'Ordonnancer les tests' },
  { path: '/variables', label: 'Gérer les variables' },
] as const;

const tabStyles = {
  px: 4,
  py: 3,
  fontSize: 'sm',
  fontWeight: 'medium',
  borderTopRadius: 'lg',
  borderWidth: '1px',
  borderBottomWidth: 0,
  marginBottom: '-1px',
  textDecoration: 'none',
  display: 'block',
};

export default function TopTabs() {
  const location = useLocation();

  return (
    <Box
      as="nav"
      bg="white"
      borderBottomWidth="1px"
      borderColor="gray.200"
      px={4}
      pt={2}
    >
      <Flex gap={0} align="flex-end" justifyContent="center">
        {TABS.map((tab) => {
          const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
          return (
            <Link
              key={tab.path}
              to={tab.path}
              style={{ textDecoration: 'none' }}
            >
              <Box
                {...tabStyles}
                borderColor={isActive ? 'gray.900' : 'gray.200'}
                bg={isActive ? 'gray.900' : 'transparent'}
                color={isActive ? 'white' : 'gray.600'}
                _hover={{
                  bg: isActive ? 'gray.800' : 'gray.50',
                  color: isActive ? 'white' : 'gray.900',
                  borderColor: isActive ? 'gray.900' : 'gray.300',
                }}
              >
                {tab.label}
              </Box>
            </Link>
          );
        })}
      </Flex>
    </Box>
  );
}
