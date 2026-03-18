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
  Menu,
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
  ChevronRight,
  MoreVertical,
  Play,
  Copy,
  Pencil,
  Keyboard,
  MousePointerClick,
  MessageSquare,
} from 'lucide-react';
import { parseExcel, generateExcel, COLUMN_KEYS, type ParsedScreen, type ParsedWorkbook } from '@uptest/core';
import { openExcelFile } from '../../../utils/fileImport';
import { useSidebar } from '../../../contexts/useSidebar';
import { useToast } from '../../../contexts/ToastContext';
import ModalContent from './ModalContent';
import * as XLSX from 'xlsx';

function downloadXlsx(buffer: ArrayBuffer, fileName: string) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

type Screen = ParsedScreen;
type TestDisplayNamesMap = Record<string, Record<string, string>>;

function minimalInitScreen(): Screen {
  const rawRow: Record<string, unknown> = {
    '*** Test Cases ***': 'INIT-Ligne1',
    '${type}': 'INIT',
    '${id}': '',
    '${ecran}': 'Context',
    '${msgKOPrevu}': '',
    '${get}': '',
  };
  for (let i = 1; i <= 15; i++) rawRow[`\${champ${i.toString().padStart(2, '0')}}`] = '';
  for (let i = 1; i <= 10; i++) rawRow[`\${bouton${i.toString().padStart(2, '0')}}`] = '';
  return {
    id: 'INIT-Ligne1',
    number: 1,
    title: 'Context',
    hasFields: false,
    hasButtons: false,
    hasGet: false,
    hasMsg: false,
    rawRow,
  };
}

