import { useState, useEffect, useRef } from 'react';
import { Box, Flex, Button, Checkbox, Input, Text, Dialog } from '@chakra-ui/react';
import { Trash2, Pencil, X, Link2, Settings } from 'lucide-react';
import { type RefOption } from '@uptest/core';
import {
  MATRICE_CORRESPONDANCE,
  MODULE_SAB_PARAMS,
  type MatriceItem,
} from './matriceCorrespondance';
import { useToast } from '../../../contexts/ToastContext';

const MIN_ORDRE_GROUPE = 0;
const MAX_ORDRE_GROUPE = 999;
const PAD_ORDRE_GROUPE = 3;

interface FormInputRefProps {
  option: RefOption;
  /** Valeurs ordreOption des autres options du même groupe (pour vérifier les doublons) */
  siblingOrdreOptions?: number[];
  onUpdate: (opt: RefOption) => void;
  onDelete: () => void;
}

const PAD_5 = (n: number | undefined): string =>
  n != null && !Number.isNaN(n) ? String(Math.max(0, Math.floor(n))).padStart(5, '0') : '';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="xs" fontWeight="medium" color="gray.500" mb={1.5} display="block">
      {children}
    </Text>
  );
}

type PopupMode = 'general' | 'predecesseur' | 'parametres' | null;

