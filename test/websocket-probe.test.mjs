import test from 'node:test';
import assert from 'node:assert/strict';
import { checkWebSocket } from '../scripts/check-websocket.mjs';

class FakeSocket extends EventTarget {
  static latest;
  constructor() {
    super();
    FakeSocket.latest = this;
    this.sent = [];
    this.closed = false;
  }
  send(data) { this.sent.push(JSON.parse(data)); }
  close(code = 1000) {
    this.closed = true;
    queueMicrotask(() => this.emit('close', { code }));
  }
  emit(type, values = {}) {
    const event = new Event(type);
    Object.assign(event, values);
    this.dispatchEvent(event);
  }
  frame(value) { this.emit('message', { data: JSON.stringify(value) }); }
}

function probe() {
  const result = checkWebSocket('ws://127.0.0.1/ws/bbs', {
    WebSocketImpl: FakeSocket, timeoutMs: 1000
  });
  return { result, socket: FakeSocket.latest };
}

test('WebSocket probe requires prompt, client input, server reply, and clean close', async () => {
  const { result, socket } = probe();
  socket.emit('open');
  socket.frame({ type: 'mode', mode: 'line', echo: true });
  socket.frame({ type: 'ansi', data: '\u001b[2J' });
  assert.deepEqual(socket.sent, []);
  socket.frame({ type: 'ansi', data: 'Han' });
  socket.frame({ type: 'ansi', data: 'dle: ' });
  assert.deepEqual(socket.sent, [{ type: 'line', line: '' }]);
  assert.equal(socket.closed, false);
  socket.frame({ type: 'ansi', data: 'Handle: ' });
  assert.deepEqual(await result, { check: 'websocket-round-trip', status: 'passed' });
  assert.equal(socket.closed, true);
});

test('WebSocket probe rejects a handshake without usable terminal output', async () => {
  const { result, socket } = probe();
  const rejected = assert.rejects(result, /before a clean terminal round-trip/);
  socket.emit('open');
  socket.close();
  await rejected;
});

test('WebSocket probe rejects a greeting without a reply to client input', async () => {
  const { result, socket } = probe();
  const rejected = assert.rejects(result, /before a clean terminal round-trip/);
  socket.frame({ type: 'ansi', data: 'Handle: ' });
  socket.close();
  await rejected;
});

test('WebSocket probe reports handshake errors without waiting for timeout', async () => {
  const { result, socket } = probe();
  const rejected = assert.rejects(result, /connection failed/);
  socket.emit('error');
  await rejected;
  assert.equal(socket.closed, true);
});

test('WebSocket probe rejects invalid JSON and closes the socket', async () => {
  const { result, socket } = probe();
  const rejected = assert.rejects(result, SyntaxError);
  socket.emit('message', { data: 'not JSON' });
  await rejected;
  assert.equal(socket.closed, true);
});

test('WebSocket probe rejects malformed ANSI frames', async () => {
  const { result, socket } = probe();
  const rejected = assert.rejects(result, /Invalid ANSI frame/);
  socket.frame({ type: 'ansi', data: null });
  await rejected;
});

test('WebSocket probe bounds output without a login prompt', async () => {
  const { result, socket } = probe();
  const rejected = assert.rejects(result, /output limit/);
  socket.frame({ type: 'ansi', data: 'x'.repeat(65537) });
  await rejected;
});

test('WebSocket probe times out and closes silent connections', async () => {
  const result = checkWebSocket('ws://127.0.0.1/ws/bbs', {
    WebSocketImpl: FakeSocket, timeoutMs: 10
  });
  const socket = FakeSocket.latest;
  await assert.rejects(result, /round-trip timeout/);
  assert.equal(socket.closed, true);
});

test('WebSocket probe rejects invalid timeouts before constructing a socket', async () => {
  for (const timeoutMs of [0, -1, NaN, Infinity]) {
    await assert.rejects(checkWebSocket('ws://127.0.0.1/ws/bbs', {
      WebSocketImpl: FakeSocket, timeoutMs
    }), RangeError);
  }
});
