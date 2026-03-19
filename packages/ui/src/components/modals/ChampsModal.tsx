import { ReactNode } from 'react';
import { Dialog, Box, Flex } from '@chakra-ui/react';
import { X } from 'lucide-react';

interface ChampsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Optionnel : icône ou badge à côté du titre */
  titleIcon?: ReactNode;
  children: ReactNode;
}

export default function ChampsModal({ isOpen, onClose, title, titleIcon, children }: ChampsModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Dialog.Backdrop
        bg="blackAlpha.600"
        backdropFilter="blur(4px)"
      />
      <Dialog.Positioner>
        <Dialog.Content
          maxW="90vw"
          maxH="85vh"
          overflow="hidden"
          display="flex"
          flexDirection="column"
          borderRadius="2xl"
          boxShadow="2xl"
          bg="white"
          borderWidth="1px"
          borderColor="gray.100"
        >
          <Dialog.Header
            flexShrink={0}
            py={5}
            px={6}
            borderBottomWidth="1px"
            borderColor="gray.100"
              bg="gray.50"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            gap={3}
          >
            <Flex alignItems="center" gap={3}>
              {titleIcon}
              <Dialog.Title fontSize="lg" fontWeight="semibold" color="gray.900">
                {title}
              </Dialog.Title>
            </Flex>
            <Dialog.CloseTrigger
              asChild
              position="relative"
              top="0"
              right="0"
            >
              <Box
                as="button"
                p={2}
                borderRadius="lg"
                color="gray.500"
                _hover={{ bg: 'rgba(93, 42, 208, 0.08)', color: '#5D2AD0' }}
                transition="colors 0.2s"
                aria-label="Fermer"
              >
                <X size={20} strokeWidth={2} />
              </Box>
            </Dialog.CloseTrigger>
          </Dialog.Header>
          <Dialog.Body flex="1" overflowY="auto" py={6} px={6} bg="gray.50">
            {children}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
