import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Dialog,
  Spinner,
  RadioGroup,
} from '@chakra-ui/react';
import { ChevronRight, Network } from 'lucide-react';
import type { RefInstance } from '@uptest/core';
import { buildOrganigrammeHierarchy, normalizeId } from './organigrammeUtils';

const BROKEN_COLOR = '#b91c1c';

interface OrganigrammeModalProps {
  isOpen: boolean;
  onClose: () => void;
  instances: RefInstance[];
}

export default function OrganigrammeModal({ isOpen, onClose, instances }: OrganigrammeModalProps) {
  const [filterActifs, setFilterActifs] = useState<'actifs' | 'tous'>('tous');
  const [loading, setLoading] = useState(true);

  const actifsOnly = filterActifs === 'actifs';

  const { hierarchie, allIds, idMap } = useMemo(
    () => buildOrganigrammeHierarchy(instances, actifsOnly),
    [instances, actifsOnly]
  );

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, [isOpen]);

  const handleHighlightPrev = (predId: string) => {
    document.querySelectorAll('[data-organigramme-item]').forEach((el) => {
      el.classList.remove('organigramme-highlight');
    });
    const canon = normalizeId(predId, idMap) ?? predId;
    const el = document.getElementById(`organigramme-${canon.replace(/##/g, '--')}`);
    if (el) {
      el.classList.add('organigramme-highlight');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const instanceNames = Object.keys(hierarchie).sort();

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <Dialog.Positioner>
        <Dialog.Content
          maxW="90vw"
          w="640px"
          maxH="85vh"
          overflow="hidden"
          display="flex"
          flexDirection="column"
          borderRadius="xl"
          boxShadow="xl"
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
        >
          <Dialog.Header
            py={4}
            px={6}
            borderBottomWidth="1px"
            borderColor="gray.100"
            bg="gray.50"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            gap={3}
          >
            <Flex alignItems="center" gap={3}>
              <Box color="#3B82F6" p={1} borderRadius="md" bg="blue.50">
                <Network size={22} />
              </Box>
              <Dialog.Title fontSize="lg" fontWeight="semibold" color="gray.900">
                Organigramme des tests
              </Dialog.Title>
            </Flex>
            <Dialog.CloseTrigger />
          </Dialog.Header>

          <Box px={6} pt={4} flexShrink={0}>
            <RadioGroup.Root
              value={filterActifs}
              onValueChange={(e) => setFilterActifs((e.value ?? filterActifs) as 'actifs' | 'tous')}
              display="flex"
              gap={4}
            >
              <RadioGroup.Item value="tous">
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemIndicator />
                <RadioGroup.ItemText>Tous les tests</RadioGroup.ItemText>
              </RadioGroup.Item>
              <RadioGroup.Item value="actifs">
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemIndicator />
                <RadioGroup.ItemText>Tests actifs uniquement</RadioGroup.ItemText>
              </RadioGroup.Item>
            </RadioGroup.Root>
          </Box>

          <Dialog.Body flex="1" overflowY="auto" py={4} px={6}>
            {loading ? (
              <Flex justifyContent="center" py={12}>
                <Spinner size="lg" color="#3B82F6" />
              </Flex>
            ) : instanceNames.length === 0 ? (
              <Text color="gray.500" fontSize="sm">
                Aucune donnée de référentiel à afficher. Importez un CSV.
              </Text>
            ) : (
              <Box>
                {instanceNames.map((inst) => {
                  const modules = hierarchie[inst];
                  const moduleNums = Object.keys(modules).sort();
                  return (
                    <InstanceBlock
                      key={inst}
                      instanceName={inst}
                      moduleNums={moduleNums}
                      hierarchie={modules}
                      allIds={allIds}
                      idMap={idMap}
                      onHighlightPrev={handleHighlightPrev}
                    />
                  );
                })}
              </Box>
            )}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>

      <style>{`
        .organigramme-highlight {
          background-color: #fef3c7 !important;
          outline: 2px solid #f59e0b;
        }
        [data-organigramme-nested] {
          display: none;
        }
        [data-organigramme-nested].organigramme-open {
          display: block;
        }
      `}</style>
    </Dialog.Root>
  );
}

