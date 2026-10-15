// ─────────────────────────────────────────────────────────────────────────────
// QXLITS ID utility — client-side validation and preview
//
// Real IDs are always generated server-side via Postgres functions.
// This module provides:
//   - Luhn check digit (mirrors the DB function)
//   - Client-side validation for user input
//   - Preview generators (for UI display before the server assigns a real ID)
//   - RFID tag number formatter (ISO 11784 / Somalia country code 706)
// ─────────────────────────────────────────────────────────────────────────────

// ── Luhn Mod-10 check digit ───────────────────────────────────────────────────
function luhnCheckDigit(input: string): string {
  const digits = input.replace(/[^0-9]/g, '');
  let sum = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if ((digits.length - i) % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return String((10 - (sum % 10)) % 10);
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * Validates any QXLITS formatted ID by recomputing its check digit.
 *
 * Examples of valid IDs:
 *   SO-PRM-MUD-000001-7
 *   SO-BAT-2026-MUD-000001-3
 *   SO-TRQ-2026-MUD-00001-9
 *   SO-MOV-2026-BAR-000001-5
 */
export function validateQxlitsId(id: string): boolean {
  const parts = id.trim().toUpperCase().split('-');
  if (parts.length < 4) return false;
  if (parts[0] !== 'SO') return false;
  const check = parts[parts.length - 1];
  const body = parts.slice(1, -1).join('-');
  const digits = body.replace(/[^0-9]/g, '');
  if (!digits) return false;
  return luhnCheckDigit(digits) === check;
}

/**
 * Returns a human-readable error message if the ID is invalid, or null if valid.
 */
export function qxlitsIdError(id: string): string | null {
  const clean = id.trim().toUpperCase();
  if (!clean) return 'ID is required.';
  if (!clean.startsWith('SO-')) return 'QXLITS IDs must start with SO-.';
  if (!validateQxlitsId(clean)) return 'Invalid ID — check digit does not match. Please re-enter carefully.';
  return null;
}

// ── Preview generators (client-side only) ─────────────────────────────────────
// These generate IDs for display purposes. The server assigns the real ID
// (with the correct atomic sequence) on save.

function buildId(prefix: string, regionCode: string, seq: number, seqLen: number, year?: number): string {
  const reg    = regionCode.toUpperCase();
  const seqStr = String(seq).padStart(seqLen, '0');
  const digits = (year ? String(year) : '') + reg.replace(/[^0-9]/g, '') + seqStr;
  const check  = luhnCheckDigit(digits);
  const yearPart = year ? `-${year}` : '';
  return `SO-${prefix}${yearPart}-${reg}-${seqStr}-${check}`;
}

/**
 * Preview a Premises ID.
 * Real format: SO-PRM-[REG]-[SEQ6]-[C]
 */
export function previewPremisesId(regionCode: string, seq = 1): string {
  return buildId('PRM', regionCode, seq, 6);
}

/**
 * Preview a Batch ID.
 * Real format: SO-BAT-[YYYY]-[REG]-[SEQ6]-[C]
 */
export function previewBatchId(regionCode: string, seq = 1, year = new Date().getFullYear()): string {
  return buildId('BAT', regionCode, seq, 6, year);
}

/**
 * Preview a Tag Request ID.
 * Real format: SO-TRQ-[YYYY]-[REG]-[SEQ5]-[C]
 */
export function previewTagRequestId(regionCode: string, seq = 1, year = new Date().getFullYear()): string {
  return buildId('TRQ', regionCode, seq, 5, year);
}

/**
 * Preview a Tag Allocation ID.
 * Real format: SO-TAL-[YYYY]-[REG]-[SEQ5]-[C]
 */
export function previewTagAllocationId(regionCode: string, seq = 1, year = new Date().getFullYear()): string {
  return buildId('TAL', regionCode, seq, 5, year);
}

/**
 * Preview a Movement ID.
 * Real format: SO-MOV-[YYYY]-[REG]-[SEQ6]-[C]
 * Region = origin premises region.
 */
export function previewMovementId(regionCode: string, seq = 1, year = new Date().getFullYear()): string {
  return buildId('MOV', regionCode, seq, 6, year);
}

// ── RFID / Animal tag number ──────────────────────────────────────────────────

/**
 * Formats an animal RFID number per ISO 11784.
 * Somalia country code: 706
 * Format: 706 + 12-digit individual number = 15 digits total
 *
 * Example: formatRfidNumber(1) → '706000000000001'
 */
export function formatRfidNumber(individualSeq: number): string {
  return `706${String(individualSeq).padStart(12, '0')}`;
}

/**
 * Validates an ISO 11784 Somalia RFID number (15 digits, starts with 706).
 */
export function validateRfidNumber(tag: string): boolean {
  return /^706\d{12}$/.test(tag.trim());
}

// ── ID type detector ──────────────────────────────────────────────────────────

export type QxlitsIdType = 'PRM' | 'BAT' | 'TRQ' | 'TAL' | 'MOV' | 'UNKNOWN';

export function detectQxlitsIdType(id: string): QxlitsIdType {
  const parts = id.trim().toUpperCase().split('-');
  if (parts[0] !== 'SO' || parts.length < 2) return 'UNKNOWN';
  const t = parts[1] as QxlitsIdType;
  return ['PRM', 'BAT', 'TRQ', 'TAL', 'MOV'].includes(t) ? t : 'UNKNOWN';
}
