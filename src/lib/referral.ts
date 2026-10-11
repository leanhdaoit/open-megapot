/**
 * ---
 * @customize  Browser-local referral preference. A valid saved address overrides
 *             REFERRER_ADDRESS (env → dead default). Read at transaction submission
 *             so existing mounted purchase forms never use a stale preference.
 *             Invalid/unavailable storage is ignored; failed saves are reported.
 * ---
 */
import { type Address, getAddress, isAddress, zeroAddress } from 'viem';
import { REFERRER_ADDRESS } from '@/config/contracts';

export const REFERRAL_STORAGE_KEY = 'open-megapot:referrer-address';
const CHANGE_EVENT = 'open-megapot:referrer-changed';

export function normalizeReferralAddress(value: string): Address | null {
  const trimmed = value.trim();
  if (!isAddress(trimmed) || trimmed.toLowerCase() === zeroAddress) return null;
  return getAddress(trimmed);
}

export function getSavedReferralAddress(): Address | null {
  try {
    const value = window.localStorage.getItem(REFERRAL_STORAGE_KEY);
    return value ? normalizeReferralAddress(value) : null;
  } catch {
    return null;
  }
}

export function getReferralAddress(): Address {
  return getSavedReferralAddress() ?? REFERRER_ADDRESS;
}

/** Blank input clears the override; storage errors propagate to the form. */
export function saveReferralAddress(value: string): void {
  const trimmed = value.trim();
  const normalized = normalizeReferralAddress(trimmed);
  if (trimmed && !normalized) throw new Error('Invalid referral address');
  if (normalized) window.localStorage.setItem(REFERRAL_STORAGE_KEY, normalized);
  else window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeReferralAddress(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === REFERRAL_STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
