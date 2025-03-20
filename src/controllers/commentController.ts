import { Request, Response, NextFunction } from 'express';
import { CommentService } from '../services/commentService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

export class CommentController {
  private commentService: CommentService;

  constructor() {
    this.commentService = new CommentService();
  }

  /**
   * 创建评论
   */
  createComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能发表评论', 401));
    }

    const { postId, content, parentCommentId } = (req as any).body;
    
    if (!postId || !content) {
      return next(new AppError('文章ID和评论内容为必填项', 400));
    }

    const comment = await this.commentService.createComment({
      content,
      postId,
      authorId: (req as any).user._id,
      parentCommentId
    });
    
    res.status(201).json({
      status: 'success',
      data: comment
    });
  });

  /**
   * 更新评论
   */
  updateComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能编辑评论', 401));
    }

    const { id } = (req as any).params;
    const { content } = (req as any).body;
    
    if (!content) {
      return next(new AppError('评论内容为必填项', 400));
    }

    const comment = await this.commentService.updateComment(
      id, 
      (req as any).user._id, 
      { content }
    );
    
    res.status(200).json({
      status: 'success',
      data: comment
    });
  });

  /**
   * 删除评论
   */
  deleteComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能删除评论', 401));
    }

    const { id } = (req as any).params;
    const isAdmin = (req as any).user.isAdmin || false;

    await this.commentService.deleteComment(id, (req as any).user._id, isAdmin);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  });

  /**
   * 获取文章的评论列表
   */
  getPostComments = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { postId } = (req as any).params;
    const page = parseInt((req as any).query.page as string) || 1;
    const limit = parseInt((req as any).query.limit as string) || 10;
    
    const result = await this.commentService.getPostComments(postId, page, limit);
    
    res.status(200).json({
      status: 'success',
      results: result.data.length,
      data: result.data,
      meta: result.meta
    });
  });

  /**
   * 获取评论的回复列表
   */
  getCommentReplies = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { commentId } = (req as any).params;
    const page = parseInt((req as any).query.page as string) || 1;
    const limit = parseInt((req as any).query.limit as string) || 10;
    
    const result = await this.commentService.getCommentReplies(commentId, page, limit);
    
    res.status(200).json({
      status: 'success',
      results: result.data.length,
      data: result.data,
      parentComment: result.parentComment,
      meta: result.meta
    });
  });

  /**
   * 获取用户的评论列表
   */
  getUserComments = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = (req as any).params;
    const page = parseInt((req as any).query.page as string) || 1;
    const limit = parseInt((req as any).query.limit as string) || 10;
    
    const result = await this.commentService.getUserComments(userId, page, limit);
    
    res.status(200).json({
      status: 'success',
      results: result.data.length,
      data: result.data,
      meta: result.meta
    });
  });

  /**
   * 点赞评论
   */
  likeComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能点赞评论', 401));
    }

    const { id } = (req as any).params;
    const comment = await this.commentService.likeComment(id, (req as any).user._id);
    
    res.status(200).json({
      status: 'success',
      data: { likeCount: comment.likeCount }
    });
  });

  /**
   * 取消点赞评论
   */
  unlikeComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能操作', 401));
    }

    const { id } = (req as any).params;
    const comment = await this.commentService.unlikeComment(id, (req as any).user._id);
    
    res.status(200).json({
      status: 'success',
      data: { likeCount: comment.likeCount }
    });
  });

  /**
   * 审核评论（管理员功能）
   */
  moderateComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user?.isAdmin) {
      return next(new AppError('没有权限进行此操作', 403));
    }

    const { id } = (req as any).params;
    const { isApproved } = (req as any).body;
    
    if (typeof isApproved !== 'boolean') {
      return next(new AppError('isApproved参数必须是布尔值', 400));
    }

    const comment = await this.commentService.moderateComment(id, isApproved);
    
    res.status(200).json({
      status: 'success',
      data: comment
    });
  });

  /**
   * 高亮/置顶评论（管理员功能）
   */
  highlightComment = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user?.isAdmin) {
      return next(new AppError('没有权限进行此操作', 403));
    }

    const { id } = (req as any).params;
    const { isHighlighted } = (req as any).body;
    
    if (typeof isHighlighted !== 'boolean') {
      return next(new AppError('isHighlighted参数必须是布尔值', 400));
    }

    const comment = await this.commentService.highlightComment(id, isHighlighted);
    
    res.status(200).json({
      status: 'success',
      data: comment
    });
  });
} 