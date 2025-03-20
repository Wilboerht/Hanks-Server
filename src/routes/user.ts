import { Router } from 'express';
import { login, register, getProfile, updateProfile, changePassword } from '../controllers/auth';
import { authenticateJWT } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimit';

const router = Router();

// 公共路由
router.post('/login', loginLimiter, login as any);
router.post('/register', register as any);

// 需要认证的路由
router.get('/profile', authenticateJWT, getProfile as any);
router.put('/profile', authenticateJWT, updateProfile as any);
router.put('/change-password', authenticateJWT, changePassword as any);

export default router; 