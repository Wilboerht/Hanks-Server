import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as userRelationController from '../controllers/userRelationController';
import { RequestHandler } from 'express';

const router = Router();

// 保护所有用户关系相关路由
router.use(authenticateJWT);

// 关注用户
router.post('/:id/follow', userRelationController.followUser as RequestHandler);

// 取消关注用户
router.post('/:id/unfollow', userRelationController.unfollowUser as RequestHandler);

// 获取关注列表
router.get('/:id/following', userRelationController.getFollowing as RequestHandler);

// 获取粉丝列表
router.get('/:id/followers', userRelationController.getFollowers as RequestHandler);

// 获取共同关注
router.get('/:id/mutual', userRelationController.getMutualFollowing as RequestHandler);

// 检查关注状态
router.get('/:id/check', userRelationController.checkFollowStatus as RequestHandler);

// 获取推荐用户
router.get('/recommended', userRelationController.getRecommendedUsers as RequestHandler);

export default router; 