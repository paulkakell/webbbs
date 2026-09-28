/** Check an anonymous BBS connection against a disposable integration stack. */
export function checkWebSocket(url, {
  timeoutMs = 10000,
  WebSocketImpl = globalThis.WebSocket
} = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return Promise.reject(new RangeError('timeoutMs must be positive'));
  }
  return new Promise((resolve, reject) => {
    const socket = new WebSocketImpl(url);
    let settled = false;
    let sentInput = false;
    let receivedReply = false;
    let output = '';
    const timer = setTimeout(() => finish(new Error('WebSocket terminal round-trip timeout')), timeoutMs);

    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      socket.removeEventListener('close', onClose);
      // Retain the error listener until close completes to handle late failures.
      if (error) {
        try { socket.close(); } catch { /* The handshake may already have failed. */ }
        reject(error);
      } else {
        resolve({ check: 'websocket-round-trip', status: 'passed' });
      }
    }

    function onMessage(event) {
      if (settled || receivedReply) return;
      try {
        const frame = JSON.parse(String(event.data));
        if (!frame || typeof frame !== 'object') throw new Error('Invalid WebSocket frame');
        if (frame.type !== 'ansi') return;
        if (typeof frame.data !== 'string') throw new Error('Invalid ANSI frame');
        output += frame.data;
        if (output.length > 65536) throw new Error('WebSocket terminal output limit exceeded');
        if (!output.includes('Handle: ')) return;
        output = '';
        if (!sentInput) {
          sentInput = true;
          // A blank handle re-prompts without authenticating or writing user data.
          socket.send(JSON.stringify({ type: 'line', line: '' }));
        } else {
          receivedReply = true;
          socket.close(1000, 'integration check complete');
        }
      } catch (error) {
        finish(error);
      }
    }

    function onClose(event) {
      finish(receivedReply && event.code === 1000
        ? null
        : new Error(`WebSocket closed before a clean terminal round-trip (code ${event.code})`));
    }

    socket.addEventListener('message', onMessage);
    socket.addEventListener('close', onClose, { once: true });
    socket.addEventListener('error', () => finish(new Error('WebSocket connection failed')));
  });
}
