/**
 * ---
 * @customize CSV upload and multiline ticket entry. Files populate an editable
 *             preview; adding validates every row against current round bounds.
 * ---
 */
import { useId, useRef, useState } from 'react';
import { BONUSBALL_MIN } from '@/config/contracts';
import { parseTicketImport, type TicketImportError } from '@/lib/ticketImport';
import type { CustomTicket } from '@/lib/tickets';

export function TicketImport({
  ballMax,
  bonusballMax,
  capacity,
  onImport,
}: {
  ballMax: number;
  bonusballMax: number;
  capacity: number;
  onImport: (tickets: CustomTicket[]) => void;
}) {
  const id = useId();
  const readVersion = useRef(0);
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<TicketImportError[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <details className="space-y-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700">
      <summary className="cursor-pointer font-semibold">Import CSV or paste tickets</summary>
      <p id={`${id}-help`} className="text-sm text-zinc-600 dark:text-zinc-400">
        One ticket per line: 5 unique main numbers (1–{ballMax}), then 1 bonus ({BONUSBALL_MIN}–
        {bonusballMax}). Separate numbers with commas or spaces. CSV must have no header. Blank
        lines are ignored. Tickets are added to your current list and selected. Up to {capacity}{' '}
        more tickets.
      </p>
      <label className="block space-y-2">
        <span>CSV file</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="block w-full text-sm"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            const version = ++readVersion.current;
            setErrors([]);
            setStatus('');
            if (file.size > 2 * 1024 * 1024) {
              setLoading(false);
              setErrors([
                { line: 0, value: file.name, message: 'File must be no larger than 2 MB.' },
              ]);
              return;
            }
            setLoading(true);
            try {
              const content = await file.text();
              if (version !== readVersion.current) return;
              setText(content);
              setErrors(parseTicketImport(content, { ballMax, bonusballMax }, capacity).errors);
            } catch {
              if (version === readVersion.current)
                setErrors([
                  { line: 0, value: file.name, message: 'Unable to read this file. Try again.' },
                ]);
            } finally {
              if (version === readVersion.current) setLoading(false);
            }
          }}
        />
      </label>
      <label htmlFor={id} className="block">
        Paste or edit tickets
      </label>
      <textarea
        id={id}
        rows={6}
        value={text}
        aria-describedby={`${id}-help`}
        aria-invalid={errors.length > 0}
        placeholder={'1,2,3,4,5,1\n6,7,8,9,10,2'}
        className="w-full rounded-xl border border-zinc-300 bg-white p-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
        onChange={(event) => {
          readVersion.current++;
          setLoading(false);
          setText(event.target.value);
          setErrors([]);
          setStatus('');
        }}
      />
      {errors.length > 0 && (
        <div
          role="alert"
          className="max-h-64 overflow-auto rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          <p>No tickets added. Fix the following errors:</p>
          <ul className="list-inside list-disc">
            {errors.map((error) => (
              <li key={error.line}>
                {error.line > 0 ? `Line ${error.line}: ` : ''}
                <code className="break-all">{error.value}</code> — {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        disabled={loading || !text.trim() || capacity === 0}
        className="rounded-xl border border-zinc-300 px-3 py-2 font-semibold disabled:opacity-40 dark:border-zinc-700"
        onClick={() => {
          const result = parseTicketImport(text, { ballMax, bonusballMax }, capacity);
          setErrors(result.errors);
          setStatus('');
          if (result.errors.length) return;
          onImport(result.tickets);
          setText('');
          setStatus(`${result.tickets.length} tickets added and selected.`);
        }}
      >
        {loading ? 'Reading CSV…' : 'Add tickets'}
      </button>
      <p role="status" className="text-sm">
        {status}
      </p>
    </details>
  );
}
