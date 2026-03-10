import { Box, Flex, Text } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, ListOrdered, FlaskConical, Variable } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/tests', label: 'Gérer les tests et leur définition', icon: FileText },
  { path: '/soap', label: 'Gérer les tests Soap et leur définition', icon: FlaskConical },
  { path: '/ordonnancement', label: 'Ordonnancer les tests', icon: ListOrdered },
  { path: '/variables', label: 'Gérer les variables', icon: Variable },
] as const;

export default function AppSidebar() {
  const location = useLocation();

  return (
    <Box
      position="fixed"
      left={0}
      top={0}
      bottom={0}
      w="280px"
      bg="#422AFB"
      color="white"
      overflowY="auto"
      zIndex={20}
    >
      <Flex direction="column" h="full">
        <Box w="full" p={4} borderBottomWidth="1px" borderColor="whiteAlpha.200">
          <Flex direction="column" alignItems="center" gap={1.5}>
            <Box aria-hidden display="flex" justifyContent="center">
              <svg
                width="56"
                height="52"
                viewBox="0 0 56 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Tête arrondie (rectangle à bords arrondis) */}
                <rect x="10" y="8" width="36" height="28" rx="6" fill="white" />
                {/* Yeux - deux cercles */}
                <circle cx="22" cy="20" r="4" fill="#422AFB" />
                <circle cx="34" cy="20" r="4" fill="#422AFB" />
                {/* Antenne centrale - ligne verticale + cercle en haut */}
                <line x1="28" y1="8" x2="28" y2="0" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <circle cx="28" cy="0" r="2.5" fill="white" />
                {/* Oreilles / antennes latérales - lignes horizontales */}
                <line x1="10" y1="22" x2="4" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1="46" y1="22" x2="52" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Box>
            <Text fontSize="xl" fontWeight="bold" color="white" lineHeight="1.2" textTransform="capitalize">
              Uptest
            </Text>
            <Text fontSize="xs" color="white" fontWeight="600" letterSpacing="0.2em" opacity={0.95}>
              BY UPTECH
            </Text>
          </Flex>
        </Box>

        <Box flex="1" p={3}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + '/');
            const Icon = item.icon;

            return (
              <Link key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
                <Box
                  mb={1}
                  px={4}
                  py={3}
                  borderRadius="lg"
                  bg={isActive ? 'white' : 'transparent'}
                  color={isActive ? '#422AFB' : 'white'}
                  fontWeight={isActive ? 'semibold' : 'medium'}
                  _hover={{
                    bg: isActive ? 'white' : 'whiteAlpha.200',
                    color: isActive ? '#422AFB' : 'white',
                  }}
                  transition="all 0.2s"
                >
                  <Flex alignItems="center" gap={3}>
                    <Icon size={18} />
                    <Text fontSize="sm">{item.label}</Text>
                  </Flex>
                </Box>
              </Link>
            );
          })}
        </Box>
      </Flex>
    </Box>
  );
}
