(() => {
  let ready = false, version = 0, timer = null, sending = false, dirty = false;
  const uploaded = new Map();
  const ar = () => document.documentElement.lang === 'ar';
  const api = (path, options = {}) => fetch('/api/' + path, { credentials: 'same-origin', cache: 'no-store', ...options });
  function state() { return { trips, current }; }
  function status(value) { const label = document.getElementById('cloudStatus'); if (label) label.textContent = value; }
  function saveLocalBackup() {
    try { localStorage.setItem('rahlati-before-cloud-sync', JSON.stringify({ saved: new Date().toISOString(), ...state() })); } catch {}
  }
  function applyRemote(data) {
    if (!data || !Array.isArray(data.trips)) throw Error('Invalid cloud data');
    saveLocalBackup();
    trips = data.trips; current = data.current || trips[0]?.id || '';
    localStorage.setItem('rahlati-v1', JSON.stringify(trips));
    localStorage.setItem('rahlati-current', current);
    render();
  }
  async function remoteValue(value) {
    if (typeof value === 'string' && /^data:(image\/(png|jpeg|webp)|application\/pdf);base64,/i.test(value)) {
      if (uploaded.has(value)) return uploaded.get(value);
      const blob = await (await fetch(value)).blob();
      const response = await api('media', { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
      if (!response.ok) throw Error('Photo upload failed: ' + response.status);
      const url = (await response.json()).url;
      uploaded.set(value, url);
      return url;
    }
    if (Array.isArray(value)) return Promise.all(value.map(remoteValue));
    if (value && typeof value === 'object') {
      const entries = await Promise.all(Object.entries(value).map(async ([key, child]) => [key, await remoteValue(child)]));
      return Object.fromEntries(entries);
    }
    return value;
  }
  async function upload() {
    if (!ready || sending || !dirty) return;
    sending = true; dirty = false;
    status(ar() ? 'جاري الحفظ…' : 'Saving…');
    let succeeded = false;
    try {
      const snapshot = JSON.stringify(await remoteValue(state()));
      const response = await api('state', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'If-Match': String(version) }, body: snapshot });
      if (response.status === 401) { location.replace('/login.html'); return; }
      if (response.status === 409) {
        saveLocalBackup();
        ready = false;
        status(ar() ? 'تعارض بين الأجهزة' : 'Sync conflict');
        alert(ar() ? 'تعدّلت الرحلة على جهاز ثاني. حفظنا تعديلات هالجهاز بنسخة محلية احتياطية. صدّر نسخة احتياطية قبل إعادة فتح التطبيق.' : 'The trip changed on another device. This device was backed up locally. Export a backup before reopening.');
        return;
      }
      if (!response.ok) throw Error('Sync failed: ' + response.status);
      version = (await response.json()).version;
      succeeded = true;
      status(ar() ? 'محفوظة ✓' : 'Saved ✓');
    } catch {
      dirty = true;
      status(ar() ? 'بانتظار الاتصال — التعديلات محلية' : 'Offline — saved on this device');
    } finally {
      sending = false;
      if (succeeded && dirty && ready && navigator.onLine) schedule();
    }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(upload, 800); }
  window.rahlatiCloudPersist = () => { if (ready) { dirty = true; schedule(); } };
  window.addEventListener('online', () => { if (dirty) schedule(); });

  async function start() {
    const panel = document.createElement('div');
    panel.className = 'cloud-account';
    panel.innerHTML = `<span id="cloudStatus">${ar() ? 'جاري مزامنة الرحلات…' : 'Syncing trips…'}</span><button id="cloudLogout" type="button">${ar() ? 'خروج' : 'Sign out'}</button>`;
    document.querySelector('.appbar-inner')?.append(panel);
    document.getElementById('cloudLogout').onclick = async () => {
      if (dirty || sending) { alert(ar() ? 'استنى لحد ما تنحفظ تعديلاتك أو صدّر نسخة احتياطية.' : 'Wait for sync or export a backup first.'); return; }
      await api('logout', { method: 'POST' });
      localStorage.removeItem('rahlati-v1'); localStorage.removeItem('rahlati-current');
      location.replace('/login.html');
    };
    try {
      const response = await api('state');
      if (response.status === 401) { location.replace('/login.html'); return; }
      if (!response.ok) throw Error('Cloud unavailable');
      const remote = await response.json(); version = remote.version;
      if (version > 0) applyRemote(remote.data);
      ready = true;
      if (version === 0 && trips.length) { dirty = true; await upload(); }
      else status(ar() ? 'محفوظة ✓' : 'Saved ✓');
    } catch { status(ar() ? 'تعذرت المزامنة — خذ نسخة احتياطية' : 'Sync unavailable — export a backup'); }
  }
  start();
})();
