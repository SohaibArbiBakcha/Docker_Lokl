import { Router } from 'express';
import { login, register, googleLogin, facebookLogin, facebookDataDeletion, githubLogin, refresh, getMe } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/google', googleLogin);
router.post('/facebook', facebookLogin);
// Meta data-deletion callback (configured in the Facebook app settings)
router.post('/facebook/data-deletion', facebookDataDeletion);
router.post('/github', githubLogin);
router.post('/refresh', refresh);
// Any authenticated user (mobile members included) can read their own profile
router.get('/me', requireAuth, getMe);

export default router;
