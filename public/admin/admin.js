(async function () {
  async function api(path, opts) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const err = (body && body.error) ? body.error : `HTTP ${res.status}`;
      throw new Error(err);
    }
    return body;
  }

  async function me() {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    return res.json();
  }

  const user = await me();
  if (!user || (user.role !== 'SYSOP' && user.role !== 'ADMIN')) {
    location.href = '/admin/login.html';
    return;
  }

  const cfgForm = document.getElementById('cfgForm');
  const cfgMsg = document.getElementById('cfgMsg');
  const boardForm = document.getElementById('boardForm');
  const boardMsg = document.getElementById('boardMsg');
  const boardTable = document.getElementById('boardTable');
  const areaForm = document.getElementById('areaForm');
  const areaMsg = document.getElementById('areaMsg');
  const areaTable = document.getElementById('areaTable');
  const doorTable = document.getElementById('doorTable');
  const logoutBtn = document.getElementById('logoutBtn');

  logoutBtn.addEventListener('click', async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {}
    location.href = '/admin/login.html';
  });

  async function loadConfig() {
    const cfg = await api('/api/admin/config');
    cfgForm.bbsName.value = cfg.bbsName;
    cfgForm.motd.value = cfg.motd;
    cfgForm.allowRegistration.value = String(cfg.allowRegistration);
    cfgForm.minUploadDownloadRatio.value = String(cfg.minUploadDownloadRatio);
  }

  async function loadBoards() {
    const boards = await api('/api/admin/boards');
    boardTable.innerHTML = '';
    boardTable.insertAdjacentHTML('beforeend', '<tr><th>Name</th><th>Description</th><th></th></tr>');
    for (const b of boards) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(b.name)}</td>
        <td>${escapeHtml(b.description || '')}</td>
        <td><button data-id="${b.id}">Delete</button></td>
      `;
      row.querySelector('button').addEventListener('click', async () => {
        if (!confirm(`Delete board '${b.name}'? Threads/posts will be deleted.`)) return;
        try {
          await api(`/api/admin/boards/${encodeURIComponent(b.id)}`, { method: 'DELETE' });
          await loadBoards();
        } catch (e) {
          alert(e.message);
        }
      });
      boardTable.appendChild(row);
    }
  }

  async function loadAreas() {
    const areas = await api('/api/admin/file-areas');
    areaTable.innerHTML = '';
    areaTable.insertAdjacentHTML('beforeend', '<tr><th>Name</th><th>Description</th><th>Freeleech</th><th></th></tr>');
    for (const a of areas) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(a.name)}</td>
        <td>${escapeHtml(a.description || '')}</td>
        <td>
          <button data-toggle="${a.id}">${a.freeLeech ? 'true' : 'false'}</button>
        </td>
        <td><button data-id="${a.id}">Delete</button></td>
      `;

      row.querySelector('button[data-toggle]').addEventListener('click', async () => {
        try {
          await api(`/api/admin/file-areas/${encodeURIComponent(a.id)}`, {
            method: 'PUT',
            body: JSON.stringify({ freeLeech: !a.freeLeech })
          });
          await loadAreas();
        } catch (e) {
          alert(e.message);
        }
      });

      row.querySelector('button[data-id]').addEventListener('click', async () => {
        if (!confirm(`Delete file area '${a.name}'?`)) return;
        try {
          await api(`/api/admin/file-areas/${encodeURIComponent(a.id)}`, { method: 'DELETE' });
          await loadAreas();
        } catch (e) {
          alert(e.message);
        }
      });

      areaTable.appendChild(row);
    }
  }

  async function loadDoors() {
    const doors = await api('/api/admin/doors');
    doorTable.innerHTML = '';
    doorTable.insertAdjacentHTML('beforeend', '<tr><th>Name</th><th>Door ID</th><th>Type</th><th>Enabled</th></tr>');
    for (const d of doors) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(d.name)}</td>
        <td><code>${escapeHtml(d.doorId)}</code></td>
        <td>${escapeHtml(d.type)}</td>
        <td><button data-id="${d.id}">${d.enabled ? 'true' : 'false'}</button></td>
      `;
      row.querySelector('button').addEventListener('click', async () => {
        try {
          await api(`/api/admin/doors/${encodeURIComponent(d.id)}`, {
            method: 'PUT',
            body: JSON.stringify({ enabled: !d.enabled })
          });
          await loadDoors();
        } catch (e) {
          alert(e.message);
        }
      });
      doorTable.appendChild(row);
    }
  }

  cfgForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    cfgMsg.textContent = '';

    const payload = {
      bbsName: cfgForm.bbsName.value,
      motd: cfgForm.motd.value,
      allowRegistration: cfgForm.allowRegistration.value === 'true',
      minUploadDownloadRatio: Number(cfgForm.minUploadDownloadRatio.value)
    };

    try {
      await api('/api/admin/config', { method: 'PUT', body: JSON.stringify(payload) });
      cfgMsg.textContent = 'Saved.';
      await loadConfig();
    } catch (e) {
      cfgMsg.textContent = e.message;
    }
  });

  boardForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    boardMsg.textContent = '';

    const payload = {
      name: boardForm.name.value,
      description: boardForm.description.value
    };

    try {
      await api('/api/admin/boards', { method: 'POST', body: JSON.stringify(payload) });
      boardForm.reset();
      boardMsg.textContent = 'Added.';
      await loadBoards();
    } catch (e) {
      boardMsg.textContent = e.message;
    }
  });

  areaForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    areaMsg.textContent = '';

    const payload = {
      name: areaForm.name.value,
      description: areaForm.description.value,
      freeLeech: areaForm.freeLeech.value === 'true'
    };

    try {
      await api('/api/admin/file-areas', { method: 'POST', body: JSON.stringify(payload) });
      areaForm.reset();
      areaMsg.textContent = 'Added.';
      await loadAreas();
    } catch (e) {
      areaMsg.textContent = e.message;
    }
  });

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  await loadConfig();
  await loadBoards();
  await loadAreas();
  await loadDoors();
})();
