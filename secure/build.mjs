import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(import.meta.dirname, 'dist');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const file of ['index.html', 'app.js', 'preview.js', 'style.css', 'icon.svg', 'manifest.webmanifest', 'istanbul-preview.json']) {
  await cp(resolve(root, file), resolve(out, file));
}
await cp(resolve(root, 'data'), resolve(out, 'data'), { recursive: true });
await cp(resolve(import.meta.dirname, 'login.html'), resolve(out, 'login.html'));
await cp(resolve(import.meta.dirname, 'cloud-sync.js'), resolve(out, 'cloud-sync.js'));

let app = await readFile(resolve(out, 'app.js'), 'utf8');
const call = "function persist(){try{localStorage.setItem('rahlati-v1',JSON.stringify(trips));localStorage.setItem('rahlati-current',current)}catch{alert(lang==='ar'?'مساحة التخزين امتلأت. خذ نسخة احتياطية وقلل الصور.':'Storage is full. Export a backup and use smaller photos.')}}";
if (!app.includes(call)) throw Error('persist hook changed; review sync integration before deploying');
app = app.replace(call, call.replace(/}}$/, '}finally{window.rahlatiCloudPersist?.()}}'));
app = app.replace("if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});render();", 'render();');
await writeFile(resolve(out, 'app.js'), app);

let html = await readFile(resolve(out, 'index.html'), 'utf8');
html = html.replace('</body>', '<script src="cloud-sync.js" defer></script></body>');
await writeFile(resolve(out, 'index.html'), html);

let css = await readFile(resolve(out, 'style.css'), 'utf8');
css += '\n.cloud-account{display:flex;align-items:center;gap:8px;margin-inline-start:12px;font-size:12px;color:#426d65}.cloud-account button{background:#eef4f0;border:0;border-radius:8px;padding:7px 9px;color:#173942;cursor:pointer}@media(max-width:600px){.cloud-account{font-size:10px;margin-inline-start:3px}.cloud-account button{padding:5px}}\n';
await writeFile(resolve(out, 'style.css'), css);
console.log('Secure static assets prepared in secure/dist');
