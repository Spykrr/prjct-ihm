import { Box, Flex, Input, Button, Text } from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';
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
}: FormInputProps) {
  const help = showOption ? getInfoByKeyword(option) : null;

  return (
    <Box mb={3}>
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
      {help && (
        <Text fontSize="xs" color="gray.500" mt={1}>
          {help}
        </Text>
      )}
    </Box>
  );
}
