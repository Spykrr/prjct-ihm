import { useEffect, useState } from 'react';
import { Box, Flex, Button, Text, Dialog, Input, Textarea } from '@chakra-ui/react';
import { List, LayoutList, MousePointer, Link, MessageSquare, X, Trash2, Plus, MousePointerClick } from 'lucide-react';
import ChampsModal from '../../../components/modals/ChampsModal';
import ChampFieldRow from '../../../components/modals/ChampFieldRow';
import GetInput from '../../../components/modals/GetInput';
import InfoTooltipIcon from '../../../components/modals/InfoTooltipIcon';
import {
  findValueByKeyPattern,
  getInitRowByEcran,
  normalizeRowKeys,
  type ParsedScreen,
  type ParsedWorkbook,
  getInfoByKeyword,
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

function explainLegacyOptionCode(raw: string): string {
  const k = (raw ?? '').trim().toUpperCase();
  if (!k) return '';
  // Codes observés : 1FE1, 1FS1, ...
  if (k.length === 4 && /^[0-9]{1,2}F[A-Z][0-9]$/.test(k)) {
    const action = k[2];
    if (action === 'E') return `Insertion dans la zone de texte puis appuie sur la touche clavier « Entrée »`;
    if (action === 'S') return `Sélection de la valeur saisie dans la liste (select)`;
    if (action === 'R') return `Sélection du bouton radio`;
    if (action === 'C') return `Sélection de la case à cocher (checkbox)`;
    if (action === 'D') return `Double-clic`;
    if (action === 'K') return `Clic`;
  }
  return '';
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
  const [editedComments, setEditedComments] = useState<Record<string, string>>({});
  const [showBoutonChoices, setShowBoutonChoices] = useState(false);
  const [showChampChoices, setShowChampChoices] = useState(false);
  const [prevScreenId, setPrevScreenId] = useState<string | null>(null);
  const [definitionChampVisibleCount, setDefinitionChampVisibleCount] = useState<number>(0);
  const [definitionBoutonVisibleCount, setDefinitionBoutonVisibleCount] = useState<number>(0);
  const [commentEditorKey, setCommentEditorKey] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState<string>('');

  if (screen && isOpen && screen.id !== prevScreenId) {
    setPrevScreenId(screen.id);
    setEditedRow({ ...screen.rawRow });
    setEditedComments({ ...(screen.comments ?? {}) });
  }

  const updateKey = (key: string, value: string) => {
    setEditedRow((prev) => ({ ...prev, [key]: value }));
  };

  const openCommentEditor = (key: string) => {
    setCommentEditorKey(key);
    setCommentDraft(String(editedComments[key] ?? '').trim());
  };

  const saveComment = () => {
    if (!commentEditorKey) return;
    const next = commentDraft ?? '';
    setEditedComments((prev) => {
      const out = { ...prev };
      if (next.trim()) out[commentEditorKey] = next;
      else delete out[commentEditorKey];
      return out;
    });
    setCommentEditorKey(null);
    setCommentDraft('');
  };

  const handleSave = () => {
    onSave({ ...screen, rawRow: editedRow, comments: editedComments });
    onClose();
  };

  const computeOptionHelpMessage = (rawOption: string, labelText: string) => {
    const raw = (rawOption ?? '').trim();
    if (!raw) return '';

    const base = getInfoByKeyword(raw) || explainLegacyOptionCode(raw);
    if (!base) {
      const k = raw.toUpperCase();
      const looksLikeLegacy = k.length === 4 && /^[0-9]{1,2}F[A-Z][0-9]$/.test(k);
      const looksLikeChamp = k.length === 4 && /^[1-9]\d?[IRCS][PA][A-Z]$/.test(k);
      const looksLikeButton = k.length === 2 && /^[1-9]\d?[NF]$/.test(k);
      if (!looksLikeLegacy && !looksLikeChamp && !looksLikeButton) return '';
      return `Code option : ${raw}`;
    }

    const label = (labelText ?? '').trim();
    if (base.startsWith('Insertion')) {
      return `Insertion dans la zone de texte après le libellé "${label || '—'}" puis appuie sur la touche clavier « Entrée »`;
    }
    if (base.startsWith('Sélection de la valeur')) {
      return `Sélection de la valeur saisie dans la liste (select) après le libellé "${label || '—'}"`;
    }
    return base;
  };

  // Mode définition (Champs): afficher seulement les lignes utiles, et permettre d'en "ajouter" via un bouton +
  useEffect(() => {
    if (!isOpen) return;
    const isDefinitionMode = _isDefinition || extractMode === 'init';
    if (type !== 'champs' || !isDefinitionMode) return;

    const filled = CHAMP_STD_KEYS.reduce((acc, key) => {
      const v = String(editedRow[key] ?? '').trim();
      if (!v) return acc;
      const { label, option } = parseLibelleOption(v);
      return acc + ((label.trim() || option.trim()) ? 1 : 0);
    }, 0);

    // Au moins 1 ligne visible, et une ligne de plus que le contenu existant
    const next = Math.min(CHAMP_STD_KEYS.length, Math.max(1, filled + 1));
    setDefinitionChampVisibleCount(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type, _isDefinition, extractMode, screen.id]);

  useEffect(() => {
    if (!isOpen) return;
    const isDefinitionMode = _isDefinition || extractMode === 'init';
    if (type !== 'boutons' || !isDefinitionMode) return;

    const filled = BOUTON_STD_KEYS.reduce((acc, key) => {
      const v = String(editedRow[key] ?? '').trim();
      if (!v) return acc;
      const { label, option } = parseLibelleOption(v);
      return acc + ((label.trim() || option.trim()) ? 1 : 0);
    }, 0);

    const next = Math.min(BOUTON_STD_KEYS.length, Math.max(1, filled + 1));
    setDefinitionBoutonVisibleCount(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type, _isDefinition, extractMode, screen.id]);

  const titles: Record<ModalType, string> = {
    champs: `Champs - ${screen.title}`,
    boutons: `Boutons - ${screen.title}`,
    get: `GET - ${screen.title}`,
    msgKOPrevu: `msgKOPrevu - ${screen.title}`,
  };

  const titleIcons: Record<ModalType, React.ReactNode> = {
    champs: <Box color="#422AFB" p={2} borderRadius="lg" bg="blue.50"><LayoutList size={22} strokeWidth={2} /></Box>,
    boutons: <Box color="#422AFB" p={2} borderRadius="lg" bg="blue.50"><MousePointer size={22} strokeWidth={2} /></Box>,
    get: <Box color="#422AFB" p={2} borderRadius="lg" bg="blue.50"><Link size={22} strokeWidth={2} /></Box>,
    msgKOPrevu: <Box color="#422AFB" p={2} borderRadius="lg" bg="blue.50"><MessageSquare size={22} strokeWidth={2} /></Box>,
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
        borderColor="gray.200"
        color="gray.700"
        _hover={{ bg: 'gray.50', borderColor: 'gray.300' }}
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
        bg="#422AFB"
        color="white"
        boxShadow="0 2px 8px rgba(66, 42, 251, 0.25)"
        _hover={{ bg: '#3522d4', boxShadow: '0 4px 14px rgba(66, 42, 251, 0.35)', transform: 'translateY(-1px)' }}
        _active={{ transform: 'translateY(0)' }}
        transition="all 0.2s"
        onClick={handleSave}
      >
        Enregistrer
      </Button>
    </Flex>
  );

  if (type === 'champs') {
    const isTestMode = extractMode === 'test';
    const isDefinitionMode = _isDefinition || extractMode === 'init';
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

      const deleteRowAndShiftUp = (rowIndex0: number) => {
        setEditedRow((prev) => {
          const next = { ...prev };
          for (let i = rowIndex0; i < CHAMP_STD_KEYS.length - 1; i++) {
            next[CHAMP_STD_KEYS[i]] = next[CHAMP_STD_KEYS[i + 1]] ?? '';
          }
          next[CHAMP_STD_KEYS[CHAMP_STD_KEYS.length - 1]] = '';
          return next;
        });
        setDefinitionChampVisibleCount((c) => Math.max(1, (c || visibleCount) - 1));
      };

      return (
        <ChampsModal isOpen={isOpen} onClose={onClose} title={titles.champs} titleIcon={titleIcons.champs}>
          <Box>
            <Box display="flex" flexDirection="column" gap={3}>
              {visibleRows.map((r) => (
                  <Flex key={r.key} alignItems="center" gap={5}>
                    <Flex flex="1" alignItems="center" gap={3} minW={0}>
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
                        _placeholder={{ color: 'gray.400' }}
                      />
                    </Flex>

                    <Flex flex="1" alignItems="center" gap={3} minW={0}>
                      <Flex alignItems="center" gap={2} w="90px" flexShrink={0}>
                        <Text fontSize="sm" color="gray.700" whiteSpace="nowrap">
                          Option {r.idx}:
                        </Text>
                        {(() => {
                          const raw = (r.option ?? '').trim();
                          const base = raw ? (getInfoByKeyword(raw) || explainLegacyOptionCode(raw)) : '';
                          const label = (r.label ?? '').trim();
                          const msg = raw
                            ? (base
                                ? (base.startsWith('Insertion')
                                    ? `Insertion dans la zone de texte après le libellé "${label || '—'}" puis appuie sur la touche clavier « Entrée »`
                                    : base.startsWith('Sélection de la valeur')
                                      ? `Sélection de la valeur saisie dans la liste (select) après le libellé "${label || '—'}"`
                                      : base)
                                : `Code option : ${raw}`)
                            : '';
                          return <InfoTooltipIcon message={msg} showTooltip />;
                        })()}
                      </Flex>
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
                        _placeholder={{ color: 'gray.400' }}
                      />
                    </Flex>

                    <Button
                      variant="ghost"
                      size="sm"
                      p={2}
                      minW="auto"
                      h="auto"
                      borderRadius="lg"
                      title={editedComments[r.key] ? 'Voir / modifier le commentaire' : 'Ajouter un commentaire'}
                      color={editedComments[r.key] ? '#1e40af' : 'gray.500'}
                      _hover={{ bg: editedComments[r.key] ? 'blue.50' : 'gray.100' }}
                      onClick={() => openCommentEditor(r.key)}
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
                      onClick={() => deleteRowAndShiftUp(r.idx - 1)}
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
                borderColor="gray.300"
                _hover={{ bg: 'gray.50', borderColor: '#422AFB' }}
                onClick={() => setDefinitionChampVisibleCount((c) => Math.min(rows.length, (c || 1) + 1))}
                disabled={(definitionChampVisibleCount || 1) >= rows.length}
                title="Ajouter un champ"
                aria-label="Ajouter un champ"
              >
                <Plus size={16} />
              </Button>
            </Flex>

            {/* Popup édition commentaire Excel */}
            <Dialog.Root open={!!commentEditorKey} onOpenChange={(e) => !e.open && setCommentEditorKey(null)}>
              <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
              <Dialog.Positioner>
                <Dialog.Content maxW="520px" borderRadius="xl" boxShadow="xl" bg="white" borderWidth="1px" borderColor="gray.200">
                  <Dialog.Header borderBottomWidth="1px" borderColor="gray.100" py={4} px={6}>
                    <Dialog.Title fontSize="lg" fontWeight="semibold" color="gray.900">
                      {commentEditorKey && commentEditorKey.toLowerCase().includes('bouton')
                        ? 'Commentaire du bouton'
                        : 'Commentaire du champ'}
                    </Dialog.Title>
                    <Dialog.CloseTrigger />
                  </Dialog.Header>
                  <Dialog.Body py={5} px={6}>
                    <Textarea
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      placeholder="Saisissez un commentaire..."
                      minH="140px"
                      borderRadius="lg"
                      borderColor="gray.200"
                      _focus={{ borderColor: '#422AFB', boxShadow: '0 0 0 2px rgba(66, 42, 251, 0.15)' }}
                    />
                  </Dialog.Body>
                  <Dialog.Footer gap={3} display="flex" justifyContent="flex-end" py={4} px={6}>
                    <Button variant="outline" onClick={() => { setCommentEditorKey(null); setCommentDraft(''); }}>
                      Annuler
                    </Button>
                    <Button bg="#422AFB" color="white" _hover={{ bg: '#3522d4' }} onClick={saveComment}>
                      Enregistrer
                    </Button>
                  </Dialog.Footer>
                </Dialog.Content>
              </Dialog.Positioner>
            </Dialog.Root>

            {footerButtons}
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
                value: testVal,
                option: initOption,
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
          <Box
            p={5}
            borderRadius="2xl"
            bg="linear-gradient(135deg, #fafbff 0%, #f4f6fc 100%)"
            borderWidth="1px"
            borderColor="gray.100"
            mb={4}
            boxShadow="0 1px 3px rgba(66, 42, 251, 0.05)"
          >
            {items.map((item) => (
              <ChampFieldRow
                key={item.key}
                label={item.label}
                value={item.isTestMode ? item.value : (item.option as string)}
                displayValue={
                  item.isTestMode
                    ? item.value
                    : optionToLibelle[item.option as string] || (item.option as string)
                }
                valuePlaceholder="(Non utilisé)"
                valueMaxLength={item.isTestMode ? undefined : 4}
                isLabelEditable={!item.isTestMode}
                infoMessage={computeOptionHelpMessage(
                  (item.option as string) || (item.isTestMode ? item.value : ''),
                  item.label
                )}
                showTooltip
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
              <Box
                as="button"
                type="button"
                onClick={() => setShowChampChoices(true)}
                mt={3}
                w="100%"
                py={4}
                px={4}
                borderRadius="xl"
                borderWidth="2px"
                borderStyle="dashed"
                borderColor="gray.200"
                bg="white"
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={3}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{
                  borderColor: '#422AFB',
                  bg: 'rgba(66, 42, 251, 0.04)',
                  boxShadow: '0 0 0 3px rgba(66, 42, 251, 0.10)',
                }}
                aria-label="Choisir un champ de l'écran"
              >
                <Box p={2} borderRadius="lg" bg="rgba(66, 42, 251, 0.10)" color="#422AFB">
                  <LayoutList size={20} strokeWidth={2} />
                </Box>
                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                  Choisir un champ de l&apos;écran
                </Text>
              </Box>
            )}
          </Box>

          <Dialog.Root open={showChampChoices} onOpenChange={(e) => !e.open && setShowChampChoices(false)}>
            <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
            <Dialog.Positioner>
              <Dialog.Content
                maxW="500px"
                borderRadius="2xl"
                boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                bg="white"
                borderWidth="1px"
                borderColor="gray.100"
                overflow="hidden"
              >
                <Dialog.Header
                  py={5}
                  px={6}
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                  bg="linear-gradient(180deg, #fafbff 0%, white 100%)"
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  gap={3}
                >
                  <Flex alignItems="center" gap={3}>
                    <Box p={2} borderRadius="lg" bg="rgba(66, 42, 251, 0.10)" color="#422AFB">
                      <LayoutList size={20} strokeWidth={2} />
                    </Box>
                    <Box>
                      <Dialog.Title fontSize="md" fontWeight="semibold" color="gray.900">
                        Champs disponibles
                      </Dialog.Title>
                      <Text fontSize="xs" color="gray.500" mt={0.5}>
                        Sélectionnez un champ à ajouter
                      </Text>
                    </Box>
                  </Flex>
                  <Dialog.CloseTrigger asChild>
                    <Box
                      as="button"
                      p={2}
                      borderRadius="lg"
                      color="gray.500"
                      _hover={{ bg: 'gray.100', color: 'gray.700' }}
                      transition="colors 0.2s"
                      aria-label="Fermer"
                    >
                      <X size={18} strokeWidth={2} />
                    </Box>
                  </Dialog.CloseTrigger>
                </Dialog.Header>
                <Dialog.Body maxH="420px" overflowY="auto" py={5} px={6}>
                  {availableChamps.length === 0 ? (
                    <Flex
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                      py={12}
                      px={4}
                      borderRadius="xl"
                      bg="gray.50"
                      borderWidth="1px"
                      borderColor="gray.100"
                    >
                      <Box p={3} borderRadius="full" bg="gray.200" color="gray.500" mb={3}>
                        <LayoutList size={24} strokeWidth={2} />
                      </Box>
                      <Text color="gray.500" fontSize="sm" textAlign="center">
                        Aucun champ défini pour cet écran
                      </Text>
                    </Flex>
                  ) : (
                    <Flex flexWrap="wrap" gap={3}>
                      {availableChamps.map((champ) => (
                        <Box
                          key={champ.value}
                          as="button"
                          type="button"
                          onClick={() => {
                            const emptyKey = CHAMP_STD_KEYS.find((k) => !editedRow[k] || !String(editedRow[k]).trim());
                            if (emptyKey) {
                              updateKey(emptyKey, champ.value);
                              setShowChampChoices(false);
                            }
                          }}
                          px={4}
                          py={3}
                          borderRadius="xl"
                          borderWidth="1px"
                          borderColor="gray.200"
                          bg="white"
                          textAlign="left"
                          cursor="pointer"
                          transition="all 0.2s"
                          _hover={{
                            borderColor: '#422AFB',
                            bg: 'rgba(66, 42, 251, 0.06)',
                            boxShadow: '0 4px 12px rgba(66, 42, 251, 0.15)',
                            transform: 'translateY(-2px)',
                          }}
                          boxShadow="0 1px 3px rgba(0,0,0,0.04)"
                        >
                          <Text fontSize="sm" fontWeight="medium" color="gray.800">
                            {champ.label}
                          </Text>
                          <Text fontSize="xs" color="gray.500" mt={0.5}>
                            {champ.option}
                          </Text>
                        </Box>
                      ))}
                    </Flex>
                  )}
                </Dialog.Body>
              </Dialog.Content>
            </Dialog.Positioner>
          </Dialog.Root>

          {footerButtons}
        </Box>
      </ChampsModal>
    );
  }

  if (type === 'boutons') {
    const isDefinitionMode = _isDefinition || extractMode === 'init';

    // Mode définition : interface identique à Champs, mais pour Boutons (10 lignes)
    if (isDefinitionMode) {
      const rows = BOUTON_STD_KEYS.map((key, idx) => {
        const val = String(editedRow[key] ?? '');
        const { label, option } = parseLibelleOption(val);
        return { key, idx: idx + 1, label: label ?? '', option: option ?? '' };
      });
      const visibleRows = rows.slice(0, Math.max(1, Math.min(definitionBoutonVisibleCount || 1, rows.length)));
      const visibleCount = Math.max(1, Math.min(definitionBoutonVisibleCount || 1, rows.length));

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
            <Box display="flex" flexDirection="column" gap={3}>
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
                      _placeholder={{ color: 'gray.400' }}
                    />
                  </Flex>

                  <Flex flex="1" alignItems="center" gap={3} minW={0}>
                    <Flex alignItems="center" gap={2} w="90px" flexShrink={0}>
                      <Text fontSize="sm" color="gray.700" whiteSpace="nowrap">
                        Option {r.idx}:
                      </Text>
                      {(() => {
                        const raw = (r.option ?? '').trim();
                        const base = raw ? (getInfoByKeyword(raw) || explainLegacyOptionCode(raw)) : '';
                        const label = (r.label ?? '').trim();
                        const msg = raw
                          ? (base
                              ? (base.startsWith('Insertion')
                                  ? `Insertion dans la zone de texte après le libellé "${label || '—'}" puis appuie sur la touche clavier « Entrée »`
                                  : base.startsWith('Sélection de la valeur')
                                    ? `Sélection de la valeur saisie dans la liste (select) après le libellé "${label || '—'}"`
                                    : base)
                              : `Code option : ${raw}`)
                          : '';
                        return <InfoTooltipIcon message={msg} showTooltip />;
                      })()}
                    </Flex>
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
                      _placeholder={{ color: 'gray.400' }}
                    />
                  </Flex>

                  <Button
                    variant="ghost"
                    size="sm"
                    p={2}
                    minW="auto"
                    h="auto"
                    borderRadius="lg"
                    title={editedComments[r.key] ? 'Voir / modifier le commentaire' : 'Ajouter un commentaire'}
                    color={editedComments[r.key] ? '#1e40af' : 'gray.500'}
                    _hover={{ bg: editedComments[r.key] ? 'blue.50' : 'gray.100' }}
                    onClick={() => openCommentEditor(r.key)}
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
                    onClick={() => deleteRowAndShiftUp(r.idx - 1)}
                    title="Supprimer ce bouton"
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
                borderColor="gray.300"
                _hover={{ bg: 'gray.50', borderColor: '#422AFB' }}
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

    return (
      <ChampsModal isOpen={isOpen} onClose={onClose} title={titles.boutons} titleIcon={titleIcons.boutons}>
        <Box>
          <Box
            p={5}
            borderRadius="2xl"
            bg="linear-gradient(135deg, #fafbff 0%, #f4f6fc 100%)"
            borderWidth="1px"
            borderColor="gray.100"
            mb={4}
            boxShadow="0 1px 3px rgba(66, 42, 251, 0.04)"
          >
            <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={4}>
              Boutons configurés
            </Text>
            <Flex flexDirection="column" gap={3}>
              {items.map((item) => (
                <Flex
                  key={item.key}
                  alignItems="center"
                  gap={3}
                  p={3}
                  borderRadius="xl"
                  bg="white"
                  borderWidth="1px"
                  borderColor="gray.100"
                  boxShadow="0 1px 2px rgba(0,0,0,0.04)"
                  _hover={{ borderColor: 'gray.200', boxShadow: '0 2px 8px rgba(66, 42, 251, 0.08)' }}
                  transition="all 0.2s"
                >
                  <Input
                    placeholder="Libellé du bouton"
                    value={item.label}
                    onChange={(e) => updateKey(item.key, item.option ? `${e.target.value}##${item.option}` : e.target.value)}
                    flex="1"
                    size="md"
                    variant="unstyled"
                    fontSize="sm"
                    fontWeight="medium"
                    color="gray.800"
                    _placeholder={{ color: 'gray.400', fontWeight: 'normal' }}
                    px={2}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateKey(item.key, '')}
                    color="gray.400"
                    _hover={{ bg: 'red.50', color: 'red.500' }}
                    borderRadius="lg"
                    p={2}
                    aria-label="Supprimer"
                  >
                    <Trash2 size={16} strokeWidth={2} />
                  </Button>
                </Flex>
              ))}
            </Flex>

            <Box
              as="button"
              type="button"
              onClick={() => setShowBoutonChoices(true)}
              mt={4}
              w="100%"
              py={4}
              px={4}
              borderRadius="xl"
              borderWidth="2px"
              borderStyle="dashed"
              borderColor="gray.200"
              bg="white"
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={3}
              cursor="pointer"
              transition="all 0.2s"
              _hover={{
                borderColor: '#422AFB',
                bg: 'rgba(66, 42, 251, 0.04)',
                boxShadow: '0 0 0 3px rgba(66, 42, 251, 0.1)',
              }}
            >
              <Box
                p={2}
                borderRadius="lg"
                bg="rgba(66, 42, 251, 0.1)"
                color="#422AFB"
              >
                <MousePointerClick size={20} strokeWidth={2} />
              </Box>
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                Choisir un bouton de l&apos;écran
              </Text>
            </Box>
          </Box>

          <Dialog.Root open={showBoutonChoices} onOpenChange={(e) => !e.open && setShowBoutonChoices(false)}>
            <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(8px)" />
            <Dialog.Positioner>
              <Dialog.Content
                maxW="480px"
                borderRadius="2xl"
                boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                bg="white"
                borderWidth="1px"
                borderColor="gray.100"
                overflow="hidden"
              >
                <Dialog.Header
                  py={5}
                  px={6}
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                  bg="linear-gradient(180deg, #fafbff 0%, white 100%)"
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Flex alignItems="center" gap={3}>
                    <Box p={2} borderRadius="lg" bg="rgba(66, 42, 251, 0.1)" color="#422AFB">
                      <MousePointerClick size={20} strokeWidth={2} />
                    </Box>
                    <Box>
                      <Dialog.Title fontSize="md" fontWeight="semibold" color="gray.900">
                        Boutons disponibles
                      </Dialog.Title>
                      <Text fontSize="xs" color="gray.500" mt={0.5}>
                        Sélectionnez un bouton à ajouter
                      </Text>
                    </Box>
                  </Flex>
                  <Dialog.CloseTrigger asChild>
                    <Box
                      as="button"
                      p={2}
                      borderRadius="lg"
                      color="gray.500"
                      _hover={{ bg: 'gray.100', color: 'gray.700' }}
                      transition="colors 0.2s"
                      aria-label="Fermer"
                    >
                      <X size={18} strokeWidth={2} />
                    </Box>
                  </Dialog.CloseTrigger>
                </Dialog.Header>
                <Dialog.Body maxH="360px" overflowY="auto" py={5} px={6}>
                  {availableButtons.length === 0 ? (
                    <Flex
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                      py={12}
                      px={4}
                      borderRadius="xl"
                      bg="gray.50"
                      borderWidth="1px"
                      borderColor="gray.100"
                    >
                      <Box p={3} borderRadius="full" bg="gray.200" color="gray.500" mb={3}>
                        <MousePointer size={24} strokeWidth={2} />
                      </Box>
                      <Text color="gray.500" fontSize="sm" textAlign="center">
                        Aucun bouton défini pour cet écran
                      </Text>
                    </Flex>
                  ) : (
                    <Flex flexWrap="wrap" gap={3}>
                      {availableButtons.map((btn) => (
                        <Box
                          key={btn.value}
                          as="button"
                          type="button"
                          onClick={() => {
                            const emptyKey = BOUTON_STD_KEYS.find((k) => !editedRow[k] || !String(editedRow[k]).trim());
                            if (emptyKey) {
                              updateKey(emptyKey, btn.value);
                              setShowBoutonChoices(false);
                            }
                          }}
                          px={4}
                          py={3}
                          borderRadius="xl"
                          borderWidth="1px"
                          borderColor="gray.200"
                          bg="white"
                          textAlign="left"
                          cursor="pointer"
                          transition="all 0.2s"
                          _hover={{
                            borderColor: '#422AFB',
                            bg: 'rgba(66, 42, 251, 0.06)',
                            boxShadow: '0 4px 12px rgba(66, 42, 251, 0.15)',
                            transform: 'translateY(-2px)',
                          }}
                          boxShadow="0 1px 3px rgba(0,0,0,0.04)"
                        >
                          <Text fontSize="sm" fontWeight="medium" color="gray.800">
                            {btn.label}
                          </Text>
                          <Text fontSize="xs" color="gray.500" mt={0.5}>
                            {btn.option}
                          </Text>
                        </Box>
                      ))}
                    </Flex>
                  )}
                </Dialog.Body>
              </Dialog.Content>
            </Dialog.Positioner>
          </Dialog.Root>

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
            bg="linear-gradient(135deg, #fafbff 0%, #f4f6fc 100%)"
            borderWidth="1px"
            borderColor="gray.100"
            mb={4}
            boxShadow="0 1px 3px rgba(66, 42, 251, 0.05)"
          >
            <GetInput
              nbrOfField={3}
              label="GET"
              value={value}
              infoMessage={(() => {
                const v = value.trim();
                if (!v) return '';
                const msg = v.includes('##') ? getInfoByKeyword(v) : '';
                if (msg) return msg;
                return v.includes('##') ? `GET: ${v}` : '';
              })()}
              showTooltip
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
            bg="linear-gradient(135deg, #fafbff 0%, #f4f6fc 100%)"
            borderWidth="1px"
            borderColor="gray.100"
            mb={4}
            boxShadow="0 1px 3px rgba(66, 42, 251, 0.05)"
          >
            <GetInput
              nbrOfField={1}
              label=""
              value={value}
              showTooltip
              infoMessage={(() => {
                const v = value.trim();
                if (!v) return '';
                const msg = getInfoByKeyword(v);
                if (msg) return msg;
                if (v.includes('##')) return `Msg KO prévu : ${v}`;
                const k = v.toUpperCase();
                if (/^[0-9]{1,2}F[A-Z][0-9]$/.test(k)) return `Msg KO prévu : ${v}`;
                return '';
              })()}
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
