import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/categoryService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  /**
   * 创建分类
   */
  createCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 验证用户权限 - 需要管理员权限
    if (!(req as any).user?.isAdmin) {
      return next(new AppError('没有权限进行此操作', 403));
    }

    const category = await this.categoryService.createCategory((req as any).body);
    
    res.status(201).json({
      status: 'success',
      data: category
    });
  });

  /**
   * 更新分类
   */
  updateCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 验证用户权限 - 需要管理员权限
    if (!(req as any).user?.isAdmin) {
      return next(new AppError('没有权限进行此操作', 403));
    }

    const { id } = (req as any).params;
    const category = await this.categoryService.updateCategory(id, (req as any).body);
    
    res.status(200).json({
      status: 'success',
      data: category
    });
  });

  /**
   * 删除分类
   */
  deleteCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 验证用户权限 - 需要管理员权限
    if (!(req as any).user?.isAdmin) {
      return next(new AppError('没有权限进行此操作', 403));
    }

    const { id } = (req as any).params;
    await this.categoryService.deleteCategory(id);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  });

  /**
   * 获取所有分类
   */
  getAllCategories = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const includePostCount = (req as any).query.includePostCount === 'true';
    const structureAsTree = (req as any).query.tree === 'true';
    
    const categories = await this.categoryService.getAllCategories(includePostCount, structureAsTree);
    
    res.status(200).json({
      status: 'success',
      results: Array.isArray(categories) ? categories.length : (categories as any[]).length,
      data: categories
    });
  });

  /**
   * 获取分类详情
   */
  getCategoryDetail = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = (req as any).params;
    const category = await this.categoryService.getCategoryDetail(id);
    
    res.status(200).json({
      status: 'success',
      data: category
    });
  });

  /**
   * 更新分类顺序
   */
  updateCategoryOrder = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 验证用户权限 - 需要管理员权限
    if (!(req as any).user?.isAdmin) {
      return next(new AppError('没有权限进行此操作', 403));
    }

    const { categoryIds } = (req as any).body;
    const parentId = (req as any).body.parentId;
    
    if (!Array.isArray(categoryIds)) {
      return next(new AppError('分类ID列表必须是数组', 400));
    }
    
    await this.categoryService.updateCategoryOrder(categoryIds, parentId);
    
    res.status(200).json({
      status: 'success',
      message: '分类顺序更新成功'
    });
  });

  /**
   * 搜索分类
   */
  searchCategories = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { query } = (req as any).query;
    const limit = parseInt((req as any).query.limit as string) || 10;
    
    if (!query || typeof query !== 'string') {
      return next(new AppError('请提供搜索关键词', 400));
    }
    
    const categories = await this.categoryService.searchCategories(query, limit);
    
    res.status(200).json({
      status: 'success',
      results: categories.length,
      data: categories
    });
  });

  /**
   * 刷新分类文章计数
   */
  refreshCategoryPostCounts = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 验证用户权限 - 需要管理员权限
    if (!(req as any).user?.isAdmin) {
      return next(new AppError('没有权限进行此操作', 403));
    }
    
    await this.categoryService.updateCategoryPostCounts();
    
    res.status(200).json({
      status: 'success',
      message: '分类文章计数已更新'
    });
  });
} 