export default function ScreensView() {
  const { isDefinition, setIsDefinition } = useSidebar();
  const { showSuccess } = useToast();
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
  /** Index dans `screens` où insérer le nouvel écran (screens.length = en bas) */
  const [addScreenInsertIndex, setAddScreenInsertIndex] = useState<number>(0);
  const [newSheetDialogOpen, setNewSheetDialogOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [addedSheets, setAddedSheets] = useState<Record<string, Screen[]>>({});
  const [sheetToDelete, setSheetToDelete] = useState<string | null>(null);
  const [renameSheetTarget, setRenameSheetTarget] = useState<string | null>(null);
  const [renameSheetValue, setRenameSheetValue] = useState('');
  const [hiddenSheetNames, setHiddenSheetNames] = useState<string[]>([]);
  const [sheetDisplayNames, setSheetDisplayNames] = useState<Record<string, string>>({});
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set());
  const [testDisplayNames, setTestDisplayNames] = useState<TestDisplayNamesMap>({});
  const [deletedTestIds, setDeletedTestIds] = useState<Record<string, string[]>>({});
  const [addedTestCopies, setAddedTestCopies] = useState<Record<string, Array<{ id: string; sourceId: string }>>>({});
  const [renameTestTarget, setRenameTestTarget] = useState<{ sheetName: string; testId: string } | null>(null);
  const [renameTestValue, setRenameTestValue] = useState('');
  const [testToDelete, setTestToDelete] = useState<{ sheetName: string; testId: string } | null>(null);
  const [confirmReplaceImportOpen, setConfirmReplaceImportOpen] = useState(false);

  const handleExport = () => {
    if (!currentSheet || screens.length === 0) return;
    if (!importBuffer) return;

    // Partir du fichier d'origine pour conserver le rendu Excel (notes, etc.)
    const wb = XLSX.read(importBuffer.buffer, { type: 'array', cellComments: true } as any);
    const ws = wb.Sheets[currentSheet];
    if (!ws) return;

    // Map colonne (index) via la ligne d'en-têtes (1ère ligne)
    const ref = ws['!ref'] as string | undefined;
    if (!ref) return;
    const range = XLSX.utils.decode_range(ref);
    const headerRow = range.s.r;
    const headerByCol: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRow, c });
      const cell = ws[addr] as XLSX.CellObject | undefined;
      headerByCol[c] = cell?.v != null ? String(cell.v).trim() : '';
    }
    const findColIndexForStdKey = (stdKey: string): number | undefined => {
      const target = stdKey.toLowerCase().replace(/\s+/g, '');
      for (let c = 0; c < headerByCol.length; c++) {
        const h = (headerByCol[c] ?? '').toString().toLowerCase().replace(/\s+/g, '');
        if (!h) continue;
        if (h === target) return c;
        const t2 = target.replace(/[${}]/g, '');
        if (t2 && h.includes(t2)) return c;
      }
      return undefined;
    };
    const stdKeyToCol: Record<string, number> = {};
    for (const k of COLUMN_KEYS) {
      const col = findColIndexForStdKey(k);
      if (col != null) stdKeyToCol[k] = col;
    }

    // Ecrit les valeurs + notes sur les lignes (2..)
    screens.forEach((screen, idx) => {
      const excelRow0 = headerRow + 1 + idx; // ligne juste sous header
      for (const stdKey of COLUMN_KEYS) {
        const colIdx = stdKeyToCol[stdKey];
        if (colIdx == null) continue;
        const addr = XLSX.utils.encode_cell({ r: excelRow0, c: colIdx });
        const val = (screen.rawRow as Record<string, unknown>)[stdKey];
        const cell = (ws[addr] ?? (ws[addr] = { t: 'z' } as XLSX.CellObject)) as XLSX.CellObject & { c?: any[] };
        cell.t = 's';
        cell.v = val == null ? '' : String(val);
        // Notes
        const comment = (screen.comments ?? {})[stdKey];
        if (comment && comment.trim()) {
          cell.c = [{ a: 'Uptest', t: comment.trim() }];
        } else if (cell.c) {
          delete cell.c;
        }
        ws[addr] = cell;
      }
    });

    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx', cellComments: true } as any) as ArrayBuffer;
    const base = importBuffer.fileName?.replace(/\.xlsx$/i, '') ?? 'uptest';
    downloadXlsx(out, `${base}.xlsx`);
    showSuccess('Fichier Excel téléchargé');
  };

  const effectiveExtractMode = isDefinition ? 'init' : extractMode;
  const resolvedTestIdForExtract = useMemo(() => {
    if (!currentSheet || isDefinition || extractMode !== 'test') return selectedTestId || undefined;
    const copies = addedTestCopies[currentSheet] ?? [];
    const copy = copies.find((c) => c.id === selectedTestId);
    return copy ? copy.sourceId : selectedTestId || undefined;
  }, [currentSheet, isDefinition, extractMode, selectedTestId, addedTestCopies]);
  const effectiveTestId = isDefinition ? undefined : (extractMode === 'test' ? resolvedTestIdForExtract : undefined);

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

  const sheetNames = useMemo(() => {
    const fromWorkbook = workbook ? Object.keys(workbook.screensBySheet).filter((n) => !hiddenSheetNames.includes(n)) : [];
    const fromAdded = Object.keys(addedSheets);
    return [...fromWorkbook, ...fromAdded.filter((n) => !fromWorkbook.includes(n))];
  }, [workbook, addedSheets, hiddenSheetNames]);
  const currentScreens = screens;

  const isSyntheseTitle = (title: string | undefined) => {
    if (!title) return false;
    const normalized = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return normalized.includes('synthese');
  };

  const filteredScreens = currentScreens.filter(
    (screen) =>
      screen.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      screen.number.toString().includes(searchQuery)
  );

  const doImport = async () => {
    setImportError(null);
    try {
      const result = await openExcelFile();
      if (!result) return;

      const parsedInit = parseExcel(result.buffer, result.fileName, { mode: 'init' });
      const firstSheet = Object.keys(parsedInit.screensBySheet)[0];

      setImportBuffer({ buffer: result.buffer, fileName: result.fileName });
      setHiddenSheetNames([]);
      setSheetDisplayNames({});
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

  const handleImport = async () => {
    // Si un fichier est déjà chargé (workbook présent), on demande d'abord confirmation
    if (workbook) {
      setConfirmReplaceImportOpen(true);
      return;
    }
    await doImport();
  };

  const confirmReplaceImport = async () => {
    setConfirmReplaceImportOpen(false);
    await doImport();
  };

  const syncKey = importBuffer ? `${importBuffer.fileName}-${currentSheet}-${effectiveExtractMode}-${effectiveTestId ?? ''}` : '';
  const isCurrentSheetAdded = Boolean(currentSheet && addedSheets[currentSheet]);
  if (!isCurrentSheetAdded && derivedScreens.length > 0 && syncKey && syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey);
    setScreens(derivedScreens);
  }

  const handleSelectSheet = (sheetName: string) => {
    setExpandedSheets((prev) => new Set([...prev, sheetName]));
    if (addedSheets[sheetName]) {
      setCurrentSheet(sheetName);
      setScreens(addedSheets[sheetName]);
      if (!isDefinition) {
        setExtractMode('init');
        setSelectedTestId('');
      }
      return;
    }
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

  const getTreeNodesForSheet = (sheetName: string) => {
    if (isDefinition) {
      const deleted = deletedTestIds[sheetName] ?? [];
      const copies = (addedTestCopies[sheetName] ?? []).map((c) => c.id);
      const base = deleted.includes('INIT') ? [] : ['INIT'];
      return [...base, ...copies];
    }
    const fromWb = workbook?.testIdsBySheet?.[sheetName] ?? [];
    const deleted = deletedTestIds[sheetName] ?? [];
    const baseIds = fromWb.filter((id) => !deleted.includes(id));
    const copies = (addedTestCopies[sheetName] ?? []).map((c) => c.id);
    return [...baseIds, ...copies];
  };
  const getTestDisplayName = (sheetName: string, testId: string) =>
    testDisplayNames[sheetName]?.[testId] ?? testId;
  const selectedNode = effectiveExtractMode === 'init' ? 'INIT' : selectedTestId || 'INIT';

  useEffect(() => {
    if (currentSheet && sheetNames.includes(currentSheet)) {
      setExpandedSheets((prev) => (prev.has(currentSheet) ? prev : new Set([...prev, currentSheet])));
    }
  }, [currentSheet, sheetNames]);
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

  /** Ouvre le dialog d'ajout d'écran. insertIndex = position d'insertion (0 = en haut, screens.length = en bas). Par défaut = en bas. */
  const openAddScreenDialog = (insertIndex?: number) => {
    setNewScreenName('');
    setAddScreenInsertIndex(insertIndex ?? screens.length);
    setAddScreenDialogOpen(true);
  };

  const openNewSheetDialog = () => {
    setNewSheetName('');
    setNewSheetDialogOpen(true);
  };

  const confirmNewSheet = () => {
    const name = newSheetName.trim();
    if (!name) return;
    if (sheetNames.includes(name)) {
      setImportError(`Une feuille nommée "${name}" existe déjà.`);
      return;
    }
    setImportError(null);
    const init = minimalInitScreen();
    setAddedSheets((prev) => ({ ...prev, [name]: [init] }));
    setCurrentSheet(name);
    setScreens([init]);
    setNewSheetDialogOpen(false);
    setNewSheetName('');
  };

  const confirmDeleteSheet = () => {
    if (!sheetToDelete) return;
    if (addedSheets[sheetToDelete]) {
      const nextAdded = { ...addedSheets };
      delete nextAdded[sheetToDelete];
      setAddedSheets(nextAdded);
    } else {
      setHiddenSheetNames((prev) => (prev.includes(sheetToDelete) ? prev : [...prev, sheetToDelete]));
    }
    if (currentSheet === sheetToDelete) {
      const remaining = sheetNames.filter((n) => n !== sheetToDelete);
      const next = remaining[0] ?? null;
      setCurrentSheet(next);
      if (next && addedSheets[next]) setScreens(addedSheets[next]);
      else if (next && workbook?.screensBySheet[next]) setScreens(workbook.screensBySheet[next]);
      else setScreens([]);
    }
    setSheetToDelete(null);
    showSuccess('Feuille supprimée avec succès');
  };

  const duplicateSheet = (sheetName: string) => {
    const sourceScreens = workbook?.screensBySheet[sheetName] ?? addedSheets[sheetName] ?? [];
    const baseName = `${sheetName} (copie)`;
    let newName = baseName;
    let i = 1;
    while (sheetNames.includes(newName)) {
      newName = `${baseName} ${i}`;
      i += 1;
    }
    const copied: Screen[] = sourceScreens.map((s, idx) => ({
      ...s,
      id: `copy-${Date.now()}-${idx}`,
      number: idx + 1,
      rawRow: { ...s.rawRow },
    }));
    setAddedSheets((prev) => ({ ...prev, [newName]: copied }));
    setCurrentSheet(newName);
    setScreens(copied);
    showSuccess('Feuille dupliquée avec succès');
  };

  const openRenameSheetDialog = (sheetName: string) => {
    setRenameSheetTarget(sheetName);
    setRenameSheetValue(sheetDisplayNames[sheetName] ?? sheetName);
  };

  const confirmRenameSheet = () => {
    if (!renameSheetTarget || !renameSheetValue.trim()) return;
    const newName = renameSheetValue.trim();
    const currentDisplay = sheetDisplayNames[renameSheetTarget] ?? renameSheetTarget;
    if (newName === currentDisplay) {
      setRenameSheetTarget(null);
      setRenameSheetValue('');
      return;
    }
    const usedNames = new Set(sheetNames.map((s) => sheetDisplayNames[s] ?? s));
    if (usedNames.has(newName)) {
      setImportError(`Une feuille nommée "${newName}" existe déjà.`);
      return;
    }
    setImportError(null);
    if (addedSheets[renameSheetTarget]) {
      const sheets = { ...addedSheets };
      sheets[newName] = sheets[renameSheetTarget];
      delete sheets[renameSheetTarget];
      setAddedSheets(sheets);
      if (currentSheet === renameSheetTarget) {
        setCurrentSheet(newName);
        setScreens(sheets[newName]);
      }
    } else {
      setSheetDisplayNames((prev) => ({ ...prev, [renameSheetTarget]: newName }));
    }
    setRenameSheetTarget(null);
    setRenameSheetValue('');
    showSuccess('Nom modifié avec succès');
  };

  const executeSheet = (_sheetName: string) => {
    setImportError(null);
    showSuccess('Exécution lancée avec succès');
  };

  const openRenameTestDialog = (sheetName: string, testId: string) => {
    setRenameTestTarget({ sheetName, testId });
    setRenameTestValue(getTestDisplayName(sheetName, testId));
  };

  const confirmRenameTest = () => {
    if (!renameTestTarget || !renameTestValue.trim()) return;
    const { sheetName, testId } = renameTestTarget;
    const newName = renameTestValue.trim();
    setTestDisplayNames((prev: TestDisplayNamesMap) => ({
      ...prev,
      [sheetName]: { ...(prev[sheetName] ?? {}), [testId]: newName },
    }));
    setRenameTestTarget(null);
    setRenameTestValue('');
    showSuccess('Nom modifié avec succès');
  };

  const deleteTest = (sheetName: string, testId: string) => {
    if (currentSheet === sheetName && selectedTestId === testId) {
      const currentNodes = getTreeNodesForSheet(sheetName);
      const remaining = currentNodes.filter((n) => n !== testId);
      const nextNode = remaining.includes('INIT') ? 'INIT' : remaining[0];
      if (nextNode) {
        if (nextNode === 'INIT') {
          setExtractMode('init');
          setSelectedTestId('');
        } else {
          setExtractMode('test');
          setSelectedTestId(nextNode);
        }
      }
    }
    setDeletedTestIds((prev) => ({
      ...prev,
      [sheetName]: [...(prev[sheetName] ?? []), testId],
    }));
    setTestToDelete(null);
    showSuccess('Test supprimé avec succès');
  };

  const duplicateTest = (sheetName: string, testId: string) => {
    const copies = addedTestCopies[sheetName] ?? [];
    const baseId = `${testId}-copie`;
    let newId = baseId;
    let i = 1;
    while (copies.some((c) => c.id === newId) || (workbook?.testIdsBySheet?.[sheetName] ?? []).includes(newId)) {
      newId = `${baseId}-${i}`;
      i += 1;
    }
    setAddedTestCopies((prev) => ({
      ...prev,
      [sheetName]: [...(prev[sheetName] ?? []), { id: newId, sourceId: testId }],
    }));
    setExpandedSheets((prev) => new Set([...prev, sheetName]));
    if (currentSheet === sheetName) {
      setExtractMode('test');
      setSelectedTestId(newId);
    }
    showSuccess('Test dupliqué avec succès');
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
    const insertAt = Math.max(0, Math.min(addScreenInsertIndex, screens.length));
    const nextScreens = [...screens.slice(0, insertAt), newScreen, ...screens.slice(insertAt)].map((s, idx) => ({
      ...s,
      number: idx + 1,
    }));
    setScreens(nextScreens);
    setAddScreenDialogOpen(false);
    setNewScreenName('');
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

  const hasData = Boolean(
    currentSheet &&
      ((workbook && workbook.screensBySheet[currentSheet] != null) || (addedSheets[currentSheet]?.length != null))
  );
  const isSoapSheet = (currentSheet?.toLowerCase().includes('soap') ?? false);

  useEffect(() => {
    if (isDefinition) {
      setExtractMode('init');
      setSelectedTestId('');
    }
  }, [isDefinition]);

  useEffect(() => {
    if (currentSheet && addedSheets[currentSheet]) {
      setAddedSheets((prev) => ({ ...prev, [currentSheet]: screens }));
    }
  }, [currentSheet, screens]);

  return (
    <Box minH="100vh" display="flex" flexDirection="column" bg="#F8F8F8">
      {/* Header */}
      <Box as="header" bg="white" borderBottomWidth="1px" borderColor="gray.200">
        <Flex alignItems="center" justifyContent="space-between" px={6} py={3} flexWrap="wrap" gap={3}>
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
                onCheckedChange={(e) => {
                  const nextIsDefinition = e.checked;
                  setIsDefinition(nextIsDefinition);
                  if (!nextIsDefinition) {
                    const firstSheet = sheetNames[0];
                    if (firstSheet) {
                      setCurrentSheet(firstSheet);
                      const ids = workbook?.testIdsBySheet?.[firstSheet] ?? [];
                      if (ids.length > 0) {
                        setExtractMode('test');
                        setSelectedTestId(ids[0]);
                      } else {
                        setExtractMode('init');
                        setSelectedTestId('');
                      }
                    }
                  }
                }}
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
            <Button
              variant="outline"
              size="sm"
              gap={2}
              px={3}
              py={2}
              fontWeight="medium"
              borderRadius="lg"
              borderColor="#422AFB"
              color="#422AFB"
              _hover={{ bg: 'rgba(66, 42, 251, 0.08)', borderColor: '#3522d4' }}
              transition="all 0.2s"
              onClick={handleImport}
            >
              <Upload size={16} />
              Importer
            </Button>
            <Button
              size="sm"
              gap={2}
              px={3}
              py={2}
              fontWeight="medium"
              borderRadius="lg"
              bg="#422AFB"
              color="white"
              boxShadow="0 2px 6px rgba(66, 42, 251, 0.22)"
              _hover={{ bg: '#3522d4', boxShadow: '0 3px 10px rgba(66, 42, 251, 0.3)', transform: 'translateY(-1px)' }}
              _active={{ transform: 'translateY(0)' }}
              transition="all 0.2s"
              onClick={handleExport}
            >
              <Download size={16} />
              Sauvegarder
            </Button>
          </Flex>
        </Flex>
      </Box>

      {/* Main Content */}
      <Flex flex="1" overflow="hidden">
        {/* Left Panel - Sheets from Excel */}
        <Box as="aside" w="320px" bg="white" borderRightWidth="1px" borderColor="gray.200" flexShrink={0}>
          {workbook && !isDefinition && (
            <Box p={4} borderBottomWidth="1px">
              <Button variant="outline" size="sm" w="full" gap={2} onClick={openNewSheetDialog}>
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
                    <Flex alignItems="flex-start" justifyContent="space-between" gap={1}>
                      <Flex alignItems="center" gap={2} flex={1} minW={0}>
                        <Box
                          as="span"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setExpandedSheets((prev) => {
                              const next = new Set(prev);
                              if (next.has(sheetName)) next.delete(sheetName);
                              else next.add(sheetName);
                              return next;
                            });
                          }}
                          display="inline-flex"
                          flexShrink={0}
                          color={currentSheet === sheetName ? '#422AFB' : '#4b5563'}
                          cursor="pointer"
                          _hover={{ opacity: 0.8 }}
                        >
                          {expandedSheets.has(sheetName) ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </Box>
                        <Box flexShrink={0}><FolderOpen size={16} color={currentSheet === sheetName ? '#422AFB' : '#4b5563'} /></Box>
                        <Text fontWeight="medium" fontSize="sm" truncate>
                          {sheetDisplayNames[sheetName] ?? sheetName}
                        </Text>
                      </Flex>
                      {/* Menu trois points supprimé pour les dossiers (feuilles) */}
                    </Flex>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {(workbook?.screensBySheet[sheetName] ?? addedSheets[sheetName] ?? []).length} écran(s)
                    </Text>
                  </Box>
                  {expandedSheets.has(sheetName) && getTreeNodesForSheet(sheetName).length > 0 && (
                    <Box pl={4} mt={2} display="flex" flexDirection="column" gap={1}>
                      {getTreeNodesForSheet(sheetName).map((node) => (
                        <Flex
                          key={node}
                          alignItems="center"
                          justifyContent="space-between"
                          gap={2}
                          py={2}
                          px={2}
                          borderRadius="md"
                          cursor="pointer"
                          bg={currentSheet === sheetName && selectedNode === node ? '#ede9fe' : 'transparent'}
                          color={currentSheet === sheetName && selectedNode === node ? '#422AFB' : 'gray.700'}
                          _hover={{ bg: currentSheet === sheetName && selectedNode === node ? '#ede9fe' : 'gray.100' }}
                          onClick={() => {
                            if (currentSheet !== sheetName) handleSelectSheet(sheetName);
                            selectNode(node);
                          }}
                        >
                          <Text fontSize="sm" fontWeight={currentSheet === sheetName && selectedNode === node ? 'semibold' : 'normal'} flex={1} minW={0} lineClamp={1}>
                            {getTestDisplayName(sheetName, node)}
                          </Text>
                          <Box as="span" onClick={(e: React.MouseEvent) => e.stopPropagation()} display="inline-flex">
                            <Menu.Root positioning={{ placement: 'right-start' }}>
                              <Menu.Trigger asChild>
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  p={1.5}
                                  minW="auto"
                                  h="auto"
                                  borderRadius="md"
                                  color="gray.500"
                                  _hover={{ bg: 'gray.100', color: 'gray.700' }}
                                >
                                  <MoreVertical size={16} strokeWidth={2} />
                                </Button>
                              </Menu.Trigger>
                              <Menu.Positioner>
                                <Menu.Content
                                  minW="200px"
                                  borderRadius="xl"
                                  boxShadow="xl"
                                  borderWidth="1px"
                                  borderColor="gray.100"
                                  bg="white"
                                  py={2}
                                  px={1}
                                  zIndex={50}
                                >
                                  <Menu.Item
                                    value="modifier"
                                    onSelect={() => openRenameTestDialog(sheetName, node)}
                                    py={2.5}
                                    px={3}
                                    borderRadius="lg"
                                    cursor="pointer"
                                    _highlighted={{ bg: 'gray.50' }}
                                  >
                                    <Flex alignItems="center" gap={3}>
                                      <Pencil size={16} strokeWidth={2} />
                                      <Text fontSize="sm" fontWeight="medium" color="gray.800">
                                        Modifier le nom
                                      </Text>
                                    </Flex>
                                  </Menu.Item>
                                  <Menu.Item
                                    value="executer"
                                    onSelect={() => showSuccess('Exécution lancée avec succès')}
                                    py={2.5}
                                    px={3}
                                    borderRadius="lg"
                                    cursor="pointer"
                                    _highlighted={{ bg: 'gray.50' }}
                                  >
                                    <Flex alignItems="center" gap={3}>
                                      <Play size={16} strokeWidth={2} />
                                      <Text fontSize="sm" fontWeight="medium" color="gray.800">
                                        Exécuter
                                      </Text>
                                    </Flex>
                                  </Menu.Item>
                                  <Menu.Item
                                    value="dupliquer"
                                    onSelect={() => duplicateTest(sheetName, node)}
                                    py={2.5}
                                    px={3}
                                    borderRadius="lg"
                                    cursor="pointer"
                                    _highlighted={{ bg: 'gray.50' }}
                                  >
                                    <Flex alignItems="center" gap={3}>
                                      <Copy size={16} strokeWidth={2} />
                                      <Text fontSize="sm" fontWeight="medium" color="gray.800">
                                        Dupliquer
                                      </Text>
                                    </Flex>
                                  </Menu.Item>
                                  <Menu.Separator my={1} borderColor="gray.100" />
                                  <Menu.Item
                                    value="supprimer"
                                    onSelect={() => setTestToDelete({ sheetName, testId: node })}
                                    py={2.5}
                                    px={3}
                                    borderRadius="lg"
                                    cursor="pointer"
                                    _highlighted={{ bg: 'red.50' }}
                                  >
                                    <Flex alignItems="center" gap={3}>
                                      <Box color="red.500">
                                        <Trash2 size={16} strokeWidth={2} />
                                      </Box>
                                      <Text fontSize="sm" fontWeight="medium" color="red.600">
                                        Supprimer
                                      </Text>
                                    </Flex>
                                  </Menu.Item>
                                </Menu.Content>
                              </Menu.Positioner>
                            </Menu.Root>
                          </Box>
                        </Flex>
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
              <Button
                onClick={handleImport}
                size="sm"
                gap={2}
                px={4}
                py={2.5}
                fontWeight="medium"
                borderRadius="lg"
                bg="#422AFB"
                color="white"
                boxShadow="0 2px 6px rgba(66, 42, 251, 0.22)"
                _hover={{ bg: '#3522d4', boxShadow: '0 3px 10px rgba(66, 42, 251, 0.3)', transform: 'translateY(-1px)' }}
                _active={{ transform: 'translateY(0)' }}
                transition="all 0.2s"
              >
                <Upload size={16} />
                Importer un fichier Excel
              </Button>
            </Flex>
          ) : (
            <>
              <Box mb={6}>
                <Text fontSize="2xl" fontWeight="bold" color="gray.900" mb={0.5} letterSpacing="-0.02em">
                  {currentSheet}
                </Text>
                <Text fontSize="sm" color="gray.500" fontWeight="medium">
                  {workbook?.fileName ?? ''}
                </Text>
              </Box>

              {/* Search and Actions Bar */}
              <Flex mb={5} alignItems="center" gap={3} flexWrap="wrap">
                <Box flex="1" minW="220px" position="relative">
                  <Box
                    position="absolute"
                    left={4}
                    top="50%"
                    transform="translateY(-50%)"
                    color="gray.400"
                  >
                    <Search size={18} strokeWidth={2} />
                  </Box>
                  <Input
                    placeholder="Rechercher un écran..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    pl={11}
                    h="42px"
                    borderRadius="xl"
                    borderColor="gray.200"
                    _focus={{ borderColor: '#422AFB', boxShadow: '0 0 0 2px rgba(66, 42, 251, 0.15)' }}
                  />
                </Box>
                <Flex alignItems="center" gap={2}>
                  {filteredScreens.length > 0 && (
                    <>
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
                    </>
                  )}
                  {selectedScreens.length > 0 && (
                    <Button
                      size="sm"
                      px={4}
                      py={2}
                      fontWeight="medium"
                      borderRadius="xl"
                      bg="red.500"
                      color="white"
                      boxShadow="0 2px 6px rgba(220, 38, 38, 0.25)"
                      _hover={{ bg: 'red.600', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)', transform: 'translateY(-1px)' }}
                      _active={{ transform: 'translateY(0)' }}
                      transition="all 0.2s"
                      onClick={deleteSelectedScreens}
                      gap={2}
                    >
                      <Trash2 size={16} />
                      Supprimer ({selectedScreens.length})
                    </Button>
                  )}
                </Flex>
              </Flex>

              {filteredScreens.length === 0 && searchQuery && (
                <Box textAlign="center" py={16} px={4}>
                  <Text fontSize="sm" color="gray.500" fontWeight="medium">
                    Aucun écran trouvé pour &quot;{searchQuery}&quot;
                  </Text>
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    Modifiez votre recherche ou réinitialisez le filtre.
                  </Text>
                </Box>
              )}

              {filteredScreens.length > 0 && (
                <>
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
                            <Flex gap={2} ml="auto" alignItems="center">
                              {!(isSyntheseTitle(screen.title) && !isDefinition) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  p={2}
                                  minW="auto"
                                  h="auto"
                                  borderRadius="lg"
                                  title="Champs"
                                  cursor="pointer"
                                  bg={screen.hasFields ? '#dcfce7' : 'gray.50'}
                                  color={screen.hasFields ? '#166534' : 'gray.500'}
                                  _hover={{
                                    bg: screen.hasFields ? '#bbf7d0' : 'gray.100',
                                    transform: 'scale(1.05)',
                                  }}
                                  _active={{ transform: 'scale(0.98)' }}
                                  transition="all 0.15s"
                                  onClick={() =>
                                    setPopupData({ type: 'champs', screen })
                                  }
                                >
                                  <Keyboard size={18} strokeWidth={2} />
                                </Button>
                              )}
                              {!(isDefinition && isSoapSheet) && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    p={2}
                                    minW="auto"
                                    h="auto"
                                    borderRadius="lg"
                                    title="Boutons"
                                    cursor="pointer"
                                    bg={screen.hasButtons ? '#dbeafe' : 'gray.50'}
                                    color={screen.hasButtons ? '#1e40af' : 'gray.500'}
                                    _hover={{
                                      bg: screen.hasButtons ? '#bfdbfe' : 'gray.100',
                                      transform: 'scale(1.05)',
                                    }}
                                    _active={{ transform: 'scale(0.98)' }}
                                    transition="all 0.15s"
                                    onClick={() =>
                                      setPopupData({ type: 'boutons', screen })
                                    }
                                  >
                                    <MousePointerClick size={18} strokeWidth={2} />
                                  </Button>
                                  {screen.title !== 'Contexte' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      p={2}
                                      minW="auto"
                                      h="auto"
                                      borderRadius="lg"
                                      title="GET"
                                      cursor="pointer"
                                      bg={screen.hasGet ? '#f3e8ff' : 'gray.50'}
                                      color={screen.hasGet ? '#6b21a8' : 'gray.500'}
                                      _hover={{
                                        bg: screen.hasGet ? '#e9d5ff' : 'gray.100',
                                        transform: 'scale(1.05)',
                                      }}
                                      _active={{ transform: 'scale(0.98)' }}
                                      transition="all 0.15s"
                                      onClick={() =>
                                        setPopupData({ type: 'get', screen })
                                      }
                                    >
                                      <Download size={18} strokeWidth={2} />
                                    </Button>
                                  )}
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                p={2}
                                minW="auto"
                                h="auto"
                                borderRadius="lg"
                                title="msgKOPrevu"
                                cursor="pointer"
                                bg={screen.hasMsg ? '#fef9c3' : 'gray.50'}
                                color={screen.hasMsg ? '#a16207' : 'gray.500'}
                                _hover={{
                                  bg: screen.hasMsg ? '#fef08a' : 'gray.100',
                                  transform: 'scale(1.05)',
                                }}
                                _active={{ transform: 'scale(0.98)' }}
                                transition="all 0.15s"
                                onClick={() =>
                                  setPopupData({ type: 'msgKOPrevu', screen })
                                }
                              >
                                <MessageSquare size={18} strokeWidth={2} />
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
                              onClick={() => openAddScreenDialog(screens.findIndex((s) => s.id === screen.id) + 1)}
                              title="Créer un écran entre celui-ci et le suivant"
                            >
                              <Plus size={16} />
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
                  <Box
                    as="button"
                    onClick={() => openAddScreenDialog(screens.length)}
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

              {hasData && filteredScreens.length === 0 && !searchQuery && (
                <Box
                  as="button"
                  onClick={openAddScreenDialog}
                  w="full"
                  p={10}
                  borderWidth="2px"
                  borderStyle="dashed"
                  borderColor="gray.200"
                  borderRadius="xl"
                  bg="white"
                  _hover={{ borderColor: '#422AFB', bg: 'rgba(66, 42, 251, 0.02)' }}
                  transition="all 0.2s ease"
                >
                  <Flex alignItems="center" justifyContent="center" gap={3} color="gray.500" _hover={{ color: '#422AFB' }}>
                    <Plus size={24} strokeWidth={2} />
                    <Text fontWeight="semibold">Ajouter un premier écran</Text>
                  </Flex>
                </Box>
              )}
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
                {addScreenInsertIndex >= screens.length
                  ? "Saisissez le nom de l'écran. Il sera créé vide et placé en bas de la liste."
                  : addScreenInsertIndex === 0
                    ? "Saisissez le nom de l'écran. Il sera créé vide et placé en haut de la liste."
                    : "Saisissez le nom de l'écran. Il sera créé vide et inséré entre les écrans."}
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

      {/* Dialog Confirmation remplacer l'import */}
      <Dialog.Root open={confirmReplaceImportOpen} onOpenChange={(e) => !e.open && setConfirmReplaceImportOpen(false)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="400px" borderRadius="xl" boxShadow="xl" bg="white" borderWidth="1px" borderColor="gray.200">
            <Dialog.Header borderBottomWidth="1px" borderColor="gray.100" py={4} px={6}>
              <Dialog.Title fontSize="lg" fontWeight="semibold">
                Remplacer le fichier importé
              </Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body py={6} px={6}>
              <Text fontSize="sm" color="gray.600">
                Un fichier est déjà importé ({importBuffer?.fileName ?? ''}). Souhaitez-vous l&apos;abandonner et en importer un autre ?
              </Text>
              <Flex justifyContent="flex-end" gap={3} mt={5}>
                <Button
                  size="md"
                  variant="outline"
                  px={5}
                  py={2.5}
                  fontWeight="medium"
                  borderRadius="xl"
                  borderColor="gray.200"
                  color="gray.700"
                  _hover={{ bg: 'gray.50', borderColor: 'gray.300' }}
                  transition="all 0.2s"
                  onClick={() => setConfirmReplaceImportOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  size="md"
                  px={5}
                  py={2.5}
                  fontWeight="medium"
                  borderRadius="xl"
                  bg="#422AFB"
                  color="white"
                  boxShadow="0 2px 8px rgba(66, 42, 251, 0.25)"
                  _hover={{ bg: '#3522d4', boxShadow: '0 4px 14px rgba(66, 42, 251, 0.35)', transform: 'translateY(-1px)' }}
                  _active={{ transform: 'translateY(0)' }}
                  transition="all 0.2s"
                  onClick={confirmReplaceImport}
                >
                  Oui, importer un autre fichier
                </Button>
              </Flex>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Dialog Nouvelle feuille */}
      <Dialog.Root open={newSheetDialogOpen} onOpenChange={(e) => !e.open && setNewSheetDialogOpen(false)}>
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
                Nouvelle feuille
              </Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body py={6} px={6}>
              <Text fontSize="sm" color="gray.600" mb={3}>
                Saisissez le nom de la feuille. Une ligne INIT sera créée par défaut.
              </Text>
              <Input
                placeholder="Ex : Feuille2, Données..."
                value={newSheetName}
                onChange={(e) => setNewSheetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmNewSheet()}
                size="md"
                borderRadius="md"
                borderColor="gray.300"
                _focus={{ borderColor: '#422AFB', boxShadow: '0 0 0 1px #422AFB' }}
              />
              <Flex justifyContent="flex-end" gap={3} mt={5}>
                <Button
                  size="md"
                  variant="outline"
                  px={5}
                  py={2.5}
                  fontWeight="medium"
                  borderRadius="xl"
                  borderColor="gray.200"
                  color="gray.700"
                  _hover={{ bg: 'gray.50', borderColor: 'gray.300' }}
                  transition="all 0.2s"
                  onClick={() => setNewSheetDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  size="md"
                  px={5}
                  py={2.5}
                  fontWeight="medium"
                  borderRadius="xl"
                  bg="#422AFB"
                  color="white"
                  boxShadow="0 2px 8px rgba(66, 42, 251, 0.25)"
                  _hover={{ bg: '#3522d4', boxShadow: '0 4px 14px rgba(66, 42, 251, 0.35)', transform: 'translateY(-1px)' }}
                  _active={{ transform: 'translateY(0)' }}
                  transition="all 0.2s"
                  onClick={confirmNewSheet}
                >
                  Créer
                </Button>
              </Flex>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Dialog Confirmation suppression feuille */}
      <Dialog.Root open={!!sheetToDelete} onOpenChange={(e) => !e.open && setSheetToDelete(null)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="400px" borderRadius="xl" boxShadow="xl" bg="white" borderWidth="1px" borderColor="gray.200">
            <Dialog.Header borderBottomWidth="1px" borderColor="gray.100" py={4} px={6}>
              <Dialog.Title fontSize="lg" fontWeight="semibold">
                Supprimer la feuille
              </Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body py={6} px={6}>
              <Text fontSize="sm" color="gray.600">
                Êtes-vous sûr de vouloir supprimer la feuille &quot;{sheetToDelete}&quot; ? Cette action est irréversible.
              </Text>
              <Flex justifyContent="flex-end" gap={3} mt={5}>
                <Button
                  size="md"
                  variant="outline"
                  px={5}
                  py={2.5}
                  fontWeight="medium"
                  borderRadius="xl"
                  borderColor="gray.200"
                  color="gray.700"
                  _hover={{ bg: 'gray.50', borderColor: 'gray.300' }}
                  transition="all 0.2s"
                  onClick={() => setSheetToDelete(null)}
                >
                  Annuler
                </Button>
                <Button
                  size="md"
                  px={5}
                  py={2.5}
                  fontWeight="medium"
                  borderRadius="xl"
                  bg="red.500"
                  color="white"
                  boxShadow="0 2px 8px rgba(220, 38, 38, 0.25)"
                  _hover={{ bg: 'red.600', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)', transform: 'translateY(-1px)' }}
                  _active={{ transform: 'translateY(0)' }}
                  transition="all 0.2s"
                  onClick={confirmDeleteSheet}
                >
                  Supprimer
                </Button>
              </Flex>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Dialog Modifier nom feuille */}
      <Dialog.Root
        open={!!renameSheetTarget}
        onOpenChange={(e) => {
          if (!e.open) {
            setRenameSheetTarget(null);
            setRenameSheetValue('');
          }
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            maxW="420px"
            borderRadius="xl"
            boxShadow="xl"
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
                confirmRenameSheet();
              }
            }}
          >
            <Dialog.Header borderBottomWidth="1px" borderColor="gray.100" py={4} px={6}>
              <Dialog.Title fontSize="lg" fontWeight="semibold">
                Modifier le nom de la feuille
              </Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body py={6} px={6}>
              <Text fontSize="sm" color="gray.600" mb={3}>
                Nouveau nom pour la feuille &quot;{renameSheetTarget}&quot;.
              </Text>
              <Input
                placeholder="Nom de la feuille"
                value={renameSheetValue}
                onChange={(e) => setRenameSheetValue(e.target.value)}
                size="md"
                borderRadius="md"
                borderColor="gray.300"
                _focus={{ borderColor: '#422AFB', boxShadow: '0 0 0 1px #422AFB' }}
              />
              <Flex justifyContent="flex-end" gap={3} mt={5}>
                <Button
                  size="md"
                  variant="outline"
                  px={5}
                  py={2.5}
                  fontWeight="medium"
                  borderRadius="xl"
                  borderColor="gray.200"
                  color="gray.700"
                  _hover={{ bg: 'gray.50', borderColor: 'gray.300' }}
                  transition="all 0.2s"
                  onClick={() => { setRenameSheetTarget(null); setRenameSheetValue(''); }}
                >
                  Annuler
                </Button>
                <Button
                  size="md"
                  px={5}
                  py={2.5}
                  fontWeight="medium"
                  borderRadius="xl"
                  bg="#422AFB"
                  color="white"
                  boxShadow="0 2px 8px rgba(66, 42, 251, 0.25)"
                  _hover={{ bg: '#3522d4', boxShadow: '0 4px 14px rgba(66, 42, 251, 0.35)', transform: 'translateY(-1px)' }}
                  _active={{ transform: 'translateY(0)' }}
                  transition="all 0.2s"
                  onClick={confirmRenameSheet}
                >
                  Enregistrer
                </Button>
              </Flex>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Dialog Confirmation suppression test */}
      <Dialog.Root open={!!testToDelete} onOpenChange={(e) => !e.open && setTestToDelete(null)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="400px" borderRadius="xl" boxShadow="xl" bg="white" borderWidth="1px" borderColor="gray.200">
            <Dialog.Header borderBottomWidth="1px" borderColor="gray.100" py={4} px={6}>
              <Dialog.Title fontSize="lg" fontWeight="semibold">
                Supprimer le test
              </Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body py={6} px={6}>
              <Text fontSize="sm" color="gray.600">
                Êtes-vous sûr de vouloir supprimer le test &quot;{testToDelete ? getTestDisplayName(testToDelete.sheetName, testToDelete.testId) : ''}&quot; ? Il ne sera plus affiché dans la liste.
              </Text>
              <Flex justifyContent="flex-end" gap={3} mt={5}>
                <Button
                  size="md"
                  variant="outline"
                  px={5}
                  py={2.5}
                  fontWeight="medium"
                  borderRadius="xl"
                  borderColor="gray.200"
                  color="gray.700"
                  _hover={{ bg: 'gray.50', borderColor: 'gray.300' }}
                  transition="all 0.2s"
                  onClick={() => setTestToDelete(null)}
                >
                  Annuler
                </Button>
                <Button
                  size="md"
                  px={5}
                  py={2.5}
                  fontWeight="medium"
                  borderRadius="xl"
                  bg="red.500"
                  color="white"
                  boxShadow="0 2px 8px rgba(220, 38, 38, 0.25)"
                  _hover={{ bg: 'red.600', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)', transform: 'translateY(-1px)' }}
                  _active={{ transform: 'translateY(0)' }}
                  transition="all 0.2s"
                  onClick={() => testToDelete && deleteTest(testToDelete.sheetName, testToDelete.testId)}
                >
                  Supprimer
                </Button>
              </Flex>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Dialog Modifier nom test */}
      <Dialog.Root
        open={!!renameTestTarget}
        onOpenChange={(e) => {
          if (!e.open) {
            setRenameTestTarget(null);
            setRenameTestValue('');
          }
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            maxW="420px"
            borderRadius="xl"
            boxShadow="xl"
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
                confirmRenameTest();
              }
            }}
          >
            <Dialog.Header borderBottomWidth="1px" borderColor="gray.100" py={4} px={6}>
              <Dialog.Title fontSize="lg" fontWeight="semibold">
                Modifier le nom du test
              </Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body py={6} px={6}>
              <Text fontSize="sm" color="gray.600" mb={3}>
                Nouveau nom pour le test {renameTestTarget ? `"${getTestDisplayName(renameTestTarget.sheetName, renameTestTarget.testId)}"` : ''}.
              </Text>
              <Input
                placeholder="Nom du test"
                value={renameTestValue}
                onChange={(e) => setRenameTestValue(e.target.value)}
                size="md"
                borderRadius="md"
                borderColor="gray.300"
                _focus={{ borderColor: '#422AFB', boxShadow: '0 0 0 1px #422AFB' }}
              />
              <Flex justifyContent="flex-end" gap={3} mt={5}>
                <Button
                  size="md"
                  variant="outline"
                  px={5}
                  py={2.5}
                  fontWeight="medium"
                  borderRadius="xl"
                  borderColor="gray.200"
                  color="gray.700"
                  _hover={{ bg: 'gray.50', borderColor: 'gray.300' }}
                  transition="all 0.2s"
                  onClick={() => { setRenameTestTarget(null); setRenameTestValue(''); }}
                >
                  Annuler
                </Button>
                <Button
                  size="md"
                  px={5}
                  py={2.5}
                  fontWeight="medium"
                  borderRadius="xl"
                  bg="#422AFB"
                  color="white"
                  boxShadow="0 2px 8px rgba(66, 42, 251, 0.25)"
                  _hover={{ bg: '#3522d4', boxShadow: '0 4px 14px rgba(66, 42, 251, 0.35)', transform: 'translateY(-1px)' }}
                  _active={{ transform: 'translateY(0)' }}
                  transition="all 0.2s"
                  onClick={confirmRenameTest}
                >
                  Enregistrer
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
