/**
 * ---
 * @customize Parse headerless ticket CSV or whitespace-separated rows. Report
 *             physical line numbers and reject the whole import on any error.
 * ---
 */
import { BONUSBALL_MIN } from '@/config/contracts';
import type { CustomTicket } from './tickets';

export type TicketImportError = { line: number; value: string; message: string };

export function parseTicketImport(
  text: string,
  bounds: { ballMax: number; bonusballMax: number },
  capacity: number,
): { tickets: CustomTicket[]; errors: TicketImportError[] } {
  const tickets: CustomTicket[] = [];
  const errors: TicketImportError[] = [];
  let count = 0;
  text
    .replace(/^\uFEFF/, '')
    .split(/\r\n|\n|\r/)
    .forEach((value, index) => {
      const row = value.trim();
      if (!row) return;
      count++;
      const fields = row.includes(',') ? row.split(',') : row.split(/\s+/);
      const cells = fields.map((field) => field.trim().replace(/^"(\d+)"$/, '$1'));
      const numbers = cells.map(Number);
      const normals = numbers.slice(0, 5);
      const bonusball = numbers[5];
      let message = '';
      if (count > capacity)
        message = `Ticket limit exceeded. You can add at most ${capacity} tickets.`;
      else if (cells.length !== 6)
        message = `Expected 6 numbers (5 main + 1 bonus); found ${cells.length}.`;
      else if (cells.some((cell) => !/^\d+$/.test(cell)))
        message = 'Use whole numbers only; empty values are not allowed.';
      else if (normals.some((n) => !Number.isSafeInteger(n) || n < 1 || n > bounds.ballMax))
        message = `Main numbers must be between 1 and ${bounds.ballMax}.`;
      else if (new Set(normals).size !== 5) message = 'The 5 main numbers must be unique.';
      else if (
        !Number.isSafeInteger(bonusball) ||
        bonusball < BONUSBALL_MIN ||
        bonusball > bounds.bonusballMax
      )
        message = `Bonus must be between ${BONUSBALL_MIN} and ${bounds.bonusballMax}.`;
      if (message) errors.push({ line: index + 1, value, message });
      else tickets.push({ normals: normals.sort((a, b) => a - b), bonusball });
    });
  if (!count) errors.push({ line: 1, value: '', message: 'Enter at least one ticket.' });
  return { tickets: errors.length ? [] : tickets, errors };
}
