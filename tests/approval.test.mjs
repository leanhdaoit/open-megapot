import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { after, before, beforeEach, afterEach, test } from 'node:test';
import { createElement } from 'react';
import { act, create } from 'react-test-renderer';
import { createServer } from 'vite';

const owner = '0x1111111111111111111111111111111111111111';
const spender = '0x2222222222222222222222222222222222222222';
const hash = `0x${'a'.repeat(64)}`;
let server, ApprovalButton, renderer, state, approved, props;
const render = async () => act(async () => {
  const element = createElement(ApprovalButton, { ...props, onApproved: () => approved++ }, createElement('button', null, 'Buy Ticket'));
  if (renderer) renderer.update(element);
  else renderer = create(element);
});
const text = () => JSON.stringify(renderer.toJSON());
const clickApprove = async () => act(async () => renderer.root.findAllByType('button')[0].props.onClick());
const mined = async () => {
  state.write.isPending = false;
  state.write.data = hash;
  state.receipt.isSuccess = true;
  state.receipt.isLoading = false;
  state.receipt.data = { transactionHash: hash, status: 'success' };
  await render();
};
before(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  server = await createServer({
    server: { middlewareMode: true, hmr: { server: createHttpServer() } },
    ssr: { noExternal: ['wagmi'] },
    plugins: [{
      name: 'mock-wallet', enforce: 'pre',
      resolveId(id) { if (id === 'wagmi') return '\0mock-wallet'; },
      load(id) {
        if (id !== '\0mock-wallet') return;
        return `
          const state = () => globalThis.__approvalTest;
          export const useAccount = () => ({ address: state().owner });
          export const useWriteContract = () => state().write;
          export const useWaitForTransactionReceipt = (options) => { state().receiptOptions = options; return state().receipt; };
          export const useReadContract = (options) => { state().readOptions = options; return state().read; };
        `;
      },
    }],
  });
  ({ ApprovalButton } = await server.ssrLoadModule('/src/components/common/ApprovalButton.tsx'));
});
beforeEach(() => {
  approved = 0;
  props = { spender, amount: 1000000n };
  state = {
    owner, resetCount: 0, reads: 0, receiptChecks: 0,
    read: { data: 0n, isLoading: false, refetch: async () => { state.reads++; return { data: state.read.data }; } },
    receipt: { isSuccess: false, isLoading: false, error: null, refetch: async () => { state.receiptChecks++; } },
    write: { isPending: false, error: null, data: undefined,
      writeContract: args => { state.sent = args; state.write.isPending = true; },
      reset: () => { state.resetCount++; },
    },
  };
  globalThis.__approvalTest = state;
});
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); renderer = undefined; });
after(async () => { delete globalThis.__approvalTest; delete globalThis.IS_REACT_ACT_ENVIRONMENT; await server.close(); });

test('tracks the signed hash, waits for delayed allowance, then exposes Buy exactly once', async () => {
  await render();
  await clickApprove();
  assert.match(text(), /Sign in your wallet/);
  state.write.isPending = false;
  state.write.data = hash;
  state.receipt.isLoading = true;
  await render();
  assert.match(text(), /Approving on-chain/);
  assert.equal(state.receiptOptions.hash, hash);
  assert.equal(state.receiptOptions.pollingInterval, 2000);
  assert.equal(state.receiptOptions.chainId, state.sent.chainId);
  assert.equal(state.readOptions.chainId, state.sent.chainId);
  await mined();
  assert.equal(state.reads, 1);
  assert.equal(state.resetCount, 0);
  assert.equal(approved, 0);
  assert.match(text(), /Updating allowance/);
  assert.equal(renderer.root.findAllByType('button')[0].props.disabled, true);
  assert.equal(state.readOptions.query.refetchInterval({ state: { data: 0n } }), 2000);
  state.read.data = undefined;
  await render();
  assert.doesNotMatch(text(), /Buy Ticket/);
  assert.match(text(), /Updating allowance/);
  state.read.data = 0n;
  await render(); // a stale RPC response must not reset the tracking hash
  assert.equal(state.resetCount, 0);
  state.read.data = 1000000n;
  await render();
  assert.match(text(), /Buy Ticket/);
  assert.equal(approved, 1);
  assert.equal(state.resetCount, 1);
  assert.equal(state.readOptions.query.refetchInterval({ state: { data: 1000000n } }), false);
  await render(); // a new callback identity must not fire twice
  assert.equal(approved, 1);
});
test('receipt errors show the hash and allow checking the same transaction again', async () => {
  await render(); await clickApprove();
  state.write.isPending = false; state.write.data = hash;
  state.receipt.error = new Error('RPC unavailable');
  await render();
  assert.match(text(), /Transaction failed/);
  assert.match(text(), new RegExp(hash));
  const retry = renderer.root.findAllByType('button').find(button => button.children.includes('Check transaction again'));
  await act(async () => retry.props.onClick());
  assert.equal(state.receiptChecks, 1);
  assert.equal(approved, 0);
});
test('increasing the purchase amount while approval confirms still requires more allowance', async () => {
  await render(); await clickApprove();
  props.amount = 2000000n;
  await mined();
  state.read.data = 1000000n;
  await render();
  assert.doesNotMatch(text(), /Buy Ticket/);
  assert.match(text(), /Approve/);
  assert.equal(approved, 0);
  assert.equal(renderer.root.findAllByType('button')[0].props.disabled, false);
});
test('an approval receipt cannot satisfy a different spender or owner', async () => {
  await render(); await clickApprove();
  props.spender = '0x3333333333333333333333333333333333333333';
  await mined();
  assert.equal(state.reads, 0);
  assert.equal(approved, 0);
  assert.equal(state.readOptions.query.refetchInterval({ state: { data: 0n } }), false);
  props.spender = spender; state.owner = '0x4444444444444444444444444444444444444444';
  await render();
  assert.equal(approved, 0);
});
test('cancelled approval does not enter the successful allowance polling loop', async () => {
  await render(); await clickApprove();
  await act(async () => state.receiptOptions.onReplaced({ reason: 'cancelled' }));
  await mined();
  assert.equal(state.reads, 0);
  assert.equal(approved, 0);
  assert.doesNotMatch(text(), /Updating allowance/);
});
test('repriced approval still completes after allowance arrives', async () => {
  await render(); await clickApprove();
  await act(async () => state.receiptOptions.onReplaced({ reason: 'repriced' }));
  await mined();
  state.read.data = 1000000n;
  await render();
  assert.equal(approved, 1);
  assert.match(text(), /Buy Ticket/);
});
