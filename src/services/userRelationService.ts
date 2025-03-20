import { User, IUser } from '../models/User';
import { AppError } from '../utils/appError';
import mongoose from 'mongoose';

/**
 * 用户关系服务类
 * 处理用户之间的关注、粉丝等关系
 */
export class UserRelationService {
  /**
   * 关注用户
   * @param currentUserId 当前用户ID
   * @param targetUserId 目标用户ID
   */
  async followUser(currentUserId: string, targetUserId: string): Promise<void> {
    // 检查是否关注自己
    if (currentUserId === targetUserId) {
      throw new AppError('不能关注自己', 400);
    }

    // 检查目标用户是否存在
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw new AppError('目标用户不存在', 404);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 检查是否已经关注
      const isFollowing = await User.findOne({
        _id: currentUserId,
        following: { $in: [targetUserId] }
      });

      if (isFollowing) {
        await session.abortTransaction();
        session.endSession();
        throw new AppError('已经关注了该用户', 400);
      }

      // 更新当前用户的关注列表
      await User.findByIdAndUpdate(
        currentUserId,
        { $addToSet: { following: targetUserId } }
      );

      // 更新目标用户的粉丝列表
      await User.findByIdAndUpdate(
        targetUserId,
        { $addToSet: { followers: currentUserId } }
      );

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * 取消关注用户
   * @param currentUserId 当前用户ID
   * @param targetUserId 目标用户ID
   */
  async unfollowUser(currentUserId: string, targetUserId: string): Promise<void> {
    // 检查是否取消关注自己
    if (currentUserId === targetUserId) {
      throw new AppError('不能取消关注自己', 400);
    }

    // 检查目标用户是否存在
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw new AppError('目标用户不存在', 404);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 检查是否已经关注
      const isFollowing = await User.findOne({
        _id: currentUserId,
        following: { $in: [targetUserId] }
      });

      if (!isFollowing) {
        await session.abortTransaction();
        session.endSession();
        throw new AppError('尚未关注该用户', 400);
      }

      // 更新当前用户的关注列表
      await User.findByIdAndUpdate(
        currentUserId,
        { $pull: { following: targetUserId } }
      );

      // 更新目标用户的粉丝列表
      await User.findByIdAndUpdate(
        targetUserId,
        { $pull: { followers: currentUserId } }
      );

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * 获取用户的关注列表
   * @param userId 用户ID
   * @param page 页码
   * @param limit 每页数量
   */
  async getFollowing(userId: string, page: number = 1, limit: number = 10) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    const skip = (page - 1) * limit;
    const total = user.following?.length || 0;

    const following = await User.find(
      { _id: { $in: user.following } },
      { password: 0 }
    )
      .sort({ username: 1 })
      .skip(skip)
      .limit(limit);

    return {
      following,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * 获取用户的粉丝列表
   * @param userId 用户ID
   * @param page 页码
   * @param limit 每页数量
   */
  async getFollowers(userId: string, page: number = 1, limit: number = 10) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    const skip = (page - 1) * limit;
    const total = user.followers?.length || 0;

    const followers = await User.find(
      { _id: { $in: user.followers } },
      { password: 0 }
    )
      .sort({ username: 1 })
      .skip(skip)
      .limit(limit);

    return {
      followers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * 检查是否关注了某用户
   * @param currentUserId 当前用户ID
   * @param targetUserId 目标用户ID
   */
  async isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
    const user = await User.findOne({
      _id: currentUserId,
      following: { $in: [targetUserId] }
    });
    
    return !!user;
  }

  /**
   * 获取用户之间的共同关注
   * @param userId1 用户1ID
   * @param userId2 用户2ID
   */
  async getMutualFollowing(userId1: string, userId2: string) {
    const user1 = await User.findById(userId1);
    const user2 = await User.findById(userId2);

    if (!user1 || !user2) {
      throw new AppError('用户不存在', 404);
    }

    const mutualFollowing = user1.following?.filter(
      id => user2.following?.some(id2 => id2.toString() === id.toString())
    );

    return mutualFollowing || [];
  }

  /**
   * 获取推荐关注用户
   * @param userId 当前用户ID
   * @param limit 数量限制
   */
  async getRecommendedUsers(userId: string, limit: number = 5) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    // 获取用户已关注的人
    const userFollowing = user.following || [];
    
    // 排除用户已关注的人和用户自己
    const excludedIds = [...userFollowing, new mongoose.Types.ObjectId(userId)];

    // 获取推荐用户（基于粉丝数量、帖子数量等）
    const recommendedUsers = await User.aggregate([
      { $match: { _id: { $nin: excludedIds } } },
      { $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'author',
        as: 'posts'
      }},
      { $addFields: {
        followersCount: { $size: '$followers' },
        postsCount: { $size: '$posts' }
      }},
      { $sort: {
        followersCount: -1,
        postsCount: -1
      }},
      { $limit: limit },
      { $project: {
        _id: 1,
        username: 1,
        avatar: 1,
        bio: 1,
        followersCount: 1,
        postsCount: 1
      }}
    ]);

    return recommendedUsers;
  }
} 