import mongoose from 'mongoose';
import { Comment, IComment } from '../models/Comment';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import { NotificationService } from './notificationService';

interface CreateCommentDTO {
  content: string;
  postId: string;
  authorId: string;
  parentCommentId?: string;
}

interface UpdateCommentDTO {
  content: string;
}

/**
 * 评论服务类
 * 处理评论的创建、查询、回复和管理
 */
export class CommentService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * 创建评论
   * @param data 评论数据
   */
  async createComment(data: CreateCommentDTO): Promise<IComment> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 验证文章存在
      const post = await Post.findById(data.postId);
      if (!post) {
        throw new AppError('文章不存在', 404);
      }

      // 验证评论作者存在
      const author = await User.findById(data.authorId);
      if (!author) {
        throw new AppError('用户不存在', 404);
      }

      // 创建评论数据
      const commentData: any = {
        content: data.content,
        post: data.postId,
        author: data.authorId
      };

      // 如果是回复评论，验证父评论存在
      if (data.parentCommentId) {
        const parentComment = await Comment.findById(data.parentCommentId);
        if (!parentComment) {
          throw new AppError('父评论不存在', 404);
        }
        commentData.parentComment = data.parentCommentId;
      }

      // 创建评论
      const comment = (await Comment.create([commentData], { session })) as any[];
      
      // 填充作者信息后返回
      const populatedComment = await Comment.findById(comment[0]._id)
        .populate('author', 'username avatar')
        .session(session);

      // 发送通知
      try {
        // 通知文章作者有新评论（如果评论者不是作者自己）
        if (post.author.toString() !== data.authorId && !data.parentCommentId) {
          await this.notificationService.createCommentNotification({
            postId: data.postId,
            commentId: comment[0]._id.toString(),
            commenterId: data.authorId,
            postAuthorId: post.author.toString(),
            commentContent: data.content
          });
        }

        // 如果是回复评论，通知被回复的评论作者
        if (data.parentCommentId) {
          const parentComment = await Comment.findById(data.parentCommentId).populate('author');
          if (parentComment && parentComment.author) {
            const authorDoc = parentComment.author as any;
            const authorId = authorDoc._id.toString();
            
            if (authorId !== data.authorId) {
              await this.notificationService.createReplyNotification({
                postId: data.postId,
                commentId: comment[0]._id.toString(),
                replyToCommentId: data.parentCommentId,
                replyerId: data.authorId,
                recipientId: authorId,
                replyContent: data.content
              });
            }
          }
        }
      } catch (notificationError) {
        logger.error('创建评论通知失败', notificationError);
        // 通知失败不影响评论创建
      }

      await session.commitTransaction();
      session.endSession();

      logger.info(`评论创建成功: ${comment[0]._id}`);
      return populatedComment!;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      
      logger.error('创建评论失败', error);
      throw error;
    }
  }

  /**
   * 更新评论
   * @param commentId 评论ID
   * @param authorId 作者ID（用于权限验证）
   * @param data 更新数据
   */
  async updateComment(commentId: string, authorId: string, data: UpdateCommentDTO): Promise<IComment> {
    try {
      // 查找评论
      const comment = await Comment.findById(commentId);
      if (!comment) {
        throw new AppError('评论不存在', 404);
      }

      // 验证权限
      if (comment.author.toString() !== authorId) {
        throw new AppError('没有权限编辑此评论', 403);
      }

      // 更新评论
      comment.content = data.content;
      comment.isEdited = true;
      await comment.save();

      const updatedComment = await Comment.findById(commentId)
        .populate('author', 'username avatar');

      logger.info(`评论${commentId}更新成功`);
      return updatedComment!;
    } catch (error) {
      logger.error('更新评论失败', error);
      throw error;
    }
  }

  /**
   * 删除评论
   * @param commentId 评论ID
   * @param userId 用户ID
   * @param isAdmin 是否为管理员
   */
  async deleteComment(commentId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 查找评论
      const comment = await Comment.findById(commentId);
      if (!comment) {
        throw new AppError('评论不存在', 404);
      }

      // 验证权限
      const isAuthor = comment.author.toString() === userId;
      if (!isAuthor && !isAdmin) {
        throw new AppError('没有权限删除此评论', 403);
      }

      // 软删除评论
      comment.isDeleted = true;
      comment.deletedAt = new Date();
      await comment.save({ session });

      // 减少文章评论计数
      await Post.findByIdAndUpdate(
        comment.post,
        { $inc: { commentCount: -1 } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      logger.info(`评论${commentId}删除成功`);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      
      logger.error('删除评论失败', error);
      throw error;
    }
  }

  /**
   * 获取文章的评论列表
   * @param postId 文章ID
   * @param page 页码
   * @param limit 每页数量
   */
  async getPostComments(postId: string, page: number = 1, limit: number = 10): Promise<{
    data: IComment[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      // 只获取顶级评论
      const query = {
        post: postId,
        level: 1,
        isApproved: true
      };

      const total = await Comment.countDocuments(query);
      const skip = (page - 1) * limit;

      // 获取评论并填充作者信息
      const comments = await Comment.find(query)
        .sort({ isHighlighted: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username avatar')
        .populate({
          path: 'replies',
          options: { limit: 3 },
          populate: { path: 'author', select: 'username avatar' }
        });

      return {
        data: comments,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('获取文章评论失败', error);
      throw error;
    }
  }

  /**
   * 获取评论的回复列表
   * @param commentId 评论ID
   * @param page 页码
   * @param limit 每页数量
   */
  async getCommentReplies(commentId: string, page: number = 1, limit: number = 10): Promise<{
    data: IComment[];
    parentComment?: IComment;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      // 查找父评论
      const parentComment = await Comment.findById(commentId)
        .populate('author', 'username avatar');
      
      if (!parentComment) {
        throw new AppError('评论不存在', 404);
      }

      // 查询子评论
      const query = {
        parentComment: commentId,
        isApproved: true
      };

      const total = await Comment.countDocuments(query);
      const skip = (page - 1) * limit;

      const replies = await Comment.find(query)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'username avatar');

      return {
        data: replies,
        parentComment,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('获取评论回复失败', error);
      throw error;
    }
  }

  /**
   * 获取用户的评论列表
   * @param userId 用户ID
   * @param page 页码
   * @param limit 每页数量
   */
  async getUserComments(userId: string, page: number = 1, limit: number = 10): Promise<{
    data: IComment[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      const query = {
        author: userId,
        isApproved: true
      };

      const total = await Comment.countDocuments(query);
      const skip = (page - 1) * limit;

      const comments = await Comment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('post', 'title slug')
        .populate('author', 'username avatar')
        .populate('parentComment', 'content');

      return {
        data: comments,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('获取用户评论失败', error);
      throw error;
    }
  }

  /**
   * 点赞评论
   * @param commentId 评论ID
   * @param userId 用户ID
   */
  async likeComment(commentId: string, userId: string): Promise<IComment> {
    try {
      // 查找评论
      const comment = await Comment.findById(commentId);
      if (!comment) {
        throw new AppError('评论不存在', 404);
      }

      // 检查用户是否已点赞
      const userObjectId = new mongoose.Types.ObjectId(userId);
      if (comment.likes.some(id => id.equals(userObjectId))) {
        return comment; // 已点赞，直接返回
      }

      // 添加点赞
      comment.likes.push(userObjectId);
      comment.likeCount = comment.likes.length;
      await comment.save();

      // 发送通知（如果点赞者不是评论作者）
      if (comment.author.toString() !== userId) {
        try {
          await this.notificationService.createLikeCommentNotification({
            commentId: commentId,
            likerId: userId,
            authorId: comment.author.toString()
          });
        } catch (error) {
          logger.error('创建评论点赞通知失败', error);
          // 通知失败不影响点赞操作
        }
      }

      return comment;
    } catch (error) {
      logger.error('评论点赞失败', error);
      throw error;
    }
  }

  /**
   * 取消点赞评论
   * @param commentId 评论ID
   * @param userId 用户ID
   */
  async unlikeComment(commentId: string, userId: string): Promise<IComment> {
    try {
      // 查找评论
      const comment = await Comment.findById(commentId);
      if (!comment) {
        throw new AppError('评论不存在', 404);
      }

      // 移除点赞
      const userObjectId = new mongoose.Types.ObjectId(userId);
      comment.likes = comment.likes.filter(id => !id.equals(userObjectId));
      comment.likeCount = comment.likes.length;
      await comment.save();

      return comment;
    } catch (error) {
      logger.error('取消评论点赞失败', error);
      throw error;
    }
  }

  /**
   * 审核评论（管理员功能）
   * @param commentId 评论ID
   * @param isApproved 是否通过审核
   */
  async moderateComment(commentId: string, isApproved: boolean): Promise<IComment> {
    try {
      // 查找评论
      const comment = await Comment.findById(commentId);
      if (!comment) {
        throw new AppError('评论不存在', 404);
      }

      // 更新审核状态
      comment.isApproved = isApproved;
      await comment.save();

      // 更新文章评论计数
      if (isApproved) {
        await Post.findByIdAndUpdate(
          comment.post,
          { $inc: { commentCount: 1 } }
        );
      } else {
        await Post.findByIdAndUpdate(
          comment.post,
          { $inc: { commentCount: -1 } }
        );
      }

      logger.info(`评论${commentId}审核状态已更新: ${isApproved ? '通过' : '拒绝'}`);
      return comment;
    } catch (error) {
      logger.error('审核评论失败', error);
      throw error;
    }
  }

  /**
   * 高亮/置顶评论（管理员功能）
   * @param commentId 评论ID
   * @param isHighlighted 是否高亮显示
   */
  async highlightComment(commentId: string, isHighlighted: boolean): Promise<IComment> {
    try {
      // 查找评论
      const comment = await Comment.findById(commentId);
      if (!comment) {
        throw new AppError('评论不存在', 404);
      }

      // 更新高亮状态
      comment.isHighlighted = isHighlighted;
      await comment.save();

      logger.info(`评论${commentId}高亮状态已更新: ${isHighlighted ? '高亮' : '取消高亮'}`);
      return comment;
    } catch (error) {
      logger.error('更新评论高亮状态失败', error);
      throw error;
    }
  }
} 