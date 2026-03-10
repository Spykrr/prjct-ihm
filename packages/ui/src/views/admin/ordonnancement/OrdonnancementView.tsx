import { useState } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Accordion,
  Badge,
  Switch,
} from '@chakra-ui/react';
import { Upload, Download, Plus, Trash2, FolderOpen, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import {
  parseRefCsv,
  generateRefCsv,
  addGrp,
  addOpt,
  type RefInstance,
  type RefGroup,
  type RefOption,
} from '@uptest/core';
import { openCsvFile } from '../../../utils/fileImport';
import { useSidebar } from '../../../contexts/useSidebar';
import FormInputRef from './FormInputRef';

function downloadCsv(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OrdonnancementView() {
  const { isDefinition, setIsDefinition } = useSidebar();
  const [instances, setInstances] = useState<RefInstance[]>([]);
  const [currentInstance, setCurrentInstance] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const handleImport = async () => {
    setImportError(null);
    try {
      const result = await openCsvFile();
      if (!result) return;

      const parsed = parseRefCsv(result.text);
      setInstances(parsed);
      if (parsed.length > 0) {
        setCurrentInstance(parsed[0].name);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erreur lors de l\'import CSV.');
    }
  };

  const handleExport = () => {
    if (instances.length === 0) return;
    const csv = generateRefCsv(instances);
    downloadCsv(csv, 'referentielSabRobot.csv');
  };

  const currentInstanceData = instances.find((i) => i.name === currentInstance);
  const groups = currentInstanceData?.childreen ?? [];

  const updateInstance = (instName: string, newGroups: RefGroup[]) => {
    setInstances((prev) =>
      prev.map((i) =>
        i.name === instName ? { ...i, childreen: newGroups } : i
      )
    );
  };

  const addGroup = () => {
    if (!currentInstance) return;
    const name = window.prompt('Nom du groupe :', 'Nouveau groupe');
    if (!name?.trim()) return;
    const newGroups = addGrp(groups, groups.length, name.trim());
    updateInstance(currentInstance, newGroups);
  };

  const deleteGroup = (indexGrp: number) => {
    if (!currentInstance || !window.confirm('Supprimer ce groupe ?')) return;
    const newGroups = groups.filter((_, i) => i !== indexGrp);
    updateInstance(currentInstance, newGroups);
  };

  const moveGroup = (indexGrp: number, direction: 'up' | 'down') => {
    if (!currentInstance) return;
    if (direction === 'up' && indexGrp === 0) return;
    if (direction === 'down' && indexGrp === groups.length - 1) return;
    const newGroups = [...groups];
    const targetIndex = direction === 'up' ? indexGrp - 1 : indexGrp + 1;
    [newGroups[indexGrp], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[indexGrp]];
    const step = 100;
    newGroups.forEach((g, i) => {
      g.orderModule = (i + 1) * step;
    });
    updateInstance(currentInstance, newGroups);
  };

  const addOption = (indexGrp: number) => {
    if (!currentInstance) return;
    const grp = groups[indexGrp];
    if (!grp) return;
    const newOpts = addOpt(grp, grp.childreen.length, {
      Instance: currentInstance,
      OrdreModule: grp.orderModule,
    });
    const newGroups = groups.map((g, i) =>
      i === indexGrp ? { ...g, childreen: newOpts } : g
    );
    updateInstance(currentInstance, newGroups);
  };

  const updateOption = (indexGrp: number, indexOpt: number, opt: RefOption) => {
    if (!currentInstance) return;
    const newGroups = groups.map((g, i) => {
      if (i !== indexGrp) return g;
      const newChildreen = [...g.childreen];
      newChildreen[indexOpt] = opt;
      newChildreen.sort((a, b) => (a.ordreOption ?? 0) - (b.ordreOption ?? 0));
      return { ...g, childreen: newChildreen };
    });
    updateInstance(currentInstance, newGroups);
  };

  const deleteOption = (indexGrp: number, indexOpt: number) => {
    if (!currentInstance) return;
    const newGroups = groups.map((g, i) => {
      if (i !== indexGrp) return g;
      const newChildreen = g.childreen.filter((_, j) => j !== indexOpt);
      return { ...g, childreen: newChildreen };
    });
    updateInstance(currentInstance, newGroups);
  };

  const filteredGroups = showActiveOnly
    ? groups.filter((g) => g.childreen.some((o) => o.Actif === 'O'))
    : groups;

  return (
    <Box minH="100vh" display="flex" flexDirection="column" bg="#F8F8F8">
      <Box as="header" bg="white" borderBottomWidth="1px" borderColor="gray.200">
        <Flex alignItems="center" justifyContent="space-between" px={6} py={3}>
          <Text fontSize="xl" fontWeight="bold" color="gray.900">
            Ordonnancer les tests
          </Text>
          <Flex alignItems="center" gap={4}>
            <Flex alignItems="center" gap={2}>
              <Text fontSize="sm" color="gray.600" fontWeight="medium">
                Test
              </Text>
              <Switch.Root
                size="sm"
                checked={isDefinition}
                onCheckedChange={(e) => setIsDefinition(e.checked)}
              >
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Root>
              <Text fontSize="sm" color="gray.600" fontWeight="medium">
                Définitions
              </Text>
            </Flex>
            <Button variant="outline" size="sm" gap={2} onClick={handleImport} borderColor="gray.300" color="gray.700">
              <Upload size={16} />
              Importer CSV
            </Button>
            <Button
              size="sm"
              gap={2}
              bg="#422AFB"
              color="white"
              _hover={{ bg: '#3522d4' }}
              onClick={handleExport}
              disabled={instances.length === 0}
            >
              <Download size={16} />
              Sauvegarder
            </Button>
          </Flex>
        </Flex>
      </Box>

      <Flex flex="1" overflow="hidden">
        <Box as="aside" w="256px" bg="white" borderRightWidth="1px" borderColor="gray.200" flexShrink={0}>
          <Box p={4} borderBottomWidth="1px">
            <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>
              Instances
            </Text>
            {instances.length === 0 ? (
              <Text fontSize="sm" color="gray.500">
                Importez un CSV pour afficher les instances
              </Text>
            ) : (
              <Box display="flex" flexDirection="column" gap={2}>
                {instances.map((inst) => (
                  <Box
                    key={inst.name}
                    p={3}
                    bg={currentInstance === inst.name ? '#e8f0fe' : 'white'}
                    borderWidth="1px"
                    borderColor={currentInstance === inst.name ? '#422AFB' : 'gray.200'}
                    borderRadius="lg"
                    cursor="pointer"
                    _hover={{ borderColor: 'gray.300' }}
                    onClick={() => setCurrentInstance(inst.name)}
                  >
                    <Flex alignItems="center" gap={2}>
                      <FolderOpen size={16} color={currentInstance === inst.name ? '#422AFB' : '#4b5563'} />
                      <Text fontWeight="medium" fontSize="sm">
                        {inst.name}
                      </Text>
                    </Flex>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {inst.childreen.length} groupe(s)
                    </Text>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>

        <Box as="main" flex="1" overflowY="auto" p={6}>
          {importError && (
            <Box mb={4} p={3} bg="red.50" color="red.700" borderRadius="md" fontSize="sm">
              {importError}
            </Box>
          )}

          {!currentInstance ? (
            <Flex
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              py={20}
              color="gray.500"
            >
              <Upload size={48} style={{ marginBottom: 16 }} />
              <Text fontSize="lg" fontWeight="medium" mb={2}>
                Aucun fichier importé
              </Text>
              <Text fontSize="sm" mb={4} textAlign="center" maxW="md">
                Importez un fichier CSV référentiel (séparateur ;) pour gérer l&apos;ordonnancement des tests.
              </Text>
              <Button onClick={handleImport} gap={2} bg="#422AFB" color="white" _hover={{ bg: '#3522d4' }}>
                <Upload size={16} />
                Importer un fichier CSV
              </Button>
            </Flex>
          ) : (
            <>
              <Flex mb={4} alignItems="center" gap={4}>
                <Text fontSize="2xl" fontWeight="bold" color="gray.900">
                  {currentInstance}
                </Text>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showActiveOnly}
                    onChange={(e) => setShowActiveOnly(e.target.checked)}
                  />
                  <Text fontSize="sm" color="gray.600">
                    Afficher uniquement les tests actifs
                  </Text>
                </label>
              </Flex>

              {/* Liste des groupes - style identique aux écrans (Gérer les tests) */}
              <Accordion.Root
                multiple
                collapsible
                value={openGroups}
                onValueChange={(e) => setOpenGroups(e.value)}
              >
                <Box display="flex" flexDirection="column" gap={3} mb={6}>
                  {filteredGroups.map((grp, indexGrp) => {
                    const grpIndex = groups.indexOf(grp);
                    const nbrActive = grp.childreen.filter((o) => o.Actif === 'O').length;
                    const groupLabel = grp.name.replace(/^#+\s*/, '');
                    const itemValue = `grp-${indexGrp}`;
                    const isOpen = openGroups.includes(itemValue);
                    return (
                      <Accordion.Item key={indexGrp} value={itemValue}>
                        <Box
                          bg="white"
                          borderWidth="1px"
                          borderRadius="lg"
                          overflow="hidden"
                          _hover={{ borderColor: 'gray.400' }}
                          transition="border-color 0.2s"
                          borderColor="gray.200"
                        >
                          <Accordion.ItemTrigger asChild>
                            <Box as="button" w="full" textAlign="left" p={4}>
                              <Flex alignItems="center" justifyContent="space-between">
                                <Flex alignItems="center" gap={4} flex="1">
                                  <Box
                                    as="span"
                                    display="inline-flex"
                                    transition="transform 0.2s"
                                    flexShrink={0}
                                    transform={isOpen ? 'rotate(90deg)' : 'rotate(0deg)'}
                                  >
                                    <ChevronRight size={18} />
                                  </Box>
                                  <Text
                                    fontSize="sm"
                                    fontWeight="semibold"
                                    color="gray.900"
                                    w="80px"
                                  >
                                    Groupe {indexGrp + 1}
                                  </Text>
                                  <Text fontWeight="medium" color="gray.900">
                                    {groupLabel}
                                  </Text>
                                  {nbrActive > 0 && (
                                    <Badge bg="#D1ECF1" color="#0C5460" size="sm">
                                      {nbrActive} actif{nbrActive > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </Flex>
                                <Flex alignItems="center" gap={1} onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      moveGroup(grpIndex, 'up');
                                    }}
                                    disabled={grpIndex === 0}
                                  >
                                    <ChevronUp size={16} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      moveGroup(grpIndex, 'down');
                                    }}
                                    disabled={grpIndex === groups.length - 1}
                                  >
                                    <ChevronDown size={16} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      deleteGroup(grpIndex);
                                    }}
                                    color="gray.600"
                                    _hover={{ color: 'gray.900' }}
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </Flex>
                              </Flex>
                            </Box>
                          </Accordion.ItemTrigger>
                          <Accordion.ItemContent>
                            <Box pt={4} pb={2} px={4} borderTopWidth="1px" borderColor="gray.100">
                              <Button
                                size="sm"
                                variant="outline"
                                gap={2}
                                mb={4}
                                onClick={() => addOption(grpIndex)}
                              >
                                <Plus size={14} />
                                Ajouter une option
                              </Button>
                              {grp.childreen
                                .sort((a, b) => (a.ordreOption ?? 0) - (b.ordreOption ?? 0))
                                .map((opt, indexOpt) => (
                                  <FormInputRef
                                    key={indexOpt}
                                    option={opt}
                                    onUpdate={(o) => updateOption(grpIndex, indexOpt, o)}
                                    onDelete={() => deleteOption(grpIndex, indexOpt)}
                                  />
                                ))}
                            </Box>
                          </Accordion.ItemContent>
                        </Box>
                      </Accordion.Item>
                    );
                  })}
                </Box>
              </Accordion.Root>

              {/* Bouton Ajouter un groupe - style identique à Ajouter écran */}
              <Box
                as="button"
                onClick={addGroup}
                w="full"
                p={4}
                borderWidth="2px"
                borderStyle="dashed"
                borderColor="gray.300"
                borderRadius="lg"
                _hover={{ borderColor: 'gray.900', bg: 'gray.50' }}
                transition="all 0.2s"
              >
                <Flex alignItems="center" justifyContent="center" gap={2} color="gray.600">
                  <Plus size={16} />
                  <Text fontWeight="medium">Ajouter un groupe</Text>
                </Flex>
              </Box>
            </>
          )}
        </Box>
      </Flex>
    </Box>
  );
}
