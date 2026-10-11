/**
 * ---
 * @skill https://llms.megapot.io/tasks/buy-tickets
 * @customize Quantity presets and deterministic combination builder. All ticket
 *             edits and selection live above pagination; only selected tickets
 *             are passed to checkout. Bonus edits apply to an entire group.
 * ---
 */
import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Ball } from '@/components/lottery/Ball';
import { TicketPicker } from '@/components/lottery/TicketPicker';
import {
  combinations,
  defaultSelection,
  duplicateIds,
  GROUPS_PER_PAGE,
  guaranteedPrizeCount,
  MAX_COMBO_NUMBERS,
  MAX_MANAGED_TICKETS,
  type ManagedTicket,
  updateGroupBonus,
} from '@/lib/ticketGroups';
import { type CustomTicket, randomTicket } from '@/lib/tickets';

export function TicketBuilder({
  ballMax,
  bonusballMax,
  onTicketsChange,
  purchasedIds,
  combo = false,
}: {
  combo?: boolean;
  purchasedIds: number[];
  ballMax: number;
  bonusballMax: number;
  onTicketsChange: (tickets: ManagedTicket[]) => void;
}) {
  useEffect(() => {
    onTicketsChange([]);
  }, [onTicketsChange]);
  const [quantity, setQuantity] = useState(10);
  const [preset, setPreset] = useState<number | null>(10);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [bonus, setBonus] = useState<number | null>(null);
  const [tickets, setTickets] = useState<ManagedTicket[]>([]);
  useEffect(() => {
    setTickets((previous) =>
      previous.map((ticket) =>
        purchasedIds.includes(ticket.id) ? { ...ticket, selected: false } : ticket,
      ),
    );
  }, [purchasedIds]);
  const [dirty, setDirty] = useState(false);
  const [replacement, setReplacement] = useState<CustomTicket[] | null>(null);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const duplicates = useMemo(() => duplicateIds(tickets), [tickets]);
  const selected = tickets.filter((ticket) => ticket.selected);
  const groups = Math.ceil(tickets.length / 5);
  const pages = Math.ceil(groups / GROUPS_PER_PAGE);
  const bounds = { ballMax, bonusballMax };
  const addingTicket = useMemo(
    () => ({ normals: [], bonusball: tickets.at(-1)?.bonusball ?? 1 }),
    [tickets],
  );
  const buttonClass =
    'rounded-xl border border-zinc-300 px-3 py-2 font-semibold disabled:opacity-40 dark:border-zinc-700';
  function commit(next: ManagedTicket[], edited = true) {
    setTickets(next);
    setDirty(edited);
    onTicketsChange(next.filter((ticket) => ticket.selected));
  }
  function applyReplacement(next: CustomTicket[]) {
    commit(defaultSelection(next), false);
    setPage(0);
    setReplacement(null);
  }
  function replace(next: CustomTicket[]) {
    if (dirty) setReplacement(next);
    else applyReplacement(next);
  }
  function changeQuantity(value: number) {
    setQuantity(Math.min(MAX_MANAGED_TICKETS, Math.max(1, Math.trunc(value) || 1)));
    setPreset(null);
  }
  function append(ticket: CustomTicket) {
    if (tickets.length >= MAX_MANAGED_TICKETS || tickets.length % 5 === 0) return;
    commit([
      ...tickets,
      {
        ...ticket,
        bonusball: tickets[tickets.length - 1].bonusball,
        id: tickets.length,
        selected: true,
      },
    ]);
    setAdding(false);
  }
  return (
    <div className="space-y-5">
      {!combo && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Tickets</h2>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 15, 20, 30, 40, 50, null].map((value) => (
                <button
                  key={value ?? 'custom'}
                  type="button"
                  aria-pressed={preset === value}
                  className={`${buttonClass} min-w-[48px] ${preset === value ? 'ring-2 ring-brand-primary-500' : ''}`}
                  onClick={() => {
                    setPreset(value);
                    if (value !== null) setQuantity(value);
                  }}
                >
                  {value ?? 'Custom'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-[2rem] focus-within:border-brand-primary-700 border-2 border-brand-primary-500 bg-brand-primary-50 p-3 dark:bg-zinc-800">
            <button
              type="button"
              className={buttonClass}
              aria-label="Decrease ticket quantity"
              disabled={quantity <= 1}
              onClick={() => changeQuantity(quantity - 1)}
            >
              −
            </button>
            <input
              className="min-w-0 flex-1 bg-transparent text-center text-2xl font-bold focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              aria-label="Ticket quantity"
              type="number"
              min={1}
              max={MAX_MANAGED_TICKETS}
              value={quantity}
              onChange={(event) => changeQuantity(Number(event.target.value))}
            />
            <button
              type="button"
              className={buttonClass}
              aria-label="Increase ticket quantity"
              disabled={quantity >= MAX_MANAGED_TICKETS}
              onClick={() => changeQuantity(quantity + 1)}
            >
              +
            </button>
          </div>
          <button
            className={buttonClass}
            type="button"
            onClick={() => {
              let groupBonus = 1;
              const generated = Array.from({ length: quantity }, (_, index) => {
                const ticket = randomTicket(bounds);
                if (index % 5 === 0) groupBonus = ticket.bonusball;
                return { ...ticket, bonusball: groupBonus };
              });
              replace(generated);
            }}
          >
            Generate random tickets
          </button>
        </div>
      )}
      {combo && (
        <section className="space-y-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700">
          <h3 className="font-semibold">Choose numbers · {numbers.length} of 6–12</h3>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
            {Array.from({ length: ballMax }, (_, i) => i + 1).map((n) => (
              <Ball
                key={n}
                n={n}
                size="fill"
                interactive
                selected={numbers.includes(n)}
                ariaLabel={`Main ${n}, ${numbers.includes(n) ? 'selected' : 'not selected'}`}
                onClick={() =>
                  setNumbers((previous) =>
                    previous.includes(n)
                      ? previous.filter((value) => value !== n)
                      : previous.length < MAX_COMBO_NUMBERS
                        ? [...previous, n]
                        : previous,
                  )
                }
              />
            ))}
          </div>
          <h3 className="font-semibold">Choose exactly 1 bonus</h3>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
            {Array.from({ length: bonusballMax }, (_, i) => i + 1).map((n) => (
              <Ball
                key={n}
                n={n}
                variant="bonus"
                size="fill"
                interactive
                selected={bonus === n}
                ariaLabel={`Bonus ${n}`}
                onClick={() => setBonus(n)}
              />
            ))}
          </div>
          <button
            className={buttonClass}
            type="button"
            disabled={
              numbers.length < 6 ||
              bonus === null ||
              bonus > bonusballMax ||
              numbers.some((n) => n > ballMax)
            }
            onClick={() => {
              if (bonus !== null) replace(combinations(numbers, bonus));
            }}
          >
            Generate all combinations
          </button>
        </section>
      )}
      <section
        className="rounded-2xl border border-brand-primary-200 bg-brand-primary-50 p-4 dark:border-brand-primary-900 dark:bg-brand-primary-950/40"
        aria-label="Guaranteed prizes overview"
      >
        <h3 className="font-semibold" aria-live="polite">
          Guaranteed Prizes (x{guaranteedPrizeCount(selected.length)})
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Every group of 5 tickets gets at least 1 prize. On average, 1 in 4 tickets wins. If none
          in the group win, you’ll get a mystery box worth up to $5,000.
        </p>
      </section>
      <p aria-live="polite">
        {selected.length.toLocaleString()} selected / {tickets.length.toLocaleString()} tickets ·{' '}
        {groups.toLocaleString()} groups
      </p>
      {selected.some((ticket) => duplicates.has(ticket.id)) && (
        <p role="alert" className="rounded-xl bg-amber-100 p-3 text-amber-950">
          Your selection includes duplicate tickets. You can still buy them.
        </p>
      )}
      {tickets.length > 0 && (
        <div className="flex gap-2">
          <button
            type="button"
            className={buttonClass}
            onClick={() => commit(tickets.map((ticket) => ({ ...ticket, selected: true })))}
          >
            Select all
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => commit(tickets.map((ticket) => ({ ...ticket, selected: false })))}
          >
            Deselect all
          </button>
        </div>
      )}
      {Array.from(
        { length: Math.min(GROUPS_PER_PAGE, Math.max(0, groups - page * GROUPS_PER_PAGE)) },
        (_, offset) => {
          const group = page * GROUPS_PER_PAGE + offset;
          const rows = tickets.slice(group * 5, group * 5 + 5);
          return (
            <section
              key={group}
              className="space-y-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">
                  {rows.length === 5
                    ? `Group ${group + 1}`
                    : `Remaining tickets · ${rows.length}/5`}
                </h3>
                <label>
                  Group bonus{' '}
                  <select
                    aria-label={`Group ${group + 1} bonus`}
                    className="rounded border bg-white p-2 dark:bg-zinc-800"
                    value={rows[0].bonusball}
                    onChange={(event) =>
                      commit(updateGroupBonus(tickets, group, Number(event.target.value)))
                    }
                  >
                    {Array.from({ length: bonusballMax }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {rows.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`flex flex-wrap items-center gap-2 rounded-xl border p-2 ${duplicates.has(ticket.id) ? 'border-amber-500' : 'border-zinc-200 dark:border-zinc-700'}`}
                >
                  <input
                    type="checkbox"
                    aria-label={`Select ticket ${ticket.id + 1}`}
                    checked={ticket.selected}
                    onChange={() =>
                      commit(
                        tickets.map((item) =>
                          item.id === ticket.id ? { ...item, selected: !item.selected } : item,
                        ),
                      )
                    }
                  />
                  <span className="text-xs text-zinc-500">#{ticket.id + 1}</span>
                  {ticket.normals.map((n) => (
                    <Ball key={n} n={n} size="lg" />
                  ))}
                  <Ball n={ticket.bonusball} variant="bonus" size="lg" />
                  <button
                    className={`${buttonClass} ml-auto text-xs`}
                    type="button"
                    onClick={() => setEditing(ticket.id)}
                  >
                    Edit numbers
                  </button>
                  {duplicates.has(ticket.id) && (
                    <span className="text-xs text-amber-600">Duplicate</span>
                  )}
                </div>
              ))}
              {rows.length < 5 && tickets.length < MAX_MANAGED_TICKETS && (
                <div className="flex flex-wrap gap-2">
                  <button
                    className={buttonClass}
                    type="button"
                    onClick={() => append(randomTicket(bounds))}
                  >
                    + Random ticket
                  </button>
                  <button className={buttonClass} type="button" onClick={() => setAdding(true)}>
                    + Choose numbers
                  </button>
                </div>
              )}
            </section>
          );
        },
      )}
      {pages > 1 && (
        <nav aria-label="Ticket group pages" className="flex items-center justify-between gap-2">
          <button
            type="button"
            className={buttonClass}
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page + 1} / {pages}
          </span>
          <button
            type="button"
            className={buttonClass}
            disabled={page + 1 >= pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </nav>
      )}
      {replacement && (
        <Modal open ariaLabel="Replace ticket list" onClose={() => setReplacement(null)}>
          <div className="space-y-4 p-6">
            <h3 className="text-lg font-semibold">Replace ticket list?</h3>
            <p>
              Your ticket edits and selection changes will be discarded. The new list will use the
              default selection.
            </p>
            <div className="flex gap-3">
              <button type="button" className={buttonClass} onClick={() => setReplacement(null)}>
                Keep current tickets
              </button>
              <button
                type="button"
                className={buttonClass}
                onClick={() => applyReplacement(replacement)}
              >
                Replace tickets
              </button>
            </div>
          </div>
        </Modal>
      )}
      {editing !== null && (
        <TicketPicker
          open
          lockBonus
          onClose={() => setEditing(null)}
          ticket={tickets[editing]}
          bounds={bounds}
          onSave={(next) =>
            commit(
              tickets.map((ticket) =>
                ticket.id === editing ? { ...ticket, normals: next.normals } : ticket,
              ),
            )
          }
        />
      )}
      {adding && (
        <TicketPicker
          open
          lockBonus
          onClose={() => setAdding(false)}
          ticket={addingTicket}
          bounds={bounds}
          onSave={append}
        />
      )}
    </div>
  );
}
