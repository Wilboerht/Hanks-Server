import { Request as ExpressRequest, Response, NextFunction } from 'express';
import { UserRelationService } from '../services/userRelationService';
import { catchAsync } from '../utils/catchAsync';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

// 扩展Request类型，包含params和query
interface Request extends ExpressRequest {
  params: ParamsDictionary;
  query: ParsedQs;
  user?: any;
}

const userRelationService = new UserRelationService();

/**
 * 关注用户
 */
export const followUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const currentUserId = req.user?._id;
  if (!currentUserId) {
    throw new Error('未授权访问');
  }
  
  const targetUserId = req.params.id;

  await userRelationService.followUser(currentUserId, targetUserId);

  (res as any).success({
    message: '关注成功'
  });
});

/**
 * 取消关注用户
 */
export const unfollowUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const currentUserId = req.user?._id;
  if (!currentUserId) {
    throw new Error('未授权访问');
  }
  
  const targetUserId = req.params.id;

  await userRelationService.unfollowUser(currentUserId, targetUserId);

  (res as any).success({
    message: '取消关注成功'
  });
});

/**
 * 获取用户的关注列表
 */
export const getFollowing = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.id;
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

  const result = await userRelationService.getFollowing(userId, page, limit);

  (res as any).paginate(result);
});

/**
 * 获取用户的粉丝列表
 */
export const getFollowers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.id;
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

  const result = await userRelationService.getFollowers(userId, page, limit);

  (res as any).paginate(result);
});

/**
 * 检查是否关注了某用户
 */
export const checkFollowStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const currentUserId = req.user?._id;
  if (!currentUserId) {
    throw new Error('未授权访问');
  }
  
  const targetUserId = req.params.id;

  const isFollowing = await userRelationService.isFollowing(currentUserId, targetUserId);

  (res as any).success({
    isFollowing
  });
});

/**
 * 获取推荐关注用户
 */
export const getRecommendedUsers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const currentUserId = req.user?._id;
  if (!currentUserId) {
    throw new Error('未授权访问');
  }
  
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

  const recommendedUsers = await userRelationService.getRecommendedUsers(currentUserId, limit);

  (res as any).success({
    data: recommendedUsers
  });
});

/**
 * 获取共同关注
 */
export const getMutualFollowing = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const currentUserId = req.user?._id;
  if (!currentUserId) {
    throw new Error('未授权访问');
  }
  
  const targetUserId = req.params.id;

  const mutualFollowing = await userRelationService.getMutualFollowing(currentUserId, targetUserId);

  (res as any).success({
    data: mutualFollowing
  });
}); 