import { Request, Response, NextFunction } from 'express';
import { TagService } from '../services/tagService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

export class TagController {
  private tagService: TagService;

  constructor() {
    this.tagService = new TagService();
  }

  /**
   * 创建标签
   */
  createTag = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 验证用户权限 - 需要管理员权限
    if (!(req as any).user?.isAdmin) {
      return next(new AppError('没有权限进行此操作', 403));
    }

    const tag = await this.tagService.createTag((req as any).body);
    
    res.status(201).json({
      status: 'success',
      data: tag
    });
  });

  /**
   * 更新标签
   */
  updateTag = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 验证用户权限 - 需要管理员权限
    if (!(req as any).user?.isAdmin) {
      return next(new AppError('没有权限进行此操作', 403));
    }

    const { id } = (req as any).params;
    const tag = await this.tagService.updateTag(id, (req as any).body);
    
    res.status(200).json({
      status: 'success',
      data: tag
    });
  });

  /**
   * 删除标签
   */
  deleteTag = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 验证用户权限 - 需要管理员权限
    if (!(req as any).user?.isAdmin) {
      return next(new AppError('没有权限进行此操作', 403));
    }

    const { id } = (req as any).params;
    await this.tagService.deleteTag(id);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  });

  /**
   * 获取所有标签
   */
  getAllTags = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt((req as any).query.page as string) || 1;
    const limit = parseInt((req as any).query.limit as string) || 20;
    const sort = ((req as any).query.sort as string) || 'name';
    
    const result = await this.tagService.getAllTags(page, limit, sort);
    
    res.status(200).json({
      status: 'success',
      results: result.data.length,
      data: result.data,
      meta: result.meta
    });
  });

  /**
   * 获取标签详情
   */
  getTagDetail = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = (req as any).params;
    const tag = await this.tagService.getTagDetail(id);
    
    res.status(200).json({
      status: 'success',
      data: tag
    });
  });

  /**
   * 搜索标签
   */
  searchTags = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { query } = (req as any).query;
    const limit = parseInt((req as any).query.limit as string) || 10;
    
    if (!query || typeof query !== 'string') {
      return next(new AppError('请提供搜索关键词', 400));
    }
    
    const tags = await this.tagService.searchTags(query, limit);
    
    res.status(200).json({
      status: 'success',
      results: tags.length,
      data: tags
    });
  });

  /**
   * 获取热门标签
   */
  getPopularTags = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const limit = parseInt((req as any).query.limit as string) || 10;
    
    const tags = await this.tagService.getPopularTags(limit);
    
    res.status(200).json({
      status: 'success',
      results: tags.length,
      data: tags
    });
  });

  /**
   * 刷新标签文章计数
   */
  refreshTagPostCounts = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 验证用户权限 - 需要管理员权限
    if (!(req as any).user?.isAdmin) {
      return next(new AppError('没有权限进行此操作', 403));
    }
    
    await this.tagService.updateTagPostCounts();
    
    res.status(200).json({
      status: 'success',
      message: '标签文章计数已更新'
    });
  });
} 