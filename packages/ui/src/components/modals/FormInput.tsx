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
}

export default function FormInput({
  label,
  option,
  onLabelChange,
  onOptionChange,
  onDelete,
  optionPlaceholder = 'ex: 1IPV',
  optionMaxLength = 4,
}: FormInputProps) {
  const help = getInfoByKeyword(option);

  return (
    <Box mb={3}>
      <Flex gap={2} alignItems="center">
        <Input
          placeholder="Libellé"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          flex="1"
          size="sm"
          bg={label || option ? 'green.50' : undefined}
        />
        <Input
          placeholder={optionPlaceholder}
          value={option}
          onChange={(e) => onOptionChange(e.target.value.slice(0, optionMaxLength))}
          w="80px"
          size="sm"
          fontFamily="mono"
          title={help}
          bg={label || option ? 'green.50' : undefined}
        />
        {onDelete && (
          <Button size="sm" variant="ghost" onClick={onDelete} color="red.500">
            <Trash2 size={16} />
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
