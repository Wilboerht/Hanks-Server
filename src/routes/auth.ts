import { Router } from 'express';
import { register, login, getProfile } from '../controllers/auth';
import { auth } from '../middleware/auth';
import { RequestHandler } from 'express';

const router = Router();

router.post('/register', register as RequestHandler);
router.post('/login', login as RequestHandler);
router.get('/profile', auth as RequestHandler, getProfile as RequestHandler);

export default router; 