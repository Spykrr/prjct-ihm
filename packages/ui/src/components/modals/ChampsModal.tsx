import { ReactNode } from 'react';
import { Dialog } from '@chakra-ui/react';

interface ChampsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function ChampsModal({ isOpen, onClose, title, children }: ChampsModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="90vw" maxH="85vh" overflow="hidden" display="flex" flexDirection="column">
          <Dialog.Header flexShrink={0}>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.CloseTrigger />
          </Dialog.Header>
          <Dialog.Body flex="1" overflowY="auto" py={4}>
            {children}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
