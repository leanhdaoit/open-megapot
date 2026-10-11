/**
 * ---
 * @skill      https://llms.megapot.io/tasks/claim-referral-fees
 * @customize  Wallet-optional appearance, referrer and API key settings. Save a non-zero EVM address
 *             in localStorage, or save blank to restore the env/dead fallback.
 *             This changes attribution for future purchases, not existing tickets.
 * ---
 */
import { useQueryClient } from '@tanstack/react-query';
import { useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/common/Button';
import { PageIntro } from '@/components/common/PageIntro';
import { REFERRER_ADDRESS, REFERRER_DEAD_DEFAULT } from '@/config/contracts';
import { COPY } from '@/config/copy';
import { API_BASE_URL, QK } from '@/lib/api';
import { getSavedApiKey, isValidApiKey, saveApiKey } from '@/lib/apiKey';
import {
  getSavedReferralAddress,
  normalizeReferralAddress,
  saveReferralAddress,
  subscribeReferralAddress,
} from '@/lib/referral';
import {
  getThemePreference,
  saveThemePreference,
  subscribeTheme,
  type ThemePreference,
} from '@/lib/theme';

export function Settings() {
  const saved = useSyncExternalStore(subscribeReferralAddress, getSavedReferralAddress, () => null);
  const [draft, setDraft] = useState(() => saved ?? '');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const effective = saved ?? REFERRER_ADDRESS;
  const isDead = effective.toLowerCase() === REFERRER_DEAD_DEFAULT.toLowerCase();

  return (
    <div className="page-content space-y-6">
      <PageIntro
        eyebrow={COPY.settingsEyebrow}
        title={COPY.settingsTitle}
        description={COPY.settingsDescription}
      />
      <AppearanceSettings />
      <form
        className="card-pad-lg max-w-3xl space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage('');
          if (draft.trim() && !normalizeReferralAddress(draft)) {
            setError(COPY.referralInvalid);
            return;
          }
          try {
            saveReferralAddress(draft);
            setDraft(getSavedReferralAddress() ?? '');
            setError('');
            setMessage(COPY.referralSaved);
          } catch {
            setError(COPY.referralStorageError);
          }
        }}
      >
        <div className="space-y-2">
          <label htmlFor="referral-address" className="block text-sm font-semibold">
            {COPY.referralAddressLabel}
          </label>
          <input
            id="referral-address"
            type="text"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError('');
              setMessage('');
            }}
            placeholder="0x…"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={`referral-help${error ? ' referral-error' : ''}`}
            className="w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-4 py-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <p id="referral-help" className="text-sm text-zinc-600 dark:text-zinc-400">
            {COPY.referralHelp}
          </p>
        </div>
        {error && (
          <p id="referral-error" role="alert" className="text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}
        <Button type="submit">{COPY.referralSave}</Button>
        <p role="status" className="text-sm text-brand-primary-700 dark:text-brand-primary-300">
          {message}
        </p>
        <div className="space-y-2 border-t border-zinc-200 pt-5 dark:border-zinc-800">
          <h2 className="text-sm font-semibold">{COPY.referralEffective}</h2>
          <p className="break-all font-mono text-sm">{effective}</p>
          <p className="text-xs text-zinc-500">
            {saved ? COPY.referralSourceLocal : COPY.referralSourceDefault}
          </p>
          {isDead && (
            <p className="text-sm text-amber-800 dark:text-amber-200">{COPY.referralDeadWarning}</p>
          )}
        </div>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {COPY.referralScope}
        </p>
      </form>
      <ApiKeyForm />
    </div>
  );
}

function ApiKeyForm() {
  const queryClient = useQueryClient();
  const [key, setKey] = useState(() => getSavedApiKey() ?? '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="card-pad-lg max-w-3xl space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaved(false);
        if (key.trim() && !isValidApiKey(key)) {
          setError(COPY.apiKeyInvalid);
          return;
        }
        try {
          saveApiKey(key);
          setKey(getSavedApiKey() ?? '');
          setError('');
          setSaved(true);
        } catch {
          setError(COPY.referralStorageError);
          return;
        }
        await queryClient.cancelQueries({ queryKey: [QK.NS, API_BASE_URL] });
        await queryClient.invalidateQueries({ queryKey: [QK.NS, API_BASE_URL] });
      }}
    >
      <label htmlFor="api-key" className="block text-sm font-semibold">
        {COPY.apiKeyLabel}
      </label>
      <p id="api-key-help" className="text-sm text-zinc-600 dark:text-zinc-400">
        {COPY.apiKeyHelp}{' '}
        <a
          href="https://megapot.io/dashboard"
          target="_blank"
          rel="noreferrer"
          className="text-brand-primary-700 underline dark:text-brand-primary-300"
        >
          megapot.io/dashboard
        </a>
        .
      </p>
      <input
        id="api-key"
        type="password"
        placeholder="mpk_live_****"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={key}
        onChange={(event) => {
          setKey(event.target.value);
          setError('');
          setSaved(false);
        }}
        aria-invalid={!!error}
        aria-describedby={`api-key-help api-key-storage${error ? ' api-key-error' : ''}`}
        className="w-full min-w-0 rounded-xl border border-zinc-300 bg-white px-4 py-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
      <p id="api-key-storage" className="text-sm text-zinc-600 dark:text-zinc-400">
        {COPY.apiKeyStorage}
      </p>
      {error && (
        <p id="api-key-error" role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
      <Button type="submit">{COPY.apiKeySave}</Button>
      <p role="status" className="text-sm text-brand-primary-700 dark:text-brand-primary-300">
        {saved ? COPY.apiKeySaved : ''}
      </p>
    </form>
  );
}

function AppearanceSettings() {
  const preference = useSyncExternalStore(subscribeTheme, getThemePreference, () => 'system');
  const [error, setError] = useState('');
  return (
    <section className="card-pad-lg max-w-3xl space-y-3">
      <h2 className="text-lg font-semibold">Appearance</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Choose your theme. Default follows your device’s appearance. Your choice is saved in this
        browser.
      </p>
      <fieldset className="flex flex-wrap gap-3">
        <legend className="sr-only">Theme</legend>
        {(['system', 'light', 'dark'] as const).map((value: ThemePreference) => (
          <label
            key={value}
            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 ${preference === value ? 'border-brand-primary-500 bg-brand-primary-50 dark:bg-brand-primary-950' : 'border-zinc-300 dark:border-zinc-700'}`}
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={preference === value}
              onChange={() => {
                try {
                  saveThemePreference(value);
                  setError('');
                } catch {
                  setError(
                    'Unable to save your theme. Please allow browser storage and try again.',
                  );
                }
              }}
            />
            {value === 'system' ? 'System' : value === 'light' ? 'Light' : 'Dark'}
          </label>
        ))}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">
          {error}
        </p>
      )}
    </section>
  );
}
