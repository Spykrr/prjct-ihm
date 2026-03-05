import { Box, Input, Text } from '@chakra-ui/react';

interface GetInputProps {
  nbrOfField: 1 | 2 | 3;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

/** Parse VAR_champ##1IPV → { variableValue, champValue, optionValue } */
function parseGetValue(val: string): { variableValue: string; champValue: string; optionValue: string } {
  if (!val || !val.includes('##')) {
    const idx = val.indexOf('_');
    return {
      variableValue: idx > 0 ? val.slice(0, idx) : val,
      champValue: idx > 0 ? val.slice(idx + 1) : '',
      optionValue: '',
    };
  }
  const [before, optionValue] = val.split('##');
  const idx = before.indexOf('_');
  return {
    variableValue: idx > 0 ? before.slice(0, idx) : before,
    champValue: idx > 0 ? before.slice(idx + 1) : before,
    optionValue: optionValue ?? '',
  };
}

function buildGetValue(variable: string, champ: string, option: string): string {
  if (!option) return variable && champ ? `${variable}_${champ}` : variable || champ;
  return `${variable}_${champ}##${option}`;
}

export default function GetInput({ nbrOfField, label = 'GET', value, onChange, onBlur }: GetInputProps) {
  const parsed = parseGetValue(value);

  if (nbrOfField === 1) {
    return (
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={2}>
          {label}
        </Text>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="Valeur"
          size="sm"
          bg={value ? 'green.50' : undefined}
        />
      </Box>
    );
  }

  if (nbrOfField === 2) {
    return (
      <Box display="flex" flexDirection="column" gap={2}>
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            Nom de la balise
          </Text>
          <Input
            value={parsed.variableValue}
            onChange={(e) => onChange(buildGetValue(e.target.value, parsed.champValue, parsed.optionValue))}
            onBlur={onBlur}
            size="sm"
          />
        </Box>
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            Nom de variable
          </Text>
          <Input
            value={parsed.champValue}
            onChange={(e) => onChange(buildGetValue(parsed.variableValue, e.target.value, parsed.optionValue))}
            onBlur={onBlur}
            size="sm"
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          Nom champs
        </Text>
        <Input
          value={parsed.champValue}
          onChange={(e) => onChange(buildGetValue(parsed.variableValue, e.target.value, parsed.optionValue))}
          onBlur={onBlur}
          size="sm"
          placeholder="champ"
        />
      </Box>
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          Nom variable
        </Text>
        <Input
          value={parsed.variableValue}
          onChange={(e) => onChange(buildGetValue(e.target.value, parsed.champValue, parsed.optionValue))}
          onBlur={onBlur}
          size="sm"
          placeholder="VAR_"
        />
      </Box>
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={1}>
          Option (4 car.)
        </Text>
        <Input
          value={parsed.optionValue}
          onChange={(e) => onChange(buildGetValue(parsed.variableValue, parsed.champValue, e.target.value.slice(0, 4)))}
          onBlur={onBlur}
          size="sm"
          fontFamily="mono"
          placeholder="1IPV"
        />
      </Box>
    </Box>
  );
}
