/**
 * Validation du format Predecesseur
 * Format attendu : Instance##OrdreModule(5 chiffres)##OrdreOption(5 chiffres)##Module
 * Exemple : Inst01##02600##00240##PTF
 */
const PREDECESSEUR_REGEX = /^[^#]+(##[^#]+){3}$/;

export function isValidFormat(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return PREDECESSEUR_REGEX.test(value.trim());
}

export function isValidFormatHashTag(value: string): boolean {
  return isValidFormat(value);
}

export function showMessageError(value: string): string {
  if (isValidFormat(value)) return '';
  return 'Format invalide. Attendu : Instance##OrdreModule(5ch)##OrdreOption(5ch)##Module (ex: Inst01##02600##00240##PTF)';
}