export default function FormInputRef({ option, siblingOrdreOptions = [], onUpdate, onDelete }: FormInputRefProps) {
  const { showError } = useToast();
  const [popupMode, setPopupMode] = useState<PopupMode>(null);
  const [localEdit, setLocalEdit] = useState<RefOption | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmOrdreMergeOpen, setConfirmOrdreMergeOpen] = useState(false);
  const [ordreInput, setOrdreInput] = useState('');
  const debounceOrdreRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestLocalEditRef = useRef<RefOption | null>(null);
  /** Valeur d'ordre groupe à l'ouverture de la popup (pour détecter un changement au moment d'enregistrer) */
  const initialOrdreOptionRef = useRef<number | undefined>(undefined);

  const openEditPopup = () => {
    const snapshot = { ...option };
    setLocalEdit(snapshot);
    initialOrdreOptionRef.current = snapshot.ordreOption as number | undefined;
    setPopupMode('general');
  };
  const openPredecesseurPopup = () => {
    setLocalEdit({ ...option });
    setPopupMode('predecesseur');
  };
  const openParametresPopup = () => {
    setLocalEdit({ ...option });
    setPopupMode('parametres');
  };
  const closeEditPopup = () => {
    if (debounceOrdreRef.current) {
      clearTimeout(debounceOrdreRef.current);
      debounceOrdreRef.current = null;
    }
    setConfirmOrdreMergeOpen(false);
    setPopupMode(null);
    setLocalEdit(null);
    setOrdreInput('');
    initialOrdreOptionRef.current = undefined;
  };

  const validateOrdreGroupe = (num: number): boolean => {
    if (num < MIN_ORDRE_GROUPE || num > MAX_ORDRE_GROUPE) return false;
    if (siblingOrdreOptions.includes(num)) return false;
    return true;
  };

  const saveEditPopup = () => {
    if (!localEdit) return;
    const ordreNum = localEdit.ordreOption as number | undefined;
    const num = ordreNum != null && !Number.isNaN(ordreNum) ? Math.floor(ordreNum) : 0;
    if (!validateOrdreGroupe(num)) {
      if (num < MIN_ORDRE_GROUPE || num > MAX_ORDRE_GROUPE) {
        showError(`Ordre groupe doit être entre ${MIN_ORDRE_GROUPE} et ${MAX_ORDRE_GROUPE}.`);
      } else {
        showError('Cette valeur d\'ordre groupe est déjà utilisée par une autre option du groupe.');
      }
      return;
    }
    const initialOrdre = initialOrdreOptionRef.current;
    const newOrdre = localEdit.ordreOption as number | undefined;
    const ordreChanged =
      (initialOrdre ?? undefined) !== (newOrdre ?? undefined);
    if (ordreChanged) {
      setConfirmOrdreMergeOpen(true);
      return;
    }
    onUpdate(localEdit);
    closeEditPopup();
  };

  const confirmOrdreMergeAndSave = () => {
    if (localEdit) {
      onUpdate(localEdit);
      closeEditPopup();
    }
    setConfirmOrdreMergeOpen(false);
  };
  const updateLocal = (key: keyof RefOption, value: unknown) => {
    setLocalEdit((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const selectStyle = {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    width: '100%',
    minHeight: '36px',
  };

  const hasPredecesseur = !!(option.Predecesseur as string | undefined)?.toString().trim();
  const hasParams = Array.from({ length: 10 }).some((_, idx) => {
    const key = `Param${idx + 1}` as keyof RefOption;
    const value = option[key];
    if (value == null) return false;
    if (typeof value === 'string') return value.trim() !== '';
    return true;
  });
  const hasGeneralInfo = !!(
    (option.Module as string | undefined)?.toString().trim() ||
    (option.Libelle as string | undefined)?.toString().trim()
  );

  // Garder une ref à jour pour le debounce
  useEffect(() => {
    if (localEdit) latestLocalEditRef.current = localEdit;
  }, [localEdit]);

  // Sync ordreInput à l'ouverture de la popup générale (format 3 chiffres)
  useEffect(() => {
    if (popupMode === 'general' && localEdit) {
      const n = localEdit.ordreOption as number | undefined;
      const val = n != null && !Number.isNaN(n) ? Math.max(MIN_ORDRE_GROUPE, Math.min(MAX_ORDRE_GROUPE, Math.floor(n))) : 0;
      setOrdreInput(String(val).padStart(PAD_ORDRE_GROUPE, '0'));
    }
  }, [popupMode]);

  // Annuler le debounce à la fermeture
  useEffect(() => {
    return () => {
      if (debounceOrdreRef.current) {
        clearTimeout(debounceOrdreRef.current);
        debounceOrdreRef.current = null;
      }
    };
  }, []);

  return (
    <Box
      p={5}
      borderWidth="1px"
      borderRadius="xl"
      borderColor="gray.200"
      bg="white"
      mb={4}
      boxShadow="0 1px 3px rgba(0,0,0,0.04)"
    >
      <Flex gap={4} alignItems="center" flexWrap="wrap">
        {/* Actif - case à cocher en lecture seule */}
        <Flex alignItems="center" gap={2} flexShrink={0}>
          <FieldLabel>Actif</FieldLabel>
          <Checkbox.Root
            checked={option.Actif === 'O'}
            disabled
            cursor="default"
            opacity={1}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
          </Checkbox.Root>
        </Flex>

        {/* Traitement - lecture seule, style "non modifiable" */}
        <Flex alignItems="center" gap={2} flexShrink={0} minW="200px">
          <Text fontSize="xs" fontWeight="medium" color="gray.500" whiteSpace="nowrap">
            Traitement :
          </Text>
          <Flex
            alignItems="center"
            gap={2}
            px={3}
            py={2}
            borderRadius="lg"
            borderWidth="1px"
            borderStyle="dashed"
            borderColor="gray.400"
            bg="gray.200"
            minW="140px"
            cursor="default"
            userSelect="none"
          >
            <Text fontSize="sm" color="gray.600" lineClamp={1} flex={1} minW={0}>
              {(option.Module as string) || '—'}
            </Text>
          </Flex>
        </Flex>

        {/* Ordre - lecture seule, style "non modifiable" */}
        <Flex alignItems="center" gap={2} flexShrink={0} minW="100px">
          <Text fontSize="xs" fontWeight="medium" color="gray.500" whiteSpace="nowrap">
            Ordre :
          </Text>
          <Flex
            alignItems="center"
            gap={2}
            px={3}
            py={2}
            borderRadius="lg"
            borderWidth="1px"
            borderStyle="dashed"
            borderColor="gray.400"
            bg="gray.200"
            minW={0}
            cursor="default"
            userSelect="none"
          >
            <Text fontSize="sm" color="gray.600" lineClamp={1} flex={1} minW={0}>
              {PAD_5(option.ordreOption as number | undefined)}
            </Text>
          </Flex>
        </Flex>

        {/* Libellé - lecture seule, style "non modifiable" */}
        <Flex alignItems="center" gap={2} flexShrink={0} minW="280px">
          <Text fontSize="xs" fontWeight="medium" color="gray.500" whiteSpace="nowrap">
            Libellé :
          </Text>
          <Flex
            alignItems="center"
            gap={2}
            px={3}
            py={2}
            borderRadius="lg"
            borderWidth="1px"
            borderStyle="dashed"
            borderColor="gray.400"
            bg="gray.200"
            minW="240px"
            cursor="default"
            userSelect="none"
          >
            <Text fontSize="sm" color="gray.600" lineClamp={1} flex={1} minW={0}>
              {(option.Libelle as string) || '—'}
            </Text>
          </Flex>
        </Flex>

        {/* Boutons d'action alignés à droite */}
        <Flex alignItems="center" gap={1} ml="auto">
          {/* Prédécesseur */}
          <Button
            size="sm"
            variant="ghost"
            flexShrink={0}
            p={2}
            h="36px"
            minW="auto"
            borderRadius="lg"
            bg={hasPredecesseur ? '#dcfce7' : 'transparent'}
            color={hasPredecesseur ? '#166534' : 'gray.500'}
            _hover={{
              bg: hasPredecesseur ? '#bbf7d0' : 'gray.100',
              color: hasPredecesseur ? '#166534' : '#422AFB',
            }}
            title="Prédécesseur"
            onClick={openPredecesseurPopup}
          >
            <Link2 size={18} strokeWidth={2} />
          </Button>

          {/* Paramètres */}
          <Button
            size="sm"
            variant="ghost"
            flexShrink={0}
            p={2}
            h="36px"
            minW="auto"
            borderRadius="lg"
            bg={hasParams ? '#dbeafe' : 'transparent'}
            color={hasParams ? '#1d4ed8' : 'gray.500'}
            _hover={{
              bg: hasParams ? '#bfdbfe' : 'gray.100',
              color: hasParams ? '#1d4ed8' : '#422AFB',
            }}
            title="Paramètres"
            onClick={openParametresPopup}
          >
            <Settings size={18} strokeWidth={2} />
          </Button>

          {/* Bouton crayon : ouvrir la popup pour modifier */}
          <Button
            size="sm"
            variant="ghost"
            flexShrink={0}
            p={2}
            h="36px"
            minW="auto"
            borderRadius="lg"
            bg={hasGeneralInfo ? '#fef9c3' : 'transparent'}
            color={hasGeneralInfo ? '#92400e' : 'gray.500'}
            _hover={{
              bg: hasGeneralInfo ? '#fef08a' : 'gray.100',
              color: hasGeneralInfo ? '#92400e' : '#422AFB',
            }}
            onClick={openEditPopup}
            title="Modifier tous les champs"
          >
            <Pencil size={18} strokeWidth={2} />
          </Button>

          {/* Supprimer */}
          <Button
            size="sm"
            variant="ghost"
            color="gray.500"
            p={2}
            minW="auto"
            h="36px"
            borderRadius="lg"
            flexShrink={0}
            _hover={{ bg: 'red.50', color: 'red.500' }}
            onClick={() => setConfirmDeleteOpen(true)}
            title="Supprimer cette option"
          >
            <Trash2 size={18} strokeWidth={2} />
          </Button>
        </Flex>
      </Flex>

      {/* Popup selon le bouton : général+libellé / prédécesseur / paramètres */}
      <Dialog.Root open={popupMode !== null} onOpenChange={(e) => { if (!e.open) closeEditPopup(); }}>
        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <Dialog.Positioner>
          <Dialog.Content
            maxW="680px"
            w="100%"
            borderRadius="xl"
            boxShadow="xl"
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
                saveEditPopup();
              }
            }}
          >
            <Dialog.Header
              py={3}
              px={5}
              borderBottomWidth="1px"
              borderColor="gray.100"
              bg="gray.50"
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              gap={3}
            >
              <Flex alignItems="center" gap={3}>
                <Box
                  p={2}
                  borderRadius="lg"
                  bg="blue.50"
                  color="#422AFB"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  {popupMode === 'general' && <Pencil size={18} strokeWidth={2} />}
                  {popupMode === 'predecesseur' && <Link2 size={18} strokeWidth={2} />}
                  {popupMode === 'parametres' && <Settings size={18} strokeWidth={2} />}
                </Box>
                <Box>
                  <Dialog.Title fontSize="md" fontWeight="semibold" color="gray.900">
                    {popupMode === 'general' && "Informations générales et libellé"}
                    {popupMode === 'predecesseur' && "Prédécesseur"}
                    {popupMode === 'parametres' && "Paramètres du traitement"}
                  </Dialog.Title>
                  {localEdit && popupMode === 'general' && (
                    <Text fontSize="xs" color="gray.500" mt={0.5}>
                      {(localEdit.Module as string) || 'Module non renseigné'}
                    </Text>
                  )}
                </Box>
              </Flex>
              <Dialog.CloseTrigger asChild>
                <Box
                  as="button"
                  p={1.5}
                  borderRadius="md"
                  color="gray.500"
                  _hover={{ bg: 'gray.200' }}
                  aria-label="Fermer"
                >
                  <X size={18} />
                </Box>
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body maxH="70vh" overflowY="auto" px={5} py={4}>
              {localEdit && popupMode === 'general' && (
                <Box display="flex" flexDirection="column" gap={6}>
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.800" mb={3}>
                      Informations générales
                    </Text>
                    <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))" gap={4}>
                      <Box>
                        <FieldLabel>Statut</FieldLabel>
                        <Flex
                          alignItems="center"
                          gap={2}
                          px={3}
                          py={2}
                          borderRadius="lg"
                          borderWidth="1px"
                          borderColor={localEdit.Actif === 'O' ? 'green.200' : 'gray.200'}
                          bg={localEdit.Actif === 'O' ? 'green.50' : 'gray.50'}
                        >
                          <Checkbox.Root
                            checked={localEdit.Actif === 'O'}
                            onCheckedChange={(e) => updateLocal('Actif', e.checked ? 'O' : 'N')}
                          >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control />
                          </Checkbox.Root>
                          <Text fontSize="sm" fontWeight="medium" color="gray.700">
                            {localEdit.Actif === 'O' ? 'Actif' : 'Inactif'}
                          </Text>
                        </Flex>
                      </Box>
                      <Box>
                        <FieldLabel>Type</FieldLabel>
                        <select
                          value={(localEdit.Type as string) ?? 'ModuleSAB'}
                          onChange={(e) => updateLocal('Type', e.target.value)}
                          style={{ ...selectStyle, width: '100%' }}
                        >
                          <option value="ModuleSAB">ModuleSAB</option>
                          <option value="TraitementUpTest">TraitementUpTest</option>
                        </select>
                      </Box>
                      <Box>
                        <FieldLabel>Traitement</FieldLabel>
                        <select
                          value={(localEdit.Module as string) ?? ''}
                          onChange={(e) => updateLocal('Module', e.target.value)}
                          style={{ ...selectStyle, width: '100%' }}
                        >
                          <option value="">Sélectionner un traitement</option>
                          {MATRICE_CORRESPONDANCE.filter((m) => m.keyword).map((m) => (
                            <option key={m.keyword} value={m.keyword}>
                              {m.keyword}
                            </option>
                          ))}
                        </select>
                        {(() => {
                          const mat = MATRICE_CORRESPONDANCE.find(
                            (m) => m.keyword === (localEdit.Module as string)
                          );
                          return mat ? (
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              {mat.description}
                            </Text>
                          ) : null;
                        })()}
                      </Box>
                      <Box>
                        <FieldLabel>Ordre groupe</FieldLabel>
                        <Input
                          size="sm"
                          h="36px"
                          borderRadius="lg"
                          type="text"
                          inputMode="numeric"
                          maxLength={PAD_ORDRE_GROUPE}
                          value={ordreInput}
                          onChange={(e) => {
                            const raw = e.target.value.slice(0, PAD_ORDRE_GROUPE);
                            const digits = raw.replace(/\D/g, '');
                            const num = digits === '' ? 0 : parseInt(digits, 10);
                            if (digits !== '' && (num < MIN_ORDRE_GROUPE || num > MAX_ORDRE_GROUPE)) {
                              showError(`Ordre groupe doit être entre ${MIN_ORDRE_GROUPE} et ${MAX_ORDRE_GROUPE}.`);
                              return;
                            }
                            if (digits !== '' && siblingOrdreOptions.includes(num)) {
                              showError('Cette valeur d\'ordre groupe est déjà utilisée par une autre option du groupe.');
                              return;
                            }
                            const nextInput = digits === '' ? '' : digits;
                            setOrdreInput(nextInput);
                            updateLocal('ordreOption', digits === '' ? undefined : num);
                            if (debounceOrdreRef.current) clearTimeout(debounceOrdreRef.current);
                            debounceOrdreRef.current = setTimeout(() => {
                              if (latestLocalEditRef.current) {
                                onUpdate({ ...latestLocalEditRef.current, ordreOption: digits === '' ? undefined : num });
                              }
                              debounceOrdreRef.current = null;
                            }, 1000);
                          }}
                          onBlur={() => {
                            if (debounceOrdreRef.current) {
                              clearTimeout(debounceOrdreRef.current);
                              debounceOrdreRef.current = null;
                            }
                            const num = ordreInput === '' ? 0 : Math.min(MAX_ORDRE_GROUPE, Math.max(MIN_ORDRE_GROUPE, parseInt(ordreInput, 10) || 0));
                            const padded = String(num).padStart(PAD_ORDRE_GROUPE, '0');
                            setOrdreInput(padded);
                            updateLocal('ordreOption', num);
                            if (localEdit) {
                              const next = { ...localEdit, ordreOption: num };
                              latestLocalEditRef.current = next;
                              onUpdate(next);
                            }
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" color="gray.800" mb={3}>
                      Libellé
                    </Text>
                    <Box>
                      <FieldLabel>Libellé de l&apos;option</FieldLabel>
                      <Input
                        size="sm"
                        h="36px"
                        borderRadius="lg"
                        value={(localEdit.Libelle as string) ?? ''}
                        onChange={(e) => updateLocal('Libelle', e.target.value)}
                        placeholder="..."
                      />
                    </Box>
                  </Box>
                </Box>
              )}

              {localEdit && popupMode === 'predecesseur' && (() => {
                const raw = (localEdit.Predecesseur as string) ?? '';
                const parts = raw.split('##').map((s) => s.trim());
                const [instanceName, ordreInstance, ordreGroupe, module] = parts;
                return (
                  <Box>
                    <FieldLabel>Prédécesseur</FieldLabel>
                    <Input
                      size="sm"
                      h="36px"
                      borderRadius="lg"
                      value={raw}
                      onChange={(e) => updateLocal('Predecesseur', e.target.value)}
                      placeholder="Inst01##02600##00240##PTF"
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Format&nbsp;: Instance##OrdreInstance##OrdreGroupe##Module
                    </Text>
                    <Box mt={4} p={3} borderRadius="lg" borderWidth="1px" borderColor="gray.200" bg="gray.50">
                      <Text fontSize="xs" fontWeight="semibold" color="gray.600" mb={2}>
                        Détails du prédécesseur
                      </Text>
                      <Flex direction="column" gap={1.5}>
                        <Text fontSize="sm" color="gray.700">
                          Nom de l&apos;instance&nbsp;: {instanceName ?? '—'}
                        </Text>
                        <Text fontSize="sm" color="gray.700">
                          Ordre de l&apos;instance&nbsp;: {ordreInstance ?? '—'}
                        </Text>
                        <Text fontSize="sm" color="gray.700">
                          Ordre dans groupe&nbsp;: {ordreGroupe ?? '—'}
                        </Text>
                        <Text fontSize="sm" color="gray.700">
                          Module&nbsp;: {module ?? '—'}
                        </Text>
                      </Flex>
                    </Box>
                  </Box>
                );
              })()}

              {localEdit && popupMode === 'parametres' && (
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={3} color="gray.800">
                    Paramètres du traitement
                  </Text>
                  <Box
                    display="grid"
                    gridTemplateColumns="repeat(auto-fill, minmax(200px, 1fr))"
                    gap={3}
                  >
                    {((): MatriceItem['Param1'][] => {
                      const isUp = ((localEdit.Module ?? '') as string)
                        .toUpperCase()
                        .startsWith('UP');
                      const mat = MATRICE_CORRESPONDANCE.find(
                        (m) => m.keyword === (localEdit.Module ?? '')
                      );
                      const defs =
                        isUp && mat
                          ? [
                              mat.Param1,
                              mat.Param2,
                              mat.Param3,
                              mat.Param4,
                              mat.Param5,
                              mat.Param6,
                              mat.Param7,
                              mat.Param8,
                              mat.Param9,
                              mat.Param10,
                            ]
                          : MODULE_SAB_PARAMS;
                      return defs;
                    })().map((def, i) => (
                      <Box key={i}>
                        {!def.isDisabled && (
                          <>
                            <FieldLabel>param{i + 1}</FieldLabel>
                            <Input
                              size="sm"
                              h="36px"
                              borderRadius="lg"
                              value={((localEdit[`Param${i + 1}`] as string) ?? '')}
                              onChange={(e) =>
                                updateLocal(
                                  `Param${i + 1}` as keyof RefOption,
                                  e.target.value
                                )
                              }
                              placeholder="..."
                            />
                          </>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Dialog.Body>
            <Dialog.Footer gap={3} display="flex" justifyContent="flex-end" flexWrap="wrap" py={4} px={5} pt={4} pb={6}>
              <Button
                variant="outline"
                size="md"
                px={5}
                py={2.5}
                fontWeight="medium"
                borderRadius="xl"
                borderColor="gray.200"
                color="gray.700"
                _hover={{ bg: 'gray.50', borderColor: 'gray.300' }}
                transition="all 0.2s"
                onClick={closeEditPopup}
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
                onClick={saveEditPopup}
              >
                Enregistrer
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Popup de confirmation : mise à jour des prédécesseurs (changement Ordre groupe) */}
      <Dialog.Root open={confirmOrdreMergeOpen} onOpenChange={(e) => !e.open && setConfirmOrdreMergeOpen(false)}>
        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <Dialog.Positioner>
          <Dialog.Content
            maxW="420px"
            w="100%"
            borderRadius="xl"
            boxShadow="xl"
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                confirmOrdreMergeAndSave();
              }
            }}
          >
            <Dialog.Header
              py={3}
              px={5}
              borderBottomWidth="1px"
              borderColor="gray.100"
              bg="gray.50"
            >
              <Dialog.Title fontSize="md" fontWeight="semibold" color="gray.900">
                Confirmer l&apos;enregistrement
              </Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body px={5} py={4}>
              <Text fontSize="sm" color="gray.600">
                Un changement d&apos;ordre groupe a été effectué. Les prédécesseurs qui référencent cette option seront mis à jour. Continuer&nbsp;?
              </Text>
            </Dialog.Body>
            <Dialog.Footer gap={3} display="flex" justifyContent="flex-end" py={4} px={5}>
              <Button
                variant="outline"
                size="sm"
                px={4}
                py={2}
                fontWeight="medium"
                borderRadius="lg"
                borderColor="gray.200"
                color="gray.700"
                _hover={{ bg: 'gray.50', borderColor: 'gray.300' }}
                transition="all 0.2s"
                onClick={() => setConfirmOrdreMergeOpen(false)}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                px={4}
                py={2}
                fontWeight="medium"
                borderRadius="lg"
                bg="#422AFB"
                color="white"
                boxShadow="0 2px 6px rgba(66, 42, 251, 0.25)"
                _hover={{ bg: '#3522d4', boxShadow: '0 3px 10px rgba(66, 42, 251, 0.3)', transform: 'translateY(-1px)' }}
                _active={{ transform: 'translateY(0)' }}
                transition="all 0.2s"
                onClick={confirmOrdreMergeAndSave}
              >
                Enregistrer
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Popup de confirmation de suppression */}
      <Dialog.Root open={confirmDeleteOpen} onOpenChange={(e) => !e.open && setConfirmDeleteOpen(false)}>
        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <Dialog.Positioner>
          <Dialog.Content
            maxW="420px"
            w="100%"
            borderRadius="xl"
            boxShadow="xl"
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setConfirmDeleteOpen(false);
                onDelete();
              }
            }}
          >
            <Dialog.Header
              py={3}
              px={5}
              borderBottomWidth="1px"
              borderColor="gray.100"
              bg="gray.50"
            >
              <Dialog.Title fontSize="md" fontWeight="semibold" color="gray.900">
                Supprimer l&apos;option
              </Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body px={5} py={4}>
              <Text fontSize="sm" color="gray.600">
                Êtes-vous sûr de vouloir supprimer cette option&nbsp;? Cette action est irréversible.
              </Text>
            </Dialog.Body>
            <Dialog.Footer gap={3} display="flex" justifyContent="flex-end" py={4} px={5}>
              <Button
                variant="outline"
                size="sm"
                px={4}
                py={2}
                fontWeight="medium"
                borderRadius="lg"
                borderColor="gray.200"
                color="gray.700"
                _hover={{ bg: 'gray.50', borderColor: 'gray.300' }}
                transition="all 0.2s"
                onClick={() => setConfirmDeleteOpen(false)}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                px={4}
                py={2}
                fontWeight="medium"
                borderRadius="lg"
                bg="red.500"
                color="white"
                boxShadow="0 2px 6px rgba(220, 38, 38, 0.25)"
                _hover={{ bg: 'red.600', boxShadow: '0 3px 10px rgba(220, 38, 38, 0.3)', transform: 'translateY(-1px)' }}
                _active={{ transform: 'translateY(0)' }}
                transition="all 0.2s"
                onClick={() => {
                  setConfirmDeleteOpen(false);
                  onDelete();
                }}
              >
                Supprimer
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
