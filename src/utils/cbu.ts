/** Extrae solo dígitos de un CBU (permite pegar con espacios o guiones). */
export function normalizeCbu(raw: string): string {
  return raw.replace(/\D/g, '');
}

export const CBU_LENGTH = 22;
