import { useState } from 'react';
import { Flex, Input, Button, Text, Dialog, Box, Portal } from '@chakra-ui/react';
import { Trash2, MessageSquare, X } from 'lucide-react';

interface ChampFieldRowProps {
  label: string;
  value: string;
  /** Note issue du fichier Excel pour ce champ */
  note?: string;
  /** Valeur affichée (ex. libellé du fichier) - si fournie, affichée à la place du code option quand non focus */
  displayValue?: string;
  onLabelChange?: (v: string) => void;
  onValueChange: (v: string) => void;
  onDelete?: () => void;
  valuePlaceholder?: string;
  isLabelEditable?: boolean;
  valueMaxLength?: number;
}

export default function ChampFieldRow({
  label,
  value,
  note,
  displayValue,
  onLabelChange,
  onValueChange,
  onDelete,
  valuePlaceholder = '(Non utilisé)',
  isLabelEditable = true,
  valueMaxLength,
}: ChampFieldRowProps) {
  const [focused, setFocused] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const isFilled = !!(value && value.trim());
  const shownValue = focused ? value : (displayValue ?? value);

  return (
    <Flex
      alignItems="center"
      gap={3}
      py={2.5}
      borderBottomWidth="1px"
      borderColor="gray.100"
      _last={{ borderBottomWidth: 0 }}
    >
      <Flex alignItems="center" gap={2} w="170px" flexShrink={0}>
        {isLabelEditable && onLabelChange ? (
          <Input
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            size="sm"
            variant="flushed"
            placeholder="Libellé"
            fontWeight="medium"
          />
        ) : (
          <Text fontWeight="medium" fontSize="sm" lineClamp={1}>
            {label || '—'}
          </Text>
        )}
        <Text color="gray.600">:</Text>
      </Flex>
      <Box w="34px" display="flex" justifyContent="center" flexShrink={0}>
        {note && (
          <Dialog.Root open={noteOpen} onOpenChange={(e) => setNoteOpen(e.open)}>
            <Button
              size="sm"
              variant="ghost"
              p={1.5}
              minW="30px"
              h="30px"
              borderRadius="md"
              color="blue.600"
              _hover={{ bg: 'blue.50', color: 'blue.700' }}
              onClick={() => setNoteOpen(true)}
              title="Afficher la note"
              aria-label="Afficher la note"
            >
              <MessageSquare size={15} />
            </Button>
            <Portal>
              <Dialog.Backdrop bg="blackAlpha.500" backdropFilter="blur(2px)" />
              <Dialog.Positioner>
                <Dialog.Content
                  maxW="520px"
                  borderRadius="xl"
                  boxShadow="xl"
                  bg="white"
                  borderWidth="1px"
                  borderColor="gray.200"
                >
                  <Dialog.Header
                    py={3}
                    px={4}
                    borderBottomWidth="1px"
                    borderColor="gray.100"
                    bg="gray.50"
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Dialog.Title fontSize="md" fontWeight="semibold" color="gray.900">
                      Note du champ
                    </Dialog.Title>
                    <Dialog.CloseTrigger asChild>
                      <Box as="button" p={1.5} borderRadius="md" color="gray.500" _hover={{ bg: 'gray.200' }} aria-label="Fermer">
                        <X size={16} />
                      </Box>
                    </Dialog.CloseTrigger>
                  </Dialog.Header>
                  <Dialog.Body py={4} px={4}>
                    <Text fontSize="sm" color="gray.700" whiteSpace="pre-wrap">
                      {note}
                    </Text>
                  </Dialog.Body>
                  <Dialog.Footer px={4} pb={4}>
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="#3B82F6"
                      color="#3B82F6"
                      _hover={{ bg: 'rgba(59, 130, 246, 0.08)', borderColor: '#2563EB' }}
                      onClick={() => setNoteOpen(false)}
                    >
                      Fermer
                    </Button>
                  </Dialog.Footer>
                </Dialog.Content>
              </Dialog.Positioner>
            </Portal>
          </Dialog.Root>
        )}
      </Box>
      <Input
        value={shownValue}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={valuePlaceholder}
        size="sm"
        flex="1"
        maxLength={valueMaxLength}
        borderRadius="md"
        bg={isFilled ? 'green.50' : 'white'}
        borderColor={isFilled ? 'green.200' : 'gray.200'}
        _placeholder={{ color: 'gray.400' }}
      />
      {onDelete && (
        <Button size="sm" variant="ghost" onClick={onDelete} color="red.500" flexShrink={0}>
          <Trash2 size={16} />
        </Button>
      )}
    </Flex>
  );
}
