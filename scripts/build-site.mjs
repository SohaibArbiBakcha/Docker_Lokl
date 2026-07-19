// Assembles the single deployable website into site/:
//   /            ← landing page (landing/index.html + lokl.apk if present)
//   /admin/      ← react-admin build (admin/dist, built with base /admin/)
// Run `npm run build:site` from the repo root, then deploy the site/ folder
// (Netlify drag-and-drop) or let Netlify run it via the root netlify.toml.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = join(root, 'site');
const adminDist = join(root, 'admin', 'dist');
const landing = join(root, 'landing');

if (!existsSync(adminDist)) {
  console.error('admin/dist not found — run `npm run build --prefix admin` first (or use `npm run build:site`).');
  process.exit(1);
}

rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });

// Landing page at the root
cpSync(join(landing, 'index.html'), join(site, 'index.html'));
// Shared-event fallback: /e/<id> tries the app's lokl:// scheme, else offers the APK
cpSync(join(landing, 'open-event.html'), join(site, 'open-event.html'));
// Privacy policy — required (and linked) by the app and AdMob
cpSync(join(landing, 'privacy.html'), join(site, 'privacy.html'));
const apk = join(landing, 'lokl.apk');
if (existsSync(apk)) {
  cpSync(apk, join(site, 'lokl.apk'));
} else {
  console.warn('WARN: landing/lokl.apk missing — the download button will 404 (see landing/README.md).');
}

// Back-office under /admin
cpSync(adminDist, join(site, 'admin'), { recursive: true });

// Netlify plain-text config files — honored in every deploy mode, including drag-and-drop
writeFileSync(join(site, '_redirects'), [
  '# SPA fallback for the back-office (react-router paths like /admin/users/123)',
  '/admin/* /admin/index.html 200',
  '# Shared event links: open the app if installed, else offer the APK',
  '/e/* /open-event.html 200',
  '',
].join('\n'));

writeFileSync(join(site, '_headers'), [
  '# Serve the APK as an installable Android package',
  '/lokl.apk',
  '  Content-Type: application/vnd.android.package-archive',
  '  Content-Disposition: attachment',
  '',
].join('\n'));

console.log('site/ assembled: / = landing, /admin = back-office' + (existsSync(apk) ? ', APK included' : ''));
