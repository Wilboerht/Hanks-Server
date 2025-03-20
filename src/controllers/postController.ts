import { Request, Response, NextFunction } from 'express';
import { PostService } from '../services/postService';
import { TagService } from '../services/tagService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { PostStatus } from '../models/Post';

export class PostController {
  private postService: PostService;
  private tagService: TagService;

  constructor() {
    this.postService = new PostService();
    this.tagService = new TagService();
  }

  /**
   * 创建文章
   */
  createPost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能创建文章', 401));
    }

    const { title, content, summary, categoryId, tagIds, featuredImage, status, publishDate, slug } = (req as any).body;
    
    if (!title || !content || !categoryId) {
      return next(new AppError('标题、内容和分类为必填项', 400));
    }

    // 如果提供了标签名称而不是ID，则创建或获取标签
    let finalTagIds = tagIds || [];
    if ((req as any).body.tags && Array.isArray((req as any).body.tags)) {
      const tags = await this.tagService.getOrCreateTags((req as any).body.tags);
      finalTagIds = tags.map(tag => String((tag as any)._id));
    }

    const post = await this.postService.createPost({
      title,
      content,
      summary,
      authorId: (req as any).user._id,
      categoryId,
      tagIds: finalTagIds,
      featuredImage,
      status,
      publishDate,
      slug
    });
    
    res.status(201).json({
      status: 'success',
      data: post
    });
  });

  /**
   * 更新文章
   */
  updatePost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能更新文章', 401));
    }

    const { id } = (req as any).params;
    const { title, content, summary, categoryId, tagIds, featuredImage, status, publishDate, slug } = (req as any).body;

    // 如果提供了标签名称而不是ID，则创建或获取标签
    let finalTagIds;
    if ((req as any).body.tags && Array.isArray((req as any).body.tags)) {
      const tags = await this.tagService.getOrCreateTags((req as any).body.tags);
      finalTagIds = tags.map(tag => String((tag as any)._id));
    } else if (tagIds) {
      finalTagIds = tagIds;
    }

    const post = await this.postService.updatePost(
      id, 
      (req as any).user._id, 
      {
        title,
        content,
        summary,
        categoryId,
        tagIds: finalTagIds,
        featuredImage,
        status,
        publishDate,
        slug
      }
    );
    
    res.status(200).json({
      status: 'success',
      data: post
    });
  });

  /**
   * 发布文章（从草稿或定时发布状态）
   */
  publishPost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能发布文章', 401));
    }

    const { id } = (req as any).params;
    const post = await this.postService.publishPost(id, (req as any).user._id);
    
    res.status(200).json({
      status: 'success',
      data: post
    });
  });

  /**
   * 将文章转为草稿
   */
  unpublishPost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能修改文章状态', 401));
    }

    const { id } = (req as any).params;
    const post = await this.postService.unpublishPost(id, (req as any).user._id);
    
    res.status(200).json({
      status: 'success',
      data: post
    });
  });

  /**
   * 设置文章为定时发布
   */
  schedulePost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能设置定时发布', 401));
    }

    const { id } = (req as any).params;
    const { publishDate } = (req as any).body;
    
    if (!publishDate) {
      return next(new AppError('发布日期为必填项', 400));
    }

    const post = await this.postService.schedulePost(id, (req as any).user._id, new Date(publishDate));
    
    res.status(200).json({
      status: 'success',
      data: post
    });
  });

  /**
   * 删除文章
   */
  deletePost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能删除文章', 401));
    }

    const { id } = (req as any).params;
    await this.postService.deletePost(id, (req as any).user._id);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  });

  /**
   * 获取文章详情
   */
  getPostDetail = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = (req as any).params;
    const incrementViews = (req as any).query.view !== 'false';
    
    const post = await this.postService.getPostDetail(slug, incrementViews);
    
    res.status(200).json({
      status: 'success',
      data: post
    });
  });

  /**
   * 获取作者的文章列表
   */
  getAuthorPosts = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { authorId } = (req as any).params;
    const page = parseInt((req as any).query.page as string) || 1;
    const limit = parseInt((req as any).query.limit as string) || 10;
    let status: PostStatus | undefined = undefined;

    // 如果是查询自己的文章且提供了状态筛选，则应用状态筛选
    if ((req as any).user && (req as any).user._id === authorId && (req as any).query.status) {
      status = (req as any).query.status as PostStatus;
    } else {
      // 对于其他人只能查看已发布的文章
      status = PostStatus.PUBLISHED;
    }
    
    const result = await this.postService.getAuthorPosts(authorId, page, limit, status);
    
    res.status(200).json({
      status: 'success',
      results: result.data.length,
      data: result.data,
      meta: result.meta
    });
  });

  /**
   * 搜索文章
   */
  searchPosts = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { 
      q: search,
      category,
      tag,
      author,
      fromDate,
      toDate
    } = (req as any).query;
    
    const page = parseInt((req as any).query.page as string) || 1;
    const limit = parseInt((req as any).query.limit as string) || 10;
    const sort = ((req as any).query.sort as string) || 'createdAt';
    const order = ((req as any).query.order as string) === 'asc' ? 'asc' : 'desc';
    
    const filters: any = {
      status: PostStatus.PUBLISHED
    };
    
    if (search) filters.search = search;
    if (category) filters.category = category;
    if (tag) filters.tag = tag;
    if (author) filters.author = author;
    
    if (fromDate) {
      filters.fromDate = new Date(fromDate);
    }
    
    if (toDate) {
      filters.toDate = new Date(toDate);
    }
    
    const result = await this.postService.searchPosts(filters, page, limit, sort, order);
    
    res.status(200).json({
      status: 'success',
      results: result.data.length,
      data: result.data,
      meta: result.meta
    });
  });

  /**
   * 获取相关文章
   */
  getRelatedPosts = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = (req as any).params;
    const limit = parseInt((req as any).query.limit as string) || 5;
    
    const posts = await this.postService.getRelatedPosts(id, limit);
    
    res.status(200).json({
      status: 'success',
      results: posts.length,
      data: posts
    });
  });

  /**
   * 获取热门文章
   */
  getPopularPosts = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const limit = parseInt((req as any).query.limit as string) || 10;
    const days = parseInt((req as any).query.days as string) || 30;
    
    const posts = await this.postService.getPopularPosts(limit, days);
    
    res.status(200).json({
      status: 'success',
      results: posts.length,
      data: posts
    });
  });

  /**
   * 获取用户收藏的文章
   */
  getSavedPosts = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能查看收藏文章', 401));
    }

    const userId = (req as any).user._id;
    const page = parseInt((req as any).query.page as string) || 1;
    const limit = parseInt((req as any).query.limit as string) || 10;
    
    const result = await this.postService.getSavedPosts(userId, page, limit);
    
    res.status(200).json({
      status: 'success',
      results: result.data.length,
      data: result.data,
      meta: result.meta
    });
  });

  /**
   * 收藏文章
   */
  savePost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能收藏文章', 401));
    }

    const { id } = (req as any).params;
    await this.postService.savePost(id, (req as any).user._id);
    
    res.status(200).json({
      status: 'success',
      message: '文章已收藏'
    });
  });

  /**
   * 取消收藏文章
   */
  unsavePost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能取消收藏', 401));
    }

    const { id } = (req as any).params;
    await this.postService.unsavePost(id, (req as any).user._id);
    
    res.status(200).json({
      status: 'success',
      message: '已取消收藏'
    });
  });

  /**
   * 点赞文章
   */
  likePost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能点赞文章', 401));
    }

    const { id } = (req as any).params;
    await this.postService.likePost(id, (req as any).user._id);
    
    res.status(200).json({
      status: 'success',
      message: '文章已点赞'
    });
  });

  /**
   * 取消点赞文章
   */
  unlikePost = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('需要登录才能取消点赞', 401));
    }

    const { id } = (req as any).params;
    await this.postService.unlikePost(id, (req as any).user._id);
    
    res.status(200).json({
      status: 'success',
      message: '已取消点赞'
    });
  });

  /**
   * 查看定时任务，发布预定的文章
   * 这通常由定时任务调用，而不是通过API直接调用
   */
  runScheduledPublishing = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 检查是否是管理员或内部请求
    const isAdmin = (req as any).user?.isAdmin || false;
    const isInternalRequest = (req as any).headers['x-api-key'] === process.env.INTERNAL_API_KEY;
    
    if (!isAdmin && !isInternalRequest) {
      return next(new AppError('没有权限进行此操作', 403));
    }
    
    const count = await this.postService.publishScheduledPosts();
    
    res.status(200).json({
      status: 'success',
      message: `${count}篇文章已发布`
    });
  });
} 