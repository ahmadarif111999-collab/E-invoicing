export function normalizeCodePrefix(value?: string | null) {
  const cleaned = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);

  return cleaned || 'INV';
}

export function buildItemCode(prefix?: string | null, sequence = 1) {
  const cleanPrefix = normalizeCodePrefix(prefix);
  const safeSequence = Math.max(1, Number(sequence || 1));

  return `${cleanPrefix}-ITEM-${String(safeSequence).padStart(6, '0')}`;
}
