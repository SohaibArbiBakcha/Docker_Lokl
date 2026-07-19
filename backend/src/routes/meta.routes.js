import { Router } from 'express';
import { LATEST_VERSION, DOWNLOAD_URL, APK_URL, CHANGELOG } from '../config/app-meta.js';

const router = Router();

// Unauthenticated on purpose: the app checks for updates before login,
// and nothing here is sensitive (it's shipped inside the APK anyway).

router.get('/version', (_req, res) => {
  res.json({
    success: true,
    data: { latest_version: LATEST_VERSION, download_url: DOWNLOAD_URL, apk_url: APK_URL },
  });
});

router.get('/changelog', (_req, res) => {
  res.json({ success: true, data: { latest_version: LATEST_VERSION, changelog: CHANGELOG } });
});

export default router;
