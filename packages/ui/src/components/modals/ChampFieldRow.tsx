import { useState } from 'react';
import { Flex, Input, Button, Text } from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';

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
      <Flex direction="column" gap={1} w="170px" flexShrink={0}>
        <Flex alignItems="center" gap={2}>
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
        {note && (
          <Text
            fontSize="sm"
            color="blue.600"
            fontStyle="italic"
            maxW="320px"
            lineClamp={2}
            title={note}
          >
            {note}
          </Text>
        )}
      </Flex>
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
