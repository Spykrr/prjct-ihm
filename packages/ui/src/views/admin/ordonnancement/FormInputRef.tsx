import { useState } from 'react';
import { Box, Flex, Button, Checkbox, Input, Text } from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';
import { type RefOption } from '@uptest/core';
import { showMessageError } from '@uptest/core';
import {
  MATRICE_CORRESPONDANCE,
  MODULE_SAB_PARAMS,
  type MatriceItem,
} from './matriceCorrespondance';

interface FormInputRefProps {
  option: RefOption;
  onUpdate: (opt: RefOption) => void;
  onDelete: () => void;
}

export default function FormInputRef({ option, onUpdate, onDelete }: FormInputRefProps) {
  const isUpModule = (option.Module ?? '').toUpperCase().startsWith('UP');
  const matriceItem = MATRICE_CORRESPONDANCE.find(
    (m) => m.keyword === (option.Module ?? '')
  ) as MatriceItem | undefined;
  const paramDefs = isUpModule && matriceItem
    ? [matriceItem.Param1, matriceItem.Param2, matriceItem.Param3, matriceItem.Param4, matriceItem.Param5, matriceItem.Param6, matriceItem.Param7, matriceItem.Param8, matriceItem.Param9, matriceItem.Param10]
    : MODULE_SAB_PARAMS;

  const update = (key: keyof RefOption, value: unknown) => {
    onUpdate({ ...option, [key]: value });
  };

  const [predecesseurTouched, setPredecesseurTouched] = useState(false);
  const predecesseurValue = (option.Predecesseur as string) ?? '';
  const predecesseurErrorRaw = predecesseurValue.trim() === '' ? '' : showMessageError(predecesseurValue);
  const predecesseurError = predecesseurTouched ? predecesseurErrorRaw : null;

  return (
    <Box
      p={4}
      borderWidth="1px"
      borderRadius="md"
      borderColor="gray.200"
      bg="white"
      mb={2}
    >
      <Flex gap={4} flexWrap="wrap" alignItems="flex-start">
        <Checkbox.Root
          checked={option.Actif === 'O'}
          onCheckedChange={(e) => update('Actif', e.checked ? 'O' : 'N')}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
        </Checkbox.Root>
        <Text fontSize="sm" fontWeight="medium" pt="6px">
          Actif
        </Text>

        <Box minW="180px">
          <Text fontSize="xs" color="gray.500" mb={1}>
            Type
          </Text>
          <select
            value={(option.Type as string) ?? 'ModuleSAB'}
            onChange={(e) => update('Type', e.target.value)}
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
              width: '100%',
            }}
          >
            <option value="ModuleSAB">ModuleSAB</option>
            <option value="TraitementUpTest">TraitementUpTest</option>
          </select>
        </Box>

        <Box minW="160px">
          <Text fontSize="xs" color="gray.500" mb={1}>
            Module (Matrice)
          </Text>
          {option.Type === 'TraitementUpTest' ? (
            <select
              value={(option.Module as string) ?? ''}
              onChange={(e) => update('Module', e.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontSize: '14px',
                width: '100%',
              }}
            >
              <option value="">-- Sélectionner --</option>
              {MATRICE_CORRESPONDANCE.map((m) => (
                <option key={m.keyword} value={m.keyword}>
                  {m.keyword} - {m.description}
                </option>
              ))}
            </select>
          ) : (
            <Input
              size="sm"
              value={(option.Module as string) ?? ''}
              onChange={(e) => update('Module', e.target.value)}
              placeholder="BAS, PTF, ..."
            />
          )}
        </Box>

        <Box minW="80px">
          <Text fontSize="xs" color="gray.500" mb={1}>
            Option
          </Text>
          <Input
            size="sm"
            value={(option.Option as string) ?? ''}
            onChange={(e) => update('Option', e.target.value)}
            placeholder="1N"
            maxLength={4}
            disabled={isUpModule}
            title={isUpModule ? 'Désactivé pour les modules UP-*' : undefined}
          />
        </Box>

        <Box minW="80px">
          <Text fontSize="xs" color="gray.500" mb={1}>
            Ordre Groupe (0-999)
          </Text>
          <Input
            size="sm"
            type="number"
            min={0}
            max={999}
            value={option.ordreOption ?? 100}
            onChange={(e) => update('ordreOption', parseInt(e.target.value, 10) || 0)}
          />
        </Box>

        <Box flex="1" minW="150px">
          <Text fontSize="xs" color="gray.500" mb={1}>
            Libellé
          </Text>
          <Input
            size="sm"
            value={(option.Libelle as string) ?? ''}
            onChange={(e) => update('Libelle', e.target.value)}
            placeholder="Libellé"
          />
        </Box>

        <Box flex="1" minW="200px">
          <Text fontSize="xs" color="gray.500" mb={1}>
            Predecesseur (Instance##OrdreMod##OrdreOpt##Module)
          </Text>
          <Input
            size="sm"
            value={predecesseurValue}
            onChange={(e) => update('Predecesseur', e.target.value)}
            onBlur={() => setPredecesseurTouched(true)}
            placeholder="Inst01##02600##240##PTF"
            borderColor={predecesseurError ? 'red.300' : undefined}
          />
          {predecesseurError && (
            <Text fontSize="xs" color="red.500" mt={1}>
              {predecesseurError}
            </Text>
          )}
        </Box>

        <Button
          size="sm"
          variant="ghost"
          color="gray.500"
          _hover={{ color: 'red.500' }}
          onClick={onDelete}
        >
          <Trash2 size={16} />
        </Button>
      </Flex>

      <Box mt={4} pt={4} borderTopWidth="1px" borderColor="gray.100">
        <Text fontSize="xs" color="gray.500" mb={2}>
          Paramètres
        </Text>
        <Flex gap={2} flexWrap="wrap">
          {paramDefs.map((def, i) => (
            <Box key={i} minW="140px">
              {!def.isDisabled && (
                <>
                  <Text fontSize="xs" color="gray.500" mb={0.5}>
                    {def.name || `Param${i + 1}`}
                  </Text>
                  <Input
                    size="sm"
                    value={((option[`Param${i + 1}`] as string) ?? '')}
                    onChange={(e) => update(`Param${i + 1}`, e.target.value)}
                    placeholder={def.comment}
                    disabled={def.isDisabled}
                  />
                </>
              )}
            </Box>
          ))}
        </Flex>
      </Box>
    </Box>
  );
}
