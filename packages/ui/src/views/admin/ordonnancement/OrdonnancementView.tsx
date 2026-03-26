import { useState } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Accordion,
  Dialog,
  Switch,
} from '@chakra-ui/react';
import { Upload, Download, Plus, Trash2, FolderOpen, ChevronUp, ChevronDown, ChevronRight, Network } from 'lucide-react';
import {
  parseRefCsv,
  generateRefCsv,
  generateRefXlsx,
  addGrp,
  type RefInstance,
  type RefGroup,
  type RefOption,
} from '@uptest/core';
import { openCsvFile } from '../../../utils/fileImport';
import { useToast } from '../../../contexts/ToastContext';
import FormInputRef from './FormInputRef';
import OrganigrammeModal from './OrganigrammeModal';

function isOptionActif(option: { Actif?: string }): boolean {
  const v = (option.Actif ?? '').toString().trim().toUpperCase();
  return v === 'O' || v === '1' || v === 'Y' || v === 'OUI' || v === 'YES' || v === 'TRUE' || v === 'X';
}

function downloadCsv(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadXlsx(buffer: ArrayBuffer, fileName: string) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function pad5(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(5, '0');
}

const MIN_ORDRE_OPTION = 0;
const MAX_ORDRE_OPTION = 999;

function parseStrictOrdreOption(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) return null;
  if (value < MIN_ORDRE_OPTION || value > MAX_ORDRE_OPTION) return null;
  return value;
}

function normalizeOrdreOptionForCalc(value: unknown, fallback = 0): number {
  const strict = parseStrictOrdreOption(value);
  if (strict != null) return strict;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const floored = Math.floor(n);
  return Math.max(MIN_ORDRE_OPTION, Math.min(MAX_ORDRE_OPTION, floored));
}

function normalizePredecesseurKey(value: string): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const parts = raw.split('##').map((p) => p.trim());
  if (parts.length < 4) return raw;
  const [instance, ordreInstanceRaw, ordreGroupeRaw, module] = parts;
  const ordreInstance = /^\d+$/.test(ordreInstanceRaw) ? pad5(parseInt(ordreInstanceRaw, 10)) : ordreInstanceRaw;
  const ordreGroupe = /^\d+$/.test(ordreGroupeRaw) ? pad5(parseInt(ordreGroupeRaw, 10)) : ordreGroupeRaw;
  return `${instance}##${ordreInstance}##${ordreGroupe}##${module}`;
}

function normalizeNoAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function getPredecesseurValue(option: RefOption): string {
  const row = option as Record<string, unknown>;
  const directKeys = ['Predecesseur', 'predecesseur', 'Prédécesseur', 'prédécesseur', 'Predecessor', 'predecessor'];
  for (const key of directKeys) {
    const val = row[key];
    if (val != null && String(val).trim() !== '') return String(val).trim();
  }
  const fallbackKey = Object.keys(row).find((k) => {
    const nk = normalizeNoAccents(k);
    return nk.includes('predecesseur') || nk.includes('predecessor');
  });
  if (!fallbackKey) return '';
  const fallbackValue = row[fallbackKey];
  return fallbackValue != null ? String(fallbackValue).trim() : '';
}

function setPredecesseurValue(option: RefOption, value: string): RefOption {
  const row = option as Record<string, unknown>;
  const directKeys = ['Predecesseur', 'predecesseur', 'Prédécesseur', 'prédécesseur', 'Predecessor', 'predecessor'];
  for (const key of directKeys) {
    if (key in row) return { ...option, [key]: value };
  }
  const fallbackKey = Object.keys(row).find((k) => {
    const nk = normalizeNoAccents(k);
    return nk.includes('predecesseur') || nk.includes('predecessor');
  });
  if (fallbackKey) return { ...option, [fallbackKey]: value };
  return { ...option, Predecesseur: value };
}

