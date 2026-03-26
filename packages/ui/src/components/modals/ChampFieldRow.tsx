import { useState } from 'react';
import { Flex, Input, Button, Text, Tooltip } from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';
import { MessageSquare } from 'lucide-react';
import { Info } from 'lucide-react';

interface ChampFieldRowProps {
  label: string;
  value: string;
  /** Note issue du fichier Excel pour ce champ */
  note?: string;
  /** Tooltip d'aide (interface Tests uniquement) */
  helpText?: string;
  /** Afficher l'icône info (interface Tests uniquement) */
  showHelpIcon?: boolean;
  /** Activer un bouton pour ajouter/modifier la note (utilisé en mode Definitions). */
  onEditNote?: () => void;
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
  helpText,
  showHelpIcon = false,
  onEditNote,
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
          {showHelpIcon && !!helpText?.trim() && (
            <Tooltip.Root openDelay={250} positioning={{ placement: 'top' }}>
              <Tooltip.Trigger asChild>
                <Button
                  size="xs"
                  variant="ghost"
                  p={1}
                  minW="auto"
                  h="auto"
                  borderRadius="md"
                  color="gray.500"
                  _hover={{ bg: 'gray.50', color: 'gray.700' }}
                  aria-label="Aide"
                  title="Aide"
                >
                  <Info size={14} />
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
                  maxW="420px"
                  whiteSpace="pre-wrap"
                >
                  <Tooltip.Arrow bg="#1F2937" />
                  {helpText}
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
          )}
          <Text color="gray.600">:</Text>
        </Flex>
        {note && (
          <Text
            fontSize="sm"
            color="blue.600"
            fontStyle="italic"
            maxW="unset"
            whiteSpace="pre-wrap"
            wordBreak="break-word"
            title={note}
          >
            {note}
          </Text>
        )}
        {onEditNote && (
          <Button
            size="sm"
            variant="ghost"
            p={1.5}
            minW="auto"
            h="auto"
            borderRadius="lg"
            color="blue.600"
            _hover={{ bg: 'blue.50', color: 'blue.700' }}
            onClick={onEditNote}
            title="Ajouter / modifier la note"
            aria-label="Ajouter / modifier la note"
          >
            <MessageSquare size={16} />
          </Button>
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
