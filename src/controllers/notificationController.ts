import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notificationService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

interface UserNotificationOptions {
  page: number;
  limit: number;
  unreadOnly: boolean;
}

interface DeleteNotificationsOptions {
  ids?: string[];
  deleteAllRead?: boolean;
}

interface SystemNotificationOptions {
  recipientIds?: string[];
  link?: string;
}

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * 获取用户通知
   */
  getUserNotifications = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能查看通知', 401));
    }

    const userId = (req as any).user._id;
    const page = parseInt((req as any).query.page as string) || 1;
    const limit = parseInt((req as any).query.limit as string) || 20;
    const unreadOnly = (req as any).query.unread === 'true';
    
    const result = await this.notificationService.getUserNotifications(
      userId,
      page,
      limit,
      unreadOnly ? false : undefined
    );
    
    res.status(200).json({
      status: 'success',
      results: result.data.length,
      data: result.data,
      meta: result.meta
    });
  });

  /**
   * 获取未读通知数量
   */
  getUnreadCount = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能查看通知', 401));
    }

    const userId = (req as any).user._id;
    const count = await this.notificationService.getUnreadCount(userId);
    
    res.status(200).json({
      status: 'success',
      data: { count }
    });
  });

  /**
   * 标记通知为已读
   */
  markAsRead = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能标记通知为已读', 401));
    }

    const userId = (req as any).user._id;
    const notificationId = (req as any).params.id;
    
    await this.notificationService.markAsRead(notificationId, userId);
    
    res.status(200).json({
      status: 'success',
      message: '通知已标记为已读'
    });
  });

  /**
   * 标记全部通知为已读
   */
  markAllAsRead = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能标记通知为已读', 401));
    }

    const userId = (req as any).user._id;
    const notificationIds = (req as any).body.ids;
    
    const count = await this.notificationService.markAllAsRead(userId, notificationIds);
    
    res.status(200).json({
      status: 'success',
      message: `${count}条通知已标记为已读`
    });
  });

  /**
   * 删除通知
   */
  deleteNotification = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能删除通知', 401));
    }

    const userId = (req as any).user._id;
    const notificationId = (req as any).params.id;
    
    await this.notificationService.deleteNotification(notificationId, userId);
    
    res.status(200).json({
      status: 'success',
      message: '通知已删除'
    });
  });

  /**
   * 删除多个通知
   */
  deleteNotifications = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能删除通知', 401));
    }

    const userId = (req as any).user._id;
    const { ids, deleteAllRead } = (req as any).body;
    
    const count = await this.notificationService.deleteNotifications(
      userId,
      ids,
      deleteAllRead === true
    );
    
    res.status(200).json({
      status: 'success',
      message: `${count}条通知已删除`
    });
  });

  /**
   * 创建系统通知（仅管理员）
   */
  createSystemNotification = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user?.isAdmin) {
      return next(new AppError('没有权限进行此操作', 403));
    }

    const { title, content, recipients, link } = (req as any).body;
    
    if (!title || !content) {
      return next(new AppError('标题和内容为必填项', 400));
    }
    
    const count = await this.notificationService.createSystemNotification({
      recipients: recipients || 'all',
      title,
      content,
      link
    });
    
    res.status(201).json({
      status: 'success',
      message: `已向${count}个用户发送系统通知`
    });
  });
} 