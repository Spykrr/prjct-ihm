import { useEffect, useState } from 'react';
import { Box, Flex, Button, Text, Dialog, Input } from '@chakra-ui/react';
import { List, LayoutList, MousePointer, Link, MessageSquare, X, Trash2, Plus, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ChampsModal from '../../../components/modals/ChampsModal';
import ChampFieldRow from '../../../components/modals/ChampFieldRow';
import FormInput from '../../../components/modals/FormInput';
import GetInput from '../../../components/modals/GetInput';
import {
  findValueByKeyPattern,
  getInitRowByEcran,
  getInfoByKeyword,
  normalizeRowKeys,
  type ParsedScreen,
  type ParsedWorkbook,
} from '@uptest/core';

type ModalType = 'champs' | 'boutons' | 'get' | 'msgKOPrevu';

/** Clés standard des colonnes champ (${champ01} à ${champ15}) */
const CHAMP_STD_KEYS = Array.from({ length: 15 }, (_, i) => `\${champ${(i + 1).toString().padStart(2, '0')}}`);

/** Retourne les clés champ avec contenu (pour affichage, selon référence getInitObjectByEcran) */
function getChampKeysWithContent(rawRow: Record<string, unknown>): string[] {
  return CHAMP_STD_KEYS.filter((key) => {
    const val = rawRow[key];
    const strVal = val != null ? String(val) : '';
    return strVal.trim() || strVal === '##';
  });
}

/** Clés standard des colonnes bouton (${bouton01} à ${bouton10}) */
const BOUTON_STD_KEYS = Array.from({ length: 10 }, (_, i) => `\${bouton${(i + 1).toString().padStart(2, '0')}}`);

/** Retourne les clés bouton avec contenu (pour affichage) */
function getBoutonKeysWithContent(rawRow: Record<string, unknown>): string[] {
  return BOUTON_STD_KEYS.filter((key) => {
    const val = rawRow[key];
    const strVal = val != null ? String(val) : '';
    return strVal.trim() || strVal === '##';
  });
}

function parseLibelleOption(val: string): { label: string; option: string } {
  if (!val || !val.includes('##')) return { label: val || '', option: '' };
  const [label, option] = val.split('##');
  return { label: label ?? '', option: option ?? '' };
}

function arrayMove<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  const next = arr.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style}>
      <Flex alignItems="center" gap={5}>
        <Button
          variant="ghost"
          size="sm"
          p={2}
          minW="auto"
          h="auto"
          borderRadius="lg"
          color="gray.500"
          _hover={{ bg: 'gray.50', color: 'gray.700' }}
          cursor="grab"
          title="Glisser pour réordonner"
          aria-label="Glisser pour réordonner"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </Button>
        {children}
      </Flex>
    </Box>
  );
}

interface ModalContentProps {
  isOpen: boolean;
  onClose: () => void;
  type: ModalType;
  screen: ParsedScreen;
  allScreens?: ParsedScreen[];
  workbook?: ParsedWorkbook | null;
  currentSheet?: string | null;
  extractMode?: 'init' | 'test';
  isDefinition?: boolean;
  isSoapSheet?: boolean;
  onSave: (screen: ParsedScreen) => void;
}

function getAvailableChampsFromScreen(screen: ParsedScreen): { label: string; option: string; value: string }[] {
  const result: { label: string; option: string; value: string }[] = [];
  for (const key of CHAMP_STD_KEYS) {
    const val = String(screen.rawRow[key] ?? '').trim();
    if (val && val !== '##') {
      const { label, option } = parseLibelleOption(val);
      if (label || option) result.push({ label, option, value: val });
    }
  }
  return result;
}

function getAvailableButtonsFromScreen(screen: ParsedScreen): { label: string; option: string; value: string }[] {
  const result: { label: string; option: string; value: string }[] = [];
  for (const key of BOUTON_STD_KEYS) {
    const val = String(screen.rawRow[key] ?? '').trim();
    if (val && val !== '##') {
      const { label, option } = parseLibelleOption(val);
      if (label || option) result.push({ label, option, value: val });
    }
  }
  return result;
}

function getAvailableButtonsFromRawRow(rawRow: Record<string, unknown>): { label: string; option: string; value: string }[] {
  const result: { label: string; option: string; value: string }[] = [];
  for (const key of BOUTON_STD_KEYS) {
    const val = String(rawRow[key] ?? '').trim();
    if (val && val !== '##') {
      const { label, option } = parseLibelleOption(val);
      if (label || option) result.push({ label, option, value: val });
    }
  }
  return result;
}

