import { Router } from 'express';
import { body } from 'express-validator';
import { githubLogin, logout, me } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/github', body('code').isString().notEmpty(), validate, githubLogin);
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);

export default router;
