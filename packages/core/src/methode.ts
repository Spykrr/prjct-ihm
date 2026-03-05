/**
 * Supprime les séparateurs ## d'une chaîne
 */
export function removeHashes(str: string): string {
  if (typeof str !== 'string') return '';
  return str.replace(/##/g, '');
}
