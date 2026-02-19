(async function () {
  const form = document.getElementById('loginForm');
  const err = document.getElementById('err');

  async function me() {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    return res.json();
  }

  // If already logged in, go to admin.
  try {
    const u = await me();
    if (u && (u.role === 'SYSOP' || u.role === 'ADMIN')) {
      location.href = '/admin';
      return;
    }
  } catch {}

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    err.textContent = '';

    const fd = new FormData(form);
    const payload = {
      handle: String(fd.get('handle') || ''),
      password: String(fd.get('password') || '')
    };

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        err.textContent = (body && body.error) ? body.error : `Login failed (HTTP ${res.status})`;
        return;
      }

      location.href = '/admin';
    } catch (e) {
      err.textContent = String(e && e.message ? e.message : e);
    }
  });
})();
