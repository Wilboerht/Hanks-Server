import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth';
import { RequestHandler } from 'express';

const router = Router();

// 用户注册
router.post('/register', authController.register as RequestHandler);

// 用户登录
router.post('/login', authController.login as RequestHandler);

// 刷新令牌
router.post('/refresh-token', authController.refreshToken as RequestHandler);

// 用户登出
router.post('/logout', authController.logout as RequestHandler);

export default router; 