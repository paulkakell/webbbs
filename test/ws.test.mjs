import test from 'node:test';
import assert from 'node:assert/strict';

import { isWebSocketUpgradeRequest, wsUpgradeDebugSummary } from '../src/lib/ws.mjs';

test('isWebSocketUpgradeRequest detects standard websocket upgrade headers', () => {
  assert.equal(
    isWebSocketUpgradeRequest({
      upgrade: 'websocket',
      connection: 'Upgrade',
      'sec-websocket-version': '13',
      'sec-websocket-key': 'abc'
    }),
    true
  );
});

test('isWebSocketUpgradeRequest handles mixed Connection tokens', () => {
  assert.equal(
    isWebSocketUpgradeRequest({
      upgrade: 'websocket',
      connection: 'keep-alive, Upgrade'
    }),
    true
  );
});

test('isWebSocketUpgradeRequest is case-insensitive', () => {
  assert.equal(
    isWebSocketUpgradeRequest({
      upgrade: 'WebSocket',
      connection: 'UPGRADE'
    }),
    true
  );
});

test('isWebSocketUpgradeRequest returns false when required headers are missing', () => {
  assert.equal(isWebSocketUpgradeRequest({ connection: 'Upgrade' }), false);
  assert.equal(isWebSocketUpgradeRequest({ upgrade: 'websocket' }), false);
  assert.equal(
    isWebSocketUpgradeRequest({
      upgrade: 'websocket',
      connection: 'keep-alive'
    }),
    false
  );
});

test('wsUpgradeDebugSummary produces a stable, readable summary', () => {
  const out = wsUpgradeDebugSummary({
    upgrade: 'websocket',
    connection: 'Upgrade',
    'sec-websocket-version': '13',
    'sec-websocket-key': 'abc',
    'x-forwarded-proto': 'https',
    'x-forwarded-for': '203.0.113.1'
  });

  assert.ok(out.includes('[websocket-upgrade-debug]'));
  assert.ok(out.includes('upgrade: websocket'));
  assert.ok(out.includes('connection: Upgrade'));
  assert.ok(out.includes('sec-websocket-version: 13'));
  assert.ok(out.includes('sec-websocket-key: (present)'));
  assert.ok(out.includes('x-forwarded-proto: https'));
  assert.ok(out.includes('x-forwarded-for: 203.0.113.1'));
});