/** Construit option -> libellé à partir de tous les champs des écrans */
function buildOptionToLibelle(screens: ParsedScreen[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const s of screens) {
    const keys = Object.keys(s.rawRow).filter((k) => /champ\d+/i.test(k));
    for (const key of keys) {
      const val = String(s.rawRow[key] ?? '').trim();
      if (val && val.includes('##')) {
        const [label, option] = val.split('##');
        const opt = (option ?? '').trim();
        if (opt && !map[opt]) map[opt] = (label ?? '').trim();
      }
    }
  }
  return map;
}

function normalizeScreenTitleKey(input: unknown): string {
  return String(input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function ModalContent({
  isOpen,
  onClose,
  type,
  screen,
  allScreens = [],
  workbook = null,
  currentSheet = null,
  extractMode = 'test',
  isDefinition: _isDefinition = false,
  isSoapSheet: _isSoapSheet = false,
  onSave,
}: ModalContentProps) {
  const [editedRow, setEditedRow] = useState<Record<string, unknown>>({});
  const [editedFieldNotes, setEditedFieldNotes] = useState<Record<string, string>>({});
  const [showBoutonChoices, setShowBoutonChoices] = useState(false);
  const [showChampChoices, setShowChampChoices] = useState(false);
  const [prevScreenId, setPrevScreenId] = useState<string | null>(null);
  const [definitionChampVisibleCount, setDefinitionChampVisibleCount] = useState<number>(0);
  const [definitionBoutonVisibleCount, setDefinitionBoutonVisibleCount] = useState<number>(0);
  const [noteDialog, setNoteDialog] = useState<{
    open: boolean;
    fieldKey: string;
    label: string;
    value: string;
  }>({ open: false, fieldKey: '', label: '', value: '' });
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  if (screen && isOpen && screen.id !== prevScreenId) {
    setPrevScreenId(screen.id);
    setEditedRow({ ...screen.rawRow });
    setEditedFieldNotes({ ...(screen.fieldNotes ?? {}) });
  }

  const updateKey = (key: string, value: string) => {
    setEditedRow((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave({ ...screen, rawRow: editedRow, fieldNotes: editedFieldNotes });
    onClose();
  };

  const openFieldNoteDialog = (fieldKey: string, label: string) => {
    const current = getFieldNoteResolved(fieldKey);
    setNoteDialog({
      open: true,
      fieldKey,
      label,
      value: current,
    });
  };

  const saveFieldNoteDialog = () => {
    if (!noteDialog.fieldKey) {
      setNoteDialog((prev) => ({ ...prev, open: false }));
      return;
    }
    const trimmed = (noteDialog.value ?? '').trim();
    setEditedFieldNotes((prev) => {
      const out = { ...prev };
      if (!trimmed) delete out[noteDialog.fieldKey];
      else out[noteDialog.fieldKey] = trimmed;
      return out;
    });
    setNoteDialog((prev) => ({ ...prev, open: false }));
  };

  const fieldNoteDialogNode = (
    <Dialog.Root
      open={noteDialog.open}
      onOpenChange={(e) => !e.open && setNoteDialog((prev) => ({ ...prev, open: false }))}
    >
      <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <Dialog.Positioner>
        <Dialog.Content maxW="560px" borderRadius="xl" boxShadow="xl" bg="white" borderWidth="1px" borderColor="gray.200">
          <Dialog.Header borderBottomWidth="1px" borderColor="gray.100" py={4} px={6}>
            <Dialog.Title fontSize="lg" fontWeight="semibold">
              Commentaire du champ {noteDialog.label || ''}
            </Dialog.Title>
            <Dialog.CloseTrigger />
          </Dialog.Header>
          <Dialog.Body py={5} px={6}>
            <textarea
              value={noteDialog.value}
              onChange={(e) =>
                setNoteDialog((prev) => ({ ...prev, value: e.target.value }))
              }
              placeholder="Saisir une note..."
              style={{
                width: '100%',
                minHeight: '120px',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
            <Flex justifyContent="flex-end" gap={3} mt={5}>
              <Button
                variant="outline"
                borderColor="#3B82F6"
                color="#3B82F6"
                onClick={() => setNoteDialog((prev) => ({ ...prev, open: false }))}
              >
                Annuler
              </Button>
              <Button bg="#3B82F6" color="white" _hover={{ bg: '#2563EB' }} onClick={saveFieldNoteDialog}>
                Enregistrer
              </Button>
            </Flex>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );

  // Mode définition (Champs / Boutons): afficher lignes utiles et permettre d'en "ajouter" via +
  useEffect(() => {
    if (!isOpen) return;
    const isDefinitionMode = _isDefinition || extractMode === 'init';
    if (!isDefinitionMode) return;

    if (type === 'champs') {
      const filled = CHAMP_STD_KEYS.reduce((acc, key) => {
        const v = String(editedRow[key] ?? '').trim();
        if (!v) return acc;
        const { label, option } = parseLibelleOption(v);
        return acc + ((label.trim() || option.trim()) ? 1 : 0);
      }, 0);
      setDefinitionChampVisibleCount(Math.min(CHAMP_STD_KEYS.length, Math.max(1, filled + 1)));
    }
    if (type === 'boutons') {
      const filled = BOUTON_STD_KEYS.reduce((acc, key) => {
        const v = String(editedRow[key] ?? '').trim();
        if (!v) return acc;
        const { label, option } = parseLibelleOption(v);
        return acc + ((label.trim() || option.trim()) ? 1 : 0);
      }, 0);
      setDefinitionBoutonVisibleCount(Math.min(BOUTON_STD_KEYS.length, Math.max(1, filled + 1)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type, _isDefinition, extractMode, screen.id]);

  const titles: Record<ModalType, string> = {
    champs: `Champs - ${screen.title}`,
    boutons: `Boutons - ${screen.title}`,
    get: `GET - ${screen.title}`,
    msgKOPrevu: `msgKOPrevu - ${screen.title}`,
  };

  const titleIcons: Record<ModalType, React.ReactNode> = {
    champs: <Box color="#3B82F6" p={2} borderRadius="lg" bg="blue.50"><LayoutList size={22} strokeWidth={2} /></Box>,
    boutons: <Box color="#3B82F6" p={2} borderRadius="lg" bg="blue.50"><MousePointer size={22} strokeWidth={2} /></Box>,
    get: <Box color="#3B82F6" p={2} borderRadius="lg" bg="blue.50"><Link size={22} strokeWidth={2} /></Box>,
    msgKOPrevu: <Box color="#3B82F6" p={2} borderRadius="lg" bg="blue.50"><MessageSquare size={22} strokeWidth={2} /></Box>,
  };

  const footerButtons = (
    <Flex justifyContent="flex-end" mt={6} pt={4} borderTopWidth="1px" borderColor="gray.100" gap={3}>
      <Button
        size="md"
        variant="outline"
        px={5}
        py={2.5}
        fontWeight="medium"
        borderRadius="xl"
        borderColor="#3B82F6"
        color="#3B82F6"
        _hover={{ bg: 'rgba(59, 130, 246, 0.08)', borderColor: '#2563EB' }}
        transition="all 0.2s"
        onClick={onClose}
      >
        Annuler
      </Button>
      <Button
        size="md"
        px={5}
        py={2.5}
        fontWeight="medium"
        borderRadius="xl"
        bg="#3B82F6"
        color="white"
        boxShadow="0 2px 8px rgba(59, 130, 246, 0.25)"
        _hover={{ bg: '#2563EB', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)', transform: 'translateY(-1px)' }}
        _active={{ transform: 'translateY(0)' }}
        transition="all 0.2s"
        onClick={handleSave}
      >
        Enregistrer
      </Button>
    </Flex>
  );

  const initFieldNotesForScreen =
    workbook && currentSheet
      ? (workbook.initFieldNotesBySheet?.[currentSheet]?.[normalizeScreenTitleKey(screen.title)] ?? {})
      : {};
  const headerFieldNotesForSheet =
    workbook && currentSheet
      ? (workbook.headerFieldNotesBySheet?.[currentSheet] ?? {})
      : {};
  // En mode Definitions, on veut afficher les notes (italique) + proposer l'édition via bouton.
  const showFieldNotes = _isDefinition || extractMode !== 'init';

  const getFieldNoteResolved = (fieldKey: string): string => {
    const edited = (editedFieldNotes[fieldKey] ?? '').trim();
    if (edited) return edited;
    const val =
      (screen.fieldNotes ?? {})[fieldKey] ??
      initFieldNotesForScreen[fieldKey] ??
      headerFieldNotesForSheet[fieldKey] ??
      '';
    return typeof val === 'string' ? val.trim() : '';
  };

  const getFieldNote = (fieldKey: string): string => {
    if (!showFieldNotes) return '';
    return getFieldNoteResolved(fieldKey);
  };

  if (type === 'champs') {
    const isTestMode = extractMode === 'test';
    const isDefinitionMode = _isDefinition || extractMode === 'init';
    const showTooltipsInTests = isTestMode && !_isDefinition;
    const extractKeywordFromString = (s: unknown): string => {
      const str = s == null ? '' : String(s).trim();
      if (!str) return '';
      // Prefer "...##CODE" suffix; fallback to whole string
      const parts = str.split('##');
      const candidate = (parts.length > 1 ? parts[parts.length - 1] : str).trim();
      if (/^[1-9]\d?[IRCS][PA][A-Z]$/i.test(candidate)) return candidate.toUpperCase();
      if (/^[1-9]\d?[NF]$/i.test(candidate)) return candidate.toUpperCase();
      return '';
    };
    const rawInitRow =
      isTestMode &&
      workbook &&
      currentSheet &&
      getInitRowByEcran(
        (workbook.sheets[currentSheet] ?? []) as Record<string, unknown>[],
        screen.title,
        findValueByKeyPattern
      );
    const initRow = rawInitRow ? normalizeRowKeys(rawInitRow) : undefined;

    // Mode définition : grille Champ i / Option i (ajout via +)
    if (isDefinitionMode && !initRow) {
      const rows = CHAMP_STD_KEYS.map((key, idx) => {
        const val = String(editedRow[key] ?? '');
        const { label, option } = parseLibelleOption(val);
        return { key, idx: idx + 1, label: label ?? '', option: option ?? '' };
      });
      const visibleRows = rows.slice(0, Math.max(1, Math.min(definitionChampVisibleCount || 1, rows.length)));
      const visibleCount = Math.max(1, Math.min(definitionChampVisibleCount || 1, rows.length));

      const deleteRowOnly = (rowIndex0: number) => {
        const key = CHAMP_STD_KEYS[rowIndex0];
        if (!key) return;
        setEditedRow((prev) => ({ ...prev, [key]: '' }));

        // Si on supprime la dernière ligne visible, on peut réduire le nombre de lignes affichées
        // (sans décaler les autres champs).
        setDefinitionChampVisibleCount((c) => {
          const current = Math.max(1, Math.min(c || visibleCount, rows.length));
          return rowIndex0 === current - 1 ? Math.max(1, current - 1) : current;
        });
      };

      return (
        <ChampsModal isOpen={isOpen} onClose={onClose} title={titles.champs} titleIcon={titleIcons.champs}>
          <Box>
            <Box
              display="flex"
              flexDirection="column"
              gap={3}
              p={4}
              borderWidth="1px"
              borderColor="gray.100"
              bg="white"
              borderRadius="xl"
            >
              {visibleRows.map((r) => (
                  <Flex key={r.key} alignItems="center" gap={5}>
                    <Flex flex="1" direction="column" gap={1} minW={0}>
                      <Flex alignItems="center" gap={3} minW={0}>
                        <Text fontSize="sm" color="gray.700" w="78px" flexShrink={0}>
                          Champ {r.idx}:
                        </Text>
                        <Input
                          value={r.label}
                          onChange={(e) => {
                            const nextLabel = e.target.value;
                            const next = nextLabel || r.option ? `${nextLabel}##${r.option}` : '';
                            updateKey(r.key, next);
                          }}
                          placeholder="(Non utilisé)"
                          size="sm"
                          borderRadius="full"
                          borderColor="gray.200"
                          bg="white"
                          _focus={{
                            borderColor: '#3B82F6',
                            boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.12)',
                          }}
                          _placeholder={{ color: 'gray.400' }}
                        />
                      </Flex>
                      {/* En mode Definitions: les notes ne s'affichent pas en inline (uniquement via bouton). */}
                    </Flex>

                    <Flex flex="1" alignItems="center" gap={3} minW={0}>
                      <Text fontSize="sm" color="gray.700" w="78px" flexShrink={0}>
                        Option {r.idx}:
                      </Text>
                      <Input
                        value={r.option}
                        onChange={(e) => {
                          const nextOption = e.target.value;
                          const next = r.label || nextOption ? `${r.label}##${nextOption}` : '';
                          updateKey(r.key, next);
                        }}
                        placeholder="(NON UTILISÉ)"
                        size="sm"
                        maxLength={4}
                        borderRadius="full"
                        borderColor="gray.200"
                        bg="white"
                        _focus={{
                          borderColor: '#3B82F6',
                          boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.12)',
                        }}
                        _placeholder={{ color: 'gray.400' }}
                      />
                    </Flex>

                    {/* Bouton commentaire uniquement en mode Definitions */}
                    <Button
                      variant="ghost"
                      size="sm"
                      p={2}
                      minW="auto"
                      h="auto"
                      borderRadius="lg"
                      color={getFieldNoteResolved(r.key) ? 'blue.600' : 'gray.500'}
                      _hover={{ bg: 'blue.50', color: 'blue.700' }}
                      onClick={() => openFieldNoteDialog(r.key, String(r.idx))}
                      title="Ajouter / modifier la note du champ"
                      aria-label="Ajouter / modifier la note du champ"
                    >
                      <MessageSquare size={16} />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      p={2}
                      minW="auto"
                      h="auto"
                      borderRadius="lg"
                      color="red.500"
                      _hover={{ bg: 'red.50', color: 'red.600' }}
                      onClick={() => deleteRowOnly(r.idx - 1)}
                      title="Supprimer ce champ"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </Flex>
              ))}
            </Box>

            <Flex justifyContent="flex-end" mt={5} mb={3}>
              <Button
                size="sm"
                variant="outline"
                p={2}
                minW="auto"
                h="auto"
                borderRadius="lg"
                borderColor="#3B82F6"
                color="#3B82F6"
                _hover={{ bg: 'rgba(59, 130, 246, 0.08)', borderColor: '#2563EB' }}
                onClick={() => setDefinitionChampVisibleCount((c) => Math.min(rows.length, (c || 1) + 1))}
                disabled={(definitionChampVisibleCount || 1) >= rows.length}
                title="Ajouter un champ"
                aria-label="Ajouter un champ"
              >
                <Plus size={16} />
              </Button>
            </Flex>

            {footerButtons}
            {fieldNoteDialogNode}
          </Box>
        </ChampsModal>
      );
    }

    const champKeys = initRow
      ? getChampKeysWithContent(initRow)
      : getChampKeysWithContent(editedRow);
    const items =
      champKeys.length > 0
        ? champKeys.map((key) => {
            if (isTestMode && initRow) {
              const initVal = String(initRow[key] ?? '');
              const { label: initLabel, option: initOption } = parseLibelleOption(initVal);
              const testVal = String(editedRow[key] ?? '');
              return {
                key,
                label: initLabel,
                option: initOption,
                initVal,
                value: testVal,
                isTestMode: true,
              };
            }
            const val = String(editedRow[key] ?? '');
            const { label, option } = parseLibelleOption(val);
            return { key, label, option, value: option, isTestMode: false };
          })
        : [{ key: CHAMP_STD_KEYS[0], label: '', value: '', option: '', isTestMode: false }];

    const availableChamps = initRow
      ? (() => {
          const result: { label: string; option: string; value: string }[] = [];
          for (const key of CHAMP_STD_KEYS) {
            const val = String(initRow[key] ?? '').trim();
            if (val && val !== '##') {
              const { label, option } = parseLibelleOption(val);
              if (label || option) result.push({ label, option, value: val });
            }
          }
          return result;
        })()
      : getAvailableChampsFromScreen(screen);
    const optionToLibelle = buildOptionToLibelle(allScreens);

    return (
      <ChampsModal isOpen={isOpen} onClose={onClose} title={titles.champs} titleIcon={titleIcons.champs}>
        <Box>
          {items.map((item) => (
            <ChampFieldRow
              key={item.key}
              label={item.label}
              note={_isDefinition ? undefined : getFieldNote(item.key)}
              helpText={(() => {
                const anyItem = item as { option?: unknown; initVal?: unknown; value?: unknown; label?: string };
                const keyword =
                  extractKeywordFromString(anyItem.option) ||
                  extractKeywordFromString(anyItem.initVal) ||
                  extractKeywordFromString(anyItem.value);
                return keyword ? getInfoByKeyword(keyword, item.label) : '';
              })()}
              showHelpIcon={showTooltipsInTests}
              onEditNote={
                _isDefinition
                  ? () => openFieldNoteDialog(item.key, item.label || item.key)
                  : undefined
              }
              value={item.isTestMode ? item.value : (item.option as string)}
              displayValue={
                item.isTestMode
                  ? item.value
                  : optionToLibelle[item.option as string] || (item.option as string)
              }
              valuePlaceholder="(Non utilisé)"
              valueMaxLength={item.isTestMode ? undefined : 4}
              isLabelEditable={!item.isTestMode}
              onLabelChange={
                item.isTestMode
                  ? undefined
                  : (v) => updateKey(item.key, (item.option as string) ? `${v}##${item.option}` : v)
              }
              onValueChange={(v) =>
                item.isTestMode
                  ? updateKey(item.key, v)
                  : updateKey(item.key, item.label ? `${item.label}##${v}` : `##${v}`)
              }
            />
          ))}
          {!initRow && (
            <Button
              size="sm"
              variant="outline"
              gap={2}
              onClick={() => setShowChampChoices(true)}
              borderColor="gray.300"
              _hover={{ bg: 'gray.50', borderColor: '#3B82F6' }}
            >
              <List size={14} /> Choisir un champ de l&apos;écran
            </Button>
          )}

          <Dialog.Root open={showChampChoices} onOpenChange={(e) => !e.open && setShowChampChoices(false)}>
            <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
            <Dialog.Positioner>
              <Dialog.Content
                maxW="400px"
                borderRadius="xl"
                boxShadow="xl"
                bg="white"
                borderWidth="1px"
                borderColor="gray.200"
              >
                <Dialog.Header
                  py={3}
                  px={4}
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                  bg="gray.50"
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Dialog.Title fontSize="md" fontWeight="semibold" color="gray.900">
                    Champs disponibles dans l&apos;écran
                  </Dialog.Title>
                  <Dialog.CloseTrigger asChild>
                    <Box as="button" p={1.5} borderRadius="md" color="gray.500" _hover={{ bg: 'gray.200' }} aria-label="Fermer">
                      <X size={18} />
                    </Box>
                  </Dialog.CloseTrigger>
                </Dialog.Header>
                <Dialog.Body maxH="300px" overflowY="auto" py={4} px={4}>
                  {availableChamps.length === 0 ? (
                    <Text color="gray.500" fontSize="sm">
                      Aucun champ défini pour cet écran
                    </Text>
                  ) : (
                    <Box display="flex" flexDirection="column" gap={2}>
                      {availableChamps.map((champ) => (
                        <Button
                          key={champ.value}
                          size="sm"
                          variant="outline"
                          justifyContent="flex-start"
                          fontWeight="normal"
                          borderRadius="md"
                          borderColor="gray.200"
                          _hover={{ bg: 'blue.50', borderColor: '#3B82F6' }}
                          onClick={() => {
                            const emptyKey = CHAMP_STD_KEYS.find((k) => !editedRow[k] || !String(editedRow[k]).trim());
                            if (emptyKey) {
                              updateKey(emptyKey, champ.value);
                              setShowChampChoices(false);
                            }
                          }}
                        >
                          {champ.label} ({champ.option})
                        </Button>
                      ))}
                    </Box>
                  )}
                </Dialog.Body>
              </Dialog.Content>
            </Dialog.Positioner>
          </Dialog.Root>

          {footerButtons}
          {fieldNoteDialogNode}
        </Box>
      </ChampsModal>
    );
  }

  if (type === 'boutons') {
    const isDefinitionMode = _isDefinition || extractMode === 'init';
    const showTooltipsInTests = extractMode === 'test' && !_isDefinition;

    // Mode définition : même interface que Champs (Bouton N / Option N, +, corbeille)
    if (isDefinitionMode) {
      const rows = BOUTON_STD_KEYS.map((key, idx) => {
        const val = String(editedRow[key] ?? '');
        const { label, option } = parseLibelleOption(val);
        return { key, idx: idx + 1, label: label ?? '', option: option ?? '' };
      });
      const visibleCount = Math.max(1, Math.min(definitionBoutonVisibleCount || 1, rows.length));
      const visibleRows = rows.slice(0, visibleCount);

      const deleteRowAndShiftUp = (rowIndex0: number) => {
        setEditedRow((prev) => {
          const next = { ...prev };
          for (let i = rowIndex0; i < BOUTON_STD_KEYS.length - 1; i++) {
            next[BOUTON_STD_KEYS[i]] = next[BOUTON_STD_KEYS[i + 1]] ?? '';
          }
          next[BOUTON_STD_KEYS[BOUTON_STD_KEYS.length - 1]] = '';
          return next;
        });
        setDefinitionBoutonVisibleCount((c) => Math.max(1, (c || visibleCount) - 1));
      };

      return (
        <ChampsModal isOpen={isOpen} onClose={onClose} title={titles.boutons} titleIcon={titleIcons.boutons}>
          <Box>
            <Box
              display="flex"
              flexDirection="column"
              gap={3}
              p={4}
              borderWidth="1px"
              borderColor="gray.100"
              bg="white"
              borderRadius="xl"
            >
              {visibleRows.map((r) => (
                <Flex key={r.key} alignItems="center" gap={5}>
                  <Flex flex="1" alignItems="center" gap={3} minW={0}>
                    <Text fontSize="sm" color="gray.700" w="78px" flexShrink={0}>
                      Bouton {r.idx}:
                    </Text>
                    <Input
                      value={r.label}
                      onChange={(e) => {
                        const nextLabel = e.target.value;
                        const next = nextLabel || r.option ? `${nextLabel}##${r.option}` : '';
                        updateKey(r.key, next);
                      }}
                      placeholder="(Non utilisé)"
                      size="sm"
                      borderRadius="full"
                      borderColor="gray.200"
                      bg="white"
                      _focus={{
                        borderColor: '#3B82F6',
                        boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.12)',
                      }}
                      _placeholder={{ color: 'gray.400' }}
                    />
                  </Flex>
                  <Flex flex="1" alignItems="center" gap={3} minW={0}>
                    <Text fontSize="sm" color="gray.700" w="78px" flexShrink={0}>
                      Option {r.idx}:
                    </Text>
                    <Input
                      value={r.option}
                      onChange={(e) => {
                        const nextOption = e.target.value;
                        const next = r.label || nextOption ? `${r.label}##${nextOption}` : '';
                        updateKey(r.key, next);
                      }}
                      placeholder="(NON UTILISÉ)"
                      size="sm"
                      maxLength={4}
                      borderRadius="full"
                      borderColor="gray.200"
                      bg="white"
                      _focus={{
                        borderColor: '#3B82F6',
                        boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.12)',
                      }}
                      _placeholder={{ color: 'gray.400' }}
                    />
                  </Flex>
                  <Flex alignItems="center" gap={2}>
                    <Button
                      variant="ghost"
                      size="sm"
                      p={2}
                      minW="auto"
                      h="auto"
                      borderRadius="lg"
                      color="red.500"
                      _hover={{ bg: 'red.50', color: 'red.600' }}
                      onClick={() => deleteRowAndShiftUp(r.idx - 1)}
                      title="Supprimer ce bouton"
                      aria-label="Supprimer ce bouton"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </Flex>
                </Flex>
              ))}
            </Box>

            <Flex justifyContent="flex-end" mt={5} mb={3}>
              <Button
                size="sm"
                variant="outline"
                p={2}
                minW="auto"
                h="auto"
                borderRadius="lg"
                borderColor="#3B82F6"
                color="#3B82F6"
                _hover={{ bg: 'rgba(59, 130, 246, 0.08)', borderColor: '#2563EB' }}
                onClick={() => setDefinitionBoutonVisibleCount((c) => Math.min(rows.length, (c || 1) + 1))}
                disabled={(definitionBoutonVisibleCount || 1) >= rows.length}
                title="Ajouter un bouton"
                aria-label="Ajouter un bouton"
              >
                <Plus size={16} />
              </Button>
            </Flex>

            {footerButtons}
          </Box>
        </ChampsModal>
      );
    }

    const boutonKeys = getBoutonKeysWithContent(editedRow);
    const items = boutonKeys.length > 0
      ? boutonKeys.map((key) => {
          const val = String(editedRow[key] ?? '');
          const { label, option } = parseLibelleOption(val);
          return { key, label, option };
        })
      : [{ key: BOUTON_STD_KEYS[0], label: '', option: '' }];

    const availableButtons = getAvailableButtonsFromScreen(screen);

    // En mode test, la ligne TEST peut ne pas contenir toutes les définitions de boutons.
    // Pour lister "Boutons disponibles dans l'écran", on se base sur la ligne INIT du même écran.
    const isTestMode = extractMode === 'test';
    const rawInitRow =
      isTestMode &&
      workbook &&
      currentSheet
        ? getInitRowByEcran(
            (workbook.sheets[currentSheet] ?? []) as Record<string, unknown>[],
            screen.title,
            findValueByKeyPattern
          )
        : undefined;
    const initRow = rawInitRow ? normalizeRowKeys(rawInitRow) : undefined;

    const availableButtonsResolved = initRow
      ? getAvailableButtonsFromRawRow(initRow)
      : availableButtons;

    const displayedTestBoutonKeys = items.map((it) => it.key);
    const handleTestBoutonDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId === overId) return;

      const fromIndex = displayedTestBoutonKeys.indexOf(activeId);
      const toIndex = displayedTestBoutonKeys.indexOf(overId);
      if (fromIndex < 0 || toIndex < 0) return;

      setEditedRow((prev) => {
        const next = { ...prev };
        const values = displayedTestBoutonKeys.map((k) => String(prev[k] ?? ''));
        const moved = arrayMove(values, fromIndex, toIndex);
        displayedTestBoutonKeys.forEach((k, i) => {
          next[k] = moved[i];
        });
        return next;
      });
    };

    return (
      <ChampsModal isOpen={isOpen} onClose={onClose} title={titles.boutons} titleIcon={titleIcons.boutons}>
        <Box>
          <Box p={4} borderRadius="xl" bg="gray.50" borderWidth="1px" borderColor="gray.100" mb={4}>
          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleTestBoutonDragEnd}>
            <SortableContext items={displayedTestBoutonKeys} strategy={verticalListSortingStrategy}>
              <Box display="flex" flexDirection="column" gap={3}>
                {items.map((item) => (
                  <SortableRow key={item.key} id={item.key}>
                    <Box flex="1">
                      <FormInput
                        label={item.label}
                        option={item.option}
                        onLabelChange={(v) => updateKey(item.key, item.option ? `${v}##${item.option}` : v)}
                        onOptionChange={(v) => updateKey(item.key, item.label ? `${item.label}##${v}` : `##${v}`)}
                        onDelete={() => updateKey(item.key, '')}
                        showOption={false}
                        showHelpIcon={showTooltipsInTests}
                        mb={0}
                      />
                    </Box>
                  </SortableRow>
                ))}
              </Box>
            </SortableContext>
          </DndContext>
          <Button
            size="sm"
            variant="outline"
            gap={2}
            mt={3}
            py={2}
            borderRadius="lg"
            borderColor="gray.200"
            _hover={{ bg: 'gray.50', borderColor: '#3B82F6' }}
            onClick={() => setShowBoutonChoices(true)}
          >
            Choisir un bouton de l&apos;écran
          </Button>
          </Box>

          {showBoutonChoices && (
            <Box
              mt={4}
              p={5}
              borderRadius="2xl"
              boxShadow="2xl"
              bg="white"
              borderWidth="1px"
              borderColor="gray.100"
            >
              <Flex alignItems="center" justifyContent="space-between" mb={4}>
                <Text fontSize="md" fontWeight="semibold" color="gray.900">
                  Boutons disponibles dans l&apos;écran
                </Text>
                <Button
                  size="sm"
                  variant="ghost"
                  p={2}
                  borderRadius="lg"
                  color="gray.500"
                  _hover={{ bg: 'gray.100' }}
                  onClick={() => setShowBoutonChoices(false)}
                  aria-label="Fermer"
                >
                  <X size={18} strokeWidth={2} />
                </Button>
              </Flex>

              <Box maxH="320px" overflowY="auto">
                {availableButtonsResolved.length === 0 ? (
                  <Text color="gray.500" fontSize="sm">
                    Aucun bouton défini pour cet écran
                  </Text>
                ) : (
                  <Box display="flex" flexDirection="column" gap={2}>
                    {availableButtonsResolved.map((btn) => (
                      <Button
                        key={btn.value}
                        size="sm"
                        variant="outline"
                        justifyContent="flex-start"
                        fontWeight="normal"
                        py={2.5}
                        borderRadius="lg"
                        borderColor="gray.200"
                        _hover={{ bg: 'blue.50', borderColor: '#3B82F6' }}
                        onClick={() => {
                          const emptyKey = BOUTON_STD_KEYS.find((k) => !editedRow[k] || !String(editedRow[k]).trim());
                          if (emptyKey) {
                            updateKey(emptyKey, btn.value);
                            setShowBoutonChoices(false);
                          }
                        }}
                      >
                        {btn.label} ({btn.option})
                      </Button>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {footerButtons}
        </Box>
      </ChampsModal>
    );
  }

  if (type === 'get') {
    const getKey = Object.keys(editedRow).find((k) => k.toLowerCase().includes('get') && !k.toLowerCase().includes('msg')) ?? '${get}';
    const value = String(editedRow[getKey] ?? '');

    return (
      <ChampsModal isOpen={isOpen} onClose={onClose} title={titles.get} titleIcon={titleIcons.get}>
        <Box>
            <Box
              p={5}
              borderRadius="2xl"
              bg="white"
              borderWidth="1px"
              borderColor="gray.100"
              boxShadow="0 1px 10px rgba(0,0,0,0.03)"
              mb={4}
            >
            <GetInput
              nbrOfField={3}
              label="GET"
              value={value}
              onChange={(v) => updateKey(getKey, v)}
            />
          </Box>
          {footerButtons}
        </Box>
      </ChampsModal>
    );
  }

  if (type === 'msgKOPrevu') {
    const msgKey = Object.keys(editedRow).find((k) => /msgKOPrevu/i.test(k) || k.includes('msgKO')) ?? '${msgKOPrevu}';
    const value = String(editedRow[msgKey] ?? '');

    return (
      <ChampsModal isOpen={isOpen} onClose={onClose} title={titles.msgKOPrevu} titleIcon={titleIcons.msgKOPrevu}>
        <Box>
            <Box
              p={5}
              borderRadius="2xl"
              bg="white"
              borderWidth="1px"
              borderColor="gray.100"
              boxShadow="0 1px 10px rgba(0,0,0,0.03)"
              mb={4}
            >
            <GetInput
              nbrOfField={1}
              label="Msg KO prévu"
              value={value}
              onChange={(v) => updateKey(msgKey, v)}
            />
          </Box>
          {footerButtons}
        </Box>
      </ChampsModal>
    );
  }

  return null;
}
