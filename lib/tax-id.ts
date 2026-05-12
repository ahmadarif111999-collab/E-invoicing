type TaxIdKind = 'NTN' | 'STRN' | 'CNIC';

type ValidateTaxIdOptions = {
  value?: string | null;
  label: string;
  kind: TaxIdKind;
  length: number;
};

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function normalizeAllowedSeparators(value: string) {
  return value.replace(/[\s-]/g, '');
}

export function normalizeDigits(value?: string | null) {
  const raw = String(value || '').trim();

  if (!raw) {
    return null;
  }

  if (/[^0-9\s-]/.test(raw)) {
    throw badRequest('Tax registration fields can only contain digits, spaces, or hyphens.');
  }

  return normalizeAllowedSeparators(raw);
}

function validateTaxId({ value, label, kind, length }: ValidateTaxIdOptions) {
  const digits = normalizeDigits(value);

  if (!digits) {
    return null;
  }

  if (!/^\d+$/.test(digits) || digits.length !== length) {
    throw badRequest(`${label} must be exactly ${length} digits for ${kind}.`);
  }

  return digits;
}

export function validateNtn(value?: string | null, label = 'NTN') {
  return validateTaxId({
    value,
    label,
    kind: 'NTN',
    length: 7
  });
}

export function validateStrn(value?: string | null, label = 'STRN') {
  return validateTaxId({
    value,
    label,
    kind: 'STRN',
    length: 13
  });
}

export function validateCnic(value?: string | null, label = 'CNIC') {
  return validateTaxId({
    value,
    label,
    kind: 'CNIC',
    length: 13
  });
}
