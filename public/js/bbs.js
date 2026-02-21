/* global Terminal, FitAddon */

(function () {
  const termEl = document.getElementById('terminal');
  if (!termEl) return;

  const term = new Terminal({
    cursorBlink: true,
    convertEol: true,
    scrollback: 2000,
    cols: 80,
    rows: 24
  });

  // Fit addon (UMD global varies by build)
  const FitCtor = (window.FitAddon && (window.FitAddon.FitAddon || window.FitAddon)) || null;
  const fitAddon = FitCtor ? new FitCtor() : null;
  if (fitAddon && term.loadAddon) term.loadAddon(fitAddon);

  term.open(termEl);
  if (fitAddon && fitAddon.fit) fitAddon.fit();

  window.addEventListener('resize', () => {
    try {
      if (fitAddon && fitAddon.fit) fitAddon.fit();
    } catch {}
  });

  const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = `${wsProto}://${location.host}/ws/bbs`;
  const ws = new WebSocket(wsUrl);

  let inputMode = 'key';
  let echo = true;
  let lineBuf = '';

  function send(obj) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }

  function setMode(m, e) {
    inputMode = m;
    echo = e;
    lineBuf = '';
  }

  async function handleAction(msg) {
    if (msg.action === 'download' && msg.url) {
      const a = document.createElement('a');
      a.href = msg.url;
      a.style.display = 'none';
      if (msg.filename) a.download = msg.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    if (msg.action === 'uploadPrompt' && msg.url) {
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.addEventListener('change', async () => {
        try {
          if (!input.files || input.files.length === 0) {
            send({ type: 'uploadResult', ok: false, error: 'No file selected' });
            return;
          }
          const file = input.files[0];
          const fd = new FormData();
          fd.append('file', file, file.name);

          const res = await fetch(msg.url, { method: 'POST', body: fd });
          let body = null;
          try {
            body = await res.json();
          } catch {}

          if (res.ok) {
            send({ type: 'uploadResult', ok: true });
          } else {
            send({ type: 'uploadResult', ok: false, error: (body && body.error) ? body.error : `HTTP ${res.status}` });
          }
        } catch (e) {
          send({ type: 'uploadResult', ok: false, error: String(e && e.message ? e.message : e) });
        } finally {
          input.remove();
        }
      });

      // Trigger
      input.click();
      return;
    }
  }

  ws.addEventListener('open', () => {
    // server will render welcome
  });

  ws.addEventListener('message', async (ev) => {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }

    if (msg.type === 'ansi' && typeof msg.data === 'string') {
      term.write(msg.data);
      return;
    }

    if (msg.type === 'mode') {
      setMode(msg.mode, !!msg.echo);
      return;
    }

    if (msg.type === 'action') {
      await handleAction(msg);
      return;
    }
  });

  ws.addEventListener('error', () => {
    term.write('\r\n\r\n*** Connection error ***\r\n');
  });

  ws.addEventListener('close', (ev) => {
    const code = (ev && typeof ev.code === 'number') ? ev.code : 0;
    const reason = (ev && typeof ev.reason === 'string' && ev.reason) ? `: ${ev.reason}` : '';
    term.write(`\r\n\r\n*** Disconnected (${code}${reason}) ***\r\n`);
  });

  function isPrintable(ch) {
    // Basic printable check; allow space and visible chars.
    const code = ch.charCodeAt(0);
    return code >= 0x20 && code !== 0x7f;
  }

  term.onData((data) => {
    if (!data) return;

    // Some keys send multi-char sequences; handle char-by-char.
    for (let i = 0; i < data.length; i++) {
      const ch = data[i];

      // ignore arrow/function keys (ESC sequences)
      if (ch === '\x1b') {
        // swallow the rest of the sequence
        break;
      }

      if (inputMode === 'key') {
        send({ type: 'key', key: ch });
        continue;
      }

      if (inputMode === 'line') {
        if (ch === '\r') {
          send({ type: 'line', line: lineBuf });
          term.write('\r\n');
          lineBuf = '';
          continue;
        }

        if (ch === '\u007F') {
          if (lineBuf.length > 0) {
            lineBuf = lineBuf.slice(0, -1);
            if (echo) term.write('\b \b');
          }
          continue;
        }

        if (ch === '\u0003') {
          // Ctrl+C
          continue;
        }

        if (isPrintable(ch)) {
          lineBuf += ch;
          if (echo) term.write(ch);
          continue;
        }
      }
    }
  });
})();
