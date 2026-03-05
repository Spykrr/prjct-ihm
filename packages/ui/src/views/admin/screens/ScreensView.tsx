import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Input,
  Checkbox,
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
import ModalContent from './ModalContent';

type Screen = ParsedScreen;

export default function ScreensView() {
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [importBuffer, setImportBuffer] = useState<{ buffer: ArrayBuffer; fileName: string } | null>(null);
  const [currentSheet, setCurrentSheet] = useState<string | null>(null);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [extractMode, setExtractMode] = useState<'init' | 'test'>('test');
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [popupData, setPopupData] = useState<{
    type: 'champs' | 'boutons' | 'get' | 'msgKOPrevu';
    screen: Screen;
  } | null>(null);

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

      setImportBuffer({ buffer: result.buffer, fileName: result.fileName });
      const parsedInit = parseExcel(result.buffer, result.fileName, { mode: 'init' });
      const firstSheet = Object.keys(parsedInit.screensBySheet)[0];

      if (firstSheet) {
        setCurrentSheet(firstSheet);
        const ids = parsedInit.testIdsBySheet?.[firstSheet] ?? [];
        if (ids.length > 0) {
          setExtractMode('test');
          setSelectedTestId(ids[0]);
          const parsed = parseExcel(result.buffer, result.fileName, {
            mode: 'test',
            testId: ids[0],
          });
          setWorkbook(parsed);
          setScreens(parsed.screensBySheet[firstSheet] ?? []);
        } else {
          setExtractMode('init');
          setWorkbook(parsedInit);
          setScreens(parsedInit.screensBySheet[firstSheet]);
        }
      } else {
        setCurrentSheet(null);
        setScreens([]);
        setImportError('Aucune donnée trouvée dans le fichier Excel.');
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erreur lors de l\'import.');
    }
  };

  const applyExtractFilter = () => {
    if (!importBuffer || !currentSheet) return;
    const parsed = parseExcel(importBuffer.buffer, importBuffer.fileName, {
      mode: extractMode,
      testId: extractMode === 'test' ? selectedTestId : undefined,
    });
    setWorkbook(parsed);
    setScreens(parsed.screensBySheet[currentSheet] ?? []);
  };

  useEffect(() => {
    if (importBuffer && currentSheet) applyExtractFilter();
  }, [extractMode, selectedTestId, currentSheet]);

  const handleSelectSheet = (sheetName: string) => {
    setCurrentSheet(sheetName);
    if (workbook) {
      const sheetTestIds = Array.isArray(workbook.testIdsBySheet?.[sheetName])
        ? workbook.testIdsBySheet[sheetName]
        : [];
      if (sheetTestIds.length > 0 && !sheetTestIds.includes(selectedTestId)) {
        setSelectedTestId(sheetTestIds[0]);
      } else {
        setScreens(workbook.screensBySheet[sheetName] ?? []);
      }
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

  const addScreen = () => {
    const newScreen: Screen = {
      id: `new-${Date.now()}`,
      number: screens.length + 1,
      title: `Nouvel écran ${screens.length + 1}`,
      hasFields: true,
      hasButtons: true,
      hasGet: false,
      hasMsg: false,
      rawRow: {},
    };
    setScreens([...screens, newScreen]);
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

  return (
    <Box minH="100vh" display="flex" flexDirection="column" bg="gray.50">
      {/* Header */}
      <Box as="header" bg="white" borderBottomWidth="1px">
        <Flex alignItems="center" justifyContent="space-between" px={6} py={3}>
          <Flex alignItems="center" gap={6}>
            <img src="/UptestV2.png" alt="UptestV2" style={{ height: 56, objectFit: 'contain' }} />
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
          </Flex>

          <Flex alignItems="center" gap={3}>
            <Button variant="outline" size="sm" gap={2} onClick={handleImport}>
              <Upload size={16} />
              Importer
            </Button>
            <Button size="sm" gap={2} bg="gray.900" color="white" _hover={{ bg: 'gray.800' }}>
              <Download size={16} />
              Sauvegarder
            </Button>
          </Flex>
        </Flex>
      </Box>

      {/* Main Content */}
      <Flex flex="1" overflow="hidden">
        {/* Left Panel - Sheets from Excel */}
        <Box as="aside" w="256px" bg="white" borderRightWidth="1px" flexShrink={0}>
          {workbook && (
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
                <Box
                  key={sheetName}
                  p={3}
                  bg={currentSheet === sheetName ? 'gray.50' : 'white'}
                  borderWidth="1px"
                  borderColor={currentSheet === sheetName ? 'gray.900' : 'gray.200'}
                  borderRadius="lg"
                  cursor="pointer"
                  _hover={{ borderColor: 'gray.300' }}
                  onClick={() => handleSelectSheet(sheetName)}
                >
                  <Flex alignItems="center" gap={2}>
                    <FolderOpen size={16} color={currentSheet === sheetName ? '#111827' : '#4b5563'} />
                    <Text fontWeight="medium" fontSize="sm">
                      {sheetName}
                    </Text>
                  </Flex>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    {(workbook.screensBySheet[sheetName] ?? []).length} écran(s)
                  </Text>
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
              <Button onClick={handleImport} gap={2}>
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
                      selectedScreens.includes(screen.id) ? 'gray.900' : undefined
                    }
                    bgColor={
                      selectedScreens.includes(screen.id) ? 'gray.50' : undefined
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
                                bg={screen.hasFields ? 'green.50' : undefined}
                                borderColor={screen.hasFields ? 'green.200' : undefined}
                                onClick={() =>
                                  setPopupData({
                                    type: 'champs',
                                    screen,
                                  })
                                }
                              >
                                Champs
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                bg={screen.hasButtons ? 'green.50' : undefined}
                                borderColor={screen.hasButtons ? 'green.200' : undefined}
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
                                  bg={screen.hasGet ? 'green.50' : undefined}
                                  borderColor={screen.hasGet ? 'green.200' : undefined}
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
                              <Button
                                size="xs"
                                variant="outline"
                                bg={screen.hasMsg ? 'green.50' : undefined}
                                borderColor={screen.hasMsg ? 'green.200' : undefined}
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
                            onClick={() => duplicateScreen(screen)}
                            gap={1}
                          >
                            <Plus size={14} />
                            <Text fontSize="xs">Ajouter une instance</Text>
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
                onClick={addScreen}
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
          extractMode={extractMode}
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
