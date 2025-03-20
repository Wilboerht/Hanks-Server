import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticateJWT } from '../middleware/auth';
import { RequestHandler } from 'express';

const router = Router();

// 获取用户个人资料
router.get('/profile', authenticateJWT as RequestHandler, userController.getUserProfile as RequestHandler);

// 更新用户个人资料
router.put('/profile', authenticateJWT as RequestHandler, userController.updateUserProfile as RequestHandler);

// 修改密码
router.post('/change-password', authenticateJWT as RequestHandler, userController.changePassword as RequestHandler);

export default router; 