import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';
let server, groups;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: { server: createHttpServer() } } });
  groups = await server.ssrLoadModule('/src/lib/ticketGroups.ts');
});
after(async () => { await server?.close(); });
test('combinations are canonical regardless of input order', () => {
  const result = groups.combinations([6, 2, 5, 1, 4, 3], 2);
  assert.equal(result.length, 6);
  assert.deepEqual(result, groups.combinations([1, 2, 3, 4, 5, 6], 2));
  assert.deepEqual(result[0].normals, [1, 2, 3, 4, 5]);
  assert.deepEqual(result[5].normals, [2, 3, 4, 5, 6]);
  assert.deepEqual(groups.combinations([1, 2, 3, 4], 1), []);
});
test('default selection handles small lists and incomplete groups', () => {
  for (const [length, expected] of [[1, 1], [4, 4], [5, 5], [6, 5], [10, 10], [11, 10]]) {
    const result = groups.defaultSelection(Array.from({ length }, () => ({ normals: [1,2,3,4,5], bonusball: 1 })));
    assert.equal(result.filter((ticket) => ticket.selected).length, expected);
  }
});
test('maximum combination list has 792 unique tickets with 790 selected', () => {
  const result = groups.defaultSelection(groups.combinations(Array.from({ length: 12 }, (_, i) => i + 1), 1));
  assert.equal(result.length, 792);
  assert.equal(result.filter((ticket) => ticket.selected).length, 790);
  assert.equal(groups.duplicateIds(result).size, 0);
  assert.equal(Math.ceil(Math.ceil(result.length / 5) / groups.GROUPS_PER_PAGE), 4);
});
test('group bonus updates deselected rows and remainder without touching other groups', () => {
  let result = groups.defaultSelection(groups.combinations([1,2,3,4,5,6], 1));
  result[2].selected = false;
  result = groups.updateGroupBonus(result, 0, 7);
  assert.ok(result.slice(0,5).every((ticket) => ticket.bonusball === 7));
  assert.equal(result[2].selected, false);
  assert.equal(result[5].bonusball, 1);
  result = groups.updateGroupBonus(result, 1, 9);
  assert.equal(result[5].bonusball, 9);
  assert.equal(result[5].selected, false);
});
test('duplicates mark every copy across pages and include unselected tickets', () => {
  const result = groups.defaultSelection(groups.combinations([1,2,3,4,5,6,7,8,9,10], 1));
  result.push({ id: 252, normals: [...result[0].normals].reverse(), bonusball: 1, selected: false });
  assert.deepEqual([...groups.duplicateIds(result)], [0, 252]);
  result[252].bonusball = 2;
  assert.equal(groups.duplicateIds(result).size, 0);
});

test('Combo Play requires 6–12 distinct main numbers', () => {
  assert.deepEqual(groups.combinations([1,2,3,4,5], 1), []);
  assert.deepEqual(groups.combinations(Array.from({ length: 13 }, (_, i) => i + 1), 1), []);
  assert.deepEqual(groups.combinations([1,2,3,4,5,5], 1), []);
});
test('guaranteed prizes count complete sets across the entire selection', () => {
  for (const [selected, count] of [[0,0],[4,0],[5,1],[6,1],[9,1],[10,2],[12,2],[792,158]]) {
    assert.equal(groups.guaranteedPrizeCount(selected), count);
  }
});
