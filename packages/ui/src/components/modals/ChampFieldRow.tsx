import { useState } from 'react';
import { Flex, Input, Button, Text } from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';
import InfoTooltipIcon from './InfoTooltipIcon';

interface ChampFieldRowProps {
  label: string;
  value: string;
  /** Valeur affichée (ex. libellé du fichier) - si fournie, affichée à la place du code option quand non focus */
  displayValue?: string;
  onLabelChange?: (v: string) => void;
  onValueChange: (v: string) => void;
  onDelete?: () => void;
  valuePlaceholder?: string;
  isLabelEditable?: boolean;
  valueMaxLength?: number;
  /** Texte d'aide à afficher au survol de l'icône Info (calculé côté parent) */
  infoMessage?: string;
  /** Permet d'activer/désactiver l'affichage du tooltip (calculé côté parent) */
  showTooltip?: boolean;
}

export default function ChampFieldRow({
  label,
  value,
  displayValue,
  onLabelChange,
  onValueChange,
  onDelete,
  valuePlaceholder = '(Non utilisé)',
  isLabelEditable = true,
  valueMaxLength,
  infoMessage = '',
  showTooltip = true,
}: ChampFieldRowProps) {
  const [focused, setFocused] = useState(false);
  const isFilled = !!(value && value.trim());
  const shownValue = focused ? value : (displayValue ?? value);
  const infoTrimmed = (infoMessage ?? '').trim();

  return (
    <Flex
      alignItems="center"
      gap={2}
      py={2}
      borderBottomWidth="1px"
      borderColor="gray.100"
      _last={{ borderBottomWidth: 0 }}
    >
      <Flex alignItems="center" gap={2} minW="180px" flexShrink={0}>
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
          <Text fontWeight="medium" fontSize="sm">
            {label || '—'}
          </Text>
        )}
        {infoTrimmed && <InfoTooltipIcon message={infoMessage} showTooltip={showTooltip} />}
        <Text color="gray.600">:</Text>
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