interface InstanceBlockProps {
  instanceName: string;
  moduleNums: string[];
  hierarchie: Record<string, { id: string; label: string; predecesseur: string }[]>;
  allIds: string[];
  idMap: Record<string, string>;
  onHighlightPrev: (predId: string) => void;
}

function InstanceBlock({
  instanceName,
  moduleNums,
  hierarchie,
  allIds,
  idMap,
  onHighlightPrev,
}: InstanceBlockProps) {
  const [open, setOpen] = useState(true);

  return (
    <Box mb={3}>
      <Flex
        alignItems="center"
        gap={2}
        py={2}
        cursor="pointer"
        _hover={{ bg: 'gray.50' }}
        borderRadius="md"
        onClick={() => setOpen((o) => !o)}
      >
        <Box as="span" transform={open ? 'rotate(90deg)' : 'rotate(0deg)'} transition="transform 0.2s">
          <ChevronRight size={18} />
        </Box>
        <Text fontWeight="semibold" color="gray.900">
          {instanceName}
        </Text>
      </Flex>
      <Box
        pl={6}
        data-organigramme-nested
        className={open ? 'organigramme-open' : ''}
      >
        {moduleNums.map((modNum) => (
          <ModuleBlock
            key={modNum}
            moduleNum={modNum}
            tests={hierarchie[modNum] ?? []}
            allIds={allIds}
            idMap={idMap}
            onHighlightPrev={onHighlightPrev}
          />
        ))}
      </Box>
    </Box>
  );
}

interface ModuleBlockProps {
  moduleNum: string;
  tests: { id: string; label: string; predecesseur: string }[];
  allIds: string[];
  idMap: Record<string, string>;
  onHighlightPrev: (predId: string) => void;
}

function ModuleBlock({ moduleNum, tests, allIds, idMap, onHighlightPrev }: ModuleBlockProps) {
  const [open, setOpen] = useState(true);

  return (
    <Box mb={2}>
      <Flex
        alignItems="center"
        gap={2}
        py={1.5}
        cursor="pointer"
        _hover={{ bg: 'gray.50' }}
        borderRadius="md"
        onClick={() => setOpen((o) => !o)}
      >
        <Box as="span" transform={open ? 'rotate(90deg)' : 'rotate(0deg)'} transition="transform 0.2s">
          <ChevronRight size={16} />
        </Box>
        <Text fontSize="sm" fontWeight="medium" color="gray.700">
          {moduleNum}
        </Text>
        <Text fontSize="xs" color="gray.500">
          ({tests.length} test(s))
        </Text>
      </Flex>
      <Box
        pl={6}
        data-organigramme-nested
        className={open ? 'organigramme-open' : ''}
      >
        {tests.map((t) => {
          const canonPred = t.predecesseur ? normalizeId(t.predecesseur, idMap) : undefined;
          const predExists = !!t.predecesseur && !!canonPred && allIds.includes(canonPred);
          const safeId = t.id.replace(/##/g, '--');

          return (
            <Box
              key={t.id}
              id={`organigramme-${safeId}`}
              data-organigramme-item
              py={1.5}
              pl={2}
              borderLeftWidth="2px"
              borderColor="gray.200"
              _hover={{ bg: 'gray.50' }}
              borderRadius="md"
            >
              <Text fontSize="sm" color="gray.800">
                {t.label}
              </Text>
              {t.predecesseur && (
                <Box mt={1} fontSize="xs">
                  {predExists ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      color="#3B82F6"
                      _hover={{ textDecoration: 'underline' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onHighlightPrev(t.predecesseur);
                      }}
                    >
                      Prédécesseur : {t.predecesseur}
                    </Button>
                  ) : (
                    <Text color={BROKEN_COLOR}>
                      Prédécesseur cassé : {t.predecesseur}
                    </Text>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