export default function OrdonnancementView() {
  const { showSuccess } = useToast();
  const [instances, setInstances] = useState<RefInstance[]>([]);
  const [currentInstance, setCurrentInstance] = useState<string>('');
  const [importedCsvName, setImportedCsvName] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [organigrammeOpen, setOrganigrammeOpen] = useState(false);
  const [confirmReplaceImportOpen, setConfirmReplaceImportOpen] = useState(false);

  const handleImportRaw = async () => {
    setImportError(null);
    try {
      const result = await openCsvFile();
      if (!result) return;

      const parsed = parseRefCsv(result.text);
      setInstances(parsed);
      setImportedCsvName(result.fileName || '');
      if (parsed.length > 0) {
        setCurrentInstance(parsed[0].name);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erreur lors de l\'import CSV.');
    }
  };

  const handleImport = async () => {
    if (instances.length > 0) {
      setConfirmReplaceImportOpen(true);
      return;
    }
    await handleImportRaw();
  };

  const handleExport = () => {
    if (instances.length === 0) return;
    const base =
      (importedCsvName || 'referentielSabRobot')
        .replace(/\.[^.]+$/, '')
        .trim() || 'referentielSabRobot';

    const csv = generateRefCsv(instances);
    downloadCsv(csv, `${base}.csv`);

    const xlsx = generateRefXlsx(instances, 'Referentiel');
    downloadXlsx(xlsx, `${base}.xlsx`);
  };

  const currentInstanceData = instances.find((i) => i.name === currentInstance);
  const groups = currentInstanceData?.childreen ?? [];
  const [groupToDelete, setGroupToDelete] = useState<{ index: number; label: string } | null>(null);

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
    if (!currentInstance) return;
    const grp = groups[indexGrp];
    const label = grp?.name?.replace(/^#+\s*/, '') ?? `Groupe ${indexGrp + 1}`;
    setGroupToDelete({ index: indexGrp, label });
  };

  const confirmDeleteGroup = () => {
    if (!currentInstance || groupToDelete == null) return;
    const newGroups = groups.filter((_, i) => i !== groupToDelete.index);
    updateInstance(currentInstance, newGroups);
    setGroupToDelete(null);
    showSuccess('Groupe supprimé avec succès');
  };

  const moveGroup = (indexGrp: number, direction: 'up' | 'down') => {
    if (!currentInstance) return;
    if (direction === 'up' && indexGrp === 0) return;
    if (direction === 'down' && indexGrp === groups.length - 1) return;
    const newGroups = [...groups];
    const targetIndex = direction === 'up' ? indexGrp - 1 : indexGrp + 1;
    [newGroups[indexGrp], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[indexGrp]];
    const step = 100;
    // Recalcule uniquement lors d'un déplacement:
    // 1er groupe = 00100, 2e = 00200, etc.
    // On synchronise aussi OrdreModule de chaque option pour garder l'affichage cohérent.
    newGroups.forEach((g, i) => {
      const newOrder = step + i * step;
      g.orderModule = newOrder;
      g.childreen = (g.childreen ?? []).map((opt) => ({ ...opt, OrdreModule: newOrder }));
    });
    updateInstance(currentInstance, newGroups);
  };

  const updateOption = (indexGrp: number, indexOpt: number, opt: RefOption) => {
    if (!currentInstance) return;

    setInstances((prev) => {
      const currentInst = prev.find((inst) => inst.name === currentInstance);
      if (!currentInst) return prev;

      const groupsForCurrentInst = currentInst.childreen ?? [];
      const targetGroup = groupsForCurrentInst[indexGrp];
      const oldOption = targetGroup?.childreen?.[indexOpt];
      if (!targetGroup || !oldOption) return prev;

      const strictRequested = parseStrictOrdreOption(opt.ordreOption);
      if (strictRequested == null) {
        // Validation stricte 0-999 : si invalide, ne pas appliquer la modification.
        return prev;
      }

      const groupOrderModule = Number(targetGroup.orderModule ?? oldOption.OrdreModule ?? 0);
      const oldGroupOptions = targetGroup.childreen ?? [];
      const oldGroupByIndex = new Map<number, RefOption>();
      oldGroupOptions.forEach((o, idx) => oldGroupByIndex.set(idx, o));

      const reassignedByIndex = new Map<number, RefOption>();
      const targetPatched: RefOption = {
        ...opt,
        ordreOption: strictRequested,
        OrdreModule: groupOrderModule,
      };
      reassignedByIndex.set(indexOpt, targetPatched);

      // Gestion atomique des doublons :
      // on réserve la valeur cible puis on recale les autres options vers la prochaine valeur libre.
      const used = new Set<number>([strictRequested]);
      const others = oldGroupOptions
        .map((o, idx) => ({ o, idx }))
        .filter(({ idx }) => idx !== indexOpt)
        .sort((a, b) => {
          const oa = normalizeOrdreOptionForCalc(a.o.ordreOption, 0);
          const ob = normalizeOrdreOptionForCalc(b.o.ordreOption, 0);
          if (oa !== ob) return oa - ob;
          return a.idx - b.idx;
        });

      for (const { o, idx } of others) {
        let candidate = normalizeOrdreOptionForCalc(o.ordreOption, 0);
        while (used.has(candidate) && candidate <= MAX_ORDRE_OPTION) {
          candidate += 1;
        }
        if (candidate > MAX_ORDRE_OPTION) {
          candidate = MIN_ORDRE_OPTION;
          while (used.has(candidate) && candidate <= MAX_ORDRE_OPTION) {
            candidate += 1;
          }
          if (candidate > MAX_ORDRE_OPTION) {
            candidate = normalizeOrdreOptionForCalc(o.ordreOption, 0);
          }
        }
        used.add(candidate);
        reassignedByIndex.set(idx, {
          ...o,
          ordreOption: candidate,
          OrdreModule: groupOrderModule,
        });
      }

      const rebuiltGroupOptions = oldGroupOptions
        .map((_, idx) => reassignedByIndex.get(idx) ?? oldGroupByIndex.get(idx)!)
        .sort((a, b) => (normalizeOrdreOptionForCalc(a.ordreOption, 0) - normalizeOrdreOptionForCalc(b.ordreOption, 0)));

      // Mapping complet oldKey -> newKey pour toutes les options du groupe dont ordreOption a changé
      const predecessorRewrites = new Map<string, string>();
      for (let i = 0; i < oldGroupOptions.length; i += 1) {
        const oldOpt = oldGroupOptions[i];
        const newOpt = reassignedByIndex.get(i) ?? oldOpt;
        const oldOrdre = normalizeOrdreOptionForCalc(oldOpt.ordreOption, 0);
        const newOrdre = normalizeOrdreOptionForCalc(newOpt.ordreOption, 0);
        if (oldOrdre === newOrdre) continue;

        const sourceInstance = String(oldOpt.Instance ?? currentInstance).trim() || currentInstance;
        const sourceOrdreModule = Number(oldOpt.OrdreModule ?? targetGroup.orderModule ?? 0);
        const sourceModule = String(oldOpt.Module ?? newOpt.Module ?? '').trim();
        const oldKey = normalizePredecesseurKey(
          `${sourceInstance}##${pad5(sourceOrdreModule)}##${pad5(oldOrdre)}##${sourceModule}`
        );
        const newKey = normalizePredecesseurKey(
          `${sourceInstance}##${pad5(sourceOrdreModule)}##${pad5(newOrdre)}##${sourceModule}`
        );
        if (oldKey && newKey) predecessorRewrites.set(oldKey, newKey);
      }

      const updatedInstances = prev.map((inst) => {
        if (inst.name !== currentInstance) return inst;
        return {
          ...inst,
          childreen: (inst.childreen ?? []).map((g, i) =>
            i === indexGrp ? { ...g, childreen: rebuiltGroupOptions } : g
          ),
        };
      });

      if (predecessorRewrites.size === 0) return updatedInstances;

      return updatedInstances.map((inst) => ({
        ...inst,
        childreen: (inst.childreen ?? []).map((grp) => ({
          ...grp,
          childreen: (grp.childreen ?? []).map((candidate) => {
            const pred = getPredecesseurValue(candidate);
            if (!pred) return candidate;
            const normalizedPred = normalizePredecesseurKey(pred);
            const replacement = predecessorRewrites.get(normalizedPred);
            if (!replacement) return candidate;
            return setPredecesseurValue(candidate, replacement);
          }),
        })),
      }));
    });
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

  // Filtrage: soit on affiche uniquement les tests actifs, soit on affiche tous les groupes.
  // On ne fait pas de filtrage spécial sur l'index de l'instance (sinon certaines
  // instances peuvent manquer des groupes selon l'ordre des instances).
  const filteredGroups = showActiveOnly ? groups.filter((g) => g.childreen.some((o) => isOptionActif(o))) : groups;

  return (
    <Box minH="100vh" display="flex" flexDirection="column" bg="gray.50">
      <Box
        as="header"
        bg="white"
        borderBottomWidth="1px"
        borderColor="gray.200"
        boxShadow="0 1px 3px rgba(0,0,0,0.04)"
      >
        <Flex alignItems="center" justifyContent="space-between" px={6} py={4}>
          <Text fontSize="xl" fontWeight="bold" color="gray.900" letterSpacing="-0.02em">
            Ordonnancer les tests
          </Text>
          <Flex alignItems="center" gap={4}>
            {importedCsvName && (
              <Flex
                alignItems="center"
                gap={3}
                px={4}
                py={2.5}
                borderRadius="2xl"
                maxW="520px"
                borderWidth="1px"
                borderColor="rgba(59, 130, 246, 0.22)"
                bg="linear-gradient(135deg, rgba(59,130,246,0.10) 0%, rgba(255,255,255,0.95) 45%, rgba(59,130,246,0.06) 100%)"
                boxShadow="0 10px 24px rgba(15, 23, 42, 0.10), 0 2px 8px rgba(15, 23, 42, 0.06)"
                position="relative"
                overflow="hidden"
              >
                <Box
                  position="absolute"
                  inset={0}
                  bg="linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 55%)"
                  pointerEvents="none"
                />
                <Box
                  position="relative"
                  flexShrink={0}
                  w="34px"
                  h="34px"
                  borderRadius="xl"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bg="rgba(59,130,246,0.14)"
                  color="#2563EB"
                >
                  <FolderOpen size={18} strokeWidth={2} />
                </Box>
                <Box position="relative" minW={0}>
                  <Text fontSize="xs" color="gray.600" lineClamp={1}>
                    Fichier importé
                  </Text>
                  <Text
                    fontSize="sm"
                    fontWeight="bold"
                    color="gray.900"
                    lineClamp={1}
                    title={importedCsvName}
                    letterSpacing="-0.01em"
                  >
                    {importedCsvName}
                  </Text>
                </Box>
              </Flex>
            )}
            <Button
              variant="outline"
              size="sm"
              gap={2}
              px={4}
              py={2.5}
              fontWeight="medium"
              borderRadius="xl"
              borderColor="#3B82F6"
              color="#3B82F6"
              _hover={{ bg: 'blue.50', borderColor: '#2563EB' }}
              transition="all 0.2s ease"
              onClick={handleImport}
            >
              <Upload size={16} />
              Importer CSV
            </Button>
            <Button
              size="sm"
              gap={2}
              px={4}
              py={2.5}
              fontWeight="medium"
              borderRadius="xl"
              bg="#3B82F6"
              color="white"
              boxShadow="0 2px 8px rgba(59, 130, 246, 0.25)"
              _hover={{ bg: '#2563EB', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)', transform: 'translateY(-1px)' }}
              _active={{ transform: 'translateY(0)' }}
              transition="all 0.2s ease"
              onClick={handleExport}
              disabled={instances.length === 0}
            >
              <Download size={16} />
              Sauvegarder
            </Button>
          </Flex>
        </Flex>
      </Box>

      {/* Dialog Confirmation suppression groupe */}
      <Dialog.Root open={!!groupToDelete} onOpenChange={(e) => !e.open && setGroupToDelete(null)}>
        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <Dialog.Positioner>
          <Dialog.Content maxW="420px" borderRadius="xl" boxShadow="xl" bg="white" borderWidth="1px" borderColor="gray.200">
            <Dialog.Header borderBottomWidth="1px" borderColor="gray.100" py={4} px={6}>
              <Dialog.Title fontSize="lg" fontWeight="semibold">
                Supprimer le groupe
              </Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body py={6} px={6}>
              <Text fontSize="sm" color="gray.600">
                Êtes-vous sûr de vouloir supprimer le groupe &quot;{groupToDelete?.label}&quot; ? Cette action est irréversible.
              </Text>
              <Flex justifyContent="flex-end" gap={3} mt={5}>
                <Button
                  size="sm"
                  variant="outline"
                  px={4}
                  py={2}
                  borderRadius="lg"
                  borderColor="#3B82F6"
                  color="#3B82F6"
                  _hover={{ bg: 'rgba(59, 130, 246, 0.08)', borderColor: '#2563EB' }}
                  transition="all 0.2s"
                  onClick={() => setGroupToDelete(null)}
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  px={4}
                  py={2}
                  borderRadius="lg"
                  fontWeight="medium"
                  bg="red.500"
                  color="white"
                  boxShadow="0 2px 6px rgba(220, 38, 38, 0.25)"
                  _hover={{ bg: 'red.600', boxShadow: '0 3px 10px rgba(220, 38, 38, 0.3)', transform: 'translateY(-1px)' }}
                  _active={{ transform: 'translateY(0)' }}
                  transition="all 0.2s"
                  onClick={confirmDeleteGroup}
                >
                  Supprimer
                </Button>
              </Flex>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Flex flex="1" overflow="hidden">
        <Box
          as="aside"
          w="260px"
          bg="white"
          borderRightWidth="1px"
          borderColor="gray.200"
          flexShrink={0}
          boxShadow="2px 0 12px rgba(0,0,0,0.03)"
        >
          {instances.length > 0 && (
            <Box p={4} borderBottomWidth="1px" borderColor="gray.100">
              <Button
                variant="outline"
                size="sm"
                w="full"
                gap={2}
                onClick={() => setOrganigrammeOpen(true)}
                borderColor="gray.200"
                borderRadius="xl"
                _hover={{ borderColor: '#3B82F6', bg: 'blue.50', color: '#3B82F6' }}
                transition="all 0.2s"
              >
                <Network size={16} />
                Organigramme
              </Button>
            </Box>
          )}
          <Box p={4}>
            <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wider" mb={3}>
              Instances
            </Text>
            {instances.length === 0 ? (
              <Text fontSize="sm" color="gray.500" lineHeight="tall">
                Importez un CSV pour afficher les instances
              </Text>
            ) : (
              <Box display="flex" flexDirection="column" gap={2}>
                {instances.map((inst) => {
                  // Compteur dynamique: nombre réel de groupes présents dans l'instance.
                  const groupCount = (inst.childreen ?? []).filter((g) => !!g).length;
                  const isSelected = currentInstance === inst.name;
                  return (
                    <Box
                      key={inst.name}
                      p={3}
                      bg={isSelected ? 'blue.50' : 'transparent'}
                      borderWidth="1px"
                      borderColor={isSelected ? '#3B82F6' : 'transparent'}
                      borderRadius="xl"
                      cursor="pointer"
                      boxShadow={
                        isSelected
                          ? '0 10px 22px rgba(15, 23, 42, 0.14), 0 4px 10px rgba(15, 23, 42, 0.10)'
                          : '0 6px 14px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.06)'
                      }
                      _hover={{
                        bg: isSelected ? 'blue.50' : 'gray.50',
                        borderColor: isSelected ? '#3B82F6' : 'gray.200',
                        boxShadow: isSelected
                          ? '0 10px 22px rgba(15, 23, 42, 0.14), 0 4px 10px rgba(15, 23, 42, 0.10)'
                          : '0 8px 18px rgba(15, 23, 42, 0.10), 0 3px 8px rgba(15, 23, 42, 0.08)',
                      }}
                      transition="all 0.2s"
                      onClick={() => setCurrentInstance(inst.name)}
                    >
                      <Flex alignItems="center" gap={2}>
                        <Box flexShrink={0}>
                          <FolderOpen
                            size={16}
                            color={isSelected ? '#3B82F6' : '#64748b'}
                          />
                        </Box>
                        <Text fontWeight="medium" fontSize="sm" lineClamp={1} color={isSelected ? 'gray.900' : 'gray.700'}>
                          {inst.name}
                        </Text>
                      </Flex>
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        {groupCount} groupe(s)
                      </Text>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>

        <Box as="main" flex="1" overflowY="auto" p={8}>
          {importError && (
            <Box mb={4} p={4} bg="red.50" color="red.700" borderRadius="xl" fontSize="sm" borderWidth="1px" borderColor="red.200">
              {importError}
            </Box>
          )}

          {!currentInstance ? (
            <Flex
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              py={24}
              px={6}
            >
              <Box
                p={5}
                borderRadius="2xl"
                bg="white"
                borderWidth="1px"
                borderColor="gray.200"
                boxShadow="0 4px 20px rgba(0,0,0,0.06)"
                mb={6}
              >
                <Upload size={48} color="#94a3b8" />
              </Box>
              <Text fontSize="xl" fontWeight="semibold" color="gray.800" mb={2}>
                Aucun fichier importé
              </Text>
              <Text fontSize="sm" color="gray.500" mb={6} textAlign="center" maxW="md" lineHeight="tall">
                Importez un fichier CSV référentiel (séparateur ;) pour gérer l&apos;ordonnancement des tests.
              </Text>
              <Button
                onClick={handleImport}
                size="md"
                gap={2}
                px={5}
                py={3}
                fontWeight="semibold"
                borderRadius="xl"
                bg="#3B82F6"
                color="white"
                boxShadow="0 4px 14px rgba(59, 130, 246, 0.25)"
                _hover={{ bg: '#2563EB', boxShadow: '0 6px 20px rgba(59, 130, 246, 0.35)', transform: 'translateY(-2px)' }}
                _active={{ transform: 'translateY(0)' }}
                transition="all 0.2s ease"
              >
                <Upload size={18} />
                Importer un fichier CSV
              </Button>
            </Flex>
          ) : (
            <>
              <Flex mb={6} alignItems="center" gap={6} flexWrap="wrap">
                <Text fontSize="2xl" fontWeight="bold" color="gray.900" letterSpacing="-0.02em">
                  {currentInstance}
                </Text>
                <Flex alignItems="center" gap={3} cursor="pointer">
                  <Switch.Root
                    size="sm"
                    checked={showActiveOnly}
                    onCheckedChange={(e) => setShowActiveOnly(typeof e === 'boolean' ? e : e.checked)}
                    colorPalette={showActiveOnly ? 'blue' : 'gray'}
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                  <Text fontSize="sm" color="gray.600">
                    Afficher uniquement les tests actifs
                  </Text>
                </Flex>
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
                    const groupLabel = grp.name.replace(/^#+\s*/, '');
                    // Affichage: valeur numérique de l'instance telle qu'elle existe dans le CSV.
                    // On la déduit des options du groupe (colonne OrdreDansInstance / OrdreModule).
                    const instanceOrderRaw = (grp.childreen ?? [])
                      .map((o) => Number(o.OrdreModule ?? 0))
                      .filter((n) => Number.isFinite(n));
                    const instanceOrderMin = instanceOrderRaw.length ? Math.min(...instanceOrderRaw) : 0;
                    const instanceOrderFormatted = String(instanceOrderMin).padStart(5, '0');
                    const itemValue = `grp-${indexGrp}`;
                    const isOpen = openGroups.includes(itemValue);
                    return (
                      <Accordion.Item key={indexGrp} value={itemValue}>
                        <Box
                          bg="white"
                          borderWidth="1px"
                          borderRadius="2xl"
                          overflow="hidden"
                          borderColor="gray.200"
                          boxShadow="0 14px 28px rgba(15, 23, 42, 0.14), 0 6px 12px rgba(15, 23, 42, 0.10)"
                          _hover={{
                            boxShadow: '0 14px 28px rgba(15, 23, 42, 0.14), 0 6px 12px rgba(15, 23, 42, 0.10)',
                            borderColor: 'gray.300',
                          }}
                          transition="all 0.2s ease"
                        >
                          <Accordion.ItemTrigger asChild>
                            <Box
                              as="button"
                              w="full"
                              textAlign="left"
                              p={4}
                              bg="linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,0.9) 100%)"
                              _hover={{ bg: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(241,245,249,0.9) 100%)' }}
                            >
                              <Flex alignItems="center" justifyContent="space-between" gap={4} w="full">
                                <Flex alignItems="center" gap={3} flex="1" minW={0}>
                                  <Box as="span" display="inline-flex" flexShrink={0}>
                                    {isOpen ? (
                                      <ChevronDown size={18} color="var(--chakra-colors-gray-700)" />
                                    ) : (
                                      <ChevronRight size={18} color="var(--chakra-colors-gray-700)" />
                                    )}
                                  </Box>
                                  <Text fontWeight="bold" color="gray.900" lineClamp={1}>
                                    {groupLabel} – {instanceOrderFormatted}
                                  </Text>
                                </Flex>
                                <Flex alignItems="center" gap={1} flexShrink={0} ml="auto" onClick={(e) => e.stopPropagation()}>
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
                            <Box pt={4} pb={4} px={4} borderTopWidth="1px" borderColor="gray.100" bg="gray.50">
                              {grp.childreen
                                .sort((a, b) => (a.ordreOption ?? 0) - (b.ordreOption ?? 0))
                                .map((opt, indexOpt) => {
                                  const indexOptInGroup = grp.childreen.findIndex((o) => o === opt);
                                  return (
                                    <FormInputRef
                                      key={indexOpt}
                                      option={opt}
                                      onUpdate={(o) => updateOption(grpIndex, indexOptInGroup, o)}
                                      onDelete={() => deleteOption(grpIndex, indexOptInGroup)}
                                    />
                                  );
                                })}
                            </Box>
                          </Accordion.ItemContent>
                        </Box>
                      </Accordion.Item>
                    );
                  })}
                </Box>
              </Accordion.Root>

              {/* Bouton Ajouter un groupe */}
              <Box
                as="button"
                onClick={addGroup}
                w="full"
                p={5}
                borderWidth="2px"
                borderStyle="dashed"
                borderColor="gray.300"
                borderRadius="2xl"
                bg="white"
                _hover={{ borderColor: '#3B82F6', bg: 'blue.50', color: '#3B82F6' }}
                transition="all 0.2s ease"
              >
                <Flex alignItems="center" justifyContent="center" gap={2} color="gray.500">
                  <Plus size={18} />
                  <Text fontWeight="medium">Ajouter un groupe</Text>
                </Flex>
              </Box>
            </>
          )}
        </Box>
      </Flex>

      {/* Dialog Confirmation remplacement CSV référentiel */}
      <Dialog.Root open={confirmReplaceImportOpen} onOpenChange={(e) => !e.open && setConfirmReplaceImportOpen(false)}>
        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <Dialog.Positioner>
          <Dialog.Content
            maxW="420px"
            borderRadius="xl"
            boxShadow="xl"
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setConfirmReplaceImportOpen(false);
                handleImportRaw();
              }
            }}
          >
            <Dialog.Header borderBottomWidth="1px" borderColor="gray.100" py={4} px={6}>
              <Dialog.Title fontSize="lg" fontWeight="semibold">
                Remplacer le fichier CSV
              </Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body py={6} px={6}>
              <Text fontSize="sm" color="gray.600">
                Un référentiel est déjà chargé. Souhaitez-vous l&apos;abandonner et en importer un autre ?
              </Text>
              <Flex justifyContent="flex-end" gap={3} mt={5}>
                <Button
                  size="sm"
                  variant="outline"
                  px={4}
                  py={2}
                  borderRadius="lg"
                  borderColor="#3B82F6"
                  color="#3B82F6"
                  _hover={{ bg: 'rgba(59, 130, 246, 0.08)', borderColor: '#2563EB' }}
                  transition="all 0.2s"
                  onClick={() => setConfirmReplaceImportOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  px={4}
                  py={2}
                  fontWeight="medium"
                  borderRadius="lg"
                  bg="#3B82F6"
                  color="white"
                  boxShadow="0 2px 6px rgba(59, 130, 246, 0.22)"
                  _hover={{ bg: '#2563EB', boxShadow: '0 3px 10px rgba(59, 130, 246, 0.3)', transform: 'translateY(-1px)' }}
                  _active={{ transform: 'translateY(0)' }}
                  transition="all 0.2s"
                  onClick={async () => {
                    setConfirmReplaceImportOpen(false);
                    await handleImportRaw();
                  }}
                >
                  Oui, importer un autre fichier
                </Button>
              </Flex>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <OrganigrammeModal
        isOpen={organigrammeOpen}
        onClose={() => setOrganigrammeOpen(false)}
        instances={instances}
      />
    </Box>
  );
}
