import { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Input,
  Checkbox,
  Switch,
  Dialog,
} from '@chakra-ui/react';
import {
  Plus,
  Trash2,
  Download,
  Upload,
  FolderOpen,
  Search,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { parseExcel, type ParsedScreen, type ParsedWorkbook } from '@uptest/core';
import { openExcelFile } from '../../../utils/fileImport';
import { useSidebar } from '../../../contexts/useSidebar';
import ModalContent from './ModalContent';

type Screen = ParsedScreen;

export default function ScreensView() {
  const { isDefinition, setIsDefinition } = useSidebar();
  const [importBuffer, setImportBuffer] = useState<{ buffer: ArrayBuffer; fileName: string } | null>(null);
  const [currentSheet, setCurrentSheet] = useState<string | null>(null);
  const [extractMode, setExtractMode] = useState<'init' | 'test'>('test');
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [screens, setScreens] = useState<Screen[]>([]);
  const [prevSyncKey, setPrevSyncKey] = useState<string>('');
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [popupData, setPopupData] = useState<{
    type: 'champs' | 'boutons' | 'get' | 'msgKOPrevu';
    screen: Screen;
  } | null>(null);
  const [addScreenDialogOpen, setAddScreenDialogOpen] = useState(false);
  const [newScreenName, setNewScreenName] = useState('');

  const effectiveExtractMode = isDefinition ? 'init' : extractMode;
  const effectiveTestId = isDefinition ? undefined : (extractMode === 'test' ? selectedTestId : undefined);

  const { workbook, screens: derivedScreens } = useMemo(() => {
    if (!importBuffer || !currentSheet) return { workbook: null as ParsedWorkbook | null, screens: [] as Screen[] };
    const parsed = parseExcel(importBuffer.buffer, importBuffer.fileName, {
      mode: effectiveExtractMode,
      testId: effectiveTestId ?? undefined,
    });
    return {
      workbook: parsed,
      screens: parsed.screensBySheet[currentSheet] ?? [],
    };
  }, [importBuffer, currentSheet, effectiveExtractMode, effectiveTestId]);

  const sheetNames = workbook ? Object.keys(workbook.screensBySheet) : [];
  const currentScreens = screens;

  const filteredScreens = currentScreens.filter(
    (screen) =>
      screen.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      screen.number.toString().includes(searchQuery)
  );

  const handleImport = async () => {
    setImportError(null);
    try {
      const result = await openExcelFile();
      if (!result) return;

      const parsedInit = parseExcel(result.buffer, result.fileName, { mode: 'init' });
      const firstSheet = Object.keys(parsedInit.screensBySheet)[0];

      setImportBuffer({ buffer: result.buffer, fileName: result.fileName });
      if (firstSheet) {
        setCurrentSheet(firstSheet);
        const ids = parsedInit.testIdsBySheet?.[firstSheet] ?? [];
        if (ids.length > 0) {
          setExtractMode('test');
          setSelectedTestId(ids[0]);
        } else {
          setExtractMode('init');
        }
      } else {
        setCurrentSheet(null);
        setImportError('Aucune donnée trouvée dans le fichier Excel.');
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erreur lors de l\'import.');
    }
  };

  const syncKey = importBuffer ? `${importBuffer.fileName}-${currentSheet}-${effectiveExtractMode}-${effectiveTestId ?? ''}` : '';
  if (derivedScreens.length > 0 && syncKey && syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    setScreens(derivedScreens);
  }

  const handleSelectSheet = (sheetName: string) => {
    setCurrentSheet(sheetName);
    if (isDefinition) {
      setExtractMode('init');
      setSelectedTestId('');
      return;
    }
    if (importBuffer) {
      const parsed = parseExcel(importBuffer.buffer, importBuffer.fileName, { mode: 'init' });
      const ids = parsed.testIdsBySheet?.[sheetName] ?? [];
      if (ids.length > 0 && !ids.includes(selectedTestId)) {
        setSelectedTestId(ids[0]);
        setExtractMode('test');
      } else if (ids.length === 0) {
        setExtractMode('init');
        setSelectedTestId('');
      }
    }
  };

  const sheetTestIds = workbook?.testIdsBySheet?.[currentSheet ?? ''] ?? [];
  const treeNodes = isDefinition ? ['INIT'] : [...sheetTestIds, 'INIT'];
  const selectedNode = effectiveExtractMode === 'init' ? 'INIT' : selectedTestId || 'INIT';
  const selectNode = (node: string) => {
    if (node === 'INIT') {
      setExtractMode('init');
      setSelectedTestId('');
    } else {
      setExtractMode('test');
      setSelectedTestId(node);
    }
  };

  const deleteScreen = (id: string) => {
    setScreens(screens.filter((s) => s.id !== id));
    setSelectedScreens(selectedScreens.filter((sid) => sid !== id));
  };

  const deleteSelectedScreens = () => {
    setScreens(screens.filter((s) => !selectedScreens.includes(s.id)));
    setSelectedScreens([]);
  };

  const openAddScreenDialog = () => {
    setNewScreenName('');
    setAddScreenDialogOpen(true);
  };

  const confirmAddScreen = () => {
    const title = newScreenName.trim() || `Nouvel écran ${screens.length + 1}`;
    const newScreen: Screen = {
      id: `new-${Date.now()}`,
      number: 1,
      title,
      hasFields: true,
      hasButtons: true,
      hasGet: false,
      hasMsg: false,
      rawRow: {},
    };
    const nextScreens = [newScreen, ...screens].map((s, idx) => ({ ...s, number: idx + 1 }));
    setScreens(nextScreens);
    setAddScreenDialogOpen(false);
    setNewScreenName('');
  };

  const duplicateScreen = (screen: Screen) => {
    const newScreen: Screen = {
      ...screen,
      id: `copy-${Date.now()}`,
      number: screens.length + 1,
      title: `${screen.title} (copie)`,
      rawRow: { ...screen.rawRow },
    };
    setScreens([...screens, newScreen]);
  };

  const moveScreen = (id: string, direction: 'up' | 'down') => {
    const index = screens.findIndex((s) => s.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === screens.length - 1)
    )
      return;

    const newScreens = [...screens];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newScreens[index], newScreens[targetIndex]] = [newScreens[targetIndex], newScreens[index]];

    newScreens.forEach((screen, idx) => {
      screen.number = idx + 1;
    });

    setScreens(newScreens);
  };

  const toggleSelectScreen = (id: string) => {
    setSelectedScreens((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedScreens.length === filteredScreens.length) {
      setSelectedScreens([]);
    } else {
      setSelectedScreens(filteredScreens.map((s) => s.id));
    }
  };

  const hasData = workbook && currentSheet;
  const isSoapSheet = (currentSheet?.toLowerCase().includes('soap') ?? false);

  useEffect(() => {
    if (isDefinition) {
      setExtractMode('init');
      setSelectedTestId('');
    }
  }, [isDefinition]);

  return (
    <Box minH="100vh" display="flex" flexDirection="column" bg="#F8F8F8">
      {/* Header */}
      <Box as="header" bg="white" borderBottomWidth="1px" borderColor="gray.200">
        <Flex alignItems="center" justifyContent="space-between" px={6} py={3}>
          <Flex alignItems="center" gap={6} fontSize="sm">
            <Flex alignItems="center" gap={2}>
              <Text color="gray.500">Total:</Text>
              <Text fontWeight="semibold">{currentScreens.length}</Text>
            </Flex>
            <Flex alignItems="center" gap={2}>
              <Text color="gray.500">Sélectionnés:</Text>
              <Text fontWeight="semibold">{selectedScreens.length}</Text>
            </Flex>
          </Flex>

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
            <Button variant="outline" size="sm" gap={2} onClick={handleImport}>
              <Upload size={16} />
              Importer
            </Button>
            <Button size="sm" gap={2} bg="#422AFB" color="white" _hover={{ bg: '#3522d4' }}>
              <Download size={16} />
              Sauvegarder
            </Button>
          </Flex>
        </Flex>
      </Box>

      {/* Main Content */}
      <Flex flex="1" overflow="hidden">
        {/* Left Panel - Sheets from Excel */}
        <Box as="aside" w="256px" bg="white" borderRightWidth="1px" borderColor="gray.200" flexShrink={0}>
          {workbook && !isDefinition && (
            <Box p={4} borderBottomWidth="1px">
              <Button variant="outline" size="sm" w="full" gap={2}>
                <Plus size={16} />
                Ajouter une feuille
              </Button>
            </Box>
          )}

          <Box p={4} display="flex" flexDirection="column" gap={2}>
            {workbook ? (
              sheetNames.map((sheetName) => (
                <Box key={sheetName}>
                  <Box
                    p={3}
                    bg={currentSheet === sheetName ? '#e8f0fe' : 'white'}
                    borderWidth="1px"
                    borderColor={currentSheet === sheetName ? '#422AFB' : 'gray.200'}
                    borderRadius="lg"
                    cursor="pointer"
                    _hover={{ borderColor: 'gray.300' }}
                    onClick={() => handleSelectSheet(sheetName)}
                  >
                    <Flex alignItems="center" gap={2}>
                      <FolderOpen size={16} color={currentSheet === sheetName ? '#422AFB' : '#4b5563'} />
                      <Text fontWeight="medium" fontSize="sm">
                        {sheetName}
                      </Text>
                    </Flex>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {(workbook.screensBySheet[sheetName] ?? []).length} écran(s)
                    </Text>
                  </Box>
                  {currentSheet === sheetName && treeNodes.length > 0 && (
                    <Box pl={4} mt={2} display="flex" flexDirection="column" gap={1}>
                      {treeNodes.map((node) => (
                        <Box
                          key={node}
                          py={2}
                          px={2}
                          borderRadius="md"
                          cursor="pointer"
                          bg={selectedNode === node ? '#ede9fe' : 'transparent'}
                          color={selectedNode === node ? '#422AFB' : 'gray.700'}
                          _hover={{ bg: selectedNode === node ? '#ede9fe' : 'gray.100' }}
                          onClick={() => selectNode(node)}
                        >
                          <Text fontSize="sm" fontWeight={selectedNode === node ? 'semibold' : 'normal'}>
                            {node}
                          </Text>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              ))
            ) : (
              <Text fontSize="sm" color="gray.500">
                Importez un fichier Excel pour afficher les feuilles
              </Text>
            )}
          </Box>
        </Box>

        {/* Center Content - Screens */}
        <Box as="main" flex="1" overflowY="auto" p={6}>
          {importError && (
            <Box mb={4} p={3} bg="red.50" color="red.700" borderRadius="md" fontSize="sm">
              {importError}
            </Box>
          )}

          {!hasData ? (
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
                Les écrans et leurs champs/boutons sont importés depuis un fichier Excel.
                Cliquez sur &quot;Importer&quot; pour charger une matrice de tests.
              </Text>
              <Button onClick={handleImport} gap={2} bg="#422AFB" color="white" _hover={{ bg: '#3522d4' }}>
                <Upload size={16} />
                Importer un fichier Excel
              </Button>
            </Flex>
          ) : (
            <>
              <Box mb={6}>
                <Text fontSize="2xl" fontWeight="bold" color="gray.900" mb={1}>
                  {currentSheet}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  {workbook?.fileName ?? ''}
                </Text>
              </Box>

              {/* Search and Actions Bar */}
              <Flex mb={4} alignItems="center" gap={3}>
                <Box flex="1" position="relative">
                  <Box
                    position="absolute"
                    left={3}
                    top="50%"
                    transform="translateY(-50%)"
                    color="gray.400"
                  >
                    <Search size={16} />
                  </Box>
                  <Input
                    placeholder="Rechercher un écran..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    pl={9}
                  />
                </Box>
                {selectedScreens.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deleteSelectedScreens}
                    gap={2}
                  >
                    <Trash2 size={16} />
                    Supprimer ({selectedScreens.length})
                  </Button>
                )}
              </Flex>

              {/* Select All */}
              {filteredScreens.length > 0 && (
                <Flex mb={3} alignItems="center" gap={2} px={2}>
                  <Checkbox.Root
                    checked={
                      selectedScreens.length === filteredScreens.length &&
                      filteredScreens.length > 0
                    }
                    onCheckedChange={toggleSelectAll}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                  </Checkbox.Root>
                  <Text fontSize="sm" color="gray.600">
                    Tout sélectionner
                  </Text>
                </Flex>
              )}

              {/* Screens List */}
              <Box display="flex" flexDirection="column" gap={3} mb={6}>
                {filteredScreens.map((screen) => (
                  <Box
                    key={screen.id}
                    bg="white"
                    borderWidth="1px"
                    borderRadius="lg"
                    p={4}
                    _hover={{ borderColor: 'gray.400' }}
                    transition="border-color 0.2s"
                    borderColor={
                      selectedScreens.includes(screen.id) ? '#422AFB' : undefined
                    }
                    bgColor={
                      selectedScreens.includes(screen.id) ? '#e8f0fe' : undefined
                    }
                  >
                    <Flex alignItems="center" justifyContent="space-between">
                      <Flex alignItems="center" gap={4} flex="1">
                        <Checkbox.Root
                          checked={selectedScreens.includes(screen.id)}
                          onCheckedChange={() => toggleSelectScreen(screen.id)}
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                        </Checkbox.Root>
                        <Text
                          fontSize="sm"
                          fontWeight="semibold"
                          color="gray.900"
                          w="80px"
                        >
                          Écran {screen.number}
                        </Text>

                        <Text fontWeight="medium" color="gray.900">
                          {screen.title}
                        </Text>
                            <Flex gap={2} ml="auto">
                              <Button
                                size="xs"
                                variant="outline"
                                bg={screen.hasFields ? '#D4EDDA' : undefined}
                                borderColor={screen.hasFields ? '#155724' : undefined}
                                color={screen.hasFields ? '#155724' : undefined}
                                onClick={() =>
                                  setPopupData({
                                    type: 'champs',
                                    screen,
                                  })
                                }
                              >
                                Champs
                              </Button>
                              {!(isDefinition && isSoapSheet) && (
                                <>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    bg={screen.hasButtons ? '#D1ECF1' : undefined}
                                    borderColor={screen.hasButtons ? '#0C5460' : undefined}
                                    color={screen.hasButtons ? '#0C5460' : undefined}
                                    onClick={() =>
                                      setPopupData({
                                        type: 'boutons',
                                        screen,
                                      })
                                    }
                                  >
                                    Boutons
                                  </Button>
                                  {screen.title !== 'Contexte' && (
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      bg={screen.hasGet ? '#D1ECF1' : undefined}
                                      borderColor={screen.hasGet ? '#0C5460' : undefined}
                                      color={screen.hasGet ? '#0C5460' : undefined}
                                      onClick={() =>
                                        setPopupData({
                                          type: 'get',
                                          screen,
                                        })
                                      }
                                    >
                                      GET
                                    </Button>
                                  )}
                                </>
                              )}
                              <Button
                                size="xs"
                                variant="outline"
                                bg={screen.hasMsg ? '#FFF3CD' : undefined}
                                borderColor={screen.hasMsg ? '#856404' : undefined}
                                color={screen.hasMsg ? '#856404' : undefined}
                                onClick={() =>
                                  setPopupData({
                                    type: 'msgKOPrevu',
                                    screen,
                                  })
                                }
                              >
                                msgKOPrevu
                              </Button>
                            </Flex>
                      </Flex>

                      <Flex alignItems="center" gap={1}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveScreen(screen.id, 'up')}
                            disabled={screen.number === 1}
                          >
                            <ChevronUp size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveScreen(screen.id, 'down')}
                            disabled={screen.number === screens.length}
                          >
                            <ChevronDown size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={openAddScreenDialog}
                            gap={1}
                          >
                            <Plus size={14} />
                            <Text fontSize="xs">Créer un nouvel écran</Text>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteScreen(screen.id)}
                            color="gray.600"
                            _hover={{ color: 'gray.900' }}
                          >
                            <Trash2 size={16} />
                          </Button>
                      </Flex>
                    </Flex>
                  </Box>
                ))}
              </Box>

              {filteredScreens.length === 0 && searchQuery && (
                <Box textAlign="center" py={12} color="gray.500">
                  Aucun écran trouvé pour &quot;{searchQuery}&quot;
                </Box>
              )}

              {/* Add Screen Button */}
              <Box
                as="button"
                onClick={openAddScreenDialog}
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
                  <Text fontWeight="medium">Ajouter écran</Text>
                </Flex>
              </Box>
            </>
          )}
        </Box>
      </Flex>

      {/* Dialog Créer un nouvel écran */}
      <Dialog.Root open={addScreenDialogOpen} onOpenChange={(e) => !e.open && setAddScreenDialogOpen(false)}>
        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <Dialog.Positioner>
          <Dialog.Content
            maxW="420px"
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
            >
              <Dialog.Title fontSize="lg" fontWeight="semibold" color="gray.900">
                Créer un nouvel écran
              </Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body py={6} px={6}>
              <Text fontSize="sm" color="gray.600" mb={3}>
                Saisissez le nom de l&apos;écran. Il sera créé vide et placé en haut de la liste.
              </Text>
              <Input
                placeholder="Ex : Contexte, Écran de saisie..."
                value={newScreenName}
                onChange={(e) => setNewScreenName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmAddScreen()}
                size="md"
                borderRadius="md"
                borderColor="gray.300"
                _focus={{ borderColor: '#422AFB', boxShadow: '0 0 0 1px #422AFB' }}
              />
              <Flex justifyContent="flex-end" gap={3} mt={5}>
                <Button size="sm" variant="outline" onClick={() => setAddScreenDialogOpen(false)}>
                  Annuler
                </Button>
                <Button size="sm" bg="#422AFB" color="white" _hover={{ bg: '#3522d4' }} onClick={confirmAddScreen}>
                  Créer
                </Button>
              </Flex>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* ChampsModal - Champs, Boutons, GET, msgKOPrevu */}
      {popupData && (
        <ModalContent
          isOpen={!!popupData}
          onClose={() => setPopupData(null)}
          type={popupData.type}
          screen={popupData.screen}
          allScreens={currentScreens}
          workbook={workbook}
          currentSheet={currentSheet}
          extractMode={effectiveExtractMode}
          isDefinition={isDefinition}
          isSoapSheet={isSoapSheet}
          onSave={(updatedScreen) => {
            setScreens((prev) =>
              prev.map((s) => (s.id === updatedScreen.id ? updatedScreen : s))
            );
            setPopupData(null);
          }}
        />
      )}
    </Box>
  );
}
