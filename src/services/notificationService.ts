import mongoose from 'mongoose';
import { Notification, NotificationType } from '../models/Notification';
import { User } from '../models/User';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

// 评论通知DTO
interface CommentNotificationDTO {
  postId: string;
  commentId: string;
  commenterId: string;
  postAuthorId: string;
  commentContent: string;
}

// 回复评论通知DTO
interface ReplyNotificationDTO {
  postId: string;
  commentId: string;
  replyToCommentId: string;
  replyerId: string;
  recipientId: string;
  replyContent: string;
}

// 点赞文章通知DTO
interface LikePostNotificationDTO {
  postId: string;
  likerId: string;
  authorId: string;
}

// 点赞评论通知DTO
interface LikeCommentNotificationDTO {
  commentId: string;
  likerId: string;
  authorId: string;
}

// 系统通知DTO
interface SystemNotificationDTO {
  recipients: string[] | 'all';
  title: string;
  content: string;
  link?: string;
}

// 通知返回类型
interface NotificationResult {
  data: any[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 删除通知选项
interface DeleteNotificationsOptions {
  ids?: string[];
  deleteAllRead?: boolean;
}

/**
 * 通知服务类
 * 处理系统各种通知的创建和管理
 */
export class NotificationService {
  /**
   * 创建关注通知
   * @param followerId 关注者ID
   * @param followedId 被关注者ID
   */
  async createFollowNotification(followerId: string, followedId: string): Promise<void> {
    try {
      // 检查用户是否存在
      const [follower, followed] = await Promise.all([
        User.findById(followerId),
        User.findById(followedId)
      ]);

      if (!follower || !followed) {
        throw new AppError('用户不存在', 404);
      }

      // 创建通知
      await Notification.create({
        type: NotificationType.FOLLOW,
        sender: followerId,
        recipient: followedId,
        message: `${follower.username}关注了你`,
        linkTo: `/users/${followerId}`
      });

      logger.info(`创建关注通知: ${followerId} -> ${followedId}`);
    } catch (error) {
      logger.error('创建关注通知失败', error);
      throw error;
    }
  }

  /**
   * 创建评论通知
   * @param data 评论通知数据
   */
  async createCommentNotification(data: CommentNotificationDTO): Promise<void> {
    try {
      const [commenter, post] = await Promise.all([
        User.findById(data.commenterId),
        Post.findById(data.postId)
      ]);

      if (!commenter || !post) {
        throw new AppError('用户或文章不存在', 404);
      }

      // 创建评论通知
      await Notification.create({
        recipient: data.postAuthorId,
        sender: data.commenterId,
        type: NotificationType.COMMENT,
        title: '新的评论',
        content: `${commenter.username} 评论了你的文章 "${post.title}"`,
        relatedPost: data.postId,
        relatedComment: data.commentId,
        link: `/blog/${post.slug}#comment-${data.commentId}`,
        isRead: false
      });

      logger.info(`创建评论通知成功: ${data.commenterId} -> ${data.postAuthorId}`);
    } catch (error) {
      logger.error('创建评论通知失败', error);
      throw error;
    }
  }

  /**
   * 创建回复通知
   * @param data 回复通知数据
   */
  async createReplyNotification(data: ReplyNotificationDTO): Promise<void> {
    try {
      const [replier, post] = await Promise.all([
        User.findById(data.replyerId),
        Post.findById(data.postId)
      ]);

      if (!replier || !post) {
        throw new AppError('用户或文章不存在', 404);
      }

      // 创建回复通知
      await Notification.create({
        recipient: data.recipientId,
        sender: data.replyerId,
        type: NotificationType.REPLY,
        title: '新的回复',
        content: `${replier.username} 回复了你的评论`,
        relatedPost: data.postId,
        relatedComment: data.commentId,
        link: `/blog/${post.slug}#comment-${data.commentId}`,
        isRead: false
      });

      logger.info(`创建回复通知成功: ${data.replyerId} -> ${data.recipientId}`);
    } catch (error) {
      logger.error('创建回复通知失败', error);
      throw error;
    }
  }

  /**
   * 创建点赞文章通知
   * @param data 点赞文章通知数据
   */
  async createLikePostNotification(data: LikePostNotificationDTO): Promise<void> {
    try {
      const [liker, post] = await Promise.all([
        User.findById(data.likerId),
        Post.findById(data.postId)
      ]);

      if (!liker || !post) {
        throw new AppError('用户或文章不存在', 404);
      }

      // 创建点赞文章通知
      await Notification.create({
        recipient: data.authorId,
        sender: data.likerId,
        type: NotificationType.LIKE_POST,
        title: '文章获得点赞',
        content: `${liker.username} 点赞了你的文章 "${post.title}"`,
        relatedPost: data.postId,
        link: `/blog/${post.slug}`,
        isRead: false
      });

      logger.info(`创建点赞文章通知成功: ${data.likerId} -> ${data.authorId}`);
    } catch (error) {
      logger.error('创建点赞文章通知失败', error);
      throw error;
    }
  }

  /**
   * 创建点赞评论通知
   * @param data 点赞评论通知数据
   */
  async createLikeCommentNotification(data: LikeCommentNotificationDTO): Promise<void> {
    try {
      const [liker, comment] = await Promise.all([
        User.findById(data.likerId),
        Comment.findById(data.commentId).populate('post')
      ]);

      if (!liker || !comment) {
        throw new AppError('用户或评论不存在', 404);
      }

      const post = comment.post as any;

      // 创建点赞评论通知
      await Notification.create({
        recipient: data.authorId,
        sender: data.likerId,
        type: NotificationType.LIKE_COMMENT,
        title: '评论获得点赞',
        content: `${liker.username} 点赞了你的评论`,
        relatedPost: post._id,
        relatedComment: data.commentId,
        link: `/blog/${post.slug}#comment-${data.commentId}`,
        isRead: false
      });

      logger.info(`创建点赞评论通知成功: ${data.likerId} -> ${data.authorId}`);
    } catch (error) {
      logger.error('创建点赞评论通知失败', error);
      throw error;
    }
  }

  /**
   * 获取用户通知列表
   * @param userId 用户ID
   * @param page 页码
   * @param limit 每页数量
   * @param isRead 是否已读 (undefined 表示所有, true 表示已读, false 表示未读)
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 10,
    isRead?: boolean
  ): Promise<NotificationResult> {
    try {
      const query: any = { recipient: userId };
      
      if (isRead !== undefined) {
        query.isRead = isRead;
      }

      const total = await Notification.countDocuments(query);
      const skip = (page - 1) * limit;

      const notifications = await Notification.find(query)
        .populate('sender', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        data: notifications,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('获取用户通知失败', error);
      throw error;
    }
  }

  /**
   * 获取用户未读通知数量
   * @param userId 用户ID
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await Notification.countDocuments({ 
        recipient: userId,
        isRead: false
      });
    } catch (error) {
      logger.error('获取未读通知数量失败', error);
      throw error;
    }
  }

  /**
   * 标记通知为已读
   * @param notificationId 通知ID
   * @param userId 用户ID
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        recipient: userId
      });

      if (!notification) {
        throw new AppError('通知不存在或无权操作', 404);
      }

      if (!notification.isRead) {
        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();
        logger.info(`用户${userId}已将通知${notificationId}标记为已读`);
      }
    } catch (error) {
      logger.error('标记通知为已读失败', error);
      throw error;
    }
  }

  /**
   * 标记全部通知为已读
   * @param userId 用户ID
   * @param notificationIds 要标记的通知ID数组 (为空则标记所有未读通知)
   */
  async markAllAsRead(userId: string, notificationIds?: string[]): Promise<number> {
    try {
      let query: any = { 
        recipient: userId,
        isRead: false
      };
      
      // 如果提供了通知ID列表，则只标记这些通知
      if (notificationIds && notificationIds.length > 0) {
        query._id = { $in: notificationIds };
      }
      
      const updateResult = await Notification.updateMany(
        query,
        { 
          $set: { 
            isRead: true,
            readAt: new Date()
          } 
        }
      );
      
      logger.info(`用户${userId}已将${updateResult.modifiedCount}条通知标记为已读`);
      return updateResult.modifiedCount;
    } catch (error) {
      logger.error('批量标记通知为已读失败', error);
      throw error;
    }
  }

  /**
   * 删除通知
   * @param notificationId 通知ID
   * @param userId 用户ID
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      const result = await Notification.deleteOne({
        _id: notificationId,
        recipient: userId
      });

      if (result.deletedCount === 0) {
        throw new AppError('通知不存在或无权操作', 404);
      }

      logger.info(`用户${userId}删除了通知${notificationId}`);
    } catch (error) {
      logger.error('删除通知失败', error);
      throw error;
    }
  }

  /**
   * 批量删除通知
   * @param userId 用户ID
   * @param notificationIds 要删除的通知ID数组 (为空则删除所有已读通知)
   * @param deleteAllRead 是否删除所有已读通知
   */
  async deleteNotifications(
    userId: string, 
    notificationIds?: string[],
    deleteAllRead?: boolean
  ): Promise<number> {
    try {
      let query: any = { recipient: userId };
      
      // 如果提供了通知ID列表，则只删除这些通知
      if (notificationIds && notificationIds.length > 0) {
        query._id = { $in: notificationIds };
      } else if (deleteAllRead) {
        // 删除所有已读通知
        query.isRead = true;
      } else {
        return 0; // 没有指定要删除的内容，返回0
      }
      
      const result = await Notification.deleteMany(query);
      
      logger.info(`用户${userId}删除了${result.deletedCount}条通知`);
      return result.deletedCount;
    } catch (error) {
      logger.error('批量删除通知失败', error);
      throw error;
    }
  }

  /**
   * 创建系统通知
   * @param data 系统通知数据
   */
  async createSystemNotification(data: SystemNotificationDTO): Promise<number> {
    try {
      let recipients: string[] = [];

      // 确定接收者
      if (data.recipients === 'all') {
        // 发送给所有用户
        const users = await User.find({}, '_id');
        recipients = users.map(user => String((user as any)._id));
      } else if (Array.isArray(data.recipients) && data.recipients.length > 0) {
        // 发送给指定用户
        recipients = data.recipients;
      } else {
        throw new AppError('必须指定接收者', 400);
      }

      // 创建通知
      await Notification.insertMany(
        recipients.map(recipientId => ({
          type: NotificationType.SYSTEM,
          recipient: recipientId,
          title: data.title,
          message: data.content,
          linkTo: data.link || null,
          isSystemNotification: true
        }))
      );

      logger.info(`创建了系统通知"${data.title}"，发送给${recipients.length}个用户`);
      return recipients.length;
    } catch (error) {
      logger.error('创建系统通知失败', error);
      throw error;
    }
  }
} 