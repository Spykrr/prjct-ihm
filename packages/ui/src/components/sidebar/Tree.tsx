import { Box, Text } from '@chakra-ui/react';
import { useSidebar } from '../../contexts/useSidebar';
import type { SheetRow } from '@uptest/core';

const COLUMN_TYPE = '${type}';
const COLUMN_ID = '${id}';

export default function Tree() {
  const { feuillesData, activeTab, currentFeuille, setCurrentTest } = useSidebar();

  const sheetData = feuillesData[activeTab]?.[currentFeuille];
  const rows: SheetRow[] = Array.isArray(sheetData) ? (sheetData as SheetRow[]) : [];

  const tests = rows.filter((r) => r[COLUMN_TYPE] === 'TEST' || r[COLUMN_TYPE] === 'TEST-MODEL');

  const handleRunTest = async (itemLabel: string) => {
    if (typeof window !== 'undefined' && (window as unknown as { electronAPI?: { generateCsvAndRun: (d: unknown) => Promise<unknown> } }).electronAPI) {
      const { generateExcel } = await import('@uptest/core');
      const testToRun = rows.filter(
        (r) => r[COLUMN_ID] === itemLabel || r[COLUMN_TYPE] === 'INIT'
      );
      const buffer = generateExcel(testToRun, currentFeuille);
      const api = (window as unknown as { electronAPI: { generateCsvAndRun: (d: unknown) => Promise<{ success: boolean }> } }).electronAPI;
      const result = await api.generateCsvAndRun({
        nomFichier: 'test.xlsx',
        feuille: currentFeuille,
        excelBuffer: Array.from(new Uint8Array(buffer)),
      });
      if (result?.success) {
        console.log('Test exécuté avec succès');
      }
    }
  };

  return (
    <Box>
      <Text fontSize="sm" color="gray.400" mb={2}>
        Feuille: {currentFeuille}
      </Text>
      {tests.length === 0 ? (
        <Text fontSize="sm" color="gray.500">
          Aucun test
        </Text>
      ) : (
        <Box>
          {tests.map((t, i) => (
            <Box
              key={i}
              p={2}
              mb={1}
              borderRadius="md"
              cursor="pointer"
              _hover={{ bg: 'gray.700' }}
              onClick={() => {
                setCurrentTest(t[COLUMN_ID] || '');
              }}
            >
              <Text fontSize="sm">{t[COLUMN_ID] || `Test ${i + 1}`}</Text>
              <Text
                as="button"
                fontSize="xs"
                color="blue.400"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRunTest(t[COLUMN_ID] || '');
                }}
              >
                Exécuter
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
