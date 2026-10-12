import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let server;
let parse;
const bounds = { ballMax: 30, bonusballMax: 10 };
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: { server: createHttpServer() } } });
  parse = (await server.ssrLoadModule('/src/lib/ticketImport.ts')).parseTicketImport;
});
after(async () => { await server?.close(); });

test('accepts CSV, quoted numeric cells, whitespace, BOM and blank lines while preserving bonuses', () => {
  const result = parse('\uFEFF5,4,3,2,1,10\r\n\r\n"6","7","8","9","10","2"\n1\t2 3 4 5 1', bounds, 10);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.tickets, [
    { normals: [1,2,3,4,5], bonusball: 10 },
    { normals: [6,7,8,9,10], bonusball: 2 },
    { normals: [1,2,3,4,5], bonusball: 1 },
  ]);
});

test('rejects all rows atomically and reports physical line, original ticket and reason', () => {
  const result = parse('1,2,3,4,5,1\n\n1,1,3,4,5,2\n1,2,3,4,31,2\n1,2,3,4,5,0', bounds, 10);
  assert.deepEqual(result.tickets, []);
  assert.deepEqual(result.errors.map((error) => error.line), [3,4,5]);
  assert.equal(result.errors[0].value, '1,1,3,4,5,2');
  assert.match(result.errors[0].message, /unique/);
  assert.match(result.errors[1].message, /1 and 30/);
  assert.match(result.errors[2].message, /1 and 10/);
});

test('rejects malformed, missing, extra, fractional, negative and nondecimal numbers', () => {
  for (const row of ['1,2,3,4,5', '1,2,3,4,5,1,2', '1,2,3,,5,1', '1,2,3,4,5,', '1,2,3,4,5,1.5', '1,2,3,4,5,-1', '1,2,3,4,5,1e0', '1,2,3,4,5,0x1', '"1,2,3,4,5,1"', 'a,b,c,d,e,f']) {
    assert.equal(parse(row, bounds, 10).errors.length, 1, row);
  }
});

test('rejects empty input, enforces remaining capacity, permits duplicate tickets', () => {
  assert.equal(parse(' \n\r\n', bounds, 10).errors.length, 1);
  const rows = '1,2,3,4,5,1\n1,2,3,4,5,1';
  assert.equal(parse(rows, bounds, 2).tickets.length, 2);
  const result = parse(rows, bounds, 1);
  assert.equal(result.errors[0].line, 2);
  assert.match(result.errors[0].message, /at most 1/);
  assert.deepEqual(result.tickets, []);
  assert.equal(parse(rows, bounds, 0).errors.length, 2);
});
