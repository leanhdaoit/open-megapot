/**
 * ---
 * @customize Deterministic combination generation and whole-list ticket management.
 *             Groups are consecutive slots of five; selection never changes grouping.
 * ---
 */
import type { CustomTicket } from './tickets';

export type ManagedTicket = CustomTicket & { id: number; selected: boolean };
export const MAX_COMBO_NUMBERS = 12;
export const MAX_MANAGED_TICKETS = 8568;
export const GROUPS_PER_PAGE = 50;

export function combinations(numbers: number[], bonusball: number): CustomTicket[] {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  if (sorted.length < 6 || sorted.length > MAX_COMBO_NUMBERS) return [];
  const result: CustomTicket[] = [];
  function visit(start: number, picked: number[]) {
    if (picked.length === 5) {
      result.push({ normals: picked, bonusball });
      return;
    }
    for (let i = start; i <= sorted.length - (5 - picked.length); i++) {
      visit(i + 1, [...picked, sorted[i]]);
    }
  }
  visit(0, []);
  return result;
}

export function defaultSelection(tickets: CustomTicket[]): ManagedTicket[] {
  const selectedCount = tickets.length < 5 ? tickets.length : Math.floor(tickets.length / 5) * 5;
  return tickets.map((ticket, id) => ({ ...ticket, id, selected: id < selectedCount }));
}

export function duplicateIds(tickets: ManagedTicket[]): Set<number> {
  const byKey = new Map<string, number[]>();
  for (const ticket of tickets) {
    const key = `${[...ticket.normals].sort((a, b) => a - b).join(',')}:${ticket.bonusball}`;
    const ids = byKey.get(key) ?? [];
    ids.push(ticket.id);
    byKey.set(key, ids);
  }
  return new Set([...byKey.values()].filter((ids) => ids.length > 1).flat());
}

export function updateGroupBonus(tickets: ManagedTicket[], group: number, bonusball: number) {
  return tickets.map((ticket, index) =>
    Math.floor(index / 5) === group ? { ...ticket, bonusball } : ticket,
  );
}

/** Number of complete five-ticket sets in the selection, regardless of UI grouping. */
export function guaranteedPrizeCount(selectedCount: number): number {
  return Math.floor(selectedCount / 5);
}
