import { Box, Flex, Text } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, ListOrdered, FlaskConical, Variable } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/tests', label: 'Gérer les tests et leur définition', icon: FileText },
  { path: '/soap', label: 'Gérer les tests Soap et leur définition', icon: FlaskConical },
  { path: '/ordonnancement', label: 'Ordonnancer les tests', icon: ListOrdered },
  { path: '/variables', label: 'Gérer les variables', icon: Variable },
] as const;

const SIDEBAR_FONT = "'Poppins', system-ui, sans-serif";

export default function AppSidebar() {
  const location = useLocation();

  return (
    <Box
      position="fixed"
      left={0}
      top={0}
      bottom={0}
      w="240px"
      background="linear-gradient(180deg, #60A5FA 0%, #3B82F6 40%, #2563EB 75%, #1D4ED8 100%)"
      color="white"
      overflowY="auto"
      zIndex={20}
      fontFamily={SIDEBAR_FONT}
    >
      <Flex direction="column" h="full">
        {/* Branding */}
        <Box w="full" p={5} borderBottomWidth="1px" borderColor="whiteAlpha.300">
          <Flex direction="column" alignItems="center" gap={2}>
            <Box aria-hidden display="flex" justifyContent="center" mb={1}>
              <svg
                width="56"
                height="52"
                viewBox="0 0 56 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="10" y="8" width="36" height="28" rx="6" fill="white" />
                <circle cx="22" cy="20" r="4" fill="#3B82F6" />
                <circle cx="34" cy="20" r="4" fill="#3B82F6" />
                <line x1="28" y1="8" x2="28" y2="0" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <circle cx="28" cy="0" r="2.5" fill="white" />
                <line x1="10" y1="22" x2="4" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1="46" y1="22" x2="52" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Box>
            <Text
              fontSize="xl"
              fontWeight="bold"
              color="white"
              lineHeight="1.2"
              fontFamily={SIDEBAR_FONT}
              letterSpacing="-0.02em"
            >
              Uptest
            </Text>
            <Text
              fontSize="0.65rem"
              color="white"
              fontWeight="600"
              letterSpacing="0.25em"
              opacity={0.95}
              textTransform="uppercase"
              fontFamily={SIDEBAR_FONT}
            >
              BY UPTECH
            </Text>
          </Flex>
        </Box>

        {/* Navigation */}
        <Box flex="1" py={4} px={3}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + '/');
            const Icon = item.icon;

            return (
              <Link key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
                <Box
                  mb={1}
                  mx={2}
                  px={4}
                  py={3}
                  borderRadius="lg"
                  bg={isActive ? 'white' : 'transparent'}
                  color={isActive ? '#1E3A8A' : 'white'}
                  fontWeight={isActive ? '600' : '500'}
                  _hover={{
                    bg: isActive ? 'white' : 'whiteAlpha.200',
                    color: isActive ? '#1E3A8A' : 'white',
                  }}
                  transition="all 0.2s"
                  fontFamily={SIDEBAR_FONT}
                >
                  <Flex alignItems="center" gap={3}>
                    <Box color={isActive ? '#3B82F6' : 'inherit'}>
                      <Icon size={18} strokeWidth={2} />
                    </Box>
                    <Text fontSize="sm" lineHeight="1.4">
                      {item.label}
                    </Text>
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
