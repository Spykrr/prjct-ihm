import { Box, Flex, Input, Button, Text, Tooltip } from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';
import { Info } from 'lucide-react';
import { getInfoByKeyword } from '@uptest/core';

interface FormInputProps {
  label: string;
  option: string;
  onLabelChange: (v: string) => void;
  onOptionChange: (v: string) => void;
  onDelete?: () => void;
  optionPlaceholder?: string;
  optionMaxLength?: number;
  /** Masquer le champ option (ex. pour les boutons, sans case "1N") */
  showOption?: boolean;
  /** Afficher l'icône info + tooltip (interface Tests uniquement) */
  showHelpIcon?: boolean;
  /** Marge verticale (pratique pour l'affichage en liste drag & drop) */
  mb?: number;
}

export default function FormInput({
  label,
  option,
  onLabelChange,
  onOptionChange,
  onDelete,
  optionPlaceholder = 'ex: 1IPV',
  optionMaxLength = 4,
  showOption = true,
  showHelpIcon = false,
  mb = 3,
}: FormInputProps) {
  const help = getInfoByKeyword(option, label);

  return (
    <Box mb={mb}>
      <Flex gap={3} alignItems="center">
        <Input
          placeholder="Libellé"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          flex="1"
          size="sm"
          h="40px"
          borderRadius="lg"
          borderColor="gray.200"
          _focus={{ borderColor: '#3B82F6', boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.15)' }}
          bg={label || option ? 'blue.50' : 'white'}
        />
        {showHelpIcon && !!help?.trim() && (
          <Tooltip.Root openDelay={250} positioning={{ placement: 'top' }}>
            <Tooltip.Trigger asChild>
              <Button
                size="sm"
                variant="ghost"
                p={2}
                minW="auto"
                h="auto"
                borderRadius="lg"
                color="gray.500"
                _hover={{ bg: 'gray.50', color: 'gray.700' }}
                aria-label="Aide"
                title="Aide"
              >
                <Info size={18} strokeWidth={2} />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content
                bg="#1F2937"
                color="white"
                borderRadius="md"
                px={3}
                py={2}
                fontSize="sm"
                boxShadow="lg"
                maxW="360px"
                whiteSpace="pre-wrap"
              >
                <Tooltip.Arrow bg="#1F2937" />
                {help}
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        )}
        {showOption && (
          <Input
            placeholder={optionPlaceholder}
            value={option}
            onChange={(e) => onOptionChange(e.target.value.slice(0, optionMaxLength))}
            w="80px"
            size="sm"
            h="40px"
            borderRadius="lg"
            borderColor="gray.200"
            _focus={{ borderColor: '#3B82F6', boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.15)' }}
            fontFamily="mono"
            title={help ?? undefined}
            bg={label || option ? 'blue.50' : 'white'}
          />
        )}
        {onDelete && (
          <Button size="sm" variant="ghost" onClick={onDelete} color="red.500" _hover={{ bg: 'red.50' }} borderRadius="lg">
            <Trash2 size={18} strokeWidth={2} />
          </Button>
        )}
      </Flex>
      {showOption && !!help?.trim() && (
        <Text fontSize="xs" color="gray.500" mt={1}>
          {help}
        </Text>
      )}
    </Box>
  );
}
