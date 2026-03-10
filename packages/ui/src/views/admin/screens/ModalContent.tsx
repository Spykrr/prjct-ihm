import { useState } from 'react';
import { Box, Flex, Button, Text, Dialog } from '@chakra-ui/react';
import { List, LayoutList, MousePointer, Link, MessageSquare, X } from 'lucide-react';
import ChampsModal from '../../../components/modals/ChampsModal';
import ChampFieldRow from '../../../components/modals/ChampFieldRow';
import FormInput from '../../../components/modals/FormInput';
import GetInput from '../../../components/modals/GetInput';
import {
  findValueByKeyPattern,
  getInitRowByEcran,
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
  isDefinition = false,
  isSoapSheet = false,
  onSave,
}: ModalContentProps) {
  const [editedRow, setEditedRow] = useState<Record<string, unknown>>({});
  const [showBoutonChoices, setShowBoutonChoices] = useState(false);
  const [showChampChoices, setShowChampChoices] = useState(false);
  const [prevScreenId, setPrevScreenId] = useState<string | null>(null);

  if (screen && isOpen && screen.id !== prevScreenId) {
    setPrevScreenId(screen.id);
    setEditedRow({ ...screen.rawRow });
  }

  const updateKey = (key: string, value: string) => {
    setEditedRow((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave({ ...screen, rawRow: editedRow });
    onClose();
  };

  const titles: Record<ModalType, string> = {
    champs: `Champs - ${screen.title}`,
    boutons: `Boutons - ${screen.title}`,
    get: `GET - ${screen.title}`,
    msgKOPrevu: `msgKOPrevu - ${screen.title}`,
  };

  const titleIcons: Record<ModalType, React.ReactNode> = {
    champs: <Box color="#422AFB" p={1} borderRadius="md" bg="blue.50"><LayoutList size={22} /></Box>,
    boutons: <Box color="#422AFB" p={1} borderRadius="md" bg="blue.50"><MousePointer size={22} /></Box>,
    get: <Box color="#422AFB" p={1} borderRadius="md" bg="blue.50"><Link size={22} /></Box>,
    msgKOPrevu: <Box color="#422AFB" p={1} borderRadius="md" bg="blue.50"><MessageSquare size={22} /></Box>,
  };

  const footerButtons = (
    <Flex justifyContent="flex-end" mt={6} pt={4} borderTopWidth="1px" borderColor="gray.100" gap={3}>
      <Button size="sm" variant="outline" onClick={onClose}>
        Annuler
      </Button>
      <Button size="sm" bg="#422AFB" color="white" _hover={{ bg: '#3522d4' }} onClick={handleSave}>
        Enregistrer
      </Button>
    </Flex>
  );

  if (type === 'champs') {
    const isTestMode = extractMode === 'test';
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

    const champKeys = initRow
      ? getChampKeysWithContent(initRow)
      : getChampKeysWithContent(editedRow);
    const items =
      champKeys.length > 0
        ? champKeys.map((key) => {
            if (isTestMode && initRow) {
              const initVal = String(initRow[key] ?? '');
              const { label: initLabel } = parseLibelleOption(initVal);
              const testVal = String(editedRow[key] ?? '');
              return {
                key,
                label: initLabel,
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
              _hover={{ bg: 'gray.50', borderColor: '#422AFB' }}
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
                          _hover={{ bg: 'blue.50', borderColor: '#422AFB' }}
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
        </Box>
      </ChampsModal>
    );
  }

  if (type === 'boutons') {
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
          {items.map((item) => (
            <FormInput
              key={item.key}
              label={item.label}
              option={item.option}
              optionPlaceholder="1N"
              optionMaxLength={2}
              onLabelChange={(v) => updateKey(item.key, item.option ? `${v}##${item.option}` : v)}
              onOptionChange={(v) => updateKey(item.key, item.label ? `${item.label}##${v}` : `##${v}`)}
              onDelete={() => updateKey(item.key, '')}
            />
          ))}
          <Button
            size="sm"
            variant="outline"
            gap={2}
            mt={2}
            onClick={() => setShowBoutonChoices(true)}
            borderColor="gray.300"
            _hover={{ bg: 'gray.50', borderColor: '#422AFB' }}
          >
            <List size={14} /> Choisir un bouton de l&apos;écran
          </Button>

          <Dialog.Root open={showBoutonChoices} onOpenChange={(e) => !e.open && setShowBoutonChoices(false)}>
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
                    Boutons disponibles dans l&apos;écran
                  </Dialog.Title>
                  <Dialog.CloseTrigger asChild>
                    <Box as="button" p={1.5} borderRadius="md" color="gray.500" _hover={{ bg: 'gray.200' }} aria-label="Fermer">
                      <X size={18} />
                    </Box>
                  </Dialog.CloseTrigger>
                </Dialog.Header>
                <Dialog.Body maxH="300px" overflowY="auto" py={4} px={4}>
                  {availableButtons.length === 0 ? (
                    <Text color="gray.500" fontSize="sm">
                      Aucun bouton défini pour cet écran
                    </Text>
                  ) : (
                    <Box display="flex" flexDirection="column" gap={2}>
                      {availableButtons.map((btn) => (
                        <Button
                          key={btn.value}
                          size="sm"
                          variant="outline"
                          justifyContent="flex-start"
                          fontWeight="normal"
                          borderRadius="md"
                          borderColor="gray.200"
                          _hover={{ bg: 'blue.50', borderColor: '#422AFB' }}
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
          <GetInput
            nbrOfField={3}
            label="GET"
            value={value}
            onChange={(v) => updateKey(getKey, v)}
          />
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
          <GetInput
            nbrOfField={1}
            label="Msg"
            value={value}
            onChange={(v) => updateKey(msgKey, v)}
          />
          {footerButtons}
        </Box>
      </ChampsModal>
    );
  }

  return null;
}
